# Solu Notes Rewrite Delivery Plan / Epic Breakdown

## 1. Purpose

This document converts the rewrite architecture into a delivery plan that can be executed in phases. It is written for a local-first native macOS rewrite of Solu Notes using:
- Swift
- SwiftUI
- AppKit where needed
- local SQLite storage

This plan assumes:
- no cloud backend
- no remote API dependency
- one local database per user
- migration from the current local database is a first-class concern

## 2. Delivery Principles

### 2.1 Preserve the Product Before Polishing It
The first milestone is behavioral parity, not visual perfection.

### 2.2 Keep the Database Local
The rewrite must continue to use:
- local SQLite storage
- local file backup and restore
- local PDF generation

No delivery phase should introduce a server dependency unless explicitly approved as a separate product decision.

### 2.3 Build Core Infrastructure Once
The rewrite should avoid temporary storage layers or throwaway architecture.

### 2.4 Ship in Vertical Slices
Each phase should produce working software, not just internal scaffolding.

## 3. Delivery Model

Recommended delivery strategy:
- Phase 0: planning and foundation validation
- Phase 1: app shell and local data access
- Phase 2: clients and panel 1 flows
- Phase 3: client notes and panel 2 / panel 3 editing
- Phase 4: supervision and CPD
- Phase 5: reports and PDF exports
- Phase 6: invoice generation
- Phase 7: calendar and today panel
- Phase 8: backup / restore and migration hardening
- Phase 9: native polish and release hardening

## 4. Phase 0 - Planning and Technical Foundations

### Goal
Establish the target architecture and prove the basic stack choices before feature work begins.

### Outputs
- confirmed project structure
- dependency setup
- SQLite access working locally
- migration framework selected and tested
- theming foundation selected
- design tokens defined

### Tasks
- create Xcode project structure
- add database library and test local DB creation
- define app directories for:
  - database
  - backups
  - generated PDFs
- define repository interfaces
- define domain models
- define initial theme tokens
- create empty main window with three-pane shell placeholder

### Exit Criteria
- app launches natively
- local SQLite database file can be created and opened
- migrations can run successfully
- theme setting can be persisted locally

## 5. Phase 1 - App Shell and Core Infrastructure

### Goal
Build the permanent shell of the application.

### Outputs
- main macOS app window
- three-pane layout
- theme support
- top menu commands scaffolded
- navigation state management

### Included Features
- top menu entries for:
  - reports
  - therapist details
  - backup
  - restore
  - theme toggle
- panel 1 / panel 2 / panel 3 layout shell
- empty-state handling
- shared design system baseline

### Dependencies
- Phase 0 complete

### Exit Criteria
- three-pane layout stable
- menu actions can open placeholder screens/modals
- dark/light mode works
- app state survives restart where required

## 6. Phase 2 - Clients and Panel 1

### Goal
Restore full client-management capability.

### Outputs
- client list
- status filtering
- searching
- add/edit client flow
- sticky footer area in panel 1

### Included Features
- create client
- edit client
- delete client
- status selection:
  - active
  - waiting list
  - archived
- search by client fields currently supported in product
- panel 1 client cards
- fixed footer section with:
  - supervision card
  - CPD card
  - calendar button placeholder or entry point
  - summary box

### Data Dependencies
- local SQLite `clients` table

### Risks
- preserving current client validation behavior
- preserving filter behavior exactly

### Exit Criteria
- user can create, update, delete, and filter clients
- panel 1 behavior matches current product structure
- local DB persists clients correctly

## 7. Phase 3 - Session and Assessment Notes

### Goal
Restore the main therapeutic note workflow for client-owned notes.

### Outputs
- panel 2 mixed client note list
- panel 3 session editor
- panel 3 assessment editor
- rich text storage
- personal notes behavior

### Included Features
- create session note
- edit session note
- delete session note
- create assessment note
- edit assessment note
- delete assessment note
- mixed ordering in panel 2
- sort dropdown:
  - latest first
  - oldest first
- summary box at bottom of panel 2 for clients
- session type support
- paid toggle
- invoice button placeholder or live integration point
- therapy modality display derived from client

### Technical Dependencies
- native rich text editing decision implemented
- persistence for formatted content defined

### Risks
- rich text parity
- preserving personal-notes exclusion rules
- mixed list ordering parity between assessment and session notes

### Exit Criteria
- user can manage client notes end to end
- rich text persists correctly
- client note list and detail behavior match product expectations

## 8. Phase 4 - Supervision and CPD

### Goal
Restore the two global professional domains outside the client list.

### Outputs
- panel 1 supervision card
- panel 1 CPD card
- panel 2 supervision list
- panel 2 CPD list
- panel 3 supervision editor
- panel 3 CPD editor

### Included Features
- supervision note CRUD
- CPD note CRUD
- supervision summary field
- supervisor details field
- CPD organisation/title/link/medium fields
- bottom summary box in panel 2 for supervision
- bottom summary box in panel 2 for CPD
- correct iconography and theming behavior

### Data Dependencies
- `supervision_notes`
- `cpd_notes`

### Risks
- handling current supervision client linkage while preserving global UX
- CPD and supervision-specific list cards and summary behavior

### Exit Criteria
- supervision and CPD work independently from client notes
- reports can depend on these entities later without additional schema changes

## 9. Phase 5 - Reports and PDF Export

### Goal
Rebuild the reports workspace and reporting exports.

### Outputs
- reports screen
- time allocation visualizations
- preview sections
- PDF export for reports

