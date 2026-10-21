# Rule discussion history

Historical questions and owner answers. Current authority is GAME_RULES.md for confirmed base rules and RULE_DEFAULTS.md for delegated design defaults. Historical unresolved labels below are no longer an active questionnaire.

# Decisions required before gameplay

Q1–Q4 and their R1–R5 follow-ups are resolved for the base rules, specified in [GAME_RULES.md](GAME_RULES.md). Original questions and answers are preserved below as a record; unanswered wording inside those historical questions does not reopen a resolved decision. Q5–Q13 remain open except where confirmed answers already settle part of a question. The lobby can run without these answers; game start remains gated.

- **Q1 — Base variant:** Which Sichuan ruleset? Tile inventory (three numbered suits only?), starting hand/deal, dealer selection/rotation, exchange-three, missing-suit declaration, legal claims, claim priority, multiple discard winners, turn/claim timeouts, robbing a kong, supplemental draw and winning-hand patterns? Does a winner stop playing or continue? Are concealed/declared tiles eligible for copies?
A: 3 numbered suits only (total tiles = 108). starting hand = 13 (14 for dealer/庄家). initial deal er = host; dealer of the next round = the first winner of this round/本轮第一个胡牌的玩家, no exchange-three, declare missing-suit/定缺 before selecting the first hex-card, legal claims and claim priority (i don't understand what you meant here), multiple discard winners allowed/允许一炮多响, robbing a kong allowed/允许抢杠, supplemental draw and winning-hand patterns (don't understand). Does a winner stop playing or continue- stop (血战到底). Are concealed/declared tiles eligible for copies - yes.

- **Q2 — Scoring:** Fan patterns and stacking, base unit, self-draw multiplier, payer rules, cap meaning (fan or points), cap application order and negative balances? Does the 1-point pong payment count toward caps? Settlement ledger and zero-sum requirements?
A: base unit = 1 point = 0 番. self-draw multiplies by 2/自摸翻番. caps on points, only apply to winning, pong/kong don't count. zero-sum always required. negative balances allowed. 
对对胡 += 1 番
清一色 += 2 番
having 4 same tiles/根 (including existing kong) += 1 番/根
大单调(having only 2 tiles in hand when winning, others are in kong/pong) += 1 番
自摸 += 1 番
抢杠 += 1 番
杠上炮/杠上花 += 1 番
七对 += 2番, but 清七对=七对+清一色 = 3番 (龙七对=七对+一根=3番，清龙七对=清七对+一根=4番)

winning points = 2^番

others are infered from the basic patterns: eg.
清对+自摸 = 对对胡 + 清一色 + 自摸 = 4番 = 16 points (from each remaining player)
自摸+杠上花 = 1 + 1 (+ 1 for the existing kong) = 3番 = 8 points (from each remaining player)
大单调自摸 = 对对胡(always implied) + 自摸 + 大单调 = 1 + 1 + 1 = 3番 = 8 points (from each remaining player)
清一色大单调点杠胡 = 清一色 + 大单调 + 对对胡(implied) = 2 + 1 + 1 = 4番 = 16 points (from the discarding player)

- **Q3 — Rain money / end checks:** Exact kong types, payers, eligibility, amounts, refunds/transfers on later wins, flower-pig definition and check timing, ready-hand penalties and draws? Colour Blind waives only the stated flower-pig and three-suit restrictions; other conditions need definition.
点杠=2 scores from the discarding player, 加杠=1 score from each remaining player, 暗杠=2 scores from each remaining player. scores transferred immediately after a kong event. 
flower-pig/花猪 = declared missing-suit not respected

- **Q4 — Round/game counting:** What counts as one of 8/16 rounds? Dealer repeats, drawn rounds, winning-player continuation, end-of-round conditions, ties and overall winner? Do selected cards last one round or all configured rounds? Meaning of “game” in each card?

1 round = 1 game = from the start to having 3 players winned or no more tiles remaining in the wall
Selected Hex cards in effect in only one (the current) round

## Q1–Q4 clarification answers (preserved)

The winner-continuation conflict is resolved: winners stop playing (血战到底). The flower-pig definition is now provided: failure to respect the declared missing suit. These two points are no longer open.

