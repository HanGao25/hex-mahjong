# Hex Mahjong / 海克斯科技麻将

A four-seat Sichuan Mahjong + Hex cards project with its own Git repository and pnpm workspace. Nothing is published automatically.

**Current milestone: playable Hex Mahjong against three local bots.** Create a table, declare your missing suit and play complete rounds with scoring, settlement and a payment ledger. English/中文, phone layouts, invitations, 30-second reconnection, bot takeover, dealer rotation and score carryover for 8/16 rounds are supported. All nine Hex cards are enabled: choose one of two private offers after 定缺, then choose again at the first draw boundary with 16 or fewer wall tiles left. Cards reset each round.

The university website’s **Games → Hex Mahjong · Play with bots** entry opens the standalone browser version. It needs only static hosting; no Windows server or account is needed. Friend rooms are disabled there until hosting is ready. Run `pnpm build:static` to regenerate `../hex-mahjong-play/`, then upload that complete folder and the parent `games.html` through the usual website publishing process. Nothing uploads automatically. Refreshing or leaving the solo page ends its in-memory session.

On this Mac, double-click **Play Hex Mahjong.command** or open http://localhost:2567 when the server is running. See [LOCAL_PLAYTEST.md](docs/LOCAL_PLAYTEST.md) for controls, the local Node runtime and limitations.

## Development setup (macOS and Windows PowerShell)

For release and Windows update commands, see [UPDATING.md](docs/UPDATING.md).

Install Node.js 22 LTS (22.12+; verified with 22.23.3) and pnpm 10.18.3. With Corepack available: `corepack enable`, then `corepack prepare pnpm@10.18.3 --activate`. From the surrounding repository root:

```text
cd hex-mahjong
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm dev
```

Open http://localhost:5173. Server health: http://localhost:2567/health. `pnpm play` serves/opens the built local game; `pnpm start` runs the production server only. `pnpm test:unit` runs pure tests, `pnpm test:integration` runs real HTTP/WebSocket tests. `pnpm dev` builds dependencies before launching Vite and tsx; restart it after editing engine/shared packages because their compiled workspace exports require a rebuild. Do not start two servers on 2567.

## Architecture

- `apps/web`: React + Vite table, bilingual controls, private hand, a browser worker running the shared engine for solo practice, and a Colyseus client for server-hosted friend rooms. The React view requests actions and renders safe snapshots; the engine calculates legal moves and scores.
- `apps/server`: Colyseus room membership, validation, private envelopes, rate limiting, reconnection, server RNG, bot scheduling and session rounds.
- `packages/shared`: protocol types, settings validation, tile/RNG types and the single bilingual card catalogue.
- `packages/mahjong-engine`: pure hand evaluation, fan scoring, shanten/bot choices, tile identity, wall operations and authoritative round state machine.
- `packages/hextech-engine`: pure card offers, tier fallback, critical rolls, physical copies and wall-effect primitives. The round controller dispatches their triggers and applies the agreed rules.
- `docs`: confirmed rules, delegated defaults, protocol, playtest, testing and deployment.
- `scripts`: cross-platform development/local launchers; the `.command` file is an additional macOS convenience launcher.

Read [base rules](docs/GAME_RULES.md), [delegated defaults](docs/RULE_DEFAULTS.md), [architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md) and [deployment](docs/DEPLOYMENT.md). [OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) records the working agreement and confirmed card corrections rather than a growing approval checklist. [FILES.md](docs/FILES.md) inventories project source files.

Workspace exports point to compiled ESM; build before app type checks. Pure engines import no React, Colyseus, browser APIs or Node-only APIs. The server sends public table state plus only the recipient's private hand/legal actions. Rooms remain in memory and are lost at restart. Windows instructions are provided; checks have been executed on macOS, not Windows.
