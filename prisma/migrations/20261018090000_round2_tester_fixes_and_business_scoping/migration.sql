-- Migration: 20261018090000_round2_tester_fixes_and_business_scoping
-- Description: Additive schema updates for Bookmark and UserCalculation business scoping (Dealers, Distributors, OEM Partners).

-- AlterTable: bookmarks
ALTER TABLE "bookmarks"
  ADD COLUMN "business_user_id" TEXT;

CREATE INDEX "bookmarks_business_user_id_idx" ON "bookmarks"("business_user_id");

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_business_user_id_fkey" FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: user_calculations
ALTER TABLE "user_calculations"
  ADD COLUMN "business_user_id" TEXT,
  ADD COLUMN "organization_id" TEXT;

CREATE INDEX "user_calculations_business_user_id_created_at_idx" ON "user_calculations"("business_user_id", "created_at");
CREATE INDEX "user_calculations_organization_id_created_at_idx" ON "user_calculations"("organization_id", "created_at");

ALTER TABLE "user_calculations"
  ADD CONSTRAINT "user_calculations_business_user_id_fkey" FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_calculations"
  ADD CONSTRAINT "user_calculations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "business_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
