# Solu Notes UI Screen Specification / Screen Inventory

## 1. Purpose

This document defines the current Solu Notes screen inventory and the expected UI behavior of each major screen, panel, modal, and system interaction. It is intended to support:
- rewrite planning
- UX preservation during a codebase rewrite
- screen-by-screen implementation alignment
- reduction of layout and navigation guesswork

This document is based on:
- the current application behavior
- the screenshot set in `docs/ui_screens/`
- the user-provided notes in `docs/ui_screens/screenshots_notes.xlsx`

## 2. Scope

This document covers:
- the app shell
- the three-pane main workspace
- global sections such as Supervision and CPD
- panel 3 note detail screens
- calendar screens and overlays
- reports screens
- therapist details and client info panels
- backup / restore dialogs
- theme selection surfaces
- system-generated overlays such as in-app appointment notifications

This document does not define:
- database schema details
- backend API contracts
- business rules in exhaustive detail

Those are covered in:
- `docs/Solu_Notes_Functional_Specification.md`
- `docs/Solu_Notes_Data_Model_Entity_Map.md`

## 3. Global Layout Rules

### 3.1 App Shell

Current global structure:
- desktop app shell with top macOS menu bar integration
- main window hosts the three-pane workspace
- reports are opened through menu navigation rather than from panel 1 link

Persistent layout concept:
- panel 1: clients and global navigation
- panel 2: note list / section list
- panel 3: selected note editor or calendar workspace

### 3.2 Main Navigation Principles

Must preserve:
- three-pane structure as the default working environment
- sticky bottom area in panel 1 containing:
  - supervision card
  - CPD card
  - calendar entry button
  - summary box
- panel 2 section title and `+ New Note` placement
- panel 3 as the main editing canvas
- top menu access for:
  - reports
  - therapist details
  - backup / restore
  - theme toggle

May change in rewrite:
- exact spacing
- exact font sizing
- local control proportions
- component polish and animation

### 3.3 Theme Rules

Current product supports:
- dark mode
- light mode

Must preserve:
- both themes
- theme-aware icon swapping where already implemented
- readable contrast in all screens

## 4. Screen Inventory

### 4.1 App Shell

Reference screenshot:
- `docs/ui_screens/App Shell.png`

Screen name:
- Initial Screen / App Just Opened

Purpose:
- default dashboard state immediately after app launch

Primary content:
- full three-pane app shell
- panel 1 client structure visible
- no explicit reports shortcut on this screen

Must keep:
- page structure
- pane architecture
- panel 1 architecture

Can change:
- exact spacing
- exact font sizing

Notes:
- access to Reports, Therapist Details, and Dark Mode is via top menu, not visible as direct controls on this screen

### 4.2 Panel 1 Clients - Active

Reference screenshot:
- `docs/ui_screens/Panel 1 Clients.png`

Purpose:
- default client browsing state

Primary content:
- `Clients` heading
- create new client button
- status filter dropdown
- search field
- scrolling client card list
- sticky footer area with Supervision, CPD, calendar, and summary

Must keep:
- same available options
- active / archived / waiting list filtering concept

Can change:
- exact spacing
- exact font sizing

Notes:
- client status selection happens inside Client Info panel
- default status is Active

### 4.3 Panel 1 Clients - Archived

Reference screenshot:
- `docs/ui_screens/Panel 1 Clients - Archived.png`

Purpose:
- archived client browsing state

Must keep:
- archived filter option
- panel 1 filtering flow

Can change:
- exact spacing
- exact font sizing

### 4.4 Panel 1 Clients - Waiting List

Reference screenshot:
- `docs/ui_screens/Panel 1 Clients - Waiting.png`

Purpose:
- waiting-list client browsing state

Must keep:
- waiting-list filter option
- same client-list interaction model

Can change:
- exact spacing
- exact font sizing

### 4.5 Panel 1 Clients - Search

