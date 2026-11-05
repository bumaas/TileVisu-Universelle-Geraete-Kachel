<?php

declare(strict_types=1);

namespace UDT;

/**
 * Visueller Editor über den nativen Hook /hook/udteditor/<InstanceID> (RegisterHook in Create).
 *
 * Die Seite und ihre Teile enthalten keine Daten und sind ohne Anmeldung abrufbar. Alle Daten laufen über
 * POST ?api=… mit dem Zugangscode im Kopf X-UDT-Editor (EditorAccessTrait).
 */
trait EditorHookTrait
{
    private static array $editorAssets = [
        'editor.css' => 'text/css; charset=utf-8',
        'api.js' => 'text/javascript; charset=utf-8',
        'state.js' => 'text/javascript; charset=utf-8',
        'preview.js' => 'text/javascript; charset=utf-8',
        'bridge.js' => 'text/javascript; charset=utf-8', // läuft in der Vorschau-Kachel, eingesetzt von preview.js
        'picker.js' => 'text/javascript; charset=utf-8',
        'iconpicker.js' => 'text/javascript; charset=utf-8',
        'iconterms.js' => 'text/javascript; charset=utf-8', // lädt iconpicker.js erst bei Bedarf
        'fields.js' => 'text/javascript; charset=utf-8',
        'rows.js' => 'text/javascript; charset=utf-8',
        'inspector.js' => 'text/javascript; charset=utf-8',
        'panels.js' => 'text/javascript; charset=utf-8',
        'templates.js' => 'text/javascript; charset=utf-8',
        'app.js' => 'text/javascript; charset=utf-8',
    ];

    private function IsEditorRequest(): bool
    {
        $path = (string)parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
        return str_starts_with($path, '/hook/udteditor/');
    }

    private function ProcessEditorRequest(): void
    {
        $method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ($method === 'GET') {
            $kind = self::EditorText($_GET['k'] ?? '');
            if ($kind === '') {
                $this->ServeEditorPage();
            } elseif ($kind === 'asset') {
                $this->ServeEditorAsset(self::EditorText($_GET['f'] ?? ''));
            } else {
                $this->SendEditorText(404, 'text/plain; charset=utf-8', 'Not found');
            }
            return;
        }
        if ($method !== 'POST') {
            $this->SendEditorText(405, 'text/plain; charset=utf-8', 'Method not allowed');
            return;
        }
        // Nur von der eigenen Seite: fremde Seiten können den Kopf X-UDT-Editor nicht ohne CORS senden,
        // Sec-Fetch-Site schließt zusätzlich Anfragen aus fremden Seiten aus
        $site = (string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '');
        if ($site !== '' && $site !== 'same-origin') {
            $this->SendEditorJson(403, ['error' => 'origin']);
            return;
        }
        $code = $this->EditorAuthorized();
        if ($code === null) {
            return;
        }
        $raw = (string)file_get_contents('php://input', false, null, 0, 2 * 1024 * 1024 + 1);
        $body = strlen($raw) > 2 * 1024 * 1024 ? null : json_decode($raw === '' ? '{}' : $raw, true);
        if (!is_array($body)) {
            $this->SendEditorJson(400, ['error' => 'body']);
            return;
        }
        try {
            $api = self::EditorText($_GET['api'] ?? '');
            [$status, $answer] = match ($api) {
                'load' => [200, $this->EditorLoad() + ['code' => $this->RotateEditorCode($code)]],
                'tile' => [200, ['html' => (string)IPS_GetVisualizationTile($this->InstanceID)]],
                'preview' => $this->EditorPreview($body),
                'save' => $this->EditorSave($body),
                'associations' => [200, ['items' => $this->BuildAssociationList((int)($body['status'] ?? 0))]],
                'tree' => [200, $this->EditorChildren((int)($body['parent'] ?? 0))],
                'search' => [200, $this->EditorSearch(self::EditorText($body['q'] ?? ''), self::EditorText($body['kind'] ?? ''))],
                'objects' => [200, ['objects' => $this->EditorObjectsByIds(is_array($body['ids'] ?? null) ? $body['ids'] : [])]],
                default => [404, ['error' => 'api']],
            };
        } catch (\Throwable $e) {
            $this->LogCaughtThrowable(__FUNCTION__, $e);
            [$status, $answer] = [500, ['error' => 'internal']];
        }
        $this->SendEditorJson($status, $answer);
    }

    /** Gespeicherte Konfiguration in Editor-Form (Listen als Arrays) und die Meldungen zu ungültigen Werten. */
    private function EditorCurrentConfig(): array
    {
        $raw = [];
        foreach (EditorSchema::PropertyNames() as $name) {
            $raw[$name] = IPS_GetProperty($this->InstanceID, $name);
        }
        return EditorSchema::Normalize($raw, static fn(string $kind, int $id): bool => true);
    }

    /** Fingerabdruck eines Stands für die Konflikterkennung beim Speichern. */
    private function EditorBase(array $config): string
    {
        return md5((string)json_encode($config));
    }

