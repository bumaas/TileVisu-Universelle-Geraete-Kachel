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

    /**
     * Was eine Zeile ist: variable, image, script, object oder none. Die einzige Stelle mit dieser
     * Entscheidung, Kachel, Bedienung und Selbsttest lesen sie von hier.
     */
    private function RowKind(array $row): string
    {
        $displayType = $row['DisplayType'] ?? 'text';
        $variableID = (int)($row['Variable'] ?? 0);
        if ($variableID > 0 && IPS_VariableExists($variableID)) {
            return 'variable';
        }
        if ($displayType === 'image') {
            return 'image';
        }
        if ($displayType === 'button' && (int)($row['ScriptID'] ?? 0) > 0) {
            return 'script';
        }
        return ($displayType === 'button' && (int)($row['OpenObjectId'] ?? 0) > 0) ? 'object' : 'none';
    }

    /**
     * Öffnet ein Klick auf die Zeile ein Objekt statt zu schalten? Das Frontend wertet OpenObjectId nur am
     * Bool-Button aus, den auch Script- und Objektzeilen benutzen; Mehrfach-Buttons und Regler ignorieren es.
     */
    private function RowClickOpensObject(array $row): bool
    {
        if ((int)($row['OpenObjectId'] ?? 0) <= 0) {
            return false;
        }
        $kind = $this->RowKind($row);
        if ($kind === 'variable') {
            return ($row['DisplayType'] ?? 'text') === 'button' && IPS_GetVariable((int)$row['Variable'])['VariableType'] === VARIABLETYPE_BOOLEAN;
        }
        return $kind === 'script' || $kind === 'object';
    }

    /** Bedienbares Ziel einer Zeile: Variable einer Button- oder Regler-Zeile, Script eines Script-Buttons. */
    private function RowActionTarget(array $row): ?array
    {
        $kind = $this->RowKind($row);
        if ($kind === 'script') {
            return ['script', (int)$row['ScriptID'], 'button'];
        }
        $displayType = $row['DisplayType'] ?? 'text';
        return ($kind === 'variable' && ($displayType === 'button' || $displayType === 'slider')) ? ['variable', (int)$row['Variable'], $displayType] : null;
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
                $wish = self::BoolWish($value);
                if ($wish === null) {
                    $this->RejectValue($value, $this->Translate('Action rejected: %s is not a valid value for a switch. Send true or false.'));
                    return;
                }
                RequestAction($id, $wish);
                break;
            case VARIABLETYPE_INTEGER:
                if (!self::IsNumberWish($value)) {
                    $this->RejectValue($value, $this->Translate('Action rejected: %s is not a valid value for this row. Send a number.'));
                    return;
                }
                RequestAction($id, $displayType === 'slider' ? $this->NormalizeSliderValue($id, $value, true) : intval($value));
                break;
            case VARIABLETYPE_FLOAT:
                if (!self::IsNumberWish($value)) {
                    $this->RejectValue($value, $this->Translate('Action rejected: %s is not a valid value for this row. Send a number.'));
                    return;
                }
                RequestAction($id, $this->NormalizeSliderValue($id, $value, false));
                break;
            case VARIABLETYPE_STRING:
                if (!self::IsTextWish($value)) {
                    $this->RejectValue($value, $this->Translate('Action rejected: %s is not a valid value for this row. Send a text.'));
                    return;
                }
                RequestAction($id, strval($value));
                break;
        }
    }

    /** Bool-Wunschwert oder null. Leerer Text und null wären für filter_var ein gültiges false. */
    private static function BoolWish(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if ($value === null || (is_string($value) && trim($value) === '')) {
            return null;
        }
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    /** Zahl oder Zahlentext im Integer-Bereich; der Vergleich schließt auch NAN und INF aus. */
    private static function IsNumberWish(mixed $value): bool
    {
        return is_numeric($value) && abs((float)$value) < PHP_INT_MAX;
    }

    /** Text oder endliche Zahl; null, Bool, Listen und Objekte haben keine sinnvolle Textform. */
    private static function IsTextWish(mixed $value): bool
    {
        return is_string($value) || is_int($value) || (is_float($value) && is_finite($value));
    }

    /** Meldet einen Ident ohne bedienbare Zeile. */
    private function RejectIdent(string $ident): void
    {
        $shown = self::ShortText($ident);
        $this->SendDebug(__FUNCTION__, 'Abgelehnt, keine bedienbare Zeile dieser Kachel: ' . $shown, 0);
        trigger_error(sprintf($this->Translate('Action rejected: "%s" is not an operable row of this tile. Read the row keys with UDST_RunSelfTest or switch the source variable directly.'), $shown), E_USER_WARNING);
    }

    /** Text vom Aufrufer für das Meldungsprotokoll: gültiges UTF-8, ohne Steuerzeichen, höchstens 40 Zeichen. */
    private static function ShortText(string $text): string
    {
        $clean = (string)preg_replace('/\p{Cc}+/u', ' ', mb_scrub($text, 'UTF-8'));
        return mb_strlen($clean) > 40 ? mb_substr($clean, 0, 40) . '…' : $clean;
    }

    /** Meldet einen abgelehnten Wunschwert; $message enthält %s für den Wert. */
    private function RejectValue(mixed $value, string $message): void
    {
        $shown = self::ShortText(is_float($value) && !is_finite($value) ? var_export($value, true) : (string)json_encode($value, JSON_INVALID_UTF8_SUBSTITUTE));
        $this->SendDebug(__FUNCTION__, 'Ungültiger Wunschwert: ' . $shown, 0);
        trigger_error(sprintf($message, $shown), E_USER_WARNING);
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
        $number = (float)$value;
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
