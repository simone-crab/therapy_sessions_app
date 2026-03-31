# Solu Notes Data Model / Entity Map

## 1. Purpose

This document defines the current persistent data model for Solu Notes as implemented in the existing application. It is intended to support:
- rewrite planning
- database migration planning
- API contract alignment
- feature scoping
- prevention of schema-level guesswork during a rewrite

This is not a conceptual-only model. It reflects the current application structure across:
- SQLAlchemy models
- Pydantic schemas
- current product behaviors inferred from the live codebase

## 2. Storage Model Overview

Primary storage:
- local SQLite database

Primary database file location in the current app:
- app data directory / `therapy.db`

Current persistence style:
- single local database per user
- no cloud sync
- file-based backup/restore

Current persistence domains:
- clients
- client notes
- supervision notes
- CPD notes
- therapist details
- invoices
- calendar appointments
- calendar appointment exceptions

## 3. Shared Table Conventions

Most tables inherit from a shared base model with:
- `id` integer primary key, autoincrement
- `created_at` datetime
- `updated_at` datetime

Implication for rewrite:
- unless there is a strong reason to break compatibility, these fields should remain available across all content entities

## 4. Entity Map

### 4.1 Client

Table:
- `clients`

Purpose:
- canonical record for a therapy client
- parent entity for session notes, assessment notes, and calendar appointments
- source of billing rate and modality for client-linked flows

Primary key:
- `id`

Fields:
- `id: Integer`
- `first_name: String(100)`
- `last_name: String(100)`
- `client_code: String(50), unique, nullable`
- `email: String(255), nullable`
- `phone: String(50), nullable in DB, required on create at API/UI level`
- `date_of_birth: Date, nullable in DB, required on create at API/UI level`
- `initial_assessment_date: Date, nullable`
- `session_hourly_rate: String(64), non-null, default ""`
- `therapy_modality: String(255), nullable`
- `address1: String(255), nullable`
- `address2: String(255), nullable`
- `city: String(100), nullable`
- `postcode: String(20), nullable`
- `emergency_contact_name: String(100), nullable`
- `emergency_contact_relationship: String(100), nullable`
- `emergency_contact_phone: String(50), nullable`
- `gp_name: String(100), nullable`
- `gp_practice: String(255), nullable`
- `gp_phone: String(50), nullable`
- `status: Enum(ClientStatus)`
- `created_at: DateTime`
- `updated_at: DateTime`

Computed properties in current code:
- `full_name`
- `age`

Current enum values:
- `active`
- `waiting_list`
- `archived`

Relationships:
- one-to-many with `session_notes`
- one-to-many with `assessment_notes`
- one-to-many with `appointments`

Product-level rules:
- `client_code` is treated as required in the UI/API for new clients
- `session_hourly_rate` is client-specific and is used for invoice totals
- `therapy_modality` is optional and is displayed in assessment/session note headers
- waiting-list clients are excluded from reports
- archived and waiting-list clients are filtered differently in panel 1

Validation rules in current API layer:
- `client_code` pattern: `^[A-Za-z0-9_.-]+$`
- `email` must be valid if supplied
- `phone` required on create
- `date_of_birth` required on create
- `session_hourly_rate` required on create

Rewrite notes:
- `session_hourly_rate` is stored as string, not decimal
- a rewrite should consider whether to preserve string storage for compatibility or migrate to a numeric money representation

### 4.2 Session Note

Table:
- `session_notes`

Purpose:
- stores standard client therapy session records

Primary key:
- `id`

Fields:
- `id: Integer`
- `client_id: Integer, FK -> clients.id`
- `session_date: Date`
- `duration_minutes: Integer`
- `is_paid: Boolean`
- `content: Text, nullable`
- `personal_notes: Text, nullable`
- `session_type: String(20), default "In-Person"`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- many-to-one with `Client`

Product-level rules:
- appears in panel 2 client note list
- can generate invoice
- personal notes are private and excluded from reports/PDF output
- session type is displayed in note detail and card UI
- client modality is shown in panel 3 header area but is derived from client, not stored in note

Current session type values used in product:
- `In-Person`
- `Online`
- `Phone`

Validation behavior:
- `session_date` required
- `duration_minutes` required
- `is_paid` defaults to `false`

Ordering behavior:
- can be shown latest-first or oldest-first in panel 2
- currently merged with assessments in client note list ordering

### 4.3 Assessment Note

Table:
- `assessment_notes`

Purpose:
- stores client assessment records

Primary key:
- `id`

Fields:
- `id: Integer`
- `client_id: Integer, FK -> clients.id`
- `assessment_date: Date`
- `duration_minutes: Integer`
- `is_paid: Boolean`
- `content: Text, nullable`
- `personal_notes: Text, nullable`
- `session_type: String(20), default "Online"`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- many-to-one with `Client`

