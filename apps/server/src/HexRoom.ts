import { randomUUID, randomInt } from 'node:crypto';
import { Room, type Client } from '@colyseus/core';
import { CARDS, parseSettings, parseUsername, type PublicRoom, type Move, type Suit, type RoundView } from '@hex/shared';
import { createRound, type MahjongRound } from '@hex/mahjong-engine';
export const serverRng = { next: () => randomInt(0x100000000) / 0x100000000 };
function parseMove(value: unknown): Move {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_ACTION');
  const a = value as Record<string, unknown>;
  const exact = (...keys: string[]) => Object.keys(a).length === keys.length && keys.every(k => Object.hasOwn(a, k));
  if (a.type === 'declare' && exact('type', 'suit') && ['characters', 'bamboo', 'dots'].includes(a.suit as string)) return { type: 'declare', suit: a.suit as Suit };
  if ((a.type === 'discard' || a.type === 'kong') && exact('type', 'tileId') && typeof a.tileId === 'string' && a.tileId.length <= 64) return { type: a.type, tileId: a.tileId };
  if (a.type === 'choose_card' && exact('type', 'cardId') && CARDS.some(c => c.id === a.cardId)) return { type: 'choose_card', cardId: a.cardId as typeof CARDS[number]['id'] };
  if (a.type === 'collateral' && exact('type', 'use') && typeof a.use === 'boolean') return { type: 'collateral', use: a.use };
  if (a.type === 'win' && exact('type')) return { type: 'win' };
  if (a.type === 'claim' && exact('type', 'claim') && ['win', 'kong', 'pong', 'pass'].includes(a.claim as string)) return { type: 'claim', claim: a.claim as 'win' | 'kong' | 'pong' | 'pass' };
  throw Error('INVALID_ACTION');
}
const activeRoomCodes = new Set<string>();
export class HexRoom extends Room {
  maxClients = 4;
  protected botDelay = 1000;
  protected selectionTimeout = 30000;
  protected collateralTimeout = 15000;
  private decisionTimer: { clear(): void } | null = null;
  private decisionKey: string | null = null;
  private deadline: number | null = null;
  private snapshot!: PublicRoom;
  private round: MahjongRound | null = null;
  private botTimer: { clear(): void } | null = null;
  private readonly actions = new Map<string, { since: number; count: number }>();
  protected buildRound(dealer: number, number = 1, balances = [0, 0, 0, 0]): MahjongRound {
    return createRound(serverRng, randomUUID, dealer, this.snapshot.settings.scoreCap, number, balances, true, this.snapshot.settings.hexSelections ?? 2);
  }
  async onCreate(options: unknown) {
    const { username, ...roomOptions } = options as Record<string, unknown>;
    parseUsername(username);
    const settings = parseSettings(roomOptions);
    await this.setPrivate(true);
    if (activeRoomCodes.size >= 900000) throw Error('ROOM_CODES_EXHAUSTED');
    let code: string;
    do { code = String(randomInt(100000, 1000000)); } while (activeRoomCodes.has(code));
    activeRoomCodes.add(code);
    this.roomId = code;
    this.snapshot = { roomId: this.roomId, lifecycle: 'waiting', settings, hostId: null,
      seats: Array.from({ length: 4 }, (_, index) => ({ index, playerId: null, connected: false, bot: false })) };
    this.onMessage('ping', client => client.send('pong'));
    this.onMessage('action', (client, action: unknown) => {
      const now = Date.now(), budget = this.actions.get(client.sessionId) ?? { since: now, count: 0 };
      if (now - budget.since >= 1000) { budget.since = now; budget.count = 0; }
      this.actions.set(client.sessionId, budget);
      if (++budget.count > 20) { client.send('error', { code: 'RATE_LIMITED' }); return; }
      const seat = this.snapshot.seats.find(s => s.playerId === client.sessionId && s.connected && !s.bot);
      if (!seat) { client.send('error', { code: 'NOT_A_MEMBER' }); return; }
      try {
        if (!action || typeof action !== 'object' || Array.isArray(action)) throw Error('INVALID_ACTION');
        const a = action as Record<string, unknown>;
        const host = this.snapshot.hostId === client.sessionId;
        if (a.type === 'update_settings' && Object.keys(a).length === 2 && host && !this.round) {
          this.snapshot.settings = parseSettings(a.settings);
        } else if (a.type === 'start_game' && Object.keys(a).length === 1 && host && !this.round) {
          for (const s of this.snapshot.seats) if (!s.playerId) { s.playerId = `bot-${s.index}`; s.bot = true; }
          void this.lock();
          this.round = this.buildRound(seat.index);
        } else if (a.type === 'next_round' && Object.keys(a).length === 1 && host && this.round?.phase === 'settled' && this.round.number < this.snapshot.settings.rounds) {
          this.round = this.buildRound(this.round.nextDealer, this.round.number + 1, this.round.players.map(p => p.score));
        } else if (a.type === 'play' && Object.keys(a).length === 3 && typeof a.decisionId === 'string' && a.decisionId.length < 80 && this.round) {
          this.round.act(seat.index, parseMove(a.move), a.decisionId);
        } else throw Error('ACTION_NOT_ALLOWED');
        this.publish(); this.scheduleBot();
      } catch (error) {
        const code = error instanceof Error && ['INVALID_ACTION', 'ACTION_NOT_ALLOWED', 'STALE_ACTION'].includes(error.message) ? error.message : 'INVALID_ACTION';
        client.send('error', { code });
      }
    });
  }
  onJoin(client: Client, options: { username?: unknown } = {}) {
    const username = parseUsername(options.username);
    if (this.round) throw Error('ROOM_ALREADY_STARTED');
    const seat = this.snapshot.seats.find(s => s.playerId === null);
    if (!seat) throw Error('ROOM_UNAVAILABLE');
    seat.playerId = client.sessionId; seat.connected = true; seat.username = username || undefined;
    this.snapshot.hostId ??= client.sessionId;
    this.publish();
  }
  // Names are room-scoped recovery credentials for this friends-only game.
  async recoverUsername(value: unknown): Promise<string> {
    const name = parseUsername(value).toLowerCase();
    const matches = this.snapshot.seats.filter(s => !s.bot && s.username?.toLowerCase() === name);
    if (!name || matches.length !== 1) throw Error('NAME_NOT_UNIQUE');
    const seat = matches[0]!;
    const active = this.clients.find(c => c.sessionId === seat.playerId);
    if (active) active.leave(4010); // A device switch also replaces a suspended socket.
    for (let attempt = 0; attempt < 40; attempt++) {
      const entry = Object.entries(this._reconnections).find(([, [session]]) => session === seat.playerId);
      if (entry) return `${this.roomId}:${entry[0]}`;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw Error('RECOVERY_UNAVAILABLE');
  }
  private publish() {
    if (this.round) this.snapshot.lifecycle = this.round.phase === 'settled' ? this.round.number === this.snapshot.settings.rounds ? 'game_complete' : 'round_settlement' : this.round.phase === 'card_selection' ? 'card_selection' : 'active_play';
    this.broadcast('public', this.snapshot);
    // Never serialize the engine object; build each client's allowlisted private envelope.
    const round = this.round?.publicView() ?? null;
    this.syncDecisionTimer(round);
    for (const client of this.clients) {
      const seat = this.snapshot.seats.find(s => s.playerId === client.sessionId && !s.bot);
      if (!seat) continue;
      const you = this.round?.privateView(seat.index) ?? { seat: seat.index, hand: [], drawnId: null, concealedKongs: [], legal: { decisionId: '', declarations: [], discardIds: [], kongIds: [], canWin: false, claims: [], cardOffers: [], canChooseCollateral: false } };
      client.send('table', { room: this.snapshot, round, you });
    }
  }
  private syncDecisionTimer(view: RoundView | null) {
    const window = view?.selection ?? view?.collateral;
    const key = window && view ? `${view.phase}:${window.id}` : null;
    if (key !== this.decisionKey) {
      this.decisionTimer?.clear(); this.decisionTimer = null; this.decisionKey = key; this.deadline = null;
      if (key && view) {
        const delay = view.phase === 'card_selection' ? this.selectionTimeout : this.collateralTimeout;
        this.deadline = Date.now() + delay;
        this.decisionTimer = this.clock.setTimeout(() => {
          this.decisionTimer = null;
          // Phase identity survives reconnect; timeout can finish only this decision window.
          for (let seat = 0; seat < 4; seat++) {
            if (!this.round) break;
            const now = this.round.publicView(), current = now.selection ?? now.collateral;
            if (!current || `${now.phase}:${current.id}` !== key) break;
            const legal = this.round.legal(seat);
            if (legal.cardOffers.length || legal.canChooseCollateral) {
              const move = this.round.botMove(seat);
              if (move) this.round.act(seat, move, legal.decisionId);
            }
          }
          this.publish(); this.scheduleBot();
        }, delay);
      }
    }
    if (window) window.deadline = this.deadline;
  }
  private scheduleBot() {
    if (this.botTimer || !this.round || this.round.phase === 'settled') return;
    const seat = this.snapshot.seats.find(s => {
      if (!s.bot && !this.round!.isAutomatic(s.index)) return false;
      const legal = this.round!.legal(s.index);
      return legal.declarations.length || legal.discardIds.length || legal.claims.length || legal.cardOffers.length || legal.canChooseCollateral;
    });
    if (!seat) return;
    this.botTimer = this.clock.setTimeout(() => {
      this.botTimer = null;
      if (!this.round) return;
      const move = this.round.botMove(seat.index);
      if (move && (seat.bot || this.round.isAutomatic(seat.index))) this.round.act(seat.index, move, this.round.legal(seat.index).decisionId);
      this.publish(); this.scheduleBot();
    }, this.botDelay * (0.7 + Math.random() * 0.6));
  }
  async onLeave(client: Client, consented: boolean) {
    const seat = this.snapshot.seats.find(s => s.playerId === client.sessionId);
    if (!seat) return;
    seat.connected = false; this.publish();
    try {
      if (consented) throw Error('LEFT');
      await this.allowReconnection(client, 1800); seat.connected = true;
    } catch {
      seat.playerId = this.round ? `bot-${seat.index}` : null; seat.bot = !!this.round; seat.username = undefined;
      this.actions.delete(client.sessionId);
      if (this.snapshot.hostId === client.sessionId) this.snapshot.hostId = this.snapshot.seats.find(s => s.connected && !s.bot)?.playerId ?? null;
    }
    this.publish(); this.scheduleBot();
  }
  onDispose() { activeRoomCodes.delete(this.roomId); this.botTimer?.clear(); this.decisionTimer?.clear(); }
}
