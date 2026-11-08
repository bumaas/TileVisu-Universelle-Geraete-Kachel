<?php

declare(strict_types=1);

namespace UDT;

/**
 * Positivliste der Einstellungen, die der Editor liest und schreibt: jede Property und jedes Listenfeld
 * mit Typ und Grenzen wie im Konfigurationsformular. Unbekannte Felder fallen weg, falsche Werte sind
 * Fehler. Objekt-IDs prüft der Aufrufer über $refOk (Art, ID); 0 heißt „keins“.
 */
final class EditorSchema
{
    public const MAX_ROWS = 200;
    public const MAX_ASSOCIATIONS = 200;
    public const GROUP_COUNT = 10;
    /** Symcon vergibt IDs ab 10000; kleinere Werte heißen „kein Objekt“ (ältere Stände speichern 1 für „kein Bild“). */
    public const MIN_OBJECT_ID = 10000;
    private const MAX_TEXT = 200;

    private const ALIGN = ['left', 'center', 'right'];
    public const DISPLAY_TYPES = ['text', 'progress', 'slider', 'button', 'image'];
    public const IMAGE_CHOICES = ['none', 'custom', 'wm_aus', 'wm_an', 'dryer_off', 'dryer_on', 'symcon_icon'];

    /** Einzelwerte: Name => [Typ, …]. Typen: int (min, max), float (min, max), bool, string (Länge), enum, color, ref (Art). */
    private const PROPERTIES = [
        'Status' => ['ref', 'variable'],
        'StatusFontSize' => ['int', -1, 100],
        'StatusShowIcon' => ['bool'],
        'StatusShowLabel' => ['bool'],
        'StatusShowValue' => ['bool'],
        'StatusHide' => ['bool'],
        'StatusLabel' => ['string', self::MAX_TEXT],
        'StatusAlignment' => ['enum', self::ALIGN],
        'DefaultImage' => ['ref', 'image'],
        'DefaultIcon' => ['icon'],
        'DefaultIconColor' => ['color'],
        'ProgressBarHeight' => ['int', 10, 40],
        'ProgressBarBorderRadius' => ['int', 0, 20],
        'ProgressBarBackgroundColor' => ['color'],
        'ProgressBarBackgroundOpacity' => ['int', 0, 100],
        'ProgressBarShowText' => ['bool'],
        'ProgressBarTextPadding' => ['int', 0, 20],
        'ButtonHeight' => ['int', 10, 1000],
        'GroupNameSize' => ['int', -1, 100],
        'BildBreite' => ['float', 0, 2000],
        'BildPosition' => ['enum', ['left', 'top', 'bottom', 'right']],
        'ShowBorderLine' => ['bool'],
        'ImageAlignment' => ['enum', self::ALIGN],
        'BG_Off' => ['bool'],
        'bgImage' => ['ref', 'image'],
        'Bildtransparenz' => ['float', 0, 1],
        'Kachelhintergrundfarbe' => ['color'],
        'ElementSpacing' => ['int', 0, 50],
    ];

    /** Felder einer Zeile der Variablenliste; die letzten drei sind Altbestand und werden nur weitergegeben. */
    private const ROW = [
        'Variable' => ['ref', 'variable'],
        'ScriptID' => ['ref', 'script'],
        'OpenObjectId' => ['ref', 'object'],
        'DisplayType' => ['enum', self::DISPLAY_TYPES],
        'ShowIcon' => ['bool'],
        'ShowLabel' => ['bool'],
        'ShowValue' => ['bool'],
        'Label' => ['string', self::MAX_TEXT],
        'Group' => ['group'],
        'FontSize' => ['int', -1, 100],
        'TextColor' => ['color'],
        'ProgressColor1' => ['color'],
        'ProgressColor2' => ['color'],
        'SliderColor1' => ['color'],
        'SliderColor2' => ['color'],
        'InactiveDisplay' => ['enum', ['dash', 'value', 'hide']],
        'SecondVariable' => ['ref', 'variable'],
        'UseSecondVariableAsTarget' => ['bool'],
        'SecondVariableLabel' => ['string', self::MAX_TEXT],
        'SecondVariableShowIcon' => ['bool'],
        'SecondVariableShowLabel' => ['bool'],
        'SecondVariableShowValue' => ['bool'],
        'boolButtonColor' => ['color'],
        'ButtonWidth' => ['int', 20, 500],
        'VerticalAlignment' => ['enum', self::ALIGN],
        'ShowBorderLine' => ['bool'],
        'ImageMedia' => ['ref', 'image'],
        'ImageWidth' => ['int', 1, 100],
        'ImageBorderRadius' => ['int', 0, 100],
        'ShowGroupName' => ['bool'],
        'Fullscreen' => ['bool'],
        'TargetVariable' => ['int', 0, 59999],
    ];

