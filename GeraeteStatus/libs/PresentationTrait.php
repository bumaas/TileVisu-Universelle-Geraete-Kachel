<?php

declare(strict_types=1);

namespace UDT;

/**
 * Auswertung von Variablen-Präsentationen und klassischen Profilen:
 * Associations (Bool/Integer/String), Button-Farben, Min/Max für
 * Fortschrittsbalken sowie Step/Digits für Schieberegler.
 */
trait PresentationTrait
{
    /**
     * Extrahiert Min/Max-Werte aus Variablen-Profil oder Darstellung für Progress-Balken
     * Verwendet die gleiche Presentation-Hierarchie wie Icons für konsistente Behandlung
     * @param int $variableId Die Variable-ID
     * @return array Array mit 'min' und 'max' Werten; 'isDefault' steht nur beim Standardbereich ohne eigene Angabe
     */
    private function GetProgressMinMax(int $variableId): array {
        $defaultMinMax = [
            'min' => 0,
            'max' => 100,
            'isDefault' => true
        ];
        $profileMinMax = null; // Profil-Werte nur als Fallback verwenden
        
        if (!IPS_VariableExists($variableId)) {
            return $defaultMinMax;
        }
        
        $variable = IPS_GetVariable($variableId);
        
        // Unterstütze INTEGER und FLOAT Variablen für Progress Bars
        if ($variable['VariableType'] !== VARIABLETYPE_INTEGER && $variable['VariableType'] !== VARIABLETYPE_FLOAT) {
            return $defaultMinMax;
        }
        
        // **PRESENTATION-HIERARCHIE wie bei Icons: Gleiche Taktik für konsistente Behandlung**

        // Hilfsfunktion: Min/Max rekursiv aus beliebigen Strukturen extrahieren
        $extractMinMax = function($arr) use (&$extractMinMax) {
            if (!is_array($arr)) return null;
            $minKeys = ['MinValue','MinimalerWert','Minimum','Min','minValue','min'];
            $maxKeys = ['MaxValue','MaximalerWert','Maximum','Max','maxValue','max'];
            $foundMin = null; $foundMax = null;
            foreach ($minKeys as $k) { if (isset($arr[$k]) && is_numeric($arr[$k])) { $foundMin = (float)$arr[$k]; break; } }
            foreach ($maxKeys as $k) { if (isset($arr[$k]) && is_numeric($arr[$k])) { $foundMax = (float)$arr[$k]; break; } }
            if ($foundMin !== null && $foundMax !== null) {
                return ['min' => $foundMin, 'max' => $foundMax];
            }
            // Rekursiv in Unterstrukturen suchen (einschließlich JSON-Strings)
            foreach ($arr as $v) {
                if (is_array($v)) {
                    $res = $extractMinMax($v);
                    if (is_array($res)) return $res;
                } elseif (is_string($v)) {
                    $decoded = json_decode($v, true);
                    if (is_array($decoded)) {
                        $res = $extractMinMax($decoded);
                        if (is_array($res)) return $res;
                    }
                }
            }
            return null;
        };
        
        // **FALL 1: Alte Variablenprofile (nun nur noch Fallback, Präsentationen haben Vorrang)**
        $profile = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
        if (!empty($profile) && IPS_VariableProfileExists($profile)) {
            $profileData = IPS_GetVariableProfile($profile);
            
            if (isset($profileData['MinValue']) && isset($profileData['MaxValue'])) {
                $profileMinMax = [
                    'min' => floatval($profileData['MinValue']),
                    'max' => floatval($profileData['MaxValue'])
                ];
            }
        }
        
        // **FALL 2: Präsentation über IPS_GetVariablePresentation laden (löst Vorlagen, GUIDs etc. automatisch auf)**
        $customPresentation = $this->resolvePresentationArray((int)$variableId, __FUNCTION__ . ':GetVariablePresentation');
        
        if (!empty($customPresentation)) {
            // Direkte MIN/MAX Parameter
            $directMinMax = null;
            if ((isset($customPresentation['MIN']) && isset($customPresentation['MAX'])) || (isset($customPresentation['Min']) && isset($customPresentation['Max']))) {
                $minVal = isset($customPresentation['MIN']) ? $customPresentation['MIN'] : $customPresentation['Min'];
                $maxVal = isset($customPresentation['MAX']) ? $customPresentation['MAX'] : $customPresentation['Max'];
                if (is_numeric($minVal) && is_numeric($maxVal)) {
                    $directMinMax = ['min' => (float)$minVal, 'max' => (float)$maxVal];
                }
            }
            if (!$directMinMax) {
                $directMinMax = $extractMinMax($customPresentation);
            }
            if (is_array($directMinMax)) return $directMinMax;
            
            // OPTIONS durchsuchen (bereits durch IPS_GetVariablePresentation aufgelöst)
            if (isset($customPresentation['OPTIONS']) && !empty($customPresentation['OPTIONS'])) {
                $opt = $customPresentation['OPTIONS'];
                if (is_string($opt)) {
                    $decoded = json_decode($opt, true);
                    if (is_array($decoded)) {
                        $mm = $extractMinMax($decoded);
                        if (is_array($mm)) return $mm;
                    }
                } elseif (is_array($opt)) {
                    $mm = $extractMinMax($opt);
                    if (is_array($mm)) return $mm;
                }
            }
        }
        
        // **FALL 6: Fallback zu ObjectVisualization (wie bisher)**
        if (IPS_ObjectExists($variableId)) {
            $object = IPS_GetObject($variableId);            
            
            if (isset($object['ObjectVisualization']) && !empty($object['ObjectVisualization'])) {
                $visualization = json_decode($object['ObjectVisualization'], true);
                
                if (is_array($visualization)) {
                    // Erweiterte Suche nach Min/Max in allen möglichen Feldern
                    $possibleMinFields = ['MinValue', 'MinimalerWert', 'Minimum', 'Min', 'minValue', 'min'];
                    $possibleMaxFields = ['MaxValue', 'MaximalerWert', 'Maximum', 'Max', 'maxValue', 'max'];
                    
                    $foundMin = null;
                    $foundMax = null;
                    
                    // Suche alle möglichen Min-Felder
                    foreach ($possibleMinFields as $field) {
                        if (isset($visualization[$field]) && is_numeric($visualization[$field])) {
                            $foundMin = floatval($visualization[$field]);
                            break;
                        }
                    }
                    
                    // Suche alle möglichen Max-Felder
                    foreach ($possibleMaxFields as $field) {
                        if (isset($visualization[$field]) && is_numeric($visualization[$field])) {
                            $foundMax = floatval($visualization[$field]);
                            break;
                        }
                    }
                    
                    // Verwende gefundene Min/Max-Werte
                    if ($foundMin !== null && $foundMax !== null) {
                        $minMax = [
                            'min' => $foundMin,
                            'max' => $foundMax
                        ];
                        
                        return $minMax;
                    }
                    
                    // Fallback: Extrahiere Min/Max aus ValueMappings
                    if (isset($visualization['ValueMappings']) && is_array($visualization['ValueMappings'])) {
                        $values = [];
                        foreach ($visualization['ValueMappings'] as $mapping) {
                            if (isset($mapping['Value']) && is_numeric($mapping['Value'])) {
                                $values[] = floatval($mapping['Value']);
                            }
                        }
                        
                        if (count($values) > 0) {
                            $minMax = [
                                'min' => min($values),
                                'max' => max($values)
                            ];
                            
                            return $minMax;
                        }
                    }
                }
            }
        }
        
        // **Falls noch nichts gefunden: Profil-Werte verwenden (Fallback)**
        if (is_array($profileMinMax)) {
            return $profileMinMax;
        }
        // **LETZTER FALLBACK: Standard Min/Max verwenden**
        return $defaultMinMax;
    }

