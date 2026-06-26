import { redirect } from "next/navigation";

import { StudentForm } from "@/components/school/student-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewStudentPage() {
  const session = await requirePermission(PERMISSIONS.manageStudents);
  const [classes, sections] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }]
    })
  ]);

  if (!classes.length) {
    redirect("/dashboard/settings");
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admissions"
        title="Add student"
        description="Create a student profile, attach the primary guardian, and place the learner into the current academic structure."
      />
      <StudentForm
        title="Student profile"
        description="All required admission and guardian fields are validated before the record is saved."
        submitLabel="Create student"
        classes={classes.map((item) => ({ id: item.id, name: item.name }))}
        sections={sections.map((item) => ({ id: item.id, name: item.name, classId: item.classId }))}
        values={{
          firstName: "",
          lastName: "",
          gender: "",
          dateOfBirth: "",
          admissionDate: new Date().toISOString().slice(0, 10),
          admissionNumber: "",
          rollNumber: "",
          status: "ACTIVE",
          classId: "",
          sectionId: "",
          address: "",
          guardianName: "",
          relation: "",
          fatherName: "",
          motherName: "",
          guardianPhonePrimary: "",
          guardianPhoneSecondary: "",
          guardianEmail: "",
          occupation: ""
        }}
      />
    </div>
  );
}