    /** Felder einer Status-Zuordnung. */
    private const ASSOCIATION = [
        'AssoziationName' => ['string', self::MAX_TEXT],
        'AssoziationValue' => ['scalar'],
        'Bildauswahl' => ['enum', self::IMAGE_CHOICES],
        'EigenesBild' => ['ref', 'image'],
        'SymconIcon' => ['icon'],
        'IconColor' => ['color'],
        'StatusColor' => ['color'],
        'ProgressbarActive' => ['bool'],
    ];

    /** Felder einer Gruppe (GroupNamesList, Index 0 = Gruppe 1). */
    private const GROUP = [
        'Group' => ['int', 1, self::GROUP_COUNT],
        'GroupName' => ['string', 100],
        'Groupicon' => ['icon'],
        'ShowGroupName' => ['bool'],
        'ShowAbove' => ['bool'],
        'line' => ['bool'],
        'stretch' => ['bool'],
    ];

    private const LISTS = [
        'VariablesList' => [self::ROW, self::MAX_ROWS],
        'ProfilAssoziazionen' => [self::ASSOCIATION, self::MAX_ASSOCIATIONS],
        'GroupNamesList' => [self::GROUP, self::GROUP_COUNT],
    ];

    /** Vorgaben einer neuen Zeile, wie der Zeilendialog sie anlegt. */
    public const ROW_DEFAULTS = [
        'Variable' => 0, 'ScriptID' => 0, 'OpenObjectId' => 0, 'DisplayType' => 'text',
        'ShowIcon' => true, 'ShowLabel' => true, 'ShowValue' => true, 'Label' => '', 'Group' => 'keine Gruppe',
        'FontSize' => -1, 'TextColor' => -1, 'ProgressColor1' => 52650, 'ProgressColor2' => 30050,
        'SliderColor1' => 52650, 'SliderColor2' => 30050, 'InactiveDisplay' => 'dash',
        'SecondVariable' => 0, 'UseSecondVariableAsTarget' => false, 'SecondVariableLabel' => '',
        'SecondVariableShowIcon' => true, 'SecondVariableShowLabel' => true, 'SecondVariableShowValue' => true,
        'boolButtonColor' => -1, 'ButtonWidth' => 120, 'VerticalAlignment' => 'left', 'ShowBorderLine' => false,
        'ImageMedia' => 0, 'ImageWidth' => 40, 'ImageBorderRadius' => 6,
    ];

    /** Gespeicherte Objekt-Referenz: Symcon vergibt IDs ab 10000, alles darunter (0, Altwert 1) heißt „nichts gewählt“ und wird 0. */
    public static function ObjectRef(mixed $value): int
    {
        $id = is_numeric($value) ? (int)$value : 0;
        return $id >= self::MIN_OBJECT_ID ? $id : 0;
    }

    /** Objekt-IDs einer (vereinheitlichten) Konfiguration nach Art: variable|script|object|image => [IDs]. */
    public static function References(array $config): array
    {
        $refs = [];
        $take = static function (array $entry, array $rules) use (&$refs): void {
            foreach ($rules as $field => $rule) {
                if ($rule[0] === 'ref' && is_int($entry[$field] ?? null) && $entry[$field] > 0) {
                    $refs[$rule[1]][] = $entry[$field];
                }
            }
        };
        $take($config, self::PROPERTIES);
        foreach (self::LISTS as $name => [$fields]) {
            foreach (is_array($config[$name] ?? null) ? $config[$name] : [] as $entry) {
                if (is_array($entry)) {
                    $take($entry, $fields);
                }
            }
        }
        return array_map(static fn(array $ids): array => array_values(array_unique($ids)), $refs);
    }

    /** Namen aller Properties, die der Editor verwaltet. */
    public static function PropertyNames(): array
    {
        return array_merge(array_keys(self::PROPERTIES), array_keys(self::LISTS));
    }

    public static function IsList(string $name): bool
    {
        return isset(self::LISTS[$name]);
    }

    /** Ist der Wert für dieses Zeilenfeld gültig? Für Felder ohne Objektbezug. */
    public static function RowFieldValid(string $field, mixed $value): bool
    {
        $errors = [];
        self::Value($value, self::ROW[$field], $field, static fn (): bool => true, $errors);
        return $errors === [];
    }

