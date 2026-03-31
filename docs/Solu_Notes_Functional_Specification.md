# Solu Notes Functional Specification

Version: 1.1  
Date: 30 March 2026  
Product: Solu Notes

## 1. Purpose

This document defines how each feature in Solu Notes behaves.

It is intended to remove ambiguity during a rewrite or future implementation work by specifying:

- purpose
- inputs
- outputs
- rules
- edge cases
- validations
- permissions if relevant
- dependencies

This is the feature-behavior document that should prevent developers or AI agents from filling gaps with guesses.

This document complements:

- `Solu_Notes_PRD.md`
- `Solu_Notes_User_Flows.md`

## 2. Product Context

Solu Notes is a local-first desktop application for therapists and counsellors.

Core product areas:

- clients
- session notes
- assessment notes
- supervision notes
- CPD notes
- reports
- invoices
- therapist details
- calendar
- backup and restore
- themes

The current interaction model is a 3-pane desktop workspace:

- Pane 1: context selection
- Pane 2: record list
- Pane 3: editor or calendar

## 3. Shared Functional Rules

### 3.1 Local-First Rule

- all core product data is stored locally
- no user authentication is required
- no cloud sync is required for normal operation

### 3.2 Navigation Rule

- Pane 1 controls the record context
- Pane 2 shows records for the active context
- Pane 3 shows the selected record or calendar mode

### 3.3 Save Rule

- user-edited data must persist locally
- saved data must remain available after app restart

### 3.4 Theme Rule

- theme changes must apply immediately
- theme choice must persist between launches

### 3.5 Report Privacy Rule

- personal notes must not appear in reports
- personal notes must not appear in report PDF outputs

### 3.6 Dedicated Section Rule

- Supervision is a dedicated section, not a client subgroup
- CPD is a dedicated section, not a client subgroup

## 4. Feature Specifications

## 4.1 Client Management

### Purpose

Store, organize, and maintain therapist client records as the core unit of client-linked work.

### Inputs

- first name
- last name
- date of birth
- client code
- session/hourly rate
- optional initial assessment date
- optional therapy modality
- optional contact details
- optional address details
- optional emergency contact details
- optional GP details
- status

### Outputs

- client record stored in local DB
- client visible in Pane 1
- client available for:
  - session notes
  - assessment notes
  - invoices
  - reports
  - calendar appointments

### Rules

- each client has one status:
  - Active
  - Waiting List
  - Archived
- client code is the preferred display label in Pane 1 and client-linked note cards
- therapy modality is stored on the client and displayed in session/assessment note headers
- session/hourly rate stored on the client is used for invoice calculation

### Edge Cases

- client may exist with no notes
- client may exist with no appointments
- client may move between statuses over time
- client may have optional fields left empty

### Validations

- first name required
- last name required
- date of birth required
- client code required
- session/hourly rate required
- initial assessment date optional

### Permissions

- single-user local app
- no role-based permissions

### Dependencies

- SQLite client table
- client modal / edit UI
- reports module
- invoice module
- calendar module

## 4.2 Client Search and Filter

### Purpose

Allow the user to find relevant clients quickly.

### Inputs

- status filter selection
- search text

### Outputs

- filtered client list in Pane 1

### Rules

- filter values:
  - Active
  - Waiting List
  - Archived
  - All
- search applies to client records
- special sections are not returned as search matches

### Edge Cases

- no matching clients
- filter change while unsaved note edits exist

### Validations

- search text can be empty
- filter must always resolve to a valid filter option

### Permissions

- none

### Dependencies

- client list UI
- unsaved-change protection logic

## 4.3 Session Note Feature

### Purpose

Capture client session records for ongoing therapy work.

### Inputs

- selected client
- note type = Session
- date
- duration in minutes
- paid flag
- session type
- main note content
- optional personal notes

### Outputs

- session note stored in DB
- session card displayed in Pane 2
- client totals updated
- note available for reports
- note eligible for invoice generation

### Rules

- session note must belong to a client
- supported session types:
  - In-Person
  - Online
  - Phone
