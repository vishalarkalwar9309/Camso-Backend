# CAMSO Super Admin CMS --- Access, Controls, Governance, and Reliability Specification

**Target:** Existing deployed CAMSO Admin CMS at
https://admin-cms-lztw.onrender.com/ and its existing backend\
**Purpose:** Implementation-ready specification for a Super Admin web
dashboard that provides system-wide oversight, Admin account/permission
management, approval governance, audit visibility, security controls,
and operational monitoring.

**Scope:** Super Admin web interface and backend enforcement. The
existing Admin dashboard and Flutter app must continue working. This
specification complements
`CAMSO_Admin_CMS_Bug_Fix_and_Reliability_Spec.md`; it does not replace
the Admin workflows or authorize destructive production changes.

------------------------------------------------------------------------

## 1. Mission and non-negotiable instructions

Build a real Super Admin control plane into the existing CAMSO CMS. Do
not create a separate disconnected CMS, duplicate database, or
static-only dashboard.

Before coding: 1. Inspect the full repository and identify the current
frontend/backend frameworks, routes, authentication/session system, data
models, database, file storage, role logic, deployment configuration,
and tests. 2. Find how the current Super Admin role is represented, if
it exists, and how the Flutter app and Admin web portal obtain effective
permissions. 3. Determine which Admin features and API endpoints already
exist. 4. Identify gaps in backend authorization and any existing
account/role assignment paths. 5. Provide a concise audit and
implementation plan, then proceed with implementation unless a genuinely
blocking or destructive decision requires approval.

Non-negotiable: - Reuse the existing stack and API conventions. -
Preserve existing Admin workflows and Flutter app compatibility. - Use
real API data, not hardcoded production-like arrays or fake success
messages. - Backend authorization is authoritative; frontend hiding is
not security. - Do not expose secrets, service-account credentials,
private file URLs, password hashes, access tokens, or refresh tokens. -
Do not allow an Admin to elevate their own role or grant themselves
additional permissions. - Do not allow a Super Admin to silently erase
audit history. - Avoid locking out every Super Admin. Protect privileged
changes with reauthentication, confirmation, and, where practical, a
second-approver process. - Never run destructive migrations or bulk
changes against production without review, a safe backup, and rollback
plan. - Any unsupported control must be clearly identified as a backend
dependency; never simulate a successful operation. - Do not assume a
route, database field, provider, or response shape exists before
inspecting the code. - Keep a detailed summary of files changed,
schema/API changes, tests, and remaining limitations.

------------------------------------------------------------------------

## 2. Super Admin role and permission model

Super Admin is responsible for platform-wide administration, policy, and
accountability. It should include Admin capabilities where appropriate,
plus elevated governance controls. Some particularly sensitive
operations should still require reauthentication or dual approval.

### 2.1 Role hierarchy

The current CAMSO user roles may include: - End User - Dealer -
Distributor - OEM Partner - Admin - Super Admin

Inspect the actual roles and role storage before implementing. Do not
assume these exact values are currently present.

### 2.2 Authorization model

Use the current RBAC implementation if it is sound; otherwise implement
a compatible role/permission/scope model.

**Role:** What kind of user this is.

**Permission:** What operation they may perform, such as
`product.create`, `document.publish`, `request.approve`, `user.suspend`,
`admin.manage`, `permissions.manage`, `audit.read`, or
`system_settings.manage`.

**Scope:** Which organization, territory, module, or records they can
access.

A permission check should consider: - Authenticated identity - Effective
role/permissions - Record/organization scope - Current record status -
Approval policy - Whether the requested state transition is allowed

The backend must reject unauthorized requests even if a user edits
frontend code or directly calls the API.

### 2.3 Super Admin privileges

Where supported by policy, Super Admin can: - View global dashboard and
cross-module metrics. - Manage Admin accounts and their scoped
permissions. - Review escalated requests and sensitive publication
changes. - Define approval policies and thresholds. - Inspect
platform-wide audit events. - View system health and integration
status. - Manage approved global configuration. - Suspend/revoke
privileged sessions when necessary. - Export authorized reports.

Super Admin should not be able to: - Read secret values such as API
keys, passwords, signing keys, or FCM service-account private keys. -
Bypass audit logging. - erase audit evidence of their own actions. - use
a frontend-only toggle to bypass required backend policy. - silently
change another user's identity or ownership. - delete business records
without dependency and retention checks.