    /**
     * Prüft und vereinheitlicht eine Konfiguration. Liefert [Konfiguration, Fehler]; Listen kommen als Arrays
     * zurück. Fehlende Properties bleiben weg (der Aufrufer ergänzt den gespeicherten Stand), ungültige
     * Werte auch: Beim Speichern lehnt der Aufrufer jeden Fehler ab, beim Laden meldet er sie nur.
     *
     * @param callable(string, int): bool $refOk
     */
    public static function Normalize(array $config, callable $refOk): array
    {
        $clean = [];
        $errors = [];
        foreach (self::PROPERTIES as $name => $rule) {
            if (array_key_exists($name, $config)) {
                self::Take($clean, $name, $config[$name], $rule, $name, $refOk, $errors);
            }
        }
        foreach (self::LISTS as $name => [$fields, $max]) {
            if (!array_key_exists($name, $config)) {
                continue;
            }
            $list = $config[$name];
            if (is_string($list)) {
                $list = json_decode($list, true);
            }
            if (!is_array($list) || !array_is_list($list)) {
                $errors[] = $name . ': ' . 'list expected';
                continue;
            }
            if (count($list) > $max) {
                $errors[] = $name . ': ' . 'more than ' . $max . ' entries';
                continue;
            }
            $clean[$name] = [];
            foreach ($list as $i => $entry) {
                if (!is_array($entry)) {
                    $errors[] = $name . '[' . $i . ']: ' . 'object expected';
                    continue;
                }
                $row = [];
                foreach ($fields as $field => $rule) {
                    if (array_key_exists($field, $entry)) {
                        self::Take($row, $field, $entry[$field], $rule, $name . '[' . $i . '].' . $field, $refOk, $errors);
                    }
                }
                $clean[$name][] = $row;
            }
        }
        return [$clean, $errors];
    }

    /** Übernimmt einen gültigen Wert; ein ungültiger wird gemeldet und fällt weg (die Vorgabe gilt). */
    private static function Take(array &$target, string $key, mixed $value, array $rule, string $path, callable $refOk, array &$errors): void
    {
        $before = count($errors);
        $clean = self::Value($value, $rule, $path, $refOk, $errors);
        if (count($errors) === $before) {
            $target[$key] = $clean;
        }
    }

    /** Ein Wert nach seiner Regel; bei einem Fehler wird er gemeldet und der Rückgabewert ist ohne Bedeutung. */
    private static function Value(mixed $value, array $rule, string $path, callable $refOk, array &$errors): mixed
    {
        $fail = static function (string $why) use ($path, &$errors): mixed {
            $errors[] = $path . ': ' . $why;
            return null;
        };
        switch ($rule[0]) {
            case 'bool':
                if (is_bool($value)) {
                    return $value;
                }
                // ältere Formularstände speichern Schalter in Listen als '' (aus), '0' oder '1'; die Kachel liest sie mit (bool)
                return in_array($value, [0, 1, '', '0', '1'], true) ? (bool)$value : $fail('true or false expected');
            case 'int':
            case 'float':
                if (is_string($value) && is_numeric($value)) {
                    $value = $value + 0;
                }
                if (!is_int($value) && !is_float($value)) {
                    return $fail('number expected');
                }
                if ($rule[0] === 'int' && (float)(int)$value !== (float)$value) {
                    return $fail('whole number expected');
                }
                if ($value < $rule[1] || $value > $rule[2]) {
                    return $fail('allowed ' . $rule[1] . ' to ' . $rule[2]);
                }
                return $rule[0] === 'int' ? (int)$value : (float)$value;
            case 'color':
                // ältere Stände speichern Farben als Text ("-1"), die Kachel liest sie als Zahl
                if (is_string($value) && preg_match('/^-?\d{1,8}$/', $value) === 1) {
                    $value = (int)$value;
                }
                if (!is_int($value) || $value < -1 || $value > 0xFFFFFF) {
                    return $fail('color expected (-1 = transparent)');
                }
                return $value;
            case 'string':
                if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
                    return $fail('text expected');
                }
                return mb_strlen($value) > $rule[1] ? $fail('longer than ' . $rule[1] . ' characters') : $value;
            case 'enum':
                return (is_string($value) && in_array($value, $rule[1], true)) ? $value : $fail('unknown value');
            case 'group':
                $ok = $value === 'keine Gruppe' || (is_string($value) && preg_match('/^Gruppe ([1-9]|10)$/', $value) === 1);
                return $ok ? $value : $fail('unknown group');
            case 'icon':
                return (is_string($value) && preg_match('/^[A-Za-z0-9 _-]{0,64}$/', $value) === 1) ? $value : $fail('icon name expected');
            case 'scalar':
                if (is_string($value)) {
                    return mb_check_encoding($value, 'UTF-8') && mb_strlen($value) <= self::MAX_TEXT ? $value : $fail('text expected');
                }
                return (is_int($value) || is_float($value) || is_bool($value)) ? $value : $fail('value expected');
            case 'ref':
                if ($value === '' || $value === null) {
                    return 0; // leere Auswahl im Formular (z. B. OpenObjectId "")
                }
                if (is_string($value) && ctype_digit($value)) {
                    $value = (int)$value;
                }
                if (!is_int($value) || $value < 0) {
                    return $fail('object ID expected');
                }
                if ($value < self::MIN_OBJECT_ID) {
                    return 0; // die Kachel zeigt dann kein Bild
                }
                return ($value === 0 || $refOk($rule[1], $value)) ? $value : $fail('object #' . $value . ' is not a suitable ' . $rule[1]);
        }
        return $fail('unknown rule');
    }
}
