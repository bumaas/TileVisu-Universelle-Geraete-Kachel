<?php

declare(strict_types=1);

namespace UDT;

/**
 * Eigene Vorlagen des Editors. Jede Kachel speichert ihre im Attribut UserTemplates (keine Dateien); das
 * Vorlagen-Menü sammelt die aller Kacheln dieses Moduls ein (UDST_GetUserTemplates), gelöscht wird bei der
 * Kachel, die sie gespeichert hat (UDST_DeleteUserTemplate). Gespeichert wird ohne Objekte: Variablen, Skripte,
 * Medien und Statusvariable fallen weg, die Zeilen werden beim Anwenden zu Platzhaltern.
 */
trait EditorTemplateStoreTrait
{
    /** Eigene Vorlagen dieser Kachel als JSON (für das Vorlagen-Menü der anderen Kacheln). */
    public function GetUserTemplates(): string
    {
        return (string)json_encode($this->OwnUserTemplates(), JSON_UNESCAPED_UNICODE);
    }

    /** Eigene Vorlage dieser Kachel löschen; false, wenn es sie nicht gibt. */
    public function DeleteUserTemplate(string $Key): bool
    {
        $list = $this->OwnUserTemplates();
        $rest = array_values(array_filter($list, static fn(array $t): bool => ($t['key'] ?? '') !== $Key));
        if (count($rest) === count($list)) {
            return false;
        }
        $this->WriteAttributeString('UserTemplates', (string)json_encode($rest, JSON_UNESCAPED_UNICODE));
        return true;
    }

    private function OwnUserTemplates(): array
    {
        $list = json_decode($this->ReadAttributeString('UserTemplates'), true);
        return is_array($list) ? array_values(array_filter($list, 'is_array')) : [];
    }

    private function ModuleOf(int $id): string
    {
        return (string)(IPS_GetInstance($id)['ModuleInfo']['ModuleID'] ?? '');
    }

    /** Eigene Vorlagen aller Kacheln dieses Moduls fürs Menü; id = user:<Kachel>:<Schlüssel>. */
    private function AllUserTemplates(): array
    {
        $all = [];
        foreach (IPS_GetInstanceListByModuleID($this->ModuleOf($this->InstanceID)) as $id) {
            if ($id === $this->InstanceID) {
                $list = $this->OwnUserTemplates();
            } else {
                $list = json_decode(function_exists('UDST_GetUserTemplates') ? (string)@UDST_GetUserTemplates($id) : '[]', true);
            }
            foreach (is_array($list) ? $list : [] as $t) {
                if (!is_array($t) || !is_array($t['config'] ?? null) || !is_string($t['key'] ?? null)) {
                    continue;
                }
                $all[] = ['id' => 'user:' . $id . ':' . $t['key'], 'caption' => (string)($t['caption'] ?? ''),
                    'icon' => (string)($t['icon'] ?? 'star'), 'config' => $t['config'], 'user' => true];
            }
        }
        usort($all, static fn(array $a, array $b): int => strcasecmp($a['caption'], $b['caption']));
        return $all;
    }

    /** api=saveTemplate: {caption, icon, config} aus dem Entwurf, geprüft und ohne Objekte, in dieser Kachel. */
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
        $list = $this->OwnUserTemplates();
        if (count($list) >= 50) {
            return [422, ['errors' => [$this->Translate('A tile can hold at most 50 templates.')]]];
        }
        $list[] = ['key' => bin2hex(random_bytes(6)), 'caption' => $caption, 'icon' => $icon, 'config' => self::StripTemplate($config)];
        $json = (string)json_encode($list, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 1024 * 1024) {
            return [422, ['errors' => [$this->Translate('The templates of this tile are too large.')]]];
        }
        $this->WriteAttributeString('UserTemplates', $json);
        return [200, ['templates' => $this->EditorTemplates()]];
    }

    /** api=deleteTemplate: {id}; nur Vorlagen von Kacheln dieses Moduls. */
    private function EditorDeleteTemplate(array $body): array
    {
        if (preg_match('/^user:(\d+):([0-9a-f]{12})$/', self::EditorText($body['id'] ?? ''), $m) !== 1) {
            return [400, ['error' => 'id']];
        }
        $owner = (int)$m[1];
        if ($owner === $this->InstanceID) {
            $this->DeleteUserTemplate($m[2]);
        } elseif (IPS_InstanceExists($owner) && $this->ModuleOf($owner) === $this->ModuleOf($this->InstanceID) && function_exists('UDST_DeleteUserTemplate')) {
            @UDST_DeleteUserTemplate($owner, $m[2]);
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
