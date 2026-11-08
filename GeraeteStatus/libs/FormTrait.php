<?php

declare(strict_types=1);

namespace UDT;

/**
 * Konfigurationsformular-Logik: Gruppennamen-Injektion (inkl. String-Patching
 * der dynamischen Form-Skripte — fragiler Vertrag mit form.json!), Befüllen
 * der Anzeige-Spalten, Profilzuordnungs-Liste (UpdateList) und Feld-
 * Sichtbarkeiten je Darstellungsart (UpdateDisplayTypeVisibility; die Matrix
 * DISPLAY_TYPE_FIELD_VISIBILITY liegt als Klassenkonstante in module.php).
 */
trait FormTrait
{
    /**
     * Gibt alle Gruppennamen und ShowAbove/Line Konfiguration als Array zurück für Frontend-Verwendung
     * @return array Assoziatives Array mit Gruppennummer als Key und Konfiguration als Value
     */
    public function GetAllGroupNames(): array
    {
        $groupNamesList = json_decode($this->SettingString('GroupNamesList'), true);
        
        $result = [];
        
        if (is_array($groupNamesList)) {
            foreach ($groupNamesList as $index => $group) {
                if (isset($group['GroupName'])) {
                    $groupNumber = $index + 1; // Array-Index 0 = Gruppe 1
                    $showAbove = isset($group['ShowAbove']) ? (bool)$group['ShowAbove'] : false;
                    $showLine = isset($group['line']) ? (bool)$group['line'] : false;
                    $stretch = isset($group['stretch']) ? (bool)$group['stretch'] : false;
                    $showGroupName = isset($group['ShowGroupName']) ? (bool)$group['ShowGroupName'] : false;
                    $groupIcon = isset($group['Groupicon']) ? trim($group['Groupicon']) : '';
                
                    // Map Group Icon durch das bestehende Icon-Mapping-System
                    $mappedIcon = '';
                    if (!empty($groupIcon)) {
                        $mappedIcon = $this->MapIconToFontAwesome($groupIcon);
                    }
                
                    $result[$groupNumber] = [
                        'name' => $group['GroupName'],
                        'showAbove' => $showAbove,
                        'showLine' => $showLine,
                        'stretch' => $stretch,
                        'showGroupName' => $showGroupName,
                        'groupIcon' => $mappedIcon,
                        'fontSize' => $this->SettingInteger('GroupNameSize') // Globale Schriftgröße für alle Gruppen
                    ];
                }
            }
        }
        
        // Stelle sicher, dass alle Gruppen 1-10 existieren
        for ($i = 1; $i <= 10; $i++) {
            if (!isset($result[$i])) {
                $result[$i] = [
                    'name' => "Group $i",
                    'showAbove' => false,
                    'showLine' => false,
                    'stretch' => false,
                    'showGroupName' => false,
                    'groupIcon' => '',
                    'fontSize' => $this->SettingInteger('GroupNameSize') // Globale Schriftgröße für alle Gruppen
                ];
            }
        }
        
        return $result;
    }

    /**
     * @param array $groupNames Die konfigurierten Gruppennamen
     * @return array
     */
    private function BuildGroupSelectOptions(array $groupNames): array
    {
        $options = [
            [
                'caption' => 'keine Gruppe',
                'value' => 'keine Gruppe'
            ]
        ];

        for ($i = 1; $i <= 10; $i++) {
            $caption = 'Gruppe ' . $i;
            if (isset($groupNames[$i]['name']) && trim((string)$groupNames[$i]['name']) !== '') {
                $caption = (string)$groupNames[$i]['name'];
            }

            $options[] = [
                'caption' => $caption,
                'value' => 'Gruppe ' . $i
            ];
        }

        return $options;
    }

    private function UpdateGroupSelectOptionsInForm(mixed &$element, array $groupOptions): void
    {
        if (!is_array($element)) {
            return;
        }

        if (($element['name'] ?? '') === 'Group' &&
            isset($element['edit']) && is_array($element['edit']) &&
            (($element['edit']['type'] ?? '') === 'Select')) {
            $element['edit']['options'] = $groupOptions;
        }

        foreach ($element as &$subElement) {
            $this->UpdateGroupSelectOptionsInForm($subElement, $groupOptions);
        }
    }

    private function UpdateGroupOptionsInDynamicFormScript(mixed &$element, array $groupOptions): void
    {
        if (!is_array($element)) {
            return;
        }

        if (isset($element['form']) && is_array($element['form'])) {
            $element['form'] = $this->PatchGroupOptionsInFormScriptLines($element['form'], $groupOptions);
        }

        foreach ($element as &$subElement) {
            $this->UpdateGroupOptionsInDynamicFormScript($subElement, $groupOptions);
        }
    }