    /** Text aus Anfrage oder Körper; Arrays (?k[]=1) und Zahlen werden zu ''. */
    private static function EditorText(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }

    /**
     * Objekt-Prüfung für eingehende Konfigurationen: passende Art, oder dieselbe ID steht schon gespeichert
     * im selben Feldtyp (auch gelöschte Objekte bleiben so speicherbar).
     */
    private function EditorRefCheck(array $current): \Closure
    {
        $known = EditorSchema::References($current);
        return static function (string $kind, int $id) use ($known): bool {
            if (in_array($id, $known[$kind] ?? [], true)) {
                return true;
            }
            return match ($kind) {
                'variable' => IPS_VariableExists($id),
                'script' => IPS_ScriptExists($id),
                'object' => IPS_ObjectExists($id),
                'image' => IPS_MediaExists($id) && IPS_GetMedia($id)['MediaType'] === 1,
                default => false,
            };
        };
    }

    private function EditorLoad(): array
    {
        [$config, $warnings] = $this->EditorCurrentConfig();
        return [
            'config' => $config,
            'base' => $this->EditorBase($config),
            'warnings' => $warnings,
            'instance' => ['id' => $this->InstanceID, 'name' => IPS_GetName($this->InstanceID)],
            'objects' => $this->EditorObjectsOf($config),
            'matrix' => self::DISPLAY_TYPE_FIELD_VISIBILITY,
            'rowDefaults' => EditorSchema::ROW_DEFAULTS,
            'openObject' => (float)IPS_GetKernelVersion() > 8.1,
            'templates' => $this->EditorTemplates(),
        ];
    }

    private function EditorObjectsByIds(array $ids): array
    {
        $objects = [];
        foreach (array_slice(array_unique(array_map('intval', $ids)), 0, 200) as $id) {
            $objects[(string)$id] = $this->EditorObjectInfo($id);
        }
        return $objects;
    }

    /**
     * Vorschau: der Kachelstand mit dem Entwurf und den simulierten Werten. Ändert nichts an Properties,
     * am Puffer der offenen Kachel oder an Geräten. Die Bilder des Entwurfs gibt der Bild-Hook eine Stunde
     * frei, aber nur mit dem Schlüssel aus den Vorschau-URLs.
     */
    private function EditorPreview(array $body): array
    {
        [$current] = $this->EditorCurrentConfig();
        [$draft, $errors] = EditorSchema::Normalize(is_array($body['config'] ?? null) ? $body['config'] : [], $this->EditorRefCheck($current));
        $this->previewSettings = $draft + $current;
        try {
            $this->previewValues = $this->EditorSimulatedValues(is_array($body['simulate'] ?? null) ? $body['simulate'] : []);
            $this->GrantEditorMedia($this->GetConfiguredMediaIds());
            $payload = $this->BuildFullPayload();
            $payload['assets'] = $this->GenerateAssets();
        } finally {
            // der Entwurf gilt nur für diesen Aufbau
            $this->previewSettings = null;
            $this->previewValues = [];
            $this->editorMediaKey = '';
        }
        return [200, ['payload' => $payload, 'errors' => $errors]];
    }

    /** Simulierte Werte nur für Variablen des Entwurfs, im Typ der Variable. */
    private function EditorSimulatedValues(array $simulate): array
    {
        $allowed = [$this->SettingInteger('Status')];
        foreach ($this->ReadVariablesList() as $row) {
            $allowed[] = (int)($row['Variable'] ?? 0);
            $allowed[] = (int)($row['SecondVariable'] ?? 0);
        }
        $values = [];
        foreach (array_slice($simulate, 0, 100, true) as $id => $value) {
            $id = (int)$id;
            if ($id <= 0 || !in_array($id, $allowed, true) || !IPS_VariableExists($id) || !is_scalar($value)) {
                continue;
            }
            $values[$id] = match ((int)IPS_GetVariable($id)['VariableType']) {
                0 => (bool)$value,
                1 => (int)$value,
                2 => (float)$value,
                default => mb_substr((string)$value, 0, 200),
            };
        }
        return $values;
    }