------------------------------------------------------------------------

## 3. Super Admin web layout and left sidebar

Use a persistent sidebar, top header, and scrollable content area. Reuse
CAMSO branding and the existing design system.

### 3.1 Top header

-   CAMSO logo/wordmark and `Super Admin Console` label.
-   Breadcrumbs, e.g. `Super Admin / Admin Management / Permissions`.
-   Global search if supported for Admins, users, products, documents,
    requests, dealers, and audit IDs.
-   Notification/security-alert bell with unread count.
-   Current account name/avatar and `Super Admin` role badge.
-   Profile/security menu.
-   Sign out.
-   Optional environment indicator for staging, clearly distinct from
    production.

### 3.2 Sidebar navigation

Render these sections only if the signed-in account has the
corresponding permission. These are Super Admin destinations, not
ordinary Admin navigation.

1.  **Overview**
    -   Global Dashboard
2.  **Administration**
    -   Admin Accounts
    -   Admin Invitations / Role Requests (if supported)
    -   Roles & Permissions
    -   Access Scopes / Organization Assignments
    -   Sessions & Access (if supported)
3.  **Governance**
    -   Approval Queue
    -   Approval Policies
    -   Escalations
    -   Publication / Sensitive Change History
4.  **Platform Content**
    -   Products Overview
    -   Document Library Overview
    -   Categories Overview
    -   Notifications & Campaigns
    -   Dealer Directory Overview
    -   FAQs / Testimonials / Feedback Overview
5.  **Users & Organizations**
    -   User Directory
    -   Role/Business Verification
    -   Organizations (if supported)
6.  **Audit & Security**
    -   Audit Log
    -   Security Events
    -   Access Denials
    -   Privileged Actions
7.  **System Health**
    -   API/Backend Health
    -   File Storage & Upload Health
    -   Notification/FCM Health
    -   Background Jobs/Scheduled Tasks (if supported)
8.  **Analytics & Reports**
    -   Platform Reports
    -   Admin Activity & Workload
    -   Content and Request Trends
    -   Export Center (if supported)
9.  **System Settings**
    -   Authentication and Session Policies
    -   Approval/Publication Defaults
    -   Upload/File Rules
    -   Notification Defaults
    -   Data Retention/Backup Status (only if safely supported)
10. **My Profile**
    -   Profile
    -   Security settings supported by existing auth
    -   Sign out

Do not render a menu item merely because it is described here. It must
have a functional page, a supported backend capability, and
authorization. If a capability is not available, document it as a
dependency and omit or clearly mark it unavailable instead of creating a
dead link.

### 3.3 Responsive behavior

-   Desktop: expanded sidebar; dense tables and comparison views.
-   Tablet: collapsible sidebar and responsive tables.
-   Mobile browser: navigation drawer, readable cards, and safe urgent
    approvals; complex permission matrices and system configuration
    remain desktop-optimized.
-   No hover-only actions.
-   All menus/dialogs must be keyboard accessible.

------------------------------------------------------------------------

## 4. Super Admin global dashboard

**Route suggestion:** `/super-admin/dashboard`

### 4.1 KPI cards

Show live backend-derived values where available: - Total users by
role - Active Admins / suspended Admins - Pending Admin invitations or
role requests - Pending escalated approvals - Products and published
products - Documents and current published versions - Requests pending /
overdue - Scheduled/sent/failed notifications - Active dealer records -
Recent security events - API/storage/FCM health summaries

Do not use fake values. If a metric is not available, show `Unavailable`
or omit the card.

### 4.2 Dashboard sections

-   **Needs attention:** escalated requests, high-risk publication
    approvals, failed notification jobs, upload failures, security
    alerts.
-   **Admin activity:** recent high-impact actions by Admin, grouped by
    module.
-   **Approval backlog:** queue age and priority.
-   **Platform health:** backend/API, database connectivity if health
    endpoint exists, storage, FCM, and scheduled jobs.
-   **Usage trends:** products/documents published, request volume,
    registrations, downloads, and notification outcomes if data is
    tracked.
-   **Quick actions:** Invite Admin, Review Escalations, Manage
    Permissions, View Audit Log, Review System Health.

### 4.3 Dashboard behavior

-   Date-range filter.
-   Module/organization/territory filter where permitted.
-   Each KPI/card navigates to a relevant filtered page.
-   Refresh/retry.
-   Local error states for individual widgets.
-   No fake zero when data is unavailable.
-   Do not expose personal data unnecessarily in global summaries.