Product-level rules:
- appears alongside sessions in client note list
- can generate invoice
- personal notes excluded from reports/PDF output
- session type behaves the same as session notes
- client modality shown in header is derived from client

Current session type values used in product:
- `In-Person`
- `Online`
- `Phone`

Validation behavior:
- `assessment_date` required
- `duration_minutes` required
- `is_paid` defaults to `false`

Ordering behavior:
- can be shown latest-first or oldest-first in panel 2
- merged with session notes in client note list ordering

### 4.4 Supervision Note

Table:
- `supervision_notes`

Purpose:
- stores supervision records in a global supervision area

Primary key:
- `id`

Fields:
- `id: Integer`
- `client_id: Integer, FK -> clients.id, non-null`
- `supervision_date: Date`
- `duration_minutes: Integer, default 50`
- `content: Text, nullable`
- `personal_notes: Text, nullable`
- `summary: String(100), non-null, default ""`
- `supervisor_details: String(255), non-null, default ""`
- `session_type: String(20), non-null, default "Online"`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- currently DB-linked to a client by `client_id`
- product behavior treats supervision as a global section rather than per-client list content

Product-level rules:
- shown in a dedicated `Supervision` section in panel 1
- appears in a dedicated global supervision list in panel 2
- summary is shown on supervision cards and included in supervision reporting/PDF output
- personal notes exist and are excluded from reports/PDF output
- supervisor details are a single free-text name field
- session type available: `In-Person`, `Online`, `Phone`

Validation behavior:
- `summary` max length 100
- `supervisor_details` max length 255
- `duration_minutes` optional in schema update, defaulted in DB/model

Important compatibility note:
- the database still requires `client_id`
- the product currently treats supervision as operationally global
- this is a rewrite decision point: preserve current hidden linkage or normalize supervision into a non-client-owned domain entity

### 4.5 CPD Note

Table:
- `cpd_notes`

Purpose:
- stores Continuing Professional Development records

Primary key:
- `id`

Fields:
- `id: Integer`
- `cpd_date: Date`
- `duration_hours: Float, default 1.0`
- `content: Text, nullable`  
  Current semantic meaning: Focus and Outcome
- `link_url: String(2048), non-null, default ""`
- `organisation: String(255), non-null, default ""`
- `title: String(255), non-null, default ""`
- `medium: String(64), non-null, default "Online"`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- no client foreign key

Current medium values used in product:
- `Online`
- `Podcast`
- `Book`
- `In-Person`

Product-level rules:
- CPD is a separate section, not a client
- appears in its own panel 1 and panel 2 flows
- included in reports under its own selector, not under clients
- `link_url` can be opened in the system browser
- no personal notes section for CPD
- card line 1 shows organisation/date/duration, line 2 shows title

Validation behavior:
- `duration_hours >= 0`
- `link_url` optional in practice

### 4.6 Therapist Detail

Table:
- `therapist_details`

Purpose:
- stores the therapist/business details used for invoices and administrative output

Primary key:
- `id`

Fields:
- `id: Integer`
- `business_name: String(255)`
- `therapist_name: String(255)`
- `accreditation: String(255), nullable`
- `street: String(255), nullable`
- `city: String(120), nullable`
- `postcode: String(32), nullable`
- `therapy_type: String(255)`
- `website: String(512), nullable`
- `email: String(255)`
- `bank: String(255)`
- `session_hourly_rate: String(64)`
- `currency: String(16), default "GBP"`
- `sort_code: String(64)`
- `account_number: String(64)`
- `iban: String(128), non-null, default ""`
- `bic: String(128), non-null, default ""`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- none

Product-level rules:
- typically only one logical therapist detail record is used
- session/hourly rate in therapist details is no longer the source of invoice amount for client invoices
- invoice amount now comes from `Client.session_hourly_rate`
- therapist details still supply invoice header and payment details

Validation behavior:
- `email` must be valid
- website optional
- `iban` and `bic` optional in practice

Rewrite note:
- this behaves like singleton configuration, but the DB does not technically enforce a single row

### 4.7 Invoice

Table:
- `invoices`

Purpose:
- records generated invoices and links them to the source note and PDF file

Primary key:
- `id`

Fields:
- `id: Integer`
- `invoice_number: String(32), unique, indexed`
- `source_type: String(20)`
- `source_id: Integer`
- `year: Integer, indexed`
- `sequence_number: Integer`
- `pdf_path: String(1024)`
- `created_at: DateTime`
- `updated_at: DateTime`

