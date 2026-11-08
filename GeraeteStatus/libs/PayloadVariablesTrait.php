<?php

declare(strict_types=1);

namespace UDT;

/**
 * Aufbau des variables[]-Payloads aus der konfigurierten Variablenliste:
 * alle Darstellungsarten (text/progress/slider/button/image) inkl.
 * SecondVariable, variablenloser Bild-/Script-/OpenObject-Zeilen.
 */
trait PayloadVariablesTrait
{
    /**
     * Die konfigurierte Variablenliste als variables[] in das Payload schreiben.
     */
    private function appendVariablesPayload(array &$result): void
    {
        if (!is_array(json_decode($this->SettingString('VariablesList'), true))) {
            return;
        }
        $variablesList = $this->ReadVariablesList();
        $progressbarActive = $this->IsProgressbarActive();
        $variables = [];
        foreach ($variablesList as $index => $variable) {
            $row = $this->buildRow((int)$index, is_array($variable) ? $variable : [], $progressbarActive);
            if ($row !== null) {
                $variables[] = $row;
            }
        }
        $result['variables'] = $variables;
    }

    /**
     * Balkenzustand aus der Status-Zuordnung (ProgressbarActive der zum Statuswert passenden Zuordnung),
     * ohne Status oder Treffer aktiv.
     */
    private function IsProgressbarActive(): bool
    {
        $profilAssoziationen = json_decode($this->SettingString('ProfilAssoziazionen'), true);
        $statusId = $this->SettingInteger('Status');
        if (!is_array($profilAssoziationen) || $statusId <= 0 || !IPS_VariableExists($statusId)) {
            return true;
        }
        $matchedAssoz = $this->FindMatchingAssociation($profilAssoziationen, $this->CurrentValue($statusId));
        return $matchedAssoz === null ? true : (bool)($matchedAssoz['ProgressbarActive'] ?? true);
    }

    /**
     * Eine Zeile der Variablenliste als Payload-Eintrag, null wenn sie nicht darstellbar ist. $key ist
     * ihr Index in der Variablenliste und steht als Zeilen-Schlüssel vorn im Eintrag (nicht darstellbare
     * Zeilen verschieben die Schlüssel der übrigen nicht).
     */
    private function buildRow(int $key, array $variable, bool $progressbarActive): ?array
    {
        try {
            $displayType = $variable['DisplayType'] ?? 'text';
            $row = match ($this->RowKind($variable)) {
                'variable' => $this->buildVariableRow($variable, $progressbarActive),
                'image'    => $this->buildImageRow($key, $variable),
                'script'   => $this->buildScriptRow($variable),
                'object'   => $this->buildObjectRow($variable),
                default    => null,
            };
            $unset = $row === null || ($displayType === 'image' && intval($variable['ImageMedia'] ?? 0) <= 0);
            if ($unset && $this->IsPreview()) {
                $row = $this->buildPlaceholderRow($variable); // nur im Editor: Zeile ohne Ziel sichtbar machen
            }
            return $row === null ? null : ['key' => $key] + $row;
        } catch (\Throwable $e) {
            // Zeile auslassen statt die ganze Kachel abzubrechen
            $this->LogCaughtThrowable(__FUNCTION__ . ':' . $key, $e);
            return null;
        }
    }

    /**
     * Platzhalter für den Editor (nur Vorschau): eine Zeile ohne Variable, Bild oder Ziel erscheint als
     * Textzeile mit dem Icon ihres Anzeigetyps; editorPlaceholder sagt dem Editor, was zu wählen ist.
     */
    private function buildPlaceholderRow(array $variable): array
    {
        $type = (string)($variable['DisplayType'] ?? 'text');
        $captions = ['text' => 'Text', 'progress' => 'Progress Bar', 'slider' => 'Slider', 'button' => 'Button', 'image' => 'Image'];
        $icons = ['text' => 'font', 'progress' => 'bars-progress', 'slider' => 'sliders-simple', 'button' => 'hand-pointer', 'image' => 'image'];
        $label = trim((string)($variable['Label'] ?? ''));
        // Nur ein Fehler bekommt einen Hinweis (Variable gelöscht); „noch nichts gewählt“ zeigt der Knopf „Auswählen“
        $value = $type !== 'image' && intval($variable['Variable'] ?? 0) > 0 ? $this->Translate('The variable no longer exists.') : '';
        return [
            'id' => 'placeholder',
            'label' => $label !== '' ? $label : $this->Translate($captions[$type] ?? 'Text'),
            'displayType' => 'text',
            'variableType' => 3,
            'group' => $variable['Group'] ?? 'keine Gruppe',
            'showIcon' => true,
            'showLabel' => true,
            'showValue' => $value !== '',
            'fontSize' => $variable['FontSize'] ?? 12,
            'textColor' => '#000000',
            'isTextColorTransparent' => true,
            'alignment' => 'left',
            'formattedValue' => $value,
            'rawValue' => '',
            'icon' => $icons[$type] ?? 'font',
            'showBorderLine' => false,
            'progressbarActive' => true,
            'progressbarInactive' => false,
            'editorPlaceholder' => $type === 'image' ? 'image' : 'variable',
        ];
    }

