# Solu Notes User Flows / UX Flows

Version: 1.0  
Date: 30 March 2026  
Product: Solu Notes

## 1. Purpose

This document describes the main user flows in Solu Notes as the product behaves today.

Its purpose is to support:

- future rewrite planning
- feature implementation sequencing
- UX consistency across teams or agents
- validation that features work together as one coherent product

This is not a UI spec. It is a product flow document.

## 2. Product Structure

The current product is organized around a 3-pane desktop workflow:

- Pane 1: clients and special sections
- Pane 2: notes/records list
- Pane 3: selected record editor or calendar

The main navigation concepts are:

- clients
- supervision
- CPD
- reports
- therapist details
- calendar
- backup / restore

## 3. Global UX Principles

- The user should always understand what record set they are viewing.
- Pane 1 selects the context.
- Pane 2 selects the specific record.
- Pane 3 is the working surface.
- Destructive actions should be explicit.
- Reports, therapist details, and backup workflows should not interrupt note-taking unnecessarily.
- Calendar mode is an alternate mode of Pane 3 and should not conflict with note editing.

## 4. Entry Flow

### 4.1 Launch App

Goal:
- open the product into the main workspace quickly

Flow:
1. User launches Solu Notes.
2. App loads local DB and preferences.
3. Theme is applied.
4. Main 3-pane workspace opens.
5. Today’s Sessions panel may appear in the top-right if applicable.
6. User lands in the main clients workspace.

Success state:
- app is ready without requiring sign-in
- local data is loaded
- user can immediately browse clients, notes, or calendar

Important note:
- There is no account creation or sign-in flow in the current product
- this is a deliberate local-first behavior

## 5. First-Time / Early Use Flow

### 5.1 First App Use

Goal:
- let a new therapist start entering data with minimal setup friction

Recommended flow:
1. Launch app.
2. Open `File > Therapist Details...`
3. Enter therapist/business details.
4. Save therapist details.
5. Create first client.
6. Open client and create first note.

Why this matters:
- therapist details are required later for invoices
- client creation is the first meaningful data object

## 6. Client Management Flows

### 6.1 Create First Client

Goal:
- create a client record so work can begin

Flow:
1. User opens the app.
2. In Pane 1, click `+`.
3. Client Info modal opens.
4. User enters:
   - first name
   - last name
   - date of birth
   - client code
   - session/hourly rate
   - optional initial assessment date
   - optional therapy modality
   - optional contact and extended information
5. User saves the client.
6. Client appears in Pane 1.
7. Client can now be selected and used for notes, invoices, reports, and appointments.

Success state:
- client is visible in Pane 1
- user can create notes for that client

### 6.2 Edit Existing Client

Flow:
1. User finds client in Pane 1.
2. User clicks `Info`.
3. Client Info modal opens.
4. User edits fields.
5. User saves.
6. Updated information becomes available across the app.

Examples of dependent behaviors:
- updated session rate affects future invoice generation
- updated therapy modality appears in session/assessment note headers
- updated client status affects filtering and report visibility

### 6.3 Change Client Status

Flow:
1. User opens Client Info modal.
2. User changes status dropdown to:
   - Active
   - Waiting List
   - Archived
3. User saves.
4. Client moves into the appropriate filter category in Pane 1.

Rules:
- waiting list clients should not appear in reports
- archived clients should not appear in Active filter

### 6.4 Find a Client

Flow:
1. User uses `Show` filter in Pane 1.
2. User optionally types in Search.
3. Pane 1 reduces visible clients.
4. User selects the desired client.

Success state:
- Pane 2 updates to show the client’s notes
- Pane 3 clears until a note is selected

## 7. Note Creation Flows

### 7.1 Create Session Note

Flow:
1. User selects a client in Pane 1.
2. Pane 2 updates to that client’s note list.
3. User clicks `+ New Note`.
4. Note type selector opens.
5. User chooses `Session`.
6. New session note opens in Pane 3.
7. User enters:
   - date
   - duration
   - paid status
   - session type
   - main note content
   - optional personal notes
