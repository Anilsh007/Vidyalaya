/*
  Warnings:

  - You are about to drop the `ExpenseCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseVoucher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hostel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HostelAllocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HostelRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryMovement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LibraryBook` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LibraryIssue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayrollRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayrollSlip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportRoute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportStop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportVehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExpenseCategory" DROP CONSTRAINT "ExpenseCategory_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseVoucher" DROP CONSTRAINT "ExpenseVoucher_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseVoucher" DROP CONSTRAINT "ExpenseVoucher_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Hostel" DROP CONSTRAINT "Hostel_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "HostelAllocation" DROP CONSTRAINT "HostelAllocation_hostelId_fkey";

-- DropForeignKey
ALTER TABLE "HostelAllocation" DROP CONSTRAINT "HostelAllocation_roomId_fkey";

-- DropForeignKey
ALTER TABLE "HostelAllocation" DROP CONSTRAINT "HostelAllocation_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "HostelAllocation" DROP CONSTRAINT "HostelAllocation_studentId_fkey";

-- DropForeignKey
ALTER TABLE "HostelRoom" DROP CONSTRAINT "HostelRoom_hostelId_fkey";

-- DropForeignKey
ALTER TABLE "HostelRoom" DROP CONSTRAINT "HostelRoom_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_itemId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_staffId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_studentId_fkey";

-- DropForeignKey
ALTER TABLE "LibraryBook" DROP CONSTRAINT "LibraryBook_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "LibraryIssue" DROP CONSTRAINT "LibraryIssue_bookId_fkey";

-- DropForeignKey
ALTER TABLE "LibraryIssue" DROP CONSTRAINT "LibraryIssue_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "LibraryIssue" DROP CONSTRAINT "LibraryIssue_staffId_fkey";

-- DropForeignKey
ALTER TABLE "LibraryIssue" DROP CONSTRAINT "LibraryIssue_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollSlip" DROP CONSTRAINT "PayrollSlip_payrollRunId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollSlip" DROP CONSTRAINT "PayrollSlip_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollSlip" DROP CONSTRAINT "PayrollSlip_staffId_fkey";

-- DropForeignKey
ALTER TABLE "TransportAssignment" DROP CONSTRAINT "TransportAssignment_routeId_fkey";

-- DropForeignKey
ALTER TABLE "TransportAssignment" DROP CONSTRAINT "TransportAssignment_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TransportAssignment" DROP CONSTRAINT "TransportAssignment_stopId_fkey";

-- DropForeignKey
ALTER TABLE "TransportAssignment" DROP CONSTRAINT "TransportAssignment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TransportRoute" DROP CONSTRAINT "TransportRoute_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TransportRoute" DROP CONSTRAINT "TransportRoute_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "TransportStop" DROP CONSTRAINT "TransportStop_routeId_fkey";

-- DropForeignKey
ALTER TABLE "TransportStop" DROP CONSTRAINT "TransportStop_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TransportVehicle" DROP CONSTRAINT "TransportVehicle_schoolId_fkey";

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "isHod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportingManagerId" TEXT;

-- DropTable
DROP TABLE "ExpenseCategory";

-- DropTable
DROP TABLE "ExpenseVoucher";

-- DropTable
DROP TABLE "Hostel";

-- DropTable
DROP TABLE "HostelAllocation";

-- DropTable
DROP TABLE "HostelRoom";

-- DropTable
DROP TABLE "InventoryItem";

-- DropTable
DROP TABLE "InventoryMovement";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "LibraryBook";

-- DropTable
DROP TABLE "LibraryIssue";

-- DropTable
DROP TABLE "PayrollRun";

-- DropTable
DROP TABLE "PayrollSlip";

-- DropTable
DROP TABLE "TransportAssignment";

-- DropTable
DROP TABLE "TransportRoute";

-- DropTable
DROP TABLE "TransportStop";

-- DropTable
DROP TABLE "TransportVehicle";

-- DropEnum
DROP TYPE "ExpenseVoucherStatus";

-- DropEnum
DROP TYPE "HostelAllocationStatus";

-- DropEnum
DROP TYPE "InventoryMovementType";

-- DropEnum
DROP TYPE "LeaveRequestStatus";

-- DropEnum
DROP TYPE "LeaveRequesterType";

-- DropEnum
DROP TYPE "LibraryIssueStatus";

-- DropEnum
DROP TYPE "PayrollRunStatus";

-- DropEnum
DROP TYPE "PayrollSlipStatus";

-- DropEnum
DROP TYPE "TransportAssignmentStatus";

-- CreateIndex
CREATE INDEX "Staff_schoolId_department_isHod_idx" ON "Staff"("schoolId", "department", "isHod");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
