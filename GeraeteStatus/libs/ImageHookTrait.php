<?php

declare(strict_types=1);

namespace UDT;

/**
 * Bildauslieferung über den nativen Hook /hook/udtimages/<InstanceID> (RegisterHook in Create):
 * Token-geschützte Auslieferung konfigurierter Medienobjekte und mitgelieferter Assets sowie
 * Asset-/URL-Generierung.
 */
trait ImageHookTrait
{
    // Hilfsmethode zur Asset-Generierung für Custom Images und Fallback-Assets
    private function GenerateAssets(): array {
        $assets = [];
        
        // Prüfe ob keine Statusvariable konfiguriert ist - dann brauchen wir Fallback-Assets
        $statusId = $this->SettingInteger('Status');
        $needsFallbackAssets = ($statusId <= 0 || !IPS_VariableExists($statusId));
        
        // Sammle alle benötigten Assets basierend auf ProfilAssoziazionen
        $profilAssoziazionen = json_decode($this->SettingString('ProfilAssoziazionen'), true);
        if (is_array($profilAssoziazionen)) {
            foreach ($profilAssoziazionen as $assoziation) {
                $bildauswahl = $assoziation['Bildauswahl'] ?? 'none';
                
                if ($bildauswahl === 'custom') {
                    $mediaId = EditorSchema::ObjectRef($assoziation['EigenesBild'] ?? 0);
                    if ($mediaId > 0 && IPS_MediaExists($mediaId)) {
                        $assets['img_custom_' . $mediaId] = $this->BuildImageHookUrl($mediaId);
                    }
                } elseif (in_array($bildauswahl, ['wm_an', 'wm_aus', 'dryer_on', 'dryer_off'])) {
                    $assets['img_' . $bildauswahl] = $this->BuildAssetHookUrl($bildauswahl);
                }
            }
        }
        // Standard-Bild optional als Hook-URL mappen (nur für Konsistenz, Status nutzt ohnehin statusImageUrl)
        $defaultImageId = $this->SettingInteger('DefaultImage');
        if ($defaultImageId > 0 && IPS_MediaExists($defaultImageId)) {
            $assets['img_default_' . $defaultImageId] = $this->BuildImageHookUrl($defaultImageId);
        }

        // Fallback: Wenn keine Statusvariable konfiguriert ist und noch kein img_wm_an Asset vorhanden, 
        // mappe Standard-Waschmaschinen-Asset als Fallback (WebHook)
        if ($needsFallbackAssets && !isset($assets['img_wm_an'])) {
            $assets['img_wm_an'] = $this->BuildAssetHookUrl('wm_an');
        }
        
        
        return $assets;
    }

    /** Token der Bild-URLs: einmal erzeugt und in einem Attribut gehalten. */
    private function EnsureHookToken(): void
    {
        if ($this->ReadAttributeString('HookToken') !== '') {
            return;
        }
        try {
            $token = bin2hex(random_bytes(16));
        } catch (\Throwable $e) {
            $token = substr(sha1(uniqid('', true)), 0, 32);
            $this->LogCaughtThrowable(__FUNCTION__ . ':tokenFallback', $e);
        }
        $this->WriteAttributeString('HookToken', $token);
    }

    /**
     * Die Bildmedien, die diese Kachel zeigt: Standardbild, Hintergrundbild, eigene Bilder der
     * Status-Zuordnungen und Bildzeilen. Nur diese liefert der Bild-Hook aus (dazu mit dem Vorschau-Schlüssel
     * die eines Editor-Entwurfs); mit Entwurf die des Entwurfs.
     */
    private function GetConfiguredMediaIds(): array
    {
        $ids = [$this->SettingInteger('DefaultImage'), $this->SettingInteger('bgImage')];
        $associations = json_decode($this->SettingString('ProfilAssoziazionen'), true);
        foreach (is_array($associations) ? $associations : [] as $association) {
            if (is_array($association) && ($association['Bildauswahl'] ?? '') === 'custom') {
                $ids[] = (int)($association['EigenesBild'] ?? 0);
            }
        }
        foreach ($this->ReadVariablesList() as $row) {
            if (($row['DisplayType'] ?? 'text') === 'image') {
                $ids[] = (int)($row['ImageMedia'] ?? 0);
            }
        }
        return array_values(array_unique(array_filter($ids, static fn(int $id): bool => $id > 0 && IPS_MediaExists($id))));
    }

