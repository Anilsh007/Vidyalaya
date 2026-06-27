import { RoleCode } from "@prisma/client";

import { UserControlConsole } from "@/components/school/user-control-console";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import {
  SPECIFIC_ROLE_DEFINITIONS,
  getSpecificRoleLabel,
  inferSpecificRoleKey,
  type RoleCategory
} from "@/lib/user-management";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Option = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  void searchParams;
  const session = await requirePermission(PERMISSIONS.manageUsers);

  const [users, allStaff, allParents, students] = await Promise.all([
    db.user.findMany({
      where: { schoolId: session.schoolId },
      include: {
        roles: { include: { role: true } },
        staffProfile: true,
        parentProfile: {
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
        }
      },
      orderBy: [{ fullName: "asc" }]
    }),
    db.staff.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { fullName: "asc" }
    }),
    db.parent.findMany({
      where: { schoolId: session.schoolId },
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
      },
      orderBy: { guardianName: "asc" }
    }),
    db.student.findMany({
      where: { schoolId: session.schoolId, isArchived: false, status: { not: "ARCHIVED" } },
      include: {
        class: true,
        section: true
      },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  const staffOptions: Option[] = allStaff.map((item) => ({
    id: item.id,
    label: item.fullName,
    meta: [item.employeeCode, item.designation, item.department].filter(Boolean).join(" | "),
    searchText: [item.employeeCode, item.designation, item.department, item.email, item.phone].filter(Boolean).join(" ")
  }));

  const parentOptions: Option[] = allParents.map((item) => ({
    id: item.id,
    label: item.guardianName,
    meta: [item.phonePrimary, item.students.length ? `${item.students.length} ward(s)` : "No wards yet"].join(" | "),
    searchText: [item.guardianName, item.phonePrimary, item.email].filter(Boolean).join(" ")
  }));

  const studentOptions: Option[] = students.map((item) => ({
    id: item.id,
    label: item.fullName,
    meta: [item.admissionNumber, item.class?.name, item.section?.name].filter(Boolean).join(" | "),
    searchText: [item.fullName, item.admissionNumber, item.rollNumber, item.class?.name, item.section?.name].filter(Boolean).join(" ")
  }));

  const userRows = users.map((user) => {
    const roleCode = (user.roles[0]?.role.code ?? RoleCode.TEACHER) as RoleCode;
    const specificRoleKey = inferSpecificRoleKey(roleCode, user.staffProfile?.designation, user.fullName);
    const roleLabel = getSpecificRoleLabel(specificRoleKey, roleCode);
    const roleCategory = SPECIFIC_ROLE_DEFINITIONS[specificRoleKey].category as RoleCategory;
    const guessedStudent = students.find((student) => student.fullName === user.fullName);

    const linkedProfileLabel =
      user.staffProfile?.fullName
        ? `Staff profile mapped to ${user.staffProfile.fullName}`
        : user.parentProfile?.guardianName
          ? `Parent profile mapped to ${user.parentProfile.guardianName}`
          : guessedStudent && roleCode === RoleCode.STUDENT
            ? `Student profile mapped to ${guessedStudent.fullName}`
            : "No verified profile connection";

    const linkedProfileSystemId =
      user.staffProfile?.employeeCode
        ? `STF-ID ${user.staffProfile.employeeCode}`
        : user.parentProfile?.students[0]?.student.admissionNumber
          ? `ADM-NO ${user.parentProfile.students[0].student.admissionNumber}`
          : guessedStudent?.admissionNumber
            ? `ADM-NO ${guessedStudent.admissionNumber}`
            : null;

    const linkedProfileBadgeTone: "success" | "warning" = linkedProfileSystemId ? "success" : "warning";
    const linkedProfileBadgeLabel = linkedProfileSystemId ? "Verified Sync" : "Connection Pending - Click to pair";

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? "",
      roleLabel,
      roleCode,
      roleCategory,
      specificRoleKey,
      linkedProfileLabel,
      linkedProfileSystemId,
      linkedProfileBadgeLabel,
      linkedProfileBadgeTone,
      isActive: user.isActive,
      staffId: user.staffProfile?.id ?? "",
      parentId: user.parentProfile?.id ?? "",
      studentId: guessedStudent?.id ?? "",
      parentStudentIds: user.parentProfile?.students.map((entry) => entry.studentId) ?? []
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Access Control"
        title="User Control"
        description="Provision school ERP identities with tiered role logic, profile compliance visibility, and one-click operational handover tools."
      />

      <UserControlConsole
        users={userRows}
        createValues={{
          fullName: "",
          email: "",
          phone: "",
          roleCategory: "ACADEMICS",
          specificRoleKey: "TEACHER",
          status: "yes",
          password: "",
          staffId: "",
          parentId: "",
          studentId: "",
          parentStudentIds: [],
          forcePasswordReset: "yes"
        }}
        staffOptions={staffOptions}
        parentOptions={parentOptions}
        studentOptions={studentOptions}
      />
    </div>
  );
}
