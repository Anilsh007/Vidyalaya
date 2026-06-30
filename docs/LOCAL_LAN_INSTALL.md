# Local and LAN Installation Guide

Vidyalaya is designed to run as a school-owned ERP on a single office PC, a local server, or a LAN-accessible machine inside the campus network. It does not require public hosting.

## 1. Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer
- Windows, Linux, or a local server that remains available during school hours
- 4 GB RAM minimum recommended
- Stable LAN or Wi-Fi if multiple staff devices will connect

Optional:

- a fixed LAN IP or hostname such as `school-server`
- HTTPS with a local certificate or reverse proxy if the school wants encrypted browser access

## 2. Environment Setup

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Required values:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `SESSION_SECRET`
- `APP_URL`
- `DEFAULT_ADMIN_PASSWORD`

Example single-machine install:

```env
APP_URL="http://localhost:3000"
```

Example LAN install by IP:

```env
APP_URL="http://192.168.1.10:3000"
```

Example LAN install by hostname:

```env
APP_URL="http://school-server:3000"
```

Example optional HTTPS install:

```env
APP_URL="https://school.example.local"
```

Important session note:

- if `APP_URL` starts with `http://`, the session cookie uses `Secure=false`
- if `APP_URL` starts with `https://`, the session cookie uses `Secure=true`
- cookie remains `HttpOnly=true`, `SameSite=Lax`, and host-only in both cases

## 3. Database Setup

Generate Prisma client:

```powershell
.\node_modules\.bin\prisma.cmd generate
```

Apply migrations for a local development install:

```powershell
.\node_modules\.bin\prisma.cmd migrate dev
```

Apply migrations for an already prepared production-style install:

```powershell
.\node_modules\.bin\prisma.cmd migrate deploy
```

Run the production-safe seed:

```powershell
.\node_modules\.bin\tsx.cmd prisma/seed.ts
```

Seed policy:

- roles, permissions, role-permission mappings, and bootstrap admin are seeded
- fake students, staff, attendance, fees, exams, notices, and operational records are not seeded

## 4. Start the App

Development mode:

```powershell
.\node_modules\.bin\next.cmd dev
```

Production build:

```powershell
.\node_modules\.bin\next.cmd build
```

Production start on local machine:

```powershell
.\node_modules\.bin\next.cmd start
```

Production start for LAN access:

```powershell
.\node_modules\.bin\next.cmd start -H 0.0.0.0 -p 3000
```

## 5. Employee Access Over LAN

If the ERP runs on the school server PC:

- find the server machine IP, for example `192.168.1.10`
- ensure `APP_URL` matches that host, for example `http://192.168.1.10:3000`
- other employees should open `http://192.168.1.10:3000`

Important:

- staff should not use `localhost` on their own machines unless the ERP is running on that same machine
- if the server IP changes frequently, use a stable hostname if the LAN supports it

## 6. Backup and Restore Recommendation

At minimum, back up:

- the PostgreSQL database
- the `.env` file in a secure admin location
- any uploaded file storage directories if document storage is enabled

Basic PostgreSQL backup example:

```powershell
pg_dump -h localhost -U postgres -d school_erp > school_erp_backup.sql
```

Basic restore example:

```powershell
psql -h localhost -U postgres -d school_erp < school_erp_backup.sql
```

## 7. Troubleshooting

### Prisma generate fails with Windows DLL lock

```powershell
taskkill /F /IM node.exe
.\node_modules\.bin\prisma.cmd generate
```

### Login succeeds but session does not persist

Check:

- `APP_URL` matches the actual URL used in the browser
- HTTP installs use `http://...`
- HTTPS installs use `https://...`

### Database connection failed

Check:

- PostgreSQL service is running
- `DATABASE_URL` is correct
- firewall is not blocking the database on the server machine

### Migration failed

Re-run:

```powershell
.\node_modules\.bin\prisma.cmd validate
.\node_modules\.bin\prisma.cmd migrate deploy
```

If the install is a local development setup, use `migrate dev` instead.