    /**
     * Größte Bild-Antwort, die Symcon unverändert ausliefert: die Summe der Ausgabe einer Anfrage darf
     * ScriptOutputBufferLimit (ab Werk 1 MiB) nicht überschreiten, sonst ersetzt Symcon die Antwort
     * durch einen Fehlertext (bei HTTP 200). 1 KiB Reserve für unerwartete Ausgaben.
     */
    private function GetHookBodyLimit(): int
    {
        $limit = 1048576;
        try {
            $option = IPS_GetOption('ScriptOutputBufferLimit');
            if (is_numeric($option) && (int)$option > 0) {
                $limit = (int)$option;
            }
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
        }
        return max(0, $limit - 1024);
    }

    /** Meldet ein Bild über der Ausgabegrenze einmal je Medium (bis zum nächsten Kernelstart), nicht bei jedem Abruf. */
    private function ReportOversizeImage(int $mediaId, int $size, int $limit): void
    {
        $reported = json_decode($this->GetBuffer('OversizeImages'), true);
        $reported = is_array($reported) ? $reported : [];
        if (in_array($mediaId, $reported, true)) {
            return;
        }
        $reported[] = $mediaId;
        $this->SetBuffer('OversizeImages', json_encode($reported));
        $this->LogMessage(sprintf($this->Translate('Image #%d is too large for the tile (%d bytes, limit %d bytes) and is shown as a placeholder. Use a smaller image or raise ScriptOutputBufferLimit.'),
            $mediaId, $size, $limit), KL_WARNING);
    }

    /**
     * Inhaltsversion eines Mediums für seine Bild-URL: neuer Inhalt ergibt eine neue URL, die offene Kachel
     * lädt das Bild neu (MediaCRC, sonst MediaUpdated).
     */
    private function GetMediaVersion(int $mediaId): string
    {
        try {
            $media = IPS_GetMedia($mediaId);
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
            return '0';
        }
        $crc = (string)($media['MediaCRC'] ?? '');
        return $crc !== '' ? $crc : (string)(int)($media['MediaUpdated'] ?? 0);
    }

    private function BuildImageHookUrl(int $mediaId): string
    {
        $base = '/hook/udtimages/' . $this->InstanceID;
        $token = $this->ReadAttributeString('HookToken');
        if ($mediaId > 0 && !IPS_MediaExists($mediaId)) {
            $mediaId = 0; // gelöschtes Medium: IPS_GetMedia würde eine Warnung in die Kachel schreiben
        }
        if ($mediaId > 0) {
            $q = 'mid=' . (int)$mediaId . '&v=' . rawurlencode($this->GetMediaVersion($mediaId));
        } else {
            // feste Adresse (Version = Dateistand), damit gleiche Zeilen gleich bleiben
            $q = 'placeholder=1&v=' . (int)@filemtime(__DIR__ . '/../../imgs/transparent.webp');
        }
        if ($token !== '') {
            $q .= '&token=' . rawurlencode($token);
        }
        if ($mediaId > 0 && $this->IsPreview() && $this->editorMediaKey !== '') {
            $q .= '&ek=' . $this->editorMediaKey; // Bilder des Entwurfs (EditorAccessTrait::GrantEditorMedia)
        }
        return $base . '?' . $q;
    }

    private function BuildAssetHookUrl(string $name): string
    {
        $safe = preg_replace('/[^a-z0-9_\-]/i', '', $name);
        $token = $this->ReadAttributeString('HookToken');
        $base = '/hook/udtimages/' . $this->InstanceID;
        $q = 'asset=' . $safe;
        $file = $this->GetAssetFile((string)$safe);
        if ($file !== '') {
            // Version = Dateistand: ein Modul-Update ergibt eine neue Adresse, der Browser darf lange cachen
            $q .= '&v=' . (int)@filemtime($file);
        }
        if ($token !== '') {
            $q .= '&token=' . rawurlencode($token);
        }
        return $base . '?' . $q;
    }

    /** Datei eines mitgelieferten Assets: Standardhintergrund im Bibliotheksordner, sonst assets/ (mit alten Namen). */
    private function GetAssetFile(string $name): string
    {
        $name = (string)preg_replace('/[^a-z0-9_\-]/i', '', $name);
        if ($name === 'kachelhintergrund1') {
            $file = __DIR__ . '/../../imgs/kachelhintergrund1.png';
            return is_file($file) ? $file : '';
        }
        $names = [$name];
        if ($name === 'dryer_on') {
            $names[] = 'trockner_an';
        } elseif ($name === 'dryer_off') {
            $names[] = 'trockner_aus';
        }
        foreach ($names as $candidate) {
            foreach (['webp', 'png', 'jpg', 'jpeg', 'gif'] as $ext) {
                $file = __DIR__ . '/../assets/' . $candidate . '.' . $ext;
                if ($candidate !== '' && is_file($file)) {
                    return $file;
                }
            }
        }
        return '';
    }