1. **Claims and priority (Q1):** A “claim” is taking another player's discarded tile to pong (碰), kong (杠), or win (胡). Is chow (吃: taking a discard to complete a sequence) forbidden? If one player wants to pong/kong and another can win on the same discard, does winning take priority? If multiple players win, settle all of them before any next turn? Set turn/claim timers or allow unlimited time?
A: chow is forbidden. Priority win>kong>pong. Multiple win: settle all of them before any next turn. allow unlimited time.
2. **Replacement draws and winning hands (Q1):** “Supplemental draw” means the extra tile drawn after a kong. Does every successful kong grant one, from the front or back of the wall? Is a legal ordinary win four sets plus a pair, where a set is a sequence or triplet/kong, plus the stated seven-pairs alternative? Are there other permitted winning shapes? Can you rob only an added kong, or also a discard-claimed/concealed kong?
-from the front and every kong grants one. 
-Is a legal ordinary win four sets plus a pair, where a set is a sequence or triplet/kong, plus the -stated seven-pairs alternative? = yes, and no other permitted.
-rob only an added kong
3. **Missing suit and flower pig (Q1/Q3):** Must a player discard their missing-suit tiles before discarding other suits, and be free of that suit to claim a win? [Yes] Do checks include declared melds? When is 花猪 checked and how much does its owner pay, to whom? [the un-winned 花猪 players pay to other remaining players the capped amount when the game ends with no more tiles remained in the wall] Does Colour Blind waive the discard obligation too, or only the stated check and three-suit-win restriction? [Colour Blind waive the discard obligation]
4. **Roots and unusual scoring (Q2):** For 根, count the winner's concealed tiles and declared melds together? (yes) Hex cards can create 5–8 identical tiles: does that give one root, two at eight, or another rule? (having 5-7 = 1 root, 8 = 2 roots) With extra copies, can seven pairs include three/four pairs of the same tile type? (only 2,4,6,8 allowed) What does “清一色大单调点杠胡” mean: an ordinary discard win (the supplied 4 fan), 抢杠, or 杠上炮 (each otherwise adds +1 fan)? (that was a typo. i meant “清一色大单调点炮胡”=大单调，且加上所有碰过/杠过的牌都是一个花色，and an ordinary discard win )
5. **Caps and payer scope (Q2):** Is the cap per payer?  - per win event. Example: 32-point self-draw with an 8-point cap and three payers—receive 8 from each (24 total), or only 8 total? “Remaining players” excludes players who already won, correct? - yes. Confirm who pays for multiple discard winners and the starting balance (点炮的全赔). Hex critical/collateral cap ordering remains Q8/Q9.
6. **End-of-wall settlement and kong interruption (Q3):** Is there 查叫 (payments by players who are not ready to win)? [yes. and the 没下叫的 player pays the max possible winning pattern (excluding 自摸，杠上炮，杠上花)] Are any kong payments refunded/reallocated at round end or after later wins? (at round end, and only if ends with no remaining tiles in the wall) If an added kong is robbed, is its kong payment cancelled (with the original pong retained)? [kong payment cancelled] What happens if no tile remains for a kong's replacement draw? (one can't kong when there's no more replacement to draw)
7. **Dealer and round boundary (Q4):** Who deals next if nobody wins? (the current dealer is still the dealer) If the first winning discard has several winners, which becomes dealer? (the discarding player) Does a no-winner round still count toward 8/16? (yes) If the last wall tile is drawn, may its holder still win/discard and others claim that discard before the round ends? (yes. the last wall tile being drawn -> the player declearing self-draw win OR discard one tile -> other players can win OR pong on this tile -> if pong, the player who pongs discard a tile -> keep going until no more event can be trigged -> true end of this round) How are session ties handled and the overall winner determined? (don't find overall winner. insteaed, after all rounds finished, display a ranked score board)

These clarifications do not replace the confirmed scoring table. Self-draw +1 fan is the doubling, counted once. 清七对 is explicitly 3 fan, not the otherwise additive 4. Card duration is confirmed as the current round; Q5 still needs exact trigger/reset mechanics and Q7 still needs the extra-turn window.

## R1–R5 answers (resolved; preserved)

The answers above are incorporated into GAME_RULES.md. Claims/priority, unlimited turn/claim time, front-of-wall kong replacement draws, allowed winning shapes, robbing only added kongs, copy multiplicities through eight, the 点炮胡 typo, dealer exceptions and the final-discard chain are resolved.

- **R1 — Exact cap arithmetic:** You wrote “per win event,” but the numeric example is still unanswered. With an 8-point cap and three self-draw payers, is the winner paid **8 each = 24 total**, or **8 total**? If 8 total, how is it split across three payers while remaining zero-sum? For a discard with multiple winners, is each winner a separate capped event or is the discard's combined payment capped? Hex ordering stays Q8/Q9.
24 points. the max one can win from a win event = 3*cap
- **R2 — 花猪 details:** Do missing-suit/花猪 checks include declared melds? (no) If two unwon players are 花猪, do they pay each other or only non-花猪 remaining players? (no difference to the final answer) What amount is paid in an uncapped room, where no numeric “capped amount” exists? (uncapped room pays 2^4=16 points)
- **R3 — 查叫 details:** Who receives payments: only ready unwon players (this), or other players too? Is each recipient paid their own maximum possible winning score? (yes) Is that score capped using the ordinary cap?(yes) You excluded 自摸、杠上炮、杠上花; should hypothetical 抢杠 also be excluded?(yes) How do 查叫 and 花猪 interact—can both apply to the same payer/recipient?(花猪overrides)
- **R4 — Kong refunds:** At wall exhaustion, who returns which kong payments, to whom (e.g. only a 没下叫 kong claimant returning the actual amounts to original payers)?(yes) Is anything reallocated instead of returned?(nothing is reallocated.) After a robbed added kong, does the original pong remain in place? (yes)
- **R5 — Small remaining boundaries:** Starting balance is still unanswered (may the score ledger start at 0?).(yes, 0) How should equal-score players share/display ranks? (alphabetically) If Hex effects create nine or more identical tiles, does 根 continue as `floor(copyCount / 4)`? (yes) Confirm that 七对 permits any even multiplicity, or imposes the stated maximum of eight per tile type. (any even)

## Current status

**Q1–Q4 and R1–R5: resolved for the base rules.**

- Ordinary winning payment is capped for each payer and winner: an 8-point cap allows 24 total from three self-draw payers. Multiple discard winners are each paid by the discarder. Hex changes to these limits remain Q8/Q9.
- Missing-suit/花猪 checks exclude declared melds. 花猪 payment is the configured cap, or 16 when uncapped. Mutual 花猪 payments can be omitted because they cancel; this is only a ledger normalization.
- 查叫 pays only ready unwon recipients, using each recipient's own capped maximum score and excluding 自摸、杠上炮、杠上花、抢杠. 花猪 overrides 查叫 for its payer.
- At wall exhaustion, non-ready kong claimants return actual kong receipts to original payers; no reallocation. A robbed added kong leaves the original pong.
- Starting balance is 0. Scoreboard sorts by score, then alphabetically for equal scores. Roots use floor(copyCount / 4); 七对 allows any even multiplicity, within its 14-tile total.

No further base-rule clarification is requested at this stage. Card interactions and selection policy still need the Q5–Q13 answers; their details must not be inferred from ordinary scoring rules.

Q5–Q13 below still need answers. Current-round card lifetime is already confirmed; Q5 asks about exact selection timing/reset and tier policy rather than reopening that decision. No gameplay logic has been changed while recording these answers.

- **Q5 — Selection policy:** Is first selection once per game or each round, and does second trigger reset per round or game? Who chooses each tier, distribution, and is a common tier shared by all players? Simultaneous selection order, visibility, timeout and bot choices? Which draws count for the 16-tile boundary, including replacements and Cheat? What if removing tiles skips from 17 to 15? Refill a pool with fewer than two eligible unowned cards or choose another tier? Primitive currently rejects insufficient pools; no fallback invented. Cheat with empty hand and its interaction with replacement draws?
- **Q6 — Malfunction:** Remove with uniform sampling without replacement? Which wall segments are eligible? With fewer than two remaining, fail or remove all? Timing/order relative to simultaneous effects and last-16 selection? Generic Wall rejects impossible counts; this is not a card ruling.
- **Q7 — Double Wield:** Wording combines “first time” and “after each normal discard.” Exactly how many extra turns and within which window? Who activates it and when? Can claims interrupt it? How long does its self-draw-only restriction last? Keep consumption separate from ongoing restrictions; never enable unlimited turns by default.
- **Q8 — Collateral Damage:** Half of what amount (base amount, capped payment, critical payment)? Rounding, cap application, optional choice timing, additional transfer versus reallocation, other two players who have already won/left, multi-winner interactions?
- **Q9 — Jeweled Gauntlet:** Which win/rain-money settlements qualify? One roll per settlement, per payer, or per component? Can one settlement crit more than once? Multiply before/after caps and other cards? RNG primitive only defines independent 40% trials; no settlement policy exists.
- **Q10 — Blood River:** Exact repeated-win variant, hand retention, discard eligibility, win/claim priority and timing, interaction with players using ordinary rules and other cards? Must be specified before implementation.
- **Q11 — Echo:** Fewer than three eligible tiles: fail, copy fewer, or sample with replacement? Sample physical tiles without replacement? Concealed hand only? Are inserted tiles drawable immediately/later and which positions are eligible? Resolve before effect dispatch. Generic wall insertion alone does not decide this. ID factory must be unique across all hands, melds, discards and wall.
- **Q12 — Multiplayer policy:** When should bots fill empty seats, can friends replace them, bot/rejoin behavior after grace expiry, host transfer during play, disconnect timer/forfeit, abandoned-room cleanup and restart persistence? Initial lobby releases seats after 30 seconds, transfers host to first remaining seat and has no bots. Gameplay bot policy remains blocked.
- **Q13 — Exposure and operations:** Confirm public frontend URL, stable server hostname and exact allowed origins. Is invitation-only joining sufficient for your friends, or should we add a separate room password/invite secret? Currently invitation possession permits a new seat in a waiting room; existing seat ownership still requires the session/reconnection capability. Server restarts lose all rooms. Room IDs are not account authentication.

Provisional technical choices are reversible: isolated workspace, Node 22, no database, private lobby invitation access, 30-second reconnect, host transfer and ten actions/second/session. No unresolved scoring/variant decision has been silently implemented.
