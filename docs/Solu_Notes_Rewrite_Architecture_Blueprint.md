# Solu Notes Rewrite Architecture Blueprint

## 1. Purpose

This document defines the target architecture for a full rewrite of Solu Notes as a native macOS application using:
- Swift
- SwiftUI
- AppKit where needed
- SQLite as the persistence layer

This blueprint translates the previously created product documents into a practical implementation plan.

Related source documents:
- `docs/Solu_Notes_PRD.md`
- `docs/Solu_Notes_User_Flows.md`
- `docs/Solu_Notes_Functional_Specification.md`
- `docs/Solu_Notes_Data_Model_Entity_Map.md`
- `docs/Solu_Notes_UI_Screen_Specification.md`

## 2. Rewrite Goal

Primary goal:
- replace the current Electron + FastAPI + Python desktop architecture with a native macOS application

Target outcomes:
- native Apple desktop UX
- improved App Store readiness
- single-process or tightly controlled native architecture
- maintainable codebase for a solo business
- compatibility with current user data where practical

Non-goals for the first rewrite:
- Windows support
- iPad support
- cloud sync
- collaboration or multi-user support
- server-backed architecture

## 3. Recommended Technology Stack

### 3.1 UI Layer
- `SwiftUI` as the default UI framework
- `AppKit` bridges only where SwiftUI is insufficient

Use AppKit for likely gaps:
- rich text editing integration
- advanced split view behavior if SwiftUI alone becomes limiting
- PDF preview / print integrations if needed
- menu command handling where SwiftUI is awkward

### 3.2 Persistence Layer
- `SQLite`
- recommended wrapper: `GRDB.swift`

Reason:
- stable SQLite support
- migrations
- type-safe records/queries
- suitable for local-first desktop apps

### 3.3 PDF / Export Layer
- Apple-native PDF generation stack
- likely candidates:
  - Core Graphics PDF context
  - PDFKit for preview/opening support

### 3.4 File and System Integration
- native file import/export APIs
- native save/open panels
- native menu commands
- native user defaults / local settings store where appropriate

### 3.5 Backup / Encryption
- local file-based encrypted backup
- use Apple platform cryptography where possible

## 4. Architectural Principles

### 4.1 Product First, Framework Second
The rewrite should preserve product behavior, not mimic the current implementation details mechanically.

### 4.2 Keep Business Rules Out of Views
Views should not own business logic such as:
- reporting rules
- invoice numbering
- note inclusion/exclusion rules
- appointment expansion rules
- client status filtering logic

### 4.3 Preserve Local-First Behavior
The app remains:
- offline-first
- single-user
- local SQLite-backed
- file backup oriented

### 4.4 Prefer Clear Modules Over Clever Reuse
This is a solo-business codebase. Maintainability is more important than aggressive abstraction.

### 4.5 AppKit Only When Needed
Do not force everything into AppKit. Use SwiftUI first. Introduce AppKit intentionally where there is real functional value.

## 5. Target High-Level Architecture

Recommended structure:
- `App`
- `Core`
- `Data`
- `Features`
- `Platform`
- `DesignSystem`

### 5.1 App
Responsibilities:
- app lifecycle
- app entry point
- root dependency wiring
- menu command registration
- window setup
- theme bootstrap

### 5.2 Core
Responsibilities:
- domain entities
- business rules
- value objects
- service interfaces
- shared formatting utilities
- app-wide enums and constants

### 5.3 Data
Responsibilities:
- SQLite access
- migrations
- repositories
- persistence DTO mapping
- backup / restore data movement

### 5.4 Features
Responsibilities:
- screen-level logic grouped by feature
- view models / presentation models
- feature coordinators if needed

Likely feature modules:
- Clients
- Notes
- Supervision
- CPD
- Reports
- Invoices
- Calendar
- TherapistDetails
- BackupRestore
- SettingsTheme

### 5.5 Platform
Responsibilities:
- AppKit integrations
- file dialogs
- menu wiring helpers
- native PDF preview helpers
- clipboard, URL opening, window commands

### 5.6 DesignSystem
Responsibilities:
- typography tokens
- spacing tokens
- colors
- card styles
- input styles
- button styles
- theme handling helpers

## 6. Recommended Module Breakdown

### 6.1 Core Domain Module
Suggested contents:
- `Client`
- `ClientStatus`
- `SessionNote`
- `AssessmentNote`
- `SupervisionNote`
- `CPDNote`
- `TherapistDetail`
- `Invoice`
- `Appointment`
- `AppointmentException`
- derived calendar occurrence model
- report summary models

This module should not depend on SwiftUI.

### 6.2 Data Module
Suggested contents:
- database configuration
- GRDB record definitions or persistence mapping layer
- migrations
- repository implementations
- file backup service
- restore service

