# CAMSO Admin CMS --- Functional Bug Fixes and End-to-End Reliability Specification

**Target:** Existing deployed CAMSO Admin CMS\
**Current deployment URL:** https://admin-cms-lztw.onrender.com/\
**Purpose:** Give an AI coding agent a detailed, testable plan to fix
missing features, broken controls, incomplete CRUD workflows, pagination
problems, and similar defects without rebuilding the system
unnecessarily.

## 1. Mission and non-negotiable instructions

The existing Admin CMS is already deployed and has working screens,
including Dashboard/Analytics, Catalogue & Products, Support Documents,
FAQs CMS, Testimonials, Dealers Directory, End User VOC & CSV, and Push
Campaigns. The goal is to make the existing system reliable and
complete, not to replace it with a new mock dashboard.

### Required working approach

1.  Inspect the full repository before editing code.
2.  Identify the frontend framework, backend framework, API routes,
    authentication, database models, upload/storage implementation,
    pagination conventions, deployment configuration, and current tests.
3.  Reproduce each issue locally or with safe test data; capture the
    route, action, request/response, and error.
4.  Trace each defect from UI to API to database/storage. Fix the root
    cause, not only the visible button.
5.  Reuse existing architecture, APIs, design system, and deployed data
    model where possible.
6.  Preserve compatibility with the CAMSO Flutter app and any existing
    clients using the same APIs.
7.  Do not replace real API calls with hardcoded arrays, fake success
    messages, or temporary in-memory data.
8.  Do not make destructive changes to production data. Use a
    development/staging environment or test records for verification.
9.  Do not run migrations or bulk updates against production until they
    have been reviewed and a safe backup/rollback plan exists.
10. Do not claim a feature is fixed unless its end-to-end behavior has
    been verified.
11. If a feature cannot work because an API, schema field, or storage
    capability is missing, document the dependency and implement the
    compatible backend change where appropriate. Do not simulate
    success.
12. Keep a change log of files changed, root causes, API/schema changes,
    tests, and unresolved issues.

**Important:** The deployed URL and screenshots help identify the
visible application and reported symptoms, but the agent must inspect
source code and API behavior to establish the exact root causes. Do not
infer the implementation stack from the appearance of the website.

------------------------------------------------------------------------

## 2. Known problems to reproduce and fix

### P0 --- Product/catalogue management is incomplete

-   There is no clear working option to add a new product/catalogue
    entry.
-   Existing product details cannot be edited reliably, including
    technical details such as dimensions.
-   Product creation and editing must cover the full product schema, not
    just the name and description.
-   There must be clear save, cancel, preview, publish/unpublish,
    archive/restore actions where supported by the business rules.
-   Product changes must persist after refresh and must be visible to
    the appropriate CAMSO app/web clients through the shared backend.

### P0 --- Support Documents management is incomplete

-   Admin cannot clearly see which file was uploaded previously for a
    document record.
-   Admin cannot reliably replace/update an uploaded file when a new
    revision is required.
-   The list and detail page must show file metadata and the current
    version.
-   Uploading a replacement must preserve version history rather than
    silently overwrite the old file.
-   The published/current version must be clearly distinguished from old
    or superseded versions.
-   File upload failure must not leave a document marked as successfully
    published with no usable file.

### P0 --- FAQ CMS cannot complete CRUD

-   Admin cannot reliably add new FAQs.
-   Admin cannot reliably edit existing FAQ questions and answers.
-   The workflow needs validation, save/publish behavior, and
    persistence after refresh.
-   Existing FAQs must not disappear or be duplicated due to an
    incorrect create/update API call.

### P1 --- Testimonials lack a delete/remove workflow

-   Admin needs an explicit action to remove a testimonial from public
    display.
-   Prefer **Hide/Unpublish** or **Archive** for routine moderation so
    history is retained.
-   If permanent deletion is a real business requirement, implement it
    only with permission checks, dependency checks, confirmation, and
    audit logging.
