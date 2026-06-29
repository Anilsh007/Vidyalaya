import { HostelAllocationStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type HostelInput = {
  schoolId: string;
  id?: string;
  name: string;
  code: string;
  wardenName?: string;
  wardenPhone?: string;
  address?: string;
  isActive: string;
};

type HostelRoomInput = {
  schoolId: string;
  id?: string;
  hostelId: string;
  roomNumber: string;
  floor?: string;
  roomType?: string;
  capacity: number;
  monthlyFee?: string | number;
  isActive: string;
};

type HostelAllocationInput = {
  schoolId: string;
  id?: string;
  studentId: string;
  hostelId: string;
  roomId: string;
  bedNumber?: string;
  startDate: string;
  endDate?: string;
  status: HostelAllocationStatus;
  monthlyFee?: string | number;
  guardianConsent: string;
  remarks?: string;
};

function toDate(value?: string | null, endOfDay = false) {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

export async function getHostelPageData({ schoolId }: { schoolId: string }) {
  const [hostels, rooms, allocations, students] = await Promise.all([
    db.hostel.findMany({
      where: { schoolId, isArchived: false },
      include: { rooms: true, allocations: { where: { status: "ACTIVE" } } },
      orderBy: [{ code: "asc" }]
    }),
    db.hostelRoom.findMany({
      where: { schoolId, isArchived: false },
      include: { hostel: true, allocations: { where: { status: "ACTIVE" } } },
      orderBy: [{ hostel: { code: "asc" } }, { roomNumber: "asc" }]
    }),
    db.hostelAllocation.findMany({
      where: { schoolId },
      include: { student: { include: { class: true, section: true } }, hostel: true, room: true },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    }),
    db.student.findMany({
      where: { schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const activeAllocations = allocations.filter((allocation) => allocation.status === "ACTIVE");
  const monthlyHostelValue = activeAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.monthlyFee ?? allocation.room.monthlyFee ?? 0),
    0
  );
  const consentPending = activeAllocations.filter((allocation) => !allocation.guardianConsent).length;

  return {
    hostels,
    rooms,
    allocations,
    students,
    totalCapacity,
    activeAllocations,
    monthlyHostelValue,
    consentPending
  };
}

export async function saveHostel(input: HostelInput) {
  const hostelData = {
    name: input.name,
    code: input.code,
    wardenName: input.wardenName || null,
    wardenPhone: input.wardenPhone || null,
    address: input.address || null,
    isActive: input.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  if (input.id) {
    const existing = await db.hostel.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });
    if (!existing) throw new Error("Hostel not found.");
    return db.hostel.update({ where: { id: existing.id }, data: hostelData });
  }

  return db.hostel.create({
    data: { schoolId: input.schoolId, ...hostelData }
  });
}

export async function saveHostelRoom(input: HostelRoomInput) {
  const hostel = await db.hostel.findFirst({
    where: { id: input.hostelId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!hostel) throw new Error("Hostel not found.");

  const roomData = {
    hostelId: input.hostelId,
    roomNumber: input.roomNumber,
    floor: input.floor || null,
    roomType: input.roomType || null,
    capacity: input.capacity,
    monthlyFee:
      input.monthlyFee === undefined || input.monthlyFee === ""
        ? null
        : new Prisma.Decimal(input.monthlyFee),
    isActive: input.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  if (input.id) {
    return db.hostelRoom.update({ where: { id: input.id }, data: roomData });
  }

  return db.hostelRoom.create({
    data: { schoolId: input.schoolId, ...roomData }
  });
}

export async function saveHostelAllocation(input: HostelAllocationInput) {
  const room = await db.hostelRoom.findFirst({
    where: { id: input.roomId, schoolId: input.schoolId, hostelId: input.hostelId, isArchived: false },
    include: { allocations: { where: { status: "ACTIVE" } } }
  });
  if (!room) throw new Error("Room not found.");
  if (!input.id && room.allocations.length >= room.capacity) throw new Error("Selected room is already full.");

  const allocationData = {
    studentId: input.studentId,
    hostelId: input.hostelId,
    roomId: input.roomId,
    bedNumber: input.bedNumber || null,
    startDate: toDate(input.startDate)!,
    endDate: toDate(input.endDate, true),
    status: input.status,
    monthlyFee:
      input.monthlyFee === undefined || input.monthlyFee === ""
        ? null
        : new Prisma.Decimal(input.monthlyFee),
    guardianConsent: input.guardianConsent === "yes",
    remarks: input.remarks || null
  };

  if (input.id) {
    return db.hostelAllocation.update({ where: { id: input.id }, data: allocationData });
  }

  return db.hostelAllocation.create({
    data: { schoolId: input.schoolId, ...allocationData }
  });
}

export async function archiveHostel({ schoolId, hostelId }: { schoolId: string; hostelId: string }) {
  return db.hostel.updateMany({
    where: { id: hostelId, schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
}

export async function archiveHostelRoom({ schoolId, roomId }: { schoolId: string; roomId: string }) {
  return db.hostelRoom.updateMany({
    where: { id: roomId, schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
}