Unique constraints:
- unique `invoice_number`
- unique `(source_type, source_id)`
- unique `(year, sequence_number)`

Relationships:
- none enforced at DB level to note tables
- logical polymorphic relationship to source note

Current source types used in product:
- `session`
- `assessment`

Product-level rules:
- one invoice per source note
- clicking invoice again should reopen the same invoice, not create a duplicate
- invoice numbering format: `INV-YYYY-0001`
- PDFs stored internally and reopened later

Rewrite note:
- a rewrite should keep invoice idempotency and sequence integrity behavior explicit

### 4.8 Appointment

Table:
- `appointments`

Purpose:
- stores calendar appointment series and one-off bookings

Primary key:
- `id`

Fields:
- `id: Integer`
- `client_id: Integer, FK -> clients.id, indexed`
- `title: String(255), nullable`
- `start_datetime: DateTime`
- `end_datetime: DateTime`
- `timezone: String(64), default "Europe/London"`
- `recurrence_rule: Text, nullable`
- `recurrence_until: DateTime, nullable`
- `is_active: Boolean, default true`
- `created_at: DateTime`
- `updated_at: DateTime`

Relationships:
- many-to-one with `Client`
- one-to-many with `appointment_exceptions`

Product-level rules:
- supports one-off and recurring bookings
- current product now allows multiple appointments per client
- stale/completed appointments may be deactivated by cleanup logic
- calendar views expand occurrences from these rows

Rewrite note:
- earlier versions enforced one active appointment per client; that rule has now been removed from product behavior
- rewrite should preserve current product rule, not earlier intermediate behavior

### 4.9 Appointment Exception

Table:
- `appointment_exceptions`

Purpose:
- stores per-occurrence deviations for recurring appointments

Primary key:
- `id`

Fields:
- `id: Integer`
- `appointment_id: Integer, FK -> appointments.id, indexed`
- `occurrence_start_datetime: DateTime`
- `action: String(16)`
- `new_start_datetime: DateTime, nullable`
- `new_end_datetime: DateTime, nullable`
- `created_at: DateTime`
- `updated_at: DateTime`

Unique constraint:
- unique `(appointment_id, occurrence_start_datetime)`

Relationships:
- many-to-one with `Appointment`

Current action values used in product:
- `CANCELLED`
- `MOVED`

Product-level rules:
- canceling one occurrence should not break the series
- moving one occurrence should not break the series
- deletion scopes may transform into cancellation exception, truncate recurrence, or deactivate full series

### 4.10 Derived Calendar Occurrence (Logical Entity, Not Stored Table)

Purpose:
- represents a materialized appointment occurrence returned by the calendar API after recurrence expansion and exception application

Current API shape includes:
- `occurrence_id`
- `appointment_id`
- `client_id`
- `client_name`
- `start`
- `end`
- `status`
- `is_exception`

Status values in current product:
- `ACTIVE`
- `CANCELLED`

Rewrite note:
- this should remain an explicit domain concept even if not persisted as a table

## 5. Relationship Summary

### 5.1 Structural Relationships

- `Client 1 -> many SessionNote`
- `Client 1 -> many AssessmentNote`
- `Client 1 -> many Appointment`
- `Appointment 1 -> many AppointmentException`
- `SupervisionNote -> currently references Client by client_id`
- `CPDNote -> standalone`
- `TherapistDetail -> standalone singleton-like configuration`
- `Invoice -> logical polymorphic link to SessionNote or AssessmentNote`

### 5.2 Product-Domain Grouping

Client-owned domain:
- Client
- Session Note
- Assessment Note
- Appointment
- Invoice (when source is client note)

Global professional domain:
- Supervision Note
- CPD Note
- Therapist Detail

System / support domain:
- Appointment Exception
- Backup payload
- Theme preference  
  Current note: theme preference is client-side persisted, not in this DB

## 6. Enumerations and Controlled Values

### 6.1 ClientStatus
- `active`
- `waiting_list`
- `archived`

### 6.2 Session / Assessment / Supervision Session Type
- `In-Person`
- `Online`
- `Phone`

### 6.3 CPD Medium
- `Online`
- `Podcast`
- `Book`
- `In-Person`

### 6.4 Appointment Exception Action
- `CANCELLED`
- `MOVED`

### 6.5 Invoice Source Type
- `session`
- `assessment`

### 6.6 Known Therapy Modality Options in Product UI
Current UI list includes:
- Acceptance and Commitment Therapy (ACT)
- Cognitive Behavioral Therapy (CBT)
- Dialectical Behavior Therapy (DBT)
- Ecotherapy
- Eye Movement Desensitization and Reprocessing (EMDR)
- Family Systems Therapy
- Gestalt Therapy
- Humanistic Therapy
- Integrative
- Interpersonal Therapy (IPT)
- Psychodynamic Therapy
- Solution-Focused Brief Therapy (SFBT)
- Transactional analysis (TA)

