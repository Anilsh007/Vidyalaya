"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { UserForm, type UserFormValues, type UserHandoverPayload } from "@/components/school/user-form";
import { deleteUserAction } from "@/app/(dashboard)/dashboard/users/actions";
import { EmptyState } from "@/components/school/empty-state";
import { buildUserHandoverPreview, UserHandoverPanel } from "@/components/school/user-handover-panel";
import { DetailStat, StatusBadge, TableFrame } from "@/components/shared/dashboard-primitives";
import { SectionHeaderCard, TableActionGroup } from "@/components/shared/listing-primitives";
import { SelectionToolbar } from "@/components/shared/selection-toolbar";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Copy, MessageCircleMore, Printer, Share2, UserCog } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SpecificRoleKey, UserSelectOption } from "@/lib/user-management";

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
  reportingManagerId: string;
  reportingManagerName?: string | null;
  staffId: string;
  parentId: string;
  studentId: string;
  parentStudentIds: string[];
  createdAt: string;
};

type UserControlConsoleProps = {
  users: UserGridItem[];
  isSuperAdmin: boolean;
  createValues: UserFormValues;
  hodOptions: UserSelectOption[];
  staffOptions: UserSelectOption[];
  parentOptions: UserSelectOption[];
  studentOptions: UserSelectOption[];
  allowedSpecificRoleKeys: SpecificRoleKey[];
};

