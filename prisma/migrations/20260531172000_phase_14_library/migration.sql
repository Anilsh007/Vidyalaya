-- Phase 14: Library Management
CREATE TYPE "LibraryIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'OVERDUE', 'LOST');

CREATE TABLE "LibraryBook" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "category" TEXT,
    "publisher" TEXT,
    "isbn" TEXT,
    "shelfLocation" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryIssue" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "borrowerName" TEXT NOT NULL,
    "borrowerType" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "LibraryIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryBook_schoolId_accessionNumber_key" ON "LibraryBook"("schoolId", "accessionNumber");
CREATE INDEX "LibraryBook_schoolId_title_idx" ON "LibraryBook"("schoolId", "title");
CREATE INDEX "LibraryBook_schoolId_category_isArchived_idx" ON "LibraryBook"("schoolId", "category", "isArchived");
CREATE INDEX "LibraryBook_schoolId_isArchived_availableCopies_idx" ON "LibraryBook"("schoolId", "isArchived", "availableCopies");
CREATE INDEX "LibraryIssue_schoolId_status_dueDate_idx" ON "LibraryIssue"("schoolId", "status", "dueDate");
CREATE INDEX "LibraryIssue_schoolId_bookId_status_idx" ON "LibraryIssue"("schoolId", "bookId", "status");
CREATE INDEX "LibraryIssue_schoolId_studentId_status_idx" ON "LibraryIssue"("schoolId", "studentId", "status");
CREATE INDEX "LibraryIssue_schoolId_staffId_status_idx" ON "LibraryIssue"("schoolId", "staffId", "status");

ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryIssue" ADD CONSTRAINT "LibraryIssue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
