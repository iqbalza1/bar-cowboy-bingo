# Bar Cowboy Bingo

A self-hosted English bingo caller for one bar. Host controls at `/`; public read-only TV display at `/tv`. Players use paper cards. No player accounts or phones required.

## Rules and operation

75 numbers, B 1–15, I 16–30, N 31–45, G 46–60, O 61–75. All 25 squares contain numbers; no free centre. Any row, column or either full diagonal is a line. Two distinct lines may intersect. Stages: one line → two lines → all 25 numbers. The host checks the paper manually against the called board and records the verified winner to advance the stage. One winner entry per stage in this version; resolve simultaneous claims at the bar before recording. Drawing ends once all prizes are awarded or all balls drawn.

The host clicks each draw. Numbers use Node's cryptographic random generator without repeats. Multiple host screens use revision checks to reject stale actions. The TV polls every 1.5 seconds. State persists on the server across refreshes and restarts. An offline indicator means the board may be out of date. Pause before checking a claim. Starting a new game clears the previous game; no historical archive is provided.

Printing is optional: generate 1–100 strips, three cards per strip, all 75 numbers exactly once per strip, matching the reference structure. IDs identify the print batch and card, but are not stored for automatic verification. Reprint using the same open print dialog or save as PDF. Printing again generates a new random batch. Printed cards have no automatic winning validation.

## Local run

Install Node.js 22 or newer. No package installation or third-party dependencies needed.

PowerShell:

```powershell
$env:HOST_PASSWORD='use-a-long-unique-password'
npm start
```

Open http://localhost:3000 and sign in. Open `/tv` on another screen. Default binding is loopback; for trusted LAN testing set `BIND_ADDRESS=0.0.0.0`. Use HTTPS for internet access. `COOKIE_SECURE=true` is required behind HTTPS in production (omit for local HTTP).

Run automated rule tests: `npm test`.

## Hostinger VPS deployment (Docker + existing HTTPS reverse proxy)

1. Copy this entire folder to your Linux VPS, outside any public web directory.
2. Copy `.env.example` to `.env`, set a unique password of at least 12 characters, and restrict `.env` permissions to the server administrator.
3. With Docker Engine and Compose installed, run `docker compose up -d --build` in this folder.
4. Point your domain to the VPS. Configure your HTTPS reverse proxy to forward to `127.0.0.1:3000`. Keep port 3000 closed to external traffic. Do not overwrite an existing domain configuration.
5. Open `https://YOUR-DOMAIN/` for host controls and `https://YOUR-DOMAIN/tv` on the TV browser. Enter full-screen mode.

Example Nginx location inside your existing HTTPS server block:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Use your existing TLS certificate setup. Exact proxy/certificate commands depend on your VPS and existing sites. The compose file expects HTTPS and enables secure session cookies. Sessions expire after 12 hours and are cleared on server restart. TV state is publicly readable; avoid entering personal information in winner labels. Set login rate limiting on `/api/login` in your reverse proxy before public exposure.

Game data lives in the `bingo-data` Docker volume at `/app/data/game.json`. Back up the volume regularly. Run only one app instance; this version uses a single local state file rather than a shared database.

## Acceptance checks before first live event

- Sign in, draw, and confirm the TV on a second device updates.
- Refresh both screens and restart the app; confirm called numbers persist.
- Pause, record each manually verified prize, and confirm progression.
- Confirm no drawing after the full-card prize, and test new-game confirmation.
- Print one strip on A4 and confirm readable numbers and three complete cards.
- Test loss/recovery of the TV network connection.

## Verification status

Automated rule tests are included. The development machine blocked Node.js execution through Windows Application Control, so the runtime tests and browser/print checks have not yet been run. Run `npm test` and the acceptance checks on a permitted Node.js machine before a live event.
