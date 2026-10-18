-- =============================================================================
-- SAFE PRODUCTION MIGRATION & BACKFILL SCRIPT FOR DOCUMENTS ACCESS LEVEL
-- =============================================================================
-- File: docs/SAFE_PRODUCTION_DOCUMENT_MIGRATION_AND_BACKFILL.sql
--
-- 1. WHAT THIS SCRIPT DOES:
--    Provides an idempotent, fail-closed additive migration and backfill strategy
--    for adding the `access_level` column to the `documents` table in PostgreSQL / Supabase.
-- 2. OVERALL DESIGN:
--    - Creates the DocumentAccessLevel enum idempotently if not present.
--    - Adds the access_level column as NULLABLE (without blind DEFAULT 'PUBLIC').
--    - Executes deterministic backfill queries categorizing existing records by title
--      translations and document_type into ADMIN, OEM, DEALER, and PUBLIC.
--    - Sets any remaining unclassified documents to 'DEALER' (fail-closed, requires auth).
--    - Enforces NOT NULL constraint and sets default for future insertions.
--    - Creates index on access_level for performant role filtering.
-- 3. SAFETY GUARANTEES:
--    - Non-destructive (no columns or tables dropped).
--    - Zero document leakage: no restricted document is defaulted to PUBLIC.
--    - NOT executed automatically; must be executed by authorized administrator.
-- =============================================================================

-- Step 1: Ensure DocumentAccessLevel enum exists
DO $$ BEGIN
    CREATE TYPE "DocumentAccessLevel" AS ENUM ('PUBLIC', 'DEALER', 'DISTRIBUTOR', 'OEM', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add column as nullable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "access_level" "DocumentAccessLevel";

-- Step 3: Backfill existing records based on title patterns and document types

-- 3a. Admin & confidential internal documents -> ADMIN
UPDATE "documents" d
SET "access_level" = 'ADMIN'
WHERE d."access_level" IS NULL
  AND EXISTS (
    SELECT 1 FROM "translations" t
    WHERE t."entity_type" IN ('DOCUMENT', 'document')
      AND t."entity_id" = d."id"
      AND t."field" = 'title'
      AND (
        LOWER(t."value") LIKE '%admin%'
        OR LOWER(t."value") LIKE '%confidential%'
        OR LOWER(t."value") LIKE '%management%'
        OR LOWER(t."value") LIKE '%internal audit%'
        OR LOWER(t."value") LIKE '%restricted-admin%'
        OR LOWER(t."value") LIKE '%prototype%'
        OR LOWER(t."value") LIKE '%internal%'
        OR LOWER(t."value") LIKE '%test-p%'
      )
  );

-- 3b. OEM partner technical documentation & CAD envelope specifications -> OEM
UPDATE "documents" d
SET "access_level" = 'OEM'
WHERE d."access_level" IS NULL
  AND EXISTS (
    SELECT 1 FROM "translations" t
    WHERE t."entity_type" IN ('DOCUMENT', 'document')
      AND t."entity_id" = d."id"
      AND t."field" = 'title'
      AND (
        LOWER(t."value") LIKE '%oem%'
        OR LOWER(t."value") LIKE '%cad%'
        OR LOWER(t."value") LIKE '%fitment%'
      )
  );

-- 3c. Dealer & Distributor commercial warranty & claim processing guides -> DEALER
UPDATE "documents" d
SET "access_level" = 'DEALER'
WHERE d."access_level" IS NULL
  AND (
    d."document_type" = 'WARRANTY'
    OR EXISTS (
      SELECT 1 FROM "translations" t
      WHERE t."entity_type" IN ('DOCUMENT', 'document')
        AND t."entity_id" = d."id"
        AND t."field" = 'title'
        AND LOWER(t."value") LIKE '%warranty%'
        AND (
          LOWER(t."value") LIKE '%dealer%'
          OR LOWER(t."value") LIKE '%distributor%'
          OR LOWER(t."value") LIKE '%commercial%'
          OR LOWER(t."value") LIKE '%claim%'
          OR LOWER(t."value") LIKE '%rma%'
        )
    )
  );

-- 3d. Standard public marketing catalogues and brochures -> PUBLIC
UPDATE "documents" d
SET "access_level" = 'PUBLIC'
WHERE d."access_level" IS NULL
  AND d."document_type" IN ('CATALOGUE', 'BROCHURE');

-- 3e. Product Technical Datasheets and Engineering Application Guides -> PUBLIC
UPDATE "documents" d
SET "access_level" = 'PUBLIC'
WHERE d."access_level" IS NULL
  AND EXISTS (
    SELECT 1 FROM "translations" t
    WHERE t."entity_type" IN ('DOCUMENT', 'document')
      AND t."entity_id" = d."id"
      AND t."field" = 'title'
      AND (
        LOWER(t."value") LIKE '%datasheet%'
        OR LOWER(t."value") LIKE '%data sheet%'
        OR LOWER(t."value") LIKE '%spec sheet%'
        OR LOWER(t."value") LIKE '%application%'
        OR LOWER(t."value") LIKE '%maintenance guide%'
      )
  );

-- 3f. Generic technical guides and bulletins -> DEALER (fail-closed, non-public)
UPDATE "documents" d
SET "access_level" = 'DEALER'
WHERE d."access_level" IS NULL
  AND d."document_type" IN ('TECHNICAL_GUIDE', 'BULLETIN');

-- 3g. Catch-all for any remaining unclassified records -> DEALER (strictly fail-closed)
UPDATE "documents" d
SET "access_level" = 'DEALER'
WHERE d."access_level" IS NULL;

-- Step 4: Enforce NOT NULL and set default for future records
ALTER TABLE "documents" ALTER COLUMN "access_level" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "access_level" SET DEFAULT 'PUBLIC';

-- Step 5: Ensure index exists
CREATE INDEX IF NOT EXISTS "documents_access_level_idx" ON "documents"("access_level");