export function UserControlConsole({
  users,
  isSuperAdmin,
  createValues,
  hodOptions,
  staffOptions,
  parentOptions,
  studentOptions,
  allowedSpecificRoleKeys
}: UserControlConsoleProps) {
  const { pushToast } = useToast();
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [activeHandover, setActiveHandover] = useState<UserHandoverPayload | null>(null);
  const [detailUser, setDetailUser] = useState<UserGridItem | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHandoverOptions, setShowHandoverOptions] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkShareOptions, setShowBulkShareOptions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(true);

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
    setActiveHandover(buildUserHandoverPreview(user));
    notify({
      title: "Account selected",
      description: `${user.fullName} is loaded into the handover action bar.`,
      tone: "info"
    });
  }

  function handleOpenDetails(user: UserGridItem) {
    setDetailUser(user);
    setShowShareOptions(false);
    setShowEditForm(false);
    setShowHandoverOptions(false);
  }

  function handleCloseDetails() {
    setDetailUser(null);
    setShowShareOptions(false);
    setShowEditForm(false);
    setShowHandoverOptions(false);
  }

  function handleCopyCredentials() {
    if (!activeHandover) {
      notify({ title: "No account selected", description: "Select or create an account before copying credentials.", tone: "error" });
      return;
    }

    const text = activeHandover.temporaryPassword
      ? buildCredentialMessage(activeHandover)
      : buildHandoverSummaryMessage(activeHandover);
    navigator.clipboard.writeText(text).then(
      () =>
        notify({
          title: activeHandover.temporaryPassword ? "Credentials copied" : "User summary copied",
          description: activeHandover.temporaryPassword
            ? "The credential handover text is now on the clipboard."
            : "The user handover summary is now on the clipboard.",
          tone: "success"
        }),
      () => notify({ title: "Clipboard failed", description: "Copy the content manually from the action bar.", tone: "error" })
    );
  }

  function handleCopyProfile(user: UserGridItem) {
    const text = buildUserProfileSummary(user);

    navigator.clipboard.writeText(text).then(
      () => notify({ title: "User details copied", description: "The selected user summary is now on the clipboard.", tone: "success" }),
      () => notify({ title: "Clipboard failed", description: "Copy the user details manually from the popup.", tone: "error" })
    );
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]
    );
  }

  function toggleAllUserSelection() {
    setSelectedUserIds((current) => (current.length === users.length ? [] : users.map((user) => user.id)));
  }

  function handleShareAction(mode: "select" | "copy" | "whatsapp" | "print") {
    if (!detailUser) {
      return;
    }

    if (mode === "select") {
      handleSelectUser(detailUser);
      setShowHandoverOptions(true);
      return;
    }

    if (mode === "copy") {
      handleCopyProfile(detailUser);
      setShowShareOptions(false);
      return;
    }

    const handover = buildUserHandoverPreview(detailUser);
    setActiveHandover(handover);

    if (mode === "whatsapp") {
      handleWhatsApp(handover);
      setShowShareOptions(false);
      return;
    }

    handlePrint(handover);
    setShowShareOptions(false);
  }

  function handleWhatsApp(payload = activeHandover) {
    if (!payload) {
      notify({ title: "No account selected", description: "Select or create an account before opening WhatsApp.", tone: "error" });
      return;
    }

    if (payload.temporaryPassword && payload.phone) {
      const phone = payload.phone.replace(/\D+/g, "");
      const message = encodeURIComponent(buildWhatsAppMessage(payload));
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
      notify({ title: "WhatsApp handover opened", description: "A WhatsApp handover tab has been launched for this account.", tone: "success" });
      return;
    }

    const shareText = encodeURIComponent(buildHandoverSummaryMessage(payload));
    window.open(`https://wa.me/?text=${shareText}`, "_blank", "noopener,noreferrer");
    notify({ title: "WhatsApp summary opened", description: "A WhatsApp share tab has been opened with the user summary.", tone: "success" });
  }

  function handlePrint(payload = activeHandover) {
    if (!payload) {
      notify({ title: "No account selected", description: "Select or create an account before printing the handover slip.", tone: "error" });
      return;
    }

    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) {
      notify({ title: "Print window blocked", description: "Allow pop-ups for this site to use the print handover slip.", tone: "error" });
      return;
    }

    printWindow.document.write(
      payload.temporaryPassword ? buildPrintMarkup(payload) : buildSummaryPrintMarkup(payload.fullName, buildHandoverSummaryMessage(payload))
    );
    printWindow.document.close();
    printWindow.focus();
  }

  function handleBulkShare(mode: "copy" | "whatsapp" | "print") {
    if (!selectedUsers.length) {
      notify({ title: "No rows selected", description: "Select one or more users from the table first.", tone: "error" });
      return;
    }

    const bulkText = buildBulkUserSummary(selectedUsers);

    if (mode === "copy") {
      navigator.clipboard.writeText(bulkText).then(
        () => notify({ title: "Selected users copied", description: "The selected user summaries are now on the clipboard.", tone: "success" }),
        () => notify({ title: "Clipboard failed", description: "Copy the selected user details manually from the table.", tone: "error" })
      );
      return;
    }

    if (mode === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(bulkText)}`, "_blank", "noopener,noreferrer");
      notify({ title: "WhatsApp share opened", description: "A WhatsApp share tab has been opened for the selected users.", tone: "success" });
      return;
    }

    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) {
      notify({ title: "Print window blocked", description: "Allow pop-ups for this site to print selected user summaries.", tone: "error" });
      return;
    }

    printWindow.document.write(buildSummaryPrintMarkup("Selected Users Summary", bulkText));
    printWindow.document.close();
    printWindow.focus();
  }

  function handleDeleteUser(user: UserGridItem) {
    if (!window.confirm(`Delete user "${user.fullName}" permanently? This action cannot be undone.`)) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteUserAction(user.id);
      onDeleteResult(result, user.id);
    });
  }

  function onDeleteResult(result: { status: string; message?: string }, deletedUserId: string) {
    if (result.status === "success") {
      setSelectedUserIds((current) => current.filter((id) => id !== deletedUserId));
      setActiveHandover((current) => (current?.userId === deletedUserId ? null : current));
      notify({
        title: "User deleted",
        description: result.message ?? "User account deleted successfully.",
        tone: "success"
      });
      handleCloseDetails();
      router.refresh();
      return;
    }

    notify({
      title: "Delete failed",
      description: result.message ?? "Unable to delete the user account.",
      tone: "error"
    });
  }

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [selectedUserIds, users]
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowCreateForm((current) => !current)}>
              {showCreateForm ? "Hide form" : "Open create form"}
            </Button>
          </div>
          {showCreateForm ? (
            <UserForm
              submitLabel="Create user"
              values={createValues}
              hodOptions={hodOptions}
              staffOptions={staffOptions}
              parentOptions={parentOptions}
              studentOptions={studentOptions}
              allowedSpecificRoleKeys={allowedSpecificRoleKeys}
              onHandoverReady={setHandover}
              onNotify={notify}
            />
          ) : null}
        </div>

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
                    <TH className="w-14">
                      <input
                        type="checkbox"
                        checked={users.length > 0 && selectedUserIds.length === users.length}
                        onChange={toggleAllUserSelection}
                        aria-label="Select all users"
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </TH>
                    <TH>User</TH>
                    <TH>Role</TH>
                    <TH>Created</TH>
                    <TH>Linked profile</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {users.map((user) => {
                    return (
                      <tr
                        key={user.id}
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => handleOpenDetails(user)}
                      >
                        <TD>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${user.fullName}`}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </TD>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{user.fullName}</span>
                            <span className="text-xs text-slate-500">{user.email}</span>
                          </div>
                        </TD>
                        <TD>{user.roleLabel}</TD>
                        <TD>
                          <div className="grid gap-1">
                            <span className="text-sm font-medium text-slate-900">{formatDate(user.createdAt)}</span>
                            <span className="text-xs text-slate-500">{formatTime(user.createdAt)}</span>
                          </div>
                        </TD>
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSelectUser(user);
                                }}
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
                          <StatusBadge
                            status={user.isActive ? "Active" : "Inactive"}
                            toneMap={{
                              Active: "bg-emerald-50 text-emerald-700",
                              Inactive: "bg-slate-100 text-slate-600"
                            }}
                          />
                        </TD>
                        <TD>
                          <TableActionGroup>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenDetails(user);
                              }}
                            >
                              Select
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className={
                                user.linkedProfileBadgeTone === "warning"
                                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
                                  : undefined
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenDetails(user);
                                setShowEditForm(true);
                              }}
                            >
                              {user.linkedProfileBadgeTone === "warning" ? "Pair / Edit" : "Edit"}
                            </Button>
                          </TableActionGroup>
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
          {selectedUsers.length ? (
            <SelectionToolbar
              count={selectedUsers.length}
              description="Share multiple selected user summaries together from this action bar."
              actionLabel="Share selected"
              onActionToggle={() => setShowBulkShareOptions((current) => !current)}
              onClear={() => {
                setSelectedUserIds([]);
                setShowBulkShareOptions(false);
              }}
            >
              {showBulkShareOptions ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="secondary" onClick={() => handleBulkShare("copy")}>
                    <Copy className="h-4 w-4" />
                    Copy Selected
                  </Button>
                  <Button variant="secondary" onClick={() => handleBulkShare("whatsapp")}>
                    <MessageCircleMore className="h-4 w-4" />
                    WhatsApp Selected
                  </Button>
                  <Button variant="secondary" onClick={() => handleBulkShare("print")}>
                    <Printer className="h-4 w-4" />
                    Print Selected
                  </Button>
                </div>
              ) : null}
            </SelectionToolbar>
          ) : null}
        </CardContent>
      </Card>

      <UserAccountDialog
        user={detailUser}
        isSuperAdmin={isSuperAdmin}
        isDeleting={isDeleting}
        open={Boolean(detailUser)}
        showEditForm={showEditForm}
        showShareOptions={showShareOptions}
        showHandoverOptions={showHandoverOptions}
        activeHandover={activeHandover}
        onClose={handleCloseDetails}
        onEditToggle={() => {
          setShowEditForm((current) => !current);
          setShowShareOptions(false);
        }}
        onShareToggle={() => {
          setShowShareOptions((current) => !current);
          setShowEditForm(false);
        }}
        onHandoverToggle={() => {
          if (detailUser) {
            handleSelectUser(detailUser);
            setShowHandoverOptions((current) => !current);
            setShowShareOptions(false);
          }
        }}
        onPopupHandoverWhatsApp={() => detailUser && handleWhatsApp(buildUserHandoverPreview(detailUser))}
        onPopupHandoverPrint={() => detailUser && handlePrint(buildUserHandoverPreview(detailUser))}
        onPopupHandoverCopy={() => detailUser && handleCopyProfile(detailUser)}
        onDeleteUser={() => detailUser && handleDeleteUser(detailUser)}
        onShareAction={handleShareAction}
        buildFormValues={(user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          roleCategory: user.roleCategory,
          specificRoleKey: user.specificRoleKey,
          status: user.isActive ? "yes" : "no",
          password: "",
          reportingManagerId: user.reportingManagerId,
          staffId: user.staffId,
          parentId: user.parentId,
          studentId: user.studentId,
          parentStudentIds: user.parentStudentIds,
          forcePasswordReset: "no"
        })}
        hodOptions={hodOptions}
        staffOptions={staffOptions}
        parentOptions={parentOptions}
        studentOptions={studentOptions}
        allowedSpecificRoleKeys={allowedSpecificRoleKeys}
        onHandoverReady={setHandover}
        onNotify={notify}
      />
    </div>
  );
}