------------------------------------------------------------------------

## 5. Admin Accounts Management

**Routes suggestion** - `/super-admin/admins` -
`/super-admin/admins/invite` - `/super-admin/admins/:id` -
`/super-admin/admins/:id/permissions` -
`/super-admin/admins/:id/activity`

### 5.1 Admin list page

Header: `Admin Accounts`; primary action: `+ Invite Admin`.

Filters: - Name/email/admin ID - Account status - Assigned permission
group - Assigned modules - Organization/territory scope - Invitation
status - Last active, only if tracked and permitted

Columns: - Admin - Email/identifier (appropriately masked where
needed) - Status - Permission group - Scope - Invitation/activation
date - Last active, if available - Actions

Actions: - View Details - Edit Permissions - Change Scope -
Suspend/Reactivate - Revoke Sessions, if supported - View Activity -
Resend Invitation, if supported - Cancel Pending Invitation, if
supported

### 5.2 Invite Admin flow

Fields: - Work email or account identifier supported by existing auth. -
Name/display name if needed. - Permission template/group. - Allowed
modules/permissions. - Scope: organization/territory/record group, if
applicable. - Invitation expiry if supported. - Reason for granting
access (required for audit). - Optional manager/owner field only if the
current model supports it.

Flow: 1. Super Admin opens Invite Admin. 2. Enters identity and chooses
least-privilege permission template. 3. Selects allowed scope. 4. UI
shows a permission summary before confirmation. 5. Backend validates
inviter permission and duplicate/existing account status. 6. Backend
creates invitation or account through the existing auth flow. 7. User
receives an invitation/verification mechanism; never create a default
shared password. 8. UI shows pending invitation only after backend
confirmation. 9. Audit event records who invited the Admin and which
permissions/scope were granted.

If invitation email/OTP infrastructure is absent, document the
dependency and implement a secure compatible flow rather than showing a
fake success state.

### 5.3 Admin detail page

Sections: - Account identity/status - Current roles and permission
group - Module permissions - Data/organization scope -
Invitation/activation status - Recent actions - Recent
approvals/rejections - Security/session metadata only where available
and privacy-appropriate

Actions: - Edit permissions - Change scope - Suspend/reactivate - Revoke
sessions - Resend invitation/verification - View audit history

### 5.4 Suspend/reactivate Admin

Suspension dialog must state the impact: - Admin cannot perform
privileged actions. - Active sessions should be revoked or invalidated
where supported. - Existing records/history remain intact. - Pending
assignments may need reassignment.

Require reason and confirmation. On success, refresh account state. Do
not delete the account to achieve suspension.

Reactivation must restore only the previously approved permission set;
do not grant extra permissions implicitly.

### 5.5 Admin acceptance tests

-   Invite creates a real invitation/account state.
-   Duplicate invitations/accounts are handled safely.
-   Admin cannot elevate own privileges.
-   Suspended Admin is denied privileged API access.
-   Permission changes take effect on both web and Flutter API access.
-   Session revocation works where supported.
-   Audit history records invitation, scope/permission changes,
    suspension, and reactivation.

------------------------------------------------------------------------

## 6. Roles, Permissions, and Access Scopes

**Routes suggestion** - `/super-admin/roles` -
`/super-admin/permissions` - `/super-admin/scopes`

### 6.1 Permission matrix

Provide a searchable matrix with roles/groups as rows and
permissions/modules as columns, or a role detail editor if a matrix
becomes too large.

Example permission groups: - Catalogue Manager - Document Manager -
Request Reviewer - User/Organization Verifier - Dealer Data Manager -
Content Moderator - Notification Manager - Read-only Auditor - Custom
Admin role, if supported

Permission actions: - View - Create - Edit - Publish - Unpublish -
Archive/Restore - Approve/Reject - Export - Manage Users - Manage
Permissions - View Audit - Manage System Settings

Use actual backend permissions where they exist. If they are currently
hardcoded roles, propose a safe migration and map current roles before
applying it.

### 6.2 Editing permissions

-   Show selected role/admin and current permissions.
-   Show inherited permissions if the model supports inheritance.
-   Provide `Select All` only within a clearly named module, not a
    global all-powerful shortcut.
-   Provide `Reset to Template` only if templates exist.
-   Show a before/after summary.
-   Require a reason for privileged permission changes.
-   Warn if the change grants publication, user suspension, export,
    audit, or system-setting access.