Reference screenshot:
- `docs/ui_screens/Panel 1 Clients - Search.png`

Purpose:
- searching within the current filter context

Must keep:
- search field presence in panel 1
- search as part of client-list workflow

Can change:
- exact spacing
- exact font sizing
- visual search treatment

### 4.6 Client Info Panel - Top Section

Reference screenshot:
- `docs/ui_screens/Client Info Panel 1.png`

Screen name:
- Client Info panel for add/edit, top section

Purpose:
- capture and edit client identity and key operational fields

Primary content:
- header with edit/create context
- status dropdown
- delete action
- personal information section
- session/hourly rate
- therapy modality

Must keep:
- same available options as current overlay
- client info as the central place for client record management

Can change:
- exact spacing
- exact font sizing

### 4.7 Client Info Panel - Bottom Section

Reference screenshot:
- `docs/ui_screens/Client Info Panel 2.png`

Purpose:
- capture remaining client record details

Primary content:
- contact information
- address
- emergency contact
- GP details
- save / cancel actions

Must keep:
- same available options as current overlay

Can change:
- exact spacing
- exact font sizing

### 4.8 Panel 2 Client Notes

Reference screenshot:
- `docs/ui_screens/Panel 2 Client Notes.png`

Purpose:
- display note cards for the selected client

Primary content:
- mixed list of Session and Assessment cards
- sort control
- `+ New Note` action
- bottom summary box

Must keep:
- same available options
- client-specific note list behavior
- note card selection model
- bottom client summary box

Can change:
- exact spacing
- exact font sizing
- card polish if content hierarchy stays intact

### 4.9 Panel 2 CPD

Reference screenshot:
- `docs/ui_screens/Panel 2 CPD.png`

Purpose:
- display CPD-only note list

Primary content:
- CPD card list
- sort control
- `+ New Note`
- CPD bottom summary box

Must keep:
- same section-specific options
- dedicated CPD section behavior

Can change:
- exact spacing
- exact font sizing

### 4.10 Panel 2 Supervision

Reference screenshot:
- `docs/ui_screens/Panel 2 Supervision.png`

Purpose:
- display supervision-only note list

Primary content:
- supervision card list
- sort control
- `+ New Note`
- supervision bottom summary box

Must keep:
- dedicated supervision section behavior
- supervision list in panel 2

Can change:
- exact spacing
- exact font sizing

Note:
- the workbook row labels this as CPD; the screenshot file and current product behavior indicate this is the supervision screen

### 4.11 Panel 3 Session Note

Reference screenshot:
- `docs/ui_screens/Panel 3 Session Note.png`

Purpose:
- edit a selected session note

Primary content:
- note title/header
- therapy modality display in header area
- date field
- duration field
- paid checkbox
- invoice button
- session type radio controls
- main rich text editor
- collapsible personal notes section
- save / delete actions

Must keep:
- same available options
- personal notes collapsible behavior
- rich text options:
  - bold
  - italic
  - underline
  - heading / subtitle / paragraph
  - text color
  - bullet list
- personal notes excluded from reports
- invoice button placement/functionality as a session-note action

Can change:
- exact spacing
- exact font sizing

### 4.12 Panel 3 Assessment Note

Reference screenshot:
- `docs/ui_screens/Panel 3 Assessment Note.png`

Purpose:
- edit a selected assessment note

Primary content:
- same broad structure as session note
- invoice button
- paid checkbox
- session type radios
- rich text editor
- personal notes section
- therapy modality shown in header area

Must keep:
- same available options
- personal notes collapsible behavior
- same rich text formatting tools
- personal notes excluded from reports

Can change:
- exact spacing
- exact font sizing

### 4.13 Panel 3 Supervision Note - Top Section

Reference screenshot:
- `docs/ui_screens/Panel 3 Supervision Note A.png`

Purpose:
- top half of supervision note editing state

Primary content:
- date
- duration
- paid checkbox
- session type radios
- supervisor details field
- rich text editor