-   The UI wording must distinguish Hide/Archive from permanent Delete.
-   After removal, the testimonial must no longer appear in the
    public-facing client/API result where appropriate.

### P1 --- Pagination has no direct last-page navigation

A screenshot shows a paginated list with wording similar to "Showing
page 3 of 7 (92 items)" and no obvious direct control to jump to the
last page.

Pagination must provide: - First page - Previous page - Current page /
total pages - Next page - Last page - A clear total-item count -
Disabled states at boundaries - Page-size selector if supported -
Search/filter behavior that resets to a valid page - Correct state when
an item is added, removed, or filters change

If a list has 7 pages, the user must be able to click **Last** and land
on page 7 directly. Do not require clicking Next repeatedly.

### P0 --- Push campaign send action reports a generic error

The current UI screenshot shows a browser alert saying **"Send failed:
An unexpected error occurred"** while a campaign dispatch confirmation
dialog remains open in a "Dispatching..." state. The page also displays
a banner with "FCM Push Broadcast Dispatched!" and counts of 2 targeted
devices, 0 successes, and 0 failures. These contradictory states must be
investigated.

Required fixes: - Trace the send action from the button through the
frontend API call, backend endpoint, Firebase Cloud Messaging (FCM)
configuration, target selection, and response parsing. - Do not show a
success banner if the backend operation failed or if zero sends were
accepted unless the UI explicitly describes that outcome. - Do not leave
the confirmation dialog stuck in a loading/dispatching state after
success or failure. - Replace generic browser `alert()` error handling
with the app's standard inline/toast/dialog pattern, including a useful
safe error message. - Show the server's structured error message when
safe, and log a correlation/request ID where available. - Distinguish
campaign creation, campaign scheduling, dispatch request acceptance, and
actual push delivery. They are different states. - Show target count,
accepted/success count, failed count, and any provider-reported errors
accurately. - Prevent double dispatch caused by repeated clicks, retry,
or a stuck dialog. - Only mark a campaign as Sent/Dispatched when the
backend confirms that state according to the actual dispatch contract. -
If Firebase credentials, device tokens, permissions, or target audience
are missing/invalid, surface the actionable cause without leaking
secrets. - Never expose FCM service-account credentials or tokens in
browser code or UI.

### P1 --- Similar CRUD and state-consistency defects

The agent must audit the other CMS modules for the same class of issue,
not fix only the five named screens. See the full audit matrix below.

------------------------------------------------------------------------

## 3. Repository and deployment discovery --- required before coding

Produce a brief `AUDIT_FINDINGS.md` or equivalent before implementation.
Include:

-   Frontend framework, entry point, router, shared components, state
    management, API client, and styling system.
-   Backend framework, route/controller/service layout, database/ORM,
    and migrations.
-   Authentication/session implementation and permission checks.
-   Existing product, product specification/dimension, category,
    document, FAQ, testimonial, dealer, feedback, and push-campaign
    schemas.
-   File storage location/provider and how files are served securely.
-   Pagination contract: page/pageSize or limit/offset or cursor; total
    count and total pages.
-   FCM dispatch flow and backend logs available for diagnosis.
-   Existing tests, lint, typecheck, and build commands.
-   Current deployment setup and required environment variables, without
    printing secret values.
-   Which endpoints are consumed by the Flutter app and must remain
    backward compatible.

For each reported defect, record: - Steps to reproduce - Expected
behavior - Actual behavior - Root cause - Files/routes/models involved -
Fix plan - Regression test

Do not stop after this audit; proceed to implementation once the plan is
clear, unless a destructive production action or genuinely blocking
decision requires approval.

------------------------------------------------------------------------

## 4. Global UI and interaction standards

### 4.1 No dead buttons

Every visible button, icon button, menu item, pagination control, tab,
and form submit must perform its stated action. If an action is not
supported, do not render a misleading active control. Use a disabled
control with a short explanation only when useful.

