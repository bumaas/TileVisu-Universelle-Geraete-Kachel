<?php

declare(strict_types=1);

namespace UDT;

/**
 * Selbsttest für Skripte und KI-Assistenten: prüft alle Zeilen, ändert nichts und antwortet als kurzer Text.
 * Probleme stehen vorn, danach die bedienbaren Zeilen mit ihrem Schlüssel.
 */
trait SelfTestTrait
{
    /** Prüft die Konfiguration der Kachel ohne Wirkung. */
    public function RunSelfTest(): string
    {
        $rows = $this->ReadVariablesList();
        $problems = [];
        $notes = [];
        $operable = [];

        $statusId = $this->ReadPropertyInteger('Status');
        if ($statusId > 0 && !IPS_VariableExists($statusId)) {
            $problems[] = sprintf($this->Translate('Status: variable %d does not exist. Select another status variable.'), $statusId);
        }

        $problems = array_merge($problems, $this->SelfTestImages());

        foreach ($rows as $key => $row) {
            $name = 'row_' . $key;
            $problems = array_merge($problems, $this->SelfTestRow($name, $row));
            $notes = array_merge($notes, $this->SelfTestRowNotes($name, $row));
            $target = $this->RowActionTarget($row);
            if ($target !== null && $this->SelfTestTypeMismatch($name, $row) === null && ($target[0] === 'script' ? IPS_ScriptExists($target[1]) : HasAction($target[1]))) {
                $operable[] = sprintf(
                    $target[0] === 'script' ? $this->Translate('%s (%s): script %d "%s"') : $this->Translate('%s (%s): variable %d "%s"'),
                    $name,
                    $target[2],
                    $target[1],
                    mb_substr(IPS_GetName($target[1]), 0, 40)
                );
            }
        }

        $lines = [sprintf($this->Translate('Tile %d, rows %d, problems %d, notes %d.'), $this->InstanceID, count($rows), count($problems), count($notes))];
        if ($problems !== []) {
            $lines[] = $this->Translate('Problems:');
            foreach ($problems as $problem) {
                $lines[] = '- ' . $problem;
            }
        }
        if ($notes !== []) {
            $lines[] = $this->Translate('Notes:');
            foreach ($notes as $note) {
                $lines[] = '- ' . $note;
            }
        }
        if ($operable !== []) {
            $lines[] = $this->Translate('Operable rows (an action or script exists, its effect is not checked; keys change when rows are added, removed or moved; to switch a device use its source variable):');
            foreach ($operable as $entry) {
                $lines[] = '- ' . $entry;
            }
        }
        return implode("\n", $lines);
    }

    /** Die unsichtbaren Hinweise des Formulars als Text: Das ganze Formular sprengt die Antwortgrenze eines Assistenten. */
    public function GetConfigurationHelp(): string
    {
        $form = Helpers::decodeJsonArray((string)file_get_contents(__DIR__ . '/../form.json'), __FUNCTION__);
        $notes = [];
        foreach (is_array($form) ? ($form['elements'] ?? []) : [] as $element) {
            if (($element['type'] ?? '') === 'Label' && ($element['visible'] ?? true) === false) {
                $notes[] = $this->Translate((string)($element['caption'] ?? ''));
            }
        }
        return implode("\n\n", $notes);
    }

    /** Probleme bei Standardbild, Hintergrundbild und den Bildern der Status-Zuordnungen. */
    private function SelfTestImages(): array
    {
        $problems = [];
        foreach (['DefaultImage' => 'Default Image', 'bgImage' => 'Background image'] as $property => $caption) {
            $mediaId = $this->ReadPropertyInteger($property);
            if ($mediaId >= EditorSchema::MIN_OBJECT_ID) {
                $problems = array_merge($problems, $this->SelfTestImageProblem($this->Translate($caption), $mediaId));
            }
        }
        $associations = Helpers::decodeJsonArray($this->ReadPropertyString('ProfilAssoziazionen'), __FUNCTION__);
        foreach (is_array($associations) ? $associations : [] as $association) {
            if (!is_array($association)) {
                continue;
            }
            $name = mb_substr((string)($association['AssoziationName'] ?? ''), 0, 40);
            $choice = (string)($association['Bildauswahl'] ?? 'none');
            $mediaId = (int)($association['EigenesBild'] ?? 0);
            if (!in_array($choice, EditorSchema::IMAGE_CHOICES, true)) {
                $problems[] = sprintf($this->Translate('Status value "%s": unknown image choice "%s". Allowed are: %s.'), $name, mb_substr($choice, 0, 40), implode(', ', EditorSchema::IMAGE_CHOICES));
            } elseif ($choice === 'custom') {
                $problems = array_merge($problems, $this->SelfTestImageProblem(sprintf($this->Translate('Status value "%s"'), $name), $mediaId));
            }
        }
        return $problems;
    }

    /** Problem eines gewählten Bildes: Die Kachel zeigt nur vorhandene Medien vom Typ Bild. */
    private function SelfTestImageProblem(string $owner, int $mediaId): array
    {
        if (!IPS_MediaExists($mediaId)) {
            return [sprintf($this->Translate('%s: image %d does not exist. Select another image.'), $owner, $mediaId)];
        }
        if (IPS_GetMedia($mediaId)['MediaType'] !== MEDIATYPE_IMAGE) {
            return [sprintf($this->Translate('%s: media object %d is not an image. Select an image.'), $owner, $mediaId)];
        }
        return [];
    }

