# Development and Windows self-hosting

Use Node 22 LTS (22.12+) and pinned pnpm 10.18.3 on both macOS and Windows. No shell-specific application scripts. Do not copy macOS node_modules to Windows; install again using the lockfile.

## Static website: available now

Run `pnpm build:static` from `hex-mahjong/`. This generates the sibling `hex-mahjong-play/` directory with relative asset URLs, a bundled engine worker and all tile artwork. The parent `games.html` links to it. Upload the modified `games.html` and the entire generated directory through the university site’s usual manual publishing workflow. No Node process, WebSocket endpoint, tunnel, or change to `config.json` is needed for bot play. Keep JavaScript worker files served with a JavaScript MIME type. Preview using HTTP/HTTPS rather than opening `index.html` as a `file://` URL.

The public build disables **Create a friends room (not yet available)** and hides joining, invitations and reconnection. Solo sessions stay in browser memory and end on leave/refresh. The standard server-enabled build below remains available for local multiplayer testing and future Windows hosting. Publishing a new static build does not set up or enable that server.

## Windows production

1. Copy/clone the repository onto your Windows PC. Run the README install, build, typecheck and test commands in PowerShell. Git stays at the surrounding repository root.
2. Decide the frontend origin and public tunnel endpoint. Edit `apps/web/public/config.json` to the HTTPS game-server URL and run `pnpm build`. This file is copied into dist; alternatively update `apps/web/dist/config.json` after building, with no JS rebuild. Never commit an ephemeral Quick Tunnel hostname. Config is public and contains no credentials.
3. In PowerShell, set the exact frontend origins, comma separated, and port:

```powershell
$env:WEB_ORIGINS = 'https://game.example.com,https://university.example.edu'
$env:PORT = '2567'
pnpm start
```

Replace example hosts with your real origins (scheme + host + optional port, no path/trailing slash). For macOS development defaults allow http://localhost:5173; set environment variables in your shell when needed. For LAN phones set config to the PC's LAN address and allow the actual frontend LAN origin; localhost on a phone means the phone itself.

4. The Node server optionally serves `apps/web/dist` itself at its root. `/health` is a minimal health endpoint. It listens on the configured port; use Windows firewall to restrict direct access as appropriate and let the tunnel connect locally.
5. With cloudflared installed, test `cloudflared tunnel --url http://localhost:2567`. Cloudflare supplies public HTTPS and WebSocket forwarding. Update runtime config and WEB_ORIGINS with the resulting origin, then restart Node if origins changed. University hosting can instead serve `apps/web/dist` at a separate URL; its origin must be allowed. In that case set Vite `base` to the actual subdirectory (e.g. `vite build --base=/hex/`) and keep config.json next to index.html. Invitations retain this frontend path and contain only a room query parameter. Configure the university server to serve JSON with a correct MIME type and avoid stale caching of config.json.
6. For reliable sessions prefer a named tunnel with a stable hostname/domain you control. Quick Tunnels are testing tools: temporary/random hostnames, no SLA, currently a 200 concurrent in-flight request limit and no SSE support. This app uses WebSockets rather than SSE. A named tunnel may require a domain; domain registration can cost money. Quick Tunnel is the no-domain prototype path, not a persistence guarantee.
7. Use Windows Task Scheduler or a service manager for Node and cloudflared after manual validation. Configure working directory, environment, startup/restart and log rotation explicitly. Disable sleep while hosting. TLS is terminated at Cloudflare; never load insecure HTTP/WS endpoints from an HTTPS frontend. No router port forwarding is needed for the tunnel.

Server crashes/restarts destroy room memory. Browser refresh may reclaim a seat within 30 seconds using the session token, but cannot recover a restarted server. No publishing, domain registration or Windows services are set up by this scaffold.

Primary references: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/), [WebSockets](https://developers.cloudflare.com/network/websockets/), [Colyseus 0.16 WS transport](https://0-16-x.docs.colyseus.io/server/transport/ws), [Vite deployment](https://vite.dev/guide/static-deploy.html).