### 4.2 Feedback states

All API-backed operations need: - Idle state - Loading/submitting
state - Success state only after confirmed backend success - Validation
errors - Unauthorized/forbidden response - Not found response -
Conflict/stale-record response - Network/server error with retry where
safe

Avoid native browser `alert()` for ordinary errors. Use a consistent
toast, inline message, or accessible dialog. Keep destructive
confirmations in a modal/dialog.

### 4.3 Forms

-   Clearly label required fields.
-   Validate fields in the UI for usability and again on the server.
-   Keep entered data when a request fails, where safe.
-   Prevent duplicate submissions while a request is in flight.
-   Warn before leaving a form with unsaved changes.
-   Show the saved state or timestamp if useful.
-   On success, refresh the list/detail from the backend rather than
    relying only on optimistic local state.
-   Display field-specific server validation errors when available.

### 4.4 Data integrity

-   Use stable record IDs, not row indexes, as identity.
-   Do not mutate the visible table only and assume the database was
    updated.
-   Handle duplicate names/SKUs according to business rules.
-   Use transactions for multi-step data updates where required.
-   Handle concurrent edits; do not silently overwrite a newer version.
-   Prefer archive/soft delete for business records and content with
    audit value.
-   Confirm irreversible actions and check dependencies.
-   Record who performed important changes and when.

### 4.5 Accessibility and responsive behavior

-   Keyboard-accessible forms, menus, dialogs, and pagination.
-   Visible focus state and accessible button labels.
-   Do not rely on color alone for statuses.
-   Responsive tables/cards that remain usable at smaller widths.
-   Confirmation dialogs should trap focus appropriately and return
    focus to the initiating control.
-   Ensure buttons are not clipped or hidden below the viewport.

------------------------------------------------------------------------

## 5. Product and Catalogue Management --- end-to-end requirements

### 5.1 Catalogue list page

Provide an obvious `+ Add Product` or `+ Add Catalogue Item` primary
button.

Table columns, adapting to actual schema: - Thumbnail - Product name -
Product code/SKU - Category/subcategory - Status - Last updated -
Actions

Filters: - Search by name, code, and keywords - Category/subcategory -
Status (draft/published/archived, if supported) - Updated date

Row actions: - View - Edit - Preview - Publish/Unpublish, according to
permission/status - Archive/Restore - Version history, if supported

Support server-side search, filters, sorting, and pagination. The add
button must be visible for authorized Admins, not hidden due to a layout
overflow or incorrect permission check.

### 5.2 Add product form

Inspect the existing product model and include all fields actually used
by CAMSO. At minimum, cover: - Product name (required) - Product
code/SKU (required if the schema/business rules require it) - Short and
full description - Category and subcategory - Thumbnail/cover image -
Additional images/gallery - Technical specifications - **Dimensions**:
all dimensions represented by the existing model, e.g. length, width,
height, diameter, thickness, or other domain-specific measurements;
include units and validation as applicable - Features - Applications/use
cases - Variants/size/compatibility fields if present in the current
model - Related support documents/resources - Tags and search keywords -
Visibility and publication status - Publication date/scheduling fields
if supported

Do not invent dimension fields without inspecting the current model or
business specification. If the model lacks required dimension fields,
document and implement a compatible schema/API migration, after
considering Flutter/API compatibility.

Controls: - `Save Draft` if draft status exists -
`Save`/`Create Product` - `Preview` - `Publish` or `Submit for Approval`
according to policy - `Cancel` - Field validation and upload progress

### 5.3 Edit product details

-   Open a prefilled form using the actual saved record.
-   Allow all permitted fields, including dimensions and units, to be
    edited.
-   Ensure the update request includes changed fields and does not
    accidentally clear fields omitted from a partial update.
-   For PUT endpoints, send a complete validated object; for PATCH
    endpoints, send only intended changes according to the API contract.