-   Prevent self-elevation.
-   Prevent removing the last usable Super Admin or locking out all
    privileged operators without a documented recovery process.
-   Require reauthentication for high-risk changes where supported.
-   Require a second approver for especially sensitive role changes if
    policy supports it.
-   Save only after backend confirms.
-   Record old and new permissions in audit history.

### 6.3 Scope management

Where the application uses organizations, territories, or
module-specific scopes: - Assign Admin to permitted
organizations/territories. - Select which modules the Admin can
operate. - Show a clear scope summary. - Preview the expected scope
impact. - Prevent scope expansion beyond the acting Super Admin's
authority, if applicable. - Log every scope change. - Test the scope on
actual backend list/detail/update endpoints.

### 6.4 Security rules

-   Do not trust role/permission values submitted by the browser.
-   Never store effective permissions only in local storage.
-   Refresh/validate authorization with backend/session mechanism.
-   Enforce record-level scope in APIs.
-   Do not let an Admin call the permission API even if they know its
    URL.
-   Use a policy check on every protected operation.

------------------------------------------------------------------------

## 7. Governance --- Approval Queue and Policies

**Routes suggestion** - `/super-admin/approvals` -
`/super-admin/approvals/:id` - `/super-admin/approval-policies` -
`/super-admin/escalations`

### 7.1 Approval queue

Tabs: - Pending - High Priority - Overdue - Needs Information -
Approved - Rejected - Escalated

Filters: - Change/request type - Submitted by - Module - Priority/risk -
Submitted date - Assigned reviewer - Status - Organization/territory if
relevant

Columns: - Item/request ID - Type (product change, document
publication/version, account/role request, user request, dealer change,
etc.) - Summary - Submitted by - Submitted date - Risk/priority -
Status - Assigned reviewer - Age/SLA if configured

### 7.2 Approval detail and diff

Show: - Original/current live record - Proposed version - Side-by-side
or field-level diff - Submitter and timestamp - Reason/change summary -
Attachments/evidence - Current policy and required approvers - Prior
review history - Related request/product/document/user IDs

Actions: - Approve - Reject (reason required) - Request Changes / More
Information - Assign reviewer if supported - Escalate to another
authorized reviewer if supported

The backend must revalidate current state and permission before
committing the decision. If the live record changed since submission,
require reload/review rather than approving a stale diff.

### 7.3 Approval policy configuration

If policy configuration is supported by the backend, allow Super Admin
to configure: - Which operations require approval. - Which permission
groups can submit and approve. - Risk tiers and thresholds. - Whether
submitter and approver must be different people. - Number of approvers
for high-risk changes. - Escalation conditions and SLA durations. -
Notification recipients for pending/overdue items.

Examples of operations that may require review: - New product
publication (if configured) - Critical product specification changes -
Safety-critical document publication/replacement - Restricted document
access - Admin privilege/permission changes - Account/organization
changes - Dealer record changes with business impact - Global
notification or urgent broadcast

### 7.4 Safe policy updates

-   Show current vs proposed policy.
-   Explain which workflows will be affected.
-   Validate that at least one authorized approver remains.
-   Require confirmation and reason.
-   Apply policy atomically.
-   Record who changed the policy and when.
-   Do not allow frontend-only policy changes; backend must enforce
    them.

------------------------------------------------------------------------

## 8. Platform Content Oversight

Super Admin needs global visibility into the existing Admin-managed
modules, but should not duplicate all Admin screens unnecessarily. Reuse
the same underlying services and components where appropriate, with
broader authorized scope.

### 8.1 Products overview

-   View products across all permitted scopes.
-   Search/filter by category, status, owner, and date.
-   View product details and revision history.
-   Review pending sensitive changes.
-   Unpublish/archive only if permission and policy allow.
-   See products changed recently and failed publication jobs.
-   Do not silently rewrite product data without a revision/audit event.

### 8.2 Document library overview

-   View document records and current versions.
-   See file metadata, access policy, superseded versions, and
    publication status.
-   Investigate failed uploads and missing storage objects.
-   Review sensitive document publication/replacement.
-   Restrict downloads and access details to authorized roles.
-   Never expose private file storage URLs or service credentials.

### 8.3 Categories overview

-   View category hierarchy and linked counts.
-   Investigate duplicate/unused categories.
-   Merge/migrate categories only if supported, with dependency preview
    and audit.
