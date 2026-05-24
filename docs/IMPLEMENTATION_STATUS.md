# XC Projector Implementation Status

Stand: 24. Mai 2026

## Zielbild

XC Projector wird als Web-App fuer Projektmanagement, Staffing und Zeiterfassung aufgebaut. Die App nutzt:

- Next.js als Frontend/App-Framework
- Supabase fuer Auth, Rollen, Datenbank und Row Level Security
- Vercel fuer Deployment
- GitHub `XcellerateSC/Projector` als Repository

Die Demo soll zuerst mit vier Usern funktionieren:

- Portfolio Manager als Admin
- Projektmanager bzw. Project Lead
- zwei Consultants bzw. Employees

## Bisher Umgesetzt

### Produkt- und Design-Grundlagen

- Product Design Dokument gesichtet und bereinigt.
- "Programm" aus dem Zielbild entfernt, Portfolio reicht fuer den MVP.
- Separates UI Design System als Markdown abgelegt.
- Erste Designrichtung aus HTML-Referenz in die App uebertragen.
- Grundsatz fuer Navigation festgelegt:
  - linke Navbar als Hauptnavigation
  - konsistente Reihenfolge fuer alle Rollen
  - rollenbasierte Zusatzbereiche optisch getrennt

### App Foundation

- Next.js Projekt als erste lauffaehige Web-App aufgebaut.
- Login-Seite als erste visuelle Pipeline-Seite erstellt.
- App Shell mit linker Navigation aufgebaut.
- Demo User Switcher in der unteren Navbar eingebaut.
- Basisrouten erstellt:
  - `/`
  - `/dashboard`
  - `/people`
  - `/projects`
  - `/timesheets`

### Supabase Auth und Rollen

- Supabase Auth angebunden.
- `profiles` Tabelle mit Rollenmodell erstellt.
- Rollen:
  - `portfolio_manager`
  - `project_lead`
  - `employee`
- Trigger fuer automatische Profile aus Auth-Usern erstellt.
- RLS fuer Profile eingerichtet.
- Demo-User Setup dokumentiert.

### People

- People-Seite als kompakte Mitarbeiteruebersicht aufgebaut.
- Rolle, Grade, Business Unit, Standort und Projektbezug vorbereitet.
- People ist aktuell vor allem Directory/Telefonbuch und spaeter Basis fuer Staffing.

### Projects

- Projektseite als funktionaler erster MVP-Slice aufgebaut.
- Tabs:
  - Overview
  - Charter
  - Staffing
- Financials und Status Reports bewusst ausgespart.
- Projektliste, Details, Charter und Staffing sind an Supabase angebunden.
- Charter kann gespeichert werden.
- Projektpositionen koennen angelegt werden.
- Assignments koennen einer Planposition hinzugefuegt werden.
- Project Leads koennen im Timesheets-Tab projektbezogen pruefen, welche Rollen und Mitarbeitenden pro Woche Projektzeit gebucht haben.

### Staffing

- Staffing wurde kompakter aufgebaut.
- Planpositionen enthalten:
  - Rolle/Titel
  - Professional Grade
  - Von/Bis Zeitraum
  - geplante Allocation
  - Skills
  - Status
- Assignments sind getrennt von Planpositionen modelliert, weil eine Planposition ueber Zeit von mehreren Personen besetzt werden kann.

### Timesheets

- Wochenbasierte Zeiterfassung aufgebaut.
- Jahr-Dropdown plus volle 53-KW-Liste.
- Wochen-Ampeln:
  - Vergangenheit offen: rot
  - abgeschlossen/bereit: gruen
  - aktuelle Woche: blau
  - Zukunft: grau
- Standard-Internal-Rows:
  - Internal admin & meetings
  - Weiterbildung
  - Ferien-Anspruch
  - Krankheit
- Zusaetzliche interne Konten koennen per Add Row eingeblendet werden.
- Projektzeilen entstehen aus aktiven Staffing Assignments.
- Stunden und Beschreibung werden in Supabase `time_entries` gespeichert.
- Submit und Reset sind vorbereitet.

### Datenbank Schema

Neue fachliche Tabellen wurden vorbereitet:

- `portfolios`
- `customers`
- `projects`
- `project_charters`
- `project_positions`
- `project_assignments`
- `internal_time_account_types`
- `weekly_timesheets`
- `time_entries`

Migrationen:

- `supabase/migrations/202605230001_initial_auth_profiles.sql`
- `supabase/migrations/202605240001_projects_staffing_timesheets.sql`
- `supabase/migrations/202605240002_fix_timesheet_rls_insert.sql`
- `supabase/migrations/202605240003_project_timesheet_review_rls.sql`

Der zweite und dritte SQL-Slice enthalten RLS-Policies, Seed-Daten und einen Fix fuer das sichere Anlegen von Wochen-Timesheets.
Der vierte SQL-Slice erlaubt Project Leads das Lesen von Projekt-Zeiteintraegen fuer ihre eigenen Projekte.

