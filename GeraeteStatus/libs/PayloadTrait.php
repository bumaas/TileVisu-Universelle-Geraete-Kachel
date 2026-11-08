<?php

declare(strict_types=1);

namespace UDT;

/**
 * Aufbau des vollständigen Visualisierungs-Payloads (GetFullUpdateMessage): Statusteil,
 * Zeilen und Kachelteil.
 */
trait PayloadTrait
{
    /** Hat appendStatusPayload auf das Standard-Icon zurückgegriffen? (für dessen Farbe) */
    private bool $defaultIconUsed = false;

    /**
     * Die Variablenliste mit festen Typen: Objekt-IDs als int, Texte als string. Ältere oder per Skript
     * gesetzte Listen tragen IDs auch als String oder Float, unter strict_types würde das werfen. Referenzen
     * unter 10000 werden 0, danach heißt überall > 0 „gewählt“. Die Schlüssel (Zeilen-Schlüssel) bleiben
     * erhalten; unlesbare Einträge werden zu leeren Zeilen.
     */
    private function ReadVariablesList(): array
    {
        $rows = json_decode($this->SettingString('VariablesList'), true);
        $list = [];
        foreach (is_array($rows) ? $rows : [] as $key => $row) {
            if (!is_array($row)) {
                $list[$key] = [];
                continue;
            }
            foreach (['Variable', 'SecondVariable', 'ScriptID', 'OpenObjectId', 'ImageMedia'] as $field) {
                if (isset($row[$field]) && is_numeric($row[$field])) {
                    $row[$field] = EditorSchema::ObjectRef($row[$field]);
                }
            }
            foreach (['DisplayType', 'Group', 'Label', 'SecondVariableLabel'] as $field) {
                if (isset($row[$field]) && is_scalar($row[$field])) {
                    $row[$field] = (string)$row[$field];
                }
            }
            $list[$key] = $row;
        }
        return $list;
    }

    /** Das vollständige Payload als JSON (Erstaufbau in GetVisualizationTile). */
    private function GetFullUpdateMessage(): string
    {
        return $this->EncodeTileMessage($this->BuildFullPayload());
    }