    private function PatchGroupOptionsInFormScriptLines(array $formLines, array $groupOptions): array
    {
        $patched = [];
        $inGroupSelect = false;
        $inOptions = false;
        $optionsInjected = false;
        $groupOptionCount = count($groupOptions);

        foreach ($formLines as $line) {
            if (!is_string($line)) {
                $patched[] = $line;
                continue;
            }

            if (!$inGroupSelect &&
                strpos($line, "'name' => 'Group'") !== false &&
                strpos($line, "'type' => 'Select'") !== false) {
                $inGroupSelect = true;
            }

            if ($inGroupSelect && !$inOptions && strpos($line, "'options' => [") !== false) {
                $patched[] = $line;

                foreach ($groupOptions as $index => $option) {
                    // var_export liefert ein korrektes einfach quotiertes Literal (addslashes machte aus " ein \")
                    $caption = var_export((string)($option['caption'] ?? ''), true);
                    $value = var_export((string)($option['value'] ?? ''), true);
                    $comma = ($index < ($groupOptionCount - 1)) ? ',' : '';
                    $patched[] = "        [ 'caption' => " . $caption . ", 'value' => " . $value . " ]" . $comma;
                }

                $inOptions = true;
                $optionsInjected = true;
                continue;
            }

            if ($inOptions) {
                if (trim($line) === '],') {
                    $patched[] = $line;
                    $inOptions = false;
                }
                continue;
            }

            $patched[] = $line;

            if ($inGroupSelect && strpos($line, "'visible' => true") !== false) {
                $inGroupSelect = false;
            }
        }

        return $optionsInjected ? $patched : $formLines;
    }

    /**
     * Befüllt die neue GroupName Anzeige-Spalte mit konfigurierten Gruppennamen
     * @param array &$form Das Form-Array (per Referenz)
     * @param array $groupNames Die konfigurierten Gruppennamen
     */
    private function populateGroupNameColumn(array &$form, array $groupNames): void
    {
        // Lade die aktuellen VariablesList-Daten
        $currentVariables = $this->ReadVariablesList();
        if ($currentVariables === []) {
            return;
        }
        
        // Aktualisiere jeden Eintrag mit dem entsprechenden Gruppennamen
        foreach ($currentVariables as &$variable) {
            $technicalGroup = $variable['Group'] ?? 'keine Gruppe';
            $displayName = $this->getGroupDisplayName($technicalGroup, $groupNames);
            $variable['GroupName'] = $displayName;
            $variable['ObjectDisplay'] = $this->getObjectDisplayForVariableRow($variable);
        }
        
        // Finde und aktualisiere die VariablesList direkt im Form-Array
        $this->updateVariablesListInForm($form, $currentVariables);
    }

    /**
     * Aktualisiert die VariablesList direkt im Form-Array
     * @param array &$form Das Form-Array (per Referenz)
     * @param array $updatedVariables Die aktualisierten Variablen-Daten
     */
    private function updateVariablesListInForm(array &$form, array $updatedVariables): void
    {
        $this->findAndUpdateVariablesList($form, $updatedVariables);
    }

    /**
     * Rekursive Suche und Update der VariablesList
     * @param array &$element Das aktuelle Element (per Referenz)
     * @param array $updatedVariables Die aktualisierten Variablen-Daten
     */
    private function findAndUpdateVariablesList(mixed &$element, array $updatedVariables): void
    {
        if (is_array($element)) {
            // Prüfe, ob dies die VariablesList ist
            if (isset($element['name']) && $element['name'] === 'VariablesList') {
                $element['values'] = $updatedVariables;
                return;
            }
            
            // Rekursive Suche in allen Array-Elementen
            foreach ($element as &$subElement) {
                $this->findAndUpdateVariablesList($subElement, $updatedVariables);
            }
        }
    }

    /**
     * Ermittelt den Anzeigenamen für einen technischen Gruppenwert
     * @param string $technicalGroup Der technische Gruppenwert (z.B. "Gruppe 1")
     * @param array $groupNames Die konfigurierten Gruppennamen
     * @return string Der Anzeigename
     */
    private function getGroupDisplayName(mixed $technicalGroup, array $groupNames): string
    {
        $technicalGroup = (string)$technicalGroup;
        if ($technicalGroup === 'keine Gruppe') {
            return 'keine Gruppe';
        }
        
        // Extrahiere die Gruppennummer aus "Gruppe X"
        if (preg_match('/^Gruppe (\d+)$/', $technicalGroup, $matches)) {
            $groupNumber = (int)$matches[1];
            
            // Suche den konfigurierten Namen
            if (isset($groupNames[$groupNumber]) && !empty($groupNames[$groupNumber]['name'])) {
                return $groupNames[$groupNumber]['name'];
            }
        }
        
        // Fallback: Technischen Wert zurückgeben
        return $technicalGroup;
    }

