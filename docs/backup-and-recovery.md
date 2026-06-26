# Backup and Recovery

## What should be backed up

- PostgreSQL database
- uploaded files or documents
- `.env` file
- optional Cloudflare Tunnel config

## Included scripts

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/backup-volume.sh`

## Daily backup recommendation

Run `scripts/backup-db.sh` once every day on the school server.

## Weekly practice

Do one restore test on another machine or temporary database. Backups are only trustworthy when restore has been tested.

## Windows note

If the school server is Windows-based and Bash is not available, the same commands can be run through Git Bash, WSL, or adapted into `.bat` or PowerShell scripts later.

