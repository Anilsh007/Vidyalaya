import { FeeInvoiceStatus } from "@prisma/client";

import {
  computeInvoiceStatus,
  fromMoney,
  nextInvoiceNumber,
  nextReceiptNumber,
  toMoney
} from "@/lib/fees";
import { db } from "@/lib/db";

type SaveFeeHeadInput = {
  schoolId: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  isOptional: string;
};

type SaveFeeStructureInput = {
  schoolId: string;
  id?: string;
  classId?: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  items: Array<{
    feeHeadId: string;
    amount: number;
  }>;
};

type GenerateFeeInvoiceInput = {
  schoolId: string;
  academicYearId: string;
  studentId: string;
  dueDate: string;
  discountAmount: number;
  fineAmount: number;
  notes?: string;
};

type CollectFeePaymentInput = {
  schoolId: string;
  feeInvoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  remarks?: string;
};

export async function getFeesPageData(schoolId: string) {
  const todayDate = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(`${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`);

  const [feeHeads, classes, students, structures, invoices, dailyPayments, monthlyPayments] =
    await Promise.all([
      db.feeHead.findMany({
        where: { schoolId },
        orderBy: { name: "asc" }
      }),
      db.schoolClass.findMany({
        where: { schoolId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
      }),
      db.student.findMany({
        where: {
          schoolId,
          status: { not: "ARCHIVED" }
        },
        include: {
          class: true,
          section: true
        },
        orderBy: [{ fullName: "asc" }]
      }),
      db.feeStructure.findMany({
        where: { schoolId },
        include: {
          class: true,
          items: {
            include: { feeHead: true }
          }
        },
        orderBy: [{ effectiveFrom: "desc" }]
      }),
      db.feeInvoice.findMany({
        where: { schoolId },
        include: {
          student: {
            include: {
              class: true,
              section: true
            }
          },
          items: true,
          payments: {
            orderBy: { paymentDate: "desc" }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      }),
      db.feePayment.findMany({
        where: {
          schoolId,
          paymentDate: {
            gte: new Date(`${todayDate}T00:00:00.000Z`),
            lte: new Date(`${todayDate}T23:59:59.999Z`)
          }
        },
        include: { feeInvoice: true }
      }),
      db.feePayment.findMany({
        where: {
          schoolId,
          paymentDate: {
            gte: monthStart,
            lte: new Date()
          }
        },
        include: { feeInvoice: true }
      })
    ]);

  return {
    feeHeads,
    classes,
    students,
    structures,
    invoices,
    dailyPayments,
    monthlyPayments,
    totalOutstanding: invoices.reduce((sum, invoice) => {
      const balance = fromMoney(invoice.totalAmount) - fromMoney(invoice.paidAmount);
      return sum + Math.max(0, balance);
    }, 0),
    totalInvoiced: invoices.reduce((sum, invoice) => sum + fromMoney(invoice.totalAmount), 0),
    totalCollected: invoices.reduce((sum, invoice) => sum + fromMoney(invoice.paidAmount), 0),
    todayCollections: dailyPayments.reduce((sum, payment) => sum + fromMoney(payment.amount), 0),
    monthCollections: monthlyPayments.reduce((sum, payment) => sum + fromMoney(payment.amount), 0),
    pendingInvoices: invoices.filter((invoice) => invoice.status !== FeeInvoiceStatus.PAID)
  };
}

export async function saveFeeHead(input: SaveFeeHeadInput) {
  const existingHead = input.id
    ? await db.feeHead.findFirst({
        where: {
          id: input.id,
          schoolId: input.schoolId
        }
      })
    : null;

  if (input.id && !existingHead) {
    throw new Error("Fee head not found.");
  }

  return input.id
    ? db.feeHead.update({
        where: { id: input.id },
        data: {
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          isOptional: input.isOptional === "yes"
        }
      })
    : db.feeHead.create({
        data: {
          schoolId: input.schoolId,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description || null,
          isOptional: input.isOptional === "yes"
        }
      });
}

export async function saveFeeStructure(input: SaveFeeStructureInput) {
  if (!input.items.length) {
    throw new Error("Add at least one fee amount to save the structure.");
  }

  return db.$transaction(async (tx) => {
    if (input.id) {
      const existing = await tx.feeStructure.findFirst({
        where: {
          id: input.id,
          schoolId: input.schoolId
        }
      });

      if (!existing) {
        throw new Error("Fee structure not found.");
      }
    }

    const saved = input.id
      ? await tx.feeStructure.update({
          where: { id: input.id },
          data: {
            classId: input.classId || null,
            name: input.name,
            effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
            effectiveTo: input.effectiveTo
              ? new Date(`${input.effectiveTo}T23:59:59.999Z`)
              : null
          }
        })
      : await tx.feeStructure.create({
          data: {
            schoolId: input.schoolId,
            classId: input.classId || null,
            name: input.name,
            effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
            effectiveTo: input.effectiveTo
              ? new Date(`${input.effectiveTo}T23:59:59.999Z`)
              : null
          }
        });

    await tx.feeStructureItem.deleteMany({
      where: { feeStructureId: saved.id }
    });

    await tx.feeStructureItem.createMany({
      data: input.items.map((item) => ({
        feeStructureId: saved.id,
        feeHeadId: item.feeHeadId,
        amount: toMoney(item.amount)
      }))
    });

    return saved;
  });
}

export async function generateFeeInvoice(input: GenerateFeeInvoiceInput) {
  const student = await db.student.findFirst({
    where: {
      id: input.studentId,
      schoolId: input.schoolId
    },
    include: {
      class: true,
      section: true
    }
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const structure =
    (student.classId
      ? await db.feeStructure.findFirst({
          where: {
            schoolId: input.schoolId,
            classId: student.classId
          },
          include: {
            items: {
              include: { feeHead: true }
            }
          },
          orderBy: [{ effectiveFrom: "desc" }]
        })
      : null) ??
    (await db.feeStructure.findFirst({
      where: {
        schoolId: input.schoolId,
        classId: null
      },
      include: {
        items: {
          include: { feeHead: true }
        }
      },
      orderBy: [{ effectiveFrom: "desc" }]
    }));

  if (!structure || !structure.items.length) {
    throw new Error("No fee structure is available for this student's class.");
  }

  const baseAmount = structure.items.reduce((sum, item) => sum + fromMoney(item.amount), 0);
  const totalAmount = Math.max(0, baseAmount + input.fineAmount - input.discountAmount);
  const dueDate = new Date(`${input.dueDate}T23:59:59.999Z`);
  const invoiceNumber = await nextInvoiceNumber(input.schoolId);

  const invoice = await db.feeInvoice.create({
    data: {
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      studentId: student.id,
      invoiceNumber,
      dueDate,
      totalAmount: toMoney(totalAmount),
      discountAmount: toMoney(input.discountAmount),
      fineAmount: toMoney(input.fineAmount),
      notes: input.notes || null,
      status: computeInvoiceStatus(totalAmount, 0, dueDate),
      items: {
        create: structure.items.map((item) => ({
          feeHeadId: item.feeHeadId,
          label: item.feeHead.name,
          amount: item.amount
        }))
      }
    },
    include: {
      items: true
    }
  });

  return {
    invoice,
    invoiceNumber,
    student,
    structure,
    totalAmount
  };
}

export async function collectFeePayment(input: CollectFeePaymentInput) {
  const invoice = await db.feeInvoice.findFirst({
    where: {
      id: input.feeInvoiceId,
      schoolId: input.schoolId
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      },
      items: true,
      payments: true
    }
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const totalAmount = fromMoney(invoice.totalAmount);
  const paidAmount = fromMoney(invoice.paidAmount);
  const balanceBefore = Math.max(0, totalAmount - paidAmount);

  if (input.amount > balanceBefore) {
    throw new Error("Payment cannot exceed the current balance due.");
  }

  const receiptNumber = await nextReceiptNumber(input.schoolId);
  const paymentDate = new Date(`${input.paymentDate}T00:00:00.000Z`);
  const nextPaidAmount = paidAmount + input.amount;
  const nextStatus = computeInvoiceStatus(totalAmount, nextPaidAmount, invoice.dueDate);

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.feePayment.create({
      data: {
        schoolId: input.schoolId,
        feeInvoiceId: invoice.id,
        receiptNumber,
        paymentDate,
        amount: toMoney(input.amount),
        paymentMode: input.paymentMode as never,
        referenceNo: input.referenceNo || null,
        remarks: input.remarks || null
      }
    });

    await tx.feeInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: toMoney(nextPaidAmount),
        status: nextStatus
      }
    });

    return created;
  });

  return {
    payment,
    invoice,
    receiptNumber,
    nextPaidAmount,
    totalAmount,
    nextStatus
  };
}