-   After save, reload from backend and verify values persist after page
    refresh.
-   Show a meaningful error if the update is rejected.
-   Avoid reporting success when the API returns an error or no update
    occurs.
-   If approval is required for sensitive changes, save a proposed
    revision and keep live data unchanged until approved.

### 5.4 Product image and linked resource behavior

-   Show existing image thumbnail(s) when editing.
-   Provide replace/add/remove/reorder controls supported by the data
    model.
-   Show upload progress and failed-upload retry.
-   Avoid losing the old image until the replacement is confirmed.
-   Display linked documents and their current status.
-   Warn if a linked resource is archived, unavailable, or inaccessible
    to the intended audience.

### 5.5 Product acceptance tests

-   Create product → appears in list → open → refresh → data persists.
-   Edit dimensions → save → reopen → exact values and units persist.
-   Edit category/specification/description → each field persists.
-   Upload/replace image → correct image appears after refresh.
-   Cancel edit → unsaved values are not saved.
-   Invalid SKU/required fields → validation shown and no invalid record
    created.
-   Publish/unpublish/archive/restore → status and public visibility
    match backend.
-   Failed API request → no fake success; entered data remains.
-   Product updates remain compatible with the Flutter app's existing
    API expectations.

------------------------------------------------------------------------

## 6. Support Documents --- discoverability, replacement, versioning

### 6.1 Document list

The list must make it obvious which file is currently associated with
each record.

Display where available: - Document title - Document type/category -
Linked product(s) - Original/current file name - File type and size -
Version - Uploaded by - Uploaded/updated date - Publication/access
status - Actions

Actions: - View Details - Preview - Download/Open current file, if
authorized - Edit Metadata - Replace File / Upload New Version - View
Version History - Publish/Unpublish - Archive/Restore - Mark Superseded,
if supported

If the table cannot fit all columns, show the most important columns and
place the remaining metadata on a detail page or expandable row. Do not
hide the filename completely.

### 6.2 Document detail page

Show: - Metadata and linked products/categories - Current file name,
file type, size, and uploaded timestamp - Preview where supported -
Current version and publication status - Previous versions and their
dates/statuses - Uploader/updated-by details if available -
Access/visibility policy - Download/access counts only if tracked by the
backend

### 6.3 Replace/update document file flow

1.  Admin opens an existing document.
2.  Clicks `Replace File` or `Upload New Version`.
3.  UI clearly states the existing current version and file name.
4.  Admin selects a new file.
5.  Validate file type/size and upload securely.
6.  Admin enters a version label and change summary if versioning is
    supported/required.
7.  Preview/validate the new file.
8.  Admin saves draft, submits for approval, or publishes according to
    policy.
9.  Backend confirms successful upload and publication.
10. New version becomes current only at the correct workflow stage.
11. Previous version remains in history and is not silently overwritten.
12. UI refreshes and shows the new current filename/version.

If the current backend does not support versions, implement version
storage and metadata in a compatible manner; first inspect current
schema and storage. Do not simply replace a storage path if it destroys
the old file.

### 6.4 Secure file handling

-   Verify file type and size on server.
-   Use the existing storage provider and secure authorization pattern.
-   Do not expose service credentials or private permanent URLs.
-   Handle missing/deleted storage objects gracefully.
-   Do not mark a record published if upload failed.
-   Make file replacement safe: only switch the current reference after
    new upload succeeds.
-   Clean up orphaned temporary uploads where supported, without
    deleting historical versions.

### 6.5 Document acceptance tests

-   Existing document list shows the previously uploaded file name.
-   Open document → file metadata and preview/open action work.
-   Replace file → new file is current after successful save and
    refresh.
-   Previous version remains accessible to authorized admins.
-   Upload failure preserves the old current file and gives a clear
    error.
-   File type/size validation works.
-   Unauthorized users cannot download restricted documents via direct
    URL/API.
-   Document metadata changes persist after refresh.

