<?php

declare(strict_types=1);

namespace UDT;

/**
 * Das HTML der Kachel wird beim Ausliefern zusammengesetzt: module.html ist das Gerüst, CSS und JS
 * liegen nach Verantwortung in html/css und html/js (je höchstens 500 Zeilen).
 */
trait TileHtmlTrait
{
    /**
     * Gerüst mit den Teilen an den Platzhalterzeilen (/*__UDT_PART <datei>__*\/): jede Zeile wird durch den
     * Inhalt der Datei ersetzt, die Seite ist bytegleich zu einer ungeteilten module.html. Ein fehlender Teil
     * wird gemeldet und bleibt leer. Zeilenenden \r\n (Git unter Windows mit core.autocrlf) zählen mit.
     */
    private function AssembleModuleHtml(): string
    {
        $dir = dirname(__DIR__);
        $skeleton = (string)file_get_contents($dir . '/module.html');
        return (string)preg_replace_callback('~^[ \t]*/\*__UDT_PART ([a-z0-9_-]+/[a-z0-9_.-]+)__\*/\r?\n~m', function (array $m) use ($dir): string {
            $part = str_contains($m[1], '..') ? false : @file_get_contents($dir . '/html/' . $m[1]);
            if (!is_string($part)) {
                $this->LogMessage('Kachelteil fehlt: html/' . $m[1], KL_ERROR);
                return '';
            }
            return $part;
        }, $skeleton);
    }
}
