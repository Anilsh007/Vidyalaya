# Vidyalaya Self-Hosted Setup

## Documentation map

- Local and LAN installation: [docs/LOCAL_LAN_INSTALL.md](docs/LOCAL_LAN_INSTALL.md)
- Production and pilot checklist: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)
- Full engineering plan and phase notes: [docs/ERP_DEVELOPMENT_PLAN.md](docs/ERP_DEVELOPMENT_PLAN.md)

Seed policy reminder:

- bootstrap roles, permissions, and admin are seeded
- fake ERP business data is not seeded by default

Vidyalaya is designed to run on the school's own computer or server. It does not require paid hosting. A school can use it on one office PC, on a small local server, or across the school LAN.

This guide is written for non-technical school setup where possible.

## What this setup includes

- `Dockerfile` for the app
- `docker-compose.yml` for the app and PostgreSQL
- persistent PostgreSQL data volume
- persistent upload/storage volume
- environment variable template in `.env.example`
- migration and seed commands
- backup and restore scripts
- LAN access guidance
- optional Cloudflare Tunnel guidance for outside access

## Recommended installation method

For most schools, use Docker.

Why:

- fewer manual steps
- PostgreSQL runs with the app
- data stays in Docker volumes
- easier restart after power failure or maintenance
- PostgreSQL does not need to be open to the whole school network by default

## Files you will use

- `.env.example`
- `docker-compose.yml`
- `docker-compose.tunnel.yml`
- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/backup-volume.sh`
- `scripts/restore-volume.sh`

## Before you start

You need:

- a school computer or server that stays on during working hours
- Docker and Docker Compose installed
- at least 4 GB RAM recommended
- wired LAN recommended if many devices will use the ERP

Optional:

- `cloudflared` or a Cloudflare account if the school wants controlled access from outside the campus network

## Step 1: Prepare the environment file

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and change these values before real use:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_SCHOOL_NAME`
- `APP_URL`

Example for one-computer use:

```env
APP_URL="http://localhost:3000"
```

Example for LAN use:

```env
APP_URL="http://192.168.1.50:3000"
```

Example for LAN hostname use:

```env
APP_URL="http://school-server:3000"
```

Optional HTTPS deployment:

```env
APP_URL="https://your-school-domain-or-hostname"
```

Session cookie behavior depends on the `APP_URL` protocol:

- if `APP_URL` starts with `http://`, session cookie `Secure=false`
- if `APP_URL` starts with `https://`, session cookie `Secure=true`
- `NODE_ENV=production` is valid for optimized local/LAN builds and does not force secure cookies by itself

This matters because Vidyalaya is a downloadable local/LAN ERP, not only a public hosted SaaS app.

Do not share `.env` with staff. It contains private configuration values.

## Step 2: Start the ERP with Docker

Run:

```bash
docker compose up --build -d
```

What this does:

- starts PostgreSQL
- builds the app
- starts the ERP service
- runs database migrations on app startup by default

## Step 3: Seed the bootstrap system data

Run this once:

```bash
docker compose exec app npm run prisma:seed
```

This creates:

- the default school
- the current academic year
- roles and permissions
- role-permission mappings
- one bootstrap administrator account

Important:

- this seed does not create fake students, staff, fees, attendance, exams, or other business records
- if the ERP is being prepared for real school use, change the bootstrap administrator password immediately after first sign-in

## Step 4: Open the ERP

On the same computer:

```text
http://localhost:3000
```

If `APP_URL` is set to the server IP, open that address instead.

Cookie notes for local/LAN installs:

- `HttpOnly=true`
- `SameSite=Lax`
- `Path=/`
- `Secure=false` on plain HTTP installs like `localhost`, LAN IPs, or server hostnames
- `Secure=true` only when `APP_URL` uses HTTPS

## Bootstrap login credentials

These are available after the seed command runs.

Default bootstrap password:

```text
ChangeMe123!
```

Bootstrap account values can be overridden with:

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

Bootstrap account:

| Role | Email |
| --- | --- |
| Super Admin | `admin@school.local` |

## Simple day-to-day commands

Start the ERP:

```bash
docker compose up -d
```

Stop the ERP:

```bash
docker compose down
```

Restart after config changes:

```bash
docker compose up -d --build
```

View app logs:

```bash
docker compose logs -f app
```

View database logs:

```bash
docker compose logs -f db
```

## Production build and database commands

Production build command:

```bash
npm run build:prod
```

Local migration command:

```bash
npm run prisma:migrate -- --name init
```

Docker-safe migration command:

```bash
docker compose exec app npm run prisma:migrate:deploy
```

Seed command:

```bash
npm run prisma:seed
```

Docker seed command:

```bash
docker compose exec app npm run prisma:seed
```

