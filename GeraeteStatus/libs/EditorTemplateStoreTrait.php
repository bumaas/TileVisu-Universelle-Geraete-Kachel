<?php

declare(strict_types=1);

namespace UDT;

/**
 * Eigene Vorlagen des Editors. Jede Kachel dieses Moduls hält die vollständige Liste im Attribut UserTemplates
 * (keine Dateien): Speichern und Löschen schreiben die neue Liste in alle Kacheln (UDST_SyncUserTemplates), das
 * Menü liest die Vereinigung aller (UDST_GetUserTemplates, doppelte Schlüssel einmal). Wird eine Kachel gelöscht,
 * bleiben die Vorlagen in den übrigen erhalten. Gespeichert wird ohne Objekte (Variablen, Skripte, Medien und
 * Statusvariable fallen weg, die Zeilen werden beim Anwenden zu Platzhaltern), außer der Nutzer setzt im Dialog
 * das Häkchen „mitspeichern“ (withObjects): dann verweist die Vorlage auf dieselben Objekte.
 */
trait EditorTemplateStoreTrait
{
    /** Eigene Vorlagen in dieser Kachel als JSON (für das Vorlagen-Menü der anderen Kacheln). */
    public function GetUserTemplates(): string
    {
        return (string)json_encode($this->OwnUserTemplates(), JSON_UNESCAPED_UNICODE);
    }

    /** Liste der eigenen Vorlagen in dieser Kachel ersetzen (der Editor einer Kachel verteilt sie an alle). */
    public function SyncUserTemplates(string $Templates): bool
    {
        $list = json_decode($Templates, true);
        if (!is_array($list)) {
            return false;
        }
        $clean = array_values(array_filter($list, static fn($t): bool => is_array($t) && is_string($t['key'] ?? null) && is_array($t['config'] ?? null)));
        $this->WriteAttributeString('UserTemplates', (string)json_encode($clean, JSON_UNESCAPED_UNICODE));
        return true;
    }

    private function OwnUserTemplates(): array
    {
        $list = json_decode($this->ReadAttributeString('UserTemplates'), true);
        return is_array($list) ? array_values(array_filter($list, 'is_array')) : [];
    }

    /** Alle Kacheln dieses Moduls (die eigene zuerst). */
    private function TemplateTiles(): array
    {
        $module = (string)(IPS_GetInstance($this->InstanceID)['ModuleInfo']['ModuleID'] ?? '');
        $others = array_values(array_filter(IPS_GetInstanceListByModuleID($module), fn(int $id): bool => $id !== $this->InstanceID));
        return array_merge([$this->InstanceID], $others);
    }

    /** Vereinigung der Vorlagen aller Kacheln, je Schlüssel einmal, nach Namen sortiert. */
    private function SharedTemplates(): array
    {
        $byKey = [];
        foreach ($this->TemplateTiles() as $id) {
            if ($id === $this->InstanceID) {
                $list = $this->OwnUserTemplates();
            } else {
                $list = json_decode(function_exists('UDST_GetUserTemplates') ? (string)@UDST_GetUserTemplates($id) : '[]', true);
            }
            foreach (is_array($list) ? $list : [] as $t) {
                if (is_array($t) && is_string($t['key'] ?? null) && is_array($t['config'] ?? null) && !isset($byKey[$t['key']])) {
                    $byKey[$t['key']] = $t;
                }
            }
        }
        $all = array_values($byKey);
        usort($all, static fn(array $a, array $b): int => strcasecmp((string)($a['caption'] ?? ''), (string)($b['caption'] ?? '')));
        return $all;
    }

    /** Liste in alle Kacheln schreiben. */
    private function WriteSharedTemplates(array $list): void
    {
        $json = (string)json_encode(array_values($list), JSON_UNESCAPED_UNICODE);
        foreach ($this->TemplateTiles() as $id) {
            if ($id === $this->InstanceID) {
                $this->WriteAttributeString('UserTemplates', $json);
            } elseif (function_exists('UDST_SyncUserTemplates')) {
                @UDST_SyncUserTemplates($id, $json);
            }
        }
    }

