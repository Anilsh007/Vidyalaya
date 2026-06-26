import { notFound } from "next/navigation";

import { StaffForm } from "@/components/school/staff-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { toDateInput } from "@/lib/school";

type Params = Promise<{ staffId: string }>;

export default async function EditStaffPage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.manageStaff);
  const { staffId } = await params;
  const staff = await db.staff.findFirst({
    where: { id: staffId, schoolId: session.schoolId }
  });

  if (!staff) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Staff management"
        title={`Edit ${staff.fullName}`}
        description="Update employment details, contact information, or teaching classification."
      />
      <StaffForm
        title="Edit staff"
        description="Changes are saved to the staff profile and captured in the audit trail."
        submitLabel="Save changes"
        values={{
          id: staff.id,
          employeeCode: staff.employeeCode,
          fullName: staff.fullName,
          designation: staff.designation,
          department: staff.department ?? "",
          qualification: staff.qualification ?? "",
          joiningDate: toDateInput(staff.joiningDate),
          phone: staff.phone ?? "",
          email: staff.email ?? "",
          gender: staff.gender ?? "",
          salaryAmount: staff.salaryAmount?.toString() ?? "",
          isTeachingStaff: staff.isTeachingStaff ? "yes" : "no"
        }}
      />
    </div>
  );
}
