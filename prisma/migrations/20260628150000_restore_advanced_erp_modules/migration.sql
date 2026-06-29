-- Restores advanced ERP operational modules that were dropped by
-- 20260627132112_add_staff_reporting_manager while the application still depended on them.

DO $$
BEGIN
  CREATE TYPE "LibraryIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'OVERDUE', 'LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGED', 'RETURNED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TransportAssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "HostelAllocationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'VACATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LeaveRequesterType" AS ENUM ('STUDENT', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayrollSlipStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExpenseVoucherStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LibraryBook" (
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

CREATE TABLE IF NOT EXISTS "LibraryIssue" (
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

CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'pcs',
  "supplierName" TEXT,
  "location" TEXT,
  "minimumQuantity" INTEGER NOT NULL DEFAULT 0,
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(12,2),
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "movementType" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "movementDate" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "issuedTo" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TransportVehicle" (
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

CREATE TABLE IF NOT EXISTS "TransportRoute" (
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

CREATE TABLE IF NOT EXISTS "TransportStop" (
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

CREATE TABLE IF NOT EXISTS "TransportAssignment" (
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

CREATE TABLE IF NOT EXISTS "Hostel" (
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

CREATE TABLE IF NOT EXISTS "HostelRoom" (
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

CREATE TABLE IF NOT EXISTS "HostelAllocation" (
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

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "requesterType" "LeaveRequesterType" NOT NULL,
  "studentId" TEXT,
  "staffId" TEXT,
  "requesterName" TEXT NOT NULL,
  "leaveType" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "totalDays" DECIMAL(6,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewRemarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollRun" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "paymentDate" TIMESTAMP(3),
  "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdById" TEXT,
  "finalizedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollSlip" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "grossPay" DECIMAL(12,2) NOT NULL,
  "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netPay" DECIMAL(12,2) NOT NULL,
  "status" "PayrollSlipStatus" NOT NULL DEFAULT 'DRAFT',
  "paymentDate" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseVoucher" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "voucherNumber" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "vendorName" TEXT,
  "paidTo" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMode" "FeePaymentMode" NOT NULL,
  "referenceNo" TEXT,
  "status" "ExpenseVoucherStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibraryBook_schoolId_accessionNumber_key" ON "LibraryBook"("schoolId", "accessionNumber");
CREATE INDEX IF NOT EXISTS "LibraryBook_schoolId_title_idx" ON "LibraryBook"("schoolId", "title");
CREATE INDEX IF NOT EXISTS "LibraryBook_schoolId_category_isArchived_idx" ON "LibraryBook"("schoolId", "category", "isArchived");

CREATE INDEX IF NOT EXISTS "LibraryIssue_schoolId_status_issueDate_idx" ON "LibraryIssue"("schoolId", "status", "issueDate");
CREATE INDEX IF NOT EXISTS "LibraryIssue_schoolId_dueDate_status_idx" ON "LibraryIssue"("schoolId", "dueDate", "status");
CREATE INDEX IF NOT EXISTS "LibraryIssue_schoolId_bookId_status_idx" ON "LibraryIssue"("schoolId", "bookId", "status");
CREATE INDEX IF NOT EXISTS "LibraryIssue_studentId_idx" ON "LibraryIssue"("studentId");
CREATE INDEX IF NOT EXISTS "LibraryIssue_staffId_idx" ON "LibraryIssue"("staffId");

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_schoolId_itemCode_key" ON "InventoryItem"("schoolId", "itemCode");
CREATE INDEX IF NOT EXISTS "InventoryItem_schoolId_name_idx" ON "InventoryItem"("schoolId", "name");
CREATE INDEX IF NOT EXISTS "InventoryItem_schoolId_category_isArchived_idx" ON "InventoryItem"("schoolId", "category", "isArchived");
CREATE INDEX IF NOT EXISTS "InventoryItem_schoolId_quantityOnHand_minimumQuantity_idx" ON "InventoryItem"("schoolId", "quantityOnHand", "minimumQuantity");

CREATE INDEX IF NOT EXISTS "InventoryMovement_schoolId_movementDate_idx" ON "InventoryMovement"("schoolId", "movementDate");
CREATE INDEX IF NOT EXISTS "InventoryMovement_schoolId_itemId_movementDate_idx" ON "InventoryMovement"("schoolId", "itemId", "movementDate");
CREATE INDEX IF NOT EXISTS "InventoryMovement_schoolId_movementType_movementDate_idx" ON "InventoryMovement"("schoolId", "movementType", "movementDate");
CREATE INDEX IF NOT EXISTS "InventoryMovement_createdById_idx" ON "InventoryMovement"("createdById");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportVehicle_schoolId_vehicleNumber_key" ON "TransportVehicle"("schoolId", "vehicleNumber");
CREATE INDEX IF NOT EXISTS "TransportVehicle_schoolId_isActive_isArchived_idx" ON "TransportVehicle"("schoolId", "isActive", "isArchived");

CREATE UNIQUE INDEX IF NOT EXISTS "TransportRoute_schoolId_code_key" ON "TransportRoute"("schoolId", "code");
CREATE INDEX IF NOT EXISTS "TransportRoute_schoolId_vehicleId_idx" ON "TransportRoute"("schoolId", "vehicleId");
CREATE INDEX IF NOT EXISTS "TransportRoute_schoolId_isActive_isArchived_idx" ON "TransportRoute"("schoolId", "isActive", "isArchived");

CREATE INDEX IF NOT EXISTS "TransportStop_schoolId_routeId_stopOrder_idx" ON "TransportStop"("schoolId", "routeId", "stopOrder");

CREATE INDEX IF NOT EXISTS "TransportAssignment_schoolId_studentId_status_idx" ON "TransportAssignment"("schoolId", "studentId", "status");
CREATE INDEX IF NOT EXISTS "TransportAssignment_schoolId_routeId_status_idx" ON "TransportAssignment"("schoolId", "routeId", "status");
CREATE INDEX IF NOT EXISTS "TransportAssignment_schoolId_stopId_idx" ON "TransportAssignment"("schoolId", "stopId");
CREATE INDEX IF NOT EXISTS "TransportAssignment_schoolId_startDate_idx" ON "TransportAssignment"("schoolId", "startDate");

CREATE UNIQUE INDEX IF NOT EXISTS "Hostel_schoolId_code_key" ON "Hostel"("schoolId", "code");
CREATE INDEX IF NOT EXISTS "Hostel_schoolId_isActive_isArchived_idx" ON "Hostel"("schoolId", "isActive", "isArchived");

CREATE UNIQUE INDEX IF NOT EXISTS "HostelRoom_schoolId_hostelId_roomNumber_key" ON "HostelRoom"("schoolId", "hostelId", "roomNumber");
CREATE INDEX IF NOT EXISTS "HostelRoom_schoolId_hostelId_isActive_isArchived_idx" ON "HostelRoom"("schoolId", "hostelId", "isActive", "isArchived");

CREATE INDEX IF NOT EXISTS "HostelAllocation_schoolId_studentId_status_idx" ON "HostelAllocation"("schoolId", "studentId", "status");
CREATE INDEX IF NOT EXISTS "HostelAllocation_schoolId_hostelId_roomId_status_idx" ON "HostelAllocation"("schoolId", "hostelId", "roomId", "status");
CREATE INDEX IF NOT EXISTS "HostelAllocation_schoolId_startDate_idx" ON "HostelAllocation"("schoolId", "startDate");

CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_requesterType_status_startDate_idx" ON "LeaveRequest"("schoolId", "requesterType", "status", "startDate");
CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_studentId_status_idx" ON "LeaveRequest"("schoolId", "studentId", "status");
CREATE INDEX IF NOT EXISTS "LeaveRequest_schoolId_staffId_status_idx" ON "LeaveRequest"("schoolId", "staffId", "status");
CREATE INDEX IF NOT EXISTS "LeaveRequest_reviewedById_idx" ON "LeaveRequest"("reviewedById");

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_schoolId_periodMonth_periodYear_key" ON "PayrollRun"("schoolId", "periodMonth", "periodYear");
CREATE INDEX IF NOT EXISTS "PayrollRun_schoolId_status_paymentDate_idx" ON "PayrollRun"("schoolId", "status", "paymentDate");
CREATE INDEX IF NOT EXISTS "PayrollRun_schoolId_periodYear_periodMonth_idx" ON "PayrollRun"("schoolId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "PayrollRun_createdById_idx" ON "PayrollRun"("createdById");

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollSlip_payrollRunId_staffId_key" ON "PayrollSlip"("payrollRunId", "staffId");
CREATE INDEX IF NOT EXISTS "PayrollSlip_schoolId_payrollRunId_status_idx" ON "PayrollSlip"("schoolId", "payrollRunId", "status");
CREATE INDEX IF NOT EXISTS "PayrollSlip_schoolId_staffId_status_idx" ON "PayrollSlip"("schoolId", "staffId", "status");
CREATE INDEX IF NOT EXISTS "PayrollSlip_schoolId_paymentDate_idx" ON "PayrollSlip"("schoolId", "paymentDate");

CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCategory_schoolId_code_key" ON "ExpenseCategory"("schoolId", "code");
CREATE INDEX IF NOT EXISTS "ExpenseCategory_schoolId_isActive_idx" ON "ExpenseCategory"("schoolId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseVoucher_schoolId_voucherNumber_key" ON "ExpenseVoucher"("schoolId", "voucherNumber");
CREATE INDEX IF NOT EXISTS "ExpenseVoucher_schoolId_expenseDate_idx" ON "ExpenseVoucher"("schoolId", "expenseDate");
CREATE INDEX IF NOT EXISTS "ExpenseVoucher_schoolId_status_expenseDate_idx" ON "ExpenseVoucher"("schoolId", "status", "expenseDate");
CREATE INDEX IF NOT EXISTS "ExpenseVoucher_schoolId_categoryId_status_idx" ON "ExpenseVoucher"("schoolId", "categoryId", "status");
CREATE INDEX IF NOT EXISTS "ExpenseVoucher_approvedById_idx" ON "ExpenseVoucher"("approvedById");

DO $$
BEGIN
  ALTER TABLE "LibraryBook"
    ADD CONSTRAINT "LibraryBook_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LibraryIssue"
    ADD CONSTRAINT "LibraryIssue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "LibraryIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "LibraryIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "LibraryIssue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InventoryItem"
    ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "InventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TransportVehicle"
    ADD CONSTRAINT "TransportVehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TransportRoute"
    ADD CONSTRAINT "TransportRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "TransportRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TransportStop"
    ADD CONSTRAINT "TransportStop_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "TransportStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TransportAssignment"
    ADD CONSTRAINT "TransportAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "TransportAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "TransportAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "TransportAssignment_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransportStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Hostel"
    ADD CONSTRAINT "Hostel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "HostelRoom"
    ADD CONSTRAINT "HostelRoom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "HostelRoom_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "HostelAllocation"
    ADD CONSTRAINT "HostelAllocation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "HostelAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "HostelAllocation_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "HostelAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LeaveRequest"
    ADD CONSTRAINT "LeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "LeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "LeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PayrollRun"
    ADD CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "PayrollRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PayrollSlip"
    ADD CONSTRAINT "PayrollSlip_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "PayrollSlip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "PayrollSlip_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExpenseVoucher"
    ADD CONSTRAINT "ExpenseVoucher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ExpenseVoucher_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ExpenseVoucher_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
