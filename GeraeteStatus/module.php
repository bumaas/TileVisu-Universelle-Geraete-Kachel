<?php

declare(strict_types=1);

// Ensure all variable type constants are defined
if (!defined('VARIABLETYPE_BOOLEAN')) {
    define('VARIABLETYPE_BOOLEAN', 0);
}
if (!defined('VARIABLETYPE_INTEGER')) {
    define('VARIABLETYPE_INTEGER', 1);
}
if (!defined('VARIABLETYPE_STRING')) {
    define('VARIABLETYPE_STRING', 3);
}
if (!defined('VARIABLETYPE_FLOAT')) {
    define('VARIABLETYPE_FLOAT', 2);
}

// Ensure media message constants are defined (for older environments)
if (!defined('MM_CHANGEFILE')) {
    // IPS_BASE (10000) + IPS_MEDIAMESSAGE (900) + 3
    define('MM_CHANGEFILE', 10903);
}
if (!defined('MM_UPDATE')) {
    // IPS_BASE (10000) + IPS_MEDIAMESSAGE (900) + 5
    define('MM_UPDATE', 10905);
}

require_once __DIR__ . '/libs/CommonHelpers.php';
require_once __DIR__ . '/libs/SettingsAccessTrait.php';
require_once __DIR__ . '/libs/ImageHookTrait.php';
require_once __DIR__ . '/libs/IconTrait.php';
require_once __DIR__ . '/libs/PresentationTrait.php';
require_once __DIR__ . '/libs/PayloadTrait.php';
require_once __DIR__ . '/libs/PayloadVariablesTrait.php';
require_once __DIR__ . '/libs/FormTrait.php';
require_once __DIR__ . '/libs/ActionTrait.php';
require_once __DIR__ . '/libs/SelfTestTrait.php';
require_once __DIR__ . '/libs/UpdateTrait.php';
require_once __DIR__ . '/libs/TileHtmlTrait.php';
require_once __DIR__ . '/libs/EditorSchema.php';
require_once __DIR__ . '/libs/EditorTreeTrait.php';
require_once __DIR__ . '/libs/EditorAccessTrait.php';
require_once __DIR__ . '/libs/EditorHookTrait.php';
require_once __DIR__ . '/libs/EditorTemplateStoreTrait.php';

class UniversalDeviceTile extends IPSModuleStrict
{
    use \UDT\SettingsAccessTrait;
    use \UDT\ImageHookTrait;
    use \UDT\IconTrait;
    use \UDT\PresentationTrait;
    use \UDT\PayloadTrait;
    use \UDT\PayloadVariablesTrait;
    use \UDT\FormTrait;
    use \UDT\ActionTrait;
    use \UDT\SelfTestTrait;
    use \UDT\UpdateTrait;
    use \UDT\TileHtmlTrait;
    use \UDT\EditorTreeTrait;
    use \UDT\EditorAccessTrait;
    use \UDT\EditorHookTrait;
    use \UDT\EditorTemplateStoreTrait;

    // Darstellung „Legacy“: Symcon verweist damit auf das klassische Variablenprofil
    private const LEGACY_PRESENTATION_GUID = '4153A8D4-5C33-C65F-C1F3-7B61AAF99B1C';

    // Connect Control: Adresse für „Editor über Connect öffnen“
    private const CONNECT_CONTROL_GUID = '{9486D575-BE8C-4ED8-B5B5-20930E26DE6F}';

