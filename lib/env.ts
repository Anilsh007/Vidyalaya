import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  APP_URL: z.string().url(),
  APP_NAME: z.string().min(1).default("School ERP Dashboard"),
  SESSION_COOKIE_NAME: z.string().min(1).default("school_erp_session"),
  SESSION_SECRET: z.string().min(32),
  DEFAULT_SCHOOL_NAME: z.string().min(1).default("Springfield Public School"),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@school.local"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  APP_NAME: process.env.APP_NAME,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DEFAULT_SCHOOL_NAME: process.env.DEFAULT_SCHOOL_NAME,
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
  NODE_ENV: process.env.NODE_ENV
});

