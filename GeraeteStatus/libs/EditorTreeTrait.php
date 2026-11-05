<?php

declare(strict_types=1);

namespace UDT;

/**
 * Objektauswahl des Editors: Objektbaum ebenenweise, Suche und Kurzinfos der verwendeten Objekte. Nur
 * lesend; welche Objekte die Kachel verwendet, entscheidet der Nutzer erst beim Speichern.
 */
trait EditorTreeTrait
{
    /** Kurzinfo eines Objekts (Name, Art, Pfad; bei Variablen Typ, Wert und Aktion), null wenn es fehlt. */
    private function EditorObjectInfo(int $id, bool $withPath = true): ?array
    {
        if ($id <= 0 || !IPS_ObjectExists($id)) {
            return null;
        }
        $object = IPS_GetObject($id);
        $info = [
            'id' => $id,
            'name' => (string)$object['ObjectName'],
            'type' => (int)$object['ObjectType'],
            'icon' => (string)$object['ObjectIcon'],
            'children' => (bool)$object['HasChildren'],
            'parent' => (int)$object['ParentID'], // Objektauswahl beginnt bei den Nachbarn der letzten Wahl
        ];
        if ($info['name'] === '' && $info['type'] === 1) {
            $info['name'] = (string)(IPS_GetInstance($id)['ModuleInfo']['ModuleName'] ?? ''); // wie die Konsole
        }
        if ($withPath) {
            $info['path'] = $this->EditorObjectPath($id);
        }
        if ($info['type'] === 2) {
            $info['varType'] = (int)IPS_GetVariable($id)['VariableType'];
            $info['value'] = mb_substr((string)GetValueFormatted($id), 0, 60);
            $info['action'] = HasAction($id);
            $info['suggest'] = $this->EditorSuggestType($id, $info['varType'], $info['action']);
            $info['hidden'] = (bool)$object['ObjectIsHidden']; // „Zeilen aus Gerät“ lässt versteckte Variablen zunächst weg
        } elseif ($info['type'] === 5) {
            $info['mediaType'] = (int)IPS_GetMedia($id)['MediaType'];
        }
        return $info;
    }

    /**
     * Anzeigetyp, der zur Variable passt: Schalter und Auswahl mit Aktion → Button, Regler-Darstellung mit Aktion →
     * Regler (ohne Aktion → Balken), Prozentwerte ohne Aktion → Balken, sonst Text. Nur ein Vorschlag des Editors.
     */
    private function EditorSuggestType(int $id, int $varType, bool $action): string
    {
        $presentation = function_exists('IPS_GetVariablePresentation') ? @IPS_GetVariablePresentation($id) : [];
        $presentation = is_array($presentation) ? $presentation : [];
        $guid = (string)($presentation['PRESENTATION'] ?? '');
        $is = static fn(string $name): bool => defined($name) && strcasecmp($guid, (string)constant($name)) === 0;
        $numeric = $varType === 1 || $varType === 2;
        if ($guid === '' || $is('VARIABLE_PRESENTATION_LEGACY')) {
            $variable = IPS_GetVariable($id);
            $name = (string)($variable['VariableCustomProfile'] ?: $variable['VariableProfile']);
            $profile = $name !== '' && IPS_VariableProfileExists($name) ? IPS_GetVariableProfile($name) : [];
            if ($varType === 0 || count($profile['Associations'] ?? []) > 0) {
                return $action ? 'button' : 'text';
            }
            if ($numeric && $action && (float)($profile['MaxValue'] ?? 0) > (float)($profile['MinValue'] ?? 0)) {
                return 'slider';
            }
            return $numeric && trim((string)($profile['Suffix'] ?? '')) === '%' ? 'progress' : 'text';
        }
        if ($is('VARIABLE_PRESENTATION_SWITCH') || $is('VARIABLE_PRESENTATION_ENUMERATION')) {
            return $action ? 'button' : 'text';
        }
        if ($numeric && ($is('VARIABLE_PRESENTATION_SLIDER') || $is('VARIABLE_PRESENTATION_SHUTTER'))) {
            return $action ? 'slider' : 'progress';
        }
        $percent = trim((string)($presentation['SUFFIX'] ?? '')) === '%' || ($presentation['PERCENTAGE'] ?? false) === true;
        return $numeric && !$action && $percent ? 'progress' : 'text';
    }

