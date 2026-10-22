import type { Tile, Rng, ScoreCap, Suit, Move, Claim, LegalMoves, RoundView, PrivateTable, Payment, TableEvent, Pattern, CardId, HexSelectionCount } from '@hex/shared';
import { randomIndex } from '@hex/shared';
import { selectionOffers, rollCritical, applyWallCard, copyInstance, sampleTiles } from '@hex/hextech-engine';
import { shuffle } from './random.js';
import { SUITS, fromIndex, sameType, scoreHand, readyScore, counts, chooseDiscard, shanten, typeIndex, type Meld, type WinScore } from './hand.js';
export interface Player { hand: Tile[]; melds: Meld[]; discards: Tile[]; missing: Suit | null; won: boolean; exited: boolean; score: number; drawnId: string | null; afterKong: boolean; cards: CardId[]; cheatArmed: boolean; handLocked: boolean; winCount: number }
interface Pending { tile: Tile; from: number; robKong: boolean; afterKong: boolean; meldIndex: number; allowBonus: boolean; options: Map<number, Claim[]>; replies: Map<number, Claim> }
interface DrawTask { kind: 'draw'; seat: number; replacement: boolean; bonus: boolean }
type Resume = DrawTask | { kind: 'initial' };
interface Selection { stage: 'initial' | 'last32' | 'last16'; tier: 'silver' | 'gold' | 'prismatic'; offers: Map<number, readonly [CardId, CardId]>; choices: Map<number, CardId>; resume: Resume }
interface Settlement { pending: Pending; winners: number[]; scores: Map<number, WinScore>; active: number[]; choices: Map<number, boolean>; eligible: number[] }
export interface HexRuntime { rng: Rng; id: () => string; selections?: boolean; selectionCount?: HexSelectionCount }
export interface RoundInput { hands: Tile[][]; wall: Tile[]; dealer: number; cap: ScoreCap; number?: number; balances?: number[]; hex?: HexRuntime }
export function createRound(rng: Rng, id: () => string, dealer: number, cap: ScoreCap, number = 1, balances: number[] = [0, 0, 0, 0], enableHex = false, selectionCount: HexSelectionCount = 2): MahjongRound {
  const tiles: Tile[] = [];
  for (let i = 0; i < 27; i++) for (let copy = 0; copy < 4; copy++) tiles.push({ id: id(), type: fromIndex(i) });
  const deck = shuffle(tiles, rng), hands: Tile[][] = [[], [], [], []];
  for (let n = 0; n < 13; n++) for (let offset = 0; offset < 4; offset++) hands[(dealer + offset) % 4]!.push(deck.shift()!);
  hands[dealer]!.push(deck.shift()!);
  return new MahjongRound({ hands, wall: deck, dealer, cap, number, balances, ...(enableHex ? { hex: { rng, id, selectionCount } } : {}) });
}
export class MahjongRound {
  readonly players: Player[];
  readonly wall: Tile[];
  readonly payments: Payment[] = [];
  readonly events: TableEvent[] = [];
  readonly resolved: Tile[] = [];
  readonly removed: Tile[] = [];
  private readonly winningTiles: Tile['type'][][] = [[], [], [], []];
  readonly dealer: number;
  readonly number: number;
  readonly cap: ScoreCap;
  phase: RoundView['phase'] = 'declare';
  turn: number;
  bonusTurn = false;
  endReason: 'three_winners' | 'wall_empty' | null = null;
  nextDealer: number;
  private seq = 1;
  private pending: Pending | null = null;
  private selection: Selection | null = null;
  private settlement: Settlement | null = null;
  private initialDone = false;
  private last16Done = false;
  private last32Done = false;
  private selectionsCompleted = 0;
  private readonly hex: HexRuntime | null;
  private readonly knownIds: Set<string>;
  private readonly noMoreArmed = new Set<number>();
  private readonly precision = new Map<number, { suit: Suit; triggers: number }>();
  private readonly torments: { owner: number; payers: number[]; remaining: number }[] = [];
  private firstWinners: number[] = [];
  private firstDiscarder: number | null = null;
  constructor(input: RoundInput) {
    if (input.hands.length !== 4 || input.dealer < 0 || input.dealer > 3 || !Number.isInteger(input.dealer)) throw Error('INVALID_ROUND');
    const ids = [...input.wall, ...input.hands.flat()].map(t => t.id);
    if (new Set(ids).size !== ids.length || ids.some(id => !id)) throw Error('DUPLICATE_TILE_ID');
    this.knownIds = new Set(ids); this.hex = input.hex ?? null;
    this.dealer = input.dealer; this.turn = input.dealer; this.nextDealer = input.dealer; this.cap = input.cap; this.number = input.number ?? 1;
    this.wall = [...input.wall];
    this.players = input.hands.map((hand, i) => ({ hand: [...hand], melds: [], discards: [], missing: null, won: false, exited: false, score: input.balances?.[i] ?? 0, drawnId: i === this.dealer ? hand.at(-1)?.id ?? null : null, afterKong: false, cards: [], cheatArmed: false, handLocked: false, winCount: 0 }));
    this.log('deal', this.dealer);
  }
  private freshId(): string {
    const id = this.hex!.id();
    if (!id || this.knownIds.has(id)) throw Error('DUPLICATE_TILE_ID');
    this.knownIds.add(id); return id;
  }
  private has(seat: number, card: CardId): boolean { return this.players[seat]!.cards.includes(card); }
  private missing(seat: number): Suit | null { return this.has(seat, 'colour-blind') ? null : this.players[seat]!.missing; }
  private log(kind: TableEvent['kind'], seat: number, tile: Tile['type'] | null = null) { this.events.push({ id: this.events.length + 1, kind, seat, tile }); }
  private logHex(effect: NonNullable<TableEvent['effect']>, seat: number, card?: CardId, count?: number) {
    this.events.push({ id: this.events.length + 1, kind: 'hex', seat, tile: null, effect, ...(card ? { card } : {}), ...(count !== undefined ? { count } : {}) });
  }
  private active(): number[] { return this.players.flatMap((p, i) => (p.won || p.exited) ? [] : [i]); }
  private change(phase: typeof this.phase, turn = this.turn) { this.phase = phase; this.turn = turn; this.seq++; }
  private transfer(from: number, to: number, amount: number, reason: Payment['reason'], fan = 0, patterns: Pattern[] = [], critical = false) {
    if (!Number.isSafeInteger(amount) || amount < 0 || from === to) throw Error('INVALID_PAYMENT');
    if (this.players[from]!.exited || this.players[to]!.exited) return 0;
    if (this.has(from, 'great-wall')) amount = Math.max(0, amount - 1);
    if (!amount) return 0;
    this.players[from]!.score -= amount; this.players[to]!.score += amount;
    this.payments.push({ id: this.payments.length + 1, from, to, amount, reason, fan, patterns, critical });
    return amount;
  }
  private critical(seat: number): boolean {
    const crit = !!this.hex && this.has(seat, 'jeweled-gauntlet') && rollCritical(this.hex.rng);
    if (crit) this.logHex('critical', seat, 'jeweled-gauntlet', 2);
    return crit;
  }
  private payKong(seat: number, payers: number[], amount: number) {
    const crit = this.critical(seat);
    for (const payer of payers) this.transfer(payer, seat, amount * (crit ? 2 : 1), 'kong', 0, [], crit);
    this.armTorment(seat, payers);
    this.opponentSuccess([seat]);
  }
  private winScore(seat: number, tile?: Tile, context: { selfDraw?: boolean; robKong?: boolean; afterKong?: boolean } = {}): WinScore | null {
    const p = this.players[seat]!;
    if (!p.missing || (tile && this.has(seat, 'double-wield'))) return null;
    const score = scoreHand(tile ? [...p.hand, tile] : p.hand, p.melds, this.missing(seat), this.cap,
      { ...context, selfDraw: !!context.selfDraw && !this.has(seat, 'double-wield') });
    return score && score.fan >= this.minimumFan() ? score : null;
  }
  private minimumFan() { return this.players.filter(p => p.cards.includes('fan-the-flames')).length; }
  private beginSelection(stage: Selection['stage'], resume: Resume) {
    if (stage === 'initial') this.initialDone = true; else if (stage === 'last32') this.last32Done = true; else this.last16Done = true;
    const seats = this.active();
    const result = selectionOffers(seats.map(seat => this.players[seat]!.cards), this.hex!.rng, stage);
    if (!result) { this.selectionsCompleted++; this.logHex('selection_skipped', this.dealer); this.resume(resume); return; }
    this.selection = { stage, tier: result.tier, offers: new Map(seats.map((seat, i) => [seat, result.offers[i]!])), choices: new Map(), resume };
    this.logHex('selection', this.dealer); this.change('card_selection');
  }
  private resolveSelection() {
    const selection = this.selection!;
    // Reveal every locked choice together; acquisition order is clockwise from dealer.
    const seats = [...selection.choices.keys()].sort((a, b) => (a - this.dealer + 4) % 4 - (b - this.dealer + 4) % 4);
    for (const seat of seats) this.players[seat]!.cards.push(selection.choices.get(seat)!);
    for (const seat of seats) {
      const card = selection.choices.get(seat)!, p = this.players[seat]!;
      this.logHex('acquired', seat, card);
      if (card === 'bathroom-break') { p.exited = true; p.drawnId = null; this.logHex('round_exit', seat, card); }
      if (card === 'loan-construction') {
        const returned = p.hand.filter(t => t.type.suit === p.missing);
        p.hand = p.hand.filter(t => t.type.suit !== p.missing);
        for (const tile of returned) this.wall.splice(randomIndex(this.wall.length + 1, this.hex!.rng), 0, tile);
        for (let n = 0; n < returned.length; n++) {
          const index = this.wall.findIndex(t => t.type.suit !== p.missing);
          if (index < 0) throw Error('INSUFFICIENT_NON_MISSING_TILES');
          p.hand.push(this.wall.splice(index, 1)[0]!);
        }
        if (seat === this.dealer) p.drawnId = p.hand.at(-1)?.id ?? null;
        this.logHex('hand_refilled', seat, card, returned.length);
      }
      if (card === 'no-more') this.noMoreArmed.add(seat);
      if (card === 'machine-wrath') this.machineWrath(seat);
      if (card === 'cheat') p.cheatArmed = true;
      const sources = card === 'troublemaker'
        ? this.players.flatMap(player => player.hand.filter(tile => tile.type.suit === player.missing))
        : card === 'hard-work' ? [...p.hand] : [...p.hand, ...p.melds.flatMap(m => m.tiles)];
      const result = applyWallCard(card, sources, this.wall, this.hex!.rng, () => this.freshId());
      this.removed.push(...result.removed);
      if (card === 'machine-malfunction') this.logHex('wall_removed', seat, card, result.removed.length);
      if (card === 'echo' || card === 'radiant-echo' || card === 'troublemaker' || card === 'hard-work') this.logHex('wall_copied', seat, card, result.inserted);
    }
    this.selectionsCompleted++; this.selection = null;
    if (this.active().length < 2) this.finish('three_winners'); else this.resume(selection.resume);
  }
  private resume(task: Resume) { if (task.kind === 'initial') this.change('discard', this.dealer); else this.draw(task); }
  legal(seat: number): LegalMoves {
    const p = this.players[seat];
    const legal: LegalMoves = { decisionId: `${this.number}:${this.seq}:${seat}`, declarations: [], discardIds: [], kongIds: [], canWin: false, claims: [], cardOffers: [], canChooseCollateral: false };
    if (!p || p.won || p.exited || this.phase === 'settled') return legal;
    if (this.phase === 'declare') { if (!p.missing) legal.declarations = [...SUITS]; return legal; }
    if (this.phase === 'card_selection') { if (!this.selection!.choices.has(seat)) legal.cardOffers = [...(this.selection!.offers.get(seat) ?? [])]; return legal; }
    if (this.phase === 'collateral') { legal.canChooseCollateral = this.settlement!.eligible.includes(seat) && !this.settlement!.choices.has(seat); return legal; }
    if (this.phase === 'claims') { if (!this.pending!.replies.has(seat)) legal.claims = this.pending!.options.get(seat) ?? []; return legal; }
    if (this.turn !== seat) return legal;
    const missing = this.missing(seat), forced = p.hand.filter(t => t.type.suit === missing);
    legal.discardIds = p.handLocked ? p.hand.filter(t => t.id === p.drawnId).map(t => t.id) : (forced.length ? forced : p.hand).map(t => t.id);
    legal.canWin = p.drawnId !== null && !!this.winScore(seat, undefined, { selfDraw: true, afterKong: p.afterKong });
    if (this.wall.length) {
      const c = counts(p.hand), seen = new Set<number>();
      for (const t of p.hand) {
        const index = typeIndex(t.type), added = p.melds.some(m => m.kind === 'pong' && sameType(m.tiles[0]!.type, t.type));
        if (p.handLocked && (t.id !== p.drawnId || !added)) continue;
        if (t.type.suit !== missing && !seen.has(index) && (added || (!p.handLocked && c[index]! >= 4))) { seen.add(index); legal.kongIds.push(t.id); }
      }
    }
    return legal;
  }
  act(seat: number, move: Move, decisionId: string): void {
    const legal = this.legal(seat);
    if (decisionId !== legal.decisionId) throw Error('STALE_ACTION');
    const p = this.players[seat];
    if (!p || p.won || p.exited || this.phase === 'settled') throw Error('ACTION_NOT_ALLOWED');
    if (move.type === 'declare' && legal.declarations.includes(move.suit)) {
      p.missing = move.suit; this.log('declare', seat);
      if (this.players.every(p => p.missing)) {
        if (this.hex && this.hex.selections !== false) this.beginSelection('initial', { kind: 'initial' });
        else this.change('discard', this.dealer);
      }
    } else if (move.type === 'choose_card' && legal.cardOffers.includes(move.cardId)) {
      this.selection!.choices.set(seat, move.cardId);
      if (this.selection!.choices.size === this.selection!.offers.size) this.resolveSelection();
    } else if (move.type === 'collateral' && legal.canChooseCollateral) {
      this.settlement!.choices.set(seat, move.use);
      if (this.settlement!.choices.size === this.settlement!.eligible.length) this.payDiscardWinners(this.settlement!);
    } else if (move.type === 'discard' && legal.discardIds.includes(move.tileId)) {
      const tile = p.hand.splice(p.hand.findIndex(t => t.id === move.tileId), 1)[0]!;
      p.drawnId = null; p.discards.push(tile); this.log('discard', seat, tile.type);
      if (this.noMoreArmed.delete(seat)) this.removeMatching(seat, 'no-more', tile);
      this.openClaims(tile, seat, false, p.afterKong);
    } else if (move.type === 'win' && legal.canWin) {
      const score = this.winScore(seat, undefined, { selfDraw: true, afterKong: p.afterKong })!, crit = this.critical(seat);
      for (const payer of this.active()) if (payer !== seat) this.transfer(payer, seat, score.points * (crit ? 2 : 1), 'win', score.fan, score.patterns, crit);
      const scoredTile = this.has(seat, 'blood-river') ? p.hand.find(t => t.id === p.drawnId)!.type : null;
      this.recordWinners([seat], null); this.completeWin(seat, true, p.hand.find(t => t.id === p.drawnId)!.type); this.log('win', seat, scoredTile);
      this.opponentSuccess([seat]);
      if (this.active().length < 2) this.finish('three_winners'); else this.advance(seat);
    } else if (move.type === 'kong' && legal.kongIds.includes(move.tileId)) {
      const tile = p.hand.find(t => t.id === move.tileId)!;
      const index = p.melds.findIndex(m => m.kind === 'pong' && sameType(m.tiles[0]!.type, tile.type));
      if (index >= 0) this.openClaims(tile, seat, true, false, index);
      else {
        p.melds.push({ kind: 'concealed_kong', tiles: this.take(seat, tile, 4), from: seat });
        this.payKong(seat, this.active().filter(i => i !== seat), 2);
        this.log('kong', seat); this.replacement(seat);
      }
    } else if (move.type === 'claim' && legal.claims.includes(move.claim)) {
      this.pending!.replies.set(seat, move.claim);
      if (this.pending!.replies.size === this.pending!.options.size) this.resolveClaims();
    } else throw Error('ACTION_NOT_ALLOWED');
  }
  private completeWin(seat: number, selfDraw: boolean, tile: Tile['type']) {
    this.winningTiles[seat]!.push({ ...tile });
    const p = this.players[seat]!; p.winCount++;
    if (this.has(seat, 'blood-river')) {
      if (!p.handLocked) { p.handLocked = true; this.logHex('hand_locked', seat, 'blood-river'); }
      if (selfDraw) {
        const index = p.hand.findIndex(t => t.id === p.drawnId);
        if (index < 0) throw Error('NO_DRAWN_TILE');
        this.resolved.push(p.hand.splice(index, 1)[0]!);
      }
      p.drawnId = null;
    } else p.won = true;
  }
  private take(seat: number, tile: Tile, amount: number): Tile[] {
    const hand = this.players[seat]!.hand, result: Tile[] = [];
    for (let i = hand.length - 1; i >= 0 && result.length < amount; i--) if (sameType(hand[i]!.type, tile.type)) result.push(hand.splice(i, 1)[0]!);
    if (result.length !== amount) throw Error('INVALID_MELD');
    return result;
  }
  private openClaims(tile: Tile, from: number, robKong: boolean, afterKong: boolean, meldIndex = -1) {
    const pending: Pending = { tile, from, robKong, afterKong, meldIndex, allowBonus: !robKong && !this.bonusTurn && this.has(from, 'double-wield'), options: new Map(), replies: new Map() };
    for (let step = 1; step < 4; step++) {
      const seat = (from + step) % 4, p = this.players[seat]!;
      if (p.won || p.exited) continue;
      const options: Claim[] = [];
      if (this.winScore(seat, tile, { robKong, afterKong })) options.push('win');
      if (!robKong && !p.handLocked && tile.type.suit !== this.missing(seat)) {
        const n = p.hand.filter(t => sameType(t.type, tile.type)).length;
        if (n >= 3 && this.wall.length) options.push('kong');
        if (n >= 2) options.push('pong');
      }
      if (options.length) { options.push('pass'); pending.options.set(seat, options); }
    }
    this.pending = pending; this.change('claims', from);
    if (!pending.options.size) this.resolveClaims();
  }
  private recordWinners(seats: number[], from: number | null) { if (!this.firstWinners.length) { this.firstWinners = [...seats]; this.firstDiscarder = from; } }
  private resolveClaims() {
    const q = this.pending!;
    const winners = [...q.replies].filter(([, claim]) => claim === 'win').map(([seat]) => seat).sort((a, b) => (a - q.from + 4) % 4 - (b - q.from + 4) % 4);
    if (winners.length) {
      if (q.allowBonus) this.logHex('bonus_interrupted', q.from, 'double-wield');
      const active = this.active(), scores = new Map(winners.map(seat => [seat, this.winScore(seat, q.tile, { robKong: q.robKong, afterKong: q.afterKong })!]));
      const eligible = winners.filter(seat => this.has(seat, 'collateral-damage') && scores.get(seat)!.fan >= 2 && active.some(i => i !== q.from && !winners.includes(i)));
      const settlement: Settlement = { pending: q, winners, scores, active, eligible, choices: new Map() };
      for (const seat of eligible) settlement.choices.set(seat, true);
      this.payDiscardWinners(settlement);
      return;
    }
    if (q.robKong) {
      const p = this.players[q.from]!, meld = p.melds[q.meldIndex]!;
      p.hand.splice(p.hand.findIndex(t => t.id === q.tile.id), 1); meld.tiles.push(q.tile); meld.kind = 'added_kong';
      this.payKong(q.from, this.active().filter(i => i !== q.from), 1);
      this.log('kong', q.from, q.tile.type); this.pending = null; this.replacement(q.from); return;
    }
    const claims = [...q.replies].filter(([, claim]) => claim === 'pong' || claim === 'kong').sort((a, b) => (a[1] === 'kong' ? 0 : 1) - (b[1] === 'kong' ? 0 : 1) || (a[0] - q.from + 4) % 4 - (b[0] - q.from + 4) % 4);
    this.pending = null;
    if (claims.length) {
      if (q.allowBonus) this.logHex('bonus_interrupted', q.from, 'double-wield');
      const [seat, kind] = claims[0]!, p = this.players[seat]!;
      this.players[q.from]!.discards.pop();
      p.melds.push({ kind: kind === 'kong' ? 'exposed_kong' : 'pong', tiles: [...this.take(seat, q.tile, kind === 'kong' ? 3 : 2), q.tile], from: q.from });
      p.drawnId = null; p.afterKong = false; this.bonusTurn = false; this.log(kind === 'kong' ? 'kong' : 'pong', seat, q.tile.type);
      if (kind === 'kong') { this.startTurn(seat); this.payKong(seat, [q.from], 2); this.replacement(seat); }
      else {
        this.startTurn(seat);
        if (this.has(seat, 'point-pong-kong')) { this.transfer(q.from, seat, 1, 'pong_card'); this.armTorment(seat, [q.from]); }
        if (this.has(q.from, 'willing-victim')) this.transfer(seat, q.from, 1, 'willing_victim');
        this.opponentSuccess([seat]);
        this.change('discard', seat);
      }
    } else if (this.wall.length && this.restartTurn(q.from)) {
      this.draw({ kind: 'draw', seat: q.from, replacement: false, bonus: false });
    } else if (q.allowBonus && this.wall.length) {
      this.logHex('extra_turn', q.from, 'double-wield'); this.draw({ kind: 'draw', seat: q.from, replacement: false, bonus: true });
    } else this.advance(q.from);
  }
  private restartTurn(seat: number): boolean {
    if (!this.hex) return false;
    for (const [card, chance] of [['grand-theft', 40], ['sneaky-theft', 25], ['petty-theft', 15]] as const) {
      if (this.has(seat, card) && randomIndex(1000000, this.hex.rng) < chance * 10000) {
        this.logHex('turn_restarted', seat, card); return true;
      }
    }
    return false;
  }
  private payDiscardWinners(s: Settlement) {
    const q = s.pending;
    for (const seat of s.winners) {
      const score = s.scores.get(seat)!, crit = this.critical(seat), amount = score.points * (crit ? 2 : 1);
      const paid = this.transfer(q.from, seat, amount, 'win', score.fan, score.patterns, crit);
      if (s.choices.get(seat)) for (const payer of s.active) if (payer !== q.from && !s.winners.includes(payer)) this.transfer(payer, seat, Math.floor(paid / 2), 'collateral');
      this.completeWin(seat, false, q.tile.type); this.log('win', seat, q.tile.type);
    }
    this.opponentSuccess(s.winners);
    this.recordWinners(s.winners, q.from);
    if (q.robKong) this.players[q.from]!.hand.splice(this.players[q.from]!.hand.findIndex(t => t.id === q.tile.id), 1);
    else this.players[q.from]!.discards.pop();
    this.resolved.push(q.tile); this.pending = null; this.settlement = null;
    if (this.active().length < 2) this.finish('three_winners'); else this.advance(q.from);
  }
  private removeMatching(seat: number, card: CardId, tile: Tile) {
    let count = 0;
    for (let i = this.wall.length - 1; i >= 0; i--) if (sameType(this.wall[i]!.type, tile.type)) {
      this.removed.push(this.wall.splice(i, 1)[0]!); count++;
    }
    this.logHex('wall_removed', seat, card, count);
  }
  private machineWrath(owner: number) {
    const candidates = this.active().filter(seat => seat !== owner).map(seat => ({
      tiles: this.players[seat]!.hand.filter(tile => this.wall.some(t => sameType(t.type, tile.type))),
    })).filter(candidate => candidate.tiles.length > 0);
    if (!candidates.length) { this.logHex('wall_removed', owner, 'machine-wrath', 0); return; }
    const target = candidates[randomIndex(candidates.length, this.hex!.rng)]!;
    this.removeMatching(owner, 'machine-wrath', target.tiles[randomIndex(target.tiles.length, this.hex!.rng)]!);
  }
  private opponentSuccess(actors: readonly number[]) {
    if (!this.hex) return;
    for (const actor of actors) for (const owner of this.active()) if (owner !== actor && this.has(owner, 'hard-work')) {
      if (randomIndex(1000000, this.hex.rng) >= 500000) continue;
      const source = sampleTiles(this.players[owner]!.hand, 1, this.hex.rng);
      const copies = source.map(tile => copyInstance(tile, () => this.freshId()));
      for (const tile of copies) this.wall.splice(randomIndex(this.wall.length + 1, this.hex.rng), 0, tile);
      this.logHex('wall_copied', owner, 'hard-work', copies.length);
    }
  }
  private armTorment(owner: number, payers: number[]) {
    if (this.has(owner, 'liandrys-torment')) this.torments.push({ owner, payers: [...payers], remaining: 2 });
  }
  private startTurn(owner: number) {
    if (!this.active().includes(owner)) return;
    for (const effect of this.torments) if (effect.owner === owner && effect.remaining > 0) {
      effect.remaining--;
      for (const payer of effect.payers) if (this.active().includes(payer)) this.transfer(payer, owner, 1, 'torment');
    }
  }
  private precisionDraw(owner: number, tile: Tile) {
    if (!this.has(owner, 'precision-strike') || !this.hex) return;
    const previous = this.precision.get(owner);
    const state = { suit: tile.type.suit, triggers: previous?.triggers ?? 0 };
    if (previous?.suit === tile.type.suit && state.triggers < 2) {
      state.triggers++;
      const payers = this.active().filter(seat => seat !== owner);
      for (const payer of payers) this.transfer(payer, owner, 1, 'precision_strike');
    }
    this.precision.set(owner, state);
  }
  private replacement(seat: number) { this.draw({ kind: 'draw', seat, replacement: true, bonus: this.bonusTurn }); }
  private draw(task: DrawTask) {
    if (!this.wall.length) { this.finish('wall_empty'); return; }
    if (this.hex && this.hex.selections !== false && this.hex.selectionCount === 3 && !this.last32Done && this.wall.length <= 32) { this.beginSelection('last32', task); return; }
    if (this.hex && this.hex.selections !== false && (this.hex.selectionCount ?? 2) >= 2 && !this.last16Done && this.wall.length <= 16) { this.beginSelection('last16', task); return; }
    if (this.players[task.seat]!.exited) { this.advance(task.seat); return; }
    const p = this.players[task.seat]!;
    if (!task.replacement) this.startTurn(task.seat);
    let tile: Tile;
    if (p.cheatArmed && this.hex) {
      p.cheatArmed = false;
      const sources = [...p.hand, ...p.melds.flatMap(m => m.tiles)];
      if (sources.length) { tile = copyInstance(sources[randomIndex(sources.length, this.hex.rng)]!, () => this.freshId()); this.logHex('cheat_draw', task.seat, 'cheat'); }
      else tile = this.wall.shift()!;
    } else tile = this.wall.shift()!;
    p.hand.push(tile); p.drawnId = tile.id; p.afterKong = task.replacement; this.bonusTurn = task.bonus;
    this.precisionDraw(task.seat, tile);
    this.log('draw', task.seat); this.change('discard', task.seat);
  }
  private advance(from: number) {
    if (!this.wall.length) { this.finish('wall_empty'); return; }
    let seat = (from + 1) % 4;
    while (this.players[seat]!.won || this.players[seat]!.exited) seat = (seat + 1) % 4;
    this.draw({ kind: 'draw', seat, replacement: false, bonus: false });
  }
  private finish(reason: 'three_winners' | 'wall_empty') {
    this.pending = null; this.selection = null; this.settlement = null; this.endReason = reason;
    this.nextDealer = this.firstWinners.length > 1 ? this.firstDiscarder! : this.firstWinners[0] ?? this.dealer;
    if (reason === 'wall_empty') {
      const active = this.active();
      const pig = new Set(active.filter(i => this.players[i]!.hand.some(t => t.type.suit === this.missing(i))));
      const ready = new Map<number, WinScore>();
      for (const i of active) {
        const p = this.players[i]!;
        const score = !pig.has(i) && p.missing ? readyScore(p.hand, p.melds, this.missing(i), this.cap) : null;
        if (score) ready.set(i, score);
      }
      for (const from of pig) for (const to of active) if (!pig.has(to)) this.transfer(from, to, this.cap === 'uncapped' ? 16 : this.cap, 'flower_pig');
      for (const from of active) if (!pig.has(from) && !ready.has(from)) for (const [to, score] of ready) this.transfer(from, to, score.points, 'not_ready', score.fan, score.patterns);
      for (const entry of [...this.payments]) if (entry.reason === 'kong' && active.includes(entry.to) && !ready.has(entry.to)) this.transfer(entry.to, entry.from, entry.amount, 'refund');
    }
    this.change('settled'); this.log('settled', this.turn);
  }
  publicView(): RoundView {
    return { number: this.number, phase: this.phase, turn: this.turn, dealer: this.dealer, wallRemaining: this.wall.length, bonusTurn: this.bonusTurn, selectionsCompleted: this.selectionsCompleted,
      selection: this.selection ? { id: `${this.number}:${this.seq}`, stage: this.selection.stage, tier: this.selection.tier, pendingSeats: [...this.selection.offers.keys()].filter(i => !this.selection!.choices.has(i)), deadline: null } : null,
      collateral: this.settlement ? { id: `${this.number}:${this.seq}`, pendingSeats: this.settlement.eligible.filter(i => !this.settlement!.choices.has(i)), deadline: null } : null,
      players: this.players.map((p, seat) => ({ seat, winningTiles: this.winningTiles[seat]!.map(tile => ({ ...tile })), missingSuit: p.missing, handCount: p.hand.length, revealedHand: this.phase === 'settled' ? p.hand.map(t => ({ ...t.type })) : null, won: p.won, exited: p.exited, score: p.score, cards: [...p.cards], winCount: p.winCount, handLocked: p.handLocked,
        melds: p.melds.map(m => ({ kind: m.kind, tiles: m.kind === 'concealed_kong' && this.phase !== 'settled' ? [] : m.tiles.map(t => ({ ...t.type })) })), discards: p.discards.map(t => ({ ...t.type })) })),
      pending: this.pending ? { seat: this.pending.from, tile: { ...this.pending.tile.type }, robKong: this.pending.robKong } : null,
      payments: this.payments.map(p => ({ ...p, patterns: p.patterns.map(pattern => ({ ...pattern })) })), events: this.events.slice(-100).map(e => ({ ...e, tile: e.tile ? { ...e.tile } : null })), endReason: this.endReason, nextDealer: this.nextDealer };
  }
  privateView(seat: number): PrivateTable {
    const p = this.players[seat]!;
    return { seat, hand: p.hand.map(t => ({ id: t.id, type: { ...t.type } })), drawnId: p.drawnId, concealedKongs: p.melds.flatMap((m, meldIndex) => m.kind === 'concealed_kong' ? [{ meldIndex, tile: { ...m.tiles[0]!.type } }] : []), legal: this.legal(seat) };
  }
  isAutomatic(seat: number): boolean {
    const p = this.players[seat];
    return !!p && p.handLocked && this.has(seat, 'blood-river') && !p.exited && !p.won;
  }
  botMove(seat: number): Move | null {
    const legal = this.legal(seat), p = this.players[seat]!;
    if (legal.cardOffers.length) return { type: 'choose_card', cardId: legal.cardOffers[randomIndex(legal.cardOffers.length, this.hex!.rng)]! };
    if (legal.canChooseCollateral) return { type: 'collateral', use: true };
    if (legal.declarations.length) {
      const suit = [...SUITS].sort((a, b) => p.hand.filter(t => t.type.suit === a).length - p.hand.filter(t => t.type.suit === b).length)[0]!;
      return { type: 'declare', suit };
    }
    if (legal.canWin) return { type: 'win' };
    if (legal.claims.length) {
      if (legal.claims.includes('win')) return { type: 'claim', claim: 'win' };
      if (legal.claims.includes('kong')) return { type: 'claim', claim: 'kong' };
      if (legal.claims.includes('pong')) {
        const tile = this.pending!.tile, remaining = [...p.hand], missing = this.missing(seat);
        for (let i = 0; i < 2; i++) remaining.splice(remaining.findIndex(t => sameType(t.type, tile.type)), 1);
        const forced = remaining.filter(t => t.type.suit === missing), candidates = forced.length ? forced : remaining;
        const id = chooseDiscard(remaining, p.melds.length + 1, missing, candidates.map(t => t.id));
        if (shanten(remaining.filter(t => t.id !== id && t.type.suit !== missing), p.melds.length + 1) <= shanten(p.hand.filter(t => t.type.suit !== missing), p.melds.length)) return { type: 'claim', claim: 'pong' };
      }
      return { type: 'claim', claim: 'pass' };
    }
    if (legal.kongIds.length) return { type: 'kong', tileId: legal.kongIds[0]! };
    if (legal.discardIds.length) return { type: 'discard', tileId: p.handLocked ? legal.discardIds[0]! : chooseDiscard(p.hand, p.melds.length, this.missing(seat), legal.discardIds) };
    return null;
  }
}