    private function GetSliderStepAndDigits(int $variableId): array {
        $res = ['step' => null, 'digits' => 0];
        if (!IPS_VariableExists($variableId)) {
            return $res;
        }
        $variable = IPS_GetVariable($variableId);
        // 1) Profil-Werte (falls vorhanden)
        $profileName = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
        if (!empty($profileName) && IPS_VariableProfileExists($profileName)) {
            $profileData = IPS_GetVariableProfile($profileName);
            if (isset($profileData['Digits'])) {
                $res['digits'] = (int)$profileData['Digits'];
            }
            if (isset($profileData['StepSize'])) {
                $res['step'] = (float)$profileData['StepSize'];
            }
        }

        // Helper: extrahiere Step/Digits rekursiv aus beliebigen Präsentations-Strukturen
        $extractStepDigits = function ($arr) use (&$res, &$extractStepDigits) {
            if (!is_array($arr)) return;
            $keysStep = [
                'step','stepsize','STEP','Step','StepSize','STEP_SIZE','stepSize',
                'INCREMENT','Increment','increment','StepValue','STEPVALUE','step_value','StepWidth',
                // Häufige Varianten in Präsentationen
                'smallestStep','SmallestStep','SMALLESTSTEP','SMALLEST_STEP','smallStep','SmallStep','small_step'
            ];
            $keysDigits = ['digits','DIGITS','Digits'];
            foreach ($keysStep as $k) {
                if (isset($arr[$k]) && is_numeric($arr[$k])) { $res['step'] = (float)$arr[$k]; break; }
            }
            foreach ($keysDigits as $k) {
                if (isset($arr[$k]) && is_numeric($arr[$k])) { $res['digits'] = (int)$arr[$k]; break; }
            }
            // Rekursiv in alle Unterstrukturen (PARAMETERS, Values, OPTIONS, usw.)
            foreach ($arr as $k => $v) {
                if (is_array($v)) {
                    $extractStepDigits($v);
                } elseif (is_string($v)) {
                    $decoded = json_decode($v, true);
                    if (is_array($decoded)) $extractStepDigits($decoded);
                }
            }
        };

        // 2) Präsentation über IPS_GetVariablePresentation laden (löst Vorlagen, GUIDs etc. automatisch auf)
        $presentation = $this->resolvePresentationArray((int)$variableId, __FUNCTION__ . ':GetVariablePresentation');
        if (!empty($presentation)) {
            $extractStepDigits($presentation);
        }

        // 3) Fallbacks falls Step nicht gefunden
        if ($res['step'] === null || $res['step'] <= 0) {
            $digits = max(0, (int)$res['digits']);
            if ($variable['VariableType'] === VARIABLETYPE_INTEGER) {
                $res['step'] = 1;
            } else {
                $res['step'] = ($digits > 0) ? pow(10, -$digits) : 0.0;
            }
        }
        return $res;
    }

