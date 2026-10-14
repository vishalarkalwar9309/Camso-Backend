-- CreateTable
CREATE TABLE "search_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "query_text" TEXT NOT NULL,
    "filters" JSONB,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_searches" (
    "query_text" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popular_searches_pkey" PRIMARY KEY ("query_text")
);

-- CreateIndex
CREATE INDEX "search_logs_user_id_created_at_idx" ON "search_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "search_logs_device_id_created_at_idx" ON "search_logs"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "search_logs_query_text_idx" ON "search_logs"("query_text");

-- CreateIndex
CREATE INDEX "popular_searches_hit_count_idx" ON "popular_searches"("hit_count" DESC);

-- AddForeignKey
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
