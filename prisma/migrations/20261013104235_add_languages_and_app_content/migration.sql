-- CreateTable
CREATE TABLE "languages" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT,
    "flag_emoji" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "app_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB,
    "extra" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "languages_is_active_sort_order_idx" ON "languages"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "app_content_key_key" ON "app_content"("key");

-- CreateIndex
CREATE INDEX "app_content_key_is_active_idx" ON "app_content"("key", "is_active");
