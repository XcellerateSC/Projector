# XC Projector UI Design System

Dieses Dokument beschreibt die UX/UI-Prinzipien, das visuelle System und die technischen Design-Richtlinien für XC Projector. Es dient als verbindliche Referenz für spätere Umsetzung in Next.js, Tailwind CSS und Komponenten.

Die Grundlage bilden die vorbereitete Design-System-Notiz und das HTML-Blueprint-Beispiel `design1.html`.

## Design Intent

XC Projector ist ein datenintensives B2B-Werkzeug für Projektplanung, Staffing, Kapazitätsmanagement, Zeiterfassung und Reporting.

Die Anwendung ist primär für Desktop-Nutzung gedacht. Das UI soll sich wie ein produktives Arbeitswerkzeug anfühlen, nicht wie eine Marketing-Website. Das wichtigste Ziel ist, komplexe Projekt- und Zeitdaten schnell scannen, vergleichen, pflegen und steuern zu können.

Das UI ordnet sich den Daten unter:

- hohe Informationsdichte statt übermäßiger Luftigkeit
- klare Hierarchie statt dekorativer Flächen
- kompakte Interaktion statt langer Scrollseiten
- ruhige, präzise Darstellung statt visueller Effekte

## Core Principles

### Desktop-App-Feeling

Die Hauptanwendung verhält sich wie eine native Desktop-App.

- Der `body` scrollt nicht global.
- Die App nutzt `h-screen`, `w-screen`, `overflow-hidden` und Flexbox.
- Nur klar definierte innere Inhaltsbereiche dürfen scrollen.
- Scrollbereiche benötigen `min-h-0`, damit sie nicht aus dem Viewport brechen.

### Compact Design

XC Projector nutzt kompakte Paddings, subtile Rahmen und kleine Radien.

- Standard-Gaps: `gap-4`
- Standard-Card-Padding: `p-5`
- Kompakte Listenzeilen: `px-3 py-2`
- Border statt schwerer Schatten: `border border-slate-200`
- Radien: bevorzugt `rounded-md` oder `rounded-lg`

### Master/Detail First

Viele Arbeitsbereiche folgen einem Master/Detail-Muster:

- links eine feste Selektionsliste
- rechts ein flexibler Detailbereich
- der Detailbereich hat einen fixierten Header und eine eigene Scrollfläche

Dieses Muster ist besonders geeignet für Projekte, Mitarbeitende, Kunden, Statusberichte, Timesheets und Staffing-Ansichten.

### Dezente Hervorhebung

Starke Akzentfarben werden sparsam eingesetzt.

- Rot ist für aktive Elemente, primäre Aktionen oder wichtige Aufmerksamkeit reserviert.
- Statusinformationen werden in dichten Listen bevorzugt als kleine Dots dargestellt.
- Große, textlastige Badges werden nur dort genutzt, wo ausreichend Raum vorhanden ist.

## Technical Direction

### Frontend Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide Icons
- Inter als UI-Schrift
- Fira Code für technische Snippets oder monospace Daten

### Tailwind Theme Tokens

Die Kernfarben sollen als `app-*` Tokens im Tailwind Theme verankert werden.

```ts
colors: {
  app: {
    main: "#043E56",
    accent: "#C51F13",
    bg: "#F0F3F5",
    sidebar: "#043E56",
    primary: "#086C96",
    primaryLight: "#E6F0F5",
    success: "#059669",
    successBg: "#D1FAE5",
    warning: "#D97706",
    error: "#DC2626"
  }
}
```

## Color System

### Brand & Core Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `app-main` | `#043E56` | Sidebar, starke Header, Hauptnavigation |
| `app-sidebar` | `#043E56` | globale linke App-Navigation |
| `app-accent` | `#C51F13` | aktive Elemente, primäre Aktionen, linker Active-Streifen |
| `app-bg` | `#F0F3F5` | globaler App-Hintergrund |
| `app-primary` | `#086C96` | fokussierte Zustände, dezente Primärfarbe |
| `app-primaryLight` | `#E6F0F5` | aktive Listenitems, subtile Auswahlflächen |

