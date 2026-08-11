# Product Context — CAMSO Mobile App Backend

## Purpose
The CAMSO backend powers both the mobile app used by equipment operators, dealers, and field technicians, and the internal CMS used by CAMSO administrators.

## Primary User Flows
1. **Public/End-User Flows**:
   - Browse and search product catalogues, specifications, and manuals.
   - Locate nearby dealers using geo-coordinates.
   - Submit VOC (Voice of Customer) feedback.
   - Receive push notifications regarding new product launches or campaigns.

2. **Admin/CMS Flows**:
   - Admin authentication & JWT rotation with role-based permissions (SUPER_ADMIN, CONTENT_ADMIN, MARKETING, VIEWER).
   - CRUD management for Documents, DocumentFiles, Testimonials, FAQs, Dealers, AppContent.
   - Create and dispatch Push Notification Campaigns (FCM batching up to 500 tokens).
   - Server-side media upload to Firebase Storage with database tracking (`media_assets`).
   - Audit logging for all mutating admin operations (`audit_logs`).

## Key UX & System Guarantees
- Multi-lingual content via polymorphic `translations` table with automatic language fallback (requested language → English default).
- Fail-fast environment validation and standard error responses `{ success: false, error: { type, message, details } }`.