Suggested repositories:
- `ClientRepository`
- `SessionNoteRepository`
- `AssessmentNoteRepository`
- `SupervisionRepository`
- `CPDRepository`
- `TherapistDetailRepository`
- `InvoiceRepository`
- `AppointmentRepository`
- `SettingsRepository`

### 6.3 Service Module or Core Services Layer
Suggested contents:
- `ClientService`
- `NotesService`
- `ReportsService`
- `InvoiceService`
- `CalendarService`
- `TodaySessionsService`
- `TherapistDetailsService`
- `BackupService`
- `RestoreService`
- `ThemeService`

These services should implement functional rules from the specification.

### 6.4 Feature UI Modules
Suggested grouping:
- `ClientsFeature`
- `NotesFeature`
- `SupervisionFeature`
- `CPDFeature`
- `ReportsFeature`
- `CalendarFeature`
- `TherapistDetailsFeature`
- `BackupRestoreFeature`
- `SettingsFeature`

Each feature should contain:
- views
- view models
- local presentation models
- interaction handlers

## 7. UI Architecture

## 7.1 Main Workspace
The main app window should be built as a three-pane native workspace.

Recommended structure:
- left pane: clients and sticky footer
- middle pane: note list / section list
- right pane: note editor or calendar mode

Recommended SwiftUI approach:
- custom split layout or `NavigationSplitView` adapted for desktop needs

Likely AppKit intervention points:
- exact split resizing behavior
- high-control desktop layout if SwiftUI split behaviors are insufficient

### 7.2 Menu Architecture
Top menu should own:
- View Reports
- Therapist Details
- Create Encrypted Backup
- Restore From Encrypted Backup
- Dark Mode toggle
- standard window commands

### 7.3 Modal / Sheet Strategy
Use native sheets or modal panels for:
- client info
- therapist details
- add/edit appointment
- backup/restore confirmations
- destructive confirmations

### 7.4 Rich Text Editing Strategy
This is a major architecture choice.

Recommended approach:
- use a native attributed text editing stack
- likely AppKit-backed text view wrapped for SwiftUI

Requirements to preserve:
- bold
- italic
- underline
- heading/subtitle/paragraph styles
- text color
- bullet list
- personal notes and main notes with separate storage rules

Do not try to rebuild a rich text engine from scratch.

## 8. Data and Migration Strategy

### 8.1 Migration Goal
Allow existing Solu Notes users to retain current local data.

### 8.2 Preferred Migration Strategy
Recommended approach:
- preserve SQLite as storage
- create a new native schema that is either:
  - fully compatible with the current schema, or
  - upgraded through an explicit one-time migration process

For a solo-business rewrite, safest option is:
- remain close to the current schema for version 1 of the native rewrite

### 8.3 Migration Modes
Potential strategy:
1. Detect existing current-app database
2. Validate schema version
3. If compatible:
   - open directly
4. If old but migratable:
   - run native migrations
5. If incompatible:
   - create protected backup and run guided import/migration

### 8.4 Fields That Need Special Care
- money/rate fields stored as strings
- supervision note client linkage
- therapist details singleton-like behavior
- invoice polymorphic linking
- calendar data with recurring rules and exceptions

## 9. Feature Architecture Decisions

### 9.1 Clients
Belongs to:
- `ClientsFeature`
- `ClientService`
- `ClientRepository`

Responsibilities:
- list, filter, search
- create/edit/delete
- status management
- client info panel

### 9.2 Notes
Belongs to:
- `NotesFeature`
- `NotesService`
- `SessionNoteRepository`
- `AssessmentNoteRepository`

Responsibilities:
- mixed client note list ordering
- session note editing
- assessment note editing
- personal notes separation
- invoice action entry point

### 9.3 Supervision
Belongs to:
- `SupervisionFeature`
- `SupervisionService`
- `SupervisionRepository`

Responsibilities:
- global supervision list
- supervision note editor
- supervisor details
- summary field
- supervision reporting support

### 9.4 CPD
Belongs to:
- `CPDFeature`
- `CPDService`
- `CPDRepository`

Responsibilities:
- global CPD list
- CPD editor
- organisation/title/link/medium management
- CPD reporting support

### 9.5 Reports
Belongs to:
- `ReportsFeature`
- `ReportsService`

Responsibilities:
- time charts
- preview generation
- client/supervision/CPD filtering
- PDF export integration

### 9.6 Invoices
Belongs to:
- `InvoicesFeature` or integrated note action layer
- `InvoiceService`
- `InvoiceRepository`

Responsibilities:
- invoice generation
- invoice idempotency
- numbering
- PDF generation and file opening

