# Delegated rule defaults

These are engineer-selected working rules under the owner's instruction to make reasonable, entertaining decisions independently. They are reversible design choices, not additional owner answers, except for the explicitly owner-confirmed Double Wield and Blood River corrections below. Confirmed base rules in GAME_RULES.md take precedence; explicit card exceptions below override only their named base behavior. All seventeen card effects and selection/settlement policies below are implemented. Some extended multiplayer policies remain future work as noted below; see LOCAL_PLAYTEST.md for current capabilities.

The complete current catalogue, including Bathroom Break, Loan Construction and Fan the Flames, is maintained in [HEX_CARD_RULES.md](HEX_CARD_RULES.md). Its new-card exceptions extend the defaults below.

## Shared interaction policy

1. Server validates membership, phase, turn, tile ownership and legality before any effect. A card cannot authorize an otherwise illegal action unless it explicitly says so.
2. Resolve one event at a time: collect all decisions, resolve winning claims before kong/pong, calculate settlement, apply effects, then advance play. Within simultaneous wins, evaluate eligibility against the same pre-settlement active-player snapshot. Settlement order is clockwise from the triggering player (dealer for selection), not network arrival order.
3. Each card may respond once to a root event. Bonus payments, copied tiles, critical multipliers, refunds and card-generated turns do not recursively generate another copy of that same bonus. New ordinary events on a bonus turn can still trigger other cards normally. A successful kong still creates its ordinary replacement draw. Every trigger records its event ID so reconnection/retries cannot repeat it.
4. A restriction wins over a permission unless the permission explicitly exempts that restriction. Colour Blind exempts missing-suit restrictions only; it cannot bypass Double Wield's self-draw-only restriction.
5. Use integer points, floor fractional bonus amounts, and maintain a zero-sum transfer ledger. Compute ordinary fan → ordinary per-payer cap → one critical multiplier → collateral transfers. Jeweled Gauntlet explicitly may exceed the ordinary cap; it never changes fan or win eligibility. No other implicit cap bypass.
6. Win settlements and successful-kong settlements are distinct root events. No critical rolls on pong-card payments, 查叫, 花猪, collateral child transfers or refunds. Refund the exact historical kong transfer including any critical multiplier, without rolling again.
7. Random choices use server-only injectable RNG. Sample physical tiles uniformly without replacement unless specified otherwise. Missing resources mean do as much as possible; empty optional effects harmlessly fizzle. Never create an illegal hand merely to force an effect to succeed.
8. Round-scoped cards, offers, once-per-round flags and selection guards reset each round. Double Wield's bonus-use flag instead resets for each new non-bonus turn; its restrictions remain round-scoped. Winning does not erase already-completed transfers. Ordinary retired players neither pay nor receive new card bonuses; original-payer refunds remain valid even if the payer later retired.
9. Show public event reasons and amounts (e.g. “critical ×2”, “collateral +4”, “extra turn interrupted by pong”). Private offers, concealed tiles, copied tile types/positions and wall contents stay private. Logs describe a hidden-wall mutation by count, not contents.

## Selection: former Q5

- Two phases per round: after 定缺 and before the dealer's first discard; then at the first draw boundary with 16 or fewer wall tiles remaining. A draw boundary includes normal, kong-replacement and Cheat-substituted draws. A removal skipping 17 → 15 still qualifies. Finish pending claims/settlements before pausing for selection.
- The second phase is marked consumed before resolving its effects. Growing the wall can never create a third selection. A zero wall does not create a new draw opportunity by itself: finish final actions and settle unless an already-queued legal effect replenishes it.
- Independently for each phase, choose one tier uniformly from silver/gold/prismatic, shared by all eligible active players. Offer each player two distinct cards they do not already own. Other players may see the same card in their offers. Only active players participate in the second phase; this includes a Blood River owner who already scored but remains active.
- Collect choices simultaneously, privately, with a 30-second selection timer; timeout/bots choose uniformly from their offer. Reveal chosen cards once all decisions are locked, then resolve acquisition effects clockwise from the dealer. Concealed offers are never broadcast.
- With two selections and three cards per tier, the current catalogue always has at least two eligible cards. If a future catalogue cannot supply a pair, use another tier that can supply a pair for every participant, selected uniformly. If none can, skip the phase with a public reason; never offer a duplicate or crash the round.

## Card-specific decisions

