export const SCORE_CAPS = [8, 16, 32, 'uncapped'] as const;
export const ROUND_COUNTS = [8, 16] as const;
export type ScoreCap = typeof SCORE_CAPS[number];
export interface RoomSettings { scoreCap: ScoreCap; rounds: typeof ROUND_COUNTS[number] }
export function parseSettings(input: unknown): RoomSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_SETTINGS');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(k => k !== 'scoreCap' && k !== 'rounds') ||
      !SCORE_CAPS.includes(value.scoreCap as ScoreCap) || !ROUND_COUNTS.includes(value.rounds as 8 | 16)) throw new Error('INVALID_SETTINGS');
  return { scoreCap: value.scoreCap as ScoreCap, rounds: value.rounds as 8 | 16 };
}
export type Lifecycle = 'waiting' | 'card_selection' | 'active_play' | 'round_settlement' | 'game_complete';
export type SelectionTrigger = 'before_dealer_first_discard' | 'before_draw_with_16_remaining';
export type Suit = 'characters' | 'bamboo' | 'dots';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface TileType { readonly suit: Suit; readonly rank: Rank }
export interface Tile { readonly id: string; readonly type: TileType }
export interface Rng { next(): number }
export function randomIndex(length: number, rng: Rng): number {
  if (!Number.isSafeInteger(length) || length < 1) throw new Error('INVALID_LENGTH');
  const n = rng.next();
  if (!Number.isFinite(n) || n < 0 || n >= 1) throw new Error('INVALID_RNG');
  return Math.floor(n * length);
}
export type Tier = 'silver' | 'gold' | 'prismatic';
export type CardId = 'great-wall' | 'petty-theft' | 'sneaky-theft' | 'grand-theft' | 'radiant-echo' | 'bathroom-break' | 'loan-construction' | 'fan-the-flames' | 'cheat' | 'machine-malfunction' | 'point-pong-kong' | 'double-wield' | 'collateral-damage' | 'colour-blind' | 'jeweled-gauntlet' | 'blood-river' | 'echo';
export interface Card {
  readonly id: CardId; readonly tier: Tier;
  readonly name: { readonly en: string; readonly zh: string };
  readonly description: { readonly en: string; readonly zh: string };
  readonly selectionStage?: 'initial' | 'last16';
  readonly effect: { readonly trigger: string; readonly status: 'specified' | 'blocked' | 'implemented'; readonly questions: readonly string[] };
}
export const CARDS = [
  { id:'bathroom-break', tier:'silver', selectionStage:'last16', name:{en:'Bathroom Break',zh:'上厕所'}, description:{en:'Second selection only. Leave this round immediately; keep earlier transfers and take no part in any later payments.',zh:'仅第二次选择可获得。直接离开本轮游戏，保留此前流水，之后所有收付款与你无关。'},effect:{trigger:'selection',status:'implemented',questions:[]} },
  { id:'loan-construction', tier:'gold', selectionStage:'initial', name:{en:'Loan Construction',zh:'贷款建设'}, description:{en:'First selection only. Return every concealed tile of your declared missing suit to random wall positions, then refill in wall order, skipping all missing-suit tiles.',zh:'仅首次选择可获得。将手中全部定缺花色牌放回牌墙随机位置，再按牌墙顺序跳过定缺牌补齐，保证清缺。'},effect:{trigger:'selection',status:'implemented',questions:[]} },
  { id:'fan-the-flames', tier:'gold', name:{en:'Fan the Flames',zh:'煽风点火'}, description:{en:'For the rest of this round, every player, including you, needs at least 2 fan to win.',zh:'本轮剩余时间内，所有玩家（包括自己）必须至少2番才能胡牌；重复获得不叠加。'},effect:{trigger:'win_validation',status:'implemented',questions:[]} },
  { id:'cheat', tier:'silver', name:{en:'Cheat',zh:'作弊'}, description:{en:'Your next draw copies a randomly selected owned concealed or meld tile instead of drawing from the wall.',zh:'下次摸牌随机复制一张持有牌（手牌或副露），不消耗牌墙。'}, effect:{trigger:'next_draw',status:'implemented',questions:[]} },
  { id:'machine-malfunction', tier:'silver', name:{en:'Mahjong Machine Malfunction',zh:'麻将机故障'}, description:{en:'Randomly remove two tiles from the wall.',zh:'从牌墙随机移除两张牌。'},effect:{trigger:'selection',status:'implemented',questions:[]} },
  { id:'point-pong-kong', tier:'silver', name:{en:'Point-to-Pong-to-Kong',zh:'指碰为杠'}, description:{en:'On a successful pong claim, collect 1 point from the discarder.',zh:'每次成功碰牌，向出牌者收取1点。'},effect:{trigger:'successful_pong',status:'implemented',questions:[]} },
  { id:'double-wield', tier:'prismatic', name:{en:'Double Wield',zh:'双刀流'}, description:{en:'After each primary-turn discard, gain one bonus turn unless another player claims it. Bonus turns cannot chain. Self-draw wins only, without the usual self-draw fan, for this round.',zh:'每个主回合出牌后，若无人成功认领该弃牌，获得一次额外回合；额外回合不再触发。本轮只能自摸，且不加自摸番。'},effect:{trigger:'normal_discard',status:'implemented',questions:[]} },
  { id:'collateral-damage', tier:'gold', name:{en:'Collateral Damage',zh:'连带伤害'}, description:{en:'On a discard win worth at least two fan, automatically collect half the points from each other non-discarding player. Additional payments are half the final capped/critical discard payment, rounded down; retired players and co-winners are exempt.',zh:'至少两番的点炮胡牌时，强制向其他非放炮玩家各收取一半分数；按封顶及暴击后的放炮付款向下取半，已退场者及同次胡牌者除外。'},effect:{trigger:'discard_win_at_least_two_fan',status:'implemented',questions:[]} },
  { id:'colour-blind', tier:'gold', name:{en:'Colour Blind',zh:'色盲'}, description:{en:'Ignore missing-suit discards and flower-pig checks; may win with all three suits. Other win conditions still apply.',zh:'无需优先打定缺，免查花猪，可三门胡牌；其他胡牌条件仍适用。'},effect:{trigger:'win_validation_and_flower_pig',status:'implemented',questions:[]} },
  { id:'jeweled-gauntlet', tier:'gold', name:{en:'Jeweled Gauntlet',zh:'珠光护手'}, description:{en:'Each win or kong settlement has one 40% chance to double all its payer amounts after the ordinary cap. No criticals on collateral, penalties or refunds.',zh:'每次胡牌或杠钱结算独立有40%概率使所有付款翻倍，可突破普通封顶；连带、罚分及退款不再暴击。'},effect:{trigger:'eligible_settlement',status:'implemented',questions:[]} },
  { id:'blood-river', tier:'prismatic', name:{en:'Blood River',zh:'血流成河'}, description:{en:'After your first win, retain a locked hand and keep drawing, winning or discarding the new draw. After the first win, automatically win, otherwise add to existing pongs for kongs, otherwise discard the draw. Those roots count on later wins.',zh:'首次胡牌后锁定原手牌，继续摸牌、胡牌或打出新摸的牌；首次胡牌后自动优先胡牌，其次加杠，否则打出新摸牌；新增的根计入后续胡牌。'},effect:{trigger:'game_rules',status:'implemented',questions:[]} },
  { id:'echo', tier:'gold', name:{en:'Echo',zh:'余音绕梁'}, description:{en:'Copy up to three randomly selected owned tiles with fresh IDs into random wall positions. The copies can be drawn by anyone.',zh:'随机复制至多三张持有的牌，赋予全新ID插入牌墙；任何玩家均可摸到。'},effect:{trigger:'selection',status:'implemented',questions:[]} },
  { id:'great-wall', tier:'silver', name:{en:'Great Wall',zh:'长城'}, description:{en:'Reduce every outgoing payment by 1, to a minimum of zero.',zh:'所有事件中，每笔对外付款减免1分，最低为0。'}, effect:{trigger:'payment',status:'implemented',questions:[]} },
  { id:'petty-theft', tier:'silver', name:{en:'Petty Theft',zh:'小偷小摸'}, description:{en:'After each unclaimed discard, a 15% chance to draw and restart your turn. Can repeat.',zh:'每次弃牌无人认领后，15%概率再摸牌并重新开始回合，可连续触发。'}, effect:{trigger:'unclaimed_discard',status:'implemented',questions:[]} },
  { id:'sneaky-theft', tier:'gold', name:{en:'Sneaky Theft',zh:'偷偷摸摸'}, description:{en:'After each unclaimed discard, a 25% chance to draw and restart your turn. Can repeat.',zh:'每次弃牌无人认领后，25%概率再摸牌并重新开始回合，可连续触发。'}, effect:{trigger:'unclaimed_discard',status:'implemented',questions:[]} },
  { id:'grand-theft', tier:'prismatic', name:{en:'Grand Theft',zh:'大偷大摸'}, description:{en:'After each unclaimed discard, a 45% chance to draw and restart your turn. Can repeat.',zh:'每次弃牌无人认领后，45%概率再摸牌并重新开始回合，可连续触发。'}, effect:{trigger:'unclaimed_discard',status:'implemented',questions:[]} },
  { id:'radiant-echo', tier:'prismatic', name:{en:'Radiant Echo',zh:'璀璨回响'}, description:{en:'Sample owned tiles 5 times with replacement; insert fresh copies into random wall positions.',zh:'从持有牌中有放回随机抽取5次，各复制一张全新ID牌插入牌墙随机位置。'}, effect:{trigger:'selection',status:'implemented',questions:[]} },
] as const satisfies readonly Card[];
export interface Seat { index: number; playerId: string | null; connected: boolean; bot: boolean }
export interface PublicRoom { roomId: string; lifecycle: Lifecycle; settings: RoomSettings; seats: Seat[]; hostId: string | null }
export interface PrivatePlayer { hand: readonly Tile[]; offers: readonly CardId[]; selected: readonly CardId[] }
export type ClientAction = { type: 'start_game' } | { type: 'next_round' } | { type: 'play'; decisionId: string; move: Move };
// extraTurnConsumed resets on a new primary turn, never on its bonus turn.
export interface DoubleWieldState { extraTurnConsumed: boolean; selfDrawOnly: boolean; suppressSelfDrawDoubling: boolean }

