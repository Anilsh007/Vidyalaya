export const DOCUMENT_OWNER_TYPES = {
  SCHOOL: "SCHOOL",
  STUDENT: "STUDENT",
  STAFF: "STAFF",
  USER: "USER"
} as const;

export const NOTICE_AUDIENCE_TYPES = {
  ALL: "ALL",
  ROLE: "ROLE",
  STAFF: "STAFF",
  STUDENTS: "STUDENTS",
  PARENTS: "PARENTS",
  CLASS: "CLASS",
  SECTION: "SECTION"
} as const;

export const FEE_PAYMENT_MODES = {
  CASH: "CASH",
  UPI: "UPI",
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  CHEQUE: "CHEQUE",
  OTHER: "OTHER"
} as const;

export const ATTENDANCE_STATUSES = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  LEAVE: "LEAVE",
  HALF_DAY: "HALF_DAY"
} as const;

export const FEE_PAYMENT_MODE_OPTIONS = [
  FEE_PAYMENT_MODES.CASH,
  FEE_PAYMENT_MODES.UPI,
  FEE_PAYMENT_MODES.CARD,
  FEE_PAYMENT_MODES.BANK_TRANSFER,
  FEE_PAYMENT_MODES.CHEQUE,
  FEE_PAYMENT_MODES.OTHER
] as const;

export type ClientDocumentOwnerType = (typeof DOCUMENT_OWNER_TYPES)[keyof typeof DOCUMENT_OWNER_TYPES];
export type ClientNoticeAudienceType = (typeof NOTICE_AUDIENCE_TYPES)[keyof typeof NOTICE_AUDIENCE_TYPES];
export type ClientFeePaymentMode = (typeof FEE_PAYMENT_MODES)[keyof typeof FEE_PAYMENT_MODES];
export type ClientAttendanceStatus = (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];
