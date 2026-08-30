# Hosting the PvP WebSocket server

The frontend deploys to Netlify (static only), so the PvP WebSocket server must
be hosted separately. It listens on `process.env.PORT || 3002` and speaks the
`{ "type": "...", "payload": {...} }` protocol defined in `ws-server.js`.

## Local dev

```bash
cd backend
npm install
npm run pvp      # starts ws-server.js on ws://localhost:3002
npx serve -s ../frontend/build -l 5000   # serve the built frontend
```

The frontend auto-detects: if the page is served over `https`, it uses
`wss://pokemon-pvp-server.up.railway.app` (the placeholder below); otherwise it
uses `ws://<host>:3002`. You can override with an env var at build time:

```bash
REACT_APP_WS_URL=wss://your-server.example.com npm run build
```

## Deploy to Railway (option A, recommended)

1. Create a new Railway project and deploy this repo.
2. Set the start command to `cd backend && npm run pvp`.
3. Railway gives you a public URL like `https://your-app.up.railway.app`. It
   auto-proxies WebSockets, so the client should use `wss://your-app.up.railway.app`.
4. Point the frontend at it:
   ```bash
   REACT_APP_WS_URL=wss://your-app.up.railway.app npm run build
   ```
5. Deploy the fresh build to Netlify.

## Deploy to Render (option B)

1. New "Web Service" from this repo.
2. Root directory: `backend`; Build command: `npm install`; Start command:
   `npm run pvp`.
3. Render supports WebSockets over its HTTPS URL by default, so use
   `wss://your-app.onrender.com`.
4. Build + deploy the frontend with the same `REACT_APP_WS_URL` override.

## Deploy to a plain VPS with Caddy/Nginx

1. Run `npm run pvp` under a process manager (pm2/systemd) on port 3002.
2. Use Caddy to terminate TLS and proxy to the ws server:
   ```
   pvp.yourdomain.com {
     reverse_proxy 127.0.0.1:3002
   }
   ```
   Caddy auto-proxies WS and handles HTTPS, so the client uses
   `wss://pvp.yourdomain.com`.

## Env vars

| Var             | Used by      | Purpose                          |
| --------------- | ------------ | -------------------------------- |
| `PORT`          | ws-server.js | Listen port (default 3002)       |
| `REACT_APP_WS_URL` | frontend  | Override the wss:// URL at build |

## Notes

- The server keeps no persistent state; rooms live in memory and clear when all
  players leave. Restarting the server drops active rooms.
- If you change the server, restart it; if you change the frontend WS URL,
  rebuild the frontend (env vars are baked in at build time).
