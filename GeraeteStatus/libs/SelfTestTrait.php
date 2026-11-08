<?php

declare(strict_types=1);

namespace UDT;

/**
 * Selbsttest für Skripte und KI-Assistenten: prüft alle Zeilen, ändert nichts und antwortet als kurzer Text.
 * Probleme stehen vorn, danach die bedienbaren Zeilen mit ihrem Schlüssel.
 */
trait SelfTestTrait
{
    /** Läuft gerade der Bericht für Anwender? Dort entfallen die Nummern vorhandener Objekte. */
    private bool $selfTestForUser = false;

    /** Text eines Befunds zu einem vorhandenen Objekt: Im Anwenderbericht entfällt dessen Nummer, die Zeile nennt es schon. */
    private function KnownObjectText(string $text): string
    {
        $translated = $this->Translate($text);
        return $this->selfTestForUser ? str_replace(' %d', '', $translated) : $translated;
    }

    /** Prüft die Konfiguration der Kachel ohne Wirkung und liefert die Befunde. */
    private function SelfTestFindings(): array
    {
        $rows = $this->ReadVariablesList();
        $problems = [];
        $notes = [];
        $operable = [];

        $problems = array_merge($this->SelfTestStatusVariable(), $this->SelfTestImages());

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

        return ['rows' => $rows, 'problems' => $problems, 'notes' => $notes, 'operable' => $operable];
    }

