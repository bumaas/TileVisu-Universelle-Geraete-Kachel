# Universelle Geräte-Kachel (Bibliothek „Universal Device Tile“)

Symcon-HTML-Kachel, die ein Gerät aus frei konfigurierbaren Zeilen zeigt und bedient: Text, Balken, Regler, Buttons, Bilder, Gruppen, dazu ein Statusteil mit Bild und Farbe. Öffentliches Repo `da8ter/TileVisu-Universelle-Geraete-Kachel`.

Projektwissen: **`.claude/docs/README.md`**. Betriebsdaten und der lokale Prüfstand: `CLAUDE.local.md` (nicht eingecheckt).

## Aufbau

- **`GeraeteStatus/`** (Präfix `UDST`, Klasse `UniversalDeviceTile`, `IPSModuleStrict`, ab Symcon 8.1). `module.php` ist schlank; die Logik liegt in Traits unter `libs/` (Namensraum `UDT`): `PayloadTrait`/`PayloadVariablesTrait` (Kachelstand), `UpdateTrait` (Zeilen-Protokoll), `ActionTrait` (Bedienung), `SelfTestTrait` (`UDST_RunSelfTest` für Skripte und KI, `UDST_GetSelfTestReport` für den Knopf im Formular, `UDST_GetConfigurationHelp`), `ImageHookTrait` (Bilder), `PresentationTrait`, `IconTrait`, `FormTrait`, `TileHtmlTrait`.
- **`module.html` ist nur das Gerüst.** CSS und JS liegen in `html/css/` und `html/js/`; `TileHtmlTrait` setzt sie beim Ausliefern an den Zeilen `/*__UDT_PART <datei>__*/` ein. Neue Teile dort eintragen.
- **Zeilen-Protokoll:** Jede Zeile hat einen Schlüssel (Index in der Variablenliste). Updates schicken `{"rows": [...]}` mit den betroffenen Zeilen vollständig; Bedienung kommt als `requestAction('row_<key>', Wunschwert)` und wirkt nur auf das Ziel dieser Zeile.
- **Instanzstatus:** 201, solange ein verknüpftes Objekt fehlt oder unbrauchbar ist (`UpdateLinkStatus` in `SelfTestTrait`, ausgelöst in `ApplyChanges` und über `OM_UNREGISTER`, `SM_BROKEN`, `MM_AVAILABLE`). Symcon setzt den Status nicht selbst zurück, deshalb im Gutfall ausdrücklich `IS_ACTIVE`. Die Kachel-Visu zeichnet die Kachel in jedem Status gleich.
- **Bilder** über den nativen Hook `/hook/udtimages/<ID>` (in `Create()`), nur für Medien dieser Kachel, mit Platzhalter über der Ausgabegrenze.
- **Editor** über den nativen Hook `/hook/udteditor/<ID>` (`EditorHookTrait`, Zugang in `EditorAccessTrait`, Seite in `editor/`, Prüfregeln in `EditorSchema`). Seite und Teile ohne Daten, Daten nur per POST mit Code im Kopf `X-UDT-Editor` (Code nur im Fragment, beim ersten Laden getauscht, im Puffer; Entwurfsbilder nur mit dem Schlüssel `ek` der Vorschau-URLs). Die Vorschau baut den Kachelstand über `SettingsAccessTrait` aus dem Entwurf (`previewSettings`/`previewValues`), ohne Property, `SentRows` oder Aktion. Speichern schreibt per `IPS_SetProperty`/`IPS_ApplyChanges` nur auf Klick (bewusste Abweichung von Store-Regel 13, bei der Einreichung erwähnen; gemessen 04.11.2026: aus dem Hook direkt möglich). Neue Editor-Texte in `editor/texts.json` und `locale.json`, neue Teile in `$editorAssets` und `editor.html` (oder nachgeladen: `iconterms.js` von der Icon-Auswahl, `bridge.js` in die Vorschau-Kachel für Klick, Doppelklick, „+“ und Ziehen). Die Icon-Auswahl (`iconpicker.js`) liest Namen und Pfade aus Symcons `/icons.js`; die deutschen Suchbegriffe (`iconterms.js`) sind aus der Icon-Datenbank der Konsole erzeugt (`tests/iconterms.py`, mit eigener Ergänzungsliste) – nicht von Hand bearbeiten, bei neuen Symcon-Icons neu erzeugen.
- `README.md` (Wurzel) und `GeraeteStatus/README.md` sind zwei Fassungen der Nutzerdoku mit Changelog.

## Prüfen

```bash
php -l GeraeteStatus/module.php GeraeteStatus/libs/*.php
tests/run.sh [--streng]     # nur mit lokalem Prüfstand, siehe unten
```

Der Prüfstand (`tests/`) ist **nicht** Teil dieses Repos: `.gitignore` schließt `tests/` aus, er ist ein eigenes, unveröffentlichtes Git. Wo er vorhanden ist: `tests/run.sh` prüft Syntax, JSON, Modul auf SymconStubs und das Frontend in Headless Chrome (~30 s); `--streng` endet rot, solange ein Review-Befund offen ist. Golden Master nur absichtlich neu schreiben.

## Regeln

- **Commits:** nach jeder abgeschlossenen Änderung, ein Thema je Commit, deutsche Botschaft, **ohne** Co-Authored-By-Zeile. Prüfstand vorher.
- **Nie** `git checkout`/`git restore` auf Dateien: die Arbeitskopie kann nicht committete Arbeit enthalten.
- **Push nur auf Zuruf.** Arbeitszweig ist `symcon-beta` (seit 04.11.2026 auch lokal, `refactor/modularisierung` gelöscht), Push mit `git push origin symcon-beta`; `main` und `release/*` nur auf ausdrücklichen Zuruf. Vorher `git log HEAD..origin/<Zweig>` prüfen, nie force-pushen.
- **Release:** `version`, `build` und `date` in `library.json` hochsetzen, Changelog in beiden READMEs.
- **Öffentliches Repo:** keine IP-Adressen, Ports, Instanz-IDs, Token, Pfade unter `/Users/` – auch nicht in Snapshots oder Doku.
- **Keine Befehle an echte Geräte** aus Proben ohne Zusage des Nutzers.
- **Bedienung durch KI-Assistenten:** Neue öffentliche Funktionen und Listenfelder gehören in die unsichtbaren Labels am Ende von `form.json` (`UDST_GetConfigurationHelp` liefert sie als Text), neue Prüfungen in `UDST_RunSelfTest`.
- **Symcon-Hausregeln:** `declare(strict_types=1)`, typisierte Signaturen, kein Heavy Work vor `KR_READY`, Darstellungen statt Variablenprofilen für eigene Variablen, neue Nutzertexte sagen „Symcon“.

## Weiteres Wissen

- Symcon-Plattformwissen (Hooks und `HookInstance`-Fatal, Ausgabegrenze, Module Strict, Kacheln und Icons): https://github.com/da8ter/SymDo-Family-Organizer/tree/SymDo-Beta/.claude/docs/plattform, lokal `../List/.claude/docs/plattform/`.
- Muster für sparsame Kachel-Updates: https://github.com/da8ter/SymDo-Family-Organizer/blob/SymDo-Beta/.claude/docs/entscheidungen/kacheln-ressourcen.md
