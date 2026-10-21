# Game rules specification

This records the owner's Q1–Q4 answers. The current application implements the base rules below for local bot play, including complete rounds, settlement and session score carryover. All nine Hex cards and their two selection phases are now implemented as described in RULE_DEFAULTS.md. Routine remaining interactions now have delegated defaults in [RULE_DEFAULTS.md](RULE_DEFAULTS.md); [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) highlights only the major gameplay choices for optional discussion.

## Session, round and dealer

A configured session consists of 8 or 16 rounds. In the owner's card descriptions, “one game” means one round. Each round ends when three players have won, or when the wall is empty and all permitted final-tile actions have resolved. A no-winner round still counts toward the configured 8/16 rounds. A player who wins stops playing for the remainder of that round (血战到底). Blood River's owner-confirmed exception keeps its owner active after scoring with a locked hand, permitting further wins and added kongs; added-kong roots count on later wins. See RULE_DEFAULTS.md for the full rules and active-player end condition.

The room creator is the first dealer (庄家). Normally the first winner of a round becomes the next dealer. If the first winning discard produces multiple winners, the discarder becomes the next dealer. If nobody wins, the current dealer remains dealer. After all configured rounds, display a ranked scoreboard; there is no separate overall-winner designation. Order the scoreboard by descending score, breaking equal-score ties alphabetically by player name.

Selected Hex cards apply only to the current round. Their ownership and round-local effect state must reset between rounds. Selection guards reset before round preparation; execution details are in RULE_DEFAULTS.md.

## Tiles and preparation

- Initial inventory: 108 tiles, consisting only of the three numbered suits. Hex effects may subsequently change tile multiplicity and wall size.
- Each non-dealer starts with 13 tiles; the dealer starts with 14.
- No exchange-three phase.
- Deal and show each player their full starting hand first (13 tiles; 14 for the dealer). Only then do players choose their missing suit (定缺), before the first Hex-card selection or any discard.
- Both concealed tiles and tiles in declared melds are eligible for copying. Each new physical copy requires a fresh unique ID. Echo samples physical tiles without replacement, copies up to three available tiles and inserts drawable copies; see RULE_DEFAULTS.md.

## Legal actions and winning hands

Chow (吃) is forbidden. Discard claim priority is win > kong > pong (胡 > 杠 > 碰). Multiple players may win on one discard (一炮多响); resolve every winning claim before advancing play. The discarder pays all winning claimants. Turn and discard-claim decisions have unlimited time; card selection uses the separate 30-second delegated default.

An ordinary winning hand consists of four sets and a pair. Sets may be sequences, triplets or declared kongs. Seven pairs is the only alternative winning shape. A sequence can be formed from one's own tiles even though claiming a discard to chow is forbidden. 七对 permits any even multiplicity of each tile type, with each two copies contributing one pair, while still totaling exactly seven pairs (14 concealed tiles). There is no eight-copy limit per tile type.

Every successful kong grants one replacement draw from the front of the wall. A kong is illegal if no replacement tile remains. Only an added kong may be robbed (抢杠); its kong payment is cancelled. The original pong remains in place after the added kong is robbed.

Players must discard their missing-suit tiles before other suits, and have none of that suit to win. Colour Blind also waives this discard obligation, in addition to its stated flower-pig exemption and permission for three-suit wins. Missing-suit and flower-pig checks examine concealed tiles only; declared melds are excluded. This exemption does not change 清一色 or 根 evaluation, which includes declared melds.

When the final wall tile is drawn, its holder may self-draw win or discard. Other eligible players may win or pong that discard. A pong claimant must discard; that discard can in turn trigger further allowed wins/pongs. Continue until there are no further permitted events, or three players have won. No kong is possible without a replacement tile. Do not settle merely because the draw reduced wall size to zero. An already-queued legal wall insertion can restore draw opportunities; it never reopens a consumed card-selection phase.

## Winning score

The base unit is 1 point at 0 fan. Before applying the configured winning-score cap, winning points are `2 ** fan`. Self-draw contributes +1 fan, which is the stated doubling; do not apply a second separate doubling on top of that.

| Pattern | Fan contribution |
| --- | --- |
| All pongs / 对对胡 | +1 |
| Pure suit / 清一色 | +2 |
| Root / 根: four identical tiles, including an existing kong | +1 per root |
| 大单调: two concealed tiles at winning, with all other sets declared as pongs/kongs | +1, together with the implied 对对胡 +1 |
| Self-draw / 自摸 | +1 |
| Robbing a kong / 抢杠 | +1 |
| Win after kong / 杠上花, or discard win after another player's kong / 杠上炮 | +1 for the applicable event |
| Seven pairs / 七对 | 2 total before other applicable additions |
| Pure seven pairs / 清七对 | 3 total before roots/other applicable additions; explicit exception to ordinary additive 清一色 scoring |
| Dragon seven pairs / 龙七对 | 3 total: 七对 + one root |
| Pure dragon seven pairs / 清龙七对 | 4 total: 清七对 + one root |

