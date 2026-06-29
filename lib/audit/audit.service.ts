import type { Prisma } from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";

type SecurityAuditInput = {
  action: string;
  schoolId?: string | null;
  actorUserId?: string | null;
  entityType?: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordSecurityAuditEvent(input: SecurityAuditInput) {
  if (!input.schoolId) {
    return;
  }

  await recordAuditLog({
    actorUserId: input.actorUserId ?? undefined,
    schoolId: input.schoolId,
    action: input.action,
    entityType: input.entityType ?? "Security",
    entityId: input.entityId ?? undefined,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
}

