import { NoticeAudienceType, RoleCode } from "@prisma/client";

import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import type { AppSession } from "@/lib/auth/session";
import {
  getLinkedStudentIdForUser,
  getLinkedStudentProfileForUser,
  getParentLinkedStudentIds,
  parentCanAccessChild
} from "@/lib/rbac/scope";

type PortalSession = Pick<AppSession, "schoolId" | "userId" | "roles">;

type PortalNotice = {
  id: string;
  title: string;
  body: string;
  audienceLabel: string;
  noticeType: string;
  publishedAt: Date | null;
};

type PortalChildStudent = {
  id: string;
  fullName: string;
  admissionNumber: string;
  classId: string | null;
  sectionId: string | null;
  class: { name: string } | null;
  section: { name: string } | null;
};

function toScopeContext(session: PortalSession) {
  return {
    schoolId: session.schoolId,
    userId: session.userId,
    roles: session.roles
  };
}

async function getStudentPortalNotices(args: {
  schoolId: string;
  roles: string[];
  classId?: string | null;
  sectionId?: string | null;
}) {
  const notices = await db.notice.findMany({
    where: {
      schoolId: args.schoolId,
      isPublished: true,
      isArchived: false,
      OR: [
        { audienceType: NoticeAudienceType.ALL },
        { audienceType: NoticeAudienceType.ROLE, roleCode: { in: args.roles } },
        { audienceType: NoticeAudienceType.STUDENTS },
        ...(args.classId ? [{ audienceType: NoticeAudienceType.CLASS, classId: args.classId }] : []),
        ...(args.sectionId ? [{ audienceType: NoticeAudienceType.SECTION, sectionId: args.sectionId }] : [])
      ]
    },
    orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
    take: 8
  });

  return notices as PortalNotice[];
}

async function getParentPortalNotices(args: {
  schoolId: string;
  roles: string[];
  children: Array<{ classId: string | null; sectionId: string | null }>;
}) {
  const classIds = Array.from(
    new Set(args.children.map((child) => child.classId).filter((value): value is string => Boolean(value)))
  );
  const sectionIds = Array.from(
    new Set(args.children.map((child) => child.sectionId).filter((value): value is string => Boolean(value)))
  );

  const notices = await db.notice.findMany({
    where: {
      schoolId: args.schoolId,
      isPublished: true,
      isArchived: false,
      OR: [
        { audienceType: NoticeAudienceType.ALL },
        { audienceType: NoticeAudienceType.ROLE, roleCode: { in: args.roles } },
        { audienceType: NoticeAudienceType.PARENTS },
        ...(classIds.length ? [{ audienceType: NoticeAudienceType.CLASS, classId: { in: classIds } }] : []),
        ...(sectionIds.length ? [{ audienceType: NoticeAudienceType.SECTION, sectionId: { in: sectionIds } }] : [])
      ]
    },
    orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
    take: 8
  });

  return notices as PortalNotice[];
}

