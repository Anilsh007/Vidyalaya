import { FeeInvoiceStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { fromMoney } from "@/lib/fees";

export type ReportFilters = {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  startDate?: Date;
  endDate?: Date;
  examId?: string;
};

export async function getReportsPageMeta(schoolId: string) {
  const [classes, sections, exams] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.exam.findMany({
      where: { schoolId },
      orderBy: [{ startDate: "desc" }]
    })
  ]);

  return { classes, sections, exams };
}

export async function getStudentReport(filters: ReportFilters) {
  const students = await db.student.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
    },
    include: {
      class: true,
      section: true,
      guardians: {
        where: { isPrimary: true },
        include: { parent: true },
        take: 1
      }
    },
    orderBy: [{ fullName: "asc" }]
  });

  return students.map((student) => ({
    studentName: student.fullName,
    admissionNumber: student.admissionNumber,
    rollNumber: student.rollNumber ?? "",
    class: student.class?.name ?? "",
    section: student.section?.name ?? "",
    status: student.status,
    guardian: student.guardians[0]?.parent.guardianName ?? "",
    phone: student.guardians[0]?.parent.phonePrimary ?? ""
  }));
}

export async function getAttendanceReport(filters: ReportFilters) {
  const attendances = await db.attendance.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(filters.startDate || filters.endDate
        ? {
            date: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {})
            }
          }
        : {}),
      student: {
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
      }
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ date: "desc" }]
  });

  return attendances.map((attendance) => ({
    date: attendance.date.toISOString().slice(0, 10),
    studentName: attendance.student.fullName,
    class: attendance.student.class?.name ?? "",
    section: attendance.student.section?.name ?? "",
    status: attendance.status,
    remarks: attendance.remarks ?? ""
  }));
}

export async function getFeeCollectionReport(filters: ReportFilters) {
  const payments = await db.feePayment.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(filters.startDate || filters.endDate
        ? {
            paymentDate: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {})
            }
          }
        : {})
    },
    include: {
      feeInvoice: {
        include: {
          student: {
            include: {
              class: true,
              section: true
            }
          }
        }
      }
    },
    orderBy: [{ paymentDate: "desc" }]
  });

  return payments
    .filter((payment) =>
      filters.classId ? payment.feeInvoice.student.classId === filters.classId : true
    )
    .filter((payment) =>
      filters.sectionId ? payment.feeInvoice.student.sectionId === filters.sectionId : true
    )
    .map((payment) => ({
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      studentName: payment.feeInvoice.student.fullName,
      class: payment.feeInvoice.student.class?.name ?? "",
      section: payment.feeInvoice.student.section?.name ?? "",
      invoiceNumber: payment.feeInvoice.invoiceNumber,
      amount: fromMoney(payment.amount),
      paymentMode: payment.paymentMode.replaceAll("_", " ")
    }));
}

export async function getPendingDuesReport(filters: ReportFilters) {
  const invoices = await db.feeInvoice.findMany({
    where: {
      schoolId: filters.schoolId,
      status: {
        in: [FeeInvoiceStatus.ISSUED, FeeInvoiceStatus.PARTIALLY_PAID, FeeInvoiceStatus.OVERDUE]
      }
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ dueDate: "asc" }]
  });

  return invoices
    .filter((invoice) => (filters.classId ? invoice.student.classId === filters.classId : true))
    .filter((invoice) =>
      filters.sectionId ? invoice.student.sectionId === filters.sectionId : true
    )
    .map((invoice) => ({
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      studentName: invoice.student.fullName,
      class: invoice.student.class?.name ?? "",
      section: invoice.student.section?.name ?? "",
      totalAmount: fromMoney(invoice.totalAmount),
      paidAmount: fromMoney(invoice.paidAmount),
      balanceDue: Math.max(0, fromMoney(invoice.totalAmount) - fromMoney(invoice.paidAmount)),
      status: invoice.status
    }));
}

export async function getExamResultReport(filters: ReportFilters) {
  const results = await db.examResult.findMany({
    where: {
      ...(filters.examId ? { examId: filters.examId } : {}),
      exam: { schoolId: filters.schoolId },
      student: {
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
      }
    },
    include: {
      exam: true,
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return results.map((result) => ({
    exam: result.exam.name,
    studentName: result.student.fullName,
    class: result.student.class?.name ?? "",
    section: result.student.section?.name ?? "",
    percentage: Number(result.percentage),
    grade: result.grade,
    resultStatus: result.resultStatus
  }));
}

export async function getReportRows(type: "student" | "attendance" | "fees" | "dues" | "results", filters: ReportFilters) {
  switch (type) {
    case "student":
      return getStudentReport(filters);
    case "attendance":
      return getAttendanceReport(filters);
    case "fees":
      return getFeeCollectionReport(filters);
    case "dues":
      return getPendingDuesReport(filters);
    case "results":
      return getExamResultReport(filters);
  }
}