Note:
- therapy modality is stored as free text, not a strict DB enum

## 7. Product Validation vs Database Validation

The current application contains several places where product-level requirements are stronger than database nullability.

### 7.1 Required in product, not strictly required by DB
- client phone
- client date of birth
- client code
- client session/hourly rate

### 7.2 Optional in product and optional in DB
- initial assessment date
- therapy modality
- address lines
- emergency contact details
- GP details
- website
- accreditation
- supervision personal notes
- session personal notes
- assessment personal notes
- CPD link

### 7.3 Optional in product but stored as non-null with default empty string
- supervision summary
- supervision supervisor_details
- CPD organisation
- CPD title
- CPD link_url
- therapist iban
- therapist bic

Rewrite implication:
- a new codebase should clearly separate:
  - domain-required fields
  - UI-required fields
  - DB-not-null defaults used only for compatibility

## 8. Reporting Dependencies

Current report logic depends on:
- client status
- session notes
- assessment notes (for note listings and invoice source, but time reports focus on sessions and supervision)
- supervision notes
- CPD notes

Important product rules reflected in reporting:
- waiting-list clients excluded from reports
- supervision reported separately from client session totals in current product
- CPD has its own report selector and summary
- personal notes never included in reports/PDFs

## 9. Invoice Dependencies

Invoice generation currently depends on:
- `Client`
  - name
  - client-specific `session_hourly_rate`
- `SessionNote` or `AssessmentNote`
  - date
  - paid flag
  - duration context
- `TherapistDetail`
  - business and payment info
- `Invoice`
  - generated invoice tracking and file path persistence

Important rule:
- therapist detail rate is not the invoice amount source for client invoices

## 10. Calendar Dependencies

Calendar behavior currently depends on:
- active clients as selectable appointment targets
- `Appointment`
- `AppointmentException`
- local timezone assumptions, defaulting to `Europe/London`

Important current product rules:
- recurring occurrences are expanded server-side
- exceptions override base occurrences
- cancelled occurrences are hidden by default in UI
- today-session summary panel is derived from calendar occurrences, not note records
- multiple appointments per client are currently allowed

## 11. Rewrite Risk Areas

The following areas need explicit decisions before or during rewrite.

### 11.1 Money Fields Stored as Strings
Affected fields:
- `Client.session_hourly_rate`
- `TherapistDetail.session_hourly_rate`

Risk:
- formatting and numeric validation can become inconsistent

### 11.2 Supervision Note Client Linkage
Current state:
- DB has mandatory `client_id`
- product treats supervision as a global section

Risk:
- conceptual mismatch between schema and UX

### 11.3 Singleton-Like Tables Without Singleton Enforcement
Affected entity:
- `TherapistDetail`

Risk:
- multiple rows possible unless application enforces a single active record pattern

### 11.4 Polymorphic Invoice Link
Current state:
- `Invoice.source_type` + `source_id`

Risk:
- no foreign key integrity across note source types

### 11.5 Free-Text Controlled Options
Affected fields:
- therapy modality
- session types
- CPD medium

Risk:
- new codebase must decide whether to preserve free-text compatibility or formalize strict enums/lookups

## 12. Recommended Rewrite Stance

For a rewrite, the safest approach is:
- preserve the current schema semantics first
- normalize only where a migration strategy is explicit
- keep compatibility with existing SQLite user data as a first-class constraint

Recommended principles:
- treat `Client` as the root aggregate for client-owned work
- treat `Supervision` and `CPD` as separate professional-development domains
- preserve invoice idempotency and numbering logic
- preserve appointment exceptions as explicit records rather than implicit recalculation rules
- keep personal notes explicitly separate from reportable/exportable note content

## 13. Document Outputs Added to the Rewrite Set

Current rewrite-support document set now includes:
- `docs/Solu_Notes_PRD.md`
- `docs/Solu_Notes_PRD.pdf`
- `docs/Solu_Notes_User_Flows.md`
- `docs/Solu_Notes_User_Flows.pdf`
- `docs/Solu_Notes_Functional_Specification.md`
- `docs/Solu_Notes_Functional_Specification.pdf`
- `docs/Solu_Notes_Data_Model_Entity_Map.md`
- `docs/Solu_Notes_Data_Model_Entity_Map.pdf`

## 14. Next Recommended Document

The next most useful document after this one is:
- `UI Screen Specification / Screen Inventory`

Reason:
- it will lock down what appears where, which controls are editable, and which layout behaviors must be preserved in a rewrite