-   Prevent deletion of categories still referenced by
    products/documents.

### 8.4 Notifications and push campaigns

-   View all campaigns and notification history.
-   Inspect scheduled, sending, sent, partial, failed, and cancelled
    statuses where supported.
-   Investigate failed FCM sends using safe diagnostics.
-   Retry only if supported and safe from duplicate dispatch.
-   View audience summary and delivery counts.
-   Restrict urgent/broad broadcasts to authorized Super Admins or a
    specific permission.
-   Do not expose Firebase credentials or device tokens.
-   Ensure a failure cannot coexist with a false success state.

### 8.5 Dealer directory overview

-   View dealer records, location quality, duplicate candidates,
    inactive records, and update history.
-   Review escalated dealer data changes.
-   Preserve the agreed map presentation: do not split dealer locations
    into separate "Dealer" and "Authorized Dealer" headings/categories
    solely based on authorization status.
-   Authorization status may remain in protected operational data if
    required by the business.
-   Do not fabricate missing coordinates.

### 8.6 FAQs, testimonials, feedback

-   View content and moderation status across permitted scopes.
-   Review escalated complaints or sensitive testimonials.
-   Inspect moderation history and reasons.
-   Restore archived content only under policy.
-   Keep internal notes private.
-   Preserve original testimonial content and consent/history.

------------------------------------------------------------------------

## 9. Users, Roles, and Organizations Oversight

**Routes suggestion** - `/super-admin/users` -
`/super-admin/verifications` - `/super-admin/organizations`

### 9.1 User directory

Filters: - User ID/name/email where permitted - Role - Account status -
Verification status - Organization - Registration date - Relevant
activity status, if tracked

Columns: - User - Role(s) - Organization - Verification state - Account
state - Registered date - Actions

Actions, according to permission: - View profile - Review verification -
Approve/reject business-role verification - Request additional
information - Suspend/reactivate - Review related requests - View scoped
audit history

### 9.2 Organization oversight

If organizations are part of the existing data model: - View
organization profile and business verification. - View associated users
and assigned roles. - Verify/update organization data through an audited
workflow. - Review pending dealer/distributor/OEM requests. - Suspend
organization access only if supported and authorized. - Show
consequences before suspending an organization with active users. - Do
not invent an organization subsystem if the current app does not use
one; document the required schema/API first.

### 9.3 Sensitive user data

-   Show only data required for the task.
-   Mask personal details where appropriate.
-   Do not show authentication secrets or raw verification files to
    every Super Admin by default; access should be permission-controlled
    and audited.
-   Exports containing personal data require explicit permission and
    audit logging.

------------------------------------------------------------------------

## 10. Audit Log, Security Events, and Privileged Actions

**Routes suggestion** - `/super-admin/audit` -
`/super-admin/security-events` - `/super-admin/privileged-actions`

### 10.1 Audit log list

Columns: - Timestamp - Actor - Role - Action - Module/resource - Record
ID - Outcome - Request/correlation ID - Risk level if defined

Filters: - Date range - Actor - Role - Action - Module -
Success/failure/denied - Resource ID - Risk category

### 10.2 Audit event detail

Show: - Actor and effective role/permission - Action attempted -
Resource type and identifier - Timestamp - Result - Relevant
before/after values with sensitive fields redacted - Reason/approval
reference - Request/correlation ID - Safe error details

### 10.3 Security events

Where supported, surface: - Repeated denied access attempts - Suspicious
permission changes - Admin suspension/reactivation - Privileged session
revocation - Failed login/MFA events - Unusual bulk exports - Failed
upload/security scan - Repeated notification dispatch failures

Do not invent suspicious behavior from incomplete data. Show the source
and timestamp of each event.

### 10.4 Audit integrity

-   Audit records are read-only in the UI.
-   Do not provide a delete or edit button.
-   Protect audit data at the backend/database level from ordinary
    application updates.
-   Redact secrets and unnecessary personal information.
-   Export actions are permission-controlled and themselves audited.
-   If immutable/tamper-evident storage is not implemented, state the
    actual level of protection; do not claim cryptographic immutability
    without implementing it.

------------------------------------------------------------------------

## 11. System Health and Integrations

**Routes suggestion** - `/super-admin/health` -
`/super-admin/health/api` - `/super-admin/health/storage` -
`/super-admin/health/notifications`