Must keep:
- supervision-specific fields
- same available options

Can change:
- exact spacing
- exact font sizing

### 4.14 Panel 3 Supervision Note - Bottom Section

Reference screenshot:
- `docs/ui_screens/Panel 3 Supervision Note B.png`

Purpose:
- lower supervision note content and actions

Primary content:
- summary field
- personal notes section
- save / delete actions

Must keep:
- summary field
- personal notes collapsible behavior
- same rich text formatting tools for personal notes
- personal notes excluded from reports

Can change:
- exact spacing
- exact font sizing

### 4.15 Panel 3 CPD Note - Top Section

Reference screenshot:
- `docs/ui_screens/Panel 3 CPD Note A.png`

Purpose:
- top half of CPD note editing state

Primary content:
- date
- organisation
- title
- focus/outcome editor

Must keep:
- same available fields
- CPD-specific structure distinct from client notes

Can change:
- exact spacing
- exact font sizing

### 4.16 Panel 3 CPD Note - Bottom Section

Reference screenshot:
- `docs/ui_screens/Panel 3 CPD Note B.png`

Purpose:
- lower CPD note content and actions

Primary content:
- duration hours
- medium selector
- link field
- save / delete actions

Must keep:
- same available options
- link field behavior

Can change:
- exact spacing
- exact font sizing

### 4.17 Calendar Weekly View

Reference screenshot:
- `docs/ui_screens/Calendar Week.png`

Purpose:
- manage appointments in weekly time-grid format

Primary content:
- today / previous / next navigation
- week / month / year view switch
- `+ New Appointment`
- time grid with appointment chips

Must keep:
- same available options in the calendar workspace
- week view as a working scheduling view

Can change:
- exact spacing
- exact font sizing
- visual calendar component treatment if behavior stays consistent

### 4.18 Calendar Monthly View

Reference screenshot:
- `docs/ui_screens/Calendar Month.png`

Purpose:
- monthly appointment overview

Must keep:
- monthly navigation and appointment visibility

Can change:
- exact spacing
- exact font sizing

### 4.19 Calendar Yearly View

Reference screenshot:
- `docs/ui_screens/Calendar Year.png`

Purpose:
- annual appointment overview

Must keep:
- yearly navigation and date-level appointment indication

Can change:
- exact spacing
- exact font sizing

### 4.20 Calendar Adding Appointment Overlay

Reference screenshot:
- `docs/ui_screens/Calendar Adding Appointment.png`

Purpose:
- create a one-off or recurring appointment

Primary content:
- client dropdown
- repeats dropdown
- date picker for first appointment
- end occurrence dropdown
- start/end time fields
- save / cancel actions

Must keep:
- current set of available options
- recurring appointment inputs

Can change:
- exact spacing
- exact font sizing

Notes:
- workbook explicitly expects:
  - repeating options dropdown with `Never` and `Weekly`
  - end occurrence options including `Never`, `On Date`, `After N sessions`

### 4.21 Calendar Editing Appointment Overlay

Reference screenshot:
- `docs/ui_screens/Calendar Editing Appointment.png`

Purpose:
- modify or remove an existing appointment

Primary content:
- edit appointment context
- delete occurrence / delete series options
- move appointment option

Must keep:
- same available options

Can change:
- exact spacing
- exact font sizing

### 4.22 In-App Appointment Notification

Reference screenshot:
- `docs/ui_screens/in app appointment notification.png`

Purpose:
- show today’s sessions summary on app open and before upcoming appointments

Must keep:
- notification popup concept
- appointment awareness on app opening and before due time

Can change:
- exact spacing
- exact font sizing
- presentation polish

Note:
- workbook note says “10 minutes before”; current implemented behavior should be cross-checked against the functional spec if exact trigger timing must be preserved

### 4.23 Reports Page - Top Section

Reference screenshot:
- `docs/ui_screens/Report Page.png`

