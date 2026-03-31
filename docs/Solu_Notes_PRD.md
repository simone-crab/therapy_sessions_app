# Solu Notes Product Requirements Document (PRD)

Version: 1.0  
Date: 30 March 2026  
Product: Solu Notes

## 1. Product Overview

Solu Notes is a local-first desktop application for therapists and counsellors to manage client records, session notes, assessments, supervision records, CPD logs, appointments, reports, invoices, and therapist business details in one private workspace.

The product is designed for clinicians who want a calm, structured, privacy-sensitive notes system that runs locally on their own machine without relying on cloud storage.

Solu Notes is optimized around a three-pane desktop workflow:

- Pane 1: clients and special sections
- Pane 2: notes or records list
- Pane 3: selected note editor or calendar workspace

The core product promise is simple:

> Help therapists capture, organize, review, report on, and invoice their work from a single local desktop app, while keeping sensitive information under their own control.

## 2. Product Vision

Build a premium desktop workspace for therapists that feels closer to a private notes tool than a generic admin system.

The app should support day-to-day clinical work with minimal friction:

- quick access to clients and notes
- clear separation of note types
- structured record keeping
- strong local privacy model
- practical reporting and invoicing
- a lightweight appointment calendar

Longer term, Solu Notes should be capable of becoming a polished desktop product suitable for direct therapist use at scale, with a possible future path toward a fully native Apple desktop app.

## 3. Target Users

Primary users:

- individual therapists in private practice
- counsellors managing client notes locally
- practitioners who track supervision and CPD
- clinicians who need lightweight invoicing and reporting

Secondary users:

- therapists with a small caseload who want a local alternative to cloud software
- practitioners who need privacy-first record keeping without a full practice-management system

User characteristics:

- desktop-first workflow
- low tolerance for cluttered interfaces
- high sensitivity to privacy and control of data
- need for practical record keeping rather than enterprise administration

## 4. Problem Statement

Therapists often need to manage several distinct but related workflows:

- client records
- session notes
- assessment notes
- supervision logs
- CPD logs
- appointment tracking
- reporting
- invoicing

Many available tools are either:

- too broad and administrative
- too clinical and rigid
- too cloud-dependent
- not well suited to a solo or small private practice

This creates a gap for a local desktop tool that keeps therapists focused on their actual work while still providing enough structure to support compliance, review, and billing tasks.

## 5. Goals

### Primary Goals

- Provide a local-first therapist workspace for note taking and record management.
- Support multiple record types without forcing them into one generic note model.
- Make day-to-day navigation fast through a three-pane desktop layout.
- Enable reporting and PDF outputs for clinical/admin review needs.
- Enable simple invoice generation from session and assessment records.
- Support therapist workflow without turning the product into accounting software or enterprise EHR software.

### Secondary Goals

- Support a light and dark theme.
- Support encrypted backup and restore.
- Support recurring appointments in a built-in calendar.
- Keep the product visually calm, premium, and desktop-appropriate.

## 6. Non-Goals / Out of Scope

The following are explicitly out of scope for the current product direction:

- cloud sync or SaaS infrastructure
- therapist-to-client messaging
- telehealth / video sessions
- online booking by clients
- payment processing
- full accounting package features
- payroll, tax reporting, or ledger management
- insurance claim workflows
- multi-user collaboration
- EMR/EHR interoperability
- treatment planning modules
- AI-generated clinical notes
- patient portal access
- mobile-first workflows

The invoice capability is intentionally lightweight and should not evolve into a full bookkeeping system without a separate product decision.

## 7. Product Principles

- Local first: user data lives on the user’s device.
- Privacy first: no default cloud dependency.
- Calm UI: the app should feel quiet, not administrative.
- Structured where needed: note types and reporting should remain distinct.
- Fast daily workflow: common actions should require minimal navigation.
- Desktop-native mindset: the product should respect desktop interaction patterns.

## 8. Core User Jobs To Be Done

1. Manage clients and their statuses.
2. Record and review session notes and assessments for a client.
3. Keep supervision records separate from client notes.
4. Track CPD separately from client records.
5. Review time allocation and note history through reports.
6. Generate invoices from billable work.
7. Manage recurring appointments in a calendar.
8. Back up and restore the practice database safely.

## 9. Functional Scope

### 9.1 Client Management

Users must be able to:

- create and edit client records
- assign a client code
- store contact and demographic details
- assign a therapy modality
- set a client status:
  - Active
  - Waiting List
  - Archived
- filter clients by status
- search clients

Behavior notes:

- waiting list clients should not appear in reports
- archived clients remain accessible but separate from active work

### 9.2 Note Types

The product supports four distinct note/record types:

- Session Notes
- Assessment Notes
- Supervision Notes
- CPD Notes

Each type has its own behavior and fields.

#### Session Notes

- linked to a client
- include date, duration, paid status, session type
- support rich text notes
- support private personal notes
- support invoice generation

#### Assessment Notes

- linked to a client
- include date, duration, paid status, session type
- support rich text notes
- support private personal notes
- support invoice generation

#### Supervision Notes

- not grouped under individual clients in Pane 1
- shown in a dedicated Supervision section
- include date, duration, paid status, session type
- include supervisor details
- include rich text content
- include summary field for reports and list cards
- include personal notes

