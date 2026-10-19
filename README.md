# Road to 2:30 – dein kostenloses iPhone-Halbmarathon-Cockpit

Ein kleiner, direkt benutzbarer PWA-Prototyp für **Sub 2:30 im April 2027**, zwei Laufeinheiten pro Woche und Garmin-basierte Laufdaten. Die App braucht **keinen eigenen Server, keine Datenbank und keine OpenAI-API**. Es gibt keine laufenden Pflichtkosten für die bereitgestellte Version.

## 1. Sofort ansehen

`index.html` in einem Desktop-Browser öffnen. Ohne Einrichtung funktionieren Trainingsplan, Roadmap, manuelles Lauftagebuch, Auswertung und der Copy-to-ChatGPT-Knopf. Die Garmin-Verbindung und iPhone-Installation funktionieren zuverlässiger, wenn die App über HTTPS gehostet wird (s.u.).

## 2. Kostenlos dauerhaft aufs iPhone bringen

1. Kostenloses GitHub-Konto nutzen bzw. erstellen: https://github.com/
2. Neues **öffentliches** Repository erstellen, z.B. `road-to-230`. (Die Programmdateien enthalten keine persönlichen Zugangsdaten.)
3. Alle Dateien aus diesem Ordner in das Repository hochladen, **nicht den ZIP-Ordner als ZIP-Datei**.
4. Unter **Settings → Pages** die Veröffentlichung über **Deploy from a branch**, Branch `main`, Folder `/(root)` aktivieren.
5. Die auf GitHub Pages angezeigte HTTPS-Adresse in Safari auf dem iPhone öffnen.
6. **Teilen → Zum Home-Bildschirm → Als Web-App öffnen** aktivieren.

**Wichtig:** GitHub Pages ist öffentlich. Keine privaten Laufdaten oder API-Schlüssel in GitHub-Dateien eintragen. Schlüssel werden erst in den Einstellungen auf dem eigenen Gerät eingegeben.

## 3. Garmin verbinden (zunächst testen)

1. Auf https://intervals.icu/ ein Konto erstellen. Garmin Connect in Intervals.icu unter Einstellungen verbinden.
2. Unter **Intervals.icu → Settings → Developer Settings** einen persönlichen API-Schlüssel erstellen.
3. Nur im Einstellungsbildschirm der installierten Road-to-2:30-App einfügen. **Niemals hier im Chat, in GitHub oder in öffentlichen Dateien teilen.**
4. **Verbindung testen und synchronisieren** antippen. Die App ruft die offizielle `https://intervals.icu/api/v1/athlete/0/activities`-Schnittstelle ab. Bei gespeichertem Schlüssel synchronisiert sie beim Öffnen.

**Achtung (Stand Oktober 2026):** Garmin und Intervals.icu besprechen Beschränkungen bei der Weitergabe von Garmin-Daten über Drittanbieter-APIs. Es kann sein, dass Daten in der App nicht abrufbar sind. Das Dashboard funktioniert auch mit manuellen Läufen. Die Verfügbarkeit kann sich ändern.

**Datenschutz:** Nur HTTPS-Verbindungen zur Intervals.icu-API; keine Weiterleitung des Schlüssels an einen eigenen Server. Mit der Checkbox „Schlüssel auf diesem Gerät speichern“ wird der Schlüssel unverschlüsselt im lokalen Browser-Speicher gespeichert (bequem, aber bei kompromittiertem Gerät riskanter). Ohne Checkbox wird er nur für die aktuelle Browser-Sitzung gespeichert. In beiden Fällen darf das Gerät nicht von Fremden benutzt werden. Über „Schlüssel entfernen“ lässt sich der Schlüssel aus der App löschen. Bereits synchronisierte Daten verbleiben bis zum Zurücksetzen im lokalen Browser.

## 4. Mit ChatGPT trainieren

1. Unter „Training“ bei einer Aktivität auf **„Wie war es? Feedback geben“** tippen und dein Belastungsempfinden sowie eine kurze Notiz speichern.
2. Danach auf „KI-Coach“ tippen.
3. „Zusammenfassung kopieren“ auswählen.
4. „ChatGPT öffnen“ tippen, dort **unseren bestehenden Halbmarathon-Chat** öffnen und den Text einfügen.
5. So bekommst du personalisiertes Feedback **ohne separate OpenAI-API-Rechnung**.

Das ist kein eingebetteter Chat und keine automatische KI-Auswertung. Für Letzteres wären eine andere technische Lösung und ggf. eigene API-Kosten notwendig.

## 5. Erinnerungen

Unter „Trainingsplan“ Wochentage/Uhrzeiten wählen und **Kalendererinnerungen erstellen**. Eine `.ics`-Datei mit wiederkehrenden Kalendereinträgen bis Ende April 2027 wird erzeugt, jeweils mit 30-minütigem Alarm. Diese Datei im iPhone-Kalender importieren. Manche iPhone-Konfigurationen erfordern Import über die Dateien-App oder Mail. Der Plan im Dashboard lässt sich momentan unabhängig davon nicht automatisch in bestehende Kalendereinträge zurückschreiben.

## 6. Einschränkungen und nächste sinnvolle Verbesserungen

- Garmin-Daten nur bei geöffnetem Dashboard abrufen; kein Hintergrundsync und keine Push-Auswertung nach jedem Lauf.
- Garmin-API-Zugriff über Drittanbieter kann derzeit eingeschränkt werden.
- Keine automatische Wettkampfzeitvorhersage auf Basis weniger Trainingsdaten; die Roadmap zeigt **Richtwerte**, nicht medizinisch validierte Empfehlungen.
- Der langfristige Plan ist ein Startvorschlag; je nach Eis-Schiedsrichtereinsätzen, Trainingserholung und genauem April-Wettkampftag anpassen.
- Laufdaten und manuelle Kommentare verbleiben lokal im Browser (lokaler Speicher). **JSON-Backups regelmäßig erstellen** – beim Leeren von Safari-Websitedaten können die Einträge verschwinden.
- Diese Version ist privat gedacht. Eine Multi-User-App benötigt andere Authentifizierung und Infrastruktur.

## Dateiliste

- `index.html` – App-Oberfläche
- `styles.css` – mobiles Design
- `app.js` – Trainingstagebuch, Garmin-Abfrage, Coach-Export, Erinnerungen
- `sw.js` – Offline-Verfügbarkeit der App-Shell
- `manifest.webmanifest`, `icon-*.png` – Installation als iPhone-Web-App

Kein Build, keine Installation von Paketen, keine Tracking- oder Analyse-Skripte erforderlich.