export async function getStudentPortalData(session: PortalSession) {
  const context = toScopeContext(session);
  const [linkedStudentId, linkedStudentProfile] = await Promise.all([
    getLinkedStudentIdForUser(context),
    getLinkedStudentProfileForUser(context)
  ]);

  if (!linkedStudentId) {
    return {
      student: null,
      attendanceSummary: null,
      attendanceRows: [],
      feeSummary: null,
      invoices: [],
      results: [],
      documents: [],
      notices: [],
      upcomingExams: []
    };
  }

  const student = await db.student.findFirst({
    where: {
      id: linkedStudentId,
      schoolId: session.schoolId,
      isArchived: false
    },
    include: {
      class: true,
      section: true,
      guardians: {
        include: { parent: true },
        orderBy: [{ isPrimary: "desc" }]
      }
    }
  });

  if (!student) {
    return {
      student: null,
      attendanceSummary: null,
      attendanceRows: [],
      feeSummary: null,
      invoices: [],
      results: [],
      documents: [],
      notices: [],
      upcomingExams: []
    };
  }

  const [attendanceRows, invoices, results, documents, notices, upcomingExams] = await Promise.all([
    db.attendance.findMany({
      where: { schoolId: session.schoolId, studentId: student.id },
      orderBy: [{ date: "desc" }],
      take: 40
    }),
    db.feeInvoice.findMany({
      where: { schoolId: session.schoolId, studentId: student.id },
      include: {
        payments: {
          orderBy: [{ paymentDate: "desc" }]
        }
      },
      orderBy: [{ dueDate: "desc" }]
    }),
    db.examResult.findMany({
      where: { studentId: student.id, exam: { schoolId: session.schoolId } },
      include: { exam: true },
      orderBy: [{ createdAt: "desc" }],
      take: 8
    }),
    db.document.findMany({
      where: {
        schoolId: session.schoolId,
        isArchived: false,
        OR: [{ studentId: student.id }, { userId: session.userId }]
      },
      orderBy: [{ uploadedAt: "desc" }],
      take: 8
    }),
    getStudentPortalNotices({
      schoolId: session.schoolId,
      roles: session.roles,
      classId: student.classId,
      sectionId: student.sectionId
    }),
    student.classId
      ? db.exam.findMany({
          where: {
            schoolId: session.schoolId,
            classId: student.classId,
            startDate: { gte: new Date() }
          },
          orderBy: [{ startDate: "asc" }],
          take: 5
        })
      : Promise.resolve([])
  ]);

  const markedDays = attendanceRows.length;
  const presentDays = attendanceRows.filter((row) => row.status === "PRESENT").length;
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);

  return {
    student,
    linkedStudentProfile,
    attendanceSummary: {
      markedDays,
      presentDays,
      attendancePct: markedDays ? Math.round((presentDays / markedDays) * 100) : 0
    },
    attendanceRows: attendanceRows.slice(0, 12),
    feeSummary: {
      totalInvoiced,
      totalPaid,
      totalDue: Math.max(0, totalInvoiced - totalPaid),
      totalDueLabel: formatCurrency(Math.max(0, totalInvoiced - totalPaid))
    },
    invoices: invoices.slice(0, 8),
    results,
    documents,
    notices,
    upcomingExams
  };
}

async function buildParentChildDetail(args: {
  schoolId: string;
  child: PortalChildStudent;
}) {
  const [attendanceRows, invoices, results, documents, upcomingExams] = await Promise.all([
    db.attendance.findMany({
      where: { schoolId: args.schoolId, studentId: args.child.id },
      orderBy: [{ date: "desc" }],
      take: 20
    }),
    db.feeInvoice.findMany({
      where: { schoolId: args.schoolId, studentId: args.child.id },
      include: {
        payments: {
          orderBy: [{ paymentDate: "desc" }]
        }
      },
      orderBy: [{ dueDate: "desc" }],
      take: 8
    }),
    db.examResult.findMany({
      where: { studentId: args.child.id, exam: { schoolId: args.schoolId } },
      include: { exam: true },
      orderBy: [{ createdAt: "desc" }],
      take: 8
    }),
    db.document.findMany({
      where: {
        schoolId: args.schoolId,
        isArchived: false,
        studentId: args.child.id
      },
      orderBy: [{ uploadedAt: "desc" }],
      take: 8
    }),
    args.child.classId
      ? db.exam.findMany({
          where: {
            schoolId: args.schoolId,
            classId: args.child.classId,
            startDate: { gte: new Date() }
          },
          orderBy: [{ startDate: "asc" }],
          take: 5
        })
      : Promise.resolve([])
  ]);

  const presentDays = attendanceRows.filter((row) => row.status === "PRESENT").length;
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);

  return {
    attendanceRows,
    attendanceSummary: {
      markedDays: attendanceRows.length,
      presentDays,
      attendancePct: attendanceRows.length ? Math.round((presentDays / attendanceRows.length) * 100) : 0
    },
    invoices,
    feeSummary: {
      totalInvoiced,
      totalPaid,
      totalDue: Math.max(0, totalInvoiced - totalPaid),
      totalDueLabel: formatCurrency(Math.max(0, totalInvoiced - totalPaid))
    },
    results,
    documents,
    upcomingExams
  };
}

