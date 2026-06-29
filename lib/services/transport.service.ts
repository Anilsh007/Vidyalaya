import { Prisma, TransportAssignmentStatus } from "@prisma/client";

import { db } from "@/lib/db";

type TransportVehicleInput = {
  schoolId: string;
  id?: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverName?: string;
  driverPhone?: string;
  helperName?: string;
  insuranceValidUntil?: string;
  fitnessValidUntil?: string;
  isActive: string;
};

type TransportRouteInput = {
  schoolId: string;
  id?: string;
  vehicleId?: string;
  name: string;
  code: string;
  startPoint?: string;
  endPoint?: string;
  monthlyFee?: string | number;
  isActive: string;
};

type TransportStopInput = {
  schoolId: string;
  id?: string;
  routeId: string;
  name: string;
  pickupTime?: string;
  dropTime?: string;
  stopOrder: number;
};

type TransportAssignmentInput = {
  schoolId: string;
  id?: string;
  studentId: string;
  routeId: string;
  stopId?: string;
  startDate: string;
  endDate?: string;
  status: TransportAssignmentStatus;
  monthlyFee?: string | number;
  remarks?: string;
};

function toDate(value?: string | null, endOfDay = false) {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

export async function getTransportPageData({ schoolId }: { schoolId: string }) {
  const today = new Date();

  const [vehicles, routes, stops, assignments, students] = await Promise.all([
    db.transportVehicle.findMany({
      where: { schoolId, isArchived: false },
      include: { routes: true },
      orderBy: [{ vehicleNumber: "asc" }]
    }),
    db.transportRoute.findMany({
      where: { schoolId, isArchived: false },
      include: {
        vehicle: true,
        stops: { orderBy: [{ stopOrder: "asc" }, { name: "asc" }] },
        assignments: { where: { status: "ACTIVE" } }
      },
      orderBy: [{ code: "asc" }]
    }),
    db.transportStop.findMany({
      where: { schoolId },
      include: { route: true },
      orderBy: [{ route: { code: "asc" } }, { stopOrder: "asc" }]
    }),
    db.transportAssignment.findMany({
      where: { schoolId },
      include: {
        student: { include: { class: true, section: true } },
        route: { include: { vehicle: true } },
        stop: true
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    }),
    db.student.findMany({
      where: { schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  const activeAssignments = assignments.filter((assignment) => assignment.status === "ACTIVE");
  const totalCapacity = vehicles.filter((vehicle) => vehicle.isActive).reduce((sum, vehicle) => sum + vehicle.capacity, 0);
  const expiringCompliance = vehicles.filter(
    (vehicle) =>
      (vehicle.insuranceValidUntil && vehicle.insuranceValidUntil < today) ||
      (vehicle.fitnessValidUntil && vehicle.fitnessValidUntil < today)
  ).length;
  const monthlyTransportValue = activeAssignments.reduce(
    (sum, assignment) =>
      sum + (assignment.monthlyFee ? Number(assignment.monthlyFee) : Number(assignment.route.monthlyFee ?? 0)),
    0
  );

  return {
    vehicles,
    routes,
    stops,
    assignments,
    students,
    activeAssignments,
    totalCapacity,
    expiringCompliance,
    monthlyTransportValue
  };
}

export async function saveTransportVehicle(input: TransportVehicleInput) {
  const vehicleData = {
    vehicleNumber: input.vehicleNumber,
    vehicleType: input.vehicleType,
    capacity: input.capacity,
    driverName: input.driverName || null,
    driverPhone: input.driverPhone || null,
    helperName: input.helperName || null,
    insuranceValidUntil: toDate(input.insuranceValidUntil),
    fitnessValidUntil: toDate(input.fitnessValidUntil),
    isActive: input.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  if (input.id) {
    const existing = await db.transportVehicle.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });
    if (!existing) throw new Error("Vehicle not found.");
    return db.transportVehicle.update({ where: { id: existing.id }, data: vehicleData });
  }

  return db.transportVehicle.create({
    data: { schoolId: input.schoolId, ...vehicleData }
  });
}

export async function saveTransportRoute(input: TransportRouteInput) {
  const routeData = {
    vehicleId: input.vehicleId || null,
    name: input.name,
    code: input.code,
    startPoint: input.startPoint || null,
    endPoint: input.endPoint || null,
    monthlyFee:
      input.monthlyFee === undefined || input.monthlyFee === ""
        ? null
        : new Prisma.Decimal(input.monthlyFee),
    isActive: input.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  if (input.id) {
    const existing = await db.transportRoute.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });
    if (!existing) throw new Error("Route not found.");
    return db.transportRoute.update({ where: { id: existing.id }, data: routeData });
  }

  return db.transportRoute.create({
    data: { schoolId: input.schoolId, ...routeData }
  });
}

export async function saveTransportStop(input: TransportStopInput) {
  const route = await db.transportRoute.findFirst({
    where: { id: input.routeId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!route) throw new Error("Route not found.");

  const stopData = {
    routeId: input.routeId,
    name: input.name,
    pickupTime: input.pickupTime || null,
    dropTime: input.dropTime || null,
    stopOrder: input.stopOrder
  };

  if (input.id) {
    return db.transportStop.update({ where: { id: input.id }, data: stopData });
  }

  return db.transportStop.create({
    data: { schoolId: input.schoolId, ...stopData }
  });
}

export async function saveTransportAssignment(input: TransportAssignmentInput) {
  const student = await db.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!student) throw new Error("Student not found.");

  const assignmentData = {
    studentId: input.studentId,
    routeId: input.routeId,
    stopId: input.stopId || null,
    startDate: toDate(input.startDate)!,
    endDate: toDate(input.endDate, true),
    status: input.status,
    monthlyFee:
      input.monthlyFee === undefined || input.monthlyFee === ""
        ? null
        : new Prisma.Decimal(input.monthlyFee),
    remarks: input.remarks || null
  };

  if (input.id) {
    const existing = await db.transportAssignment.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });
    if (!existing) throw new Error("Transport assignment not found.");
    return db.transportAssignment.update({ where: { id: existing.id }, data: assignmentData });
  }

  return db.transportAssignment.create({
    data: { schoolId: input.schoolId, ...assignmentData }
  });
}

export async function archiveTransportVehicle({ schoolId, vehicleId }: { schoolId: string; vehicleId: string }) {
  return db.transportVehicle.updateMany({
    where: { id: vehicleId, schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
}

export async function archiveTransportRoute({ schoolId, routeId }: { schoolId: string; routeId: string }) {
  return db.transportRoute.updateMany({
    where: { id: routeId, schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
}
