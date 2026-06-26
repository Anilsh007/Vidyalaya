-- Phase 16: Transport Management
CREATE TYPE "TransportAssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

CREATE TABLE "TransportVehicle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "helperName" TEXT,
    "insuranceValidUntil" TIMESTAMP(3),
    "fitnessValidUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startPoint" TEXT,
    "endPoint" TEXT,
    "monthlyFee" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStop" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pickupTime" TEXT,
    "dropTime" TEXT,
    "stopOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TransportAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyFee" DECIMAL(12,2),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportVehicle_schoolId_vehicleNumber_key" ON "TransportVehicle"("schoolId", "vehicleNumber");
CREATE INDEX "TransportVehicle_schoolId_isActive_isArchived_idx" ON "TransportVehicle"("schoolId", "isActive", "isArchived");
CREATE UNIQUE INDEX "TransportRoute_schoolId_code_key" ON "TransportRoute"("schoolId", "code");
CREATE INDEX "TransportRoute_schoolId_isActive_isArchived_idx" ON "TransportRoute"("schoolId", "isActive", "isArchived");
CREATE INDEX "TransportRoute_schoolId_vehicleId_idx" ON "TransportRoute"("schoolId", "vehicleId");
CREATE UNIQUE INDEX "TransportStop_routeId_name_key" ON "TransportStop"("routeId", "name");
CREATE INDEX "TransportStop_schoolId_routeId_stopOrder_idx" ON "TransportStop"("schoolId", "routeId", "stopOrder");
CREATE INDEX "TransportAssignment_schoolId_status_idx" ON "TransportAssignment"("schoolId", "status");
CREATE INDEX "TransportAssignment_schoolId_routeId_status_idx" ON "TransportAssignment"("schoolId", "routeId", "status");
CREATE INDEX "TransportAssignment_schoolId_studentId_status_idx" ON "TransportAssignment"("schoolId", "studentId", "status");

ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStop" ADD CONSTRAINT "TransportStop_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStop" ADD CONSTRAINT "TransportStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportAssignment" ADD CONSTRAINT "TransportAssignment_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransportStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
