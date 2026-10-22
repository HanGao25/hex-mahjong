# Hex cards

See [the complete card rules](HEX_CARD_RULES.md) for all twenty-four cards, selection-stage restrictions and interaction details. Read and update that document when refining cards.

All twenty-four cards are implemented. The single source for identifiers, tiers, bilingual names/descriptions, trigger metadata and implementation status is [`CARDS`](../packages/shared/src/index.ts). The frontend renders that catalogue directly; it does not keep a second card list.

[Rule defaults](RULE_DEFAULTS.md) specify the full effect policy. [Local playtest](LOCAL_PLAYTEST.md) explains the choices and indicators. Source ownership:

- `packages/hextech-engine`: distinct eligible offers, common-tier fallback, injectable 40% trials, physical source sampling/copies and immediate wall edits.
- `packages/mahjong-engine/src/round.ts`: selection barriers, per-player ownership, legal-action restrictions, turn bonuses, settled payments, Blood River locking and effect dispatch.
- `apps/server/src/HexRoom.ts`: private transport, exact request validation, server RNG/IDs, bot decisions, 30-second card deadlines preserved across reconnects; collateral now settles automatically.

Cards are acquired after all players lock choices, then immediate effects resolve clockwise from the dealer. Initial selection follows the full deal and 定缺, before the opening discard. Last-16 selection pauses before a normal/replacement/bonus draw, catches removal that skips below exactly 16, and is consumed before acquisition effects can grow the wall. Offers exclude each player's already-owned cards and are never public.

Double Wield grants one interruptible bonus on every primary turn's ordinary discard, not on its own bonus discard; its self-draw-only/no-self-draw-fan restrictions remain until round end. Blood River retains its owner in play and locks the underlying hand after the first win. A newly drawn tile can upgrade an existing pong; that declared kong remains included in every later root count.

Win accounting is ordinary fan/cap → one critical multiplier for the settlement → payer reduction → mandatory collateral transfers (with their own payer reductions). One critical covers all payers together. Co-winners and retired players never pay collateral. No recursion, no criticals on collateral/pong-card/end-check/refund transfers, and kong refunds use the historical amount even when the original receipt crit, then apply the refund payer’s Great Wall reduction.

New cards inherit this policy. Add typed catalogue entries, precise intentional exceptions, pure handlers and deterministic integration/combination tests. Avoid pairwise approval checklists.
