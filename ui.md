1. Admin — Flutter app
The Admin app should be optimized for quick work, not reproduce the entire web dashboard. Build native Flutter pages using the existing API client, authentication, navigation, and design system.
Recommended Admin mobile navigation
Home
Pending count, urgent alerts, recent activity


Requests
Inspect, approve, reject, or escalate


Products
Search, inspect, edit permitted fields


Documents
Search, preview, download, check status


Alerts
Relevant notifications and escalations


More
Users, dealers, feedback, profile




Admin app page requirements
Page	What it should do
Home	Show real pending counts, urgent requests, recent decisions, and shortcuts.
Request details	Show request type, requester, organization, submitted evidence, and status.
Approval action	Approve, reject, request more information, or escalate according to permission. Require a reason for rejection and show a confirmation before submitting.
Product details	Search products and inspect specifications. Allow only small, permitted edits; send complex editing to the web portal.
Documents	Search and view authorized resources, download actual files, and show upload/publication status.
Business verification	Review basic Dealer/Distributor/OEM verification information and process permitted decisions.
Notifications	View relevant alerts and open the associated request, product, or document.
Activity	Show recent actions and decision history available to the current Admin.
Profile	Show assigned role, account status, and sign-out. Do not provide self-service privilege elevation.
Do not prioritize in the app: bulk imports, large document metadata forms, complex category restructuring, permission matrices, detailed analytics exports, system configuration, or full audit-log investigations.



2. Super Admin — Flutter app
The Super Admin app is an oversight and urgent-action tool, not the place to configure the entire platform.
Page	Required capability
Overview	Global summary cards, pending escalations, important alerts, and recent activity.
Approvals	Review escalated requests and sensitive changes; approve/reject with a reason when authorized.
Admin accounts	View Admins, inspect role/status, and perform only safe, supported account actions.
Permissions	Inspect assigned permissions; avoid building a complex permission matrix on mobile.
Security alerts	See important access/security events and revoke a session only if the backend already supports it.
Activity	View recent high-impact actions with actor and timestamp.
System status	Read-only API/integration/upload health if those data sources exist.
Profile	View account and role; sign out securely.
For sensitive approvals, show enough information to make a decision: the affected record, requester, proposed action, relevant evidence, and reason. Require confirmation before submitting the decision.
Do not put these in the app as full management screens: permission matrix editing, detailed audit investigation, bulk changes, system-wide configuration, data exports, or backup/restore.