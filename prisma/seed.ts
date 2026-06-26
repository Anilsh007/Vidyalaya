import {
  AttendanceStatus,
  DocumentOwnerType,
  FeeInvoiceStatus,
  FeePaymentMode,
  PrismaClient,
  RoleCode,
  UserType
} from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "../lib/permissions";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "123456789";

const demoUsers = [
  {
    email: "superadmin@school.local",
    fullName: "Super Admin User",
    roleCode: RoleCode.SUPER_ADMIN,
    userType: UserType.SYSTEM
  },
  {
    email: "admin@school.local",
    fullName: "Admin User",
    roleCode: RoleCode.ADMIN,
    userType: UserType.SYSTEM
  },
  {
    email: "principal@school.local",
    fullName: "Principal User",
    roleCode: RoleCode.PRINCIPAL,
    userType: UserType.STAFF
  },
  {
    email: "teacher@school.local",
    fullName: "Teacher User",
    roleCode: RoleCode.TEACHER,
    userType: UserType.STAFF
  },
  {
    email: "accountant@school.local",
    fullName: "Accountant User",
    roleCode: RoleCode.ACCOUNTANT,
    userType: UserType.STAFF
  },
  {
    email: "parent@school.local",
    fullName: "Parent User",
    roleCode: RoleCode.PARENT,
    userType: UserType.PARENT
  },
  {
    email: "student@school.local",
    fullName: "Student User",
    roleCode: RoleCode.STUDENT,
    userType: UserType.STUDENT
  }
] as const;

