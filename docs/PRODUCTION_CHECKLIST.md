# Production and Pilot Release Checklist

Use this checklist before handing the ERP to a school for local or LAN use.

## Environment

- `SESSION_SECRET` is strong and private
- `DATABASE_URL` is correct
- `DIRECT_DATABASE_URL` is correct
- `APP_URL` matches the actual machine URL staff will use
- bootstrap password is changed after first login
- `.env` is stored securely

## Database and Prisma

- Prisma migrations are applied
- Prisma client is generated
- production-safe seed is run
- no demo business data exists in the seed flow

## Build and Startup

- `next build` passed
- production start command works
- LAN start command tested if school uses multiple staff devices
- Windows firewall or endpoint rules allow the chosen app port when needed

## Security and Access

- login tested successfully
- logout tested successfully
- `/dashboard` opens for valid users
- forbidden routing does not loop
- RBAC roles and permissions verified
- teacher scope verified
- student own-data scope verified
- parent child-data scope verified
- hidden modules remain hidden

## Reports and Workflows

- reports page tested for admin
- export audit logs verified
- leave workflow verified
- expense workflow verified
- payroll workflow verified

## Data and Operations

- dashboard shows DB-backed values only
- no fake students, staff, fees, attendance, exams, notices, or reports
- backup plan is documented
- PostgreSQL backup has been tested at least once

## Module Status Review

- active modules reviewed as safe for pilot
- beta modules reviewed with school before use
- hidden modules remain unavailable until scoped and completed

## Optional HTTPS

- if the school wants HTTPS, reverse proxy or certificate setup is ready
- `APP_URL` is updated to `https://...`
- session cookie should then use `Secure=true`