### Semantic Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `app-success` | `#059669` | erfolgreich, vollständig, gesund |
| `app-successBg` | `#D1FAE5` | sanfter Success-Hintergrund |
| `app-warning` | `#D97706` | Warnung, Konflikt, ausstehend |
| `app-error` | `#DC2626` | Fehler, kritischer Status |

## Typography

### Font Families

- UI: `Inter, sans-serif`
- Code/technical detail: `Fira Code, monospace`

### Type Scale

| Use case | Tailwind |
| --- | --- |
| Tabellen und Listen | `text-[13px]` |
| Subtext und Metadaten | `text-[11px]` oder `text-xs` |
| Labels | `text-[10px] font-bold uppercase` |
| Kachel-Header | `text-xs uppercase tracking-wider font-bold` |
| Detail-Header | `text-lg font-bold` |
| Page Title | `text-xl font-bold` |

Standardtext nutzt `text-slate-800` oder `text-slate-700`. Metadaten nutzen `text-slate-500`. `text-slate-400` ist nur für nicht-essenzielle Informationen erlaubt.

## Global App Layout

Das Basislayout folgt dem HTML-Blueprint.

```tsx
<body className="bg-app-bg text-slate-800 h-screen w-screen overflow-hidden flex">
  <nav className="w-16 bg-app-sidebar text-white shrink-0" />
  <main className="flex-1 flex flex-col min-w-0">
    <header className="h-16 shrink-0 px-6 flex items-center justify-between" />
    <div className="flex-1 flex gap-4 px-6 pb-6 min-h-0" />
  </main>
</body>
```

### Global Sidebar

Die globale Navigation ist kompakt und ikonbasiert.

- Breite: `w-16`
- Hintergrund: `bg-app-sidebar`
- aktive Navigation: dunkler Hintergrund plus linker roter Rand
- Labels in der Sidebar bleiben sehr klein und optional
- Icons kommen aus Lucide

Active State:

```css
.nav-item.active {
  background-color: #033246;
  border-left: 3px solid #C51F13;
}

.nav-item:hover:not(.active) {
  background-color: #032b3d;
}
```

## Master/Detail Layout

Das Standard-Arbeitslayout besteht aus linker Liste und rechtem Detailbereich.

```tsx
<div className="flex-1 flex gap-4 px-6 pb-6 min-h-0">
  <aside className="w-72 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50" />
    <div className="flex-1 overflow-y-auto app-scrollbar p-2 flex flex-col gap-0.5" />
  </aside>

  <section className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
    <div className="border-b border-slate-200 bg-white z-10 px-6 py-4 shrink-0" />
    <div className="flex-1 overflow-y-auto app-scrollbar p-6 bg-slate-50/50" />
  </section>
</div>
```

### Master List

Die linke Liste ist für schnelle Auswahl optimiert.

- Breite: `w-72`
- Header: `px-4 py-3`
- Liste: `p-2`, `gap-0.5`
- Item: `px-3 py-2 rounded-md`
- Hover: `hover:bg-slate-50`
- aktive Auswahl: `bg-app-primaryLight`, `border-app-primary/20`, linker Accent-Streifen

Aktives Listenitem:

```tsx
<div className="px-3 py-2 rounded-md bg-app-primaryLight border border-app-primary/20 cursor-pointer flex justify-between items-center relative overflow-hidden">
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-app-accent" />
  <div className="pl-1.5">
    <div className="font-bold text-[13px] text-app-main">Item Titel</div>
    <div className="text-[11px] text-slate-500">Subtext</div>
  </div>
  <div className="w-1.5 h-1.5 rounded-full bg-app-accent" />
</div>
```

### Detail Area

Der rechte Bereich ist der Arbeitsbereich.

- Header fixiert: `shrink-0`
- Header Padding: `px-6 py-4`
- Scrollbereich: `flex-1 overflow-y-auto app-scrollbar`
- Hintergrund im Scrollbereich: `bg-slate-50/50`
- Inhalt zentriert: `max-w-5xl mx-auto`
- Abstand zwischen Content-Komponenten: `gap-4`

## Cards & Content Panels

