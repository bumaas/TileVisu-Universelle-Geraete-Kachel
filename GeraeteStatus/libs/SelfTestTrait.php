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

        foreach ($rows as $key => $row) {
            $name = 'row_' . $key;
            $problems = array_merge($problems, $this->SelfTestRow($name, $row));
            $notes = array_merge($notes, $this->SelfTestRowNotes($name, $row));
            $target = $this->RowActionTarget($row);
            if ($target !== null && ($target[0] === 'script' ? IPS_ScriptExists($target[1]) : HasAction($target[1]))) {
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
            $lines[] = $this->Translate('Operable rows (keys change when rows are added, removed or moved; to switch a device use its source variable):');
            foreach ($operable as $entry) {
                $lines[] = '- ' . $entry;
            }
        }
        return implode("\n", $lines);
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

        if ($secondId > 0 && !IPS_VariableExists($secondId)) {
            $problems[] = sprintf($this->Translate('%s: second variable %d does not exist. Select another one or remove it.'), $name, $secondId);
        }

        if ($displayType === 'image') {
            if ($mediaId <= 0) {
                $problems[] = sprintf($this->Translate('%s: no image selected. Select an image for this row.'), $name);
            } elseif (!IPS_MediaExists($mediaId)) {
                $problems[] = sprintf($this->Translate('%s: image %d does not exist. Select another image for this row.'), $name, $mediaId);
            }
            return $problems;
        }

        if ($displayType === 'button' && $variableId <= 0) {
            if ($scriptId > 0) {
                if (!IPS_ScriptExists($scriptId)) {
                    $problems[] = sprintf($this->Translate('%s: script %d does not exist. Select another script for this row.'), $name, $scriptId);
                }
            } elseif ($openId > 1) {
                if (!IPS_ObjectExists($openId)) {
                    $problems[] = sprintf($this->Translate('%s: object %d to open does not exist. Select another object for this row.'), $name, $openId);
                }
            } else {
                $problems[] = sprintf($this->Translate('%s: the button has no target. Select a variable, a script or an object to open.'), $name);
            }
            return $problems;
        }

        if ($variableId <= 0) {
            $problems[] = sprintf($this->Translate('%s: no variable selected. Select a variable for this row.'), $name);
            return $problems;
        }
        if (!IPS_VariableExists($variableId)) {
            $problems[] = sprintf($this->Translate('%s: variable %d does not exist. Select another variable for this row.'), $name, $variableId);
            return $problems;
        }

        if (($displayType === 'button' || $displayType === 'slider') && !HasAction($variableId)) {
            $problems[] = sprintf($this->Translate('%s: variable %d has no action, the row cannot switch. Give the variable an action or show it as text.'), $name, $variableId);
        }
        return $problems;
    }

    /** Hinweise einer Zeile: nichts ist kaputt, die Kachel weicht aber auf einen Standard aus. */
    private function SelfTestRowNotes(string $name, array $row): array
    {
        $displayType = (string)($row['DisplayType'] ?? 'text');
        $variableId = (int)($row['Variable'] ?? 0);
        if (($displayType !== 'slider' && $displayType !== 'progress') || $variableId <= 0 || !IPS_VariableExists($variableId)) {
            return [];
        }
        $bounds = $this->GetProgressMinMax($variableId);
        if ((float)($bounds['max'] ?? 100) > (float)($bounds['min'] ?? 0)) {
            return [];
        }
        return [sprintf($this->Translate('%s: variable %d has no range of its own, the tile uses 0 to 100. If that does not fit, set minimum and maximum in its presentation.'), $name, $variableId)];
    }
}