### Included Features
- client reports
- supervision reports
- CPD reports
- date range filtering
- client selector grouping
- on-screen preview excerpts
- exported PDF with full notes

### Dependencies
- Phases 2, 3, and 4 complete

### Risks
- chart implementation choices
- ensuring preview vs PDF scope remains correct
- CSS bugs from current app should not be reproduced

### Exit Criteria
- user can generate all current report types locally
- PDF export works via native save dialog

## 10. Phase 6 - Invoices

### Goal
Rebuild client invoice generation as a local PDF workflow.

### Outputs
- invoice generation from session and assessment notes
- invoice persistence and reopen behavior
- PDF preview/open flow

### Included Features
- invoice generation for session notes
- invoice generation for assessment notes
- idempotent invoice reopen
- invoice numbering
- therapist details integration
- client-specific rate usage

### Data Dependencies
- `clients`
- `session_notes`
- `assessment_notes`
- `therapist_details`
- `invoices`

### Risks
- PDF fidelity
- numbering correctness
- file-open behavior in native app

### Exit Criteria
- invoice workflow matches current product behavior
- saved invoice files remain reopenable

## 11. Phase 7 - Calendar and Today Panel

### Goal
Restore calendar scheduling and the in-app appointment awareness flows.

### Outputs
- week / month / year calendar
- appointment add/edit/delete
- recurrence handling
- today sessions floating panel

### Included Features
- one-off appointments
- recurring weekly appointments
- occurrence cancel/move/delete flows
- today sessions panel
- panel 1 calendar button entry point
- calendar mode in panel 3
- correct calendar close behavior when notes are selected

### Data Dependencies
- `appointments`
- `appointment_exceptions`

### Risks
- recurrence parity
- delete-scope semantics
- calendar UX density and polish

### Exit Criteria
- calendar is fully usable without dependence on the old app
- today panel reflects local appointment state correctly

## 12. Phase 8 - Therapist Details, Backup/Restore, and Migration Hardening

### Goal
Complete the administrative and continuity features required for real use.

### Outputs
- therapist details panel
- encrypted backup creation
- restore workflow
- migration/import of existing local DB

### Included Features
- therapist details CRUD behavior (singleton-like UI)
- encrypted backup generation
- restore warning and file selection flow
- import/open existing DB safely
- schema migration checks at startup

### Critical Constraint
All of this must continue to assume:
- local DB only
- no external sync service

### Risks
- destructive restore behavior
- migration compatibility with existing user databases
- backup encryption and file handling reliability

### Exit Criteria
- current users can safely move into the rewritten app
- backup and restore are production-safe

## 13. Phase 9 - Native Polish and Release Hardening

### Goal
Make the rewritten app stable, distributable, and ready for broader use.

### Outputs
- UX polish pass
- performance pass
- bug fixing pass
- packaging hardening
- App Store readiness review

### Included Work
- keyboard behavior refinement
- accessibility review
- theme polish
- menu behavior polish
- PDF and file-flow polish
- database corruption recovery safeguards where feasible
- signing / sandbox readiness work if targeting App Store distribution

### Exit Criteria
- native app is stable for external users
- release packaging is reliable
- no major parity gaps remain against current product

## 14. Cross-Phase Technical Streams

These run across phases rather than belonging to one phase only.

### 14.1 Design System Stream
- typography
- spacing
- cards
- controls
- themes
- iconography

### 14.2 Migration Stream
- schema alignment
- test DB fixtures
- migration scripts
- backward compatibility validation

### 14.3 QA Stream
- feature acceptance checks
- regression checklist
- document-based parity review

### 14.4 Performance Stream
- large note list handling
- calendar rendering performance
- report generation responsiveness
- PDF export responsiveness

## 15. Recommended Milestone Sequence

### Milestone A - Core Workspace
Phases included:
- Phase 0
- Phase 1
- Phase 2

Result:
- native app with clients and basic client note workflow

### Milestone B - Full Note Domains
Phases included:
- Phase 3
- Phase 4

Result:
- all note types supported natively

### Milestone C - Operational Output
Phases included:
- Phase 5
- Phase 6

Result:
- reports and invoices complete

### Milestone D - Scheduling and Continuity
Phases included:
- Phase 7
- Phase 8

Result:
- calendar and backup/restore complete

### Milestone E - Release Candidate
Phases included:
- Phase 9

Result:
- production candidate native macOS app

## 16. Testing Gates

Each phase should close only when these are true:
- feature works with local SQLite storage
- no dependency on old Electron/Python runtime remains for that feature
- functional specification requirements are satisfied
- related user flows still make sense
- screens match UI screen specification at a product level

## 17. Estimated Delivery Shape

This is a rough planning shape, not a commitment.

For a solo implementation effort:
- Milestone A: medium effort
- Milestone B: high effort
- Milestone C: medium-high effort
- Milestone D: high effort
- Milestone E: medium effort

Primary schedule drivers:
- rich text editor implementation
- calendar recurrence parity
- migration compatibility
- PDF/report fidelity

## 18. Definition of Delivery Success

The delivery plan is successful if it leads to a rewritten app that:
- preserves the current product model
- remains local-first with SQLite
- is easier to maintain than the current architecture
- is capable of replacing the existing desktop app in production

## 19. Next Recommended Document

The next document after this should be:
- `Implementation Backlog / Story Breakdown`

That document should convert each phase into:
- epics
- stories
- dependencies
- acceptance criteria
- technical tasks