Cards werden für inhaltliche Blöcke, Detailabschnitte und Werkzeuge genutzt. Sie sollen ruhig und kompakt bleiben.

```tsx
<div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
  ...
</div>
```

Regeln:

- Keine verschachtelten Karten, wenn ein einfacher Abschnitt reicht.
- Keine übergroßen Marketing-Kacheln.
- Kartenüberschriften klein, klar und scannbar.
- Primäre Daten sollen oberhalb des Falzes sichtbar bleiben.

## Tables & Dense Lists

Tabellen und Listen sind zentrale UI-Flächen.

- Trennung über `border-slate-100` oder `border-slate-200`
- wenig vertikales Padding
- kein Zebra-Striping als Standard
- Hover-State statt starker Flächenfarbe
- Status als Dot am rechten Rand
- essenzielle Werte mit `text-slate-700` oder `text-slate-900`

## Forms & Inputs

Formulare sind kompakt und datenorientiert.

Inputs:

```tsx
<input className="bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-app-primary focus:border-app-primary" />
```

Labels:

```tsx
<label className="text-[10px] font-bold text-slate-400 uppercase mb-1" />
```

Regeln:

- keine harten schwarzen Focus-Ränder
- klare visuelle Gruppierung
- kompakte vertikale Abstände
- Pflichtfelder und Validierung deutlich, aber nicht laut

## Status Indicators

In dichten Listen werden Statusinformationen als Dots dargestellt.

```tsx
<div className="w-1.5 h-1.5 rounded-full bg-app-success" title="Success" />
```

Empfohlene Zuordnung:

- `app-success`: vollständig, gesund, submitted
- `app-warning`: Konflikt, offen, überbucht, missing
- `app-error`: kritisch, blockiert, fehlerhaft
- `slate-300`: neutral, nicht gestartet, ohne Status

Text-Badges sind Detailbereichen, Headern oder Summary-Flächen vorbehalten.

## Scrollbars

Nur innere Container scrollen. Scrollbars sind sichtbar, aber dezent.

```css
.app-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.app-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.app-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}

.app-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #94a3b8;
}
```

## Page Templates

### Operational Module

Für Module wie Projekte, Mitarbeitende, Kunden, Timesheets oder Statusberichte:

1. globale Sidebar
2. globaler Page Header
3. Master List links
4. Detail Header rechts
5. scrollbarer Detail Content

### Dashboard Module

Für Portfolio-, Kapazitäts- oder Reporting-Views:

- gleiche App-Shell
- keine Marketing-Hero-Flächen
- kompakte Summary-Zeilen
- Dots, kleine Badges und Tabellen vor großen Cards
- Drill-downs in Master/Detail-Strukturen

## Accessibility

- `app-main` und `app-accent` bieten hohen Kontrast auf Weiß.
- `text-slate-400` nur für nicht-essenzielle Metadaten verwenden.
- Essenzielle Daten mindestens `text-slate-700`.
- Icons brauchen sichtbare Labels oder Tooltips, wenn ihre Bedeutung nicht offensichtlich ist.
- Focus States müssen sichtbar bleiben.

## Responsive Behavior

XC Projector ist desktop-first.

- Zielviewport ab `1024px`
- Desktop-Erfahrung hat Priorität
- Master/Detail bleibt das Standardmodell
- Mobile wird später über Offcanvas-Masterliste oder gestapelte Detailansichten gelöst

Für die erste Entwicklungsphase werden komplexe Mobile-Breakpoints bewusst nachrangig behandelt. Die Desktop-Nutzung muss zuerst sehr gut sein.

## Implementation Rules

- Tailwind Tokens für Farben verwenden, keine verstreuten Hex-Werte in Komponenten.
- Lucide Icons für Navigation, Buttons und Toolbars verwenden.
- `min-h-0` in Flex-Layouts konsequent setzen, sobald innere Scrollbereiche existieren.
- `body` und App-Shell global gegen Scrollen sperren.
- Große Whitespace-Flächen vermeiden.
- Aktive Auswahl immer klar, aber kompakt darstellen.
- Datenreiche Views zuerst als Listen, Tabellen oder Master/Detail-Flächen denken.