- session cards appear in Pane 2 under the selected client
- session cards include:
  - session icon
  - client code
  - date
  - duration
  - `SESSION` label on line 2
  - session type pill
  - paid/unpaid dot
- session notes participate in client reporting
- payment status can be toggled
- note can be edited later

### Edge Cases

- session may be unpaid
- session may have no personal notes
- multiple sessions may exist on same date

### Validations

- selected client required
- date required
- duration required
- session type required

### Permissions

- none

### Dependencies

- client feature
- rich text editor
- personal notes module
- reports module
- invoice module

## 4.4 Assessment Note Feature

### Purpose

Capture client assessment records that are distinct from normal sessions.

### Inputs

- selected client
- note type = Assessment
- date
- duration in minutes
- paid flag
- session type
- main note content
- optional personal notes

### Outputs

- assessment note stored in DB
- assessment card shown in Pane 2
- client totals updated where applicable
- note available for client reports
- note eligible for invoice generation

### Rules

- assessment note must belong to a client
- supported session types:
  - In-Person
  - Online
  - Phone
- assessment cards include:
  - assessment icon
  - client code
  - date
  - duration
  - `ASSESSMENT` label on line 2
  - session type pill
  - paid/unpaid dot
- note can be edited later

### Edge Cases

- multiple assessments may exist for one client
- assessment may be unpaid

### Validations

- selected client required
- date required
- duration required
- session type required

### Permissions

- none

### Dependencies

- client feature
- rich text editor
- personal notes module
- reports module
- invoice module

## 4.5 Client Note Ordering and Sorting

### Purpose

Allow the user to review client notes in a usable and predictable order.

### Inputs

- current client context
- sort selection:
  - Latest first
  - Oldest first

### Outputs

- Pane 2 note list rendered in the chosen order

### Rules

- sort control applies to client note lists, supervision lists, and CPD lists
- default sort is `Latest first`
- user preference persists locally
- session and assessment notes are sorted as one mixed chronological list
- assessment notes are not pinned above sessions; ordering is date-based

### Edge Cases

- same-day records with different IDs
- empty note list

### Validations

- sort value must normalize to a supported option

### Permissions

- none

### Dependencies

- note list rendering logic
- local UI state persistence

## 4.6 Rich Text Editor Feature

### Purpose

Support structured therapist note writing without reducing everything to plain text.

### Inputs

- user typing
- toolbar commands

### Outputs

- formatted note content stored and restored accurately

### Rules

- supported formatting includes:
  - heading size presets
  - normal text
  - bold
  - italic
  - underline
  - text color
  - list formatting
- formatting state must be saved with the note
- formatting must rehydrate correctly when note is reopened

### Edge Cases

- empty note content
- partially formatted selections

### Validations

- editor content may be empty for draft creation if product allows it

### Permissions

- none

### Dependencies

- main editor
- personal notes editor where applicable

## 4.7 Personal Notes Feature

### Purpose

Allow the therapist to keep private notes separate from the main reportable note body.

### Inputs

- personal notes content
- collapse/expand toggle

### Outputs

- personal notes stored in DB
- personal notes shown only in Pane 3 editing workflow

### Rules

- available for:
  - Session
  - Assessment
  - Supervision
- not available for:
  - CPD
- section is collapsible
- formatting support should match the main note editor where implemented
- personal notes are excluded from:
  - reports
  - report PDFs

### Edge Cases

- user never expands personal notes
- empty personal notes content

### Validations

- no special validation beyond storage constraints

### Permissions

- none

### Dependencies

- note editor
- report generation

## 4.8 Supervision Note Feature

### Purpose

Track therapist supervision records separately from client notes.

### Inputs

- Supervision context selected in Pane 1
- date
- duration in minutes
- paid flag
- session type
- supervisor details
- main note content
- summary
- optional personal notes

### Outputs

- supervision note stored
- supervision card shown in Pane 2
- supervision totals updated
- note available in supervision reports

### Rules

- supervision notes do not belong to a client list in Pane 1
- supervisor details is a single text field
- summary is a dedicated short field used in:
  - Pane 2 cards
  - reports
  - supervision PDF outputs