    /** Kopfzeile der Hook-Antwort; eigene Methode, damit der Prüfstand die Kopfzeilen sieht. */
    protected function SendHookHeader(string $header): void
    {
        header($header);
    }

    // Symcon ruft Hooks über „class HookInstance extends <Modulklasse>“ auf; bei IPSModuleStrict mit „: void“
    // (bei IPSModule ohne Rückgabetyp, siehe N20): der Rückgabetyp folgt der Basisklasse.
    protected function ProcessHookData(): void
    {
        if ($this->IsEditorRequest()) {
            $this->ProcessEditorRequest();
            return;
        }
        // Pfad relativ zum Modulordner (diese Datei liegt in libs/)
        $placeholder = __DIR__ . '/../../imgs/transparent.webp';
        $instT = $this->ReadAttributeString('HookToken');
        $token = isset($_GET['token']) ? (string)$_GET['token'] : '';
        if (!is_string($token) || $token === '' || $instT === '' || !hash_equals($instT, $token)) {
            http_response_code(403);
            return;
        }
        $mid = isset($_GET['mid']) ? (int)$_GET['mid'] : 0;
        $editorKey = is_string($_GET['ek'] ?? null) ? $_GET['ek'] : '';
        if ($mid > 0 && !in_array($mid, $this->GetConfiguredMediaIds(), true) && !$this->EditorMediaAllowed($mid, $editorKey)) {
            http_response_code(404);
            $this->SendDebug(__FUNCTION__, 'Medium ' . $mid . ' ist in dieser Kachel nicht konfiguriert', 0);
            return;
        }
        if (function_exists('ob_get_level')) {
            while (ob_get_level() > 0) { ob_end_clean(); }
        }
        $this->SendHookHeader('X-Accel-Buffering: no');
        if (function_exists('ignore_user_abort')) { ignore_user_abort(true); }
        if (function_exists('set_time_limit')) {
            try {
                set_time_limit(0);
            } catch (\Throwable $e) {
                $this->LogCaughtThrowable(__FUNCTION__ . ':set_time_limit', $e);
            }
        }
        $MAX_SIZE = $this->GetHookBodyLimit();
        $detectMime = function(string $bin) {
            return Helpers::detectMimeFromBinary($bin);
        };
        $sendNotModified = function(string $etag = '', int $lastMod = 0) {
            $ifNoneMatch = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim($_SERVER['HTTP_IF_NONE_MATCH']) : '';
            $ifModifiedSince = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) : 0;
            if ($etag !== '' && $ifNoneMatch === $etag) {
                $this->SendHookHeader('ETag: ' . $etag);
                http_response_code(304);
                exit;
            }
            if ($lastMod > 0 && $ifModifiedSince && $ifModifiedSince >= $lastMod) {
                $this->SendHookHeader('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastMod) . ' GMT');
                http_response_code(304);
                exit;
            }
        };
        // Lange cachen nur, wenn die Adresse die aktuelle Version trägt; sonst jedes Mal nachfragen (ETag/304).
        $version = isset($_GET['v']) ? (string)$_GET['v'] : '';
        $revalidate = 'public, max-age=0, must-revalidate';
        $streamFile = function(string $file, string $mime, string $cache) use ($MAX_SIZE, $sendNotModified, $placeholder, $detectMime, $revalidate) {
            if (!is_file($file) || !is_readable($file)) {
                http_response_code(404);
                $this->LogMessage('UDTImagesHook: File not found or unreadable: ' . $file, KL_ERROR);
                exit;
            }
            $size = filesize($file);
            if ($size === false) {
                http_response_code(500);
                $this->LogMessage('UDTImagesHook: filesize failed: ' . $file, KL_ERROR);
                exit;
            }
            if ($size > $MAX_SIZE) {
                if ($file === $placeholder || !is_file($placeholder)) {
                    http_response_code(413);
                    $this->LogMessage('UDTImagesHook: File too large: ' . $size, KL_ERROR);
                    exit;
                }
                // über der Ausgabegrenze: Platzhalter statt einer von Symcon ersetzten Antwort
                $file = $placeholder;
                $size = (int)filesize($placeholder);
                $mime = $detectMime((string)file_get_contents($placeholder, false, null, 0, 12));
                $cache = $revalidate;
            }
            $mtime = filemtime($file) ?: time();
            $etag = 'W/"' . dechex($size) . '-' . dechex($mtime) . '"';
            $this->SendHookHeader('Cache-Control: ' . $cache);
            $this->SendHookHeader('ETag: ' . $etag);
            $this->SendHookHeader('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
            $sendNotModified($etag, $mtime);
            $this->SendHookHeader('Content-Type: ' . $mime);
            $this->SendHookHeader('Content-Length: ' . $size);
            $fh = fopen($file, 'rb');
            if ($fh === false) {
                http_response_code(500);
                $this->LogMessage('UDTImagesHook: fopen failed: ' . $file, KL_ERROR);
                exit;
            }
            $chunk = 65536;
            while (!feof($fh)) {
                $buf = fread($fh, $chunk);
                if ($buf === false) { break; }
                echo $buf;
                flush();
            }
            fclose($fh);
            exit;
        };
        if ($mid > 0 && IPS_MediaExists($mid)) {
            // Medien können privat sein (Kamera, Fotos): lange nur im Browser, nie in geteilten Caches
            $current = $version !== '' && $version === $this->GetMediaVersion($mid);
            $m = IPS_GetMedia($mid);
            if ($m['MediaType'] === MEDIATYPE_IMAGE) {
                // Inhalt nur über IPS_GetMediaContent, nie direkt aus der Mediendatei (Store-Regel: keine Dateizugriffe)
                $b64 = IPS_GetMediaContent($mid);
                if (!is_string($b64) || $b64 === '') {
                    http_response_code(404);
                    $this->LogMessage('UDTImagesHook: Empty media content mid=' . $mid, KL_ERROR);
                    return;
                }
                $prefixSample = base64_decode(substr($b64, 0, 24), true);
                $mime = $detectMime($prefixSample ?: '');
                $len = strlen($b64);
                $padding = 0;
                if ($len >= 2 && substr($b64, -2) === '==') { $padding = 2; }
                elseif ($len >= 1 && substr($b64, -1) === '=') { $padding = 1; }
                $decodedLen = (int)floor($len / 4) * 3 - $padding;
                if ($decodedLen > $MAX_SIZE) {
                    $this->ReportOversizeImage($mid, $decodedLen, $MAX_SIZE);
                    $streamFile($placeholder, 'image/webp', $revalidate);
                }
                $this->SendHookHeader('Cache-Control: ' . ($current ? 'private, max-age=31536000, immutable' : 'no-store'));
                if ($current) {
                    $etag = '"' . $version . '"';
                    $this->SendHookHeader('ETag: ' . $etag);
                    $sendNotModified($etag);
                }
                $this->SendHookHeader('Content-Type: ' . $mime);
                $this->SendHookHeader('Content-Length: ' . max(0, $decodedLen));
                $out = fopen('php://output', 'wb');
                if ($out === false) {
                    http_response_code(500);
                    $this->LogMessage('UDTImagesHook: open php://output failed', KL_ERROR);
                    return;
                }
                $filter = stream_filter_append($out, 'convert.base64-decode', STREAM_FILTER_WRITE);
                $buffer = '';
                $chunkSize = 65536;
                for ($i = 0; $i < $len; $i += $chunkSize) {
                    $chunk = substr($b64, $i, $chunkSize);
                    $buffer .= $chunk;
                    $toWrite = strlen($buffer) - (strlen($buffer) % 4);
                    if ($toWrite > 0) {
                        fwrite($out, substr($buffer, 0, $toWrite));
                        $buffer = substr($buffer, $toWrite);
                        flush();
                    }
                }
                if ($buffer !== '') {
                    fwrite($out, $buffer);
                }
                if (is_resource($filter)) { stream_filter_remove($filter); }
                fclose($out);
                return;
            }
        }
        $asset = isset($_GET['asset']) ? (string)preg_replace('/[^a-z0-9_\-]/i', '', (string)$_GET['asset']) : '';
        $assetFile = $asset !== '' ? $this->GetAssetFile($asset) : '';
        if ($assetFile !== '') {
            $fh = fopen($assetFile, 'rb');
            $hdr = $fh !== false ? (string)fread($fh, 12) : '';
            if ($fh !== false) { fclose($fh); }
            $streamFile($assetFile, $assetFile === __DIR__ . '/../../imgs/kachelhintergrund1.png' ? 'image/png' : $detectMime($hdr),
                $version !== '' && $version === (string)(int)@filemtime($assetFile) ? 'public, max-age=31536000, immutable' : $revalidate);
        }
        if (isset($_GET['placeholder']) && is_file($placeholder)) {
            $fh = fopen($placeholder, 'rb');
            if ($fh !== false) { $hdr = fread($fh, 12); fclose($fh); }
            $mime = $detectMime(isset($hdr) ? $hdr : '');
            $streamFile($placeholder, $mime, $version === (string)(int)@filemtime($placeholder) ? 'public, max-age=31536000, immutable' : $revalidate);
        }
        http_response_code(404);
        $this->LogMessage('UDTImagesHook: Not found', KL_ERROR);
    }
}
