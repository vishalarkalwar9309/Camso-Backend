-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CATALOGUE', 'BROCHURE', 'MANUAL', 'TECHNICAL_GUIDE', 'BULLETIN', 'WARRANTY', 'VIDEO');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('SOLIDS', 'OPERATING_COST', 'WORN_PRODUCT_REPLACEMENT', 'REPEAT_PURCHASE');

-- CreateEnum
CREATE TYPE "FaqCategory" AS ENUM ('COMPANY', 'PRODUCT', 'DISTRIBUTION');

-- CreateEnum
CREATE TYPE "DealerType" AS ENUM ('DEALER', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "FeedbackBucket" AS ENUM ('PRODUCT', 'SERVICE', 'PRICING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_LAUNCH', 'DISCONTINUED', 'PROMOTION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateEnum
CREATE TYPE "CampaignTargetType" AS ENUM ('ALL_USERS', 'BUSINESS_TYPE', 'LANGUAGE', 'COUNTRY');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PUBLISH';
ALTER TYPE "AuditAction" ADD VALUE 'UNPUBLISH';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "changes" JSONB,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "category_id" TEXT,
    "document_type" "DocumentType" NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "is_offline_downloadable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "story_type" "StoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "category" "FaqCategory" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "DealerType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "country" VARCHAR(10) NOT NULL,
    "geo_lat" DECIMAL(10,7) NOT NULL,
    "geo_lng" DECIMAL(10,7) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "has_csr" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" VARCHAR(255) NOT NULL,
    "product_id" TEXT,
    "bucket" "FeedbackBucket" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "product_id" TEXT,
    "campaign_id" TEXT,
    "notification_type" "NotificationType" NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target_type" "CampaignTargetType" NOT NULL,
    "target_value" VARCHAR(100),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translations_entity_type_entity_id_idx" ON "translations"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "translations_entity_type_entity_id_field_language_code_key" ON "translations"("entity_type", "entity_id", "field", "language_code");

-- CreateIndex
CREATE INDEX "documents_product_id_idx" ON "documents"("product_id");

-- CreateIndex
CREATE INDEX "documents_category_id_idx" ON "documents"("category_id");

-- CreateIndex
CREATE INDEX "documents_is_published_idx" ON "documents"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "document_files_document_id_language_code_key" ON "document_files"("document_id", "language_code");

-- CreateIndex
CREATE INDEX "testimonials_product_id_idx" ON "testimonials"("product_id");

-- CreateIndex
CREATE INDEX "testimonials_is_published_idx" ON "testimonials"("is_published");

-- CreateIndex
CREATE INDEX "faqs_product_id_idx" ON "faqs"("product_id");

-- CreateIndex
CREATE INDEX "faqs_category_is_published_idx" ON "faqs"("category", "is_published");

-- CreateIndex
CREATE INDEX "dealers_country_is_active_idx" ON "dealers"("country", "is_active");

-- CreateIndex
CREATE INDEX "dealers_geo_lat_geo_lng_idx" ON "dealers"("geo_lat", "geo_lng");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "feedback_product_id_idx" ON "feedback"("product_id");

-- CreateIndex
CREATE INDEX "feedback_bucket_idx" ON "feedback"("bucket");

-- CreateIndex
CREATE INDEX "notifications_campaign_id_idx" ON "notifications"("campaign_id");

-- CreateIndex
CREATE INDEX "notifications_created_by_idx" ON "notifications"("created_by");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "campaigns_created_by_idx" ON "campaigns"("created_by");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
