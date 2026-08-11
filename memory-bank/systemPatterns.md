# System Patterns — CAMSO Mobile App Backend

## Architecture Overview
Strict 5-tier layered modular structure:
`Route` → `Controller` → `Service` → `Repository` → `Prisma Singleton`

## Design Rules & Boundaries
1. **Repository Layer Isolation**:
   - Only `*.repository.js` files may import `src/config/database.js` (`prisma`).
   - Controllers and services must NEVER import Prisma directly.
2. **Business Logic in Services**:
   - Validation, business rules, multi-repository coordination, and audit logging live in `*.service.js`.
3. **Controller Responsibilities**:
   - Express request parsing, invoking services, returning standard responses via `ApiResponse`.
4. **Audit Architecture**:
   - `auditContext.js` middleware populates `req.auditContext` (`actorId`, `role`, `ip`, `userAgent`).
   - `auditService.record()` is explicitly invoked by mutating service methods (never automatically by middleware).
5. **Prisma 6.x Multi-File Schema**:
   - Configured via `prisma.config.js` pointing to `prisma/schema/`.
   - Domain schemas: `core.prisma`, `content.prisma`, `engagement.prisma` (Aary), `catalogue.prisma`, `search.prisma` (Vishal).
6. **Authentication & Token Rotation**:
   - Short-lived JWT Access Tokens (15m).
   - Opaque HMAC-SHA256 hashed Refresh Tokens stored in DB.
   - Refresh token rotation + reuse-detection revokes all active tokens for a principal upon replay attempt.