    // Variablen-Zugriff und Status-Variable-ID
    
    
    public function Create(): void
    {
        // Nie diese Zeile löschen!
        parent::Create();

        // Alter Gerätestatus (immer oben angezeigt)
        $this->RegisterPropertyInteger('Status', 0);
        $this->RegisterPropertyString('ProfilAssoziazionen', '[]');
        $this->RegisterPropertyInteger('StatusFontSize', -1);
        $this->RegisterPropertyBoolean('StatusShowIcon', true);
        $this->RegisterPropertyBoolean('StatusShowLabel', true);
        $this->RegisterPropertyBoolean('StatusShowValue', true);
        $this->RegisterPropertyBoolean('StatusHide', false);
        $this->RegisterPropertyString('StatusLabel', '');
        $this->RegisterPropertyString('StatusAlignment', 'left');
        $this->RegisterPropertyInteger('DefaultImage', 0);
        $this->RegisterPropertyString('DefaultIcon', '');       // greift ohne Standard-Bild
        $this->RegisterPropertyInteger('DefaultIconColor', -1); // -1 = Akzentfarbe

        // Neue universelle Variablenliste für konfigurierbare Variablen
        $this->RegisterPropertyString('VariablesList', '[]');
        
        // Zentrale Fortschrittsbalken-Konfiguration
        $this->RegisterPropertyInteger('ProgressBarHeight', 25);
        $this->RegisterPropertyInteger('ProgressBarBorderRadius', 6);
        $this->RegisterPropertyInteger('ProgressBarBackgroundColor', 8947848); // rgba(135, 135, 135, 0.3)
        $this->RegisterPropertyInteger('ProgressBarBackgroundOpacity', 30);
        $this->RegisterPropertyBoolean('ProgressBarShowText', true);
        $this->RegisterPropertyInteger('ProgressBarTextPadding', 12);
        
        // Zentrale Button-Konfiguration
        $this->RegisterPropertyInteger('ButtonHeight', 25);
        
        // Zentrale Gruppennamen-Konfiguration
        $this->RegisterPropertyInteger('GroupNameSize', -1);
        
        // Bildkonfiguration
        $this->RegisterPropertyFloat("BildBreite", 20.0);
        $this->RegisterPropertyString("BildPosition", "left");
        $this->RegisterPropertyBoolean("ShowBorderLine", true);
        $this->RegisterPropertyString("ImageAlignment", "center");
        $this->RegisterPropertyBoolean('BG_Off', true);
        $this->RegisterPropertyInteger("bgImage", 0);
        $this->RegisterPropertyFloat('Bildtransparenz', 0.7);
        $this->RegisterPropertyInteger('Kachelhintergrundfarbe', -1);
        $this->RegisterPropertyInteger('ElementSpacing', 5); // Standardwert für Element-Abstand
        
         
        // Benutzerdefinierte Gruppennamen (Groups 1-10) mit expliziten Checkbox-Defaults
        $defaultGroupNames = json_encode([
            ['Group' => 1, 'GroupName' => 'Group 1', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 2, 'GroupName' => 'Group 2', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 3, 'GroupName' => 'Group 3', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 4, 'GroupName' => 'Group 4', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 5, 'GroupName' => 'Group 5', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 6, 'GroupName' => 'Group 6', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 7, 'GroupName' => 'Group 7', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 8, 'GroupName' => 'Group 8', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 9, 'GroupName' => 'Group 9', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false],
            ['Group' => 10, 'GroupName' => 'Group 10', 'ShowGroupName' => false, 'ShowAbove' => false, 'line' => false, 'stretch' => false]
        ]);
        $this->RegisterPropertyString('GroupNamesList', $defaultGroupNames);

        // Visualisierungstyp auf 1 setzen, da wir HTML anbieten möchten
        $this->SetVisualizationType(1);

        $this->RegisterAttributeString('HookToken', '');
        $this->RegisterAttributeString('UserTemplates', '[]'); // eigene Vorlagen des Editors

        // Bild-Hook nativ (Symcon 8.1+): flüchtig, deshalb bei jedem Create, also jedem Systemstart
        $this->RegisterHook('udtimages/' . $this->InstanceID);
        $this->RegisterHook('udteditor/' . $this->InstanceID);
        
        // Lade das Icon-Mapping
        $this->LoadIconMapping();
    }

    
    

    /**
     * Gibt die Konfigurationsform zurück
     * @return string JSON-String der Konfigurationsform
     */
    public function GetConfigurationForm(): string
    {
        $groupNames = $this->GetAllGroupNames();
        $formPath = __DIR__ . '/form.json';
        $formJson = file_get_contents($formPath);
        if ($formJson === false) {
            $this->LogMessage('Could not read form.json.', KL_ERROR);
            return '{}';
        }

        $form = \UDT\Helpers::decodeJsonArray($formJson, __FUNCTION__ . ':form.json');
        if (!is_array($form)) {
            $this->LogMessage('form.json is invalid JSON.', KL_ERROR);
            return '{}';
        }

        $groupOptions = $this->BuildGroupSelectOptions($groupNames);
        $this->UpdateGroupSelectOptionsInForm($form, $groupOptions);
        $this->UpdateGroupOptionsInDynamicFormScript($form, $groupOptions);
        $this->populateGroupNameColumn($form, $groupNames);
        if ($this->ConnectBaseURL() !== '') {
            $form['elements'][1]['items'][1]['visible'] = true; // „Editor über Connect öffnen“
        }

        // Sichtbarkeiten des Zeilendialogs aus der Matrix einsetzen (als PHP-Stringliteral mit JSON)
        $matrix = var_export((string)json_encode(self::DISPLAY_TYPE_FIELD_VISIBILITY), true);
        $inner = static fn(string $text): string => substr((string)json_encode($text), 1, -1); // Inhalt eines JSON-Strings
        return str_replace($inner("'__UDT_ROW_VISIBILITY__'"), $inner($matrix), (string)json_encode($form));
    }