- supervision cards show:
  - supervision icon
  - supervisor details
  - date
  - duration
  - session type pill
  - summary on line 2

### Edge Cases

- missing supervisor details
- missing summary
- same-day multiple supervision notes

### Validations

- date required
- duration required
- session type required
- summary max length = 100 characters

### Permissions

- none

### Dependencies

- rich text editor
- personal notes module
- reports module

## 4.9 CPD Note Feature

### Purpose

Track professional development separately from client work.

### Inputs

- CPD context selected in Pane 1
- date
- organisation/provider
- title
- focus and outcome content
- duration in hours
- medium
- optional link

### Outputs

- CPD note stored
- CPD card shown in Pane 2
- CPD totals updated
- note available in CPD reports

### Rules

- CPD is not a client
- CPD notes are not shown in client note lists
- CPD cards show:
  - CPD icon
  - provider
  - date
  - duration
  - medium pill
  - title on line 2
- CPD does not include personal notes

### Edge Cases

- missing link
- long title
- same-day multiple CPD notes

### Validations

- date required
- provider/organisation required
- title required
- duration required
- medium required
- link optional

### Permissions

- none

### Dependencies

- reports module
- external link opening behavior

## 4.10 Reports Feature

### Purpose

Allow the therapist to review time allocation and note summaries over a chosen date range and export that data.

### Inputs

- start date
- end date
- filter scope:
  - all clients
  - single client
  - Supervision
  - CPD

### Outputs

- charts
- tables
- report view state
- exportable PDF

### Rules

- reports are opened from the app menu
- client reports must include client-related work only
- supervision reports must include supervision only
- CPD reports must include CPD only
- waiting list clients must not appear in reports
- personal notes must not appear in reports

### Edge Cases

- empty date range result
- no records for selected scope
- archived clients with historical notes

### Validations

- start/end dates must be valid dates when provided
- report scope must normalize to a supported filter

### Permissions

- none

### Dependencies

- client data
- note data
- supervision summary field
- CPD data
- PDF export logic

## 4.11 Invoice Feature

### Purpose

Generate a lightweight invoice PDF from billable work.

### Inputs

- source note:
  - Session
  - Assessment
- therapist details
- client data
- client session/hourly rate

### Outputs

- invoice record
- invoice number
- invoice PDF file
- reopened existing invoice if already created

### Rules

- one invoice per source note
- invoice number format:
  - `INV-YYYY-0001`
- numbering resets each year
- invoice date uses note/session date
- payment status shown as:
  - PAID
  - NOT PAID
- session rate source is the client record, not therapist details
- invoice PDF persists locally and can be reopened

### Edge Cases

- therapist details missing
- client rate missing
- invoice already exists

### Validations

- source note must exist
- source note type must be Session or Assessment
- therapist details required for invoice generation
- client session/hourly rate required for invoice generation

### Permissions

- none

### Dependencies

- therapist details feature
- client feature
- PDF generation service
- invoice persistence

## 4.12 Therapist Details Feature

### Purpose

Store therapist business details used in invoices and business identity.

### Inputs

- business details form fields

### Outputs

- therapist details record stored locally

### Rules

- opened from File menu
- values reused during invoice generation
- includes:
  - business name
  - therapist name
  - accreditation
  - therapy type
  - website
  - email
  - address details
  - bank details
  - currency
  - IBAN
  - BIC

### Edge Cases

- optional website omitted
- IBAN/BIC omitted

### Validations

- required fields follow current therapist details form rules
- website should accept typical user-entered website forms where supported

### Permissions

- none

### Dependencies

- invoice feature

## 4.13 Calendar Feature

### Purpose

Let the therapist manage future appointments and recurring bookings inside the same desktop workspace.

### Inputs

- client
- date
- start time
- end time
- recurrence choice
- occurrence actions

### Outputs

- appointment series
- appointment exceptions
- rendered calendar events

### Rules

- calendar is an alternate mode of Pane 3
- supported views:
  - Week
  - Month
  - Year