#### CPD Notes

- not grouped under individual clients in Pane 1
- shown in a dedicated CPD section
- include date, organisation/provider, title, focus/outcome, duration, medium, optional link
- do not include personal notes
- support dedicated reporting

### 9.3 Rich Text Editing

Relevant note types must support rich text editing with:

- headings / text size presets
- bold
- italic
- underline
- text color
- list formatting

Formatting must persist correctly when notes are saved and reopened.

### 9.4 Personal Notes

Session, assessment, and supervision notes support a private personal notes area.

Requirements:

- visually separated from the main note body
- collapsible
- stored in the database
- excluded from reports
- excluded from PDF report outputs

### 9.5 Reports

The app must support a separate reports view where the user can:

- choose a date range
- filter by client
- filter dedicated CPD records
- filter dedicated Supervision records
- generate charts and tabular summaries
- export report output to PDF

Client reports should summarize client work only.

Supervision and CPD must have their own reporting paths and must not be mixed into client reports.

### 9.6 Invoices

The app must support invoice generation for:

- Session Notes
- Assessment Notes

Requirements:

- one invoice per source note
- invoice number sequencing
- therapist details sourced from therapist configuration
- session rate sourced from the client record
- PDF invoice output persisted and re-openable later

The invoice system is intentionally minimal and not a full billing workflow.

### 9.7 Therapist Details

The app must support a therapist details modal/panel to store business details used in invoices.

Examples include:

- business name
- therapist name
- accreditation
- therapy type
- website
- email
- bank details
- IBAN
- BIC
- address details
- currency

### 9.8 Calendar / Appointments

The app includes a calendar mode inside Pane 3.

Requirements:

- week / month / year views
- create appointments for active clients
- support recurring weekly appointments
- support cancelling, moving, and deleting occurrences
- support deleting occurrences, future series, or whole series
- integrate appointment display into calendar-only workflows

The calendar is not a separate product. It exists to support therapist planning inside the same workspace.

### 9.9 Today’s Sessions Panel

The app includes a lightweight floating summary of today’s appointments.

Purpose:

- help the therapist quickly understand the day’s planned work on app open
- not act as a full notification system

### 9.10 Backup and Restore

The app must support:

- creating an encrypted backup of the local database
- restoring from an encrypted backup

This exists to support device changeover, safety, and local data resilience.

### 9.11 Themes

The app supports:

- Dark Mode
- Light Mode

Theme preference must persist across app launches.

## 10. UX Requirements

### 10.1 Main Layout

The product uses a desktop 3-pane structure:

- Pane 1: client navigation and special sections
- Pane 2: note list / record list
- Pane 3: selected note details or calendar

This layout is core to the product and should be preserved unless a deliberate redesign replaces it.

### 10.2 Interaction Principles

- the UI should feel quiet and spacious
- important actions should be visually clear
- secondary controls should remain muted
- cards and lists should be easy to scan
- note editing should feel like working inside a calm document workspace

### 10.3 Information Hierarchy

Users must immediately understand:

- where they are
- what type of record they are viewing
- whether the record belongs to a client or to a dedicated section
- what actions are available

## 11. Data and Storage Requirements

- local SQLite database
- schema migrations supported over time
- no mandatory cloud dependency
- local file-based PDF storage for invoices
- local storage for theme and lightweight UI state
- preserved records for reporting and history

Migration compatibility is important because the product is already in live use.

## 12. Success Criteria

The product is successful if:

- therapists can manage their core records without needing multiple tools
- the daily workflow feels faster than ad hoc notes + spreadsheets
- reports and invoices are practically usable
- users trust the product for private local record keeping
- the UI feels calm and professional rather than admin-heavy
- backup/restore gives users confidence that their data is not fragile

### Example measurable outcomes

- a user can create and save a new note in under 30 seconds
- a user can find a client record or note quickly through search/filtering
- a user can generate a report or invoice without leaving the app
- calendar appointment creation and editing is reliable
- user data remains local unless explicitly exported

## 13. Risks and Constraints

### Product Risks

- scope creep into full practice-management software
- overcomplicating invoicing
- mixing supervision/CPD/client work in ways that reduce clarity
- UI complexity increasing as more features are added

### Technical Constraints

- local-only architecture limits automatic sync
- desktop distribution and OS packaging create platform-specific complexity
- PDF rendering and invoice persistence must remain consistent across updates
- database migrations must be handled safely to avoid user data loss

## 14. Future Opportunities

Potential future areas, if explicitly prioritized later:

- native macOS rewrite
- Windows version
- richer invoice workflows
- more advanced report filtering
- export/import improvements
- therapist dashboard enhancements
- stronger appointment analytics

These are not part of the current core scope unless separately approved.

## 15. Summary

Solu Notes is a local-first therapist desktop workspace focused on structured note taking, supervision and CPD tracking, reporting, invoicing, and appointments.

It is intended for private practitioners who need something more structured than generic notes apps, but lighter and more private than full cloud practice-management systems.

The product should remain tightly focused on helping therapists manage their real day-to-day work from a single calm desktop application without building the wrong thing:

- not enterprise admin software
- not a cloud platform
- not a full accounting system
- not a client portal

It is a privacy-first therapist workspace.