Only expose data supported by existing monitoring/health endpoints. Add
safe health endpoints where appropriate.

### 11.1 API/backend health

-   Current health state
-   Last successful check
-   Error rate/latency if monitored
-   Recent failed operations
-   Build/version information if safe
-   Database connectivity status without revealing credentials or
    internal connection strings

### 11.2 File storage health

-   Storage provider status
-   Upload failures
-   Missing/unavailable file references
-   Orphaned file candidates if safely detected
-   Storage usage/quotas if provider exposes them

Do not offer bulk deletion of suspected orphan files without a reviewed
report, backup, and safe confirmation.

### 11.3 FCM/notification health

-   Firebase integration configured/not configured status, without
    showing secrets
-   Recent dispatch outcomes
-   Invalid/unregistered token counts if safely available
-   Queued/failed jobs
-   Provider error categories
-   Retry action only if supported and idempotent

### 11.4 Background jobs

If the system has schedulers/queues: - Job name/type - Status - Last
run - Next run - Duration - Safe error summary - Retry/cancel controls
only if the job system supports them and duplicate effects are prevented

### 11.5 Health-check security

-   Do not expose detailed infrastructure data to unauthenticated public
    endpoints.
-   Keep secret values out of responses.
-   Separate liveness/readiness endpoints from privileged diagnostic
    detail.

------------------------------------------------------------------------

## 12. System Settings and Configuration

**Route suggestion:** `/super-admin/settings`

Only implement settings that are genuinely supported by the backend and
are safe to change through the application.

### 12.1 Configuration groups

-   Authentication/session policy
-   Approval/publication defaults
-   File upload limits and accepted types
-   Notification defaults and allowed audiences
-   Data retention policies
-   Feature flags/module availability
-   Maintenance banner/status
-   Integration status and configuration metadata
-   Backup status/retention information if supported

### 12.2 Configuration form

Each setting should show: - Setting name - Current value, masked where
sensitive - Description and impact - Default/current state - Last
changed by and timestamp if tracked - Proposed new value - Save/Cancel -
Confirmation for high-impact settings

### 12.3 Secret management

-   Do not display or store secrets in browser local storage.
-   Do not return secret values through ordinary GET APIs.
-   Use deployment environment/secret manager for actual credentials.
-   If a credential rotation flow is supported, show status and
    last-rotated metadata without revealing the secret.
-   Do not create a frontend form that writes arbitrary environment
    variables.

### 12.4 Safe setting changes

-   Validate server-side.
-   Show the impact before applying.
-   Require reauthentication or second approval for high-risk settings
    if supported.
-   Apply atomically where possible.
-   Audit old/new non-secret values.
-   Provide rollback guidance for risky changes.
-   If no safe rollback exists, explain before confirmation.

------------------------------------------------------------------------

## 13. Analytics and Reports

**Route suggestion:** `/super-admin/reports`

Reports may include: - User and role distribution - Admin
activity/workload - Product publication and update trends - Document
upload, version, and download trends - Request volume, resolution time,
and overdue backlog - Approval outcomes and review latency -
Dealer-directory completeness and location quality - Notification
dispatch and delivery outcomes - Feedback/complaint volume and
resolution - Security event trends - API/storage health trends where
measured

Controls: - Date range - Module - Role/organization/territory scope -
Export CSV if authorized and supported - Reset filters - Drill down into
the relevant list

Rules: - Metrics must come from real data. - Label metric definitions
and time ranges. - Do not show zero when the metric is unavailable. -
Respect data scopes and privacy. - Audit exports, particularly those
containing personal or security-related data. - Do not export secrets,
tokens, private document URLs, or excessive personal information.

------------------------------------------------------------------------

## 14. Notifications to Super Admin

The Super Admin notification center should prioritize actionable system
events: - Sensitive changes awaiting approval - Overdue escalations -
New Admin invitations/role requests - Admin privilege or scope changes -
Suspicious or repeated authorization failures - Failed document
upload/publication - Repeated FCM dispatch failure - Critical
backend/storage health degradation - High-priority user complaints

Each alert should link to the relevant record or investigation page.
Include severity, timestamp, source, and current status. Avoid noisy
notifications for every low-impact edit.

------------------------------------------------------------------------

## 15. Shared UI conventions and states

