<?php

declare(strict_types=1);

namespace UDT;

/**
 * Zugang zum Editor. Der Code (80 Bit Zufall) entsteht beim Klick auf „Editor öffnen“, steht nur im
 * Fragment der Adresse und wird beim ersten Laden gegen einen neuen getauscht, der nur in der Antwort und
 * im Tab-Speicher steht: eine Kopie der Adresse (Verlauf, Sync) ist danach wertlos. Codes liegen nur im
 * Puffer, gelten eine Stunde ohne Nutzung, höchstens acht Stunden; es bleiben die acht zuletzt benutzten.
 * Lesen, Ändern und Schreiben der Puffer läuft unter einer Sperre je Instanz (parallele Anfragen).
 */
trait EditorAccessTrait
{
    /** Schlüssel der Bildfreigabe der laufenden Vorschau (nur in Vorschau-URLs). */
    private string $editorMediaKey = '';

    /** Adresse des Editors mit frischem Zugangscode (Formular-Knopf „Editor öffnen“). */
    public function EditorURL(): string
    {
        return '/hook/udteditor/' . $this->InstanceID . '#c=' . $this->CreateEditorCode();
    }

    /** Dieselbe Adresse über Symcon Connect, leer ohne aktives Connect. */
    public function EditorConnectURL(): string
    {
        $base = $this->ConnectBaseURL();
        return $base === '' ? '' : $base . $this->EditorURL();
    }

    /** Adresse von Symcon Connect, wenn aktiv (ohne Code: auch für die Sichtbarkeit des Formular-Knopfs). */
    private function ConnectBaseURL(): string
    {
        foreach (IPS_GetInstanceListByModuleID(self::CONNECT_CONTROL_GUID) as $id) {
            if (IPS_GetInstance($id)['InstanceStatus'] === 102) {
                $url = (string)@CC_GetConnectURL($id);
                if (str_starts_with($url, 'https://')) {
                    return rtrim($url, '/');
                }
            }
        }
        return '';
    }

    private function WithEditorLock(callable $fn): mixed
    {
        $name = 'UDTEditor' . $this->InstanceID;
        $locked = IPS_SemaphoreEnter($name, 2000);
        try {
            return $fn();
        } finally {
            if ($locked) {
                IPS_SemaphoreLeave($name);
            }
        }
    }

    /** Gültige Codes: Code => [idle, max, fresh] (Ablauf ohne Nutzung, spätester Ablauf, noch nicht getauscht). */
    private function ActiveEditorCodes(): array
    {
        $codes = json_decode($this->GetBuffer('EditorCodes'), true);
        $now = time();
        return array_filter(is_array($codes) ? $codes : [], static fn($c): bool => is_array($c) && ($c['idle'] ?? 0) > $now && ($c['max'] ?? 0) > $now);
    }

    /** Speichert die Codes; behalten werden die acht zuletzt benutzten (nicht die zuletzt angelegten). */
    private function StoreEditorCodes(array $codes): void
    {
        uasort($codes, static fn(array $a, array $b): int => $a['idle'] <=> $b['idle']);
        $this->SetBuffer('EditorCodes', (string)json_encode(array_slice($codes, -8, null, true)));
    }

    private function CreateEditorCode(?int $max = null): string
    {
        $code = bin2hex(random_bytes(10));
        $this->WithEditorLock(function () use ($code, $max): void {
            $codes = $this->ActiveEditorCodes();
            $codes[$code] = ['idle' => time() + 3600, 'max' => $max ?? time() + 8 * 3600, 'fresh' => $max === null];
            $this->StoreEditorCodes($codes);
        });
        return $code;
    }

    /**
     * Prüft den Code aus X-UDT-Editor und verlängert ihn; liefert ihn oder null (Antwort ist gesendet).
     * Fehlversuche zählen je Adresse; nach fünf in 60 s gibt es 429. Ein gültiger Code geht immer durch,
     * damit fremde Fehlversuche von derselben Adresse (NAT, Connect) niemanden aussperren; gegen Raten
     * schützen die 80 Bit des Codes, die Zählung hält nur das Rauschen klein.
     */
    private function EditorAuthorized(): ?string
    {
        $given = is_string($_SERVER['HTTP_X_UDT_EDITOR'] ?? null) ? $_SERVER['HTTP_X_UDT_EDITOR'] : '';
        $address = (string)($_SERVER['REMOTE_ADDR'] ?? '');
        $result = $this->WithEditorLock(function () use ($given, $address): string {
            $codes = $this->ActiveEditorCodes();
            foreach ($codes as $code => $times) {
                if ($given !== '' && hash_equals((string)$code, $given)) {
                    $idle = min((int)$times['max'], time() + 3600);
                    if ($idle - (int)$times['idle'] > 60) {
                        $codes[$code]['idle'] = $idle;
                        $this->StoreEditorCodes($codes);
                    }
                    return 'ok';
                }
            }
            $fails = json_decode($this->GetBuffer('EditorFails'), true);
            $fails = array_filter(is_array($fails) ? $fails : [], static fn($f): bool => is_array($f) && ($f[1] ?? 0) > time());
            $count = (int)($fails[$address][0] ?? 0) + 1;
            unset($fails[$address]);
            $fails[$address] = [$count, time() + 60];
            $this->SetBuffer('EditorFails', (string)json_encode(array_slice($fails, -256, null, true)));
            return $count > 5 ? 'blocked' : 'code';
        });
        if ($result === 'ok') {
            return $given;
        }
        $this->SendEditorJson($result === 'blocked' ? 429 : 401, ['error' => $result]);
        return null;
    }

    /** Ein Code aus der Adresse wird beim ersten Laden gegen einen neuen getauscht (gleicher spätester Ablauf). */
    private function RotateEditorCode(string $code): ?string
    {
        $old = $this->ActiveEditorCodes()[$code] ?? null;
        if (!is_array($old) || empty($old['fresh'])) {
            return null;
        }
        $next = $this->CreateEditorCode((int)$old['max']);
        $this->WithEditorLock(function () use ($code): void {
            $codes = $this->ActiveEditorCodes();
            unset($codes[$code]);
            $this->StoreEditorCodes($codes);
        });
        return $next;
    }

    /**
     * Bildfreigabe der Vorschau: Medien des Entwurfs, eine Stunde, nur mit dem Schlüssel aus den
     * Vorschau-URLs (ek=…). Betrachter der Kachel, die nur das Bild-Token kennen, bekommen sie nicht.
     */
    private function GrantEditorMedia(array $ids): void
    {
        $media = json_decode($this->GetBuffer('EditorMedia'), true);
        $key = (is_array($media) && ($media['until'] ?? 0) > time() && is_string($media['key'] ?? null)) ? $media['key'] : bin2hex(random_bytes(12));
        $this->editorMediaKey = $key;
        $this->SetBuffer('EditorMedia', (string)json_encode(['ids' => array_values($ids), 'until' => time() + 3600, 'key' => $key]));
    }

    private function EditorMediaAllowed(int $mediaID, string $key): bool
    {
        $media = json_decode($this->GetBuffer('EditorMedia'), true);
        return is_array($media) && ($media['until'] ?? 0) > time() && is_string($media['key'] ?? null) && $key !== ''
            && hash_equals($media['key'], $key) && in_array($mediaID, $media['ids'] ?? [], true);
    }
}
