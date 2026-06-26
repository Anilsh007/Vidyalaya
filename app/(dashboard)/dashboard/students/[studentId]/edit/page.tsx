import { notFound } from "next/navigation";

import { StudentForm } from "@/components/school/student-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { toDateInput } from "@/lib/school";

type Params = Promise<{ studentId: string }>;

export default async function EditStudentPage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.manageStudents);
  const { studentId } = await params;
  const [student, classes, sections] = await Promise.all([
    db.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      include: {
        guardians: {
          where: { isPrimary: true },
          include: { parent: true },
          take: 1
        }
      }
    }),
    db.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }]
    })
  ]);

  if (!student) {
    notFound();
  }

  const guardian = student.guardians[0]?.parent;
  const address = [
    student.addressLine1,
    student.addressLine2,
    student.city,
    student.state,
    student.postalCode
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Student management"
        title={`Edit ${student.fullName}`}
        description="Update the student profile, class placement, or guardian contact details."
      />
      <StudentForm
        title="Edit student"
        description="Changes are written to the student record and captured in the audit trail."
        submitLabel="Save changes"
        classes={classes.map((item) => ({ id: item.id, name: item.name }))}
        sections={sections.map((item) => ({ id: item.id, name: item.name, classId: item.classId }))}
        values={{
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName ?? "",
          gender: student.gender ?? "",
          dateOfBirth: toDateInput(student.dateOfBirth),
          admissionDate: toDateInput(student.admissionDate),
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber ?? "",
          status: student.status,
          classId: student.classId ?? "",
          sectionId: student.sectionId ?? "",
          address,
          guardianName: guardian?.guardianName ?? "",
          relation: guardian?.relation ?? "",
          fatherName: guardian?.fatherName ?? "",
          motherName: guardian?.motherName ?? "",
          guardianPhonePrimary: guardian?.phonePrimary ?? "",
          guardianPhoneSecondary: guardian?.phoneSecondary ?? "",
          guardianEmail: guardian?.email ?? "",
          occupation: guardian?.occupation ?? ""
        }}
      />
    </div>
  );
}
