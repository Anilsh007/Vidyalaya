import { z } from "zod";

export const hostelSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Hostel name is required."),
  code: z.string().trim().min(2, "Hostel code is required."),
  wardenName: z.string().trim().optional(),
  wardenPhone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  isActive: z.enum(["yes", "no"])
});

export const hostelRoomSchema = z.object({
  id: z.string().optional(),
  hostelId: z.string().min(1, "Select a hostel."),
  roomNumber: z.string().trim().min(1, "Room number is required."),
  floor: z.string().trim().optional(),
  roomType: z.string().trim().optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  monthlyFee: z
    .union([z.literal(""), z.coerce.number().min(0, "Monthly fee cannot be negative.")])
    .optional(),
  isActive: z.enum(["yes", "no"])
});

export const hostelAllocationSchema = z
  .object({
    id: z.string().optional(),
    studentId: z.string().min(1, "Select a student."),
    hostelId: z.string().min(1, "Select a hostel."),
    roomId: z.string().min(1, "Select a room."),
    bedNumber: z.string().trim().optional(),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "VACATED"]),
    monthlyFee: z
      .union([z.literal(""), z.coerce.number().min(0, "Monthly fee cannot be negative.")])
      .optional(),
    guardianConsent: z.enum(["yes", "no"]),
    remarks: z.string().trim().optional()
  })
  .refine((data) => !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date.",
    path: ["endDate"]
  });
