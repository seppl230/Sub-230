# Sub 230 – V9

V9 baut direkt auf V8 auf. Keine Zwischenversion nötig.

## Neu

- Zeitlich verknüpfte Minutenmittelwerte von Puls, Pace und Höhe mit getrennten, gleich ausgerichteten Diagrammen unter **Training → Laufdetails**.
- Bewegungspausen/Gehen als vorsichtig formulierte Hinweise; datenbedingte Ausfälle und fragwürdige Sensorwerte werden nicht als echte Belastungswechsel interpretiert.
- Ausführlicher Coaching-Bericht mit Minutenverlauf für die zwei neuesten Läufe, 5-Minutenverlauf für weitere dokumentierte Läufe und dem vollständigen noch anstehenden, individuell angepassten Trainingsplan.
- Bei jedem manuellen Abruf werden die drei jüngsten Läufe erneut geladen. **Mehr → Detaildaten neu abrufen** lädt die zuletzt zwölf dokumentierten Läufe gezielt neu, auch nach Änderungen von Pulszonen in Intervals.icu.
- Optionaler, lokal gespeicherter Hintergrund zum Läufer unter **Coach**.
- Keine automatische Änderung des Trainingsplans: Coach-Empfehlungen müssen weiterhin ausdrücklich geprüft und übernommen werden.

## Installation

1. **In der bestehenden App vorher Mehr → JSON-Backup erstellen** und privat aufbewahren; nicht auf GitHub hochladen.
2. ZIP entpacken; alle Dateien ins **Stammverzeichnis** von `seppl230/Sub-230` hochladen und vorhandene Dateien ersetzen.
3. Änderungen committen und GitHub Pages aktualisieren lassen. Bestehende iPhone-Web-App **nicht löschen**, sonst droht Verlust lokaler Daten.
4. Unter **Mehr → Detaildaten neu abrufen** prüfen, ob deine Läufe tatsächlich Puls-, Distanz- und Höhendaten liefern. Fehlt eine Zeitreihe, wird sie nicht erfunden.
5. Unter **Coach → Zusammenfassung kopieren** den neuen Bericht in den bestehenden Coaching-Chat übertragen.

## Grenzen

- Der Abruf persönlicher Intervals.icu-Daten konnte nur mit simulierten API-Antworten getestet werden. Qualität und Verfügbarkeit hängen von der dort gespeicherten Aktivität ab.
- Pro Lauf werden kompakte Minutenmittelwerte gespeichert, **keine vollständigen Rohdaten pro Sekunde**. Für neue Berechnungen können vorhandene Aktivitäten erneut abgerufen werden.
- Eine echte Erkennung von Gehpausen oder kardialer Drift ist allein anhand der hier verwendeten Werte nicht sicher möglich. Die App kennzeichnet mögliche Hinweise und Datenlücken.
- Speicherung und Feedback bleiben wie bisher lokal im selben Browser, nicht automatisch zwischen iPhone und PC synchronisiert. Keine zusätzlichen Abo-/KI-API-Kosten.
