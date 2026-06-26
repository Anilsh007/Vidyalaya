-- Phase 17: Hostel Management
CREATE TYPE "HostelAllocationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'VACATED');

CREATE TABLE "Hostel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "wardenName" TEXT,
    "wardenPhone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelRoom" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" TEXT,
    "roomType" TEXT,
    "capacity" INTEGER NOT NULL,
    "monthlyFee" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HostelRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelAllocation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNumber" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "HostelAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyFee" DECIMAL(12,2),
    "guardianConsent" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HostelAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hostel_schoolId_code_key" ON "Hostel"("schoolId", "code");
CREATE INDEX "Hostel_schoolId_isActive_isArchived_idx" ON "Hostel"("schoolId", "isActive", "isArchived");
CREATE UNIQUE INDEX "HostelRoom_hostelId_roomNumber_key" ON "HostelRoom"("hostelId", "roomNumber");
CREATE INDEX "HostelRoom_schoolId_hostelId_isActive_isArchived_idx" ON "HostelRoom"("schoolId", "hostelId", "isActive", "isArchived");
CREATE INDEX "HostelAllocation_schoolId_status_idx" ON "HostelAllocation"("schoolId", "status");
CREATE INDEX "HostelAllocation_schoolId_hostelId_status_idx" ON "HostelAllocation"("schoolId", "hostelId", "status");
CREATE INDEX "HostelAllocation_schoolId_roomId_status_idx" ON "HostelAllocation"("schoolId", "roomId", "status");
CREATE INDEX "HostelAllocation_schoolId_studentId_status_idx" ON "HostelAllocation"("schoolId", "studentId", "status");

ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HostelAllocation" ADD CONSTRAINT "HostelAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
