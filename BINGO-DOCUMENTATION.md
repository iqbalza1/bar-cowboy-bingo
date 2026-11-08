# Bar Cowboy Bingo — User and Deployment Guide

## Overview

Bar Cowboy Bingo is an English-language 75-ball bingo caller for a bar. The host controls the game in a browser while visitors mark paper cards. A separate TV page shows the current number and called-number board. Players need no phones or accounts.

This guide covers the original app and the automatic-calling, speech, and display changes subsequently supplied for the VPS. Those additions were made on the VPS; their presence in the current repository has not been independently checked. They are not automatically included in the original local source.

## Addresses

| Purpose | Configured address |
| --- | --- |
| Host controls | http://srv1953947.hstgr.cloud:3000/ |
| TV display | http://srv1953947.hstgr.cloud:3000/tv |
| Read-only game data (JSON) | http://srv1953947.hstgr.cloud:3000/api/state |

These addresses reflect configuration, not a current availability check. `127.0.0.1` on your laptop refers to the laptop, not the VPS, unless a tunnel is configured.

## Cards and rules

Each card has 25 numbers in a 5×5 grid, with **no free centre**. Column ranges are B: 1–15, I: 16–30, N: 31–45, G: 46–60, O: 61–75.

Horizontal rows, vertical columns, and either complete diagonal count as lines. Two distinct lines may intersect. A full card requires all 25 numbers.

The original game progresses through **one line → two lines → full card**. The host verifies claims manually against the called-number board. One winner entry is recorded per stage; settle simultaneous claims before recording.

**Hiding One line and Two lines with CSS only changes their visibility.** The game still requires those stages to be recorded before the full-card stage. Full-card-only rules require server and frontend changes.

## Host operating guide

### Prepare the event

1. Give visitors compatible paper cards and explain prizes and rules.
2. Open the host portal and sign in using the configured password.
3. Open the TV display in a separate browser window.
4. Confirm both screens show matching calls and a Live connection indicator.
5. Test the calling interval and audio before starting a real game.
6. Select Start a new game when ready. This clears current calls and winner records.

### Automatic calling

The supplied frontend addition provides an interval of 3–120 whole seconds; default 10. Click Start automatic calling. The first number is drawn after that interval. Stop automatic calling halts it. Pause, winner-recording, and new-game controls also stop the supplied timer; resuming the game does not restart the timer automatically.

Enable automatic calling in **one host tab only**. The timer runs in that browser, not the server. Keep the host page open and laptop awake. Browsers can delay background timers. Refreshing or closing the page stops automatic calling. Calls stop when all numbers are drawn or all original prize stages are recorded. Hiding the manual draw button does not prevent automatic calls.

### English speech

Click Enable English announcements on the host screen after each reload. New calls are spoken as “Number forty”, without a letter. Only the host browser speaks; check its volume and speaker output, including HDMI routing.

Speech uses browser speech synthesis, preferring an English UK voice and then another English voice if available. Voice quality and availability depend on the browser and operating system. Use one speech-enabled host tab. Historical calls are not read on activation, and calls missed during a disconnection are not replayed individually.

### Verify a claim

1. Stop automatic calling and pause.
2. Compare the visitor's paper card with called numbers.
3. Enter an optional card identifier and record the verified winner for the current stage.
4. Resume and restart automatic calling if another prize remains.

### One laptop with a TV

Connect HDMI, press Windows + P, and select Extend. Keep host controls on the laptop. Move the separate TV browser window to the TV and select Full screen. Mirroring would show the host controls to visitors. The TV normally updates within about two seconds.

## Printing cards

Use existing cards or generate 1–100 three-card strips. Each strip contains all 75 numbers exactly once across its three cards. Different strips can share numbers. Each card has a batch/card identifier, but card contents are not retained for automatic verification.

Choose Print / Save PDF and test one A4 sheet first. Save a PDF to preserve a batch; generating again creates new cards. Commercial ticket identifiers are not imported.

## Source files

| File | Purpose |
| --- | --- |
| `server.mjs` | HTTP server, sessions, game endpoints, saved state |
| `game.mjs` | Random draws, new games, paper-strip generation |
| `public/index.html` | Host and TV page structure |
| `public/app.js` | UI, polling, controls, optional timer and speech |
| `public/style.css` | Theme, visibility, responsive layout, printing |
| `test/game.test.mjs` | Core draw and card-generation tests |
| `Dockerfile` | Container image definition |
| `compose.yaml` | Service, environment, ports and persistent volume |
| `.env.example` | Password configuration template |

The theme uses dark green, gold, serif headings, and Bar Cowboy branding. Number-only calls are controlled by `const label=n=>n?String(n):'—';` in `public/app.js`; preserve the separate `stages` declaration when editing it.

## Installation and configuration

Requires Node.js 22+ or Docker Engine with Compose. No third-party runtime packages are required.

```bash
git clone git@github.com:iqbalza1/bar-cowboy-bingo.git
cd bar-cowboy-bingo
cp -n .env.example .env
chmod 600 .env
nano .env
```

Set HOST_PASSWORD to a unique password of at least 12 characters. Never commit `.env` or private SSH keys.