------------------------------------------------------------------------

## 7. FAQ CMS --- full create/read/update/publish workflow

### 7.1 FAQ list

Display: - Question - Category, if supported - Publication status - Last
updated - Display order if applicable - Actions

Primary action: `+ Add FAQ`.

Row actions: - View - Edit - Preview - Publish/Unpublish -
Archive/Restore

### 7.2 Add FAQ

Fields: - Question (required) - Answer (required) - Category, if
supported - Language, if supported - Related product/document, if
supported - Display order, if supported - Status (draft/published if
model supports it)

Controls: - Save Draft if supported - Save/Create FAQ - Preview -
Publish/Submit for Approval if applicable - Cancel

### 7.3 Edit FAQ

-   Prefill saved question/answer.
-   Update both fields and any supported metadata.
-   Validate empty values and duplicates according to existing rules.
-   Save via the correct update endpoint, not the create endpoint.
-   Reload from backend after saving.
-   Show error if API fails.
-   Confirm unpublish/archive where appropriate.

### 7.4 FAQ acceptance tests

-   Add FAQ → appears in list and public/client response according to
    status.
-   Edit question and answer → changes persist after refresh.
-   Cancel leaves stored content unchanged.
-   Required-field validation prevents empty FAQ.
-   Publish/unpublish updates public visibility.
-   Duplicate submit does not create duplicate FAQ records.
-   Existing FAQs remain intact.

------------------------------------------------------------------------

## 8. Testimonials --- moderation and safe removal

### 8.1 List and actions

Each testimonial should show the useful current fields from the existing
model, such as rating, content, type/product, author/display name, date,
and moderation status.

Actions: - View - Approve/Publish if moderation is supported -
Hide/Unpublish - Archive/Restore - Delete only if explicitly permitted
by business policy - View relevant history if available

### 8.2 Removal workflow

Prefer a safe `Hide`/`Unpublish` or `Archive` action for removing
content from public display: 1. Admin clicks the action. 2. Dialog
explains whether the testimonial will disappear from the public view and
whether it can be restored. 3. Admin confirms. 4. Backend updates
status. 5. UI refreshes the row and counts. 6. Public-facing result/API
no longer includes hidden content. 7. Activity is recorded if audit
logging exists.

If permanent deletion is required: - Show a distinct
`Delete Permanently` action. - Require explicit confirmation and
appropriate permission. - Check dependencies and retention rules. -
Record the actor/action in audit history where supported. - Do not
conflate deletion with unpublishing. - Do not leave orphaned related
data.

### 8.3 Testimonial acceptance tests

-   Hide/archive removes the testimonial from the public view.
-   Restore returns it only when permitted and in the correct status.
-   Delete, if allowed, removes the intended record and does not delete
    unrelated records.
-   Cancel confirmation leaves record unchanged.
-   UI status and item counts update after the backend confirms the
    action.

------------------------------------------------------------------------

## 9. Pagination standard for all list pages

Apply this shared pagination component to Products, Support Documents,
FAQs, Testimonials, Dealers, Users, Requests, Push Campaigns, Feedback,
and any other paginated module.

### 9.1 Required controls

-   `First` (`«`)
-   `Previous` (`‹`)
-   Page indicator, e.g. `Page 3 of 7`
-   `Next` (`›`)
-   `Last` (`»`)
-   Total items, e.g. `92 items`
-   Optional page-size selector: 10 / 25 / 50 / 100, according to
    backend limits

Example: `Showing 21–30 of 92 items` · `First` `Previous` `Page 3 of 10`
`Next` `Last`

### 9.2 Behavior

-   First → page 1.
-   Previous → max(currentPage - 1, 1).
-   Next → min(currentPage + 1, totalPages).
-   Last → totalPages.
-   Disable First/Previous on first page.
-   Disable Next/Last on last page.
-   For zero results, show page 0 of 0 or a clear empty state; do not
    display invalid page 1 of 0.