Purpose:
- configure report generation inputs

Primary content:
- date range inputs
- client / CPD / supervision selector
- generate / export actions

Must keep:
- same available options
- report selection logic
- PDF export available from this area

Can change:
- exact spacing
- exact font sizing

Notes:
- on-screen preview is excerpt-only; PDF export includes full notes

### 4.24 Reports - Date Selector

Reference screenshot:
- `docs/ui_screens/Reports Date Selector.png`

Purpose:
- define report timeframe

Must keep:
- date picker interaction for report timeframe selection

Can change:
- exact spacing
- exact font sizing

### 4.25 Reports - Client Selector

Reference screenshot:
- `docs/ui_screens/Reports Client Selector.png`

Purpose:
- choose report target

Must keep:
- client selector supporting:
  - client reports
  - CPD reports
  - supervision reports

Can change:
- exact spacing
- exact font sizing

### 4.26 Report Section A - Time Allocation

Reference screenshot:
- `docs/ui_screens/Report A.png`

Purpose:
- visualize time allocation over time

Must keep:
- bar chart over selected timeframe
- monthly bars when a monthly span is selected
- one bar for smaller selected periods as applicable

Can change:
- exact spacing
- exact font sizing
- visual chart styling

### 4.27 Report Section B - Client Notes Preview

Reference screenshot:
- `docs/ui_screens/Report B with note preview.png`

Purpose:
- show session vs assessment distribution and note preview excerpts

Must keep:
- split between assessments and sessions
- note/date preview area
- distinction between on-screen preview and PDF full-note export

Can change:
- exact spacing
- exact font sizing

Notes:
- workbook explicitly notes current CSS issue with white text on white background; rewrite should correct this

### 4.28 Report - CPD

Reference screenshot:
- `docs/ui_screens/Report CPD.png`

Purpose:
- dedicated CPD reporting view

Must keep:
- CPD-specific time chart
- per-note preview beneath chart
- full CPD notes in exported PDF

Can change:
- exact spacing
- exact font sizing

### 4.29 Report - Supervision

Reference screenshot:
- `docs/ui_screens/Report Supervision.png`

Purpose:
- dedicated supervision reporting view

Must keep:
- supervision-specific time chart
- per-note preview beneath chart
- full supervision notes in exported PDF

Can change:
- exact spacing
- exact font sizing

### 4.30 Report PDF Export Example

Reference screenshots:
- `docs/ui_screens/Report PDF Export A.png`
- `docs/ui_screens/Report PDF Export B.png`

Purpose:
- demonstrate exported PDF layout and content expectations

Must keep:
- PDF export as a final deliverable
- content fidelity to selected report scope

Can change:
- exact visual polish if content completeness remains correct

### 4.31 Report PDF Save Dialog

Reference screenshot:
- `docs/ui_screens/Report PDF Save.png`

Purpose:
- system save-location prompt for report PDF export

Must keep:
- native save dialog behavior before final file save

Can change:
- platform-native presentation according to chosen rewrite stack

### 4.32 Create Backup Overlay

Reference screenshot:
- `docs/ui_screens/Create Backup.png`

Purpose:
- choose backup file name and location when creating an encrypted backup from File menu

Must keep:
- native save-location flow
- backup initiated from File menu

Can change:
- exact spacing
- exact font sizing

### 4.33 Restore Backup Warning

Reference screenshot:
- `docs/ui_screens/Restore Backup.png`

Purpose:
- confirm destructive nature of restoring a backup

Must keep:
- explicit acknowledgment that restore will replace current DB content

Can change:
- exact spacing
- exact font sizing

### 4.34 Restore Backup File Selector

Reference screenshot:
- `docs/ui_screens/Restore Backup Select file.png`

Purpose:
- choose backup file to restore after user acknowledgment

Must keep:
- native file selection step after confirmation

Can change:
- platform-native presentation according to chosen stack