async function main() {
  const school = await prisma.school.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: {
      name: process.env.DEFAULT_SCHOOL_NAME ?? "Springfield Public School",
      code: "DEFAULT",
      slug: "default-school"
    }
  });

  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: "2026-2027"
      }
    },
    update: {
      isCurrent: true
    },
    create: {
      schoolId: school.id,
      name: "2026-2027",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T23:59:59.999Z"),
      isCurrent: true
    }
  });

  const permissionEntries = Object.entries(PERMISSIONS).map(([key, code]) => ({
    code,
    name: key,
    description: `Permission for ${key}`
  }));

  for (const permission of permissionEntries) {
    await prisma.permission.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: permission.code
        }
      },
      update: permission,
      create: {
        schoolId: school.id,
        ...permission
      }
    });
  }

  const permissions = await prisma.permission.findMany({
    where: { schoolId: school.id }
  });

  for (const roleCode of Object.values(RoleCode)) {
    const role = await prisma.role.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: roleCode
        }
      },
      update: {
        name: roleCode.replaceAll("_", " ")
      },
      create: {
        schoolId: school.id,
        code: roleCode,
        name: roleCode.replaceAll("_", " ")
      }
    });

    for (const permissionCode of DEFAULT_ROLE_PERMISSIONS[roleCode] ?? []) {
      const permission = permissions.find((entry) => entry.code === permissionCode);
      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const roleMap = new Map(
    (
      await prisma.role.findMany({
        where: {
          schoolId: school.id
        }
      })
    ).map((role) => [role.code, role])
  );

  const classTen =
    (await prisma.schoolClass.findFirst({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "Class 10"
      }
    })) ??
    (await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: "Class 10",
        displayOrder: 10
      }
    }));

  const sectionA = await prisma.section.upsert({
    where: {
      schoolId_academicYearId_classId_name: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        classId: classTen.id,
        name: "A"
      }
    },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: classTen.id,
      name: "A"
    }
  });

  const subjectMaths = await prisma.subject.upsert({
    where: {
      schoolId_academicYearId_code: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        code: "MATH-10"
      }
    },
    update: {},
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: classTen.id,
      name: "Mathematics",
      code: "MATH-10"
    }
  });

  for (const demoUser of demoUsers) {
    const password =
      demoUser.roleCode === RoleCode.ADMIN
        ? process.env.DEFAULT_ADMIN_PASSWORD ?? DEMO_PASSWORD
        : DEMO_PASSWORD;

    const email =
      demoUser.roleCode === RoleCode.ADMIN
        ? (process.env.DEFAULT_ADMIN_EMAIL ?? demoUser.email).toLowerCase()
        : demoUser.email;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        schoolId: school.id,
        fullName: demoUser.fullName,
        passwordHash: hashPassword(password),
        userType: demoUser.userType,
        isActive: true
      },
      create: {
        schoolId: school.id,
        fullName: demoUser.fullName,
        email,
        passwordHash: hashPassword(password),
        userType: demoUser.userType,
        isActive: true
      }
    });

    const role = roleMap.get(demoUser.roleCode);
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id
        }
      });
    }

    if (
      demoUser.roleCode === RoleCode.PRINCIPAL ||
      demoUser.roleCode === RoleCode.TEACHER ||
      demoUser.roleCode === RoleCode.ACCOUNTANT
    ) {
      await prisma.staff.upsert({
        where: {
          userId: user.id
        },
        update: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          fullName: demoUser.fullName,
          designation:
            demoUser.roleCode === RoleCode.PRINCIPAL
              ? "Principal"
              : demoUser.roleCode === RoleCode.ACCOUNTANT
                ? "Accountant"
                : "Teacher",
          joiningDate: new Date("2026-04-01T00:00:00.000Z"),
          employeeCode: demoUser.roleCode
        },
        create: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          userId: user.id,
          fullName: demoUser.fullName,
          designation:
            demoUser.roleCode === RoleCode.PRINCIPAL
              ? "Principal"
              : demoUser.roleCode === RoleCode.ACCOUNTANT
                ? "Accountant"
                : "Teacher",
          joiningDate: new Date("2026-04-01T00:00:00.000Z"),
          employeeCode: demoUser.roleCode,
          isTeachingStaff: demoUser.roleCode !== RoleCode.ACCOUNTANT
        }
      });
    }

    if (demoUser.roleCode === RoleCode.PARENT) {
      await prisma.parent.upsert({
        where: {
          userId: user.id
        },
        update: {
          schoolId: school.id,
          guardianName: demoUser.fullName,
          relation: "Father",
          phonePrimary: "9999999999"
        },
        create: {
          schoolId: school.id,
          userId: user.id,
          guardianName: demoUser.fullName,
          relation: "Father",
          phonePrimary: "9999999999"
        }
      });
    }
  }

  const existingNotice = await prisma.notice.findFirst({
    where: {
      schoolId: school.id,
      title: "Welcome to the self-hosted ERP starter"
    }
  });

  if (!existingNotice) {
    await prisma.notice.create({
      data: {
        schoolId: school.id,
        title: "Welcome to the self-hosted ERP starter",
        body:
          "This starter includes authentication, role checks, Prisma schema, Docker deployment files, and the dashboard shell.",
        audienceLabel: "All users",
        audienceType: "ALL",
        noticeType: "IMPORTANT",
        isPublished: true,
        publishedAt: new Date("2026-04-01T08:00:00.000Z")
      }
    });
  }

  const parentUser = await prisma.user.findUniqueOrThrow({
    where: { email: "parent@school.local" }
  });

  const parentProfile = await prisma.parent.findUniqueOrThrow({
    where: { userId: parentUser.id }
  });

  const student = await prisma.student.upsert({
    where: {
      schoolId_admissionNumber: {
        schoolId: school.id,
        admissionNumber: "ADM-2026-001"
      }
    },
    update: {
      academicYearId: academicYear.id,
      classId: classTen.id,
      sectionId: sectionA.id,
      fullName: "Student User",
      firstName: "Student",
      admissionDate: new Date("2026-04-01T00:00:00.000Z")
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      admissionNumber: "ADM-2026-001",
      rollNumber: "10A-01",
      firstName: "Student",
      lastName: "User",
      fullName: "Student User",
      admissionDate: new Date("2026-04-01T00:00:00.000Z"),
      classId: classTen.id,
      sectionId: sectionA.id
    }
  });

  await prisma.studentGuardian.upsert({
    where: {
      studentId_parentId: {
        studentId: student.id,
        parentId: parentProfile.id
      }
    },
    update: {
      isPrimary: true
    },
    create: {
      studentId: student.id,
      parentId: parentProfile.id,
      isPrimary: true
    }
  });

  await prisma.document.upsert({
    where: { id: "phase-25-school-profile-doc" },
    update: {
      schoolId: school.id,
      ownerType: DocumentOwnerType.SCHOOL,
      studentId: null,
      staffId: null,
      userId: null,
      title: "School registration certificate",
      fileName: "school-registration-certificate.pdf",
      filePath: "/uploads/school/school-registration-certificate.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 245760,
      isArchived: false,
      archivedAt: null
    },
    create: {
      id: "phase-25-school-profile-doc",
      schoolId: school.id,
      ownerType: DocumentOwnerType.SCHOOL,
      title: "School registration certificate",
      fileName: "school-registration-certificate.pdf",
      filePath: "/uploads/school/school-registration-certificate.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 245760
    }
  });

  await prisma.document.upsert({
    where: { id: "phase-25-student-birth-certificate" },
    update: {
      schoolId: school.id,
      ownerType: DocumentOwnerType.STUDENT,
      studentId: student.id,
      staffId: null,
      userId: null,
      title: "Birth certificate",
      fileName: "student-user-birth-certificate.pdf",
      filePath: "/uploads/students/adm-2026-001/birth-certificate.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 184320,
      isArchived: false,
      archivedAt: null
    },
    create: {
      id: "phase-25-student-birth-certificate",
      schoolId: school.id,
      ownerType: DocumentOwnerType.STUDENT,
      studentId: student.id,
      title: "Birth certificate",
      fileName: "student-user-birth-certificate.pdf",
      filePath: "/uploads/students/adm-2026-001/birth-certificate.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 184320
    }
  });

  await prisma.attendance.upsert({
    where: {
      studentId_date: {
        studentId: student.id,
        date: new Date("2026-04-02T00:00:00.000Z")
      }
    },
    update: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      status: AttendanceStatus.PRESENT,
      remarks: "On time"
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      studentId: student.id,
      date: new Date("2026-04-02T00:00:00.000Z"),
      status: AttendanceStatus.PRESENT,
      remarks: "On time"
    }
  });

  const feeHead = await prisma.feeHead.upsert({
    where: {
      schoolId_code: {
        schoolId: school.id,
        code: "TUITION"
      }
    },
    update: {},
    create: {
      schoolId: school.id,
      code: "TUITION",
      name: "Tuition Fee"
    }
  });

  const feeStructure = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      classId: classTen.id,
      name: "Class 10 Default Fees",
      effectiveFrom: new Date("2026-04-01T00:00:00.000Z"),
      items: {
        create: {
          feeHeadId: feeHead.id,
          amount: 25000
        }
      }
    }
  }).catch(async () => {
    return prisma.feeStructure.findFirstOrThrow({
      where: {
        schoolId: school.id,
        classId: classTen.id,
        name: "Class 10 Default Fees"
      }
    });
  });

  const feeInvoice = await prisma.feeInvoice.upsert({
    where: {
      schoolId_invoiceNumber: {
        schoolId: school.id,
        invoiceNumber: "INV-2026-0001"
      }
    },
    update: {
      totalAmount: 25000,
      paidAmount: 10000,
      status: FeeInvoiceStatus.PARTIALLY_PAID
    },
    create: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      studentId: student.id,
      invoiceNumber: "INV-2026-0001",
      dueDate: new Date("2026-06-10T00:00:00.000Z"),
      totalAmount: 25000,
      paidAmount: 10000,
      status: FeeInvoiceStatus.PARTIALLY_PAID
    }
  });

  await prisma.feeInvoiceItem.upsert({
    where: {
      feeInvoiceId_feeHeadId: {
        feeInvoiceId: feeInvoice.id,
        feeHeadId: feeHead.id
      }
    },
    update: {
      label: feeHead.name,
      amount: 25000
    },
    create: {
      feeInvoiceId: feeInvoice.id,
      feeHeadId: feeHead.id,
      label: feeHead.name,
      amount: 25000
    }
  });

  await prisma.feePayment.upsert({
    where: {
      schoolId_receiptNumber: {
        schoolId: school.id,
        receiptNumber: "RCPT-00001"
      }
    },
    update: {
      feeInvoiceId: feeInvoice.id,
      paymentDate: new Date("2026-04-05T00:00:00.000Z"),
      amount: 10000,
      paymentMode: FeePaymentMode.CASH
    },
    create: {
      schoolId: school.id,
      feeInvoiceId: feeInvoice.id,
      receiptNumber: "RCPT-00001",
      paymentDate: new Date("2026-04-05T00:00:00.000Z"),
      amount: 10000,
      paymentMode: FeePaymentMode.CASH,
      remarks: "Initial collection"
    }
  });

  await prisma.exam.upsert({
    where: {
      id: "phase-1-midterm-exam"
    },
    update: {},
    create: {
      id: "phase-1-midterm-exam",
      schoolId: school.id,
      academicYearId: academicYear.id,
      classId: classTen.id,
      name: "Mid Term Examination",
      examTerm: "Term 1",
      examType: "Term",
      startDate: new Date("2026-09-15T00:00:00.000Z"),
      endDate: new Date("2026-09-22T00:00:00.000Z"),
      examSubjects: {
        create: {
          subjectId: subjectMaths.id,
          maxMarks: 100,
          passMarks: 35
        }
      }
    }
  });

  const midTermExam = await prisma.exam.findUniqueOrThrow({
    where: { id: "phase-1-midterm-exam" },
    include: { examSubjects: true }
  });

  const midTermExamSubject = midTermExam.examSubjects[0];

  if (midTermExamSubject) {
    await prisma.examMark.upsert({
      where: {
        examSubjectId_studentId: {
          examSubjectId: midTermExamSubject.id,
          studentId: student.id
        }
      },
      update: {
        examId: midTermExam.id,
        subjectId: midTermExamSubject.subjectId,
        marksObtained: 84,
        remarks: "Consistent work"
      },
      create: {
        examId: midTermExam.id,
        examSubjectId: midTermExamSubject.id,
        subjectId: midTermExamSubject.subjectId,
        studentId: student.id,
        marksObtained: 84,
        remarks: "Consistent work"
      }
    });

    await prisma.examResult.upsert({
      where: {
        examId_studentId: {
          examId: midTermExam.id,
          studentId: student.id
        }
      },
      update: {
        totalMarks: 100,
        obtainedMarks: 84,
        percentage: 84,
        grade: "A",
        resultStatus: "PASS",
        teacherRemarks: "Shows strong command of the core concepts.",
        principalRemarks: "Keep up the same discipline."
      },
      create: {
        examId: midTermExam.id,
        studentId: student.id,
        totalMarks: 100,
        obtainedMarks: 84,
        percentage: 84,
        grade: "A",
        resultStatus: "PASS",
        teacherRemarks: "Shows strong command of the core concepts.",
        principalRemarks: "Keep up the same discipline."
      }
    });
  }

  await seedAuditEntry({
    schoolId: school.id,
    actorUserId: parentUser.id,
    action: "student.created",
    entityType: "Student",
    entityId: student.id,
    metadata: {
      fullName: student.fullName,
      admissionNumber: student.admissionNumber,
      phase: "Phase 26 seed"
    }
  });

  await seedAuditEntry({
    schoolId: school.id,
    actorUserId: parentUser.id,
    action: "document.created",
    entityType: "Document",
    entityId: "phase-25-student-birth-certificate",
    metadata: {
      title: "Birth certificate",
      ownerType: DocumentOwnerType.STUDENT,
      phase: "Phase 26 seed"
    }
  });
}

async function seedAuditEntry({
  schoolId,
  actorUserId,
  action,
  entityType,
  entityId,
  metadata
}: {
  schoolId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string>;
}) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      schoolId,
      action,
      entityType,
      entityId
    },
    select: { id: true }
  });

  if (existing) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      schoolId,
      actorUserId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
