# Design decisions and discussion

The owner has delegated routine rule decisions and Hex interactions to the engineer. Do not expand this file into a checklist of every possible card combination. Use the general policies in [RULE_DEFAULTS.md](RULE_DEFAULTS.md), implement deterministic behavior, and revisit balance after playtesting.

Confirmed base rules: [GAME_RULES.md](GAME_RULES.md). Previous answers are preserved in [RULE_DISCUSSION_HISTORY.md](RULE_DISCUSSION_HISTORY.md).

## Confirmed card corrections

1. **Double Wield — one bonus turn per primary turn, throughout the round.** Its bonus discard cannot trigger another bonus; a later non-bonus turn refreshes eligibility. Claim interruption and persistent self-draw-only/no-self-draw-fan restrictions remain as documented.
2. **Blood River — lock the hand after the first win.** Keep taking turns, drawing, and declaring self-draw/discard wins. A non-winning draw is discarded unchanged unless used to upgrade an existing pong to an added kong. No swaps of the retained hand and no new pong/discard-kong/concealed-kong claims after locking. A successful added kong contributes its root to every later win under the ordinary root count.

These are owner-confirmed rules replacing the earlier engineer defaults. Full mechanics are in RULE_DEFAULTS.md. There are no pending owner questions at this stage. Other former Q5–Q13 details use the delegated defaults; public hosting URLs are deployment inputs to configure when the Windows host is ready.

## Working agreement for future cards

Ask for discussion only when a card changes the main play loop, contradicts an explicit owner rule, exposes information unexpectedly, or introduces a major balance risk. Resolve ordinary rounding, effect ordering, insufficient-tile cases and stacking through the shared defaults. Record intentional exceptions next to the relevant effect and add focused tests when implementing it.

The application now implements all nine Hex cards, both selection phases, bots and 8/16-round sessions. See LOCAL_PLAYTEST.md for controls and remaining operational limitations. There are no pending rule approvals; balance and UI refinements can follow playtesting.
