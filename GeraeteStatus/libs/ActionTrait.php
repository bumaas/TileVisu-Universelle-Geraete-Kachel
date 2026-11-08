<?php

declare(strict_types=1);

namespace UDT;

/**
 * Bedienung aus der Kachel: das Frontend sendet requestAction('row_<key>', Wunschwert); der Zeilen-
 * Schlüssel (Index in der Variablenliste) bestimmt Zeile und Darstellungsart, gewirkt wird nur auf ihr Ziel.
 */
trait ActionTrait
{
    /**
     * Ziel eines Idents als [Art, ID, Darstellungsart] mit Art 'script' oder 'variable'; null, wenn er
     * keine bedienbare Zeile dieser Kachel trifft (fremde Variablen, Scripts, alte Idents, Text- und Bildzeilen).
     */
    private function ResolveActionTarget(string $ident): ?array
    {
        if (preg_match('/^row_(0|[1-9][0-9]{0,4})$/', $ident, $m) !== 1) {
            return null;
        }
        $row = $this->ReadVariablesList()[(int)$m[1]] ?? null;
        return is_array($row) ? $this->RowActionTarget($row) : null;
    }

    /** Bedienbares Ziel einer Zeile: Variable einer Button- oder Regler-Zeile, Script eines Script-Buttons. */
    private function RowActionTarget(array $row): ?array
    {
        $displayType = $row['DisplayType'] ?? 'text';
        $variableID = (int)($row['Variable'] ?? 0);
        if ($variableID > 0 && IPS_VariableExists($variableID)) {
            return ($displayType === 'button' || $displayType === 'slider') ? ['variable', $variableID, $displayType] : null;
        }
        $scriptID = (int)($row['ScriptID'] ?? 0);
        return ($displayType === 'button' && $scriptID > 0) ? ['script', $scriptID, 'button'] : null;
    }

    /** Führt die Bedienung auf dem Ziel aus: Script starten oder den Wert an die Variable geben. */
    private function RunActionTarget(array $target, mixed $value): void
    {
        [$kind, $id, $displayType] = $target;
        if ($kind === 'script') {
            if (IPS_ScriptExists($id)) {
                try {
                    IPS_RunScript($id);
                } catch (\Throwable $e) {
                    $this->LogCaughtThrowable(__FUNCTION__, $e);
                }
            } else {
                trigger_error(sprintf($this->Translate('Action failed: script %d of this row does not exist. Select another script for the row.'), $id), E_USER_WARNING);
            }
            return;
        }
        if (!IPS_VariableExists($id)) {
            trigger_error(sprintf($this->Translate('Action failed: variable %d of this row does not exist. Select another variable for the row.'), $id), E_USER_WARNING);
            return;
        }
        switch (IPS_GetVariable($id)['VariableType']) {
            case VARIABLETYPE_BOOLEAN:
                // Wunschwert (der Zustand nach dem Klick), nicht umschalten: ein Doppelklick schaltet nicht zurück
                $wish = is_bool($value) ? $value : filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($wish === null) {
                    $this->SendDebug(__FUNCTION__, 'Kein Bool-Wunschwert: ' . json_encode($value), 0);
                    trigger_error(sprintf($this->Translate('Action rejected: %s is not a valid value for a switch. Send true or false.'), (string)json_encode($value)), E_USER_WARNING);
                    return;
                }
                RequestAction($id, $wish);
                break;
            case VARIABLETYPE_INTEGER:
                RequestAction($id, $displayType === 'slider' ? $this->NormalizeSliderValue($id, $value, true) : intval($value));
                break;
            case VARIABLETYPE_FLOAT:
                RequestAction($id, $this->NormalizeSliderValue($id, $value, false));
                break;
            case VARIABLETYPE_STRING:
                RequestAction($id, strval($value));
                break;
        }
    }

    /**
     * Wert eines Reglers für $variableID: auf die Schrittweite gerastet und auf den Bereich begrenzt.
     * Ein Maximum von 0 ist ein Maximum (-80..0); nur ohne gültigen Bereich (max <= min, etwa 0..0)
     * gilt 0..100 wie im Frontend.
     */
    private function NormalizeSliderValue(int $variableID, mixed $value, bool $integer): int|float
    {
        $bounds = $this->GetProgressMinMax($variableID);
        $min = (float)($bounds['min'] ?? 0);
        $max = (float)($bounds['max'] ?? 100);
        if ($max <= $min) {
            $min = 0.0;
            $max = 100.0;
        }
        $cfg = $this->GetSliderStepAndDigits($variableID);
        $step = (float)($cfg['step'] ?? 0);
        $digits = (int)($cfg['digits'] ?? 0);
        if ($step <= 0) {
            $step = $integer ? 1.0 : ($digits > 0 ? 10 ** -$digits : ($max - $min) / 100);
        }
        $number = is_numeric($value) ? (float)$value : $min;
        $number = $min + round(($number - $min) / $step) * $step;
        $number = min($max, max($min, $number));
        // auf die Genauigkeit der Schrittweite runden (0,05 → 2 Stellen), nicht auf die Anzeige-Stellen
        return $integer ? (int)round($number) : round($number, min(10, max(self::DecimalsOf($step), self::DecimalsOf($min))));
    }

    /** Nachkommastellen einer Zahl aus Konfiguration oder Darstellung (0.05 → 2, 1.0 → 0). */
    private static function DecimalsOf(float $number): int
    {
        $text = rtrim(rtrim(sprintf('%.10F', abs($number)), '0'), '.');
        $dot = strpos($text, '.');
        return $dot === false ? 0 : strlen($text) - $dot - 1;
    }
}
