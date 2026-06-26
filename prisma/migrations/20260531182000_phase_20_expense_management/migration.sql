-- Phase 20: Accounts and Expense Management
CREATE TYPE "ExpenseVoucherStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

CREATE TABLE "ExpenseCategory" (
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

CREATE TABLE "ExpenseVoucher" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "paidTo" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "FeePaymentMode" NOT NULL DEFAULT 'CASH',
    "referenceNo" TEXT,
    "status" "ExpenseVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseCategory_schoolId_code_key" ON "ExpenseCategory"("schoolId", "code");
CREATE INDEX "ExpenseCategory_schoolId_isActive_idx" ON "ExpenseCategory"("schoolId", "isActive");
CREATE UNIQUE INDEX "ExpenseVoucher_schoolId_voucherNumber_key" ON "ExpenseVoucher"("schoolId", "voucherNumber");
CREATE INDEX "ExpenseVoucher_schoolId_status_expenseDate_idx" ON "ExpenseVoucher"("schoolId", "status", "expenseDate");
CREATE INDEX "ExpenseVoucher_schoolId_categoryId_expenseDate_idx" ON "ExpenseVoucher"("schoolId", "categoryId", "expenseDate");

ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseVoucher" ADD CONSTRAINT "ExpenseVoucher_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
