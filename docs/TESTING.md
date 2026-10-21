# Testing

From `hex-mahjong`:

```text
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
```

`pnpm test:unit` runs pure package tests without sockets. `pnpm test:integration` runs real localhost Colyseus HTTP/WebSocket tests and requires permission to bind ephemeral ports in restricted environments. No Cloudflare access or paid services are required. Vitest uses thread workers because Colyseus's PM2 telemetry conflicts with Vitest fork-worker IPC.

## Automated coverage

- Foundation: nine-card exact tier mapping, unique IDs, strict settings, distinct eligible offers, fresh copied IDs, arbitrary tile multiplicity, ordered wall edits and controlled RNG boundaries.
- Hand evaluator: ordinary sequences/triplets plus pair, seven pairs with repeated types, missing-suit rejection, pure-seven-pairs exception, roots including declared kongs, single wait, self-draw/kong bonuses, point caps and ready-hand scoring.
- Round controller: unique 108-tile deal, forced missing-suit discards, stale/foreign/out-of-turn rejection, capped self-draw from all active payers, simultaneous discard winners ahead of pong, all three kong types and front replacement draws, robbed added kong without payment/with pong retained, last-wall-tile pong chain, 花猪, 查叫, refunds and private/public projections.
- Twenty seeded all-bot rounds: finish within a bounded number of actions, preserve every physical tile exactly once, and conserve total score after every action. Seeds are test-only, never exposed in production.
- Real transport: strict creation settings, four-seat capacity, non-host start rejection, waiting-room reconnect, a full one-human/three-bot round using actual private snapshots/actions, forged/stale input rejection, wire privacy and score/dealer carryover to the next round.

- Hex effects: private simultaneous reveal, forged/duplicate/stale choices, Echo source sampling and unique copy IDs, Malfunction shortages, Cheat without wall consumption, once-only last-16 selection after skipped thresholds and Echo growth, and safe exhaustion during a replacement-selection barrier.
- Combinations: Double Wield per-primary-turn reset/interruption/self-draw restrictions; Colour Blind legal wins/discards/end checks; uncapped pong-card transfers; one critical roll across all payers; post-cap crit/collateral ordering with opt-in/out and co-winner exclusion; exact critical-kong refunds; Blood River locked discards, repeated discard/self-draw wins, added-kong replacement and persistent roots.
- Eighty additional seeded Hex rounds: all nine cards encountered, every action conserves score and physical identity, copy counts match minted tiles, selection never repeats, and every round completes within a bound. These complement the twenty base-rule rounds.
- Timed transport: private offer/deadline restoration during selection, no early public choice reveal, automatic card choice without an unintended discard, collateral yes fallback before critical accounting, and card/lock/count reset at the next round.

- Solo controller: safe snapshots, repeated/stale actions, selection deadline fallback without auto-discard, timer cleanup, full seeded Hex rounds and dealer/score carryover.

The source tests live under packages/mahjong-engine/test, packages/hextech-engine/test, apps/server/test and apps/web/test. They verify Hex effects and their key combinations, without claiming an optimal bot strategy.

## Browser playtest

The standalone bot integration passed 52 tests; settlement hand revelation adds coverage for hidden live hands, public settled tile types, concealed-kong reveal and snapshot copy isolation, with server transport checks for reveal/reset. Both normal and static production builds passed.

See LOCAL_PLAYTEST.md. Verify create/practice → visible dealt hand → 定缺 → first card selection → legal discard/claim/win → last-16 selection → settlement → next round, plus EN/中文, phone hand scrolling and private concealed-kong display. The implementation was also exercised in installed Chrome through temporary Playwright tooling: desktop and 390px layouts, language switching, full Hex round settlement, both card choices, Chinese card descriptions and next-round card reset. The static build was also opened through the actual Games link in Chrome: friend-room creation disabled, no joining controls, 14 dealer tiles before declaration, one-click discard, a complete worker-driven Hex round, next-round carryover, and 390px Chinese layout. Controlled ledger snapshots delivered through the worker adapter verified +2/−4 feedback, one-second removal and no duplicate replay. Request tracing observed no backend requests or WebSockets. Browser tooling is not a required app dependency; smoke scripts/screenshots are temporary verification artifacts.

## Dependency notes

The lockfile includes compatible patched overrides for qs, path-to-regexp, body-parser, nanoid 3, tinypool and esbuild. Colyseus 0.16 still depends on nanoid 2.1.11 with four upstream input-size advisories. Its server call passes a fixed integer length; client input does not control generator sizes, and invitation IDs use crypto.randomUUID. Do not force nanoid 3 into that import because its default export API differs. A future Colyseus migration should remove the legacy dependency. Rerun build, type checks and transport tests after dependency updates.

The application is verified on macOS; Windows requires its own smoke test before deployment. Do not copy macOS node_modules or the ignored local Mac runtime onto Windows.

Opponent score feedback was checked in Chrome through controlled worker snapshots: each opponent flashes gains/losses in their own zone, your change stays central, bot-only transfers display correctly, each seat expires independently after one second, duplicate snapshots do not replay payments, and multi-payer transfers aggregate correctly. Both normal and static builds passed; the 390px layout and leaving with active feedback were also checked.

Settlement reveal verification: all 53 tests passed, including real transport checks. Normal and static builds passed. Chrome completed a full static round, showed all opponent hand faces at settlement, hid them again on the next deal, and verified that your meld row is closer to the hand than your discard row at desktop and 390px widths.
