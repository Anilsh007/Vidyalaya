import { z } from "zod";

export const transportVehicleSchema = z.object({
  id: z.string().optional(),
  vehicleNumber: z.string().trim().min(2, "Vehicle number is required."),
  vehicleType: z.string().trim().min(2, "Vehicle type is required."),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  driverName: z.string().trim().optional(),
  driverPhone: z.string().trim().optional(),
  helperName: z.string().trim().optional(),
  insuranceValidUntil: z.string().trim().optional(),
  fitnessValidUntil: z.string().trim().optional(),
  isActive: z.enum(["yes", "no"])
});

export const transportRouteSchema = z.object({
  id: z.string().optional(),
  vehicleId: z.string().optional(),
  name: z.string().trim().min(2, "Route name is required."),
  code: z.string().trim().min(2, "Route code is required."),
  startPoint: z.string().trim().optional(),
  endPoint: z.string().trim().optional(),
  monthlyFee: z.union([z.literal(""), z.coerce.number().min(0, "Monthly fee cannot be negative.")]).optional(),
  isActive: z.enum(["yes", "no"])
});

export const transportStopSchema = z.object({
  id: z.string().optional(),
  routeId: z.string().min(1, "Select a route."),
  name: z.string().trim().min(2, "Stop name is required."),
  pickupTime: z.string().trim().optional(),
  dropTime: z.string().trim().optional(),
  stopOrder: z.coerce.number().int().min(0, "Stop order cannot be negative.")
});

export const transportAssignmentSchema = z
  .object({
    id: z.string().optional(),
    studentId: z.string().min(1, "Select a student."),
    routeId: z.string().min(1, "Select a route."),
    stopId: z.string().optional(),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
    monthlyFee: z.union([z.literal(""), z.coerce.number().min(0, "Monthly fee cannot be negative.")]).optional(),
    remarks: z.string().trim().optional()
  })
  .refine((data) => !data.endDate || new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date.",
    path: ["endDate"]
  });
