# Sub 230 – Version 6.2

Kostenlose, lokal arbeitende Trainings-Web-App für den Halbmarathon am **4. April 2027**. Kein neuer App-Account und kein KI-API-Abonnement erforderlich.

## Neu in V5

- **Jede Trainingseinheit bearbeiten:** Distanz, Pace-Bereich (mm:ss), Garmin-Pulszone, Belastung und Ablauf; Original jederzeit wiederherstellen.
- **Coaching-Anpassungen importieren:** Einen `ROAD230_UPDATE`-Block aus dem separaten Coaching-Chat einfügen, Vorher/Nachher ansehen und Änderungen ausdrücklich bestätigen. Nie automatische Schreibzugriffe auf den Trainingsplan.
- **Echte Trainingstermine:** Dienstag und Donnerstag sind die Vorgaben, Änderungen an Wochentagen/Uhrzeiten werden sofort lokal gespeichert. Rennen fix am Sonntag, 04.04.2027.
- **Trainingskontinuität:** Zwei Läufe/Woche, 4-Wochen-Übersicht ohne Straf-Streaks.
- **Puls-Pace-Vergleich:** Nur vergleichbare Läufe mit ähnlichem Puls und Distanz.
- **Vorsichtige Wettkampf-Einschätzung:** Eine grobe Zeitspanne erst nach mehreren Wochen mit ausreichend Läufen, mindestens einem langen Lauf und einem ausdrücklich markierten, anstrengenden 10-km-Test. Keine medizinische oder sportdiagnostische Aussage.
- **Feedback:** RPE, Notizen und optionale Markierungen für Warnzeichen bzw. 10-km-Test.
- **Privater Coaching-Kontext:** Freie Angaben nur lokal speichern; nicht mehr fest im öffentlichen JavaScript.
- **Backups:** Planänderungen und Coaching-Kontext werden mitgesichert. API-Schlüssel **nicht** im Backup enthalten.

## Vor dem Update: Datensicherung

1. Öffne die bisherige App unter https://seppl230.github.io/Sub-230/.
2. Unter **Einstellungen → JSON-Backup erstellen** eine Sicherung herunterladen. **Nicht auf GitHub hochladen!** Das Backup enthält Trainingsdaten und Notizen.
3. Entpacke `road-to-230-update-v5.zip`.
4. In https://github.com/seppl230/Sub-230 unter **Add file → Upload files** die vier Dateien `index.html`, `app.js`, `styles.css`, `sw.js` hochladen und die vorhandenen Versionen überschreiben.
5. **Commit changes**, in **Actions** das Pages-Deployment abwarten, anschließend die App hart neu laden (Windows: **Strg+F5**, iPhone: App schließen und neu öffnen). Unten muss **Version 6.2** stehen.

Die App nutzt denselben lokalen Speicher wie V4. Intervals.icu-Schlüssel, vorhandene Läufe und deine bereits eingestellten Wochentage sollten im gleichen Browser erhalten bleiben. Der Schlüssel bleibt jeweils an den ursprünglichen Browser gebunden.

## Neue Funktionen nutzen

**Einheit manuell ändern:** Trainingsplan → gewünschte Woche → „Training bearbeiten“ → Werte ändern → Speichern. Mit „Original wiederherstellen“ werden Änderungen dieser Einheit rückgängig gemacht.

**Coach-Änderungen übernehmen:** Nach dem Lauf Coaching-Bericht in ChatGPT einfügen. Bitte den Coach, bei erforderlichen Änderungen einen strukturierten Block auszugeben. Kopiere **nur** den Block ab `ROAD230_UPDATE` bis `END_ROAD230_UPDATE` in **Trainingsplan → Trainingsempfehlung importieren**. Auf **Änderungen prüfen** tippen, Werte kontrollieren und **Geprüfte Änderungen übernehmen** bestätigen.

Beispiel **nur zur Erklärung**, nicht ungeprüft als Trainingsvorgabe übernehmen:

```
ROAD230_UPDATE
{
  "version": 1,
  "workouts": [
    {
      "date": "2026-10-22",
      "title": "Längerer Lauf",
      "distanceKm": 4,
      "paceFrom": "7:30",
      "paceTo": "8:30",
      "zone": 2,
      "structure": "5 Minuten einlaufen, 4 km locker, 5 Minuten ausgehen.",
      "reason": "Belastung kontrolliert halten."
    }
  ]
}
END_ROAD230_UPDATE
```

Das Datum **muss** einem tatsächlichen Trainingstermin im aktuellen Plan entsprechen, andernfalls wird der Import abgelehnt. Das Wettkampfdatum ist für Änderungen gesperrt. Der Import ersetzt nur die konkret aufgeführten Einheiten.

**Einträge auf iPhone übertragen:** Unter Einstellungen Backup exportieren, Datei privat auf das andere Gerät übertragen und dort **Backup importieren**. Das überschreibt dessen lokale Daten und ersetzt **keine** Geräte-Synchronisation. Vor einem Import immer auch auf dem Zielgerät sichern.

## Sicherheit und Grenzen

- Das GitHub-Pages-Repository ist öffentlich. Besucher sehen den Programmcode, aber nicht automatisch Daten in deinem privaten Browser-Speicher.
- **Ältere GitHub-Commits bleiben öffentlich abrufbar.** In früheren Versionen fest hinterlegte biografische Angaben verschwinden durch das Update **nicht** aus der Git-Historie. Falls du diese vollständig aus dem öffentlichen Repository entfernen möchtest, ist ein sauberer Neustart des Repositories ohne alte Commits einfacher als nur Dateien zu überschreiben.
- Ein dauerhaft gespeicherter API-Schlüssel liegt im lokalen Browser-Speicher und ist dort **nicht verschlüsselt**. Nutze für fremde Geräte lieber den Sitzungsmodus und entferne den Schlüssel danach. Den Schlüssel niemals in GitHub, ChatGPT oder Fotos posten.
- Bei problematischem oder eingeschränktem Garmin-/Intervals.icu-Zugriff funktionieren manuelle Lauf-Einträge weiterhin.
- Die App synchronisiert Garmin-Daten bei deinem Klick bzw. beim Öffnen, wenn ein gespeicherter Schlüssel vorhanden ist; kein Hintergrundserver.
- Der Chat läuft weiterhin **separat** in ChatGPT; das Training wird nicht heimlich durch ChatGPT geändert.
- Die gezeigten Trainingsempfehlungen sind kein Ersatz für medizinische Beratung. Bei Schmerzen, Infekt oder anhaltend ungewöhnlicher Erschöpfung reduziere die Belastung bzw. hole ärztlichen Rat ein.