### 9.7 Calendar
Belongs to:
- `CalendarFeature`
- `CalendarService`
- `AppointmentRepository`

Responsibilities:
- week/month/year calendar views
- appointment CRUD
- recurrence expansion
- occurrence move/cancel/delete behavior
- today sessions computation

### 9.8 Backup / Restore
Belongs to:
- `BackupRestoreFeature`
- `BackupService`
- `RestoreService`

Responsibilities:
- encrypted backup creation
- restore warning flow
- database replacement safety

## 10. Persistence Model Recommendation

Recommended path:
- use GRDB records or repository mapping instead of exposing DB records directly to UI

Suggested layering:
- DB record / persistence model
- domain model
- view model

Reason:
- keeps UI from depending directly on storage details
- makes future changes less expensive

## 11. Settings and Preferences Strategy

Split settings into two categories.

### 11.1 Database-Persisted Domain Settings
Examples:
- therapist details

### 11.2 Local App Preferences
Examples:
- theme mode
- panel sort preference
- notification dismissal state for today panel
- UI-only preferences

Preferred storage:
- `UserDefaults` for UI preferences
- database for domain/business settings

## 12. Error Handling Strategy

### 12.1 User-Facing Errors
Errors should be categorized as:
- validation errors
- destructive action confirmations
- recoverable storage errors
- backup/restore errors
- calendar recurrence/action errors

### 12.2 Technical Logging
Recommended:
- structured local logging
- lightweight diagnostic logs for migration and backup/restore

Avoid:
- exposing raw low-level database errors directly to the user

## 13. Security and Privacy Strategy

Baseline principles:
- local-first data storage
- no cloud dependency in phase 1
- encrypted backup support
- minimal external network behavior
- explicit opening only for external URLs and exported files

For App Store readiness:
- keep file access explicit and user initiated
- minimize background helper behavior
- prefer native file dialogs and sandbox-compliant access patterns

## 14. App Store Readiness Strategy

A native rewrite should be designed so that Mac App Store hardening is feasible later.

Implications:
- avoid depending on external helper processes for core behavior
- keep file system access user-driven
- avoid unnecessary background services
- keep architecture compatible with sandboxing

## 15. Delivery Phases

### Phase 1: Foundation
Deliver:
- app shell
- theme support
- database bootstrapping
- clients list and client info panel
- base design system

### Phase 2: Core Note Editing
Deliver:
- session notes
- assessment notes
- supervision notes
- CPD notes
- panel 2 lists
- panel 3 editors
- rich text editing

### Phase 3: Reports and Invoices
Deliver:
- reports screen
- report previews
- PDF export
- invoice generation and reopening

### Phase 4: Calendar
Deliver:
- week/month/year calendar
- appointment CRUD
- recurrence and exceptions
- today sessions panel

### Phase 5: Backup, Restore, and Hardening
Deliver:
- encrypted backup
- restore flow
- migration polish
- QA stabilization
- App Store readiness pass

## 16. Rewrite Risks

Highest-risk areas:
1. rich text editing parity
2. calendar recurrence and exception behavior parity
3. invoice/report PDF fidelity
4. migration compatibility with current SQLite data
5. preserving subtle UX behavior across many refined screens

Mitigation:
- implement from documented behavior, not memory
- test feature-by-feature against current app
- keep migration strategy conservative

## 17. Recommended Folder / Module Shape

Example target structure:
- `SoluNotesApp/`
  - `App/`
  - `Core/`
    - `Domain/`
    - `Services/`
    - `Utilities/`
  - `Data/`
    - `Database/`
    - `Migrations/`
    - `Repositories/`
    - `Backup/`
  - `Features/`
    - `Clients/`
    - `Notes/`
    - `Supervision/`
    - `CPD/`
    - `Reports/`
    - `Calendar/`
    - `TherapistDetails/`
    - `Settings/`
  - `Platform/`
    - `AppKitBridges/`
    - `Menus/`
    - `FileHandling/`
    - `PDFPreview/`
  - `DesignSystem/`
  - `Resources/`

## 18. Definition of Success

The rewrite is successful when:
- the three-pane desktop workflow feels native and stable
- existing users can keep their data safely
- all major product domains work:
  - clients
  - notes
  - supervision
  - CPD
  - reports
  - invoices
  - calendar
  - backup/restore
- the codebase is simpler to reason about than the current split Electron/Python architecture
- future App Store hardening is realistic

## 19. Next Recommended Step

The next step after this blueprint is:
- implementation planning at epic level

Suggested follow-on document:
- `Rewrite Delivery Plan / Epic Breakdown`

That document should define:
- implementation order
- dependencies between features
- milestone outputs
- testing gates
