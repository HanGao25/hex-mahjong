import { createRound, type MahjongRound } from '@hex/mahjong-engine';
import { parseSettings, type ClientAction, type PublicRoom, type Rng, type RoomSettings, type RoundView, type TableSnapshot } from '@hex/shared';
export interface BotGameEnvironment {
  rng: Rng;
  id: () => string;
  now: () => number;
  later: (callback: () => void, milliseconds: number) => () => void;
  snapshot: (snapshot: TableSnapshot) => void;
  error: (code: string) => void;
}
// Solo-only orchestration. Network rooms continue to use the authoritative Colyseus server.
export class BotGame {
  private readonly room: PublicRoom;
  private round: MahjongRound | null = null;
  private stopBot: (() => void) | null = null;
  private stopDecision: (() => void) | null = null;
  private decisionKey: string | null = null;
  private deadline: number | null = null;
  private disposed = false;
  constructor(settings: RoomSettings, private readonly env: BotGameEnvironment) {
    this.room = { roomId: env.id(), lifecycle: 'waiting', settings: parseSettings(settings), hostId: 'local-player',
      seats: Array.from({ length: 4 }, (_, index) => ({ index, playerId: index ? `bot-${index}` : 'local-player', connected: !index, bot: !!index })) };
    this.publish();
  }
  receive(action: ClientAction): void {
    if (this.disposed) return;
    try {
      if (action.type === 'start_game' && !this.round) this.round = createRound(this.env.rng, this.env.id, 0, this.room.settings.scoreCap, 1, [0, 0, 0, 0], true, this.room.settings.hexSelections ?? 2);
      else if (action.type === 'next_round' && this.round?.phase === 'settled' && this.round.number < this.room.settings.rounds) {
        this.round = createRound(this.env.rng, this.env.id, this.round.nextDealer, this.room.settings.scoreCap, this.round.number + 1, this.round.players.map(p => p.score), true, this.room.settings.hexSelections ?? 2);
      } else if (action.type === 'play' && this.round) this.round.act(0, action.move, action.decisionId);
      else throw Error('ACTION_NOT_ALLOWED');
      this.publish(); this.scheduleBot();
    } catch (error) { this.env.error(error instanceof Error && error.message === 'STALE_ACTION' ? 'STALE_ACTION' : 'ACTION_NOT_ALLOWED'); }
  }
  private publish(): void {
    if (this.disposed) return;
    const round = this.round?.publicView() ?? null;
    if (round) this.room.lifecycle = round.phase === 'settled' ? round.number === this.room.settings.rounds ? 'game_complete' : 'round_settlement' : round.phase === 'card_selection' ? 'card_selection' : 'active_play';
    this.syncDecision(round);
    const you = this.round?.privateView(0) ?? { seat: 0, hand: [], drawnId: null, concealedKongs: [], legal: { decisionId: '', declarations: [], discardIds: [], kongIds: [], canWin: false, claims: [], cardOffers: [], canChooseCollateral: false } };
    this.env.snapshot({ room: { ...this.room, settings: { ...this.room.settings }, seats: this.room.seats.map(s => ({ ...s })) }, round, you });
  }
  private syncDecision(round: RoundView | null): void {
    const window = round?.selection ?? round?.collateral;
    const key = window && round ? `${round.phase}:${window.id}` : null;
    if (key !== this.decisionKey) {
      this.stopDecision?.(); this.stopDecision = null; this.decisionKey = key; this.deadline = null;
      if (key && round) {
        const delay = round.phase === 'card_selection' ? 30000 : 15000;
        this.deadline = this.env.now() + delay;
        this.stopDecision = this.env.later(() => {
          this.stopDecision = null;
          for (let seat = 0; seat < 4; seat++) {
            if (!this.round || this.disposed) return;
            const view = this.round.publicView(), current = view.selection ?? view.collateral;
            if (!current || `${view.phase}:${current.id}` !== key) break;
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
  private scheduleBot(): void {
    if (this.disposed || this.stopBot || !this.round || this.round.phase === 'settled') return;
    const seat = [0, 1, 2, 3].find(seat => {
      if (seat === 0 && !this.round!.isAutomatic(seat)) return false;
      const legal = this.round!.legal(seat);
      return legal.declarations.length || legal.discardIds.length || legal.claims.length || legal.cardOffers.length || legal.canChooseCollateral;
    });
    if (seat === undefined) return;
    this.stopBot = this.env.later(() => {
      this.stopBot = null;
      if (this.disposed || !this.round) return;
      const move = this.round.botMove(seat);
      if (move) this.round.act(seat, move, this.round.legal(seat).decisionId);
      this.publish(); this.scheduleBot();
    }, 700 + Math.random() * 600);
  }
  dispose(): void { this.disposed = true; this.stopBot?.(); this.stopDecision?.(); this.stopBot = null; this.stopDecision = null; }
}