    private function LogCaughtThrowable(string $context, Throwable $e): void
    {
        $this->SendDebug($context, $e->getMessage(), 0);
    }

    private function IsKernelReady(): bool
    {
        if (!function_exists('IPS_GetKernelRunlevel') || !defined('KR_READY')) {
            return true;
        }

        return IPS_GetKernelRunlevel() == KR_READY;
    }



    

    

    

    
    public function ApplyChanges(): void
    {
        parent::ApplyChanges();

        $this->RegisterMessage(0, IPS_KERNELSTARTED);

        if (!$this->IsKernelReady()) {
            return;
        }

        // Stelle sicher, dass das Icon-Mapping geladen ist
        $this->LoadIconMapping();

        // Token der Bild-URLs (der Hook selbst ist nativ, RegisterHook in Create)
        $this->EnsureHookToken();

        // Dynamische Referenzen und Nachrichten für konfigurierte Variablen
        $variablesList = $this->ReadVariablesList();
        

        // Alle Bildmedien der Kachel (Standardbild, Hintergrund, eigene Statusbilder, Bildzeilen) werden
        // referenziert und auf Inhalts- und Dateiänderungen beobachtet
        $mediaIds = $this->GetConfiguredMediaIds();
        $ids = $mediaIds;
        
        // Füge Status-Variable hinzu
        $statusId = $this->ReadPropertyInteger('Status');
        if ($statusId > 0) {
            $ids[] = $statusId;
        }
        
        foreach ($variablesList as $variable) {
            if (isset($variable['Variable']) && $variable['Variable'] > 0) {
                $ids[] = $variable['Variable'];
            }
            // Registriere auch SecondVariable falls vorhanden
            if (isset($variable['SecondVariable']) && $variable['SecondVariable'] > 0) {
                $ids[] = $variable['SecondVariable'];
            }
        }

        
        // Entferne alle alten Referenzen
        $refs = $this->GetReferenceList();
        foreach($refs as $ref) {
            $this->UnregisterReference($ref);
        }
        
        // Registriere neue Referenzen
        foreach (array_unique($ids) as $id) {
            if ($id > 0) {
                $this->RegisterReference((int)$id);
            }
        }

        // Aktualisiere registrierte Nachrichten
        foreach ($this->GetMessageList() as $senderID => $messageIDs)
        {
            foreach ($messageIDs as $messageID)
            {
                $this->UnregisterMessage($senderID, $messageID);
            }
        }

        // Registriere Nachrichten für Status-Variable
        if ($statusId > 0) {
            $this->RegisterMessage($statusId, VM_UPDATE);
        }
        
        // Registriere Nachrichten für konfigurierte Variablen
        foreach ($variablesList as $variable) {
            if (isset($variable['Variable']) && $variable['Variable'] > 0) {
                $this->RegisterMessage((int)$variable['Variable'], VM_UPDATE);
            }
            // Registriere auch SecondVariable falls vorhanden
            if (isset($variable['SecondVariable']) && $variable['SecondVariable'] > 0) {
                $this->RegisterMessage((int)$variable['SecondVariable'], VM_UPDATE);
            }
        }

        // Registriere Nachrichten für Medien-Objekte (Inhalte geändert)
        foreach (array_unique($mediaIds) as $mid) {
            if ($mid > 0) {
                // Aktualisierung und Dateiänderung beobachten
                $this->RegisterMessage($mid, MM_UPDATE);
                $this->RegisterMessage($mid, MM_CHANGEFILE);
            }
        }

        // Schicke eine komplette Update-Nachricht an die Darstellung, da sich ja Parameter geändert haben können
        $fullUpdateMessage = $this->BuildFullPayload();
        $assets = $this->GenerateAssets();
        if (!empty($assets)) {
            $fullUpdateMessage['assets'] = $assets;
        }
        $this->UpdateVisualizationValue($this->EncodeTileMessage($fullUpdateMessage));
    }

    public function Destroy(): void
    {
        // der native Hook verschwindet mit der Instanz
        parent::Destroy();
    }


    
    