- user can:
  - create appointment
  - edit series
  - move occurrence
  - cancel occurrence
  - delete this occurrence
  - delete this and future
  - delete all
- multiple appointments per client are allowed
- if user selects a note while calendar mode is open:
  - calendar mode closes
  - note loads in Pane 3

### Edge Cases

- recurring series with cancelled occurrences
- moved occurrences
- appointments in the past
- no appointments for selected range

### Validations

- active client required for appointment creation
- start time must be before end time
- recurrence value must be valid

### Permissions

- none

### Dependencies

- client feature
- appointment DB tables
- recurrence expansion logic

## 4.14 Today’s Sessions Feature

### Purpose

Provide a compact in-app summary of today’s appointments on app launch.

### Inputs

- today’s calendar events
- current local time
- local UI state

### Outputs

- floating summary panel

### Rules

- appears on app open
- shows today’s appointment statuses
- supports dismiss
- limited re-show logic before the next appointment
- not a system notification feature

### Edge Cases

- no appointments today
- all sessions completed
- dismissed state already stored

### Validations

- appointment list should exclude cancelled occurrences

### Permissions

- none

### Dependencies

- calendar feature
- local state persistence

## 4.15 Backup Feature

### Purpose

Allow the user to preserve a secure copy of the local database.

### Inputs

- destination chosen by the user

### Outputs

- encrypted backup file

### Rules

- backup action is started from File menu
- backup must be explicit and user-initiated

### Edge Cases

- destination unavailable
- write failure

### Validations

- valid destination path required

### Permissions

- local file system access

### Dependencies

- local DB
- encryption logic
- file dialog integration

## 4.16 Restore Feature

### Purpose

Allow the user to restore the application from an encrypted backup.

### Inputs

- selected encrypted backup file

### Outputs

- restored local DB
- refreshed application state

### Rules

- restore action is started from File menu
- restore must not occur silently
- restored data must be available immediately after completion

### Edge Cases

- invalid backup file
- restore interrupted
- restore into populated app state

### Validations

- selected file must be a valid backup payload

### Permissions

- local file system access

### Dependencies

- backup file format
- local DB replacement logic

## 4.17 Theme Management

### Purpose

Allow the user to switch between Dark and Light modes.

### Inputs

- theme toggle command

### Outputs

- updated UI theme
- persisted preference

### Rules

- themes:
  - Dark
  - Light
- selected theme persists across app launches
- theme changes should update UI immediately
- theme-aware icons should swap correctly where implemented

### Edge Cases

- unavailable stored preference

### Validations

- invalid stored theme defaults safely

### Permissions

- none

### Dependencies

- local preference storage
- theme-aware asset mapping

## 5. Ordering and Summary Rules

### 5.1 Pane 1 Summary

- global summary shown in Pane 1 footer
- includes:
  - Session Time
  - Sessions
  - Supervision Time
  - Supervisions

### 5.2 Pane 2 Client Summary

- client summary shown only in client context
- includes:
  - Client Sessions Time
  - Client Sessions

### 5.3 Pane 2 Supervision Summary

- supervision summary shown only in Supervision context
- includes:
  - Supervision Time
  - Supervision Sessions

### 5.4 Pane 2 CPD Summary

- CPD summary shown only in CPD context
- includes:
  - CPD Total Time

## 6. Error Handling Expectations

### 6.1 User-Facing Errors

Errors should be:

- specific
- understandable
- contextual

Examples:

- missing therapist details for invoice
- invalid appointment save
- failed backup/restore

### 6.2 Technical Failures

System should fail safely when:

- DB read/write fails
- PDF generation fails
- backup/restore fails
- calendar data cannot be loaded

## 7. Rewrite Acceptance Checklist

A rewrite is not functionally complete unless:

1. client creation/editing behaves as specified
2. session and assessment note creation/editing works
3. supervision and CPD remain separate dedicated sections
4. personal notes remain excluded from reports
5. reports remain scoped correctly
6. invoice generation uses client rate and therapist details correctly
7. calendar mode behaves independently from note editing
8. backup and restore work as explicit local actions
9. theme persistence works
10. all ordering, summary, and display rules remain correct