    /**
     * Speichern auf ausdrücklichen Klick des Nutzers im Editor. Store-Regel 13 (Properties gehören dem
     * Nutzer, kein IPS_SetProperty/IPS_ApplyChanges): Der Editor ist ein Bedienweg des Nutzers wie das
     * Formular; geschrieben wird nur, was er dort geändert und mit „Speichern“ bestätigt hat (Regel 7/11).
     */
    private function EditorSave(array $body): array
    {
        [$current] = $this->EditorCurrentConfig();
        $base = $this->EditorBase($current);
        if (($body['force'] ?? false) !== true && (string)($body['base'] ?? '') !== $base) {
            return [409, ['error' => 'conflict', 'base' => $base]];
        }
        [$draft, $errors] = EditorSchema::Normalize(is_array($body['config'] ?? null) ? $body['config'] : [], $this->EditorRefCheck($current));
        if ($errors !== []) {
            return [422, ['error' => 'invalid', 'errors' => $errors]];
        }
        $changed = [];
        foreach ($draft as $name => $value) {
            if (json_encode($value) !== json_encode($current[$name] ?? null)) {
                $changed[] = $name;
                IPS_SetProperty($this->InstanceID, $name, EditorSchema::IsList($name) ? (string)json_encode($value) : $value);
            }
        }
        if ($changed !== []) {
            IPS_ApplyChanges($this->InstanceID);
        }
        $this->SetBuffer('EditorMedia', ''); // gespeicherte Bilder liefert der Hook ohnehin, verworfene nicht mehr
        [$saved] = $this->EditorCurrentConfig();
        return [200, ['ok' => true, 'changed' => $changed, 'config' => $saved, 'base' => $this->EditorBase($saved)]];
    }

    /** Vorlagen aus editor/templates (Name => Beschriftung in der Sprache des Systems). */
    private function EditorTemplates(): array
    {
        $templates = [];
        foreach (glob(dirname(__DIR__) . '/editor/templates/*.json') ?: [] as $file) {
            $data = json_decode((string)file_get_contents($file), true);
            if (!is_array($data) || !is_array($data['config'] ?? null)) {
                continue;
            }
            // Beschriftungen in der Sprache des Systems (die Vorlage nennt sie englisch)
            $config = $data['config'];
            foreach (['VariablesList' => 'Label', 'GroupNamesList' => 'GroupName'] as $list => $field) {
                foreach ($config[$list] ?? [] as $i => $entry) {
                    if (is_string($entry[$field] ?? null) && $entry[$field] !== '') {
                        $config[$list][$i][$field] = $this->Translate($entry[$field]);
                    }
                }
            }
            $templates[] = ['id' => basename($file, '.json'), 'caption' => $this->Translate((string)($data['caption'] ?? basename($file, '.json'))),
                'icon' => (string)($data['icon'] ?? 'shapes'), 'config' => $config];
        }
        return $templates;
    }

    /** Version aller Editor-Teile (jüngster Dateistand): ein Modul-Update ergibt neue Adressen. */
    private function EditorAssetVersion(): int
    {
        $version = 0;
        foreach (array_keys(self::$editorAssets) as $asset) {
            $version = max($version, (int)@filemtime(dirname(__DIR__) . '/editor/' . $asset));
        }
        return $version;
    }

    private function ServeEditorPage(): void
    {
        $dir = dirname(__DIR__) . '/editor';
        $page = (string)@file_get_contents($dir . '/editor.html');
        $texts = json_decode((string)@file_get_contents($dir . '/texts.json'), true);
        $translated = [];
        foreach (is_array($texts) ? $texts : [] as $text) {
            $translated[$text] = $this->Translate($text);
        }
        $page = str_replace(['__UDT_EDITOR_VERSION__', '/*__UDT_EDITOR_TEXTS__*/{}'],
            [(string)$this->EditorAssetVersion(), (string)json_encode($translated, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)], $page);
        $this->SendEditorText(200, 'text/html; charset=utf-8', $page, 'no-store');
    }

    private function ServeEditorAsset(string $name): void
    {
        if (!isset(self::$editorAssets[$name])) {
            $this->SendEditorText(404, 'text/plain; charset=utf-8', 'Not found');
            return;
        }
        $file = dirname(__DIR__) . '/editor/' . $name;
        $current = self::EditorText($_GET['v'] ?? '') === (string)$this->EditorAssetVersion();
        $this->SendEditorText(200, self::$editorAssets[$name], (string)@file_get_contents($file),
            $current ? 'public, max-age=31536000, immutable' : 'no-cache');
    }

    private function SendEditorJson(int $status, array $data): void
    {
        $this->SendEditorText($status, 'application/json; charset=utf-8',
            (string)json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }

    /** Antwort mit Sicherheitsköpfen; größere Antworten gepackt, wenn der Browser es kann (Ausgabegrenze). */
    private function SendEditorText(int $status, string $type, string $body, string $cache = 'no-store'): void
    {
        http_response_code($status);
        $this->SendHookHeader('Content-Type: ' . $type);
        $this->SendHookHeader('Cache-Control: ' . $cache);
        $this->SendHookHeader('X-Content-Type-Options: nosniff');
        $this->SendHookHeader('Referrer-Policy: no-referrer');
        $this->SendHookHeader("Content-Security-Policy: frame-ancestors 'self'");
        if (strlen($body) > 32768 && str_contains((string)($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''), 'gzip')) {
            $body = (string)gzencode($body, 6);
            $this->SendHookHeader('Content-Encoding: gzip');
            $this->SendHookHeader('Vary: Accept-Encoding');
        }
        $this->SendHookHeader('Content-Length: ' . strlen($body));
        echo $body;
    }
}