Other compatible patterns add together unless an explicit exception is stated. Count roots across the winner's concealed tiles and declared melds together, including kongs. For each tile type, roots = floor(copyCount / 4); sum across all tile types. This applies even above eight copies: four through seven give one root, eight through eleven give two, and twelve give three.

Confirmed examples (before any applicable cap):

| Winning pattern | Fan | Payment |
| --- | --- | --- |
| 清对 + 自摸 | 1 + 2 + 1 = 4 | 16 from each remaining player |
| 自摸 + 杠上花, with one root for the existing kong | 1 + 1 + 1 = 3 | 8 from each remaining player |
| 大单调 + 自摸, with no additional roots | 1 对对胡 + 1 自摸 + 1 大单调 = 3 | 8 from each remaining player |
| 清一色大单调点炮胡 (ordinary discard win) | 2 清一色 + 1 大单调 + 1 implied 对对胡 = 4 | 16 from the discarding player |

The owner corrected 点杠胡 to 点炮胡: the last example is an ordinary discard win, with both concealed tiles and every declared pong/kong belonging to one suit. It earns no additional 抢杠 or 杠上炮 fan.

Self-draw payments come from each remaining player; “remaining” excludes players who already won. Discard-win payments come from the discarder, including all winners of a multiple-win discard. Score caps are 8, 16, 32 or uncapped, apply to winning points only, and do not limit pong/kong payments. For each ordinary win, compute the payable amount as min(2 ** fan, cap), or 2 ** fan in an uncapped room. Each eligible payer pays that amount. An 8-point cap with three self-draw payers therefore permits 24 total, not 8 total; the maximum ordinary receipt with all three payers is 3 × cap. Each winner of a multiple-win discard has their own capped winning payment, all paid by the discarder. Delegated Hex exceptions apply the ordinary cap before a single critical multiplier, then compute collateral bonus transfers; see RULE_DEFAULTS.md.

Every settlement must be zero-sum: total debits equal total credits. Negative balances are permitted. Every player starts the session at a score balance of 0.

## Kong payments and end checks

Kong payments transfer immediately after a successful kong event, outside the winning-score cap:

| Kong type | Payment to the kong claimant |
| --- | --- |
| Discard-claimed kong / 点杠 | 2 points from the discarder |
| Added kong / 加杠 | 1 point from each remaining player |
| Concealed kong / 暗杠 | 2 points from each remaining player |

A flower pig (花猪) is a player whose concealed tiles still contain their declared missing suit; declared melds are excluded. When the round ends through wall exhaustion, an unwon flower-pig player pays each other remaining non-flower-pig player the configured cap, or 16 points (2 ** 4) in an uncapped room. Players who already won do not participate. Equal payments between two flower pigs cancel, so omit those mutual transfers from the normalized ledger; the owner accepts either representation as the same final score. Colour Blind exempts its owner; unrelated win requirements still apply.

查叫 applies at wall-exhaustion settlement. Each non-ready, non-flower-pig unwon player pays each ready unwon player that recipient's own maximum possible winning score, capped by the ordinary score cap. Exclude 自摸、杠上炮、杠上花 and 抢杠 when computing this hypothetical winning score. 花猪 overrides 查叫: a flower-pig payer is charged through the flower-pig rule rather than also receiving a 查叫 charge for the same settlement.

Kong refunds occur only at wall-exhaustion settlement: a non-ready kong claimant returns their received kong payments to their original payers, in the actual amounts originally paid. Nothing is reallocated. A robbed added kong has its payment cancelled and the original pong remains; a failed/pending kong is not a completed kong for immediate payment purposes.

## Hex selection and lifecycle

Each selection offers two distinct, previously unowned cards from one tier: silver, gold or prismatic. Different players may select the same card. The catalogue is maintained in packages/shared/src/index.ts.

The two named selection points are before the dealer's first discard and immediately before the draw with 16 tiles remaining in the wall. The second phase happens at most once each round even if effects grow the wall. The delegated <=16 draw-boundary rule also catches removal that skips over exactly 16; tier and selection policy are in RULE_DEFAULTS.md.

Lifecycle vocabulary is waiting → card_selection → active_play → round_settlement → game_complete, with missing-suit declaration before the first selection in each round. The playtest uses active_play for 定缺, then initial card_selection; normal play may pause for the once-only last-16 selection or a collateral decision before settlement. 定缺 follows the full deal and precedes the first card selection. Empty seats become bots on start; disconnect grace/takeover behavior is documented in LOCAL_PLAYTEST.md. Extended bot replacement defaults remain future work.