The seventeen names, IDs, tiers and bilingual core descriptions remain in the typed CARDS catalogue. These are execution policies supplementing that single catalogue, not a second list of cards.

### Next-draw substitution (Cheat)

Use the next draw, including a kong replacement, to copy a random tile the owner currently owns (concealed or declared). The copy gets a fresh ID and goes into the concealed hand; wall size is unchanged. Consume the effect once. If there are no eligible tiles, draw normally. The replacement-draw entitlement still requires at least one wall tile before declaring a kong, matching the owner's base rule. A legal copied draw is self-draw for win scoring. Merely having Cheat armed does not grant a draw after wall exhaustion.

### Wall removal (Mahjong Machine Malfunction)

On acquisition, uniformly remove min(2, wall size) tiles without replacement. Removed tiles are out of play for this round. Finish all simultaneous acquisition effects before evaluating wall exhaustion or the next selection boundary.

### Pong payment (Point-to-Pong-to-Kong)

Transfer exactly 1 point from discarder to claimant on a completed pong. The payment is uncapped, cannot crit and is never a kong receipt/refund. It does not turn the actual meld into a kong or grant a replacement draw.

### One extra turn per turn (Double Wield; owner-confirmed)

Grant at most one immediate bonus draw/discard turn after each non-bonus turn's ordinary discard, throughout the round. Reset the bonus-use flag at the start of each new primary turn (a normal scheduled turn or a turn obtained through a legal claim), never on the bonus turn itself. The bonus discard cannot grant another bonus. This is repeatable on later turns, not a once-per-round ability.

Resolve others' claims first: any successful win/pong/kong claim interrupts and consumes that turn's bonus opportunity; otherwise the owner receives the bonus if a legal draw exists and the round has not ended. After the bonus, resume the ordinary clockwise order from the owner, skipping retired players. Kong replacement draws are part of the same primary/bonus turn and do not refresh the bonus budget.

Keep this per-primary-turn flag separate from persistent self-draw-only and no-self-draw-fan flags. Restrictions apply immediately on acquisition until round end, including Blood River repeat wins. Do not remove 杠上花 or other legitimate fan when removing 自摸 fan. A primary turn ending in a self-draw win has no ordinary discard and therefore grants no discard-triggered bonus; a Blood River owner remains active for later turns.

### Additional transfers (Collateral Damage)

On a discard win with at least 2 fan (including robbing a kong), Collateral Damage is mandatory and settles immediately. Each eligible active non-discarder/non-co-winner pays half the actual discard payment, rounded down. Apply Great Wall to each outgoing payment. No separate decision or deadline. See [current rules](HEX_CARD_RULES.md) for all new cards and interactions.

### Missing-suit exemption (Colour Blind)

Use the owner's confirmed exemptions: ignore the missing-suit discard obligation and flower-pig check and allow three-suit wins. Keep winning-shape, turn and other card restrictions. Do not award 清一色 for a mixed-suit hand.

### Critical settlements (Jeweled Gauntlet)

Make exactly one independent 40% roll for each owner win or successful owner kong. A success doubles all base payer transfers for that settlement together, after the ordinary winning cap (kong payments have no such cap). Co-winners roll separately only if they own the card. Do not roll per payer or on collateral. A 16-point ordinary capped win can therefore crit to 32 per payer. The cap bypass remains intentional after moving this card to gold. A crit never increases fan for Collateral Damage eligibility.

### Repeat wins with a locked hand (Blood River; owner-confirmed)

