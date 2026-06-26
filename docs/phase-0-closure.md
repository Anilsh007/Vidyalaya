# Phase 1 Foundation Closure

## Objective

Phase 1 is the foundation phase for this School ERP. Its goal is not full ERP functionality. Its goal is to ensure the product has a stable base for later modules.

## Included in Phase 1

- Next.js App Router setup
- TypeScript and Tailwind configuration
- Prisma schema for core ERP entities
- Authentication foundation
- Signed sessions
- Protected dashboard routing
- Dashboard shell
- Seed data path
- Self-hosting docs
- Backup and remote-access starter files

## Closure criteria

Mark Phase 1 complete only when these pass on the target machine:

1. Prisma generate
2. Prisma migrate
3. Prisma seed
4. App boot
5. Login
6. Dashboard load
7. Logout
8. Lint
9. Typecheck
10. Production build

## Notes

- If port `3000` is busy, use the actual port shown by Next.js.
- On Windows, PostgreSQL service availability matters more than whether pgAdmin itself is open.
- Remote access and backup files are included in starter form; their live deployment should be tested school by school.