    /** Zeile mit Variable: alle Darstellungsarten samt zweiter Variable und Ziel-Marker. */
    private function buildVariableRow(array $variable, bool $progressbarActive): array
    {
        // Verwende Variablennamen als Fallback wenn kein Label gesetzt ist
        $label = $variable['Label'] ?? '';
        if (empty($label)) {
            $variableObject = IPS_GetObject($variable['Variable']);
            $label = $variableObject['ObjectName'];
        }




        try {
            $icon = $this->GetIcon($variable['Variable']);
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__ . ':GetIcon', $e);
            $icon = '';
        }







        $variableInfo = IPS_GetVariable($variable['Variable']);




        // Extrahiere Variable-Associations für Button-Erstellung (Integer + String)
        $variableAssociations = null;



        if (($variable['DisplayType'] ?? 'text') === 'button') {
            if ($variableInfo['VariableType'] === VARIABLETYPE_INTEGER) {
                $variableAssociations = $this->GetIntegerAssociations($variable['Variable']);
            } elseif ($variableInfo['VariableType'] === VARIABLETYPE_STRING) {
                $variableAssociations = $this->GetStringAssociations($variable['Variable']);
            } elseif ($variableInfo['VariableType'] === VARIABLETYPE_BOOLEAN) {
                // Für Boolean: immer Associations aus Profil/Presentation ermitteln (Fallback intern geregelt)
                $variableAssociations = $this->GetBooleanAssociations($variable['Variable']);
            } else {
                $variableAssociations = null;
            }
        } else {
            $variableAssociations = null;
        }

        // Extrahiere Min/Max-Werte aus Variablenprofil für Progress-Balken
        $progressMinMax = $this->GetProgressMinMax($variable['Variable']);




        // SPECIAL: Für Boolean-Variablen mit PRESENTATION GUID, bei denen GetIcon leer ist
        // aber die Assoziationen Icons enthalten, verwende das Association-Icon als Haupt-Icon
        if (($icon === '' || $icon === 'Transparent') && $variableInfo['VariableType'] == VARIABLETYPE_BOOLEAN && !empty($variableAssociations)) {
            foreach ($variableAssociations as $assoc) {
                if (!empty($assoc['icon'])) {
                    $icon = $assoc['icon'];
                    break;
                }
            }
        }


        // Backend-basierte Progressbar-Deaktivierung: Überschreibe Werte wenn deaktiviert
        $finalFormattedValue = $this->CurrentValueFormatted($variable['Variable']);
        $finalRawValue = $this->CurrentValue($variable['Variable']);

        // Balken bei inaktivem Status: „-“ (dash, Vorgabe), aktueller Wert (value) oder Zeile ausblenden (hide)
        $isInactiveProgress = !$progressbarActive && (($variable['DisplayType'] ?? 'text') === 'progress');
        $inactiveDisplay = (string)($variable['InactiveDisplay'] ?? 'dash');
        $inactiveDash = $isInactiveProgress && $inactiveDisplay !== 'value';

        if ($inactiveDash) {
            // Progressbar deaktiviert: Zeige "-" für alle Werte und mache Text/Icon 50% transparent
            $finalRawValue = 0;
            $finalFormattedValue = '-';
        }