    /**
     * Extrahiert Associations einer Integer-Variable für Button-Erstellung
     * Unterstützt 4 Fälle: Alte Variablenprofile, CustomPresentation mit OPTIONS/TEMPLATE/PRESENTATION GUID
     */
    private function GetIntegerAssociations(int $variableId): ?array {
        return $this->GetVariableAssociations($variableId, VARIABLETYPE_INTEGER);
    }

    /**
     * Extrahiert Associations einer String-Variable für Button-Erstellung
     * Unterstützt 4 Fälle: Alte Variablenprofile, CustomPresentation mit OPTIONS/TEMPLATE/PRESENTATION GUID
     */
    private function GetStringAssociations(int $variableId): ?array {
        return $this->GetVariableAssociations($variableId, VARIABLETYPE_STRING);
    }

    /**
     * Extrahiert Associations einer Boolean-Variable für Button-Erstellung
     * Unterstützt 4 Fälle: Alte Variablenprofile, CustomPresentation mit OPTIONS/TEMPLATE/PRESENTATION GUID
     */
    private function GetBooleanAssociations(int $variableId): ?array {
        return $this->GetVariableAssociations($variableId, VARIABLETYPE_BOOLEAN);
    }

    /**
     * Generische Funktion zum Extrahieren von Associations für Boolean-, Integer- und String-Variablen.
     * Nutzt IPS_GetVariablePresentation für die vollständige Auflösung von Vorlagen und GUIDs.
     */
    private function GetVariableAssociations(int $variableId, int $expectedVariableType): ?array {
        if (!IPS_VariableExists($variableId)) {
            return null;
        }
        
        $variable = IPS_GetVariable($variableId);
        
        // Nur für den erwarteten Variablentyp
        if ($variable['VariableType'] !== $expectedVariableType) {
            return null;
        }
        
        // Präsentation über IPS_GetVariablePresentation laden (löst Vorlagen, GUIDs etc. automatisch auf)
        $presentation = $this->resolvePresentationArray((int)$variableId, __FUNCTION__ . ':GetVariablePresentation');
        
        // Sonderfall: VARIABLE_PRESENTATION_LEGACY -> Profil verwenden, Präsentation ignorieren
        $legacyGuid = self::LEGACY_PRESENTATION_GUID;
        $isLegacy = false;
        if (isset($presentation['PRESENTATION'])) {
            $presentGuidTrim = trim((string)$presentation['PRESENTATION'], '{} ');
            $isLegacy = (strcasecmp($presentGuidTrim, $legacyGuid) === 0);
        }
        
        // Bestimme den Gruppennamen basierend auf Variablentyp
        $groupName = ($expectedVariableType === VARIABLETYPE_INTEGER) ? 'Numeric' : 
                     (($expectedVariableType === VARIABLETYPE_BOOLEAN) ? 'Boolean' : 'String');
        
        // **Profil-Fallback** (wenn keine Präsentation oder Legacy)
        $profile = $variable['VariableCustomProfile'] ?: $variable['VariableProfile'];
        if (!empty($profile) && IPS_VariableProfileExists($profile) && ($isLegacy || empty($presentation))) {
            $profileData = IPS_GetVariableProfile($profile);
            
            if (isset($profileData['Associations']) && is_array($profileData['Associations'])) {
                $associations = [];
                foreach ($profileData['Associations'] as $association) {
                    if (isset($association['Value']) && isset($association['Name'])) {
                        $normalizedValue = $association['Value'];
                        if ($expectedVariableType === VARIABLETYPE_BOOLEAN) {
                            if ($association['Value'] === '' || $association['Value'] === 0 || $association['Value'] === false) {
                                $normalizedValue = false;
                            } elseif ($association['Value'] === 1 || $association['Value'] === true) {
                                $normalizedValue = true;
                            }
                        }
                        
                        $associations[] = [
                            'value' => $normalizedValue,
                            'name' => $association['Name'],
                            'color' => isset($association['Color']) && $association['Color'] !== -1 ? '#' . sprintf('%06X', $association['Color']) : null,
                            'icon' => (isset($association['Icon']) && $association['Icon'] !== '') ? $this->MapIconToFontAwesome($association['Icon']) : null
                        ];
                    }
                }
                return $associations;
            }
        }
        
        // **Boolean: Schalter-Darstellung (ICON_*, CAPTION_*, COLOR_*) aus aufgelöster Präsentation**
        if ($expectedVariableType === VARIABLETYPE_BOOLEAN) {
            $has = static fn(string $key): bool => isset($presentation[$key]) && trim((string)$presentation[$key]) !== '';
            if ($has('ICON_TRUE') || $has('ICON_FALSE') || $has('CAPTION_TRUE') || $has('CAPTION_FALSE')) {
                $color = static fn($value): ?string => (is_numeric($value) && (int)$value >= 0) ? '#' . sprintf('%06X', (int)$value) : null;
                $icon = fn(string $key): ?string => $has($key) ? $this->MapIconToFontAwesome(trim((string)$presentation[$key])) : null;
                // USE_ICON_FALSE: eigenes Icon für „aus“, sonst gilt ICON_TRUE für beide Zustände
                $useIconFalse = (bool)($presentation['USE_ICON_FALSE'] ?? true);
                return [
                    [
                        'value' => false,
                        'name' => $has('CAPTION_FALSE') ? (string)$presentation['CAPTION_FALSE'] : $this->Translate('Off'),
                        'color' => $color($presentation['COLOR_FALSE'] ?? -1),
                        'icon' => ($useIconFalse && $has('ICON_FALSE')) ? $icon('ICON_FALSE') : $icon('ICON_TRUE')
                    ],
                    [
                        'value' => true,
                        'name' => $has('CAPTION_TRUE') ? (string)$presentation['CAPTION_TRUE'] : $this->Translate('On'),
                        'color' => $color($presentation['COLOR_TRUE'] ?? -1),
                        'icon' => $icon('ICON_TRUE')
                    ]
                ];
            }
        }
        
        // **Associations direkt aus aufgelöster Präsentation**
        if (isset($presentation['Associations']) && is_array($presentation['Associations'])) {
            return $presentation['Associations'];
        }
        
        // **OPTIONS aus aufgelöster Präsentation extrahieren**
        // Helper: OPTIONS-Array in unser Association-Format konvertieren
        $mapOptions = function($options) {
            if (!is_array($options)) return null;
            $associations = [];
            foreach ($options as $option) {
                // Diskrete OPTIONS: Value + Caption
                // Intervall-OPTIONS: Min + Max + Caption (Min als Startwert = Value-Äquivalent)
                $value = $option['Value'] ?? $option['Min'] ?? null;
                if ($value !== null && isset($option['Caption'])) {
                    $associations[] = [
                        'value' => $value,
                        'name' => $option['Caption'],
                        'color' => isset($option['Color']) && $option['Color'] !== -1 ? '#' . sprintf('%06X', $option['Color']) : null,
                        'icon' => (isset($option['IconValue']) && !empty($option['IconValue'])) ? $this->MapIconToFontAwesome($option['IconValue']) : null
                    ];
                }
            }
            return !empty($associations) ? $associations : null;
        };
        
        // Direkte OPTIONS
        if (isset($presentation['OPTIONS'])) {
            $options = is_string($presentation['OPTIONS']) ? json_decode($presentation['OPTIONS'], true) : $presentation['OPTIONS'];
            $result = $mapOptions($options);
            if ($result !== null) return $result;
        }
        
        // **INTERVALS aus aufgelöster Präsentation extrahieren**
        if (!empty($presentation['INTERVALS_ACTIVE']) && isset($presentation['INTERVALS'])) {
            $intervals = is_string($presentation['INTERVALS']) ? json_decode($presentation['INTERVALS'], true) : $presentation['INTERVALS'];
            if (is_array($intervals)) {
                $associations = [];
                foreach ($intervals as $interval) {
                    if (isset($interval['IntervalMinValue']) && !empty($interval['ConstantActive'])) {
                        $color = null;
                        if (!empty($interval['ColorActive']) && isset($interval['ColorValue']) && $interval['ColorValue'] !== -1) {
                            $color = '#' . sprintf('%06X', $interval['ColorValue']);
                        }
                        $icon = null;
                        if (!empty($interval['IconActive']) && isset($interval['IconValue']) && !empty($interval['IconValue'])) {
                            $icon = $this->MapIconToFontAwesome($interval['IconValue']);
                        }
                        $associations[] = [
                            'value' => $interval['IntervalMinValue'],
                            'name' => $interval['ConstantValue'] ?? '',
                            'color' => $color,
                            'icon' => $icon
                        ];
                    }
                }
                if (!empty($associations)) return $associations;
            }
        }
        
        // Fallback: groups → presentationParameters → OPTIONS (z. B. bei Numeric/String/Boolean-Gruppen)
        if (isset($presentation['groups']) && is_array($presentation['groups'])) {
            foreach ($presentation['groups'] as $group) {
                if (isset($group['name']) && $group['name'] === $groupName) {
                    if (isset($group['presentationParameters']['OPTIONS'])) {
                        $optData = $group['presentationParameters']['OPTIONS'];
                        $options = is_string($optData) ? json_decode($optData, true) : $optData;
                        
                        // Prüfe auf deutsche Übersetzungen in locale.de
                        if (is_array($options) && isset($presentation['locale']['de'])) {
                            $originalOptionsString = $group['presentationParameters']['OPTIONS'];
                            if (is_string($originalOptionsString) && isset($presentation['locale']['de'][$originalOptionsString])) {
                                $germanOptions = json_decode($presentation['locale']['de'][$originalOptionsString], true);
                                if (is_array($germanOptions)) {
                                    $options = $germanOptions;
                                }
                            }
                        }
                        
                        $result = $mapOptions($options);
                        if ($result !== null) return $result;
                    }
                    break;
                }
            }
        }
        
        return null;
    }