    public function MessageSink(int $TimeStamp, int $SenderID, int $Message, array $Data): void
    {
        if ($Message === IPS_KERNELSTARTED) {
            $this->ApplyChanges();
            return;
        }

        // Wertänderung: nur die betroffenen Zeilen (und bei der Statusvariable der Statusteil)
        if ($Message === VM_UPDATE) {
            $this->HandleVariableUpdate((int)$SenderID, is_array($Data) ? $Data : []);
            return;
        }

        // Medien-Änderungen: Bildzeilen, Statusbild, Hintergrund (Zeilen-Protokoll)
        if ($Message === MM_UPDATE || $Message === MM_CHANGEFILE) {
            $this->HandleMediaUpdate((int)$SenderID);
        }
}


    /**
     * Verarbeitet RequestAction-Aufrufe vom Frontend
     * @param string $Ident Der Identifier der Aktion
     * @param mixed $value Der Wert der Aktion
     */
    public function RequestAction(string $Ident, mixed $Value): void
    {
        // Prüfe zuerst auf spezielle Aktionen
        if ($Ident === 'UpdateDisplayTypeFields') {
            $this->UpdateDisplayTypeVisibility((string)$Value, $this->InstanceID);
            return;
        }
        
        // Nur Bedienelemente dieser Kachel: fremde Variablen und Scripts sind über die Kachel nicht erreichbar
        $target = $this->ResolveActionTarget((string)$Ident);
        if ($target === null) {
            $this->RejectIdent($Ident);
            return;
        }
        $this->RunActionTarget($target, $Value);
    }


    public function GetVisualizationTile(): string
    {
        // Füge ein Skript hinzu, um beim Laden, analog zu Änderungen bei Laufzeit, die Werte zu setzen
        $initialHandling = '<script>handleMessage(' . $this->GetFullUpdateMessage() . ')</script>';



        // Asset-System vereinheitlicht: Verwende dynamische Asset-Generierung statt hardcoded Assets
        $generatedAssets = $this->GenerateAssets();
        $assets = '<script>';
        $assets .= 'window.assets = {};' . PHP_EOL;
        
        // Dynamische Asset-Generierung basierend auf aktueller Konfiguration
        foreach ($generatedAssets as $assetName => $assetData) {
            $assets .= 'window.assets.' . $assetName . ' = "' . $assetData . '";' . PHP_EOL;
        }
        
        // Script-Tag schließen für das vereinheitlichte Asset-System
        $assets .= '</script>';

        // HTML der Kachel: Gerüst module.html mit den Teilen aus html/
        $module = $this->AssembleModuleHtml();

        // Gebe alles zurück.
        // Wichtig: $initialHandling nach hinten, da die Funktion handleMessage erst im HTML definiert wird
        return $module . $assets . $initialHandling;
    }