8. User saves.
9. Session appears in Pane 2.

Success state:
- note is persisted
- card appears in the note list
- note contributes to client totals and reports

### 7.2 Create Assessment Note

Flow:
1. User selects a client.
2. User clicks `+ New Note`.
3. User chooses `Assessment`.
4. Assessment note opens in Pane 3.
5. User completes note fields.
6. User saves.
7. Assessment appears in Pane 2.

Special behavior:
- can generate invoice
- uses same session-type and paid behaviors as session notes

### 7.3 Create Supervision Note

Flow:
1. User selects `Supervision` in Pane 1.
2. Pane 2 shows supervision records only.
3. User clicks `+ New Note`.
4. New supervision note opens in Pane 3.
5. User enters:
   - date
   - duration
   - paid status
   - session type
   - supervisor details
   - main supervision content
   - summary
   - optional personal notes
6. User saves.
7. Supervision note appears in Pane 2 and contributes to supervision totals.

### 7.4 Create CPD Note

Flow:
1. User selects `CPD` in Pane 1.
2. Pane 2 shows CPD records only.
3. User clicks `+ New Note`.
4. New CPD note opens in Pane 3.
5. User enters:
   - date
   - organisation/provider
   - title
   - focus/outcome
   - duration
   - medium
   - optional link
6. User saves.
7. CPD note appears in Pane 2 and contributes to CPD totals.

## 8. Note Review and Editing Flows

### 8.1 Review Existing Note

Flow:
1. User selects a context in Pane 1:
   - client
   - supervision
   - CPD
2. Pane 2 shows matching cards.
3. User optionally changes sort order.
4. User clicks a card.
5. Pane 3 loads the selected note.

Success state:
- note details are clearly visible
- user can edit or delete from Pane 3

### 8.2 Edit Existing Note

Flow:
1. User opens note in Pane 3.
2. User edits fields or rich text.
3. User saves.
4. Pane 2 card and any relevant summaries update accordingly.

### 8.3 Delete Existing Note

Flow:
1. User opens note in Pane 3.
2. User clicks `Delete`.
3. System confirms the action.
4. Record is removed.
5. Pane 2 refreshes.
6. Pane 3 clears.

## 9. Personal Notes Flow

Applicable to:

- Session
- Assessment
- Supervision

Flow:
1. User opens note in Pane 3.
2. User expands Personal Notes section.
3. User writes private content.
4. User saves note.

Rules:
- personal notes are stored
- personal notes do not appear in reports
- personal notes do not appear in report/PDF outputs

## 10. Reports Flow

### 10.1 Open Reports

Flow:
1. User opens `File > View Reports...`
2. Reports screen opens.
3. User sees report controls and available report sections.

### 10.2 Generate Client Report

Flow:
1. User opens Reports.
2. User sets start and end date.
3. User chooses:
   - all clients
   - or a specific client
4. User clicks `Generate Report`.
5. App loads chart + table views.

Rules:
- waiting list clients are not part of report data
- supervision and CPD are not mixed into client report content

### 10.3 Generate Supervision Report

Flow:
1. User opens Reports.
2. User selects Supervision in the report filter.
3. User clicks `Generate Report`.
4. App shows supervision-only output.

### 10.4 Generate CPD Report

Flow:
1. User opens Reports.
2. User selects CPD in the report filter.
3. User clicks `Generate Report`.
4. App shows CPD-only output.

### 10.5 Export Report PDF

Flow:
1. User generates report.
2. User clicks `Export PDF`.
3. PDF is created for the currently displayed report scope.

## 11. Invoice Flows

### 11.1 Generate Invoice From Session Note

Flow:
1. User opens a session note in Pane 3.
2. User clicks `Invoice`.
3. App checks therapist details and client/session data.
4. If invoice already exists for that note, existing invoice is reopened.
5. Otherwise:
   - invoice number is created
   - invoice PDF is generated
   - invoice record is persisted
