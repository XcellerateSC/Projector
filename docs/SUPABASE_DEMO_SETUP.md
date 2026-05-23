# Supabase Demo Setup

Dieses Dokument beschreibt den ersten Supabase-Durchstich für die XC Projector Demo.

Ziel dieses Schritts:

- Supabase Auth als zentrale User-Quelle
- `profiles` als App-Profil je Auth-User
- drei Systemrollen für den MVP
- vier Demo-User für erste Zugriffstests

## Rollen

Die Demo nutzt die Rollen aus dem Product Design:

| Rolle | Bedeutung |
| --- | --- |
| `portfolio_manager` | Admin-Rolle für die Demo und den MVP |
| `project_lead` | Projektmanager bzw. Projektleiter |
| `employee` | Consultant bzw. normaler Mitarbeitender |

## Migration Ausführen

Die SQL-Migration liegt unter:

```txt
supabase/migrations/202605230001_initial_auth_profiles.sql
```

Für den ersten manuellen Durchstich kann sie im Supabase Dashboard ausgeführt werden:

1. Supabase Projekt öffnen.
2. SQL Editor öffnen.
3. Inhalt der Migration einfügen.
4. Query ausführen.

Später kann dieselbe Migration über die Supabase CLI versioniert angewendet werden.

## Demo-User

Die Auth-User werden nicht als SQL-Seed ins Repo gelegt, weil Passwörter und Auth-Credentials nicht versioniert werden sollen.

Empfohlene Demo-User:

| Name | E-Mail | Rolle | Professional Grade |
| --- | --- | --- | --- |
| Paula Portfolio | `paula.portfolio@xcellerate-demo.ch` | `portfolio_manager` | Partner |
| Peter Project | `peter.project@xcellerate-demo.ch` | `project_lead` | Manager |
| Carla Consultant | `carla.consultant@xcellerate-demo.ch` | `employee` | Senior Consultant |
| Chris Consultant | `chris.consultant@xcellerate-demo.ch` | `employee` | Consultant |

## User Anlegen

Im Supabase Dashboard:

1. `Authentication` öffnen.
2. `Users` öffnen.
3. Neuen User anlegen.
4. E-Mail und temporäres Demo-Passwort setzen.
5. User-Metadaten passend ergänzen.

Beispiel für `paula.portfolio@xcellerate-demo.ch`:

```json
{
  "full_name": "Paula Portfolio",
  "system_role": "portfolio_manager",
  "professional_grade": "Partner",
  "business_unit": "Consulting",
  "location": "Zurich"
}
```

Beispiel für `peter.project@xcellerate-demo.ch`:

```json
{
  "full_name": "Peter Project",
  "system_role": "project_lead",
  "professional_grade": "Manager",
  "business_unit": "Consulting",
  "location": "Zurich"
}
```

Beispiel für Consultants:

```json
{
  "full_name": "Carla Consultant",
  "system_role": "employee",
  "professional_grade": "Senior Consultant",
  "business_unit": "Consulting",
  "location": "Zurich"
}
```

```json
{
  "full_name": "Chris Consultant",
  "system_role": "employee",
  "professional_grade": "Consultant",
  "business_unit": "Consulting",
  "location": "Zurich"
}
```

Beim Erstellen eines Auth-Users legt der Trigger automatisch den passenden Eintrag in `public.profiles` an.

Wenn die User bereits vor der Migration angelegt wurden, erzeugt die Migration ebenfalls fehlende Profile aus `auth.users`. Falls die Migration bereits vorher ausgeführt wurde und danach User manuell ohne Metadaten angelegt wurden, können die Profilfelder direkt im Table Editor gepflegt werden:

```txt
Table Editor -> public -> profiles
```

Für das Dashboard sind besonders diese Felder wichtig:

- `full_name`
- `system_role`
- `professional_grade`
- `business_unit`
- `location`

Die Rolle muss einen dieser Werte haben:

- `portfolio_manager`
- `project_lead`
- `employee`

## Environment Variables

Lokal:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_USER_PASSWORD=
```

Diese Werte gehören in `.env.local`. Die Vorlage liegt in `.env.example`.

`NEXT_PUBLIC_DEMO_USER_PASSWORD` ist nur für die Demo-Switch-Funktion gedacht. Alle vier Demo-User müssen dafür dasselbe Demo-Passwort haben. Für echte produktive Auth-Flows wird diese Variable später wieder entfernt.

Vercel:

1. Vercel Projekt öffnen.
2. `Settings` -> `Environment Variables`.
3. `NEXT_PUBLIC_SUPABASE_URL` setzen.
4. `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen.
5. `NEXT_PUBLIC_DEMO_USER_PASSWORD` setzen, solange die Demo-Switch-Funktion aktiv ist.
6. Für Production und Preview aktivieren.
7. Deployment neu starten.

## Aktueller Scope

Diese erste Migration bildet nur Auth-Profile und Rollen ab.

Die App nutzt diese Daten bereits für:

- Login über Supabase Auth
- Weiterleitung auf `/dashboard`
- Laden des aktuellen `profiles`-Datensatzes
- rollenbasierte Demo-Navigation
- Demo-Wechsel zwischen den vier vorbereiteten Demo-Usern

Noch nicht enthalten:

- Portfolios
- Projekte
- Projektpositionen
- Assignments
- Timesheets
- Statusberichte

Diese Tabellen folgen im nächsten Schema-Slice, sobald die Demo-Login-Verbindung steht.