- Only its owner continues playing after scoring. Others retire after their first win. Before the owner's first win, ordinary play remains available. After that first win, **lock their underlying concealed hand and declared melds**: future draws cannot replace tiles in that hand. The explicit permitted structural change is an added kong (加杠) as described below.
- For a self-draw win, settle and move the newly drawn winning tile to the resolved scored-tile pile and publish its face in the winning event (visible in Table activity), retaining the underlying concealed hand. On the first self-draw win, that retained hand becomes the locked baseline. For a discard/robbed-kong win, settle with the offered tile as the winning reference without adding it to the concealed hand; on the first such win the existing concealed hand becomes the baseline. One physical offered tile is stored once in a resolved-win pile and referenced by each co-winner's server-side scoring snapshot.
- On every subsequent turn, draw normally. The owner may declare a legal self-draw win, use that newly drawn tile for a legal added kong, or discard that same newly drawn tile. After the first win, the system automatically prioritizes a legal win, then an added kong, then discarding the draw. Human seats use the same scheduling as bots without becoming bot-owned seats; later card choices are automatic too. They may not discard or swap a locked hand tile, claim a pong/discard-kong, form a new concealed kong, or rearrange physical tiles into new melds to alter their hand. Winning-shape validation may still examine different logical decompositions of the same retained tile multiset.
- The owner may continue declaring legal discard wins, including robbing an added kong, without changing the locked hand. Double Wield's self-draw-only restriction, if owned, still forbids these discard wins.
- For an added kong, the new draw must match an existing declared pong. Upgrade that pong using the drawn physical tile; retain every locked concealed tile. Apply ordinary robbing/payment/replacement-draw rules. If robbed, the pong stays as it was. If successful, draw the replacement from the front, and apply the same win/add-kong/discard-drawn-tile choices to the replacement. No kong is legal without a replacement draw available.
- A successful added kong remains in the owner's declared melds. It contributes to 根 in every later win, even though the owner already won earlier: count current owned concealed/meld tiles plus the current winning reference using floor(copyCount / 4). Example: an existing pong becomes four identical tiles through 加杠, adding one root to later winning scores; never add this root again on top of the ordinary count. Prior scored winning tiles do not remain owned for root calculation.
- The owner remains an eligible payer while active. End the round when fewer than two active players remain, or after completed wall-exhaustion actions. Count active participants, not cumulative win events. At wall exhaustion the owner participates in ready/flower-pig checks as an active player; kong refunds depend on current readiness, even if they previously scored. Ordinary retired winners stay exempt.
- If obtained in the second selection, it affects future wins only; it cannot revive an already-retired player. Other effects may copy retained tiles but may not silently replace/remove locked originals. Post-win discard requests must reference the current drawn tile ID; enforce this on the server.

### Wall copies (Echo)

On acquisition, sample up to three distinct physical tiles from the owner's concealed hand and declared melds. Copy those types with new globally unique IDs without changing the original tiles/melds. Insert each copy uniformly into one of the current wall's gaps, including the front and end. All inserted copies are drawable later, including by other players and immediately on the next legal draw. The source sample is frozen before inserting; a newly created copy cannot be sampled again by this acquisition. Fewer than three sources means copy all available; none means fizzle. It does not revive a consumed selection trigger.

## Multiplayer defaults: former Q12

Host explicitly starts the round; empty seats are filled by bots at that moment. Bots are server-controlled, use the same legal-action validation, prefer a legal win, and otherwise use a simple legal choice; no hidden information advantage. Unlimited human turn/claim time remains as confirmed; bots answer immediately. Card-selection timeouts are separate.

Keep the implemented 30-second human reconnection grace. A waiting seat is released after grace. During play, pause that seat's required decisions for grace, then let a bot control the same seat and balance. After grace expires, the bot finishes the round; the old reconnect token cannot reclaim the seat. Between rounds, the host may explicitly assign that bot seat and its carried balance to a joining friend, including the returning player. Never infer ownership from a matching display name. Explicitly leaving an active round gives that seat to a bot immediately. New friends can replace bots only between rounds, with host approval. Host transfers to the next connected human when necessary; remaining bots never acquire hosting privileges. Destroy a room when it has had no connected humans for five minutes. No restart persistence yet.

These extended takeover/bot policies are future implementation. The base playtest implements 30-second reconnection, waiting-seat release and active-seat bot takeover; replacement of bots by new humans remains future work.

## Hosting defaults: former Q13

Use invitation-only waiting-room access, UUID room IDs, server validation and session-bound actions. A room ID admits a new waiting seat but never authenticates an existing player's actions or permits reclaiming that player's balance. No account provider, database or room password initially. No spectators or public room directory. Runtime config supplies the server URL, separate from the frontend URL; exact production origins are configured during Windows deployment. No paid service or actual publishing is authorized merely by choosing these defaults.

## Future cards

A new card declares its event trigger, scope, one-shot state, any precise exception to the policies above, and a short visible explanation. Unspecified interactions inherit the shared policy. Add regression cases for event ordering, hidden-state safety, ledger conservation and the card's interesting combinations, rather than asking for pairwise design approvals. Rebalance simple constants after friend playtests. Keep unusually powerful combos visible and funny, but bounded and zero-sum.