    /**
     * JSON für die Kachel: ungültiges UTF-8 (etwa in einem String-Wert) wird ersetzt, statt die ganze
     * Nachricht zu verlieren; < und > werden maskiert, weil der Erstaufbau in einem <script> steht.
     */
    private function EncodeTileMessage(array $message): string
    {
        return (string)json_encode($message, JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    /** Das vollständige Payload: Status, Zeilen und Kachelteil (Kachel geöffnet, Konfiguration gespeichert). */
    private function BuildFullPayload(): array
    {
        $result = [];

        // Frontend-Sichttexte zentral aus locale.json
        $result['uiTexts'] = [
            'on' => $this->Translate('On'),
            'off' => $this->Translate('Off'),
            'targetSoc' => $this->Translate('Target SOC'),
            'deviceImage' => $this->Translate('Device Image'),
            'image' => $this->Translate('Image')
        ];

        $this->appendStatusPayload($result);
        $this->appendVariablesPayload($result);
        $this->appendTilePayload($result);
        if (!$this->IsPreview()) {
            // die Vorschau des Editors lässt den Stand der offenen Kachel unangetastet
            $this->RememberSentRows($result['variables'] ?? []);
        }

        return $result;
    }

    /**
     * Status-Daten (Statuszeile, Profilzuordnung, Statusbild) in das Payload schreiben.
     */
    private function appendStatusPayload(array &$result): void
    {
        $this->defaultIconUsed = false;
        // Status-Daten (werden immer oben angezeigt)
        $statusId = $this->SettingInteger('Status');
        // Neue Option: Statusbereich komplett ausblenden (Funktionalität bleibt erhalten)
        $result['statusHidden'] = $this->SettingBoolean('StatusHide');
        if ($statusId > 0 && IPS_VariableExists($statusId)) {
            $result['status'] = $this->CurrentValueFormatted($statusId);
            $result['statusValue'] = $this->CurrentValue($statusId);
            $result['statusFontSize'] = $this->SettingInteger('StatusFontSize');
            // Alignment for Status
            $result['statusAlignment'] = $this->SettingString('StatusAlignment');
            
            // Neue Status-Konfigurationsoptionen
            $result['statusShowIcon'] = $this->SettingBoolean('StatusShowIcon');
            $result['statusShowLabel'] = $this->SettingBoolean('StatusShowLabel');
            $result['statusShowValue'] = $this->SettingBoolean('StatusShowValue');
            $result['statusLabel'] = $this->SettingString('StatusLabel');
            
            // Status-Icon ermitteln
            $statusIcon = $this->GetIcon($statusId);
            $result['statusIcon'] = $statusIcon;
            
            // Verwende Profilassoziationen für Status-Konfiguration
            $profilAssoziationen = json_decode($this->SettingString('ProfilAssoziazionen'), true);
            $statusBildauswahlSet = false; // Flag to track if statusBildauswahl was set
            
            // Check if ALL associations have Bildauswahl = "none" AND no default image is configured
            $allAssociationsNone = true; // Assume all are none until we find one with an image
            if (is_array($profilAssoziationen)) {
                foreach ($profilAssoziationen as $assoz) {
                    $bildauswahl = $assoz['Bildauswahl'] ?? 'wm_aus';
                    if ($bildauswahl !== 'none') {
                        $allAssociationsNone = false; // Found at least one association with an image
                        break;
                    }
                }
            }
            
            // Hide image column only if ALL associations are "none" AND no default image is configured
            $hideImageColumn = $allAssociationsNone && !$this->hasDefaultImage();
            $result['hideImageColumn'] = $hideImageColumn;
            
            if (is_array($profilAssoziationen)) {
                $currentValue = $this->CurrentValue($statusId);
                $assoziation = $this->FindMatchingAssociation($profilAssoziationen, $currentValue);
                if ($assoziation !== null && $this->IsPreview()) {
                    // nur für den Editor: welche Zuordnung die Vorschau gerade zeigt (Doppelklick aufs Statusbild)
                    $result['editorAssociation'] = array_search($assoziation, $profilAssoziationen, true);
                }
                if ($assoziation !== null) {
                        // Neue erweiterte Bildauswahl-Logik
                        $bildauswahl = $assoziation['Bildauswahl'] ?? 'wm_aus';
                        
                        if ($bildauswahl === 'custom') {
                            // Verwende eigenes Bild aus SelectMedia-Feld
                            $customImage = EditorSchema::ObjectRef($assoziation['EigenesBild'] ?? 0);
                            if ($customImage > 0) {
                                // Asset-Name für Custom Image (wird in GenerateAssets() als base64 geladen)
                                $result['statusBildauswahl'] = 'img_custom_' . $customImage;
                                $result['statusImageUrl'] = $this->BuildImageHookUrl($customImage);
                            } else {
                                // Fallback: Verwende Standard-Bild wenn konfiguriert, sonst 'none'
                                $result['statusBildauswahl'] = $this->getDefaultImageOrNone();
                                if ($result['statusBildauswahl'] !== 'none' && strpos($result['statusBildauswahl'], 'img_default_') === 0) {
                                    $mid = (int)substr($result['statusBildauswahl'], strlen('img_default_'));
                                    $result['statusImageUrl'] = $this->BuildImageHookUrl($mid);
                                } else {
                                    $result['statusImageUrl'] = $this->BuildImageHookUrl(0);
                                }
                            }
                        } elseif ($bildauswahl === 'symcon_icon') {
                            // Verwende Symcon Icon aus SelectIcon-Feld
                            if (isset($assoziation['SymconIcon']) && !empty($assoziation['SymconIcon'])) {
                                $result['statusBildauswahl'] = 'symcon_icon_' . $assoziation['SymconIcon'];
                                // Individuelle Icon-Farbe (transparent => Accent-Color im Frontend)
                                if (array_key_exists('IconColor', $assoziation)) {
                                    $iconColorVal = $assoziation['IconColor'];
                                    $result['statusIconColor'] = ($iconColorVal === -1 || $iconColorVal === 16777215)
                                        ? ''
                                        : ('#' . sprintf('%06X', $iconColorVal));
                                    $result['isStatusIconColorTransparent'] = ($iconColorVal === -1 || $iconColorVal === 16777215);
                                } else {
                                    $result['statusIconColor'] = '';
                                    $result['isStatusIconColorTransparent'] = true;
                                }
                            } else {
                                // Fallback: Verwende Standard-Bild wenn konfiguriert, sonst 'none'
                                $result['statusBildauswahl'] = $this->getDefaultImageOrNone();
                                $result['statusIconColor'] = '';
                                $result['isStatusIconColorTransparent'] = true;
                            }
                        } elseif ($bildauswahl === 'none') {
                            // Fallback: Verwende Standard-Bild wenn konfiguriert, sonst wirklich 'none'
                            $result['statusBildauswahl'] = $this->getDefaultImageOrNone();
                            if ($result['statusBildauswahl'] !== 'none' && strpos($result['statusBildauswahl'], 'img_default_') === 0) {
                                $mid = (int)substr($result['statusBildauswahl'], strlen('img_default_'));
                                $result['statusImageUrl'] = $this->BuildImageHookUrl($mid);
                            } else {
                                $result['statusImageUrl'] = $this->BuildImageHookUrl(0);
                            }
                            $result['statusIconColor'] = '';
                            $result['isStatusIconColorTransparent'] = true;
                        } else {
                            // Verwende vorkonfigurierte Bilder (wm_an, wm_aus, dryer_on, dryer_off, etc.)
                            $result['statusBildauswahl'] = $bildauswahl;
                            $result['statusImageUrl'] = $this->BuildAssetHookUrl($bildauswahl);
                            $result['statusIconColor'] = '';
                            $result['isStatusIconColorTransparent'] = true;
                        }
                        
                        $statusBildauswahlSet = true;
                        $statusColor = $assoziation['StatusColor'] ?? -1;
                        $result['statusColor'] = isset($assoziation['StatusColor']) ? '#' . sprintf('%06X', $assoziation['StatusColor']) : '#000000';
                        $result['isStatusColorTransparent'] = isset($assoziation['StatusColor']) && ($assoziation['StatusColor'] == -1 || $assoziation['StatusColor'] == 16777215);
                }
            }
            
            // Ensure statusBildauswahl is set if we have a status variable
            if (!$statusBildauswahlSet) {
                $result['statusBildauswahl'] = $this->getDefaultImageOrNone();
                if ($result['statusBildauswahl'] !== 'none' && strpos($result['statusBildauswahl'], 'img_default_') === 0) {
                    $mid = (int)substr($result['statusBildauswahl'], strlen('img_default_'));
                    $result['statusImageUrl'] = $this->BuildImageHookUrl($mid);
                } else {
                    $result['statusImageUrl'] = $this->BuildImageHookUrl(0);
                }
            }
        } else {
            // Fallback: Wenn keine Statusvariable konfiguriert ist
            // 1) Bildauswahl: Standard-Bild wenn vorhanden, sonst 'none'
            $result['statusBildauswahl'] = $this->getDefaultImageOrNone();
            // 2) Spaltenanzeige: Wenn KEIN DefaultImage vorhanden ist → gesamte Bildspalte ausblenden
            $result['hideImageColumn'] = !$this->hasDefaultImage();
            if ($this->IsPreview()) {
                $this->previewFirstAssociation($result);
            }
        }
        
        // UNIVERSAL GUARANTEE: statusBildauswahl MUST ALWAYS be set
        if (!isset($result['statusBildauswahl'])) {
            $result['statusBildauswahl'] = 'none';
        }
        // Rückfall auf das Standard-Icon: dessen Farbe (-1 = Akzentfarbe der Kachel)
        if ($this->defaultIconUsed && str_starts_with($result['statusBildauswahl'], 'symcon_icon_')) {
            $color = $this->SettingInteger('DefaultIconColor');
            $transparent = $color === -1 || $color === 16777215;
            $result['statusIconColor'] = $transparent ? '' : '#' . sprintf('%06X', $color);
            $result['isStatusIconColorTransparent'] = $transparent;
        }
        // Ensure statusAlignment is always present
        if (!isset($result['statusAlignment'])) {
            $result['statusAlignment'] = $this->SettingString('StatusAlignment');
        }
    }

    /**
     * Globale Kachel-Konfiguration (Progress-/Button-Config, Layout, Hintergrundbild,
     * InstanceID, Gruppennamen) in das Payload schreiben.
     */
    private function appendTilePayload(array &$result): void
    {
        // Zentrale Fortschrittsbalken-Konfiguration
        $result['progressBarConfig'] = [
            'height' => $this->SettingInteger('ProgressBarHeight'),
            'borderRadius' => $this->SettingInteger('ProgressBarBorderRadius'),
            // -1 = transparent (sprintf('%06X', -1) ergäbe #FFFFFFFFFFFFFFFF und im Frontend Weiß)
            'backgroundColor' => $this->SettingInteger('ProgressBarBackgroundColor') < 0 ? 'transparent' : '#' . sprintf('%06X', $this->SettingInteger('ProgressBarBackgroundColor')),
            'backgroundOpacity' => $this->SettingInteger('ProgressBarBackgroundOpacity') / 100,
            'showText' => $this->SettingBoolean('ProgressBarShowText'),
            'textPadding' => $this->SettingInteger('ProgressBarTextPadding')
        ];
        
        // Zentrale Button-Konfiguration
        $result['buttonConfig'] = [
            'height' => $this->SettingInteger('ButtonHeight')
        ];
        
        // Bild-Konfiguration
        // Note: bildauswahl is now handled per-association in status rendering logic above
        $result['BildBreite'] = $this->SettingFloat('BildBreite');
        $result['BildPosition'] = $this->SettingString('BildPosition');
        $result['ShowBorderLine'] = $this->SettingBoolean('ShowBorderLine');
        $result['ImageAlignment'] = $this->SettingString('ImageAlignment');
        $result['bildtransparenz'] = $this->SettingFloat('Bildtransparenz');
        $result['kachelhintergrundfarbe'] = '#' . sprintf('%06X', $this->SettingInteger('Kachelhintergrundfarbe'));
        
        // Element-Spacing-Konfiguration
        $result['elementSpacing'] = $this->SettingInteger('ElementSpacing');
        
 
        // Hintergrund: eigenes Bild oder Standardhintergrund, beides über den Bild-Hook statt als eingebettete
        // Bytes; '' = kein Hintergrund, damit eine offene Kachel ein entferntes Bild auch entfernt
        $imageID = $this->SettingInteger('bgImage');
        $result['image1Url'] = '';
        if ($imageID > 0 && IPS_MediaExists($imageID) && IPS_GetMedia($imageID)['MediaType'] === MEDIATYPE_IMAGE) {
            $result['image1Url'] = $this->BuildImageHookUrl($imageID);
        } elseif ($this->SettingBoolean('BG_Off')) {
            $result['image1Url'] = $this->BuildAssetHookUrl('kachelhintergrund1');
        }

        // Füge Instance-ID für RequestAction-Aufrufe hinzu
        $result['instanceid'] = $this->InstanceID;
        
        // Füge Gruppennamen hinzu für Frontend-Verwendung
        try {
            $groupNames = $this->GetAllGroupNames();
            $result['groupNames'] = $groupNames;
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__ . ':GetAllGroupNames', $e);
        }
    }

    /**
     * Hilfsfunktion: Gibt das konfigurierte Standard-Bild zurück oder 'none' wenn nicht konfiguriert
     * @return string Asset-Name für das Standard-Bild oder 'none'
     */
    private function getDefaultImageOrNone(): string {
        $defaultImageId = $this->SettingInteger('DefaultImage');
        if ($defaultImageId > 0 && IPS_MediaExists($defaultImageId)) {
            return 'img_default_' . $defaultImageId;
        }
        // Standard-Icon (Font-Awesome-Name) nur ohne Standard-Bild; die Farbe setzt appendStatusPayload am Ende
        $icon = trim($this->SettingString('DefaultIcon'));
        if ($icon !== '') {
            $this->defaultIconUsed = true;
            return 'symcon_icon_' . $icon;
        }
        return 'none';
    }

    /**
     * Nur Editor-Vorschau ohne Statusvariable: das Bild der ersten Zuordnung (etwa aus einer Vorlage), damit es
     * schon vor der Wahl der Statusvariable zu sehen ist. Die echte Kachel zeigt ohne Statusvariable kein Zuordnungsbild.
     */
    private function previewFirstAssociation(array &$result): void
    {
        $list = json_decode($this->SettingString('ProfilAssoziazionen'), true);
        $first = is_array($list) ? ($list[0] ?? null) : null;
        if (!is_array($first)) {
            return;
        }
        $choice = (string)($first['Bildauswahl'] ?? 'none');
        if ($choice === 'symcon_icon' && !empty($first['SymconIcon'])) {
            $color = (int)($first['IconColor'] ?? -1);
            $transparent = $color === -1 || $color === 16777215;
            $result['statusBildauswahl'] = 'symcon_icon_' . $first['SymconIcon'];
            $result['statusIconColor'] = $transparent ? '' : '#' . sprintf('%06X', $color);
            $result['isStatusIconColorTransparent'] = $transparent;
        } elseif ($choice === 'custom' && EditorSchema::ObjectRef($first['EigenesBild'] ?? 0) > 0) {
            $result['statusBildauswahl'] = 'img_custom_' . (int)$first['EigenesBild'];
            $result['statusImageUrl'] = $this->BuildImageHookUrl((int)$first['EigenesBild']);
        } elseif (!in_array($choice, ['none', 'custom', 'symcon_icon'], true)) {
            $result['statusBildauswahl'] = $choice;
            $result['statusImageUrl'] = $this->BuildAssetHookUrl($choice);
        } else {
            return;
        }
        $result['hideImageColumn'] = false;
        $result['editorAssociation'] = 0;
    }

    /** Gibt es einen Rückfall fürs Statusbild (Standard-Bild oder Standard-Icon)? Dann bleibt die Bildspalte. */
    private function hasDefaultImage(): bool
    {
        $id = $this->SettingInteger('DefaultImage');
        return ($id > 0 && IPS_MediaExists($id)) || trim($this->SettingString('DefaultIcon')) !== '';
    }
}