export async function getParentPortalData(session: PortalSession, selectedStudentId?: string | null) {
  const parent = await db.parent.findFirst({
    where: {
      schoolId: session.schoolId,
      userId: session.userId,
      isArchived: false
    },
    include: {
      students: {
        include: {
          student: {
            include: {
              class: true,
              section: true
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }]
      }
    }
  });

  const children = parent?.students
    .map((entry) => entry.student)
    .filter((student) => !student.isArchived) ?? [];

  if (!parent || !children.length) {
    return {
      parent,
      children: [],
      childSummaries: [],
      notices: [],
      selectedChild: null,
      selectedChildDetails: null
    };
  }

  const childIds = children.map((child) => child.id);
  const [attendanceRows, invoices, results, documents, notices] = await Promise.all([
    db.attendance.findMany({
      where: { schoolId: session.schoolId, studentId: { in: childIds } },
      orderBy: [{ date: "desc" }],
      take: 120
    }),
    db.feeInvoice.findMany({
      where: { schoolId: session.schoolId, studentId: { in: childIds } },
      orderBy: [{ dueDate: "desc" }]
    }),
    db.examResult.findMany({
      where: { studentId: { in: childIds }, exam: { schoolId: session.schoolId } },
      include: { exam: true, student: true },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    }),
    db.document.findMany({
      where: {
        schoolId: session.schoolId,
        isArchived: false,
        studentId: { in: childIds }
      },
      orderBy: [{ uploadedAt: "desc" }],
      take: 12
    }),
    getParentPortalNotices({
      schoolId: session.schoolId,
      roles: session.roles,
      children
    })
  ]);

  const childSummaries = children.map((child) => {
    const childAttendance = attendanceRows.filter((row) => row.studentId === child.id);
    const childInvoices = invoices.filter((invoice) => invoice.studentId === child.id);
    const childResults = results.filter((result) => result.studentId === child.id);
    const childDocuments = documents.filter((document) => document.studentId === child.id);
    const presentDays = childAttendance.filter((row) => row.status === "PRESENT").length;
    const totalInvoiced = childInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
    const totalPaid = childInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);

    return {
      student: child,
      attendancePct: childAttendance.length ? Math.round((presentDays / childAttendance.length) * 100) : 0,
      markedDays: childAttendance.length,
      totalDue: Math.max(0, totalInvoiced - totalPaid),
      totalDueLabel: formatCurrency(Math.max(0, totalInvoiced - totalPaid)),
      latestResult: childResults[0] ?? null,
      documentsCount: childDocuments.length
    };
  });

  const context = toScopeContext(session);
  if (selectedStudentId) {
    const allowed = await parentCanAccessChild(context, selectedStudentId);
    if (!allowed) {
      return {
        parent,
        children,
        childSummaries,
        notices,
        selectedChild: null,
        selectedChildDetails: null,
        invalidSelectedChild: true
      };
    }
  }

  const selectedChild =
    children.find((child) => child.id === selectedStudentId) ??
    children[0] ??
    null;
  const selectedChildDetails = selectedChild
    ? await buildParentChildDetail({
        schoolId: session.schoolId,
        child: selectedChild
      })
    : null;

  return {
    parent,
    children,
    childSummaries,
    notices,
    selectedChild,
    selectedChildDetails,
    invalidSelectedChild: false
  };
}

export async function getParentAccessibleStudent(session: PortalSession, studentId: string) {
  const context = toScopeContext(session);
  const allowed = await parentCanAccessChild(context, studentId);
  if (!allowed) {
    return null;
  }

  return db.student.findFirst({
    where: {
      id: studentId,
      schoolId: session.schoolId,
      isArchived: false
    },
    include: {
      class: true,
      section: true
    }
  });
}

export async function getParentLinkedChildren(session: PortalSession) {
  const context = toScopeContext(session);
  const childIds = await getParentLinkedStudentIds(context);
  if (!childIds.length) {
    return [];
  }

  return db.student.findMany({
    where: {
      schoolId: session.schoolId,
      id: { in: childIds },
      isArchived: false
    },
    include: {
      class: true,
      section: true
    },
    orderBy: [{ fullName: "asc" }]
  });
}

export function isTeacherLikeRole(roles: string[]) {
  const teacherRoleCodes = ["TEACHER", "HOD", "EXAM_CONTROLLER", "PRINCIPAL", "DIRECTOR"];
  return roles.some((role) => teacherRoleCodes.includes(role));
}
