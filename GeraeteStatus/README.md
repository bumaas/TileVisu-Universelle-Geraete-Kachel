
![Symcon](https://img.shields.io/badge/Symcon-Module-blue.svg)

# Universelle Geräte Kachel

![Kachelübersicht](https://github.com/da8ter/images/blob/main/kachelanleitung_ugk.png)

Das Modul **Universelle Geräte Kachel** stellt eine flexibel konfigurierbare Geräte-Kachel für die Kachel-Visualisierung von Symcon bereit. Eine Kachel kann Statusinformationen, frei wählbare Variablen, Fortschrittsbalken, Schieberegler, Schalter und Bilder in einem gemeinsamen Layout kombinieren.

## Inhaltsverzeichnis
1. [Funktion](#funktion)
2. [Voraussetzungen](#voraussetzungen)
3. [Installation](#installation)
4. [Konfiguration](#konfiguration)
5. [Editor](#editor)
6. [Visualisierung und Bedienung](#visualisierung-und-bedienung)
7. [PHP-Befehle](#php-befehle)
8. [Changelog](#changelog)

## Funktion
- **Statusbereich**: Anzeige einer zentralen Statusvariable inklusive optionalem Icon, Label, Wert sowie Standard- oder Default-Bild.
- **Universelle Variablenliste**: Darstellung mehrerer Variablen als Text, Fortschrittsbalken, Schieberegler, Schalter oder Bilder; Gruppierung mehrerer Variablen pro Zeile möglich.
- **Fortschrittsbalken**: Optionale zweite Variable als Zusatzzeile oder Marker (z. B. Soll-/Zielwerte), einstellbare Farben; deaktivierte Balken werden automatisch ausgegraut.
- **Schieberegler-Steuerung**: Profilbasierte Min-/Max-/Schrittwerte mit Drag-Steuerung, +/- Schaltern und automatischer Schreib-Verifikation.
- **Schalter & Aktionen**: Bool-, Integer- und String-Variablen, optionale Skript-Schalter sowie Schalter zum Öffnen von Objekten und Kategorien in der Kachelvisualisierung.
- **Variablelose Zeilen**: Bild- und Schalter-Zeilen können auch ohne direkte Variable über Medienobjekt, Skript oder Open Object konfiguriert werden.
- **Bild- und Icon-Unterstützung**: Eigene Medienobjekte, Symcon-Icons oder vorkonfigurierte Bilder können angezeigt werden.
- **Layout-Steuerung**: Globale Einstellungen für Abstände, Hintergrund, Status-Bildposition, Gruppennamen, Stretch-Modus für Button-Gruppen u. v. m.

## Voraussetzungen
- Symcon Version ≥ 8.1
- Kachelvisualisierung.
- Für benutzerdefinierte Icons/Bilder: entsprechende Medienobjekte in Symcon.

## Installation
1. Im Symcon `Module Control` folgende URL hinzufügen:
   ```
   https://github.com/da8ter/TileVisu-Universelle-Geraete-Kachel.git
   ```
   Oder über den Module Store: in der Suche Universelle Geräte Kachel eingeben und dann installieren.


2. Das Modul aktualisieren/laden.
3. In der Instanzen-Verwaltung eine neue Instanz vom Typ **Universelle Geräte Kachel** anlegen.

## Konfiguration

Die Konfiguration gliedert sich in mehrere Bereiche der Form:

- **Kachel-Konfiguration**
  - Hintergrundbild: Bild welches als Kachelhintergrund angezeigt wird.
  - Transparenz: Tranparenz vom Hintergrundbild. Werte zwischen 0 und 1 sind erlaubt.
  - Kachelhintergrundfarbe: Farbe des Kachelhintergrunds.
  - Bild-Breite: Breite des Status-Bildes in Pixeln.
  - Bildposition: Möglich sind oben, unten, links und rechts.
  - Ausrichtung: Ausrichtung des Stsusbildes im Bildbereich der Kachel. Möglich sind links, mitte und rechts.
  - Trenlinie: Blendet eine Trennlinie zwischen Status-Bild und dem Rest der Kachel ein.

- **Gerätestatus**
  - Statusvariable ausblenden: Die Variable wird nicht in der Kachel angezeigt. Sinnvoll wenn z.B. nur das Statusbild verwendet werden soll.
  - Status: Auswahl der Statusvariable.
  - Schriftgröße: Schriftgröße des Status.
  - Icon anzeigen: Icon an oder ausschalten.
  - Beschriftung anzeigen: Variablenname als Beschriftung anzeigen.
  - Variablen-Wert anzeigen: Zeigt den Wert im Frontend an.
  - Benutzerdefinierte Beschriftung: Überschreibt den Variablennamen.
  - Ausrichtung: Ausrichtung des Status. Möglich sind links, mitte und rechts.
  - Standard-Bild: Standard-Bild wird immer dann angezeigt wenn bei der Profilzuordnung kein anderes Bild oder Icon eingestellt ist.
  - Standard-Icon und seine Farbe: Font-Awesome-Icon, das an Stelle des Standard-Bilds erscheint, solange keins gesetzt ist (leer = kein Icon, Farbe transparent = Akzentfarbe).
  - Profilzuordnung: Konfigurtion der einzelnen Profilzuordnungen bzw. Darstellungs-Optionen. Folgende Konfigurationsmöglichkeiten gibt es:
    - Bildauswahl: Auswahl des Bildes.
    - Iconauswahl: Auswahl des Icons.
    - Iconfarbe: Auswahl der Iconfarbe.
    - Stausfarbe: Auswahl der Stausfarbe.
    - Fortschrittsbalken aktiv = an: Bei diesem Status werden Fortschrittsbalken angezeigt.
    - Fortschrittsbalken aktiv = aus: Bei diesem Status werden Fortschrittsbalken inaktiv und ausgegraut angezeigt. 

- **Globale Darstellungsoptionen**
  - Eckenradius Fortschrittsbalken und Schalter: Eckenradius der Fortschrittsbalken und Schalter.
  - Vertikaler Abstand zwischen Elementen: Vertikaler Abstand zwischen den Elementen.
    
    Fortschrittsbalken:
    - Höhe: Höhe der Fortschrittsbalken in Pixel
    - Hintergrundfarbe: Hintergrundfarbe der Fortschrittsbalken.
    - Hintergrundtransparenz: Transparenz des Fortschrittsbalken-Hintergrunds.
    Schalter:
    - Höhe: Höhe der Schalter in Pixel

- **Variablenliste**
  - Zentrale Liste der dargestellten Variablen (Drag & Drop für Reihenfolge).
  - Je Eintrag: Darstellungsart (Text, Fortschrittsbalken, Schieberegler, Schalter, Bild), Anzeigeoptionen, Gruppenzugehörigkeit, Farben, Skript-IDs, Objektziele zum Öffnen und Zweitvariablen für den Fortschrittsbalken.
  - Für Fortschrittsbalken kann eine zweite Variable als Zusatzinformation oder Marker genutzt werden.
  - Bei inaktivem Fortschrittsbalken (Status mit „Fortschrittsbalken aktiv = aus“) zeigt die Zeile je nach Einstellung „-“ (Vorgabe, für Geräte, die ihren Wert am Ende nicht zurücksetzen), den aktuellen Wert (etwa eine Ist-Temperatur) oder wird ausgeblendet.
  - Für Schieberegler stehen eigene Schieberegler-Farben (Schieberegler-Farbe 1/2) zur Verfügung.
  - Für Schalter lassen sich optionale Skript-IDs, Objektziele zum Öffnen in der Kachelvisualisierungund feste Schalterbreiten hinterlegen (auch ohne Variable).
  - Für Bilder stehen Medienobjekt, Breite und Radius zur Verfügung (auch ohne Variable).

- **Gruppenkonfiguration**
  - Definition der Gruppennamen, Icons und Optionen (Name über Gruppe, Trennlinie, Stretch-Modus).
  - Gruppennamen-Gröpße: Globale Schriftgröße für Gruppennamen.
  - Gruppenname anzeigen: zeigt den Gruppennamen im Frontend an.
  - Name über Gruppe: Wenn an, wird der Gruppenname über den Gruppenelementen angezeigt. Wenn aus, wird der Gruppenname links vor den Gruppenelementen angezeigt.
  - Linie unter Gruppe: Blendet eine Trennlinie zwischen Gruppen ein.
  - Schalter auf volle Breite: Schalter in einer Gruppe werden auf die volle verfügbare Breite gestreckt.


## Editor

Der Editor bearbeitet die Kachel in einer eigenen Webseite mit Live-Vorschau. Das Konfigurationsformular bleibt vollständig nutzbar; beide schreiben dieselben Einstellungen.

**Schritt für Schritt mit Bildern:** [Anleitung zum Editor](editor/README.md)

- **Öffnen:** In der Konfiguration der Instanz oben auf „Editor öffnen“ klicken. Ist Symcon Connect aktiv, öffnet „Editor über Connect öffnen“ denselben Editor über die Connect-Adresse.
- **Vorschau:** Links steht die echte Kachel mit dem Entwurf, wahlweise in den Größen 1×1 bis maximiert und im hellen oder dunklen Design. Der Greifer unten rechts zieht die Kachel auf jede andere Größe. Der Pfeil daneben passt die Höhe an den Inhalt an; nach einer Vorlage geschieht das von selbst. Die Werte laufen live mit. Ein Klick auf eine Zeile in der Vorschau wählt sie zur Bearbeitung aus, ein Doppelklick ändert ihre Beschriftung (oder auf einem Gruppennamen den Namen der Gruppe) direkt in der Kachel, und am Text gezogen wandert sie an eine andere Stelle oder in eine Gruppe. Eine ganze Gruppe zieht man an ihrem Namen, in ihrem leeren Bereich (neben und zwischen den Zeilen) oder mit gedrückter Umschalttaste an einer ihrer Zeilen. Beim Ziehen rückt das Gezogene live an seinen neuen Platz, auch nebeneinander in einer Gruppe, und die Gruppe, in der eine Zeile landet, ist umrandet; Escape bricht ab. Ein Klick auf einen Gruppennamen oder einen leeren Bereich der Gruppe wählt die Gruppe aus. Jede Gruppe hat im Editor eine Erkennungsfarbe: in der Liste rechts als Linie und Icon, in der Vorschau als gestrichelter Rahmen um die Gruppe (durchgehend, wenn sie gewählt ist). Jede Zeile hat in der Vorschau einen grauen gestrichelten Rahmen. Der Schalter „Rahmen anzeigen“ unter der Vorschau blendet diese Rahmen aus (der Browser merkt sich die Wahl); die Auswahl bleibt sichtbar. Ein Rechtsklick öffnet ein Kontextmenü: auf einer Zeile mit „Variable/Bild auswählen“, „Beschriftung ändern“, Anzeigetyp, Gruppe und „Anzeigen“ (Icon, Beschriftung, Wert) als Untermenüs, „Nach oben/unten“, „Darstellung kopieren/einfügen“ (Farben, Schrift, Anzeige auf eine andere Zeile übertragen), „Duplizieren“ und „Löschen“; auf einer Gruppe mit „Umbenennen“, „Icon ändern“, den Schaltern für Name, Name oben, Linie und volle Breite sowie „Gruppe duplizieren“ und „Gruppe auflösen“; auf dem Statusbild mit Icon, eigenem Bild oder Gerätebild für den gezeigten Status, der Bildposition und den Statuseinstellungen. Das Menü des Browsers erscheint im Editor nur noch in Eingabefeldern (Kopieren, Einfügen). Ein Doppelklick auf das Icon einer Gruppe öffnet die Icon-Auswahl, ein Doppelklick auf das Statusbild wählt ein Icon für den gerade gezeigten Status. Das Statusbild lässt sich in der Vorschau an den oberen, unteren, linken oder rechten Rand ziehen: beim Ziehen erscheinen auf den Kanten der Kachel kleine runde Felder mit Bild-Icon, abgelegt wird auf einem davon. Schalter und Regler schalten in der Vorschau nichts. Der Editor selbst folgt dem Erscheinungsbild des Systems oder wird über den Schalter oben rechts (Automatisch, Hell, Dunkel) fest hell oder dunkel; die Vorschau-Kachel behält dabei ihr eigenes Thema. Den rechten Bereich mit den Eigenschaften zieht man an seinem linken Rand breiter oder schmaler (Doppelklick: Standardbreite, der Browser merkt sich die Breite).
- **Zeilen:** Neue Zeilen gibt es je Anzeigetyp (Text, Fortschrittsbalken, Schieberegler, Schalter, Bild), entweder über „+ Zeile“ über der Liste oder über das „+“ unter der letzten Zeile in der Vorschau, das nach dem Anzeigetyp fragt. Am Griff gezogen, wandern Zeilen an eine andere Stelle oder in eine Gruppe hinein und wieder heraus; ganze Gruppen lassen sich genauso verschieben. Tasten (in der Liste und in der Vorschau): Pfeiltasten wählen die vorige oder nächste Zeile in der Reihenfolge der Kachel, Alt + Pfeiltasten verschieben sie, Entf löscht sie, Strg/Cmd + D dupliziert sie, Escape hebt die Auswahl auf; in Eingabefeldern bleiben die Tasten beim Feld. Umschalt-, Cmd- oder Strg-Klick (in der Liste und in der Vorschau) wählt mehrere Zeilen: Über der Liste setzt dann ein Feld für alle zugleich Gruppe (auch eine neue), Anzeigetyp, Anzeige von Icon, Beschriftung und Wert, Schriftgröße, Textfarbe, Ausrichtung und Linie, fügt eine kopierte Darstellung ein, dupliziert oder löscht sie (auch per Strg/Cmd + D und Entf). Ein Rechtsklick auf eine der gewählten Zeilen, in der Vorschau oder in der Liste, öffnet ein Menü für alle (Anzeigetyp, Gruppe samt „Neue Gruppe“, Anzeigen, Darstellung einfügen, Duplizieren, Löschen) und behält die Auswahl; auf einer einzelnen Zeile der Liste öffnet er dasselbe Menü wie in der Vorschau. Ein Klick auf eine Zeile öffnet ihre Eigenschaften an Stelle der Liste („← Alle Zeilen“ oder Escape führt zurück): der Anzeigetyp als Icon-Leiste, darunter aufklappbare Abschnitte (Quelle, Darstellung, Farben, Anordnung und was zum Typ gehört) mit nur den passenden Feldern, dazu ein Hinweis, wenn eine Variable fehlt oder keine Aktion hat. Leere Größenfelder bedeuten „Standard“, ⓘ erklärt ein Feld. Nach der Wahl einer Variable schlägt der Editor einen passenden Anzeigetyp vor, wenn der eingestellte nicht passt (Schalter oder Auswahl mit Aktion → Schalter, Regler-Darstellung → Schieberegler, Prozentwert ohne Aktion → Fortschrittsbalken); „Umstellen“ in der Meldung übernimmt ihn. „Aus Gerät …“ im Menü „+ Zeile“ (und am „+“ der Vorschau) legt für die Variablen einer Instanz auf einmal Zeilen an: Variablen ankreuzen (versteckte sind zunächst abgewählt), Anzeigetyp je Variable vorgeschlagen, auf Wunsch als eigene Gruppe mit dem Namen des Geräts. Die Objektauswahl zeigt oben die Nachbarn der zuletzt gewählten Variable (meist die übrigen Variablen desselben Geräts), mit „Höher“ eine Ebene darüber, darunter alle Objekte.
- **Gruppen:** Name, Icon (Font-Awesome-Name, z. B. `bolt`), „Name anzeigen“, „Name über der Gruppe“, „Linie unter der Gruppe“ und „Elemente auf volle Breite“ stehen direkt an der Gruppe.
- **Icons:** Ein Klick auf das Icon einer Gruppe oder einer Status-Zuordnung öffnet die Icon-Auswahl mit Suche (deutsch oder englisch, z. B. „Waschmaschine“, „Heizung“ oder `home`), den Symcon-eigenen Icons (z. B. Wärmepumpe, Fenster- und Markisenzustände), Vorschlägen und allen Font-Awesome-Icons, die Symcon mitbringt. Wer den Namen kennt, tippt ihn in die Suche; Enter übernimmt den ersten Treffer.
- **Status:** Statusvariable und Anzeigeoptionen, „Standard-Bild“ als Umschalter Bild | Icon | Kein Bild und die Zuordnungen als Liste (Bild/Icon, Name, Wert, Statusfarbe); ein Klick öffnet ihre Details mit Bild oder Icon, Farben und „Fortschrittsbalken aktiv“. „Aus der Darstellung neu einlesen“ übernimmt neue Werte der Statusvariable und behält die Einstellungen der vorhandenen.
- **Status simulieren:** In der Vorschau lässt sich jeder Status zeigen, für Balken und Regler auch ein Testwert. Das wirkt nur in der Vorschau, an Variablen und Geräten ändert sich nichts.
- **Vorlagen:** Waschmaschine, Wäschetrockner, Wärmepumpe, Heizung, Rollladen, Fenster, PV-Anlage, Batteriespeicher, Wallbox und E-Auto geben Zeilen, Gruppen und Aufteilung vor; danach werden die Variablen zugeordnet. Waschmaschine und Wäschetrockner nutzen die eingebauten Gerätebilder für Aus und An: Die Vorlage bringt zwei Zuordnungen mit (0 = Aus, 1 = An), und wird die Statusvariable gewählt, bekommen deren Werte die Bilder (gleicher Wert, sonst der nächstkleinere – wie die Kachel selbst auswählt). Die übrigen Vorlagen setzen ein passendes Standard-Icon in passender Farbe und nehmen dafür Bilder der Zuordnungen zurück (etwa aus einer zuvor gewählten Waschmaschinen-Vorlage). „Als Vorlage speichern …“ legt den Entwurf als eigene Vorlage ab (Name und Icon frei): ohne Variablen, Skripte, Medien und Statusvariable (mit dem Häkchen „mitspeichern“ auch mit ihnen – dann zeigt die Vorlage dieselben Objekte, passend nur in dieser Symcon-Installation), gesichert in allen Kacheln dieses Moduls (sie überdauern das Löschen einer Kachel) und im Vorlagen-Menü unter „Eigene Vorlagen“, wo der Mülleimer sie wieder löscht. Zeilen ohne Variable oder Bild und eine fehlende Statusvariable erscheinen in der Vorschau als gestrichelte Platzhalter mit „Auswählen“, das die passende Objektauswahl öffnet, und einem Mülleimer, der die Zeile entfernt (beim Status: den Statusbereich ausblendet). Hat die Kachel noch kein Bild, zeigt die Vorschau in der Bildspalte ein Foto-Icon: „Auswählen“ setzt das Standardbild, der Mülleimer („Ohne Bild“) blendet den Platzhalter aus. „Exportieren“ und „Importieren“ übertragen eine Konfiguration als JSON, etwa auf eine zweite Kachel. Objekt-IDs passen dabei nur zur selben Symcon-Installation.
- **Rückgängig:** Jede Änderung lässt sich mit den Pfeilen oben oder Strg/Cmd + Z zurücknehmen und mit Strg/Cmd + Umschalt + Z (oder Strg + Y) wiederholen, auch „Verwerfen“; das gilt auch, wenn die Vorschau den Fokus hat. Tippen in einem Feld zählt als ein Schritt. Nach dem Löschen einer Zeile bietet die Meldung unten „Rückgängig“ an.
- **Speichern:** Erst „Speichern“ (oder Strg/Cmd + S) schreibt in die Instanz, „Verwerfen“ kehrt zum gespeicherten Stand zurück. Wurde die Konfiguration inzwischen anderswo gespeichert, etwa im Formular, fragt der Editor nach. Ungültige Werte werden nicht gespeichert.
- **Formular und Editor:** Nach dem Speichern im Editor ein noch offenes Konfigurationsformular neu öffnen, bevor dort etwas übernommen wird. Sonst überschreibt das Formular den Stand des Editors.
- **Zugang:** Der Link enthält einen Zugangscode und ist ein Verwaltungszugang zu dieser Kachel; die Objektauswahl zeigt auch Namen und Werte anderer Objekte. Den Link deshalb nicht weitergeben. Er gilt eine Stunde ohne Nutzung, höchstens acht Stunden, und verfällt mit einem Neustart von Symcon. Danach den Editor einfach wieder über das Formular öffnen.


## Visualisierung und Bedienung

**Beispiele für kleine Kacheln**

![Universelle Geräte Kachel — Waschmaschine](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20waschmaschine.png)
![Universelle Geräte Kachel — Kaffeemaschine](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20kaffeemaschine.png)
![Universelle Geräte Kachel — Fenster](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20fenster.png)

**Beispiele für große Kacheln**

![Universelle Geräte Kachel — Wallbox](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20wallbox.png)
![Universelle Geräte Kachel — PV-Anlage](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20pv-anlage.png)
![Universelle Geräte Kachel — PV-Anlage im hellen Design](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20pv-anlage%20hell.png)
![Universelle Geräte Kachel — Klima](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20klima.png)

- Die Kachel wird in der Kachel-Visualisierung angezeigt.
- Schalter reagieren abhängig vom Modus:
  - Boolesche Schalter spiegeln den Variablenzustand und setzen beim Klick den angezeigten Gegenzustand (kein Umschalten auf dem Server: ein Doppelklick schaltet nicht zurück).
  - Integer-/String-Schalter werden aus Assoziationen und Darstellungen als Mehrfach-Schaltergruppe dargestellt.
  - Skript-Schalter lösen das hinterlegte Skript aus, zeigen während der Ausführung ein drehendes FontAwesome-Icon und leuchten für die Dauer des Spins auf.
  - Schalter zum Öffnen von Objekten öffnen das konfigurierte Zielobjekt in der Kachelvisualisierung.
- Deaktivierte Fortschrittsbalken und Werte werden automatisch ausgegraut und mit dem Wert `-` angezeigt; je Zeile lässt sich stattdessen der aktuelle Wert zeigen oder die Zeile ausblenden.
- Schaltertexte erscheinen einheitlich in normaler Schrift wie die Schalter der Kachel-Visualisierung. Stehen Beschriftung und Wert gemeinsam auf einem Schalter, ist die Beschriftung fett.
- Die Kachel verwendet die Schrift der Kachel-Visualisierung (Poppins).
- Schieberegler unterstützen Drag und +/- Schalter, setzen Werte optimistisch und verifizieren anschließend, ob der Wert tatsächlich in die Variable geschrieben wurde. Falls nicht, springt der Schieberegler automatisch auf den tatsächlichen Variablenwert zurück.
- Schieberegler-Farben: Schieberegler verwenden eigene Schieberegler-Farben (Schieberegler-Farbe 1/2). Sind diese nicht gesetzt, wird auf die Fortschrittsbalken-Farben zurückgefallen.

## PHP-Befehle
Die Funktionalität erfolgt über die Instanz-Konfiguration und den Editor. Für den Editor gibt es:

- `UDST_EditorURL(int $InstanzID): string` – Adresse des Editors (ohne Host) mit frischem Zugangscode.
- `UDST_EditorConnectURL(int $InstanzID): string` – dieselbe Adresse über Symcon Connect; leer, wenn Connect nicht aktiv ist.
- `UDST_GetUserTemplates(int $InstanzID): string` – die eigenen Vorlagen, wie sie in dieser Kachel liegen, als JSON.
- `UDST_SyncUserTemplates(int $InstanzID, string $Vorlagen): bool` – die Liste der eigenen Vorlagen dieser Kachel ersetzen; der Editor verteilt damit eine geänderte Liste an alle Kacheln.

`UDST_RunSelfTest(int $InstanzID): string`: prüft alle Zeilen, ohne etwas zu ändern, und liefert einen kurzen Text mit den gefundenen Problemen (fehlende Objekte und Bilder, unbekannte Darstellungsarten und Gruppen, Variablen vom falschen Typ, Schalter ohne Aktion), Hinweisen (Balken oder Regler ohne eigenen Bereich, gelöschte Variable an einem Button mit Skript oder Objekt) und den bedienbaren Zeilen samt Schlüssel.

`UDST_GetConfigurationHelp(int $InstanzID): string`: liefert die Hinweise für KI-Assistenten und Skripte aus dem Formular als Text und ändert nichts.

Eine Aktion, die die Kachel nicht ausführen kann, meldet `IPS_RequestAction` als Warnung mit dem Grund: eine Kennung ohne bedienbare Zeile, ein fehlendes Skript oder ein ungültiger Wert (beim Schalter weder true noch false, bei Zahlenvariablen keine Zahl).

## Changelog
- **3.1.0** (Beta)
  - Neu: visueller Editor mit Live-Vorschau der echten Kachel, geöffnet über „Editor öffnen“ im Formular. Zeilen, Gruppen und das Statusbild per Ziehen und Ablegen, frei ziehbare Vorschaugröße, Eigenschaften je Anzeigetyp, Objektauswahl mit Suche, Status simulieren und Testwerte nur in der Vorschau, Vorlagen sowie Export und Import, Zeilen aus einem Gerät mit vorgeschlagenem Anzeigetyp, Mehrfachauswahl, Tastatursteuerung, Rückgängig und Wiederholen. Gespeichert wird erst auf Klick, mit Rückfrage, wenn die Konfiguration inzwischen anderswo gespeichert wurde.
  - Behoben: Ein Schieberegler in einer Gruppe wurde bei knappem Platz bis auf null zusammengedrückt und lief über die Nachbarn. Passt er nicht mehr neben die übrigen Einträge, bricht er jetzt in eine eigene Zeile um; ist auch die zu schmal, kürzt sich seine Beschriftung mit „…“.
  - Behoben: In schmalen Kacheln schoben gestreckte Schalter mit langen Beschriftungen Bild und Zeilen seitlich aus der Kachel. Jetzt wird die Zeilenspalte schmaler, eine zu lange Beschriftung endet im Knopf.
  - Behoben: Lange Statuswerte ohne Leerzeichen (etwa Rohwerte wie „BSH.Common.EnumType.OperationState.Inactive“) liefen über den Rand der Kachel; jetzt brechen sie um.
- **3.0.0**
  - Voraussetzung Symcon 8.1: das Modul nutzt Module Strict und den nativen Webhook; der Eintrag im WebHook Control entfällt.
  - Wertänderungen aktualisieren nur die betroffenen Zeilen: wertabhängige Icons wechseln mit, mehrere Zeilen derselben Variable bleiben richtig, ein Statuswechsel baut die Kachel nicht mehr neu auf, Ziel-Marker stimmen auch bei inaktivem Balken.
  - Boolesche Schalter setzen den angeklickten Zustand statt umzuschalten.
  - Sicherheit: Aktionen aus der Kachel wirken nur auf ihre eigenen Zeilen, der Bild-Webhook liefert nur konfigurierte Medien, Texte aus Variablen erscheinen immer als Text.
  - Bilder: geänderte Bilder (z. B. Kamerabilder) erscheinen sofort, zu große Bilder zeigen einen Platzhalter mit Meldung im Log, die Kacheln sind deutlich kleiner (keine eingebetteten Bilder mehr).
  - Bedienung: Schieberegler mit Bereich bis 0 (z. B. -80..0 dB) und feiner Schrittweite, Schalter per Tastatur (Enter/Leertaste), Gruppen brechen in schmalen Kacheln um, Schalter-Darstellungen mit Beschriftung, Farbe und Icon, transparenter Balkenhintergrund.
  - Robustheit: ungültige Zeichen in Texten und ältere Konfigurationen (IDs als Text) legen die Kachel nicht mehr still; der Zeilendialog zeigt beim Umschalten der Darstellungsart die passenden Felder.
  - Neu: Fortschrittsbalken zeigen bei inaktivem Status je nach Einstellung „-“ (wie bisher), den aktuellen Wert (etwa eine Ist-Temperatur) oder werden ausgeblendet.
  - Darstellung: die Kachel nutzt die Schrift der Kachel-Visualisierung (Poppins) statt Arial, Schaltertexte stehen in normaler Stärke wie die Schalter der Visualisierung, Icons in Fortschrittsbalken sitzen auf der Textmitte, inaktive Schalter bleiben lesbar (abgedunkelt wird nur der Hintergrund).
  - Icons werden von allen Kacheln gemeinsam geladen statt je Kachel; die Kacheln öffnen schneller.
  - Behoben: Bei einer Installation über Git unter Windows kam die Kachel ohne Gestaltung und Funktionen an.
  - Danke an bumaas für die Beiträge zu Schaltern, Fortschrittsbalken und Schrift.
  - Nach dem Update offene Visualisierungen einmal neu laden.
- **2.1.0**
  - Internes Refactoring: PHP-Backend in libs/-Traits modularisiert (module.php 3526 → ~700 Zeilen), Frontend-JS in IIFE strukturiert und nach Darstellungsarten zerlegt, toter Legacy-Code entfernt, strict_types eingeführt.
  - Keine funktionalen Änderungen — bestehende Instanzen laufen ohne Neukonfiguration weiter.
- **2.0.0**
  - Stable Release.
