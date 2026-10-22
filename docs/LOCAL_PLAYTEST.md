# Play locally on this Mac

Open **http://localhost:2567** for the built game, or **http://localhost:5173** while the development servers are running. No Windows PC, Cloudflare, account or internet connection is required for gameplay. No external fonts/assets are loaded.

## Website bot version

Open **Games → Hex Mahjong · Play with bots** on the website. The complete game engine and bots run in a browser worker: gameplay makes no game-server requests and needs no Windows PC. Friend-room creation is greyed out with “not yet available”; joining and reconnecting are hidden. Leaving or refreshing ends this solo session. Once the page assets have loaded, gameplay needs no network connection; this is not an installable offline cache.

To rebuild the publishable version run `pnpm build:static`. Preview the parent website through any local static HTTP server, then visit `/games.html`. Upload `games.html` and the complete `hex-mahjong-play/` directory to publish using the existing manual workflow. The relative asset paths also support a university user-directory prefix.

## Double-click launch

In Finder, open `hex-mahjong/Play Hex Mahjong.command`. It opens the game in your browser. If it starts the server, keep that Terminal window open; Control+C stops it. If a Hex Mahjong server already runs on port 2567, the launcher uses it rather than starting a second one.

For this Mac, a Node 22.23.3 executable was copied from the previously checksum-verified portable runtime into ignored `.local/node/bin/`. This allows the launcher to work without installing Node globally. It is machine-local tooling, not part of Git or a Windows deployment. A new checkout on another machine requires Node 22 and the documented dependency installation/build.

The launcher serves the last production build. After editing source, run `pnpm build` before relaunching, or use `pnpm dev` for app source watching. The current development environment also watches the server source, so port 2567 may already be owned by that server.

## Play a round

1. Choose the win cap (per payer) and 8/16 rounds, then click **Play against 3 bots**.
2. Inspect your dealt hand (13 tiles, or 14 as dealer), then choose your missing suit (定缺) using the buttons below it. The bots likewise choose after receiving their hands.
3. Choose one of your two **Hex cards**. Everyone gets the same randomly chosen tier (silver/gold/prismatic), but offers are private and choices reveal together. You have 30 seconds; a missed choice is picked randomly by the game controller.
4. When it is your turn, **click a legal tile once to discard it immediately**. There is no discard confirmation button. Normally you must clear the missing suit first; Colour Blind waives that restriction. Legal 碰/杠/胡/过 actions appear automatically. Ordinary turns/claims still have no timeout.
5. A second card choice pauses play just before the first draw with 16 or fewer wall tiles left, including kong replacements and bonus turns. It occurs only once even if Echo grows the wall. Players who already retired do not pick again; active Blood River owners do.
6. Watch your selected cards below your seat name and read their descriptions by hovering over their labels. Effects are automatic except Collateral Damage: eligible discard winners choose whether to collect the extra payment, with a 15-second default of yes before the critical roll.
7. Ordinary winners sit out. Blood River owners continue playing with a locked hand: draw, self-draw win, discard win, or use the new draw for an added kong; otherwise discard that new draw. Original tiles cannot be swapped. Double Wield repeats once per primary turn, and the bonus turn cannot chain itself.
8. The round ends when fewer than two active players remain or the wall and final claim chain are exhausted. Open the **Payment ledger** for fan, crits, collateral, kong receipts/refunds and end checks; open **Table activity** for card acquisitions, wall edits, extra turns and hand locks.
9. At **round settlement**, everyone’s remaining hand and concealed kongs become visible for review. Your own pong/kong row sits below your discards, closer to your hand; opponents’ melds remain next to their hand rows.
10. **Next round** carries scores/dealer rules forward but clears all cards, armed draws, hand locks, win counts and selection flags. After the configured 8/16 rounds, the scoreboard ranks session scores.

Your score transfers flash in the center of the table for one second; each opponent’s transfers flash in their own seat zone: green **+2**, for example, or red **−4**. Each seat has its own one-second timer, restarted only by a new transfer involving that seat; simultaneous incoming/outgoing transfers are shown separately. Previously recorded transfers are not replayed on reconnection or round changes.

English/中文 can be switched at any time. At phone widths the hand row scrolls horizontally. Your own concealed kongs are visible to you; other players see concealed kong backs until round settlement. The React view receives only your private hand and public opponent information. In solo mode the worker owns the whole game; in friend rooms opponents’ concealed hands stay on the server until round settlement.

## Friends and reconnection

These controls and reconnection apply to the normal server-enabled build, not the standalone website bot build. Solo practice in either build runs in a worker and ends on refresh.

For local multi-browser testing use **Create a friends room**, copy the invitation, join in another browser and let the host start. Empty seats become bots. This milestone supports only initial lobby joining; friends cannot replace bots between rounds yet. To test two distinct players, use separate browser profiles/windows rather than reconnecting the same session token.

Pending card offers, locked choices and decision deadlines are retained on reconnection. The 30-second card timer and 15-second collateral timer continue while offline; reconnecting does not reset them.

Refresh/disconnect reserves your seat for 30 minutes. The browser keeps the table visible and retries every two seconds after a dropped connection. On returning from another app or regaining network access, it checks the connection; an unresponsive socket is replaced after five seconds. Mobile operating systems can still suspend sockets while the app is in the background.

On another browser or device, enter the same room code and a username that uniquely identifies your seat, then click **Join room**. Matching ignores capitalization and surrounding spaces. This restores your seat, hand, scores and host role, including during a started/full room, and replaces the previous device connection. Blank or duplicate names require the original browser's stored reconnect token. Names are room-scoped recovery credentials: anyone knowing a unique username and room code can reclaim that seat. After the grace period or explicit leave, the seat is released in the lobby or handed to a bot in a started game. Server restarts still lose all rooms.

## Included and excluded

Implemented: all nine Hex cards and both private selection phases, a pure authoritative Mahjong round, ordinary/seven-pairs validation, confirmed fan rules and caps, multiple discard wins, all three kong types, robbing added kongs, missing-suit enforcement, wall-exhaustion checks/refunds, simple shanten-based bots, score carryover and dealer rotation across 8/16 rounds, private snapshots and validated actions.

Criticals may break the ordinary win cap; collateral is calculated from the final discard payment, cannot crit again, and excludes retired players and co-winners. All payments remain zero-sum. Exact interactions are in RULE_DEFAULTS.md. Bots are competent practice opponents, not expert Mahjong AI; they choose from their own hand only. There is no spectator feature, public listing, authentication service or production tunnel in this milestone.

## Terminal commands

With Node 22 and pinned pnpm available, from `hex-mahjong`:

```text
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm play
```

`pnpm play` opens the built local game on macOS; `pnpm start` runs just the production server. `pnpm dev` runs Vite on 5173 and the source server on 2567. Vite uses a strict port to avoid silently moving the frontend away from the allowed origin. Stop an existing server before trying to launch a second copy on the same port.
