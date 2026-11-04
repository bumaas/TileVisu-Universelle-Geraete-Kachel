
![IP-Symcon](https://img.shields.io/badge/IP--Symcon-Module-blue.svg)

# Universelle Geräte Kachel

![Kachelübersicht](https://github.com/da8ter/images/blob/main/kachelanleitung_ugk.png)

Das Modul **Universelle Geräte Kachel** stellt eine flexibel konfigurierbare Geräte-Kachel für die IP-Symcon Visualisierung bereit. Eine Kachel kann Statusinformationen, frei wählbare Variablen, Fortschrittsbalken, Schieberegler, Schalter und Bilder in einem gemeinsamen Layout kombinieren.

## Inhaltsverzeichnis
1. [Funktion](#funktion)
2. [Voraussetzungen](#voraussetzungen)
3. [Installation](#installation)
4. [Konfiguration](#konfiguration)
5. [Visualisierung und Bedienung](#visualisierung-und_bedienung)
6. [PHP-Befehle](#php-befehle)
7. [Changelog](#changelog)

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
- Für benutzerdefinierte Icons/Bilder: entsprechende Medienobjekte in IP-Symcon.

## Installation
1. Im IP-Symcon `Modul-Control` folgende URL hinzufügen:
   ```
   https://github.com/da8ter/TileVisu-Universelle-Geraete-Kachel.git
   ```
   Oder über den Module-Store: in der Suche Universelle Geräte Kachel eingeben und dann installieren.


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


## Visualisierung und Bedienung
- Die Kachel wird in der Kachel-Visualisierung angezeigt.
- Schalter reagieren abhängig vom Modus:
  - Boolesche Schalter spiegeln den Variablenzustand und setzen beim Klick den angezeigten Gegenzustand (kein Umschalten auf dem Server: ein Doppelklick schaltet nicht zurück).
  - Integer-/String-Schalter werden aus Assoziationen und Darstellungen als Mehrfach-Schaltergruppe dargestellt.
  - Skript-Schalter lösen das hinterlegte Skript aus, zeigen während der Ausführung ein drehendes FontAwesome-Icon und leuchten für die Dauer des Spins auf.
  - Schalter zum Öffnen von Objekten öffnen das konfigurierte Zielobjekt in der Kachelvisualisierung.
- Deaktivierte Fortschrittsbalken und Werte werden automatisch ausgegraut und mit dem Wert`-` angezeigt.
- Die Kachel verwendet die Schrift der Kachel-Visualisierung (Poppins).
- Schieberegler unterstützen Drag und +/- Schalter, setzen Werte optimistisch und verifizieren anschließend, ob der Wert tatsächlich in die Variable geschrieben wurde. Falls nicht, springt der Schieberegler automatisch auf den tatsächlichen Variablenwert zurück.
- Schieberegler-Farben: Schieberegler verwenden eigene Schieberegler-Farben (Schieberegler-Farbe 1/2). Sind diese nicht gesetzt, wird auf die Fortschrittsbalken-Farben zurückgefallen.

## PHP-Befehle
Das Modul stellt aktuell keine öffentlichen PHP-Befehle bereit. Die komplette Funktionalität erfolgt über die Instanz-Konfiguration.

## Changelog
- **3.0.0**
  - Voraussetzung Symcon 8.1: das Modul nutzt Module Strict und den nativen Webhook; der Eintrag im WebHook Control entfällt.
  - Wertänderungen aktualisieren nur die betroffenen Zeilen: wertabhängige Icons wechseln mit, mehrere Zeilen derselben Variable bleiben richtig, ein Statuswechsel baut die Kachel nicht mehr neu auf, Ziel-Marker stimmen auch bei inaktivem Balken.
  - Boolesche Schalter setzen den angeklickten Zustand statt umzuschalten.
  - Sicherheit: Aktionen aus der Kachel wirken nur auf ihre eigenen Zeilen, der Bild-Webhook liefert nur konfigurierte Medien, Texte aus Variablen erscheinen immer als Text.
  - Bilder: geänderte Bilder (z. B. Kamerabilder) erscheinen sofort, zu große Bilder zeigen einen Platzhalter mit Meldung im Log, die Kacheln sind deutlich kleiner (keine eingebetteten Bilder mehr).
  - Bedienung: Schieberegler mit Bereich bis 0 (z. B. -80..0 dB) und feiner Schrittweite, Schalter per Tastatur (Enter/Leertaste), Gruppen brechen in schmalen Kacheln um, Schalter-Darstellungen mit Beschriftung, Farbe und Icon, transparenter Balkenhintergrund.
  - Robustheit: ungültige Zeichen in Texten und ältere Konfigurationen (IDs als Text) legen die Kachel nicht mehr still; der Zeilendialog zeigt beim Umschalten der Darstellungsart die passenden Felder.
  - Nach dem Update offene Visualisierungen einmal neu laden.
- **2.1.0**
  - Internes Refactoring: PHP-Backend in libs/-Traits modularisiert (module.php 3526 → ~700 Zeilen), Frontend-JS in IIFE strukturiert und nach Darstellungsarten zerlegt, toter Legacy-Code entfernt, strict_types eingeführt.
  - Keine funktionalen Änderungen — bestehende Instanzen laufen ohne Neukonfiguration weiter.
- **2.0.0**
  - Stable Release.