| Environment variable | Purpose |
| --- | --- |
| HOST_PASSWORD | Required host password |
| PORT | Server port; default 3000 |
| BIND_ADDRESS | Direct default 127.0.0.1; Docker sets 0.0.0.0 |
| DATA_DIR | State directory; default data beside server source |
| COOKIE_SECURE | Set exactly true for HTTPS |

Start on the VPS from the folder containing compose.yaml:

```bash
sudo docker compose up -d --build
sudo docker compose logs --tail=50
curl -i http://127.0.0.1:3000/api/state
```

A 200 response confirms the server responds; it does not test all features.

For local PowerShell execution:

```powershell
$env:HOST_PASSWORD='replace-with-a-long-unique-password'
npm start
```

Open http://localhost:3000/. Run `npm test` from the source folder for core tests.

### HTTPS and direct HTTP

Recommended: bind the Compose port to `127.0.0.1:3000:3000`, enable COOKIE_SECURE, and use an HTTPS reverse proxy forwarding to http://127.0.0.1:3000. Preserve existing websites. Add login rate limiting at the proxy; it is not built into the supplied server.

The existing direct HTTP setup uses `3000:3000`, COOKIE_SECURE set to false, and an inbound TCP 3000 firewall rule. HTTP does not encrypt passwords or sessions. Use HTTPS for regular operation. Environment or port changes require container recreation.

## Frontend updates without rebuilding

Edit source files outside Docker, then copy only changed files:

```bash
cd ~/bar-cowboy-bingo
sudo docker compose cp public/app.js bingo:/app/public/app.js
sudo docker compose cp public/style.css bingo:/app/public/style.css
sudo docker compose cp public/index.html bingo:/app/public/index.html
```

Hard-refresh both pages with Ctrl+Shift+R. Re-enable the timer and speech after refreshing. No server restart is required for these files.

Container-only edits disappear on recreation. Keep the source edits, commit them, and rebuild between games. Server-code changes require a restart or rebuilt container.

## GitHub and future deployment

The configured VPS write key is selected with:

```bash
git config core.sshCommand "ssh -i /root/.ssh/bar_cowboy_write -o IdentitiesOnly=yes"
```

Review changes, stage specific files, commit, then push. For this documentation:

```bash
git status
git diff -- BINGO-DOCUMENTATION.md
git add BINGO-DOCUMENTATION.md
git commit -m "Add Bingo user and deployment documentation"
git push origin main
```

A deploy key must have write access to push. Keep private keys on the VPS. A failed push does not erase a local commit; fix authentication and retry without committing again.

To deploy updates already on GitHub, use a clean working tree and run between games:

```bash
git pull --ff-only
sudo docker compose up -d --build
```

Preserve uncommitted changes before pulling. Documentation-only changes need no Docker rebuild.

## Persistence and backups

The Compose named volume mounts at `/app/data`; game state is in `/app/data/game.json`. Rebuilding preserves it. **Do not run docker compose down -v unless you intend to delete saved game data.** Sessions are held in memory, expire after 12 hours, and clear on server restart.

Stop calling before copying a backup:

```bash
mkdir -p /root/bingo-backups
sudo docker compose cp bingo:/app/data/game.json "/root/bingo-backups/game-$(date +%Y%m%d-%H%M%S).json"
```

Keep backups outside the repository and copy them to another secure location. For recovery, stop the service, copy the selected backup into the existing container at `/app/data/game.json`, start the service, and verify the board before resuming.

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| No configuration file provided | Run Compose from the folder containing compose.yaml. |
| nano not found in /app/public | Exit Docker and edit the source on the VPS. |
| Old letters or stages still visible | Copy the changed frontend file into Docker and hard-refresh both pages. Use curl against /app.js or /style.css to inspect the served version. |
| stages is not defined | Restore `const stages=['One line','Two lines','Full card'];`. |
| Login does not persist on HTTP | Match COOKIE_SECURE to HTTP/HTTPS and recreate the container. |
| Connection lost | Stop calling, check network and container logs; the board may be stale. |
| Calls too fast or duplicated | Stop automatic calling in all tabs and enable it in one host tab only. |
| No announcements | Click Enable, check audio routing and English voices; try another browser. |
| Full card says Up next | Hidden stages still exist in server prize progression. |
| Git Permission denied (publickey) | Check the configured SSH key and its GitHub registration. |
| Git denied to deploy key | Confirm the matching key has write access to this repository. |
| Git key already in use | Register a dedicated new key rather than reusing a key assigned elsewhere. |

## Verification and limitations

Before a live event, test host/TV sync, pause/resume, automatic calling, audio through bar speakers, manual winner recording, printing, refresh/restart recovery, and network interruption.

The original Dockerfile does not copy test files. A Docker test run may discover zero tests. Add `COPY --chown=node:node test ./test` to the Dockerfile before building a test-capable image, or run npm test directly from the source folder. Zero discovered tests does not verify the game.

The supplied tests cover core draws and paper-strip generation, not all browser, timer, speech, or login behaviour. Full acceptance testing has not been independently confirmed. Earlier VPS output confirmed a responding API and a successful GitHub push.

Current scope: one shared game and one server process. No player portal, automatic paper-card validation, game archive, multi-bar isolation, or server-managed timer ownership. Public state includes winner labels; prefer card identifiers over personal information.
