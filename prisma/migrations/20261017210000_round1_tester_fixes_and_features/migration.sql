-- Migration: 20261017210000_round1_tester_fixes_and_features
-- Description: Additive schema updates supporting 31-issue fixes, polymorphism, activity tracking, and calculations.

-- CreateEnum: BookmarkTargetType
CREATE TYPE "BookmarkTargetType" AS ENUM ('PRODUCT', 'DOCUMENT', 'TESTIMONIAL');

-- CreateEnum: DocumentAccessLevel
CREATE TYPE "DocumentAccessLevel" AS ENUM ('PUBLIC', 'DEALER', 'DISTRIBUTOR', 'OEM', 'ADMIN');

-- CreateEnum: ActivityType
CREATE TYPE "ActivityType" AS ENUM (
  'SEARCH',
  'PRODUCT_VIEW',
  'DOCUMENT_VIEW',
  'DOCUMENT_DOWNLOAD',
  'BOOKMARK_ADD',
  'BOOKMARK_REMOVE',
  'CALCULATION_SAVED',
  'FEEDBACK_SUBMITTED',
  'LOGIN',
  'LOGOUT'
);

-- AlterTable: products
ALTER TABLE "products"
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "launch_date" TIMESTAMP(3),
  ADD COLUMN "key_features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "compatible_equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "data_provenance" TEXT DEFAULT 'PROVISIONAL';

CREATE INDEX "products_is_featured_idx" ON "products"("is_featured");

-- AlterTable: languages
ALTER TABLE "languages"
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: business_users
ALTER TABLE "business_users"
  ADD COLUMN "preferred_language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable: dealers
ALTER TABLE "dealers"
  ADD COLUMN "location_url" VARCHAR(500);

-- AlterTable: documents
ALTER TABLE "documents"
  ADD COLUMN "access_level" "DocumentAccessLevel" NOT NULL DEFAULT 'PUBLIC';

CREATE INDEX "documents_access_level_idx" ON "documents"("access_level");

-- AlterTable: bookmarks
ALTER TABLE "bookmarks"
  ADD COLUMN "target_type" "BookmarkTargetType" NOT NULL DEFAULT 'PRODUCT',
  ALTER COLUMN "product_id" DROP NOT NULL,
  ADD COLUMN "document_id" TEXT,
  ADD COLUMN "testimonial_id" TEXT;

CREATE INDEX "bookmarks_document_id_idx" ON "bookmarks"("document_id");
CREATE INDEX "bookmarks_testimonial_id_idx" ON "bookmarks"("testimonial_id");
CREATE INDEX "bookmarks_target_type_idx" ON "bookmarks"("target_type");

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_testimonial_id_fkey" FOREIGN KEY ("testimonial_id") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: user_activities
CREATE TABLE "user_activities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "business_user_id" TEXT,
  "organization_id" TEXT,
  "device_id" TEXT,
  "activity_type" "ActivityType" NOT NULL,
  "entity_type" VARCHAR(100),
  "entity_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_activities_user_id_created_at_idx" ON "user_activities"("user_id", "created_at");
CREATE INDEX "user_activities_business_user_id_created_at_idx" ON "user_activities"("business_user_id", "created_at");
CREATE INDEX "user_activities_device_id_created_at_idx" ON "user_activities"("device_id", "created_at");
CREATE INDEX "user_activities_activity_type_created_at_idx" ON "user_activities"("activity_type", "created_at");

ALTER TABLE "user_activities"
  ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_activities"
  ADD CONSTRAINT "user_activities_business_user_id_fkey" FOREIGN KEY ("business_user_id") REFERENCES "business_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_activities"
  ADD CONSTRAINT "user_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "business_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: user_calculations
CREATE TABLE "user_calculations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "device_id" TEXT,
  "calculation_type" VARCHAR(100) NOT NULL,
  "title" VARCHAR(255),
  "inputs" JSONB NOT NULL,
  "results" JSONB NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_calculations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_calculations_user_id_created_at_idx" ON "user_calculations"("user_id", "created_at");
CREATE INDEX "user_calculations_device_id_created_at_idx" ON "user_calculations"("device_id", "created_at");
CREATE INDEX "user_calculations_calculation_type_idx" ON "user_calculations"("calculation_type");

ALTER TABLE "user_calculations"
  ADD CONSTRAINT "user_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