        $variableData = [
            'id' => $variable['Variable'],
            'label' => $label,
            'displayType' => $variable['DisplayType'] ?? 'text',
            'variableType' => $variableInfo['VariableType'], // Für Button-Validierung
            'group' => $variable['Group'] ?? 'keine Gruppe', // Group-Information für Frontend-Gruppierung
            'showIcon' => $variable['ShowIcon'] ?? true, // Vorgabe wie beim Anlegen im Formular
            'showLabel' => $variable['ShowLabel'] ?? true,
            'showValue' => $variable['ShowValue'] ?? true,
            'fontSize' => $variable['FontSize'] ?? 12,
            'textColor' => isset($variable['TextColor']) ? '#' . sprintf('%06X', $variable['TextColor']) : '#000000',
            'isTextColorTransparent' => isset($variable['TextColor']) && ($variable['TextColor'] == -1 || $variable['TextColor'] == 16777215),
            'progressColor1' => isset($variable['ProgressColor1']) ? '#' . sprintf('%06X', $variable['ProgressColor1']) : '#4CAF50',
            'progressColor2' => isset($variable['ProgressColor2']) ? '#' . sprintf('%06X', $variable['ProgressColor2']) : '#2196F3',
            // Slider-spezifische Farben (separat von Progress)
            'sliderColor1' => isset($variable['SliderColor1']) ? '#' . sprintf('%06X', $variable['SliderColor1']) : (isset($variable['ProgressColor1']) ? '#' . sprintf('%06X', $variable['ProgressColor1']) : '#4CAF50'),
            'sliderColor2' => isset($variable['SliderColor2']) ? '#' . sprintf('%06X', $variable['SliderColor2']) : (isset($variable['ProgressColor2']) ? '#' . sprintf('%06X', $variable['ProgressColor2']) : '#2196F3'),
            'boolButtonColor' => isset($variable['boolButtonColor']) ? '#' . sprintf('%06X', $variable['boolButtonColor']) : '#CCCCCC',
            'isBoolButtonColorTransparent' => isset($variable['boolButtonColor']) && ($variable['boolButtonColor'] == -1 || $variable['boolButtonColor'] == 16777215),
            'buttonWidth' => $variable['ButtonWidth'] ?? 120,
            'showBorderLine' => $variable['ShowBorderLine'] ?? false,
            'alignment' => $variable['VerticalAlignment'] ?? 'left',
            'progressMin' => $progressMinMax['min'],
            'progressMax' => $progressMinMax['max'],
            'formattedValue' => $finalFormattedValue, // Backend-überschriebener Wert
            'rawValue' => $finalRawValue, // Backend-überschriebener Wert
            'icon' => $icon,
            'progressbarActive' => $progressbarActive, // Progressbar Active Status
            'progressbarInactive' => $inactiveDash, // 50% Transparenz Flag nur für Progress
            'hidden' => $isInactiveProgress && $inactiveDisplay === 'hide',
            'useSecondVariableAsTarget' => (bool)($variable['UseSecondVariableAsTarget'] ?? false),
            'variableAssociations' => $variableAssociations, // Variable-Associations für Button-Erstellung (Integer + String)
            'scriptId' => intval($variable['ScriptID'] ?? 0),
            'openObjectId' => intval($variable['OpenObjectId'] ?? 0),
        ];

        // Bild (Symcon Medienobjekt) als eigene Darstellungsart
        if (($variable['DisplayType'] ?? 'text') === 'image') {
            $imageId = intval($variable['ImageMedia'] ?? 0);
            $variableData['imageMediaId'] = $imageId;
            $variableData['imageUrl'] = $this->BuildImageHookUrl($imageId);
            // Image width now in percent (1-100), default 40
            $variableData['imageWidth'] = max(1, min(100, intval($variable['ImageWidth'] ?? 40)));
            $variableData['imageBorderRadius'] = intval($variable['ImageBorderRadius'] ?? 6);
        }
        // Slider Zusatzdaten
        if (($variable['DisplayType'] ?? 'text') === 'slider') {
            $sd = $this->GetSliderStepAndDigits($variable['Variable']);
            $variableData['sliderStep'] = isset($sd['step']) ? $sd['step'] : null;
            $variableData['sliderDigits'] = isset($sd['digits']) ? $sd['digits'] : null;
        }

        // Vorbereitung für SecondVariable als Marker
        $useSecondAsTarget = !empty($variable['UseSecondVariableAsTarget']);
        $secondPresent = false; $secondId = 0; $secondLabel = ''; $secondFinalRawValue = 0; $secondFinalFormattedValue = '';