// Authoritative table protocol; offers and decisions are private to each recipient.
export type MeldKind = 'pong' | 'exposed_kong' | 'added_kong' | 'concealed_kong';
export type RoundPhase = 'declare' | 'card_selection' | 'discard' | 'claims' | 'collateral' | 'settled';
export type Claim = 'win' | 'kong' | 'pong' | 'pass';
export type Move = { type: 'declare'; suit: Suit } | { type: 'discard'; tileId: string }
  | { type: 'win' } | { type: 'kong'; tileId: string } | { type: 'claim'; claim: Claim }
  | { type: 'choose_card'; cardId: CardId } | { type: 'collateral'; use: boolean };
export interface Pattern { key: 'all_pongs' | 'pure_suit' | 'seven_pairs' | 'pure_seven_pairs' | 'roots' | 'single_wait' | 'self_draw' | 'rob_kong' | 'after_kong'; fan: number }
export interface Payment { id: number; from: number; to: number; amount: number; reason: 'win' | 'kong' | 'pong_card' | 'collateral' | 'flower_pig' | 'not_ready' | 'refund'; fan: number; patterns: Pattern[]; critical: boolean }
export interface TableEvent { id: number; kind: 'deal' | 'declare' | 'discard' | 'pong' | 'kong' | 'win' | 'pass' | 'draw' | 'settled' | 'hex'; seat: number; tile: TileType | null; effect?: 'selection' | 'acquired' | 'selection_skipped' | 'wall_removed' | 'wall_copied' | 'cheat_draw' | 'extra_turn' | 'bonus_interrupted' | 'hand_locked' | 'critical' | 'round_exit' | 'hand_refilled' | 'turn_restarted'; card?: CardId; count?: number }
export interface RoundPlayerView { seat: number; missingSuit: Suit | null; handCount: number; revealedHand: TileType[] | null; won: boolean; exited: boolean; score: number; cards: CardId[]; winCount: number; handLocked: boolean; melds: { kind: MeldKind; tiles: TileType[] }[]; discards: TileType[] }
export interface RoundView { number: number; phase: RoundPhase; turn: number; dealer: number; wallRemaining: number; players: RoundPlayerView[]; pending: { seat: number; tile: TileType; robKong: boolean } | null; payments: Payment[]; events: TableEvent[]; endReason: 'three_winners' | 'wall_empty' | null; nextDealer: number; bonusTurn: boolean; selectionsCompleted: number; selection: { id: string; stage: 'initial' | 'last16'; tier: Tier; pendingSeats: number[]; deadline: number | null } | null; collateral: { id: string; pendingSeats: number[]; deadline: number | null } | null }
export interface LegalMoves { decisionId: string; declarations: Suit[]; discardIds: string[]; kongIds: string[]; canWin: boolean; claims: Claim[]; cardOffers: CardId[]; canChooseCollateral: boolean }
export interface PrivateTable { seat: number; hand: Tile[]; drawnId: string | null; concealedKongs: { meldIndex: number; tile: TileType }[]; legal: LegalMoves }
export interface TableSnapshot { room: PublicRoom; round: RoundView | null; you: PrivateTable }
