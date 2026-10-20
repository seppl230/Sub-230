# SUB 230 – V8

**Direktes Upgrade von V7.2, V7.1 oder V7.** Alle Funktionen und Verbesserungen der vorherigen Versionen sind enthalten; Zwischenupdates sind nicht nötig.

## Änderungen

- **Coach → Vom Coach übernehmen:** Der komplette Bereich zum Übernehmen von Trainingsempfehlungen befindet sich jetzt im Reiter **Coach**, unmittelbar nach dem Coaching-Bereich. Im Trainingsplan erscheint er nicht mehr.
- **Beide Importarten unverändert:** Einzelne Trainingsänderungen mit `ROAD230_UPDATE` Version 1 sowie dauerhafte Regeln mit Version 2. Auch die manuellen Regeln für beide Lauftage und die Vorschau vor dem Übernehmen bleiben erhalten.
- **Darstellung korrigiert:** Lange Coaching-Berichte, Änderungszähler, Wochenfilter, Trainingskarten, Detailtabellen und Eingabe-/Schaltflächen passen sich auch an schmale Bildschirme an. Alle bisherigen Farben und das Stoppuhr-Logo bleiben gleich.
- **Vorhandene Daten:** Garmin-Läufe, Kommentare, Pulswerte, Gewicht, Einzelanpassungen, wiederkehrende Planregeln und API-Schlüssel bleiben im bisherigen Browser-Speicher. Der gespeicherte API-Schlüssel ist **nicht** in JSON-Backups enthalten.

## Installation auf GitHub Pages

1. **Zuerst in der alten App unter Mehr → JSON-Backup erstellen** und die Datei privat aufbewahren, niemals ins öffentliche GitHub-Repository hochladen.
2. ZIP entpacken. **Alle enthaltenen Dateien direkt ins Stammverzeichnis** von `seppl230/Sub-230` hochladen, gleichnamige Dateien überschreiben und `Commit changes` bestätigen. Den entpackten Ordner selbst nicht hochladen.
3. Nach dem GitHub-Pages-Deployment die bestehende Web-App aktualisieren. **Nicht vom iPhone löschen**, da sonst lokale Daten verlorengehen können. Sollte noch die alte Version erscheinen, nach einiger Zeit erneut öffnen.

## Nutzung

1. Nach Garmin- und Intervals.icu-Synchronisierung auf **Daten abrufen** tippen. Für neue, noch unbewertete Läufe erscheint der RPE-/Feedback-Dialog.
2. Unter **Coach → Zusammenfassung kopieren** den Bericht in den bestehenden ChatGPT-Coaching-Chat einfügen.
3. Die Antwort mit `ROAD230_UPDATE` unter **Coach → Vom Coach übernehmen** einfügen, Änderungen prüfen und bewusst übernehmen. Du kannst dort auch Pace-/Zonenvorgaben für alle künftigen Einheiten manuell setzen.

**Datenschutz:** Die App arbeitet weiterhin ohne zusätzliche KI-API-Kosten. Aus deinem Browser wird kein Coaching-Bericht automatisch an ChatGPT übermittelt; das erfolgt erst durch dein Kopieren/Einfügen. V8 verändert keine Trainingseinheiten von selbst.