        // Zweite Variable für Progress-Bars hinzufügen
        if (isset($variable['SecondVariable']) && $variable['SecondVariable'] > 0 && IPS_VariableExists($variable['SecondVariable'])) {
            // Icon für zweite Variable ermitteln
            $secondIcon = $this->GetIcon($variable['SecondVariable']);

            // SPECIAL: Für Boolean-Variablen mit PRESENTATION GUID, bei denen GetIcon leer ist
            // aber die Assoziationen Icons enthalten, verwende das Association-Icon als Haupt-Icon
            if (($secondIcon === '' || $secondIcon === 'Transparent') && $variableInfo['VariableType'] == VARIABLETYPE_BOOLEAN && !empty($variableAssociations)) {
                foreach ($variableAssociations as $assoc) {
                    if (!empty($assoc['icon'])) {
                        $secondIcon = $assoc['icon'];
                        break;
                    }
                }
            }

            // Label für zweite Variable ermitteln
            $secondLabel = !empty($variable['SecondVariableLabel']) ? $variable['SecondVariableLabel'] : IPS_GetName($variable['SecondVariable']);

            // Backend-basierte Deaktivierung auch für zweite Variable
            $secondFinalFormattedValue = $this->CurrentValueFormatted($variable['SecondVariable']);
            $secondFinalRawValue = $this->CurrentValue($variable['SecondVariable']);

            if ($inactiveDash) {
                // Progressbar deaktiviert: Zeige "-" für zweite Variable und mache Text/Icon 50% transparent
                $secondFinalRawValue = 0;
                $secondFinalFormattedValue = '-';
            }

            $variableData['secondVariable'] = [
                'id' => $variable['SecondVariable'],
                'label' => $secondLabel,
                'formattedValue' => $secondFinalFormattedValue, // Backend-überschriebener Wert
                'rawValue' => $secondFinalRawValue, // Backend-überschriebener Wert
                'icon' => $secondIcon,
                'showIcon' => ($variable['SecondVariableShowIcon'] ?? true) && !empty($secondIcon) && $secondIcon !== 'Transparent',
                'showLabel' => $variable['SecondVariableShowLabel'] ?? true,
                'showValue' => $variable['SecondVariableShowValue'] ?? true
            ];

            // Für Marker-Nutzung merken
            $secondPresent = true;
            $secondId = (int)$variable['SecondVariable'];
            // Werte bereits in $secondFinal* enthalten
        }
        // Marker nur aus SecondVariable, wenn konfiguriert
        if (($variable['DisplayType'] ?? 'text') === 'progress') {
            if ($useSecondAsTarget && $secondPresent) {
                $variableData['progressTarget'] = [
                    'id' => $secondId,
                    'label' => $secondLabel,
                    'formattedValue' => $secondFinalFormattedValue,
                    'rawValue' => $secondFinalRawValue
                ];
            }
        }

