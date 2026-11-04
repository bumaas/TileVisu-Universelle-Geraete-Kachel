<?php

declare(strict_types=1);

namespace UDT;

/**
 * Icon-Auflösung: Präsentationen (IPS_GetVariablePresentation), Darstellungen/
 * Visualisierungen, klassische Variablenprofile sowie das Mapping von
 * IP-Symcon-Icons auf FontAwesome (assets/iconMapping.json).
 */
trait IconTrait
{
    /**
     * Icon-Mapping Tabelle (IP-Symcon zu FontAwesome)
     * @var array|null
     */
    protected $iconMapping = null;

    private function GetIcon(int $id): string {
        try {
            $variable = IPS_GetVariable($id);
            $Value = $this->CurrentValue($id);
            $icon = "";
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
            return 'Transparent'; // Fallback bei Fehler
        }

        // Präsentation über IPS_GetVariablePresentation laden (löst Vorlagen, GUIDs etc. automatisch auf)
        $legacyGuid = self::LEGACY_PRESENTATION_GUID;
        $isLegacyPresentation = false;
        $customPresentation = $this->resolvePresentationArray($id, __FUNCTION__ . ':GetVariablePresentation');
        if (isset($customPresentation['PRESENTATION'])) {
            $presentGuidTrim = trim((string)$customPresentation['PRESENTATION'], '{} ');
            $isLegacyPresentation = (strcasecmp($presentGuidTrim, $legacyGuid) === 0);
        }

        // PFAD A: Auflösung über die Präsentation (Nicht-Legacy) — endet immer mit return
        if (!empty($customPresentation) && !$isLegacyPresentation) {
            $icon = $this->resolveIconFromPresentation($customPresentation, $variable, $Value, $id);

            // Fallback: Icon über Associations (Profile/OPTIONS/TEMPLATE/PRESENTATION) ermitteln
            if ($icon == "") {
                $associationIcon = $this->GetAssociationIconForCurrentValue($id, $variable['VariableType'], $Value);
                if ($associationIcon !== '') {
                    $icon = $associationIcon;
                }
            }
            // Fallback: Darstellung/Visualisierung
            if ($icon == "") {
                $icon = $this->resolveIconFromVisualization($id, $Value, __FUNCTION__ . ':GetVariableVisualization');
            }
            // Fallback: klassisches Variablenprofil
            if ($icon == "") {
                $profile = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
                $icon = $this->resolveIconFromClassicProfile((string)$profile, $Value);
            }
            // Finaler Fallback wenn nichts gefunden wurde
            if ($icon == "") {
                $icon = "Transparent";
            }
            return $this->MapIconToFontAwesome((string)$icon);
        }

        // PFAD B: keine (nutzbare) Präsentation → Darstellung/Visualisierung, Associations, Profil
        if ($icon == "" && !$isLegacyPresentation) {
            if (function_exists('IPS_GetVariableVisualization')) {
                $icon = $this->resolveIconFromVisualization($id, $Value, __FUNCTION__ . ':GetVariableVisualizationFallback');

                // Boolean: Association-Icon hat Vorrang vor dem Visualisierungs-Icon
                if ($variable['VariableType'] == 0) {
                    $assocIcon = $this->resolveIconFromBooleanAssociations($id);
                    if ($assocIcon !== '') {
                        $icon = $assocIcon;
                    }
                }
            }

            // Fallback: Icon über Associations (Profile/OPTIONS/TEMPLATE/PRESENTATION) ermitteln
            if ($icon == "") {
                $associationIcon = $this->GetAssociationIconForCurrentValue($id, $variable['VariableType'], $Value);
                if ($associationIcon !== '') {
                    $icon = $associationIcon;
                }
            }

            // Boolean-Fallback (falls IPS_GetVariableVisualization nicht verfügbar war)
            if ($icon == "" && $variable['VariableType'] == 0) {
                $icon = $this->resolveIconFromBooleanAssociations($id);
            }

            // Fallback: klassisches Variablenprofil
            if ($icon == "") {
                $profile = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
                $icon = $this->resolveIconFromClassicProfile((string)$profile, $Value);
            }

            // Finaler Fallback wenn nichts gefunden wurde
            if ($icon == "") {
                $icon = "Transparent";
            }
        }

        // Letzter, allgemeiner Fallback auf klassische Profile – auch wenn zuvor "Transparent" gesetzt wurde.
        // Unterstützt zusätzlich das Profil aus PRESENTATION ([PROFILE]) falls VariableProfile leer ist.
        // Bewusst nicht mit resolveIconFromClassicProfile zusammengelegt: dieser Block toleriert
        // 'Transparent' als Zwischenstand und ersetzt es ggf. durch das Profil-Standard-Icon.
        if ($icon === '' || $icon === 'Transparent') {
            $profile = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
            if (empty($profile) && isset($customPresentation['PROFILE']) && !empty($customPresentation['PROFILE'])) {
                $profile = $customPresentation['PROFILE'];
            }
            if (!empty($profile) && IPS_VariableProfileExists($profile)) {
                $p = IPS_GetVariableProfile($profile);
                if (isset($p['Associations']) && is_array($p['Associations'])) {
                    foreach ($p['Associations'] as $association) {
                        if (isset($association['Value']) && isset($association['Icon']) && $association['Icon'] !== '' && $association['Value'] == $Value) {
                            $icon = $association['Icon'];
                            break;
                        }
                    }
                }
                if (($icon === '' || $icon === 'Transparent') && isset($p['Icon']) && $p['Icon'] !== '') {
                    $icon = $p['Icon'];
                }
            }
        }

        // Icon-Mapping zu FontAwesome durchführen
        return $this->MapIconToFontAwesome((string)$icon);
    }