### 4.35 Therapist Details Panel - Top Section

Reference screenshot:
- `docs/ui_screens/Therapist Details A.png`

Purpose:
- capture top half of therapist/business details

Must keep:
- same available options as current overlay
- therapist details as dedicated administrative panel

Can change:
- exact spacing
- exact font sizing

### 4.36 Therapist Details Panel - Bottom Section

Reference screenshot:
- `docs/ui_screens/Therapist Details B.png`

Purpose:
- capture lower administrative/payment details

Must keep:
- same available options as current overlay

Can change:
- exact spacing
- exact font sizing

### 4.37 Dark Mode Selection

Reference screenshot:
- `docs/ui_screens/Dark Mode Selection.png`

Purpose:
- toggle theme from top View menu

Must keep:
- top menu theme toggle entry
- dark mode toggle behavior

Can change:
- exact menu wording if function stays clear

## 5. Interaction Preservation Rules

### 5.1 Panel 1

Must preserve:
- filter before search
- sticky lower zone with Supervision, CPD, calendar, and summary
- scrolling limited to client cards only when possible

### 5.2 Panel 2

Must preserve:
- section title at top
- `+ New Note` action in panel 2 header area
- sort control available for client notes, supervision, and CPD
- summary box at bottom for relevant sections

### 5.3 Panel 3

Must preserve:
- note editing as primary focus area
- correct field grouping by note type
- collapsible personal notes where applicable
- invoice only for Session and Assessment notes
- calendar should not visually coexist with note detail when a note is selected

### 5.4 Calendar

Must preserve:
- calendar as an explicit mode
- week / month / year switching
- appointment add/edit overlays
- recurrence and delete-scope operations

### 5.5 Reports

Must preserve:
- reports as a separate screen accessed via menu
- filterable by time and report target
- preview vs full PDF export distinction

## 6. Rewrite Flexibility Boundaries

Generally safe to change:
- typography sizing
- spacing rhythm
- component polish
- visual refinement
- small label wording improvements where behavior stays equivalent

Not safe to change without explicit product decision:
- three-pane information architecture
- client status model visibility
- note type separation
- supervision and CPD as global sections
- personal notes exclusion from reports/PDFs
- invoice access on Session and Assessment notes
- top-menu-driven administrative actions
- backup/restore flow semantics

## 7. Known Ambiguities or Items To Confirm During Rewrite

1. Appointment notification timing
- workbook states 10 minutes before appointment
- current implementation should be verified against live behavior and functional specification

2. Calendar edit/delete wording
- preserve user meaning even if the UI text is refined

3. Report preview styling
- current screenshot notes mention a broken CSS case; rewrite should preserve feature intent, not current bug state

4. Supervision client linkage
- UI treats supervision as global even though the current DB keeps a client foreign key

## 8. Source Artifacts

Supporting source folder:
- `docs/ui_screens/`

Structured notes source:
- `docs/ui_screens/screenshots_notes.xlsx`

## 9. Document Outputs Added to the Rewrite Set

The rewrite-support document set now includes:
- `docs/Solu_Notes_PRD.md`
- `docs/Solu_Notes_PRD.pdf`
- `docs/Solu_Notes_User_Flows.md`
- `docs/Solu_Notes_User_Flows.pdf`
- `docs/Solu_Notes_Functional_Specification.md`
- `docs/Solu_Notes_Functional_Specification.pdf`
- `docs/Solu_Notes_Data_Model_Entity_Map.md`
- `docs/Solu_Notes_Data_Model_Entity_Map.pdf`
- `docs/Solu_Notes_UI_Screen_Specification.md`
- `docs/Solu_Notes_UI_Screen_Specification.pdf`

## 10. Next Recommended Document

The next useful document after this one would be:
- Rewrite Architecture Blueprint

Reason:
- once product, flow, behavior, data, and screens are locked, the next question becomes how to map them into the chosen technology stack without losing compatibility or UX quality