-   After filters/search change, reset to page 1.
-   After deleting/archiving the last item on a page, recalculate total
    pages and move to the nearest valid page if current page no longer
    exists.
-   When changing page size, reset to page 1 unless the existing
    pagination convention preserves the first visible item.
-   Keep query/filter/page state in the URL if the router supports it,
    so refresh/back navigation behaves predictably.
-   Do not fake last-page navigation by repeatedly clicking Next.
-   Use backend-provided total count/page count where available; ensure
    backend and frontend use the same page-index convention (0-based or
    1-based).

### 9.3 Pagination acceptance tests

-   First, previous, next, and last work correctly.
-   Last button jumps directly to final page.
-   Boundary buttons disable correctly.
-   Page count and item count match backend results.
-   Search/filter resets to valid page.
-   Empty results do not show broken page controls.
-   Deleting the last item on the last page does not strand the user on
    an invalid page.
-   All CMS list pages use consistent pagination behavior.

------------------------------------------------------------------------

## 10. Push Campaigns / FCM --- correct dispatch and error handling

### 10.1 Reproduce and diagnose

The reported UI shows an error alert, "Send failed: An unexpected error
occurred," while a dispatch modal remains on `Dispatching…`. A separate
banner says `FCM Push Broadcast Dispatched!` with
targeted/success/failure counts. Trace the exact request and establish
whether the backend dispatch actually ran.

Inspect: - Frontend click handler and state management - Request URL,
method, payload, auth headers - HTTP status and response body - Backend
route/controller/service logs - Campaign state transition - Firebase
Admin SDK setup and credential source - Target token/audience query -
Token validity and Firebase response - Handling of partial success and
exceptions - CORS/proxy/network/deployment configuration if relevant

Never print secret credential values in logs or documentation.

### 10.2 Correct UI states

Use explicit states: - Draft - Scheduled - Dispatch Requested / Queued,
if supported - Sending, if supported - Sent/Completed only when backend
contract confirms - Partial Failure - Failed - Cancelled, if supported

The UI must not report "dispatched successfully" just because the button
was clicked or a request started.

### 10.3 Dispatch confirmation flow

1.  Admin clicks `Send Now`.
2.  Confirmation dialog shows campaign name, audience/target count if
    known, and consequence.
3.  Admin confirms.
4.  Button becomes disabled and loading indicator appears.
5.  Send one request.
6.  On success, close the modal and show a result with confirmed
    counts/status.
7.  On failure, stop loading, keep/reopen the modal safely, show an
    actionable message, and allow a safe retry if appropriate.
8.  Refresh campaign state from backend.
9.  Prevent double send on repeated clicks or uncertain network timeout.
    If result is unknown, query campaign status before retrying.

### 10.4 Error presentation

-   No raw stack traces, tokens, credentials, or internal server details
    in the browser.
-   Show a safe, meaningful error and request/correlation ID if
    available.
-   Use a generic fallback only when the server provides no safe detail.
-   Log detailed diagnostics server-side.
-   Ensure success and error banners cannot contradict each other.
-   Avoid native `alert()` for normal application errors.

### 10.5 FCM acceptance tests

-   Successful send reports backend-confirmed status and counts.
-   Failed send shows failure, not success.
-   Zero eligible tokens is clearly reported and not presented as a
    successful delivery.
-   Partial success reports accepted/success and failure counts
    accurately.
-   Modal exits loading state on every path.
-   Repeated clicks do not dispatch duplicates.
-   Retry after timeout checks status before re-dispatching where
    possible.
-   Invalid/missing configuration produces an actionable safe error.
-   Secrets are not exposed in frontend assets, responses, or logs.

------------------------------------------------------------------------

## 11. Audit all other modules for similar defects