    /**
     * Findet die passende Assoziation für einen Wert (Intervall-Logik wie Symcon-Profile).
     * Gibt die Assoziation mit dem höchsten AssoziationValue <= $currentValue zurück.
     * @param array $associations Array von Assoziationen mit 'AssoziationValue'
     * @param mixed $currentValue Aktueller Variablenwert
     * @return array|null Passende Assoziation oder null
     */
    private function FindMatchingAssociation(array $associations, mixed $currentValue): ?array {
        $match = null;
        // Zahlen: exakter Treffer, sonst die größte Zuordnung darunter (Intervall); Texte und Bool nur exakt
        $numeric = is_int($currentValue) || is_float($currentValue);
        foreach ($associations as $assoziation) {
            if (!isset($assoziation['AssoziationValue'])) continue;
            $av = $assoziation['AssoziationValue'];
            if ($av == $currentValue) return $assoziation;
            if ($numeric && is_numeric($av) && $av <= $currentValue && ($match === null || $av > $match['AssoziationValue'])) {
                $match = $assoziation;
            }
        }
        return $match;
    }

    /**
     * Lädt die aufgelöste Präsentation einer Variable (Vorlagen/GUIDs bereits aufgelöst).
     * Liefert [] wenn keine Präsentation vorhanden oder IPS_GetVariablePresentation
     * nicht verfügbar ist.
     */
    private function resolvePresentationArray(int $variableId, string $debugContext): array
    {
        if (!function_exists('IPS_GetVariablePresentation')) {
            return [];
        }
        try {
            $resolved = IPS_GetVariablePresentation($variableId);
            if (is_array($resolved) && !empty($resolved)) {
                return $resolved;
            }
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable($debugContext, $e);
        }
        return [];
    }
}
