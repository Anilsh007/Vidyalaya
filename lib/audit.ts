import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type AuditInput = {
  actorUserId?: string;
  schoolId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAuditLog(input: AuditInput) {
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      schoolId: input.schoolId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}
