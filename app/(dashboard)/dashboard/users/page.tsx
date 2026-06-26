import { UserCog } from "lucide-react";

import { UserForm } from "@/components/school/user-form";
import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Option = {
  id: string;
  label: string;
  meta?: string;
};

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mergeCurrentOption(options: Option[], current?: Option | null) {
  if (!current) {
    return options;
  }

  return options.some((option) => option.id === current.id) ? options : [current, ...options];
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.manageUsers);
  const params = await searchParams;
  const saved = asSingle(params.saved) === "1";

  const [users, unlinkedStaff, unlinkedParents] = await Promise.all([
    db.user.findMany({
      where: { schoolId: session.schoolId },
      include: {
        roles: { include: { role: true } },
        staffProfile: true,
        parentProfile: true
      },
      orderBy: [{ fullName: "asc" }]
    }),
    db.staff.findMany({
      where: { schoolId: session.schoolId, userId: null },
      orderBy: { fullName: "asc" }
    }),
    db.parent.findMany({
      where: { schoolId: session.schoolId, userId: null },
      orderBy: { guardianName: "asc" }
    })
  ]);

  const staffOptions: Option[] = unlinkedStaff.map((item) => ({
    id: item.id,
    label: item.fullName,
    meta: `${item.employeeCode}${item.isArchived ? " • Archived" : ""}`
  }));
  const parentOptions: Option[] = unlinkedParents.map((item) => ({
    id: item.id,
    label: item.guardianName,
    meta: `${item.phonePrimary}${item.isArchived ? " • Archived" : ""}`
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="User management"
        title="Create login accounts"
        description="Add accounts for staff, parents, or other school users, choose their role, set a temporary password, and automatically link the matching profile."
      />

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          User account saved successfully.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Create a user account</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                The user can log in with the email and temporary password you set here, then update their own profile and password after first sign-in.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserForm
            title="Account details"
            description="Choose the login role, temporary password, and linked profile if one is available."
            submitLabel="Create user"
            values={{
              fullName: "",
              email: "",
              phone: "",
              roleCode: "TEACHER",
              status: "yes",
              password: "",
              staffId: "",
              parentId: ""
            }}
            staffOptions={staffOptions}
            parentOptions={parentOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing accounts</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            View the people who can sign in, their roles, and whether a staff or parent profile is linked.
          </p>
        </CardHeader>
        <CardContent>
          {users.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>User</TH>
                    <TH>Role</TH>
                    <TH>Linked profile</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {users.map((user) => {
                    const roleSummary = user.roles.map((entry) => entry.role.name).join(", ") || "-";
                    const linkedProfile =
                      user.staffProfile?.fullName
                        ? `Staff: ${user.staffProfile.fullName}`
                        : user.parentProfile?.guardianName
                          ? `Parent: ${user.parentProfile.guardianName}`
                          : "Not linked";

                    const editStaffOptions = mergeCurrentOption(
                      staffOptions,
                      user.staffProfile
                        ? {
                            id: user.staffProfile.id,
                            label: user.staffProfile.fullName,
                            meta: user.staffProfile.employeeCode
                          }
                        : null
                    );
                    const editParentOptions = mergeCurrentOption(
                      parentOptions,
                      user.parentProfile
                        ? {
                            id: user.parentProfile.id,
                            label: user.parentProfile.guardianName,
                            meta: user.parentProfile.phonePrimary
                          }
                        : null
                    );

                    return (
                      <tr key={user.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{user.fullName}</span>
                            <span className="text-xs text-slate-500">{user.email}</span>
                          </div>
                        </TD>
                        <TD>{roleSummary}</TD>
                        <TD>{linkedProfile}</TD>
                        <TD>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              user.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Dialog
                              title={`Edit ${user.fullName}`}
                              description="Update the user's role, login details, status, or linked profile."
                              triggerLabel="Edit"
                            >
                              <UserForm
                                title="Edit user"
                                description="Update the login account and keep the linked profile in sync."
                                submitLabel="Save changes"
                                values={{
                                  id: user.id,
                                  fullName: user.fullName,
                                  email: user.email,
                                  phone: user.phone ?? "",
                                  roleCode: user.roles[0]?.role.code ?? "TEACHER",
                                  status: user.isActive ? "yes" : "no",
                                  password: "",
                                  staffId: user.staffProfile?.id ?? "",
                                  parentId: user.parentProfile?.id ?? ""
                                }}
                                staffOptions={editStaffOptions}
                                parentOptions={editParentOptions}
                              />
                            </Dialog>
                          </div>
                        </TD>
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No user accounts yet"
              description="Create the first login account so staff or parents can sign in."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