    private function getObjectDisplayForVariableRow(array $row): string
    {
        $displayType = $row['DisplayType'] ?? 'text';
        if ($displayType === 'image') {
            $mid = intval($row['ImageMedia'] ?? 0);
            if ($mid > 0 && IPS_MediaExists($mid)) {
                return $this->formatObjectWithParent($mid);
            }
            return '';
        }
        // OpenObject-Buttons: OpenObjectId-Namen anzeigen (hat Priorität)
        if (($displayType === 'button') && isset($row['OpenObjectId'])) {
            $openObjectId = intval($row['OpenObjectId']);
            if ($openObjectId > 0 && IPS_ObjectExists($openObjectId)) {
                return $this->formatObjectWithParent($openObjectId);
            }
        }
        // Script-Buttons ohne Variable: Script-Namen anzeigen (Label überschreibt den Namen)
        if (($displayType === 'button') && isset($row['ScriptID'])) {
            $scriptId = intval($row['ScriptID']);
            if ($scriptId > 0 && function_exists('IPS_ScriptExists') && IPS_ScriptExists($scriptId)) {
                $override = !empty($row['Label']) ? strval($row['Label']) : '';
                return $this->formatObjectWithParent($scriptId, $override);
            }
        }
        $vid = intval($row['Variable'] ?? 0);
        if ($vid > 0 && IPS_VariableExists($vid)) {
            return $this->formatObjectWithParent($vid);
        }
        return '';
    }

    /**
     * Formatiert einen Objektnamen mit Parent-Namen als "Name (Parent)".
     * Optional kann der Name überschrieben werden (z. B. durch ein konfiguriertes Label).
     */
    private function formatObjectWithParent(int $objectId, string $overrideName = ''): string
    {
        $obj = IPS_GetObject($objectId);
        $name = isset($obj['ObjectName']) ? $obj['ObjectName'] : '';
        if ($overrideName !== '') {
            $name = $overrideName;
        }
        $parentName = '';
        if (isset($obj['ParentID']) && $obj['ParentID'] > 0 && IPS_ObjectExists($obj['ParentID'])) {
            $parent = IPS_GetObject($obj['ParentID']);
            $parentName = isset($parent['ObjectName']) ? $parent['ObjectName'] : '';
        }
        if ($name !== '' && $parentName !== '') {
            return $name . ' (' . $parentName . ')';
        }
        return $name;
    }

    public function UpdateList(int $StatusID): void
    {
        $this->UpdateFormField('ProfilAssoziazionen', 'values', (string)json_encode($this->BuildAssociationList($StatusID)));
    }

    /**
     * Status-Zuordnungen aus der Darstellung (oder dem Profil) der Statusvariable, je Wert mit Icon der
     * Darstellung oder ohne Bild; für das Formular (UpdateList) und den Editor.
     */
    private function BuildAssociationList(int $statusID): array
    {
        $listData = [];
        if ($statusID > 0 && IPS_VariableExists($statusID)) {
            $associations = $this->GetVariableAssociations($statusID, IPS_GetVariable($statusID)['VariableType']);
            foreach (is_array($associations) ? $associations : [] as $association) {
                $hasIcon = isset($association['icon']) && !empty($association['icon']);
                $listData[] = [
                    'AssoziationName' => $association['name'],
                    'AssoziationValue' => $association['value'],
                    'Bildauswahl' => $hasIcon ? 'symcon_icon' : 'none',
                    'EigenesBild' => 0,
                    'SymconIcon' => $hasIcon ? $association['icon'] : '',
                    'IconColor' => -1,
                    'StatusColor' => -1,
                    'ProgressbarActive' => true
                ];
            }
        }
        return $listData;
    }

    public function UpdateDisplayTypeVisibility(string $displayType, ?int $rowId = null): void
    {
        $fields = self::DISPLAY_TYPE_FIELD_VISIBILITY[$displayType] ?? self::DISPLAY_TYPE_FIELD_VISIBILITY['default'];
        foreach ($fields as $field => $visible) {
            $this->UpdateFormField($field, 'visible', $visible);
        }
        // SelectObject steht erst ab Kernel > 8.1 zur Verfügung
        if ($displayType === 'button' && (float)IPS_GetKernelVersion() <= 8.1) {
            $this->UpdateFormField('OpenObjectId', 'visible', false);
        }
    }
}