Use the existing CAMSO design system. If none exists, use a restrained
enterprise dashboard: - Persistent dark/navy sidebar with CAMSO brand
assets. - Clear page titles and breadcrumbs. - White/neutral surfaces,
consistent spacing, subtle borders. - Strong primary action and clearly
labeled danger actions. - Readable status badges with text, not color
alone. - Dense but legible tables with search, filters, sorting, and
pagination. - Side-by-side diffs for approvals. - Confirmations for
high-impact operations. - No hover-only controls.

Every data-driven page must support: 1. Loading 2. Empty state 3. No
results 4. API/network error and retry 5. Unauthorized/forbidden 6.
Validation error 7. Submitting/loading action 8. Confirmed success 9.
Conflict/stale record 10. Partial failure when applicable

No dead buttons, fake counts, placeholder links, or success messages
before backend confirmation.

------------------------------------------------------------------------

## 16. API and backend capability audit

Inspect existing APIs first. These are logical capabilities, not claims
that endpoints already exist: - Global dashboard metrics - Admin
list/invite/detail/suspend/reactivate/session revoke - Role and
permission templates/matrix - Admin scope assignments - Approval
queue/detail/decision/policy management - Global
product/document/category views and revision diffs - User/organization
verification and status - Notification campaign list/status/retry -
Dealer/content oversight - Audit/security events and export - System
health - Safe configuration reads/updates - Reports and exports

For each capability: - Record existing endpoint and schema. - Record
authorization currently enforced. - Identify missing endpoint or missing
server-side check. - Implement using existing API conventions. -
Preserve compatibility with Admin web and Flutter clients. - Add tests
for allowed and forbidden operations.

Use one shared authenticated API client and the existing session
mechanism. Never trust user-supplied role/permission values from the
browser. Validate every operation server-side.

------------------------------------------------------------------------

## 17. Security and operational safeguards

-   Strong authentication and MFA for privileged users where supported.
-   Reauthentication for high-risk operations where supported.
-   Least privilege by default.
-   Prevent self-elevation and privilege escalation.
-   Prevent removal of the last usable Super Admin without a recovery
    plan.
-   Session revocation must be enforced server-side, not just clear
    frontend state.
-   Enforce organization/record scopes on every endpoint.
-   Use CSRF protection where relevant to the authentication model.
-   Protect against XSS; sanitize user-generated rich text.
-   Rate-limit sensitive endpoints.
-   Keep secrets out of browser bundles, logs, URLs, and API responses.
-   Secure uploads and private document access.
-   Require reasons for suspension, permission changes, and rejection of
    escalated changes.
-   Audit privileged actions.
-   Keep audit records read-only in the application.
-   Avoid irreversible production changes; prefer soft
    suspension/archive.
-   Never expose detailed health diagnostics publicly.
-   Apply a backup and rollback plan before schema/policy migrations.

------------------------------------------------------------------------

## 18. Implementation phases

### Phase 1 --- Audit and security baseline

-   Inspect roles, auth, permissions, API routes, schema, and existing
    Admin UI.
-   Identify how Super Admin is represented.
-   Find insecure direct-object access and privilege-escalation paths.
-   Record current state in `SUPER_ADMIN_AUDIT_FINDINGS.md`.
-   Add tests for role/permission enforcement before expanding
    privileges.

### Phase 2 --- Super Admin shell and dashboard

-   Add role-aware Super Admin route group and layout.
-   Add sidebar/top header.
-   Build global dashboard from real backend metrics.
-   Ensure Admin cannot access Super Admin routes through URL or API.

### Phase 3 --- Admin accounts and permission management

-   Admin list/detail/invitation.
-   Suspend/reactivate and session revocation if supported.
-   Permission groups and scope assignment.
-   Audit every privileged change.
-   Add safe recovery/last-Super-Admin protections.

### Phase 4 --- Approval governance

-   Escalated approval queue and detail diff.
-   Approve/reject/request-changes.
-   Policy configuration if backend supports it.
-   Enforce policies on server and preserve existing live content until
    approval.

### Phase 5 --- Global oversight and audit

-   Content overview pages.
-   User/organization oversight.
-   Audit logs and security events.
-   Scoped reports.

### Phase 6 --- Health and settings

-   API/storage/FCM health from safe endpoints.
-   System settings only where backend support exists.
-   Secret-safe configuration display.

### Phase 7 --- Testing and deployment

-   Run lint/typecheck/build and automated tests.
-   Test role boundaries and API denial cases.
-   Test privilege changes, session revocation, approvals, audit
    logging, and health errors.