    /**
     * Extrahiert das Icon aus einer aufgelösten (Nicht-Legacy-)Präsentation:
     * direktes ICON, Boolean-ICON_TRUE/ICON_FALSE (mit USE_ICON_FALSE) sowie wertabhängige
     * INTERVALS/OPTIONS bei numerischen Variablen — letztere dürfen ein bereits gefundenes
     * statisches Icon bewusst überschreiben. Liefert '' wenn nichts gefunden.
     */
    private function resolveIconFromPresentation(array $customPresentation, array $variable, mixed $Value, int $id): string
    {
        $icon = "";

        // Zuerst nach direktem Icon suchen (Standard-Icon)
        if (isset($customPresentation['ICON']) && $customPresentation['ICON'] != "") {
            $icon = $customPresentation['ICON'];
        } elseif (isset($customPresentation['Icon']) && $customPresentation['Icon'] != "") {
            // Fallback für kleingeschriebenes 'icon' Schlüsselwort
            $icon = $customPresentation['Icon'];
        }

        // Prüfe auch direkt nach Icon-Feldern ohne PRESENTATION GUID (für einfache Darstellungen)
        if ($icon == "") {
            // SPECIAL: Für Boolean-Variablen mit ICON_TRUE/ICON_FALSE, prüfe USE_ICON_FALSE
            if ($variable['VariableType'] == 0 && (isset($customPresentation['ICON_TRUE']) || isset($customPresentation['ICON_FALSE']))) {
                // USE_ICON_FALSE ist durch IPS_GetVariablePresentation bereits aufgelöst
                $useIconFalse = isset($customPresentation['USE_ICON_FALSE']) ? $customPresentation['USE_ICON_FALSE'] : true;

                // Icon basierend auf USE_ICON_FALSE wählen
                if ($useIconFalse) {
                    // Wertbasierte Icon-Auswahl
                    $currentValue = $this->CurrentValue($id);
                    $iconKey = $currentValue ? 'ICON_TRUE' : 'ICON_FALSE';
                } else {
                    // Immer ICON_TRUE
                    $iconKey = 'ICON_TRUE';
                }

                if (isset($customPresentation[$iconKey]) && $customPresentation[$iconKey] != "") {
                    $icon = $customPresentation[$iconKey];
                }
            } else {
                // Normale Icon-Feldsuche für Nicht-Boolean oder ohne ICON_TRUE/FALSE
                $iconFields = ['ICON', 'Icon', 'icon'];
                foreach ($iconFields as $field) {
                    if (isset($customPresentation[$field]) && $customPresentation[$field] != "") {
                        $icon = $customPresentation[$field];
                        break;
                    }
                }
            }
        }

        // Zusätzliche Unterstützung: Numerische Variablen (INTEGER/FLOAT) mit INTERVALS/OPTIONS
        if ($variable['VariableType'] == VARIABLETYPE_INTEGER || $variable['VariableType'] == VARIABLETYPE_FLOAT) {
            $options = null;
            $numericIconFound = false; // Wenn true, nicht mehr mit OPTIONS überschreiben

            // 1) INTERVALS direkt aus der CustomPresentation (JSON-String oder Array)
            $intervals = null;
            if (isset($customPresentation['INTERVALS'])) {
                $intervals = is_string($customPresentation['INTERVALS']) ? json_decode($customPresentation['INTERVALS'], true) : $customPresentation['INTERVALS'];
            }
            // Nur anwenden wenn aktiv oder Flag fehlt
            $intervalsActive = isset($customPresentation['INTERVALS_ACTIVE']) ? (bool)$customPresentation['INTERVALS_ACTIVE'] : true;
            if ($intervalsActive && is_array($intervals)) {
                $current = floatval($Value);
                foreach ($intervals as $interval) {
                    $iconActive = isset($interval['IconActive']) ? (bool)$interval['IconActive'] : false;
                    $iconValue = isset($interval['IconValue']) ? trim((string)$interval['IconValue']) : '';
                    if (!$iconActive || $iconValue === '') {
                        continue;
                    }
                    $min = array_key_exists('IntervalMinValue', $interval) ? floatval($interval['IntervalMinValue']) : -INF;
                    $max = array_key_exists('IntervalMaxValue', $interval) ? floatval($interval['IntervalMaxValue']) : INF;
                    if ($current >= $min && $current <= $max) {
                        $icon = $iconValue;
                        $numericIconFound = true;
                        break;
                    }
                }
            }
            // OPTIONS aus aufgelöster Präsentation (IPS_GetVariablePresentation hat Vorlagen/GUIDs bereits aufgelöst)
            if (isset($customPresentation['OPTIONS'])) {
                $options = is_string($customPresentation['OPTIONS']) ? json_decode($customPresentation['OPTIONS'], true) : $customPresentation['OPTIONS'];
            }
            // Auswertung der OPTIONS (unterstützt Value und Min/Max-Intervalle)
            if (!$numericIconFound && is_array($options)) {
                $current = floatval($Value);
                foreach ($options as $option) {
                    // Icon-Feld ermitteln (IconValue bevorzugt, sonst Icon)
                    $optIcon = null;
                    if (isset($option['IconValue']) && trim((string)$option['IconValue']) !== '') {
                        $optIcon = (string)$option['IconValue'];
                    } elseif (isset($option['Icon']) && trim((string)$option['Icon']) !== '') {
                        $optIcon = (string)$option['Icon'];
                    }
                    if ($optIcon === null) {
                        continue;
                    }

                    $hasRange = (isset($option['Min']) || isset($option['Max']) || isset($option['MinValue']) || isset($option['MaxValue']));
                    if ($hasRange) {
                        $min = isset($option['Min']) ? floatval($option['Min']) : (isset($option['MinValue']) ? floatval($option['MinValue']) : -INF);
                        $max = isset($option['Max']) ? floatval($option['Max']) : (isset($option['MaxValue']) ? floatval($option['MaxValue']) : INF);
                        if ($current >= $min && $current <= $max) {
                            $icon = $optIcon;
                            break;
                        }
                    } elseif (isset($option['Value'])) {
                        $optVal = $option['Value'];
                        if (is_numeric($optVal)) {
                            if (abs(floatval($optVal) - $current) < 1e-9) {
                                $icon = $optIcon;
                                break;
                            }
                        } else {
                            if ($optVal == $Value) {
                                $icon = $optIcon;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return $icon;
    }

    /**
     * Sucht ein Icon in der Darstellung/Visualisierung der Variable:
     * erst wertgenaue/bereichsbasierte ValueMappings, dann das Default-Icon der Darstellung.
     * Liefert '' wenn nichts gefunden oder IPS_GetVariableVisualization nicht verfügbar ist.
     */
    private function resolveIconFromVisualization(int $id, mixed $Value, string $debugContext): string
    {
        if (!function_exists('IPS_GetVariableVisualization')) {
            return '';
        }
        $icon = '';
        try {
            $visualization = IPS_GetVariableVisualization($id);
            if ($visualization && isset($visualization['ValueMappings'])) {
                foreach ($visualization['ValueMappings'] as $mapping) {
                    // Bereichsunterstützung: Min/Max Felder prüfen (verschiedene Schlüssel möglich)
                    if (isset($mapping['Icon']) && $mapping['Icon'] != "") {
                        $v = floatval($Value);
                        $hasRange = (isset($mapping['MinValue']) || isset($mapping['MaxValue']) || isset($mapping['Minimum']) || isset($mapping['Maximum']) || isset($mapping['Min']) || isset($mapping['Max']));
                        if ($hasRange) {
                            $min = isset($mapping['MinValue']) ? floatval($mapping['MinValue']) : (isset($mapping['Minimum']) ? floatval($mapping['Minimum']) : (isset($mapping['Min']) ? floatval($mapping['Min']) : -INF));
                            $max = isset($mapping['MaxValue']) ? floatval($mapping['MaxValue']) : (isset($mapping['Maximum']) ? floatval($mapping['Maximum']) : (isset($mapping['Max']) ? floatval($mapping['Max']) : INF));
                            if ($v >= $min && $v <= $max) {
                                $icon = $mapping['Icon'];
                                break;
                            }
                        }
                    }
                    // Exakter Value-Match als Fallback
                    if (isset($mapping['Value']) && isset($mapping['Icon']) && $mapping['Icon'] != "") {
                        if ($mapping['Value'] == $Value) {
                            $icon = $mapping['Icon'];
                            break;
                        }
                    }
                }

                // Falls kein spezifisches Icon gefunden, verwende Default-Icon der Darstellung
                if ($icon == "" && isset($visualization['Icon']) && $visualization['Icon'] != "") {
                    $icon = $visualization['Icon'];
                }
            }
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable($debugContext, $e);
        }
        return $icon;
    }

    /**
     * Sucht das Icon der zum aktuellen Wert passenden Boolean-Association.
     * Liefert '' wenn nichts gefunden.
     */
    private function resolveIconFromBooleanAssociations(int $id): string
    {
        $associations = $this->GetBooleanAssociations($id);
        if (is_array($associations) && count($associations) > 0) {
            $currentValue = $this->CurrentValue($id);
            foreach ($associations as $assoc) {
                if (isset($assoc['value']) && $assoc['value'] == $currentValue && isset($assoc['icon']) && !empty($assoc['icon'])) {
                    return $assoc['icon'];
                }
            }
        }
        return '';
    }

    /**
     * Sucht ein Icon in einem klassischen Variablenprofil:
     * erst die wertgenaue Association, dann das Profil-Standard-Icon.
     * Liefert '' wenn nichts gefunden oder das Profil nicht existiert.
     */
    private function resolveIconFromClassicProfile(string $profile, mixed $Value): string
    {
        if ($profile === '' || !IPS_VariableProfileExists($profile)) {
            return '';
        }
        $p = IPS_GetVariableProfile($profile);
        if (isset($p['Associations']) && is_array($p['Associations'])) {
            foreach ($p['Associations'] as $association) {
                if (isset($association['Value']) && isset($association['Icon']) && $association['Icon'] !== '' && $association['Value'] == $Value) {
                    return $association['Icon'];
                }
            }
        }
        if (isset($p['Icon']) && $p['Icon'] !== '') {
            return $p['Icon'];
        }
        return '';
    }

    /**
     * Ermittelt das Icon der aktuell aktiven Association für Bool/Integer/String Variablen.
     * Nutzt die bestehende Association-Auflösung (Profile/OPTIONS/TEMPLATE/PRESENTATION).
     */
    private function GetAssociationIconForCurrentValue(int $variableId, int $variableType, mixed $currentValue): string
    {
        if (!in_array($variableType, [VARIABLETYPE_BOOLEAN, VARIABLETYPE_INTEGER, VARIABLETYPE_STRING], true)) {
            return '';
        }

        $associations = $this->GetVariableAssociations($variableId, $variableType);
        if (!is_array($associations)) {
            return '';
        }

        foreach ($associations as $association) {
            if (!array_key_exists('value', $association)) {
                continue;
            }
            if ($association['value'] == $currentValue) {
                $icon = $association['icon'] ?? '';
                if (is_string($icon)) {
                    $icon = trim($icon);
                }
                if (!empty($icon)) {
                    return $icon;
                }
            }
        }

        return '';
    }

    /**
     * Lädt das Icon-Mapping aus der JSON-Datei
     */
    private function LoadIconMapping(): void {
        $mappingFile = __DIR__ . '/../assets/iconMapping.json';
        
        if (file_exists($mappingFile)) {
            $json = file_get_contents($mappingFile);
            
            if ($json !== false) {
                $this->iconMapping = json_decode($json, true);
                
                if ($this->iconMapping === null) {
                    $this->iconMapping = [];
                }
            }
        }       
    }

    /**
     * Wandelt ein IP-Symcon Icon-Name in den entsprechenden FontAwesome-Namen um
     * @param string $iconName Der Original-Icon-Name
     * @return string Der gemappte FontAwesome-Name oder der Original-Name falls kein Mapping gefunden
     */
    private function MapIconToFontAwesome(string $iconName): string {
        // Vorverarbeitung: Whitespace entfernen und Normalisieren
        // Entferne führende/trailing Whitespaces inkl. Unicode-Leerzeichen (NBSP, NNBSP, etc.)
        $iconName = preg_replace('/^[\p{Z}\s\x{00A0}]+|[\p{Z}\s\x{00A0}]+$/u', '', $iconName);
        // Manche Profile liefern bereits eine FontAwesome-Klasse wie "fa-bolt" – das belassen wir
        
        // Wenn kein Icon oder "Transparent", leeren String zurückgeben
        if (empty($iconName) || $iconName === 'Transparent') {
            return '';
        }
        
        
        // Direkte Mapping-Tabelle übersprungen (nicht definiert)
        
        // Entferne fa-Präfix falls vorhanden, um den Basis-Namen zu erhalten
        $baseName = $iconName;
        $hadFaPrefix = false;
        if (strpos($iconName, 'fa-') === 0) {
            $baseName = substr($iconName, 3);
            $hadFaPrefix = true;
        }
        
        // Stelle sicher, dass das Icon Mapping immer geladen ist
        if ($this->iconMapping === null || empty($this->iconMapping)) {
            $this->LoadIconMapping();
        }
        
        // Versuche den Basis-Namen in der JSON-Mapping-Tabelle zu finden
        if ($this->iconMapping !== null && is_array($this->iconMapping) && !empty($this->iconMapping)) {
            if (isset($this->iconMapping[$baseName])) {
                $mappedName = $this->iconMapping[$baseName];
                
                // Wenn ursprünglich ein fa-Präfix vorhanden war, füge es wieder hinzu
                if ($hadFaPrefix && strpos($mappedName, 'fa-') !== 0) {
                    $mappedName = 'fa-' . $mappedName;
                }
                
                return $mappedName;
            } else {
                // Case-insensitive Fallback: Vergleiche alle Keys in Kleinbuchstaben
                $lowerKey = strtolower($baseName);
                foreach ($this->iconMapping as $key => $value) {
                    if (strtolower($key) === $lowerKey) {
                        return $value;
                    }
                }
            }
        }
        
        // Fallback zurück zum Original
        return $iconName;
    }
}
