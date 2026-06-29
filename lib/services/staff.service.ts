import { Gender } from "@prisma/client";

import { db } from "@/lib/db";

type StaffListFilters = {
  schoolId: string;
  query?: string;
  department?: string;
  staffType?: string;
  status?: string;
  sort?: string;
};

type SaveStaffInput = {
  schoolId: string;
  academicYearId: string;
  id?: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department?: string;
  qualification?: string;
  joiningDate: string;
  phone?: string;
  email?: string;
  gender?: string;
  salaryAmount?: string | number;
  isTeachingStaff: string;
};

export async function getStaffPageData(filters: StaffListFilters) {
  const query = filters.query?.trim() ?? "";
  const department = filters.department ?? "";
  const staffType = filters.staffType ?? "";
  const status = filters.status ?? "active";
  const sort = filters.sort ?? "name-asc";

  const [departments, staff] = await Promise.all([
    db.staff.findMany({
      where: {
        schoolId: filters.schoolId,
        department: { not: null }
      },
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" }
    }),
    db.staff.findMany({
      where: {
        schoolId: filters.schoolId,
        ...(status === "archived" ? { isArchived: true } : status === "all" ? {} : { isArchived: false }),
        ...(department ? { department } : {}),
        ...(staffType === "teaching" ? { isTeachingStaff: true } : {}),
        ...(staffType === "non-teaching" ? { isTeachingStaff: false } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { employeeCode: { contains: query, mode: "insensitive" } },
                { designation: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        user: {
          include: {
            roles: { include: { role: true } }
          }
        }
      },
      orderBy:
        sort === "recent"
          ? { createdAt: "desc" }
          : sort === "employee-asc"
            ? { employeeCode: "asc" }
            : { fullName: "asc" }
    })
  ]);

  return { departments, staff };
}

export async function saveStaffRecord(input: SaveStaffInput) {
  const duplicate = await db.staff.findFirst({
    where: {
      schoolId: input.schoolId,
      employeeCode: input.employeeCode,
      ...(input.id ? { id: { not: input.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    throw new Error("Employee code already exists in this school.");
  }

  const staffData = {
    academicYearId: input.academicYearId,
    employeeCode: input.employeeCode,
    fullName: input.fullName,
    designation: input.designation,
    department: input.department || null,
    qualification: input.qualification || null,
    joiningDate: new Date(`${input.joiningDate}T00:00:00.000Z`),
    phone: input.phone || null,
    email: input.email || null,
    gender: input.gender ? (input.gender as Gender) : null,
    salaryAmount:
      input.salaryAmount === "" || input.salaryAmount === undefined ? null : Number(input.salaryAmount),
    isTeachingStaff: input.isTeachingStaff === "yes"
  };

  if (input.id) {
    const existing = await db.staff.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Staff record not found.");
    }

    return db.staff.update({
      where: { id: input.id },
      data: staffData
    });
  }

  return db.staff.create({
    data: {
      schoolId: input.schoolId,
      ...staffData
    }
  });
}

export async function archiveStaffRecord(input: { schoolId: string; staffId: string }) {
  const staff = await db.staff.findFirst({
    where: { id: input.staffId, schoolId: input.schoolId },
    select: { id: true, fullName: true, employeeCode: true }
  });

  if (!staff) {
    return null;
  }

  await db.staff.update({
    where: { id: staff.id },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  });

  return staff;
}
