import { LeaveRequesterType, LeaveRequestStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type LeaveRequestInput = {
  schoolId: string;
  requesterType: "STUDENT" | "STAFF";
  studentId?: string;
  staffId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  totalDays: number;
};

type LeaveReviewInput = {
  schoolId: string;
  userId: string;
  leaveId: string;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  reviewRemarks?: string;
};

export async function getLeavesPageData({ schoolId }: { schoolId: string }) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [students, staff, leaveRequests] = await Promise.all([
    db.student.findMany({
      where: { schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    }),
    db.staff.findMany({
      where: { schoolId, isArchived: false },
      orderBy: [{ fullName: "asc" }]
    }),
    db.leaveRequest.findMany({
      where: { schoolId },
      orderBy: [{ createdAt: "desc" }],
      take: 60
    })
  ]);

  const pendingLeaves = leaveRequests.filter((leave) => leave.status === "PENDING");
  const approvedThisMonth = leaveRequests.filter(
    (leave) => leave.status === "APPROVED" && leave.startDate >= monthStart
  );
  const studentLeaves = leaveRequests.filter((leave) => leave.requesterType === "STUDENT");
  const staffLeaves = leaveRequests.filter((leave) => leave.requesterType === "STAFF");

  return {
    students,
    staff,
    leaveRequests,
    pendingLeaves,
    approvedThisMonth,
    studentLeaves,
    staffLeaves
  };
}

export async function saveLeaveRequest(input: LeaveRequestInput) {
  let requesterName = "";
  if (input.requesterType === "STUDENT") {
    const student = await db.student.findFirst({
      where: { id: input.studentId, schoolId: input.schoolId },
      select: { fullName: true }
    });
    if (!student) throw new Error("Student not found.");
    requesterName = student.fullName;
  } else {
    const staff = await db.staff.findFirst({
      where: { id: input.staffId, schoolId: input.schoolId },
      select: { fullName: true }
    });
    if (!staff) throw new Error("Staff member not found.");
    requesterName = staff.fullName;
  }

  const leave = await db.leaveRequest.create({
    data: {
      schoolId: input.schoolId,
      requesterType: input.requesterType as LeaveRequesterType,
      studentId: input.requesterType === "STUDENT" ? input.studentId : null,
      staffId: input.requesterType === "STAFF" ? input.staffId : null,
      requesterName,
      leaveType: input.leaveType,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      endDate: new Date(`${input.endDate}T23:59:59.999Z`),
      totalDays: new Prisma.Decimal(input.totalDays),
      reason: input.reason
    }
  });

  return { leave, requesterName };
}

export async function reviewLeaveRequest(input: LeaveReviewInput) {
  const existing = await db.leaveRequest.findFirst({
    where: { id: input.leaveId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!existing) throw new Error("Leave request not found.");

  return db.leaveRequest.update({
    where: { id: existing.id },
    data: {
      status: input.status as LeaveRequestStatus,
      reviewedById: input.userId,
      reviewedAt: new Date(),
      reviewRemarks: input.reviewRemarks || null
    }
  });
}