The agent must run a CRUD/action audit across every module already
present in the application.

  ----------------------------------------------------------------------------------
  Module                              Required audit
  ----------------------------------- ----------------------------------------------
  Dashboard & Analytics               KPI values come from real APIs; cards navigate
                                      to relevant filtered lists; failed widgets
                                      show local errors

  Catalogue & Products                Add/view/edit
                                      dimensions/specifications/images/categories;
                                      persist and refresh; lifecycle actions

  Support Documents                   See existing filename; preview/open;
                                      replace/upload new version; metadata edit;
                                      secure access

  FAQs CMS                            Add/edit/preview/publish/unpublish/archive;
                                      validation and persistence

  Testimonials                        View/moderate/hide/archive/restore/delete if
                                      permitted; public result updates

  Dealers Directory                   Add/edit dealer fields and coordinates; map
                                      pin accuracy; active/inactive state; duplicate
                                      handling

  End User VOC & CSV                  View/search/filter/paginate; CSV export/import
                                      behavior and validation; handle malformed
                                      files and duplicate rows safely

  Push Campaigns                      Create/edit drafts; audience targeting;
                                      schedule/cancel if supported; send; status and
                                      accurate counts; errors/retries

  Any user/request pages              Assignment, decision, reason, status history,
                                      and notifications

  Shared components                   Pagination, search, filters, forms, uploaders,
                                      confirmations, toasts, loading and error
                                      states
  ----------------------------------------------------------------------------------

For each module, inspect every visible button and action menu. Verify
that it has a working handler, calls the correct API, handles errors,
refreshes backend state, and respects permissions.

------------------------------------------------------------------------

## 12. Cross-cutting regression and data-integrity tests

### Create/update/delete/archive

-   Create a test record and verify it is present after refresh.
-   Edit multiple fields and verify all changes persist.
-   Cancel edits and verify no unintended mutation.
-   Archive/hide and verify public visibility changes.
-   Restore and verify correct status.
-   Delete only if permitted; verify exact target record and
    related-data behavior.

### API/network

-   Simulate 400 validation error, 401 unauthenticated, 403 forbidden,
    404 not found, 409 conflict, 500 server error, and network timeout
    where feasible.
-   Verify loading indicators stop on every path.
-   Verify errors are not swallowed.
-   Verify no false success messages.
-   Verify retries do not create duplicate products, FAQs, documents,
    notifications, or campaigns.

### State and concurrency

-   Open a record in two sessions, update one, then attempt a stale
    update in the other.
-   Ensure stale updates are rejected or reconciled rather than silently
    overwriting newer data.
-   Verify list counts and pagination after creation, archive, deletion,
    and filtering.
-   Verify status labels reflect the backend, not stale client state.

### Security

-   Test direct API calls with missing/invalid credentials.
-   Test Admin actions outside the Admin's permission scope.
-   Confirm private document URLs are not publicly usable without
    authorization.
-   Confirm role/permission controls cannot be changed by manipulating
    frontend requests.
-   Ensure upload endpoints validate content server-side.

### Compatibility

-   Confirm product/document fields expected by the Flutter app remain
    stable.
-   If API changes are necessary, maintain backward compatibility or
    coordinate versioned changes.
-   Verify existing end-user pages still display products, documents,
    FAQs, testimonials, dealers, and notifications correctly.

------------------------------------------------------------------------

## 13. Implementation order

Use this priority order to avoid fixing cosmetic issues while core data
operations remain broken.

### Phase 1 --- Audit and reproduce

-   Inventory repository, API contracts, schemas, storage, auth,
    deployment and tests.
-   Reproduce the five named problem areas.
-   Record root causes and affected modules.

### Phase 2 --- Fix core data management

1.  Product add/edit, including dimensions and full schema.
2.  Support document visibility, open/preview, replace/upload version,
    metadata update.
3.  FAQ add/edit and persistence.
4.  Testimonial hide/archive/delete according to policy.
5.  Shared pagination with direct Last-page control.

### Phase 3 --- Fix push campaign reliability

