# WFH and Remote Access Plan

## Goal

Allow the ERP to remain self-hosted while still being accessible from outside the school during emergencies, holidays, or WFH periods.

## Option 1: Cloudflare Tunnel

Best when the school wants browser-based remote access without opening router ports directly.

Flow:

1. ERP runs locally on port `3000`
2. `cloudflared` creates an outbound tunnel from the school server
3. Staff visit the assigned domain in a browser
4. The request reaches the school server securely through the tunnel

## Option 2: VPN or Tailscale

Best when the school wants only approved devices to enter the private network first.

Flow:

1. Staff connect to the secure private network
2. They access the ERP using the LAN URL
3. The ERP behaves almost the same as inside the school

## Recommended policy

- Keep remote access disabled by default
- Enable it only when needed
- Use strong credentials
- Maintain audit logs
- Take a fresh backup before major remote-working periods

## Important limitation

If the school server is switched off, broken, or has no power, remote access will also fail. Tunnel access does not replace the need for server uptime and backups.

