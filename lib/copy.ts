export const APP_NAME = "Vidyalaya";

export const APP_DESCRIPTION =
  "Self-hosted school ERP dashboard for Indian schools with LAN-first deployment, role-based access, and optional tunnel access.";

export const APP_TAGLINE = "Operate academics, fees, and records from one local-first dashboard.";

export const LOGIN_COPY = {
  title: "School ERP sign in",
  subtitle:
    "Use your staff account to access the school dashboard on this computer or over the local network.",
  emailLabel: "Email address",
  passwordLabel: "Password",
  submitLabel: "Sign in",
  helper:
    "This starter uses secure password hashing, signed sessions, protected routes, and role checks.",
  success: "Signed in successfully.",
  error: "We could not verify those credentials."
} as const;