## PostgreSQL and storage volumes

This setup keeps data in Docker volumes:

- `school_erp_postgres_data`
- `school_erp_uploads_data`

That means school data remains even if the app container is recreated.

Note:

- PostgreSQL is bound to `127.0.0.1` by default in Docker Compose, which means it is available on the server machine but not exposed to the whole LAN by default

## Backup

Make scripts executable once:

```bash
chmod +x scripts/*.sh
```

### Database backup

```bash
./scripts/backup-db.sh
```

This creates a compressed SQL backup in `./backups`.

### Full Docker volume backup

```bash
./scripts/backup-volume.sh
```

This creates:

- PostgreSQL volume backup
- upload/storage volume backup

Recommended school practice:

- take a database backup every day
- copy backups to an external drive or another office machine

## Restore

### Restore the database

```bash
./scripts/restore-db.sh ./backups/school-erp-YYYYMMDD-HHMMSS.sql.gz
```

### Restore the PostgreSQL Docker volume

```bash
./scripts/restore-volume.sh postgres ./backups/postgres-data-YYYYMMDD-HHMMSS.tar.gz
```

### Restore the uploads/storage Docker volume

```bash
./scripts/restore-volume.sh uploads ./backups/uploads-data-YYYYMMDD-HHMMSS.tar.gz
```

Important:

- stop app usage before restore
- restore from the newest good backup only after confirming the current issue

## LAN access guide

To let staff use the ERP from other devices in the school:

1. Find the IP address of the computer/server running the ERP
2. Set `APP_URL` in `.env` to that IP and port
3. Make sure port `3000` is allowed through the firewall
4. Restart the stack
5. Open the ERP from another device on the same network

Example:

```env
APP_URL="http://192.168.1.50:3000"
```

Hostname example:

```env
APP_URL="http://school-server:3000"
```

Staff can then use:

```text
http://192.168.1.50:3000
```

Best practice:

- use a fixed local IP for the school server
- keep the server on a UPS if power cuts are common
- prefer wired network for the server machine
- if the school uses plain HTTP on LAN, session cookies still work because Secure is disabled automatically for HTTP `APP_URL`

## Optional Cloudflare Tunnel guide

Cloudflare Tunnel is optional. The ERP works without it.

Use it only if the school wants access from outside the campus network.

### Quick temporary test

Run:

```bash
cloudflared tunnel --url http://localhost:3000
```

This gives a temporary public URL.

### Named tunnel with Docker

1. Create a free Cloudflare account
2. Create a tunnel in Cloudflare
3. Place the tunnel credentials JSON file in the `cloudflared/` folder
4. Copy the template:

```bash
cp cloudflared/config.yml.example cloudflared/config.yml
```

5. Edit:

- tunnel ID
- credentials file name
- hostname

6. Start app and tunnel:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
```

This still keeps the ERP on the school machine. Cloudflare Tunnel only provides secure outside access.

## Local development option

If a developer wants to run the app without Docker:

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Open:

```text
http://localhost:3000
```

## Troubleshooting

### The page does not open

Check:

- Docker is running
- `docker compose ps`
- port `3000` is not blocked
- `docker compose logs -f app`

### The database is not connecting

Check:

- `POSTGRES_PASSWORD` in `.env`
- `docker compose logs -f db`
- `docker compose exec app npm run prisma:migrate:deploy`
- if you changed ports manually, confirm PostgreSQL is still reachable from the app service

### Login is failing

Check:

- seed command was run
- correct admin email/password in `.env`
- browser is using the correct URL
- if the app is on plain HTTP LAN or localhost, confirm `APP_URL` also uses `http://` and not `https://`

### Other devices on the LAN cannot connect

Check:

- the server IP is correct
- firewall allows port `3000`
- the device is on the same network
- `APP_URL` was updated and the stack restarted

### After power cut or restart, the ERP is missing data

Check:

- the containers are using the named Docker volumes
- backups exist in `./backups`
- nobody accidentally removed Docker volumes

### Docker build fails

Check:

- internet access for package download in your own environment
- enough disk space
- Docker Compose logs

## Security notes

- Do not share `.env`
- Change bootstrap credentials before real school use
- Keep backups in a protected place
- Use Cloudflare Tunnel or HTTPS proxy if remote access is needed
- Do not expose the PostgreSQL port to the public internet
- On HTTP localhost/LAN installs, cookies remain `HttpOnly` and `SameSite=Lax`, but `Secure` is intentionally disabled so sessions can persist without HTTPS

## Final recommendation for a school

For a real school office:

1. Use Docker on one dedicated office computer or mini server
2. Set a fixed LAN IP
3. Back up daily
4. Change admin credentials before launch
5. Add Cloudflare Tunnel only if remote access is really needed
