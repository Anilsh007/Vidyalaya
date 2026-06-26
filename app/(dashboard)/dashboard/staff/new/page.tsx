import { StaffForm } from "@/components/school/staff-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewStaffPage() {
  await requirePermission(PERMISSIONS.manageStaff);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Staff management"
        title="Add staff record"
        description="Create a teaching or non-teaching staff profile for school operations, contact lookup, and future HR workflows."
      />
      <StaffForm
        title="Staff details"
        description="Employee code, designation, joining date, and staff type are used across the staff register."
        submitLabel="Create staff"
        values={{
          employeeCode: "",
          fullName: "",
          designation: "",
          department: "",
          qualification: "",
          joiningDate: new Date().toISOString().slice(0, 10),
          phone: "",
          email: "",
          gender: "",
          salaryAmount: "",
          isTeachingStaff: "yes"
        }}
      />
    </div>
  );
}