-   Trace backend/FCM dispatch.
-   Resolve contradictory success/error states.
-   Add robust loading/error/retry and duplicate-dispatch protection.

### Phase 4 --- Audit similar defects

-   Test every module and visible action.
-   Fix CRUD, validation, state refresh, pagination, uploads, error
    handling, permissions and responsive issues.
-   Prioritize data loss/security issues over cosmetic defects.

### Phase 5 --- Regression and deployment

-   Run unit/integration/e2e tests available in the repository.
-   Run lint, typecheck, and production build.
-   Test with staging/test data.
-   Verify app/API compatibility.
-   Deploy only through the project's existing deployment process.
-   Report remaining limitations honestly.

------------------------------------------------------------------------

## 14. Required automated tests

Add or update tests using the existing project test framework. Do not
introduce an unrelated framework without a reason.

Minimum coverage: - Product create/edit and dimension persistence. -
Product list/detail refresh after mutation. - Document upload and
replacement; old version preserved. - FAQ create/edit and public
visibility. - Testimonial hide/archive/delete permission and
visibility. - Pagination First/Previous/Next/Last, including empty and
boundary cases. - Search/filter pagination reset. - Push dispatch
success, failure, partial success, and duplicate-click protection. - API
unauthorized/forbidden behavior. - Form validation and error states. -
Backend integration for affected routes/services. - At least one
end-to-end workflow for product, document, FAQ, testimonial moderation,
and campaign dispatch if E2E tooling exists.

If a test cannot be automated due to external Firebase or storage
dependencies, use an appropriate test double for automated tests and
separately document a safe staging verification procedure. Do not claim
live FCM delivery has been tested by a mocked test.

------------------------------------------------------------------------

## 15. Definition of Done

Do not mark the work complete until all applicable items are checked:

-   [ ] The repository and APIs were inspected before changes.
-   [ ] Root cause for each reported issue is documented.
-   [ ] Admin can add a product/catalogue item.
-   [ ] Admin can edit product details including dimensions and
    specifications.
-   [ ] Product changes persist after refresh and remain compatible with
    the app.
-   [ ] Existing uploaded support document filename and metadata are
    visible.
-   [ ] Admin can replace a document/upload a new version without
    silently destroying history.
-   [ ] FAQ creation and editing work and persist.
-   [ ] Testimonial can be removed from public display; permanent delete
    exists only if policy permits.
-   [ ] Pagination includes direct Last-page navigation across all
    relevant list pages.
-   [ ] Pagination handles filters, empty results, and deletion on the
    final page.
-   [ ] Push campaign success/failure states are truthful and
    consistent.
-   [ ] No dispatch modal remains stuck after request completion.
-   [ ] Duplicate sends are prevented where possible.
-   [ ] All other modules have been audited for dead buttons and broken
    CRUD.
-   [ ] Loading, empty, validation, error, forbidden, and success states
    are consistent.
-   [ ] No hardcoded production data or fake success paths were
    introduced.
-   [ ] No secrets or private document URLs are exposed.
-   [ ] Existing Flutter app/API behavior remains intact.
-   [ ] Tests, lint, typecheck, and build results are recorded.
-   [ ] Remaining blockers and manual staging checks are documented.

------------------------------------------------------------------------

## 16. Final report the coding agent must return

At completion, provide: 1. Root cause and fix for each reported issue.
2. Files changed and a short description of each change. 3. API
endpoints or response contracts changed/added. 4. Database
migrations/schema changes, if any. 5. File-storage/versioning changes,
if any. 6. Tests added and exact commands/results. 7. Build/deployment
status. 8. Manual verification steps for each affected module. 9. Any
remaining bugs or blocked features. 10. Confirmation that no production
data was destructively changed during development.

**Final instruction:** Work on the existing CAMSO Admin CMS, fix root
causes, and verify end-to-end functionality. Do not merely improve the
visual design or add buttons without connecting them to working backend
operations.
