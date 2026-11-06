# Editor der Universellen Geräte-Kachel

Der Editor richtet die Kachel in einer eigenen Webseite ein. Links steht die echte Kachel mit allen Änderungen, rechts stehen die Einstellungen. Geändert wird nur ein Entwurf: In die Instanz geschrieben wird erst mit „Speichern“. Das Konfigurationsformular bleibt daneben vollständig nutzbar, beide schreiben dieselben Einstellungen.

![Editor – Überblick](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-uebersicht.png)

## Inhalt

1. [Editor öffnen](#editor-öffnen)
2. [Der Bildschirm im Überblick](#der-bildschirm-im-überblick)
3. [Schnellstart mit einer Vorlage](#schnellstart-mit-einer-vorlage)
4. [Zeilen](#zeilen)
5. [Gruppen](#gruppen)
6. [Icons](#icons)
7. [Status und Gerätebild](#status-und-gerätebild)
8. [Status simulieren](#status-simulieren)
9. [Kachel-Einstellungen](#kachel-einstellungen)
10. [Speichern, Verwerfen, Rückgängig](#speichern-verwerfen-rückgängig)
11. [Eigene Vorlagen, Export und Import](#eigene-vorlagen-export-und-import)
12. [Tastenkürzel](#tastenkürzel)
13. [Gut zu wissen](#gut-zu-wissen)

## Editor öffnen

1. In der Symcon-Konsole die Instanz der Kachel öffnen.
2. Oben im Formular auf **„Editor öffnen“** klicken. Der Editor öffnet sich in einem neuen Browser-Tab.
3. Ist Symcon Connect aktiv, öffnet **„Editor über Connect öffnen“** denselben Editor über die Connect-Adresse, etwa von unterwegs.

Der Link enthält einen Zugangscode und ist ein Verwaltungszugang zu dieser Kachel. Ihn deshalb nicht weitergeben. Mehr dazu unter [Gut zu wissen](#gut-zu-wissen).

## Der Bildschirm im Überblick

Die Nummern beziehen sich auf das Bild oben.

| Nr. | Bereich | Wozu |
|---|---|---|
| 1 | Erscheinungsbild | Der Editor folgt dem System (Automatisch) oder bleibt fest hell oder dunkel. Die Vorschau-Kachel behält ihr eigenes Design (6). |
| 2 | Rückgängig, Wiederholen | Nimmt jede Änderung zurück, auch „Verwerfen“. |
| 3 | Vorlagen | Fertige Vorlagen, eigene Vorlagen, Export und Import. |
| 4 | Verwerfen, Speichern | „Speichern“ schreibt den Entwurf in die Instanz, „Verwerfen“ kehrt zum gespeicherten Stand zurück. |
| 5 | Größe der Vorschau | 1×1, 2×1, 2×2, 4×2 und Maximiert. Daneben steht die zuletzt gezogene Größe. Der Pfeil ↕ passt die Höhe an den Inhalt an. |
| 6 | Design der Vorschau | Die Kachel dunkel oder hell zeigen. |
| 7 | Status simulieren | Die Kachel in einem anderen Status zeigen, ohne etwas am Gerät zu ändern ([mehr](#status-simulieren)). |
| 8 | Vorschau | Die echte Kachel mit dem Entwurf. Die Werte laufen live mit. |
| 9 | Greifer | Die Kachel auf jede Größe ziehen. |
| 10 | Rahmen anzeigen | Blendet die Hilfsrahmen um Zeilen und Gruppen aus. Der Browser merkt sich die Wahl; die Auswahl bleibt sichtbar. |
| 11 | Reiter | **Zeilen**, **Status** und **Kachel**. |
| 12 | + Zeile, + Gruppe | Neue Zeilen je Anzeigetyp, Zeilen aus einem Gerät, neue Gruppe. |
| 13 | Zeilenliste | Alle Zeilen in der Reihenfolge der Kachel, Gruppen als farbige Karten. |

In der Vorschau trägt jede Zeile einen grauen gestrichelten Rahmen und jede Gruppe einen gestrichelten Rahmen in ihrer Erkennungsfarbe. Was gewählt ist, ist durchgehend umrandet. Diese Rahmen gibt es nur im Editor, nicht in der Visualisierung.

## Schnellstart mit einer Vorlage

Der schnellste Weg zu einer fertigen Kachel: eine Vorlage wählen und danach die Variablen zuordnen.

### 1. Vorlage wählen

![Vorlagen-Menü](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-vorlagen.png)

Oben rechts auf **„Vorlagen“** klicken und eine Vorlage wählen (1). Mitgeliefert sind Waschmaschine, Wäschetrockner, Wärmepumpe, Heizung, Rollladen, Fenster, PV-Anlage, Batteriespeicher, Wallbox und E-Auto. Eine Rückfrage bestätigt, dass Zeilen, Gruppen und Aufteilung des Entwurfs ersetzt werden. Eine schon gewählte Statusvariable bleibt erhalten.

Unter der Liste stehen „Als Vorlage speichern …“ (2) sowie „Exportieren“ und „Importieren“ (3), siehe [Eigene Vorlagen](#eigene-vorlagen-export-und-import).

### 2. Platzhalter füllen

![Platzhalter nach dem Anwenden einer Vorlage](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-platzhalter.png)

Nach dem Anwenden zeigt die Vorschau jede Zeile ohne Variable als gestrichelten Platzhalter:

1. **„Auswählen“** öffnet die passende Objektauswahl für diese Zeile.
2. Der **Mülleimer** entfernt die Zeile. Beim Platzhalter der Statusvariable blendet er den Statusbereich aus.
3. Das **„+“** unter der letzten Zeile fügt eine neue Zeile hinzu.
4. Das **Warndreieck** in der Liste zeigt, dass einer Zeile noch etwas fehlt; der Mauszeiger darauf nennt den Grund.

Hat die Kachel noch kein Bild, zeigt die Vorschau in der Bildspalte ein Foto-Icon: „Auswählen“ setzt das Standardbild, der Mülleimer („Ohne Bild“) blendet den Platzhalter aus.

### 3. Variable auswählen

![Objektauswahl](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-objektauswahl.png)

1. **Suche** nach dem Namen über alle Objekte.
2. **Neben der letzten Auswahl:** Die Auswahl beginnt bei den Nachbarn der zuletzt gewählten Variable, meist also bei den übrigen Variablen desselben Geräts. Rechts steht der aktuelle Wert jeder Variable.
3. **„Höher“** geht eine Ebene nach oben. Darunter (nicht im Bild) stehen alle Objekte als Baum.
4. Ein **Doppelklick** oder die Eingabetaste übernimmt die Variable.

Passt der eingestellte Anzeigetyp nicht zur gewählten Variable, schlägt eine Meldung unten einen passenden vor: Schalter oder Auswahl mit Aktion → Schalter, Regler-Darstellung → Schieberegler, Prozentwert ohne Aktion → Fortschrittsbalken. **„Umstellen“** in der Meldung übernimmt ihn.

Zum Schluss auf **„Speichern“** klicken – fertig.

## Zeilen

### Zeile hinzufügen

![Menü „Zeile hinzufügen“](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-neue-zeile.png)

Das „+“ unter der letzten Zeile der Vorschau (3) oder **„+ Zeile“** über der Liste öffnet das Menü:

1. Eine Zeile je **Anzeigetyp**: Text, Fortschrittsbalken, Schieberegler, Schalter oder Bild.
2. **„Aus Gerät …“** legt für mehrere Variablen eines Geräts auf einmal Zeilen an.

### Zeilen aus einem Gerät

![Zeilen aus einem Gerät](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-aus-geraet.png)

Nach „Aus Gerät …“ zuerst die Instanz des Geräts wählen. Danach erscheint die Liste ihrer Variablen:

1. **Ankreuzen**, welche Variablen eine Zeile bekommen. Versteckte Variablen sind zunächst nicht angehakt.
2. Der **vorgeschlagene Anzeigetyp** je Variable. Er lässt sich später an der Zeile ändern.
3. **„Als Gruppe …“** legt die Zeilen in eine eigene Gruppe mit dem Namen des Geräts.

### Zeile bearbeiten

![Eigenschaften einer Zeile](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-zeile.png)

Ein Klick auf eine Zeile – in der Vorschau oder in der Liste – öffnet ihre Eigenschaften an Stelle der Liste:

1. Die gewählte Zeile ist in der Vorschau durchgehend in der Akzentfarbe umrandet.
2. **„← Alle Zeilen“** (oder Escape) führt zurück zur Liste.
3. Der **Anzeigetyp** als Icon-Leiste: Text, Fortschrittsbalken, Schieberegler, Schalter, Bild.
4. **Aufklappbare Abschnitte** (Quelle, Darstellung, Farben, Anordnung und was zum Typ gehört). Es erscheinen nur die Felder, die zum Anzeigetyp passen. Zugeklappte Abschnitte merkt sich der Browser.
5. **Duplizieren** und **Löschen**.

Leere Größenfelder bedeuten „Standard“, ⓘ erklärt ein Feld. Fehlt der Zeile eine Variable oder hat diese keine Aktion, steht oben ein Hinweis.

### Direkt in der Vorschau arbeiten

![Kontextmenü einer Zeile](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-kontextmenue.png)

- **Klick:** Zeile oder Gruppe auswählen.
- **Doppelklick:** Beschriftung direkt in der Kachel ändern, auf einem Gruppennamen den Namen der Gruppe. Ein Doppelklick auf das Icon einer Gruppe öffnet die Icon-Auswahl.
- **Rechtsklick:** Kontextmenü mit „Variable auswählen …“, „Beschriftung ändern“, den Untermenüs Anzeigetyp, Gruppe und Anzeigen (Icon, Beschriftung, Wert), „Nach oben/unten“, „Darstellung kopieren/einfügen“ (Farben, Schrift und Anzeige auf eine andere Zeile übertragen), „Duplizieren“ und „Löschen“. Auf einer Gruppe bietet es Umbenennen, Icon, die Schalter der Gruppe sowie „Gruppe duplizieren“ und „Gruppe auflösen“, auf dem Statusbild Icon, eigenes Bild oder Gerätebild für den gezeigten Status, die Bildposition und die Statuseinstellungen.

Schalter und Regler schalten in der Vorschau nichts.

### Zeilen verschieben

![Eine Zeile wird gezogen](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-ziehen.png)

Eine Zeile an ihrem Text ziehen (in der Liste am Griff ⋮⋮). Beim Ziehen rückt sie live an ihren neuen Platz (1), auch nebeneinander in einer Gruppe; die Gruppe, in der sie landet, ist umrandet. Escape bricht ab.

Eine ganze Gruppe zieht man an ihrem Namen (2), in ihrem leeren Bereich neben und zwischen den Zeilen oder mit gedrückter Umschalttaste an einer ihrer Zeilen.

Das **Statusbild** lässt sich an den oberen, unteren, linken oder rechten Rand ziehen: Beim Ziehen erscheinen auf den Kanten der Kachel runde Felder mit Bild-Icon, abgelegt wird auf einem davon.

### Mehrere Zeilen auf einmal

![Mehrere Zeilen gewählt](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-mehrfach.png)

Umschalt-, Cmd- oder Strg-Klick nimmt Zeilen zur Auswahl hinzu oder heraus, in der Vorschau wie in der Liste (1). Über der Liste erscheint dann ein Feld für alle gewählten Zeilen (2): Anzeigetyp, Gruppe (auch eine neue), Anzeige von Icon, Beschriftung und Wert, Schriftgröße, Textfarbe, Ausrichtung und Linie. Dort lassen sich die Zeilen auch duplizieren, löschen oder mit einer kopierten Darstellung versehen.

Ein Rechtsklick auf eine der gewählten Zeilen öffnet ein Menü für alle und behält die Auswahl, etwa um mehrere Zeilen in eine Gruppe zu legen.

## Gruppen

![Gewählte Gruppe](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-gruppe.png)

Gruppen fassen Zeilen zusammen, zum Beispiel Leistung und Energie nebeneinander. **„+ Gruppe“** legt eine neue an; Zeilen kommen per Ziehen, über das Kontextmenü oder über das Feld „Gruppe“ einer Zeile hinein.

1. Ein Klick auf den Gruppennamen oder einen leeren Bereich der Gruppe wählt sie aus. Die gewählte Gruppe ist durchgehend in ihrer Erkennungsfarbe umrandet.
2. **Name** der Gruppe; links davon das Icon (Klick öffnet die Icon-Auswahl).
3. Schalter der Gruppe, von links: **Name anzeigen**, **Name über der Gruppe**, **Linie unter der Gruppe**, **Elemente auf volle Breite** und **Gruppe auflösen** (die Zeilen bleiben erhalten).

Jede Gruppe hat im Editor eine eigene Erkennungsfarbe: in der Liste als Linie und Icon, in der Vorschau als Rahmen.

## Icons

![Icon-Auswahl](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-icons.png)

Ein Klick auf das Icon einer Gruppe oder einer Status-Zuordnung öffnet die Icon-Auswahl. Die Suche versteht Deutsch und Englisch („Strom“, „Waschmaschine“, `bolt`). Angeboten werden alle Font-Awesome-Icons, die Symcon mitbringt, dazu Symcon-eigene Icons wie Wärmepumpe oder Fenster- und Markisenzustände. Die Eingabetaste übernimmt den ersten Treffer, „Kein Icon“ entfernt es.

## Status und Gerätebild

![Reiter „Status“](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-status.png)

Der Statusbereich zeigt oben in der Kachel den Zustand des Geräts und wählt das passende Bild.

1. **Statusvariable**, etwa eine Variable mit den Werten Aus, Läuft, Fertig.
2. Was die Statuszeile **anzeigt** (Icon, Beschriftung, Wert); darunter Ausblenden, eigene Beschriftung, Schriftgröße und Ausrichtung.
3. **Standard-Bild** für Werte ohne eigenes Bild: Bild, Icon oder Kein Bild.
4. **„Aus der Darstellung neu einlesen“** übernimmt neue Werte der Statusvariable und behält die Einstellungen der vorhandenen.
5. Die **Zuordnungen** je Wert. Das Auge zeigt diesen Status in der Vorschau, ein Klick öffnet die Details:

![Details einer Zuordnung](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-status-zuordnung.png)

Je Wert gibt es ein Bild (eingebautes Gerätebild, eigenes Bild aus Symcon oder Icon mit Farbe), eine Statusfarbe und den Schalter **„Fortschrittsbalken aktiv“**: Ist er aus, zeigen Balken in diesem Status „–“ oder den aktuellen Wert, oder die Zeile wird ausgeblendet – das legt die Zeile unter „Bei inaktivem Fortschrittsbalken“ fest.

Ein Klick auf das Statusbild in der Vorschau öffnet die Statuseinstellungen, ein Doppelklick wählt ein Icon für den gerade gezeigten Status.

## Status simulieren

![Status simulieren](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-simulieren.png)

Über **„Status simulieren“** (1) zeigt die Vorschau jeden Status der Statusvariable, hier „Aus“ mit anderem Bild und inaktivem Fortschrittsbalken. Für Balken und Regler setzt der Abschnitt „Testwert in der Vorschau“ an der Zeile einen Testwert. Das wirkt nur in der Vorschau, an Variablen und Geräten ändert sich nichts. „Echter Wert“ kehrt zu den Live-Werten zurück.

## Kachel-Einstellungen

![Reiter „Kachel“](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-kachel.png)

Der Reiter **Kachel** enthält alles, was für die ganze Kachel gilt: Position, Breite und Ausrichtung des Gerätebilds, Hintergrund, Abstände, das Aussehen der Fortschrittsbalken sowie Schalterhöhe und Gruppennamen-Größe.

Der Haken **„Standard-Hintergrundbild“** (1) blendet das mitgelieferte Hintergrundbild ein; ohne Haken und ohne eigenes Hintergrundbild bleibt die Kachel schlicht wie in den Bildern dieser Anleitung.

## Speichern, Verwerfen, Rückgängig

![Kopfleiste mit ungespeicherten Änderungen](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-speichern.png)

1. **Rückgängig/Wiederholen:** Jede Änderung lässt sich zurücknehmen. Tippen in einem Feld zählt als ein Schritt. Nach dem Löschen einer Zeile bietet auch die Meldung unten „Rückgängig“ an.
2. **„Ungespeicherte Änderungen“** zeigt, dass der Entwurf vom gespeicherten Stand abweicht. Beim Schließen des Tabs fragt der Browser nach.
3. **Verwerfen** kehrt zum gespeicherten Stand zurück (auch das lässt sich rückgängig machen).
4. **Speichern** schreibt den Entwurf in die Instanz. Ungültige Werte werden nicht gespeichert. Wurde die Konfiguration inzwischen anderswo gespeichert, etwa im Formular, fragt der Editor nach.

## Eigene Vorlagen, Export und Import

![Als Vorlage speichern](https://raw.githubusercontent.com/da8ter/images/main/Universelle-Geraete-Kachel%20editor-eigene-vorlage.png)

- **„Als Vorlage speichern …“** im Menü „Vorlagen“ legt den Entwurf als eigene Vorlage ab, mit freiem Namen und Icon. Ohne Häkchen werden Variablen, Skripte, Medien und Statusvariable nicht gespeichert; die Zeilen werden beim Anwenden zu Platzhaltern. Mit dem Häkchen „mitspeichern“ zeigt die Vorlage auf dieselben Objekte – passend nur in dieser Symcon-Installation.
- Eigene Vorlagen stehen in allen Kacheln dieses Moduls unter „Eigene Vorlagen“ bereit und überdauern das Löschen einer Kachel. Der Mülleimer daneben löscht sie.
- **„Exportieren“** und **„Importieren“** übertragen eine Konfiguration als JSON, etwa auf eine zweite Kachel. Objekt-IDs passen dabei nur zur selben Symcon-Installation. Ein Import landet zunächst nur im Entwurf.

## Tastenkürzel

In Eingabefeldern bleiben die Tasten beim Feld. Die Kürzel wirken in der Liste und in der Vorschau. Auf dem Mac gilt Cmd statt Strg.

| Taste | Wirkung |
|---|---|
| Strg + Z | Rückgängig |
| Strg + Umschalt + Z, Strg + Y | Wiederholen |
| Strg + S | Speichern |
| ↑ / ↓ | Vorige oder nächste Zeile in der Reihenfolge der Kachel wählen |
| Alt + ↑ / ↓ | Gewählte Zeile verschieben |
| Strg + D | Gewählte Zeile(n) duplizieren |
| Entf | Gewählte Zeile(n) löschen |
| Escape | Auswahl aufheben, Ziehen abbrechen, zurück zur Liste |
| Umschalt-, Cmd- oder Strg-Klick | Zeile zur Auswahl hinzunehmen oder herausnehmen |
| Pfeiltasten am Greifer | Kachel um 10 px ändern, mit Umschalt um 50 px; Doppelklick auf den Greifer: 2×2 |
| Pfeiltasten am Rand des rechten Bereichs | Breite des rechten Bereichs um 20 px ändern; Doppelklick auf den Rand: Standardbreite |

## Gut zu wissen

- **Formular und Editor:** Nach dem Speichern im Editor ein noch offenes Konfigurationsformular neu öffnen, bevor dort etwas übernommen wird. Sonst überschreibt das Formular den Stand des Editors.
- **Zugang:** Der Link gilt eine Stunde ohne Nutzung, höchstens acht Stunden, und verfällt mit einem Neustart von Symcon. Danach den Editor einfach wieder über das Formular öffnen. Die Objektauswahl zeigt auch Namen und Werte anderer Objekte, deshalb den Link nicht weitergeben.
- **Nur Vorschau:** Schalter, Regler, Testwerte und simulierte Status lösen in der Vorschau keine Aktion aus.
- **Rahmen:** Die gestrichelten Rahmen und Platzhalter gibt es nur im Editor. Der Schalter „Rahmen anzeigen“ unter der Vorschau blendet sie aus, um die Kachel so zu sehen wie in der Visualisierung. Die Zeilen stehen mit und ohne Rahmen an derselben Stelle.
- **Breite rechts:** Den rechten Bereich mit Zeilen, Status und Kachel-Einstellungen an seinem linken Rand mit der Maus breiter oder schmaler ziehen, etwa für lange Werte in den Profilzuordnungen. Doppelklick auf den Rand stellt die Standardbreite her; der Browser merkt sich die Breite.

Zurück zur [Anleitung des Moduls](../README.md).