### Deployment Pipeline

- Lokales Laufen via `npm run dev` getestet.
- Vercel Deployment eingerichtet.
- Environment Variables fuer Supabase und Demo Switch dokumentiert.
- GitHub Push/Commit Workflow wurde bereits mehrfach genutzt.

## Aktueller Technischer Stand

Lokale Checks:

- `npm.cmd run lint` laeuft erfolgreich.
- `npm.cmd run build` laeuft erfolgreich.

Aktuell uncommitted im Workspace:

- Projektdaten-/Staffing-Slice
- Timesheets-Slice
- neue Supabase-Migrationen
- CSS fuer Projects/Timesheets
- aktualisierte Supabase Setup Doku

Wichtig: Die neueste Timesheet-Funktion nutzt den Supabase RPC:

```sql
public.ensure_weekly_timesheet(...)
```

Daher muss `202605240002_fix_timesheet_rls_insert.sql` in Supabase ausgefuehrt sein, bevor Zeiterfassung korrekt funktioniert.

## Bekannte Punkte

- Supabase SQL Editor zeigt Warnungen zu destruktiven Operationen und RLS. Fuer diese Migrationen ist `Run without RLS` korrekt, weil die Migration RLS selbst aktiviert.
- Der erste Timesheet-RLS-Ansatz hatte eine Policy-Rekursion. Das wurde durch Security-Definer Helper und den RPC-Fix entschaerft.
- Die App schreibt aktuell beim Aendern eines Felds direkt in Supabase. Das funktioniert, ist aber UX-seitig noch nicht ideal fuer schnelles Tippen.
- Add Position und Add Assignment nutzen aktuell einfache `window.prompt` Dialoge. Das ist fuer den Demo-Slice okay, sollte aber bald durch echte Modals ersetzt werden.
- Es gibt noch keine saubere Create/Edit UI fuer Projekte, Kunden und Portfolios.
- Financials und Status Reports sind absichtlich noch nicht umgesetzt.

## Sinnvolle Naechste Schritte

### 1. Aktuellen Stand stabilisieren

- `202605240002_fix_timesheet_rls_insert.sql` in Supabase ausfuehren.
- Lokal oder auf Vercel mit allen Demo-Usern testen:
  - Paula Portfolio
  - Peter Project
  - Carla Consultant
  - Chris Consultant
- Danach aktuellen Code committen und pushen.

### 2. Timesheet UX verbessern

- Eingaben lokal puffern und erst nach Blur, Enter oder Save speichern.
- Visuelles Save-Feedback je Zeile einfuehren.
- Submitted-Wochen sperren oder mit klarer Reopen-Logik versehen.
- Wochenstatus serverseitig konsistenter berechnen.

### 3. Staffing UI produktiver machen

- `window.prompt` durch kompakte Modals ersetzen.
- Assignment-Erstellung mit Employee Dropdown, Zeitraum und Allocation.
- Position-Erstellung mit Rolle, Grade, Zeitraum, Allocation und Skills.
- Konfliktpruefung fuer Ueberbuchung vorbereiten.

### 4. Project Administration

- Projekt anlegen/bearbeiten.
- Kunde anlegen/bearbeiten.
- Portfolio anlegen/bearbeiten.
- Projekt Lead sauber auswahlen.
- Rollenbasierte Sichtbarkeit der Admin-Funktionen verfeinern.

### 5. Dashboard sinnvoll machen

- Portfolio Manager Dashboard:
  - Portfolio Health
  - offene Staffing Luecken
  - nicht abgeschlossene Timesheets
- Project Lead Dashboard:
  - eigene Projekte
  - Staffing Status
  - Team Timesheet Status
- Employee Dashboard:
  - aktuelle Woche
  - eigene Assignments
  - offene Timesheets

### 6. Datenmodell haerten

- Supabase Types fuer TypeScript generieren.
- RLS Policies weiter testen und vereinfachen.
- Constraints fuer Assignment-Zeitraeume und Allocation-Logik nachziehen.
- Seed-Daten besser von echten Demo-Daten trennen.

### 7. Danach erst Financials und Reports

Financials und Status Reports sollten erst kommen, wenn Projects, Staffing und Timesheets stabil laufen. Dann koennen sie sinnvoll auf echten Plan-/Ist-Daten aufbauen.

## Empfehlung

Der naechste beste Schritt ist: Timesheet-RLS-Fix in Supabase ausfuehren, Zeiterfassung mit Carla oder Chris testen, dann den aktuellen Stand committen und nach Vercel pushen. Danach lohnt sich als naechstes die Verbesserung der Staffing- und Timesheet-Interaktionen, weil diese beiden Bereiche das fachliche Rueckgrat der Demo bilden.
