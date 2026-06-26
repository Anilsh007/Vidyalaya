# Production Architecture

## Recommended deployment model

For this School ERP, the best production model is:

- one school
- one deployment
- one PostgreSQL database
- one local server or office computer
- optional remote access through Cloudflare Tunnel or VPN

This keeps each school's data isolated and makes operations simpler.

## Normal operation

During normal school days:

- the app runs on the school server
- office and staff devices access it over LAN
- the database stays inside the school deployment

## WFH or emergency operation

During WFH, lockdown, or remote-only periods:

- the same server continues running inside the school
- remote access is enabled through Cloudflare Tunnel or VPN
- staff log in with normal credentials from home
- role-based permissions still apply

## Failure planning

To avoid a single-machine risk, keep these in place:

- UPS or inverter backup for the server
- scheduled database backups
- periodic backup copy to an external drive or second machine
- restore instructions tested in advance
- optional standby machine for fast recovery

## Recommended access policy

- default mode: LAN only
- remote mode: enable only when needed
- admin access: restricted
- school-wide credentials: never share
- use named user accounts for auditability

## Recommended ops checklist

1. Daily database backup
2. Weekly restore test on a spare machine
3. Monthly operating system updates
4. Strong passwords for all staff accounts
5. Separate principal/admin accounts
6. Remote access enabled only through approved secure channel

