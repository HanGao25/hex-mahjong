# Hex popup statistics

All values cover the current round. Only public aggregate values are exposed.

| Cards | Statistics |
| --- | --- |
| Precision Strike | Triggers, remaining triggers, actual points collected |
| Cheat, No More | Next-use effect pending; No More also shows tiles removed |
| Machine Malfunction, Machine Wrath | Tiles removed |
| Point-to-Pong-to-Kong, Willing Victim | Triggers, actual points collected |
| Great Wall | Actual points saved |
| Theft series, Double Wield | Extra turns awarded by each card |
| Bathroom Break | Exit status |
| Collateral Damage | Actual collateral collected |
| Colour Blind | Wins while holding the card |
| Loan Construction | Tiles exchanged |
| Fan the Flames | Current table-wide minimum fan, including exited holders |
| Jeweled Gauntlet | Eligible settlements rolled, critical settlements |
| Copying cards | Tiles copied, including acquisition |
| Liandry’s Torment | Actual points collected; pending one-point payment attempts |
| Blood River | Wins this round; active locked automatic play |

Zero-payment triggers still count, but add zero to collected points. Great Wall
counts real reductions after exit freezes. Pending Torment payments exclude
inactive participants and are shown before reductions. Collection totals are
historical, even if later refunded. Colour Blind wins do not imply the exemption
was necessary. Blood River automatic status stops at exit or settlement.

## Future cards

The shared cardStatistics snapshot maps card IDs to extensible numeric metric
records. Add server values in MahjongRound.statistics(), using metric() for
cumulative effects. Add localized descriptors in apps/web/src/hex-card-statistics.ts.
Its exhaustive Record<CardId, ...> registry requires an explicit review of each
new card; use an empty array when no statistic is useful.

The generic popup accepts any number of rows; no per-card rendering changes are
needed. Boolean descriptors render localized Yes/No. Missing snapshot statistics
render no rows. Never expose private tiles or derive totals from truncated logs.
The previous cardStats field remains for compatibility.