    /**
     * Feld-Sichtbarkeiten je Darstellungsart für den Zeilendialog der VariablesList: die eine Quelle für
     * das Öffnen (das Formularskript bekommt die Matrix eingesetzt) und für das Umschalten
     * (UpdateDisplayTypeVisibility). 'default' (unbekannte Darstellungsart) lässt Variable, FontSize und
     * TextColor unangetastet; OpenObjectId braucht zusätzlich Kernel > 8.1 (SelectObject).
     */
    private const DISPLAY_TYPE_FIELD_VISIBILITY = [
        'text' => [
            'ShowIcon' => true, 'ShowLabel' => true, 'ShowValue' => true,
            'Variable' => true, 'ScriptID' => false,
            'Label' => true, 'FontSize' => true, 'TextColor' => true,
            'ProgressColor1' => false, 'ProgressColor2' => false,
            'SliderColor1' => false, 'SliderColor2' => false,
            'SecondVariable' => false, 'SecondVariableShowIcon' => false,
            'SecondVariableShowLabel' => false, 'SecondVariableShowValue' => false,
            'SecondVariableLabel' => false, 'UseSecondVariableAsTarget' => false,
            'SecondVariableHeading' => false, 'SecondVariablePopupButton' => false,
            'ButtonWidth' => false, 'boolButtonColor' => false,
            'ShowBorderLine' => true, 'VerticalAlignment' => true,
            'OpenObjectId' => false,
            'ImageMedia' => false, 'ImageWidth' => false, 'ImageBorderRadius' => false,
            'InactiveDisplay' => false,
        ],
        'image' => [
            'ShowIcon' => false, 'ShowLabel' => false, 'ShowValue' => false,
            'Variable' => false, 'ScriptID' => false,
            'Label' => false, 'FontSize' => false, 'TextColor' => false,
            'ProgressColor1' => false, 'ProgressColor2' => false,
            'SliderColor1' => false, 'SliderColor2' => false,
            'SecondVariable' => false, 'SecondVariableShowIcon' => false,
            'SecondVariableShowLabel' => false, 'SecondVariableShowValue' => false,
            'SecondVariableLabel' => false, 'UseSecondVariableAsTarget' => false,
            'SecondVariableHeading' => false, 'SecondVariablePopupButton' => false,
            'ButtonWidth' => false, 'boolButtonColor' => false,
            'ShowBorderLine' => false, 'VerticalAlignment' => true,
            'OpenObjectId' => false,
            'ImageMedia' => true, 'ImageWidth' => true, 'ImageBorderRadius' => true,
            'InactiveDisplay' => false,
        ],
        'progress' => [
            'ShowIcon' => true, 'ShowLabel' => true, 'ShowValue' => true,
            'Variable' => true, 'ScriptID' => false,
            'Label' => true, 'FontSize' => true, 'TextColor' => true,
            'ProgressColor1' => true, 'ProgressColor2' => true,
            'SliderColor1' => false, 'SliderColor2' => false,
            'SecondVariable' => true, 'SecondVariableShowIcon' => true,
            'SecondVariableShowLabel' => true, 'SecondVariableShowValue' => true,
            'SecondVariableLabel' => true, 'UseSecondVariableAsTarget' => true,
            'SecondVariableHeading' => true, 'SecondVariablePopupButton' => true,
            'ButtonWidth' => false, 'boolButtonColor' => false,
            'ShowBorderLine' => false, 'VerticalAlignment' => false,
            'OpenObjectId' => false,
            'ImageMedia' => false, 'ImageWidth' => false, 'ImageBorderRadius' => false,
            'InactiveDisplay' => true,
        ],
        'slider' => [
            'ShowIcon' => true, 'ShowLabel' => true, 'ShowValue' => true,
            'Variable' => true, 'ScriptID' => false,
            'Label' => true, 'FontSize' => true, 'TextColor' => true,
            'ProgressColor1' => false, 'ProgressColor2' => false,
            'SliderColor1' => true, 'SliderColor2' => true,
            'SecondVariable' => false, 'SecondVariableShowIcon' => false,
            'SecondVariableShowLabel' => false, 'SecondVariableShowValue' => false,
            'SecondVariableLabel' => false, 'UseSecondVariableAsTarget' => false,
            'SecondVariableHeading' => false, 'SecondVariablePopupButton' => false,
            'ButtonWidth' => false, 'boolButtonColor' => false,
            'ShowBorderLine' => false, 'VerticalAlignment' => true,
            'OpenObjectId' => false,
            'ImageMedia' => false, 'ImageWidth' => false, 'ImageBorderRadius' => false,
            'InactiveDisplay' => false,
        ],
        'button' => [
            'ShowIcon' => true, 'ShowLabel' => true, 'ShowValue' => true,
            'Variable' => true, 'ScriptID' => true,
            'Label' => true, 'FontSize' => true, 'TextColor' => true,
            'ProgressColor1' => false, 'ProgressColor2' => false,
            'SliderColor1' => false, 'SliderColor2' => false,
            'SecondVariable' => false, 'SecondVariableShowIcon' => false,
            'SecondVariableShowLabel' => false, 'SecondVariableShowValue' => false,
            'SecondVariableLabel' => false, 'UseSecondVariableAsTarget' => false,
            'SecondVariableHeading' => false, 'SecondVariablePopupButton' => false,
            'ButtonWidth' => true, 'boolButtonColor' => true,
            'ShowBorderLine' => false, 'VerticalAlignment' => true,
            'OpenObjectId' => true,
            'ImageMedia' => false, 'ImageWidth' => false, 'ImageBorderRadius' => false,
            'InactiveDisplay' => false,
        ],
        'default' => [
            'ShowIcon' => false, 'ShowLabel' => false, 'ShowValue' => false,
            'ScriptID' => false, 'Label' => false,
            'ProgressColor1' => false, 'ProgressColor2' => false,
            'SliderColor1' => false, 'SliderColor2' => false,
            'SecondVariable' => false, 'SecondVariableShowIcon' => false,
            'SecondVariableShowLabel' => false, 'SecondVariableShowValue' => false,
            'SecondVariableLabel' => false,
            'SecondVariableHeading' => false, 'SecondVariablePopupButton' => false,
            'ButtonWidth' => false, 'boolButtonColor' => false,
            'ShowBorderLine' => false, 'VerticalAlignment' => false,
            'OpenObjectId' => false,
            'ImageMedia' => false, 'ImageWidth' => false, 'ImageBorderRadius' => false,
            'InactiveDisplay' => false,
        ],
    ];



}
?>