"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { UserForm, type UserFormValues, type UserHandoverPayload } from "@/components/school/user-form";
import { EmptyState } from "@/components/school/empty-state";
import { TableFrame } from "@/components/shared/dashboard-primitives";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Copy, MessageCircleMore, Printer, UserCog } from "lucide-react";
import { useMemo, useState } from "react";

type Option = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

type UserGridItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  roleCode: string;
  roleCategory: UserFormValues["roleCategory"];
  specificRoleKey: UserFormValues["specificRoleKey"];
  linkedProfileLabel: string;
  linkedProfileSystemId?: string | null;
  linkedProfileBadgeLabel: string;
  linkedProfileBadgeTone: "success" | "warning";
  isActive: boolean;
  staffId: string;
  parentId: string;
  studentId: string;
  parentStudentIds: string[];
};

type UserControlConsoleProps = {
  users: UserGridItem[];
  createValues: UserFormValues;
  staffOptions: Option[];
  parentOptions: Option[];
  studentOptions: Option[];
};

export function UserControlConsole({
  users,
  createValues,
  staffOptions,
  parentOptions,
  studentOptions
}: UserControlConsoleProps) {
  const { pushToast } = useToast();
  const [activeHandover, setActiveHandover] = useState<UserHandoverPayload | null>(null);

  function notify(input: { title: string; description?: string; tone: "success" | "error" | "info" }) {
    pushToast(input);
  }

  function setHandover(payload: UserHandoverPayload) {
    setActiveHandover(payload);
    notify({
      title: "Handover action bar updated",
      description: `${payload.fullName} is now ready for WhatsApp sharing or print handover.`,
      tone: "success"
    });
  }

  function handleSelectUser(user: UserGridItem) {
    setActiveHandover({
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      username: user.phone || user.email,
      roleLabel: user.roleLabel,
      temporaryPassword: "",
      linkedProfileType: user.studentId ? "student" : user.parentId ? "parent" : user.staffId ? "staff" : "none",
      linkedProfileBadgeLabel: user.linkedProfileBadgeLabel,
      linkedProfileBadgeTone: user.linkedProfileBadgeTone,
      linkedProfileSystemId: user.linkedProfileSystemId
    });
    notify({
      title: "Account selected",
      description: `${user.fullName} is loaded into the handover action bar.`,
      tone: "info"
    });
  }

  function handleCopyCredentials() {
    if (!activeHandover) {
      notify({ title: "No account selected", description: "Select or create an account before copying credentials.", tone: "error" });
      return;
    }

    if (!activeHandover.temporaryPassword) {
      notify({
        title: "Temporary password unavailable",
        description: "Only newly provisioned or reset credentials can be copied securely from this screen.",
        tone: "error"
      });
      return;
    }

    const text = buildCredentialMessage(activeHandover);
    navigator.clipboard.writeText(text).then(
      () => notify({ title: "Credentials copied", description: "The credential handover text is now on the clipboard.", tone: "success" }),
      () => notify({ title: "Clipboard failed", description: "Copy the credentials manually from the action bar.", tone: "error" })
    );
  }

  function handleWhatsApp() {
    if (!activeHandover) {
      notify({ title: "No account selected", description: "Select or create an account before opening WhatsApp.", tone: "error" });
      return;
    }

    if (!activeHandover.phone) {
      notify({ title: "Phone number missing", description: "Add a mobile number before sending credentials via WhatsApp.", tone: "error" });
      return;
    }

    if (!activeHandover.temporaryPassword) {
      notify({
        title: "Temporary password unavailable",
        description: "Generate or reset a temporary password before sending a WhatsApp handover.",
        tone: "error"
      });
      return;
    }

    const phone = activeHandover.phone.replace(/\D+/g, "");
    const message = encodeURIComponent(buildWhatsAppMessage(activeHandover));
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
    notify({ title: "WhatsApp handover opened", description: "A WhatsApp handover tab has been launched for this account.", tone: "success" });
  }

  function handlePrint() {
    if (!activeHandover) {
      notify({ title: "No account selected", description: "Select or create an account before printing the handover slip.", tone: "error" });
      return;
    }

    if (!activeHandover.temporaryPassword) {
      notify({
        title: "Temporary password unavailable",
        description: "Generate or reset a temporary password before printing the credential slip.",
        tone: "error"
      });
      return;
    }

    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) {
      notify({ title: "Print window blocked", description: "Allow pop-ups for this site to use the print handover slip.", tone: "error" });
      return;
    }

    printWindow.document.write(buildPrintMarkup(activeHandover));
    printWindow.document.close();
    printWindow.focus();
  }

  const activeSystemSummary = useMemo(() => {
    if (!activeHandover?.linkedProfileSystemId) {
      return "System ID will appear here once a verified profile sync is available.";
    }

    return activeHandover.linkedProfileSystemId;
  }, [activeHandover]);

  return (
    <div className="grid gap-6">
      <Card className="border-slate-200/80 bg-slate-50/70 shadow-panel">
        <CardHeader>
          <CardTitle>Handover Action Bar</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Keep one active account context ready for operational handover, credential printing, and WhatsApp delivery.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          {activeHandover ? (
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-slate-500">Active handover record</p>
                    <h3 className="text-xl font-semibold text-slate-950">{activeHandover.fullName}</h3>
                    <p className="text-sm text-slate-600">{activeHandover.roleLabel}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${activeHandover.linkedProfileBadgeTone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {activeHandover.linkedProfileBadgeLabel}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <CredentialStat label="Username" value={activeHandover.username} />
                  <CredentialStat label="Phone" value={activeHandover.phone || "Not available"} />
                  <CredentialStat label="Temporary password" value={activeHandover.temporaryPassword || "Not available"} />
                  <CredentialStat label="System sync ID" value={activeSystemSummary} />
                </div>
              </div>
              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-5">
                <Button onClick={handleWhatsApp}>
                  <MessageCircleMore className="h-4 w-4" />
                  Send via WhatsApp
                </Button>
                <Button variant="secondary" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print Slip
                </Button>
                <Button variant="secondary" onClick={handleCopyCredentials}>
                  <Copy className="h-4 w-4" />
                  Copy Credentials
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-600">
              No active handover selected yet. Create a user or select an existing account from the grid below.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Create a user account</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Use the tiered role selector, attach the correct operational profile, and keep one-click handover ready.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserForm
            submitLabel="Create user"
            values={createValues}
            staffOptions={staffOptions}
            parentOptions={parentOptions}
            studentOptions={studentOptions}
            onHandoverReady={setHandover}
            onNotify={notify}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing accounts</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Review role assignment, profile sync compliance, and launch edit or pairing actions from one operational register.
          </p>
        </CardHeader>
        <CardContent>
          {users.length ? (
            <TableFrame>
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
                    const formValues: UserFormValues = {
                      id: user.id,
                      fullName: user.fullName,
                      email: user.email,
                      phone: user.phone,
                      roleCategory: user.roleCategory,
                      specificRoleKey: user.specificRoleKey,
                      status: user.isActive ? "yes" : "no",
                      password: "",
                      staffId: user.staffId,
                      parentId: user.parentId,
                      studentId: user.studentId,
                      parentStudentIds: user.parentStudentIds,
                      forcePasswordReset: "no"
                    };

                    return (
                      <tr key={user.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{user.fullName}</span>
                            <span className="text-xs text-slate-500">{user.email}</span>
                          </div>
                        </TD>
                        <TD>{user.roleLabel}</TD>
                        <TD>
                          <div className="grid gap-2">
                            <span className="text-sm text-slate-700">{user.linkedProfileLabel}</span>
                            <div className="flex flex-wrap gap-2">
                              {user.linkedProfileSystemId ? (
                                <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                  {user.linkedProfileSystemId}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleSelectUser(user)}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                                  user.linkedProfileBadgeTone === "success"
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {user.linkedProfileBadgeLabel}
                              </button>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleSelectUser(user)}>
                              Select
                            </Button>
                            <Dialog
                              title={`Edit ${user.fullName}`}
                              description="Update the role assignment, linked profile, or account access settings."
                              triggerLabel={user.linkedProfileBadgeTone === "warning" ? "Pair / Edit" : "Edit"}
                              triggerClassName={user.linkedProfileBadgeTone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100" : undefined}
                            >
                              <UserForm
                                title="Edit user"
                                description="Keep the login record, profile coupling, and handover details aligned."
                                submitLabel="Save changes"
                                values={formValues}
                                staffOptions={staffOptions}
                                parentOptions={parentOptions}
                                studentOptions={studentOptions}
                                onHandoverReady={setHandover}
                                onNotify={notify}
                              />
                            </Dialog>
                          </div>
                        </TD>
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
            </TableFrame>
          ) : (
            <EmptyState
              title="No user accounts yet"
              description="Create the first login account so staff, students, or parents can sign in."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CredentialStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function buildCredentialMessage(payload: UserHandoverPayload) {
  return [
    "SPRINGFIELD PUBLIC SCHOOL",
    "",
    `Hello ${payload.fullName},`,
    "Your official ERP portal credentials are ready.",
    "",
    `Role: ${payload.roleLabel}`,
    `Username: ${payload.username}`,
    `Temporary Password: ${payload.temporaryPassword}`,
    "",
    "Please reset your password upon initial sign-in."
  ].join("\n");
}

function buildWhatsAppMessage(payload: UserHandoverPayload) {
  return `*SPRINGFIELD PUBLIC SCHOOL*\n\nHello ${payload.fullName},\nYour official ERP portal credentials are ready.\n\n*Role:* ${payload.roleLabel}\n*Username:* ${payload.username}\n*Temporary Password:* ${payload.temporaryPassword}\n\n_Please reset your password upon initial sign-in._`;
}

function buildPrintMarkup(payload: UserHandoverPayload) {
  const content = `<!DOCTYPE html>
  <html>
    <head>
      <title>ERP Credential Slip</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 32px; color: #0f172a; }
        .card { max-width: 720px; margin: 0 auto; background: white; border: 1px solid #cbd5e1; border-radius: 24px; padding: 32px; }
        .eyebrow { color: #475569; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
        h1 { margin: 12px 0 8px; font-size: 28px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
        .item { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #f8fafc; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; margin-bottom: 8px; }
        .value { font-size: 16px; font-weight: 700; }
        .footer { margin-top: 28px; font-size: 14px; color: #475569; line-height: 1.7; }
        @media print { body { padding: 0; background: white; } .card { border: none; box-shadow: none; } }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = () => window.close();">
      <div class="card">
        <div class="eyebrow">Springfield Public School</div>
        <h1>ERP Credential Handover Slip</h1>
        <p>Provisioned for ${escapeHtml(payload.fullName)}.</p>
        <div class="grid">
          <div class="item"><div class="label">Role</div><div class="value">${escapeHtml(payload.roleLabel)}</div></div>
          <div class="item"><div class="label">Username</div><div class="value">${escapeHtml(payload.username)}</div></div>
          <div class="item"><div class="label">Temporary Password</div><div class="value">${escapeHtml(payload.temporaryPassword)}</div></div>
          <div class="item"><div class="label">Phone</div><div class="value">${escapeHtml(payload.phone || "Not available")}</div></div>
        </div>
        <div class="footer">
          Please reset the password immediately after the first sign-in. Keep this slip confidential and hand it only to the intended account holder.
        </div>
      </div>
    </body>
  </html>`;

  return content;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