        return $variableData;
    }

    /** Bildzeile ohne Variable (Symcon-Medienobjekt). */
    private function buildImageRow(int $key, array $variable): array
    {
        // SUPPORT IMAGE ROWS WITHOUT A VARIABLE ID
        $imageId = intval($variable['ImageMedia'] ?? 0);
        // Label-Fallback
        $label = $variable['Label'] ?? '';
        // Alignment/Textfarbe
        $textColor = isset($variable['TextColor']) ? '#' . sprintf('%06X', $variable['TextColor']) : '#000000';
        $isTextColorTransparent = isset($variable['TextColor']) && ($variable['TextColor'] == -1 || $variable['TextColor'] == 16777215);
        return [
            'id' => 'image_' . $key, // synthetische ID
            'label' => $label,
            'displayType' => 'image',
            'group' => $variable['Group'] ?? 'keine Gruppe',
            'showGroupName' => $variable['ShowGroupName'] ?? false,
            'showIcon' => false,
            'showLabel' => false,
            'showValue' => false,
            'fontSize' => $variable['FontSize'] ?? 12,
            'textColor' => $textColor,
            'isTextColorTransparent' => $isTextColorTransparent,
            'alignment' => $variable['VerticalAlignment'] ?? 'left',
            'imageMediaId' => $imageId,
            'imageUrl' => $this->BuildImageHookUrl($imageId),
            // Image width now in percent (1-100), default 40
            'imageWidth' => max(1, min(100, intval($variable['ImageWidth'] ?? 40))),
            'imageBorderRadius' => intval($variable['ImageBorderRadius'] ?? 6),
            'showBorderLine' => false,
            // folgende Felder für API-Konsistenz, ohne Relevanz
            'variableType' => 3,
            'progressbarActive' => true,
            'progressbarInactive' => false,
        ];
    }

    /** Script-Button ohne Variable (zustandslos). */
    private function buildScriptRow(array $variable): array
    {
        // SUPPORT BUTTON ROWS WITHOUT A VARIABLE ID: Script-Button (stateless)
        $scriptId = intval($variable['ScriptID']);
        // Label ermitteln
        $label = $variable['Label'] ?? '';
        // Wenn kein eigenes Label gesetzt ist, verwende den Skript-Namen
        if ($label === '' && IPS_ScriptExists($scriptId)) {
            $obj = IPS_GetObject($scriptId);
            if (isset($obj['ObjectName'])) {
                $label = $obj['ObjectName'];
            }
        }
        // Script-Objekt-Icon (falls gesetzt) mappen
        $scriptIcon = '';
        try {
            if (IPS_ScriptExists($scriptId)) {
                $obj = IPS_GetObject($scriptId);
                $objIcon = isset($obj['ObjectIcon']) ? trim($obj['ObjectIcon']) : '';
                if ($objIcon !== '') {
                    $scriptIcon = $this->MapIconToFontAwesome($objIcon);
                }
            }
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
        }
        // Farben/Styles wie bei anderen Buttons
        $textColor = isset($variable['TextColor']) ? '#' . sprintf('%06X', $variable['TextColor']) : '#000000';
        $isTextColorTransparent = isset($variable['TextColor']) && ($variable['TextColor'] == -1 || $variable['TextColor'] == 16777215);
        return [
            'id' => 'script_' . $scriptId,
            'label' => $label,
            'displayType' => 'button',
            'variableType' => 0, // Behandle als Bool-Button für Rendering
            'group' => $variable['Group'] ?? 'keine Gruppe',
            'showGroupName' => $variable['ShowGroupName'] ?? false,
            'showIcon' => $variable['ShowIcon'] ?? false,
            'showLabel' => $variable['ShowLabel'] ?? true,
            'showValue' => $variable['ShowValue'] ?? false,
            'fontSize' => $variable['FontSize'] ?? 12,
            'textColor' => $textColor,
            'isTextColorTransparent' => $isTextColorTransparent,
            'alignment' => $variable['VerticalAlignment'] ?? 'left',
            'formattedValue' => '',
            'rawValue' => 0,
            'icon' => $scriptIcon,
            'boolButtonColor' => isset($variable['boolButtonColor']) ? '#' . sprintf('%06X', $variable['boolButtonColor']) : '#CCCCCC',
            'isBoolButtonColorTransparent' => isset($variable['boolButtonColor']) && ($variable['boolButtonColor'] == -1 || $variable['boolButtonColor'] == 16777215),
            'buttonWidth' => $variable['ButtonWidth'] ?? 120,
            'progressbarActive' => true,
            'progressbarInactive' => false,
            'scriptId' => $scriptId,
            'openObjectId' => intval($variable['OpenObjectId'] ?? 0),
        ];
    }

    /** Button ohne Variable und Script: öffnet ein Objekt (zustandslos). */
    private function buildObjectRow(array $variable): array
    {
        // SUPPORT BUTTON ROWS WITHOUT VARIABLE OR SCRIPT: OpenObject-Button (stateless)
        $openObjectId = intval($variable['OpenObjectId']);
        $label = $variable['Label'] ?? '';
        $objectIcon = '';
        try {
            if (IPS_ObjectExists($openObjectId)) {
                $obj = IPS_GetObject($openObjectId);
                if ($label === '' && isset($obj['ObjectName'])) {
                    $label = $obj['ObjectName'];
                }
                $objIcon = isset($obj['ObjectIcon']) ? trim($obj['ObjectIcon']) : '';
                if ($objIcon !== '') {
                    $objectIcon = $this->MapIconToFontAwesome($objIcon);
                }
            }
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
        }
        $textColor = isset($variable['TextColor']) ? '#' . sprintf('%06X', $variable['TextColor']) : '#000000';
        $isTextColorTransparent = isset($variable['TextColor']) && ($variable['TextColor'] == -1 || $variable['TextColor'] == 16777215);
        return [
            'id' => 'object_' . $openObjectId,
            'label' => $label,
            'displayType' => 'button',
            'variableType' => 0, // wie Bool-Button rendern
            'group' => $variable['Group'] ?? 'keine Gruppe',
            'showGroupName' => $variable['ShowGroupName'] ?? false,
            'showIcon' => $variable['ShowIcon'] ?? false,
            'showLabel' => $variable['ShowLabel'] ?? true,
            'showValue' => $variable['ShowValue'] ?? false,
            'fontSize' => $variable['FontSize'] ?? 12,
            'textColor' => $textColor,
            'isTextColorTransparent' => $isTextColorTransparent,
            'alignment' => $variable['VerticalAlignment'] ?? 'left',
            'formattedValue' => '',
            'rawValue' => 1,
            'icon' => $objectIcon,
            'boolButtonColor' => isset($variable['boolButtonColor']) ? '#' . sprintf('%06X', $variable['boolButtonColor']) : '#CCCCCC',
            'isBoolButtonColorTransparent' => isset($variable['boolButtonColor']) && ($variable['boolButtonColor'] == -1 || $variable['boolButtonColor'] == 16777215),
            'buttonWidth' => $variable['ButtonWidth'] ?? 120,
            'progressbarActive' => true,
            'progressbarInactive' => false,
            'scriptId' => 0,
            'openObjectId' => $openObjectId,
        ];
    }
}