    /** Pfad der Eltern („Erdgeschoss › Küche“), höchstens acht Ebenen. */
    private function EditorObjectPath(int $id): string
    {
        $names = [];
        $parent = (int)IPS_GetParent($id);
        for ($depth = 0; $parent > 0 && $depth < 8; $depth++) {
            array_unshift($names, IPS_GetName($parent));
            $parent = (int)IPS_GetParent($parent);
        }
        return implode(' › ', $names);
    }

    /** Kinder eines Objekts in Baumreihenfolge (Position, dann Name), höchstens 200. */
    private function EditorChildren(int $parentID): array
    {
        if ($parentID !== 0 && !IPS_ObjectExists($parentID)) {
            return ['items' => [], 'more' => false];
        }
        $objects = [];
        foreach (IPS_GetChildrenIDs($parentID) as $id) {
            $object = IPS_GetObject($id);
            if ($object['ObjectIsHidden'] && $object['ObjectType'] === 4) {
                continue; // versteckte Ereignisse helfen bei der Auswahl nicht
            }
            $objects[] = [$object['ObjectPosition'], mb_strtolower((string)$object['ObjectName']), $id];
        }
        sort($objects);
        $items = [];
        foreach (array_slice($objects, 0, 200) as [, , $id]) {
            $info = $this->EditorObjectInfo((int)$id, false);
            if ($info !== null) {
                $items[] = $info;
            }
        }
        return ['items' => $items, 'more' => count($objects) > 200];
    }

    /** Suche im Namen, gefiltert nach der gesuchten Art; höchstens 50 Treffer mit Pfad. */
    private function EditorSearch(string $query, string $kind): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 2) {
            return ['items' => [], 'more' => false];
        }
        $ids = match ($kind) {
            'variable' => IPS_GetVariableList(),
            'script' => IPS_GetScriptList(),
            'image' => IPS_GetMediaListByType(1),
            'instance' => IPS_GetInstanceList(),
            default => IPS_GetObjectList(),
        };
        $hits = [];
        $more = false;
        foreach ($ids as $id) {
            if (mb_stripos(IPS_GetName($id), $query) === false) {
                continue;
            }
            if (count($hits) >= 50) {
                $more = true;
                break;
            }
            $info = $this->EditorObjectInfo((int)$id);
            if ($info !== null) {
                $hits[] = $info;
            }
        }
        return ['items' => $hits, 'more' => $more];
    }

    /** Kurzinfos aller Objekt-IDs, die in einer Konfiguration stehen (Anzeige der Auswahlfelder). */
    private function EditorObjectsOf(array $config): array
    {
        $ids = [];
        $collect = static function (array $entry, array $fields) use (&$ids): void {
            foreach ($fields as $field) {
                if (is_int($entry[$field] ?? null) && $entry[$field] > 0) {
                    $ids[] = $entry[$field];
                }
            }
        };
        $collect($config, ['Status', 'DefaultImage', 'bgImage']);
        foreach ($config['VariablesList'] ?? [] as $row) {
            $collect($row, ['Variable', 'SecondVariable', 'ScriptID', 'OpenObjectId', 'ImageMedia']);
        }
        foreach ($config['ProfilAssoziazionen'] ?? [] as $association) {
            $collect($association, ['EigenesBild']);
        }
        $objects = [];
        foreach (array_unique($ids) as $id) {
            $objects[(string)$id] = $this->EditorObjectInfo($id);
        }
        return $objects;
    }
}
