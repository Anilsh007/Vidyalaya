import { CheckCircle2, Copy, MessageCircleMore, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DetailStat } from "@/components/shared/dashboard-primitives";
import type { UserHandoverPayload } from "@/components/school/user-form";

export type UserHandoverActionLabels = {
  whatsapp?: string;
  print?: string;
  copy?: string;
};

type UserHandoverPanelProps = {
  payload: UserHandoverPayload;
  systemSyncId: string;
  onWhatsApp: () => void;
  onPrint: () => void;
  onCopy: () => void;
  actionLabels?: UserHandoverActionLabels;
};

export function UserHandoverPanel({
  payload,
  systemSyncId,
  onWhatsApp,
  onPrint,
  onCopy,
  actionLabels
}: UserHandoverPanelProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-slate-500">Active handover record</p>
            <h3 className="text-xl font-semibold text-slate-950">{payload.fullName}</h3>
            <p className="text-sm text-slate-600">{payload.roleLabel}</p>
            {payload.reportingManagerSynced && payload.reportingManagerName ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                [ Reporting Manager Synced ] {payload.reportingManagerName}
              </div>
            ) : null}
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              payload.linkedProfileBadgeTone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            {payload.linkedProfileBadgeLabel}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <DetailStat label="Username" value={payload.username} />
          <DetailStat label="Phone" value={payload.phone || "Not available"} />
          <DetailStat label="Temporary password" value={payload.temporaryPassword || "Not available"} />
          <DetailStat label="System sync ID" value={systemSyncId} />
        </div>
      </div>
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-5">
        <Button onClick={onWhatsApp}>
          <MessageCircleMore className="h-4 w-4" />
          {actionLabels?.whatsapp ?? "Send via WhatsApp"}
        </Button>
        <Button variant="secondary" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          {actionLabels?.print ?? "Print Slip"}
        </Button>
        <Button variant="secondary" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {actionLabels?.copy ?? "Copy Credentials"}
        </Button>
      </div>
    </div>
  );
}

export function buildUserHandoverPreview(user: {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  roleLabel: string;
  studentId: string;
  parentId: string;
  staffId: string;
  linkedProfileBadgeLabel: string;
  linkedProfileBadgeTone: "success" | "warning";
  linkedProfileSystemId?: string | null;
  reportingManagerName?: string | null;
}): UserHandoverPayload {
  return {
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
    linkedProfileSystemId: user.linkedProfileSystemId,
    reportingManagerName: user.reportingManagerName,
    reportingManagerSynced: Boolean(user.reportingManagerName)
  };
}
