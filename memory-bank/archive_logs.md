# Archive Logs — CAMSO Mobile App Backend

## Days 9–10 Execution Log (Archived 14 October 2026)

### Admin Dealers
- Created `dealers.admin.routes.js`, extended `controller.js`, `service.js`, `repository.js`, `validation.js`.
- Full CRUD with `is_active` support. VIEWER can read; CONTENT_ADMIN+ can mutate.
- Bug fixed: `Dealer` model has no `created_at` field — removed from `ALLOWED_SORT` in repository.
- Bug fixed: Joi `.email()` rejects `.test` and `.camso` TLDs — added `{ tlds: { allow: false } }`.

### Admin Feedback
- Created `feedback.admin.routes.js`, extended controller/service/repository.
- Read-only list with pagination. CSV export (`text/csv` Content-Type).
- Roles: VIEWER, CONTENT_ADMIN, SUPER_ADMIN can read. MARKETING cannot.

### Admin Notifications
- Created `notifications.admin.routes.js`, extended controller/service/repository.
- Full CRUD with polymorphic translation support.
- Roles: VIEWER can read; MARKETING+ can mutate; CONTENT_ADMIN cannot mutate.

### Admin Campaigns
- Created `campaigns.admin.routes.js`, `campaigns.controller.js`, `campaigns.service.js`, `campaigns.repository.js`.
- FCM targeting (ALL_USERS, BUSINESS_TYPE, LANGUAGE, COUNTRY).
- Token deduplication, batching (500), invalid token deactivation.
- Bug fixed: Campaign model has no `sent_at` field — removed from update call.
- Bug fixed: Prisma 6 `{ fcm_token: { not: null } }` syntax rejected — removed, filter to be done in-app.

### Admin Users
- Created `admin-users.admin.routes.js`, `admin-users.controller.js`, `admin-users.service.js`.
- Extended `admin-users.repository.js` with `findAllAdminUsers`, `findAdminUserDetail`, `findByEmail`, `createAdminUser`, `updateAdminUser`.
- SUPER_ADMIN only. password_hash NEVER returned. bcrypt (12 rounds).
- `findAdminById` (used by adminGuard) is PRESERVED unchanged.