-   Verify Admin workflows and Flutter API compatibility.
-   Deploy through existing deployment workflow only after staging
    verification.

------------------------------------------------------------------------

## 19. Acceptance tests / Definition of Done

### Access and navigation

-   [ ] Super Admin can access the authorized console.
-   [ ] Admin cannot access Super Admin UI or APIs by changing URL or
    manually calling endpoints.
-   [ ] Sidebar shows only permitted sections.
-   [ ] Session expiry and sign-out behave correctly.
-   [ ] No Super Admin-only controls leak into Admin navigation.

### Admin account management

-   [ ] Invite creates a real pending invitation/account state.
-   [ ] Duplicate accounts/invitations are handled safely.
-   [ ] Permission changes persist and affect backend authorization.
-   [ ] Self-elevation is prevented.
-   [ ] Suspension denies privileged API actions and invalidates
    sessions where supported.
-   [ ] Reactivation restores only the approved permission set.
-   [ ] Last-Super-Admin lockout is prevented or governed by a recovery
    procedure.
-   [ ] Privileged changes are audited.

### Permissions and scopes

-   [ ] Role/permission editor shows actual backend values.
-   [ ] Before/after permission changes are reviewed and confirmed.
-   [ ] Organization/territory scopes are enforced on list, detail, and
    mutation endpoints.
-   [ ] Unauthorized calls return proper forbidden responses.
-   [ ] Permission updates cannot bypass required approval.

### Approval governance

-   [ ] Queue shows real pending items.
-   [ ] Diff shows current versus proposed content.
-   [ ] Rejection requires a reason.
-   [ ] Stale approval is blocked/reloaded.
-   [ ] Approved revision publishes only after backend decision.
-   [ ] Policy changes are validated and audited.

### Audit/security

-   [ ] Audit list is searchable and scoped.
-   [ ] Audit records have no edit/delete UI.
-   [ ] Sensitive values are redacted.
-   [ ] Export permission is enforced and exports are audited.
-   [ ] Security events are based on real logged events.

### Health/settings

-   [ ] Health pages use real supported endpoints.
-   [ ] Missing monitoring capability is reported as a dependency, not
    fake status.
-   [ ] Secret values never appear in UI, frontend bundles, or API
    responses.
-   [ ] High-impact settings require validation and confirmation.

### Compatibility and quality

-   [ ] Existing Admin dashboard still works.
-   [ ] Product/document/request/notification behavior is unchanged
    except for governed policies.
-   [ ] Flutter app API contracts remain compatible.
-   [ ] All pages have loading, empty, error, forbidden, and conflict
    states.
-   [ ] No dead buttons, fake metrics, or fake success paths.
-   [ ] Lint, typecheck, tests, and build results are recorded.
-   [ ] Remaining dependencies are documented honestly.

------------------------------------------------------------------------

## 20. Instructions to the AI coding agent

Implement this Super Admin control plane in the existing CAMSO Admin
CMS.

**Required workflow:** 1. Inspect the repository, existing Admin
dashboard, auth/session model, role storage, API routes, database
schema, storage, FCM, deployment, and tests. 2. Create
`SUPER_ADMIN_AUDIT_FINDINGS.md` describing existing capabilities,
security gaps, missing endpoints, and the proposed implementation plan.
3. Implement role-aware Super Admin routing/layout and the global
dashboard. 4. Implement Admin account management and permission/scope
governance. 5. Implement approval queue/policies and global oversight.
6. Implement audit/security views, system health, reports, and supported
settings. 7. Add backend authorization and tests for all privileged
operations. 8. Run existing lint/typecheck/build/tests. 9. Provide a
final report with files changed, endpoints/schema changed, test results,
deployment notes, and remaining limitations.

**Do not:** - Build a static mockup instead of real functionality. - Add
buttons without working handlers. - Use hardcoded fake metrics. - Trust
frontend role checks as security. - Let Admins elevate themselves. -
Allow audit log editing/deletion. - expose secrets or private document
URLs. - invent APIs without inspecting the backend. - break existing
Admin or Flutter app contracts. - apply destructive production
migrations without review and rollback planning.

**Expected result:** A functioning Super Admin web console integrated
with the existing CAMSO backend, with global oversight, secure Admin
management, granular permissions/scopes, governed approvals,
auditability, system health, and accurate analytics---while preserving
the existing Admin dashboard and mobile app behavior.