    /** Eigene Vorlagen fürs Menü; id = user:<Schlüssel>. */
    private function AllUserTemplates(): array
    {
        return array_map(static fn(array $t): array => ['id' => 'user:' . $t['key'], 'caption' => (string)($t['caption'] ?? ''),
            'icon' => (string)($t['icon'] ?? 'star'), 'config' => $t['config'], 'user' => true], $this->SharedTemplates());
    }

    /** api=saveTemplate: {caption, icon, config, withObjects} aus dem Entwurf, geprüft, in alle Kacheln. */
    private function EditorSaveTemplate(array $body): array
    {
        $caption = trim(self::EditorText($body['caption'] ?? ''));
        if ($caption === '' || mb_strlen($caption) > 60) {
            return [422, ['errors' => [$this->Translate('Enter a name (at most 60 characters).')]]];
        }
        $icon = self::EditorText($body['icon'] ?? '');
        if (preg_match('/^[A-Za-z0-9 _-]{1,64}$/', $icon) !== 1) {
            $icon = 'star';
        }
        [$config] = EditorSchema::Normalize(is_array($body['config'] ?? null) ? $body['config'] : [], static fn(): bool => true);
        $list = $this->SharedTemplates();
        if (count($list) >= 50) {
            return [422, ['errors' => [$this->Translate('There can be at most 50 own templates.')]]];
        }
        $withObjects = ($body['withObjects'] ?? false) === true;
        $list[] = ['key' => bin2hex(random_bytes(6)), 'caption' => $caption, 'icon' => $icon, 'withObjects' => $withObjects,
            'config' => $withObjects ? $config : self::StripTemplate($config)];
        if (strlen((string)json_encode($list, JSON_UNESCAPED_UNICODE)) > 1024 * 1024) {
            return [422, ['errors' => [$this->Translate('The own templates are too large.')]]];
        }
        $this->WriteSharedTemplates($list);
        return [200, ['templates' => $this->EditorTemplates()]];
    }

    /** api=deleteTemplate: {id} = user:<Schlüssel>; aus allen Kacheln. */
    private function EditorDeleteTemplate(array $body): array
    {
        if (preg_match('/^user:([0-9a-f]{12})$/', self::EditorText($body['id'] ?? ''), $m) !== 1) {
            return [400, ['error' => 'id']];
        }
        $list = $this->SharedTemplates();
        $rest = array_values(array_filter($list, static fn(array $t): bool => $t['key'] !== $m[1]));
        if (count($rest) !== count($list)) {
            $this->WriteSharedTemplates($rest);
        }
        return [200, ['templates' => $this->EditorTemplates()]];
    }

    /** Vorlage ohne Objekte: Verweise auf 0, Statusvariable weg, eigene Bilder der Zuordnungen auf „kein Bild“. */
    private static function StripTemplate(array $config): array
    {
        unset($config['Status']);
        foreach (['DefaultImage', 'bgImage'] as $key) {
            if (array_key_exists($key, $config)) {
                $config[$key] = 0;
            }
        }
        foreach ($config['VariablesList'] ?? [] as $i => $row) {
            foreach (['Variable', 'SecondVariable', 'ScriptID', 'OpenObjectId', 'ImageMedia'] as $key) {
                if (is_array($row) && array_key_exists($key, $row)) {
                    $config['VariablesList'][$i][$key] = 0;
                }
            }
        }
        foreach ($config['ProfilAssoziazionen'] ?? [] as $i => $assoc) {
            if (!is_array($assoc)) {
                continue;
            }
            if (($assoc['Bildauswahl'] ?? '') === 'custom') {
                $config['ProfilAssoziazionen'][$i]['Bildauswahl'] = 'none';
            }
            $config['ProfilAssoziazionen'][$i]['EigenesBild'] = 0;
        }
        return $config;
    }
}