6. PDF opens in external preview/browser flow.

Rules:
- one invoice per note
- session rate comes from client record
- therapist details come from therapist details configuration

### 11.2 Generate Invoice From Assessment Note

Same as session invoice flow, but source is an assessment note.

## 12. Therapist Details Flow

### 12.1 Enter / Update Therapist Details

Flow:
1. User opens `File > Therapist Details...`
2. Therapist Details modal opens.
3. User enters or edits business details.
4. User saves.

Dependency:
- invoice generation relies on this data

## 13. Calendar Flows

### 13.1 Open Calendar

Flow:
1. User clicks the calendar button.
2. Pane 3 enters calendar mode.
3. Calendar header and current view appear.

### 13.2 Return From Calendar To Note Work

Flow:
1. User selects a note card in Pane 2 while calendar is open.
2. Calendar mode closes automatically.
3. Pane 3 loads only the note.

This is important behavior and should be preserved in any rewrite.

### 13.3 Create Appointment

Flow:
1. User opens calendar mode.
2. User clicks `+ New Appointment` or creates via time slot interaction.
3. Appointment modal opens.
4. User selects active client.
5. User enters:
   - date
   - start time
   - end time
   - recurrence
6. User saves.
7. Appointment appears in calendar views.

### 13.4 Edit Appointment Occurrence

Flow:
1. User clicks calendar occurrence.
2. Occurrence action modal opens.
3. User chooses:
   - move
   - cancel this occurrence
   - delete
4. If delete:
   - user selects scope
5. Calendar updates.

### 13.5 View Today’s Sessions

Flow:
1. User opens app.
2. Today’s Sessions floating panel may appear.
3. User reviews appointment statuses.
4. User dismisses panel if desired.

Rules:
- panel is informational
- not a full notification system

## 14. Backup / Restore Flows

### 14.1 Create Encrypted Backup

Flow:
1. User opens `File > Create Encrypted Backup...`
2. Save dialog opens.
3. User chooses destination.
4. App creates encrypted backup file.

Success state:
- backup file exists at chosen destination

### 14.2 Restore From Encrypted Backup

Flow:
1. User opens `File > Restore From Encrypted Backup...`
2. Open dialog opens.
3. User selects backup file.
4. App restores local DB from backup.
5. App reloads data state.

Important behavior:
- restore must be explicit and safe
- user should not lose current data silently

## 15. Theme Flow

### 15.1 Toggle Theme

Flow:
1. User opens `View > Dark Mode`
2. User toggles theme
3. Theme changes immediately
4. Preference persists for next launch

## 16. Error and Edge Flows

### 16.1 Unsaved Changes

Goal:
- avoid accidental data loss while moving between clients, notes, and sections

Flow:
1. User edits a note.
2. User tries to navigate away.
3. App prompts for discard/continue behavior.

### 16.2 Missing Therapist Details During Invoice

Flow:
1. User tries to generate invoice
2. Required therapist details are missing
3. App shows blocking error
4. User must update therapist details first

### 16.3 Calendar Appointment Errors

Flow:
1. User saves appointment
2. Backend validation fails
3. App shows user-readable message
4. User corrects input or existing appointment state

## 17. Flow Prioritization For Rewrite

The flows that must be preserved first in a rewrite are:

1. Launch app
2. Create client
3. Select client
4. Create session note
5. Edit and save note
6. Create supervision note
7. Create CPD note
8. Generate invoice
9. Generate report
10. Create/modify calendar appointment
11. Backup and restore

These flows define the product more than any individual visual component.

## 18. Rewrite Guidance

If the app is rewritten, the following should remain true:

- the user always has a clear path from client -> note list -> note editor
- special sections stay clearly separate from client records
- invoice flow remains lightweight
- reports remain distinct by domain
- calendar mode does not conflict with note editing
- backup/restore stays explicit and trustworthy

The product fails at the UX level if these flows become harder to understand, even if every individual feature still exists.