    /** Probleme einer Zeile als Texte mit nächstem Schritt. */
    private function SelfTestRow(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)($row['Variable'] ?? 0);
        $scriptId = (int)($row['ScriptID'] ?? 0);
        $openId = (int)($row['OpenObjectId'] ?? 0);
        $mediaId = (int)($row['ImageMedia'] ?? 0);
        $secondId = (int)($row['SecondVariable'] ?? 0);
        $problems = [];

        if (!EditorSchema::RowFieldValid('DisplayType', $displayType)) {
            return [sprintf($this->Translate('%s: unknown display type "%s". Allowed are: %s.'), $name, mb_substr($displayType, 0, 40), implode(', ', EditorSchema::DISPLAY_TYPES))];
        }
        $group = (string)($row['Group'] ?? '');
        if ($group !== '' && !EditorSchema::RowFieldValid('Group', $group)) {
            $problems[] = sprintf($this->Translate('%s: unknown group "%s". Allowed are keine Gruppe and Gruppe 1 to Gruppe 10.'), $name, mb_substr($group, 0, 40));
        }

        if ($displayType === 'progress' && $secondId > 0 && !IPS_VariableExists($secondId)) {
            $problems[] = sprintf($this->Translate('%s: second variable %d does not exist. Select another one or remove it.'), $name, $secondId);
        }

        if ($displayType === 'image') {
            if ($mediaId < EditorSchema::MIN_OBJECT_ID) {
                $problems[] = sprintf($this->Translate('%s: no image selected. Select an image for this row.'), $name);
            } else {
                $problems = array_merge($problems, $this->SelfTestImageProblem($name, $mediaId));
            }
            return $problems;
        }

        $kind = $this->RowKind($row);
        $opensObject = $this->RowClickOpensObject($row);
        if ($opensObject && !IPS_ObjectExists($openId)) {
            $problems[] = sprintf($this->Translate('%s: object %d to open does not exist. Select another object for this row.'), $name, $openId);
        }
        if ($kind === 'script' && !IPS_ScriptExists($scriptId)) {
            $problems[] = sprintf($this->Translate('%s: script %d does not exist. Select another script for this row.'), $name, $scriptId);
        }
        $mismatch = $this->SelfTestTypeMismatch($name, $row);
        if ($mismatch !== null) {
            $problems[] = $mismatch;
            return $problems;
        }
        if ($kind === 'variable' && !$opensObject && ($displayType === 'button' || $displayType === 'slider') && !HasAction($variableId)) {
            $problems[] = sprintf($this->Translate('%s: variable %d has no action, the row cannot switch. Give the variable an action or show it as text.'), $name, $variableId);
        }
        if ($kind === 'none') {
            if ($variableId > 0) {
                $problems[] = sprintf($this->Translate('%s: variable %d does not exist. Select another variable for this row.'), $name, $variableId);
            } elseif ($displayType === 'button') {
                $problems[] = sprintf($this->Translate('%s: the button has no target. Select a variable, a script or an object to open.'), $name);
            } else {
                $problems[] = sprintf($this->Translate('%s: no variable selected. Select a variable for this row.'), $name);
            }
        }
        return $problems;
    }

    /** Problem, wenn die Variable nicht zur Darstellungsart passt: Balken und Regler rechnen mit Zahlen, ein Float-Button wird nur als Text gezeigt. */
    private function SelfTestTypeMismatch(string $name, array $row): ?string
    {
        if ($this->RowKind($row) !== 'variable') {
            return null;
        }
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)$row['Variable'];
        $type = IPS_GetVariable($variableId)['VariableType'];
        if (($displayType === 'slider' || $displayType === 'progress') && $type !== VARIABLETYPE_INTEGER && $type !== VARIABLETYPE_FLOAT) {
            return sprintf($this->Translate('%s: variable %d holds no number, this row type cannot show or set it. Select another variable or show it as text.'), $name, $variableId);
        }
        if ($displayType === 'button' && $type === VARIABLETYPE_FLOAT) {
            return sprintf($this->Translate('%s: variable %d is a float, a button cannot switch it. Show it as a slider or as text.'), $name, $variableId);
        }
        return null;
    }

    /** Hinweise einer Zeile: nichts ist kaputt, die Kachel weicht aber auf einen Standard aus. */
    private function SelfTestRowNotes(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)($row['Variable'] ?? 0);
        if ($variableId > 0 && in_array($this->RowKind($row), ['script', 'object'], true)) {
            return [sprintf($this->Translate('%s: variable %d does not exist, the row uses its script or object to open instead. Remove the variable or select another one.'), $name, $variableId)];
        }
        if (($displayType !== 'slider' && $displayType !== 'progress') || $variableId <= 0 || !IPS_VariableExists($variableId)) {
            return [];
        }
        if ($this->SelfTestTypeMismatch($name, $row) !== null) {
            return [];
        }
        $bounds = $this->GetProgressMinMax($variableId);
        if (empty($bounds['isDefault']) && (float)($bounds['max'] ?? 100) > (float)($bounds['min'] ?? 0)) {
            return [];
        }
        return [sprintf($this->Translate('%s: variable %d has no range of its own, the tile uses 0 to 100. If that does not fit, set minimum and maximum in its presentation.'), $name, $variableId)];
    }
}
