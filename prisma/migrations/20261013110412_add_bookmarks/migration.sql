-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "bookmarks_device_id_idx" ON "bookmarks"("device_id");

-- CreateIndex
CREATE INDEX "bookmarks_product_id_idx" ON "bookmarks"("product_id");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial Unique Indexes for Bookmarks
CREATE UNIQUE INDEX bookmarks_user_product_unique
  ON bookmarks (user_id, product_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX bookmarks_device_product_unique
  ON bookmarks (device_id, product_id) WHERE device_id IS NOT NULL;
