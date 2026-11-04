<?php

declare(strict_types=1);

namespace UDT;

/**
 * Einstellungen und Werte für den Aufbau der Kachel. Ohne Entwurf sind das die gespeicherten Properties
 * und die echten Variablenwerte. Der Editor baut seine Vorschau mit einem Entwurf (nicht gespeicherte
 * Einstellungen) und Vorschau-Werten (Status simulieren, Testwerte), ohne Property, Puffer oder Gerät
 * anzufassen. Beides gilt nur für das Objekt dieses einen Aufrufs.
 */
trait SettingsAccessTrait
{
    /** Entwurf: Property-Name => Wert; null = gespeicherte Properties. */
    private ?array $previewSettings = null;

    /** Vorschau-Werte: Variablen-ID => Wert. */
    private array $previewValues = [];

    private function IsPreview(): bool
    {
        return $this->previewSettings !== null;
    }

    private function SettingInteger(string $name): int
    {
        if ($this->previewSettings !== null && array_key_exists($name, $this->previewSettings)) {
            return (int)$this->previewSettings[$name];
        }
        return $this->ReadPropertyInteger($name);
    }

    private function SettingBoolean(string $name): bool
    {
        if ($this->previewSettings !== null && array_key_exists($name, $this->previewSettings)) {
            return (bool)$this->previewSettings[$name];
        }
        return $this->ReadPropertyBoolean($name);
    }

    private function SettingFloat(string $name): float
    {
        if ($this->previewSettings !== null && array_key_exists($name, $this->previewSettings)) {
            return (float)$this->previewSettings[$name];
        }
        return $this->ReadPropertyFloat($name);
    }

    /** Listen stehen in Properties als JSON-Text; ein Entwurf darf sie auch als Array tragen. */
    private function SettingString(string $name): string
    {
        if ($this->previewSettings !== null && array_key_exists($name, $this->previewSettings)) {
            $value = $this->previewSettings[$name];
            return is_array($value) ? (string)json_encode($value) : (string)$value;
        }
        return $this->ReadPropertyString($name);
    }

    /** Wert einer Variable, in der Vorschau gegebenenfalls der simulierte. */
    private function CurrentValue(int $variableID): mixed
    {
        if (array_key_exists($variableID, $this->previewValues)) {
            return $this->previewValues[$variableID];
        }
        return GetValue($variableID);
    }

    /** Formatierter Wert; ein simulierter Wert wird mit der Darstellung der Variable formatiert. */
    private function CurrentValueFormatted(int $variableID): string
    {
        if (array_key_exists($variableID, $this->previewValues)) {
            return (string)GetValueFormattedEx($variableID, $this->previewValues[$variableID]);
        }
        return (string)GetValueFormatted($variableID);
    }
}