function UserAccountDialog({
  user,
  isSuperAdmin,
  isDeleting,
  open,
  showEditForm,
  showShareOptions,
  showHandoverOptions,
  activeHandover,
  onClose,
  onEditToggle,
  onShareToggle,
  onHandoverToggle,
  onPopupHandoverWhatsApp,
  onPopupHandoverPrint,
  onPopupHandoverCopy,
  onDeleteUser,
  onShareAction,
  buildFormValues,
  hodOptions,
  staffOptions,
  parentOptions,
  studentOptions,
  allowedSpecificRoleKeys,
  onHandoverReady,
  onNotify
}: {
  user: UserGridItem | null;
  isSuperAdmin: boolean;
  isDeleting: boolean;
  open: boolean;
  showEditForm: boolean;
  showShareOptions: boolean;
  showHandoverOptions: boolean;
  activeHandover: UserHandoverPayload | null;
  onClose: () => void;
  onEditToggle: () => void;
  onShareToggle: () => void;
  onHandoverToggle: () => void;
  onPopupHandoverWhatsApp: () => void;
  onPopupHandoverPrint: () => void;
  onPopupHandoverCopy: () => void;
  onDeleteUser: () => void;
  onShareAction: (mode: "select" | "copy" | "whatsapp" | "print") => void;
  buildFormValues: (user: UserGridItem) => UserFormValues;
  hodOptions: UserSelectOption[];
  staffOptions: UserSelectOption[];
  parentOptions: UserSelectOption[];
  studentOptions: UserSelectOption[];
  allowedSpecificRoleKeys: SpecificRoleKey[];
  onHandoverReady: (payload: UserHandoverPayload) => void;
  onNotify: (input: { title: string; description?: string; tone: "success" | "error" | "info" }) => void;
}) {
  return (
    <Dialog
      title={user ? user.fullName : "User details"}
      description={user ? "View account details, share the profile, or edit the same record from one popup." : undefined}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      widthClassName="w-[min(96vw,960px)]"
    >
      {user ? (
        <div className="grid gap-6">
          {showHandoverOptions ? (
            <div className="grid gap-4 rounded-[26px] border border-slate-200/80 bg-slate-50/70 p-5">
              <div className="grid gap-1">
                <h4 className="text-2xl font-semibold tracking-tight text-slate-950">Handover Action Bar</h4>
                <p className="text-sm leading-6 text-slate-600">
                  Keep one active account context ready for operational handover, credential printing, and WhatsApp delivery.
                </p>
              </div>
              <UserHandoverPanel
                payload={activeHandover && activeHandover.userId === user.id ? activeHandover : buildUserHandoverPreview(user)}
                systemSyncId={
                  activeHandover && activeHandover.userId === user.id
                    ? activeHandover.linkedProfileSystemId || "System ID will appear here once a verified profile sync is available."
                    : user.linkedProfileSystemId || "System ID will appear here once a verified profile sync is available."
                }
                onWhatsApp={onPopupHandoverWhatsApp}
                onPrint={onPopupHandoverPrint}
                onCopy={onPopupHandoverCopy}
                actionLabels={{
                  whatsapp: "Send via WhatsApp",
                  print: "Print Slip",
                  copy: activeHandover?.temporaryPassword ? "Copy Credentials" : "Copy Summary"
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account overview</p>
                  <h4 className="text-xl font-semibold text-slate-950">{user.fullName}</h4>
                  <p className="text-sm text-slate-600">{user.roleLabel}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailStat label="Email" value={user.email} />
                <DetailStat label="Phone" value={user.phone || "Not available"} />
                <DetailStat label="Created date" value={formatDate(user.createdAt)} />
                <DetailStat label="Created time" value={formatTime(user.createdAt)} />
              </div>
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <DetailStat label="Profile status" value={user.linkedProfileBadgeLabel} />
              <DetailStat label="Linked profile" value={user.linkedProfileLabel} />
              <DetailStat label="System ID" value={user.linkedProfileSystemId ?? "Not available"} />
              <DetailStat label="Reporting manager" value={user.reportingManagerName ?? "Not assigned"} />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={onHandoverToggle}>
              Select for handover
            </Button>
            <Button variant="secondary" onClick={onShareToggle}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button onClick={onEditToggle}>{showEditForm ? "Hide edit" : "Edit user"}</Button>
            {isSuperAdmin ? (
              <Button variant="danger" onClick={onDeleteUser} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete user"}
              </Button>
            ) : null}
          </div>

          {showShareOptions ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <Button variant="secondary" onClick={() => onShareAction("copy")}>
                <Copy className="h-4 w-4" />
                Copy Details
              </Button>
              <Button variant="secondary" onClick={() => onShareAction("select")}>
                <CheckCircle2 className="h-4 w-4" />
                Load To Handover
              </Button>
              <Button variant="secondary" onClick={() => onShareAction("whatsapp")}>
                <MessageCircleMore className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="secondary" onClick={() => onShareAction("print")}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          ) : null}

          {showEditForm ? (
            <div className="border-t border-slate-200 pt-4">
              <UserForm
                title="Edit user"
                description="Keep the login record, linked profile, and department routing aligned."
                submitLabel="Save changes"
                values={buildFormValues(user)}
                hodOptions={hodOptions}
                staffOptions={staffOptions}
                parentOptions={parentOptions}
                studentOptions={studentOptions}
                allowedSpecificRoleKeys={allowedSpecificRoleKeys}
                onHandoverReady={onHandoverReady}
                onNotify={onNotify}
                onSuccess={onClose}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
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

function buildHandoverSummaryMessage(payload: UserHandoverPayload) {
  return [
    "SPRINGFIELD PUBLIC SCHOOL",
    "",
    `Name: ${payload.fullName}`,
    `Role: ${payload.roleLabel}`,
    `Username: ${payload.username}`,
    `Phone: ${payload.phone || "Not available"}`,
    `System ID: ${payload.linkedProfileSystemId ?? "Not available"}`,
    "",
    payload.temporaryPassword
      ? `Temporary Password: ${payload.temporaryPassword}`
      : "Temporary password is not currently cached for this account."
  ].join("\n");
}

function buildUserProfileSummary(user: UserGridItem) {
  return [
    "SPRINGFIELD PUBLIC SCHOOL",
    "",
    `Name: ${user.fullName}`,
    `Role: ${user.roleLabel}`,
    `Email: ${user.email}`,
    `Phone: ${user.phone || "Not available"}`,
    `Status: ${user.isActive ? "Active" : "Inactive"}`,
    `Created: ${formatDateTime(user.createdAt)}`,
    `Profile Sync: ${user.linkedProfileBadgeLabel}`,
    `System ID: ${user.linkedProfileSystemId ?? "Not available"}`
  ].join("\n");
}

function buildBulkUserSummary(users: UserGridItem[]) {
  return [
    "SPRINGFIELD PUBLIC SCHOOL",
    "",
    ...users.map((user, index) =>
      [
        `${index + 1}. ${user.fullName}`,
        `Role: ${user.roleLabel}`,
        `Email: ${user.email}`,
        `Phone: ${user.phone || "Not available"}`,
        `Status: ${user.isActive ? "Active" : "Inactive"}`,
        `Created: ${formatDateTime(user.createdAt)}`,
        `System ID: ${user.linkedProfileSystemId ?? "Not available"}`
      ].join("\n")
    )
  ].join("\n\n");
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

function buildSummaryPrintMarkup(title: string, summary: string) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 32px; color: #0f172a; }
        .card { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #cbd5e1; border-radius: 24px; padding: 32px; }
        .eyebrow { color: #475569; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
        h1 { margin: 12px 0 8px; font-size: 28px; }
        pre { white-space: pre-wrap; word-break: break-word; line-height: 1.7; font-size: 14px; color: #334155; }
        @media print { body { padding: 0; background: white; } .card { border: none; box-shadow: none; } }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = () => window.close();">
      <div class="card">
        <div class="eyebrow">Springfield Public School</div>
        <h1>${escapeHtml(title)}</h1>
        <pre>${escapeHtml(summary)}</pre>
      </div>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
