-- CreateTable
CREATE TABLE "app_documents" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reading_level" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_documents_slug_key" ON "app_documents"("slug");

-- CreateIndex
CREATE INDEX "app_documents_slug_idx" ON "app_documents"("slug");

-- CreateIndex
CREATE INDEX "app_documents_reading_level_idx" ON "app_documents"("reading_level");