    /** Die Befunde für Skripte und KI-Assistenten, mit Zeilenschlüsseln und Objektnummern. */
    public function RunSelfTest(): string
    {
        ['rows' => $rows, 'problems' => $problems, 'notes' => $notes, 'operable' => $operable] = $this->SelfTestFindings();

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

    /** Dieselben Befunde für Anwender: Der Knopf im Formular zeigt sie, die Zeile steht mit Position und Name da. */
    public function GetSelfTestReport(): string
    {
        $this->selfTestForUser = true;
        ['rows' => $rows, 'problems' => $problems, 'notes' => $notes] = $this->SelfTestFindings();
        $this->selfTestForUser = false;

        $count = count($problems);
        if ($count === 0) {
            $head = $this->Translate('No problems found.');
        } elseif ($count === 1) {
            $head = $this->Translate('One problem found.');
        } else {
            $head = sprintf($this->Translate('%d problems found.'), $count);
        }

        $sections = [$head];
        foreach ([[$problems, 'Problem:', 'Problems:'], [$notes, 'Note:', 'Notes:']] as [$texts, $one, $many]) {
            if ($texts === []) {
                continue;
            }
            $lines = array_map(fn (string $text): string => $this->SelfTestReportLine($text, $rows), $texts);
            $sections[] = $this->Translate(count($texts) === 1 ? $one : $many) . "\n" . implode("\n", $lines);
        }
        return implode("\n\n", $sections);
    }

    /** Macht einen Befund lesbar: statt des Zeilenschlüssels Position und Name. */
    private function SelfTestReportLine(string $text, array $rows): string
    {
        return (string)preg_replace_callback('/^row_(\d+):/', fn (array $m): string => $this->SelfTestRowTitle((int)$m[1], (array)($rows[(int)$m[1]] ?? [])) . ':', $text);
    }

    /** Zeile, wie der Anwender sie im Formular findet: Position in der Liste, Beschriftung oder Variablenname. */
    private function SelfTestRowTitle(int $key, array $row): string
    {
        $name = trim((string)($row['Label'] ?? ''));
        $variableId = (int)($row['Variable'] ?? 0);
        if ($name === '' && $variableId > 0 && IPS_VariableExists($variableId)) {
            $name = IPS_GetName($variableId);
        }
        return $name === '' ? sprintf($this->Translate('Row %d'), $key + 1) : sprintf($this->Translate('Row %d "%s"'), $key + 1, self::ShortText($name));
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

    /** Setzt den Instanzstatus: Fehler, solange ein verknüpftes Objekt fehlt oder unbrauchbar ist, sonst aktiv. Symcon setzt ihn nicht von selbst zurück. */
    private function UpdateLinkStatus(): void
    {
        $this->SetStatus($this->HasBrokenLinks() ? IS_EBASE + 1 : IS_ACTIVE);
    }

    /** Fehlt ein verknüpftes Objekt oder ist es unbrauchbar? Dieselben Prüfungen wie im Selbsttest, ohne Zeilen, die nur noch nicht fertig eingerichtet sind. */
    private function HasBrokenLinks(): bool
    {
        if ($this->SelfTestStatusVariable() !== [] || $this->SelfTestImages() !== []) {
            return true;
        }
        foreach ($this->ReadVariablesList() as $key => $row) {
            if ($this->RowBrokenLinks('row_' . $key, $row) !== []) {
                return true;
            }
        }
        return false;
    }

    /** Vorhandene Skripte und Klickziele der Button-Zeilen. */
    private function ButtonTargets(array $rows): array
    {
        $targets = ['scripts' => [], 'objects' => []];
        foreach ($rows as $row) {
            if (($row['DisplayType'] ?? 'text') !== 'button') {
                continue;
            }
            $scriptId = (int)($row['ScriptID'] ?? 0);
            if ($scriptId > 0 && IPS_ScriptExists($scriptId)) {
                $targets['scripts'][] = $scriptId;
            }
            $openId = (int)($row['OpenObjectId'] ?? 0);
            if ($openId > 0 && IPS_ObjectExists($openId)) {
                $targets['objects'][] = $openId;
            }
        }
        return $targets;
    }

    /** Problem bei der Statusvariable. */
    private function SelfTestStatusVariable(): array
    {
        $statusId = EditorSchema::ObjectRef($this->ReadPropertyInteger('Status'));
        if ($statusId > 0 && !IPS_VariableExists($statusId)) {
            return [sprintf($this->Translate('Status: variable %d does not exist. Select another status variable.'), $statusId)];
        }
        return [];
    }

    /** Probleme bei Standardbild, Hintergrundbild und den Bildern der Status-Zuordnungen. */
    private function SelfTestImages(): array
    {
        $problems = [];
        foreach (['DefaultImage' => 'Default Image', 'bgImage' => 'Background image'] as $property => $caption) {
            $mediaId = EditorSchema::ObjectRef($this->ReadPropertyInteger($property));
            if ($mediaId > 0) {
                $problems = array_merge($problems, $this->SelfTestImageProblem($this->Translate($caption), $mediaId));
            }
        }
        $associations = Helpers::decodeJsonArray($this->ReadPropertyString('ProfilAssoziazionen'), __FUNCTION__);
        foreach (is_array($associations) ? $associations : [] as $association) {
            if (!is_array($association)) {
                continue;
            }
            $name = self::ShortText((string)($association['AssoziationName'] ?? ''));
            $choice = (string)($association['Bildauswahl'] ?? 'none');
            $mediaId = EditorSchema::ObjectRef($association['EigenesBild'] ?? 0);
            if (!in_array($choice, EditorSchema::IMAGE_CHOICES, true)) {
                $problems[] = sprintf($this->Translate('Status value "%s": unknown image choice "%s". Allowed are: %s.'), $name, self::ShortText($choice), implode(', ', EditorSchema::IMAGE_CHOICES));
            } elseif ($choice === 'custom' && $mediaId > 0) {
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
        $media = IPS_GetMedia($mediaId);
        if ($media['MediaType'] !== MEDIATYPE_IMAGE) {
            return [sprintf($this->KnownObjectText('%s: media object %d is not an image. Select an image.'), $owner, $mediaId)];
        }
        if (!$media['MediaIsAvailable']) {
            return [sprintf($this->KnownObjectText('%s: the file of image %d is not available. Assign the file again or select another image.'), $owner, $mediaId)];
        }
        return [];
    }

    /** Verknüpfte Objekte einer Zeile, die fehlen oder unbrauchbar sind: Sie setzen auch den Instanzstatus. */
    private function RowBrokenLinks(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        if (!EditorSchema::RowFieldValid('DisplayType', $displayType)) {
            return [];
        }
        $problems = [];
        $secondId = (int)($row['SecondVariable'] ?? 0);
        if ($displayType === 'progress' && $secondId > 0 && !IPS_VariableExists($secondId)) {
            $problems[] = sprintf($this->Translate('%s: second variable %d does not exist. Select another one or remove it.'), $name, $secondId);
        }
        if ($displayType === 'image') {
            $mediaId = EditorSchema::ObjectRef($row['ImageMedia'] ?? 0);
            return $mediaId === 0 ? $problems : array_merge($problems, $this->SelfTestImageProblem($name, $mediaId));
        }
        $openId = (int)($row['OpenObjectId'] ?? 0);
        $opensObject = $this->RowClickOpensObject($row);
        if ($opensObject && !IPS_ObjectExists($openId)) {
            $problems[] = sprintf($this->Translate('%s: object %d to open does not exist. Select another object for this row.'), $name, $openId);
        }
        $kind = $this->RowKind($row);
        $scriptId = (int)($row['ScriptID'] ?? 0);
        // Öffnet der Klick ein Objekt, erreicht er das Skript nie
        if ($kind === 'script' && !$opensObject && !IPS_ScriptExists($scriptId)) {
            $problems[] = sprintf($this->Translate('%s: script %d does not exist. Select another script for this row.'), $name, $scriptId);
        } elseif ($kind === 'script' && !$opensObject && IPS_GetScript($scriptId)['ScriptIsBroken']) {
            $problems[] = sprintf($this->KnownObjectText('%s: script %d failed on its last run. Fix it and run it again.'), $name, $scriptId);
        }
        $variableId = (int)($row['Variable'] ?? 0);
        if ($kind === 'none' && $variableId > 0) {
            $problems[] = sprintf($this->Translate('%s: variable %d does not exist. Select another variable for this row.'), $name, $variableId);
        } elseif (($kind === 'script' || $kind === 'object') && $variableId > 0) {
            $problems[] = sprintf($this->Translate('%s: variable %d does not exist, the row uses its script or object to open instead. Remove the variable or select another one.'), $name, $variableId);
        }
        return $problems;
    }

    /** Probleme einer Zeile als Texte mit nächstem Schritt. */
    private function SelfTestRow(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)($row['Variable'] ?? 0);

        if (!EditorSchema::RowFieldValid('DisplayType', $displayType)) {
            return [sprintf($this->Translate('%s: unknown display type "%s". Allowed are: %s.'), $name, self::ShortText($displayType), implode(', ', EditorSchema::DISPLAY_TYPES))];
        }
        $problems = $this->RowBrokenLinks($name, $row);
        $group = (string)($row['Group'] ?? '');
        if ($group !== '' && !EditorSchema::RowFieldValid('Group', $group)) {
            $problems[] = sprintf($this->Translate('%s: unknown group "%s". Allowed are keine Gruppe and Gruppe 1 to Gruppe 10.'), $name, self::ShortText($group));
        }

        if ($displayType === 'image') {
            if (EditorSchema::ObjectRef($row['ImageMedia'] ?? 0) === 0) {
                $problems[] = sprintf($this->Translate('%s: no image selected. Select an image for this row.'), $name);
            }
            return $problems;
        }

        $kind = $this->RowKind($row);
        $opensObject = $this->RowClickOpensObject($row);
        $mismatch = $this->SelfTestTypeMismatch($name, $row);
        if ($mismatch !== null) {
            $problems[] = $mismatch;
            return $problems;
        }
        if ($kind === 'variable' && !$opensObject && ($displayType === 'button' || $displayType === 'slider') && !HasAction($variableId)) {
            $problems[] = sprintf($this->KnownObjectText('%s: variable %d has no action, the row cannot switch. Give the variable an action or show it as text.'), $name, $variableId);
        }
        if ($kind === 'none' && $variableId <= 0) {
            if ($displayType === 'button') {
                $problems[] = sprintf($this->Translate('%s: the button has no target. Select a variable, a script or an object to open.'), $name);
            } else {
                $problems[] = sprintf($this->Translate('%s: no variable selected. Select a variable for this row.'), $name);
            }
        }
        return $problems;
    }

    /** Problem, wenn die Variable nicht zur Darstellungsart passt: Balken und Regler rechnen mit Zahlen, Float-Buttons und Buttons ohne Assoziationen zeigt das Frontend nur als Text. */
    private function SelfTestTypeMismatch(string $name, array $row): ?string
    {
        if ($this->RowKind($row) !== 'variable') {
            return null;
        }
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)$row['Variable'];
        $type = IPS_GetVariable($variableId)['VariableType'];
        if (($displayType === 'slider' || $displayType === 'progress') && $type !== VARIABLETYPE_INTEGER && $type !== VARIABLETYPE_FLOAT) {
            return sprintf($this->KnownObjectText('%s: variable %d holds no number, this row type cannot show or set it. Select another variable or show it as text.'), $name, $variableId);
        }
        if ($displayType === 'button' && $type === VARIABLETYPE_FLOAT) {
            return sprintf($this->KnownObjectText('%s: variable %d is a float, a button cannot switch it. Show it as a slider or as text.'), $name, $variableId);
        }
        if ($displayType === 'button' && ($type === VARIABLETYPE_INTEGER || $type === VARIABLETYPE_STRING) && empty($this->GetVariableAssociations($variableId, $type))) {
            return sprintf($this->KnownObjectText('%s: variable %d has no associations, a button cannot offer any value. Define them in its presentation or profile, or show it as text.'), $name, $variableId);
        }
        return null;
    }

    /** Hinweise einer Zeile: nichts ist kaputt, die Kachel weicht aber auf einen Standard aus. */
    private function SelfTestRowNotes(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)($row['Variable'] ?? 0);
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
        return [sprintf($this->KnownObjectText('%s: variable %d has no range of its own, the tile uses 0 to 100. If that does not fit, set minimum and maximum in its presentation.'), $name, $variableId)];
    }
}
