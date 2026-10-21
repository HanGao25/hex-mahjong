import { describe, expect, it } from 'vitest';
import { MahjongRound, createRound } from '../src/index.js';
import { applyWallCard, dueSelection } from '@hex/hextech-engine';
import { CARDS } from '@hex/shared';
import type { Tile, Suit, Move, CardId, Rng, ScoreCap } from '@hex/shared';
let serial = 0;
const tiles = (suit: Suit, ranks: string): Tile[] => [...ranks].map(rank => ({ id: `tile-${++serial}`, type: { suit, rank: Number(rank) as Tile['type']['rank'] } }));
const c = (r: string) => tiles('characters', r), b = (r: string) => tiles('bamboo', r), d = (r: string) => tiles('dots', r);
const wait = () => [...c('123456789'), ...b('1235')];
const full = () => [...c('123456789'), ...b('12355')];
const id = () => `copy-${++serial}`;
const rng = (n: number): Rng => ({ next: () => n });
function offerRng(wanted: CardId, stage: 'initial' | 'last16' = 'initial'): Rng {
 const card = CARDS.find(c => c.id === wanted)!;
 const pool = CARDS.filter(c => c.tier === card.tier && (!('selectionStage' in c) || c.selectionStage === stage));
 let n = 0;
 return { next: () => { n++; return n === 1 ? (['silver','gold','prismatic'].indexOf(card.tier)+.1)/3 : n<=9 ? (n%2===0 ? (pool.findIndex(c=>c.id===wanted)+.1)/pool.length : 0) : .99; } };
}
function round(hands: Tile[][] = [full(), wait(), wait(), wait()], wall: Tile[] = d('99999999999999999999'), random = rng(.99), selections = false, cap: ScoreCap = 8) {
  return new MahjongRound({ hands, wall, dealer: 0, cap, hex: { rng: random, id, selections } });
}
function act(game: MahjongRound, seat: number, move: Move) { game.act(seat, move, game.legal(seat).decisionId); }
function declare(game: MahjongRound) { for (let seat = 0; seat < 4; seat++) act(game, seat, { type: 'declare', suit: 'dots' }); }
function pass(game: MahjongRound) { for (let i = 0; i < 4 && game.phase === 'claims'; i++) if (game.legal(i).claims.includes('pass')) act(game, i, { type: 'claim', claim: 'pass' }); }
function discard(game: MahjongRound, seat: number, tileId = game.legal(seat).discardIds[0]!) { act(game, seat, { type: 'discard', tileId }); pass(game); }
function chooseAll(game: MahjongRound, wanted: CardId) { for (let seat = 0; seat < 4 && game.phase === 'card_selection'; seat++) if (game.legal(seat).cardOffers.length) { expect(game.legal(seat).cardOffers).toContain(wanted); act(game, seat, { type: 'choose_card', cardId: wanted }); } }
describe('private selection and immediate effects', () => {
 it('waits until after the dealt hand and declarations; rejects forged/stale choices and reveals choices simultaneously', () => {
  const game = round(undefined, undefined, rng(0), true);
  expect(game.privateView(0).hand).toHaveLength(14); expect(game.privateView(1).hand).toHaveLength(13);
  expect(game.legal(0).cardOffers).toHaveLength(0);
  declare(game); expect(game.phase).toBe('card_selection'); expect(game.publicView().selection?.tier).toBe('silver');
  expect(game.legal(0).discardIds).toHaveLength(0);
  const old = game.legal(0).decisionId;
  expect(() => act(game, 0, { type: 'choose_card', cardId: 'blood-river' })).toThrow();
  act(game, 0, { type: 'choose_card', cardId: 'cheat' });
  expect(game.players[0]!.cards).toEqual([]);
  expect(game.legal(0).cardOffers).toEqual([]); expect(game.legal(1).cardOffers).toHaveLength(2);
  expect(JSON.stringify(game.publicView())).not.toMatch(/cardOffers|cheat|machine-malfunction|copy-/);
  for (let seat = 1; seat < 4; seat++) act(game, seat, { type: 'choose_card', cardId: 'cheat' });
  expect(game.phase).toBe('discard'); expect(game.players.every(p => p.cards.includes('cheat') && p.cheatArmed)).toBe(true);
  expect(() => game.act(0, { type: 'choose_card', cardId: 'cheat' }, old)).toThrow('STALE_ACTION');
 });
 it('Echo copies three distinct physical sources per player with fresh IDs and drawable positions', () => {
  const game = round(undefined, c('99999999999999999999'), offerRng('echo'), true);
  const originalHands = game.players.map(p => p.hand.map(t => t.id));
  const known = new Set([...game.wall, ...game.players.flatMap(p => p.hand)].map(t => t.id));
  declare(game); chooseAll(game, 'echo');
  expect(game.wall).toHaveLength(32); expect(game.players.map(p => p.hand.map(t => t.id))).toEqual(originalHands);
  const added = game.wall.filter(t => !known.has(t.id)); expect(added).toHaveLength(12); expect(new Set(added.map(t => t.id)).size).toBe(12);
  expect(game.events.filter(e => e.effect === 'wall_copied').map(e => e.count)).toEqual([3, 3, 3, 3]);
  expect(JSON.stringify(game.publicView())).not.toContain('copy-');
  const wall: Tile[] = [];
  const result = applyWallCard('echo', b('11'), wall, rng(0), id);
  expect(result.inserted).toBe(2); expect(wall).toHaveLength(2); expect(wall[0]!.id).not.toBe(wall[1]!.id);
 });
 it('Malfunction removes only available physical tiles without replacement', () => {
  const wall = c('1'), original = wall[0]!.id;
  expect(applyWallCard('machine-malfunction', [], wall, rng(0), id).removed.map(t => t.id)).toEqual([original]);
  expect(wall).toEqual([]); expect(applyWallCard('machine-malfunction', [], wall, rng(0), id).removed).toEqual([]);
 });
 it('catches a skipped last-16 threshold, pauses before drawing and never repeats after Echo grows the wall', () => {
  let value = 0;
  const game = round(undefined, c('99999999999999999'), { next: () => value }, true);
  declare(game); chooseAll(game, 'machine-malfunction'); expect(game.wall.length).toBe(9);
  value = .99; discard(game, 0);
  expect(game.phase).toBe('card_selection'); expect(game.publicView().selection?.stage).toBe('last16'); expect(game.wall.length).toBe(9);
  expect(game.players[1]!.hand.length).toBe(13);
  chooseAll(game, 'radiant-echo'); expect(game.wall.length).toBe(28); expect(game.turn).toBe(1);
  let steps = 0;
  while (game.phase !== 'settled' && steps++ < 500) {
    for (let seat = 0; seat < 4; seat++) { const move = game.botMove(seat); if (move) { act(game, seat, move); break; } }
    expect(game.phase).not.toBe('card_selection');
  }
  expect(game.publicView().selectionsCompleted).toBe(2); expect(game.phase).toBe('settled');
  expect(dueSelection({ initialDone: true, last16Done: false }, false, 15)).toBe('before_draw_with_16_remaining');
 });
 it('settles safely if last-16 acquisition effects remove the kong replacement tile', () => {
  const hand=[...c('11112346789'),...b('126')];
  const game=round([hand,wait(),wait(),wait()],b('9'),rng(0),true);
  declare(game);chooseAll(game,'cheat');
  act(game,0,{type:'kong',tileId:hand[0]!.id});
  expect(game.phase).toBe('card_selection');expect(game.publicView().selection?.stage).toBe('last16');
  chooseAll(game,'machine-malfunction');
  expect(game.phase).toBe('settled');expect(game.wall).toEqual([]);expect(game.players[0]!.drawnId).not.toMatch(/^copy-/);
  expect(game.events.filter(e=>e.effect==='cheat_draw')).toHaveLength(0);
  expect(game.payments.filter(p=>p.reason==='refund')).toHaveLength(3);
 });
 it('Cheat copies an owned physical type once, without consuming the wall or revealing it', () => {
  const game = round(undefined, c('99'), rng(0)); game.players[1]!.cards.push('cheat'); game.players[1]!.cheatArmed = true;
  const sourceIds = game.players[1]!.hand.map(t => t.id), source = game.players[1]!.hand[0]!.type;
  declare(game); discard(game, 0);
  const copied = game.players[1]!.hand.find(t => t.id === game.players[1]!.drawnId)!;
  expect(copied.type).toEqual(source); expect(sourceIds).not.toContain(copied.id); expect(game.wall.length).toBe(2); expect(game.players[1]!.cheatArmed).toBe(false);
  expect(game.events.find(e => e.effect === 'cheat_draw')?.tile).toBeNull();
 });
});
describe('turn restrictions and bonuses', () => {
 it('Double Wield grants one bonus every primary turn, never on the bonus discard', () => {
  const game = round(); game.players[0]!.cards.push('double-wield'); declare(game);
  discard(game, 0); expect(game.turn).toBe(0); expect(game.bonusTurn).toBe(true);
  discard(game, 0); expect(game.turn).toBe(1); expect(game.bonusTurn).toBe(false);
  for (const seat of [1, 2, 3]) discard(game, seat, game.players[seat]!.drawnId!);
  expect(game.turn).toBe(0); discard(game, 0, game.players[0]!.drawnId!);
  expect(game.turn).toBe(0); expect(game.bonusTurn).toBe(true);
  expect(game.events.filter(e => e.effect === 'extra_turn')).toHaveLength(2);
 });
 it('a successful claim interrupts only that turn’s bonus', () => {
  const offered = c('1')[0]!;
  const game = round([[...c('123456789'), ...b('1234'), offered], [...c('11'), ...b('12345678912')], wait(), wait()]);
  game.players[0]!.cards.push('double-wield'); declare(game);
  act(game, 0, { type: 'discard', tileId: offered.id }); act(game, 1, { type: 'claim', claim: 'pong' }); pass(game);
  expect(game.turn).toBe(1); expect(game.bonusTurn).toBe(false); expect(game.events.some(e => e.effect === 'bonus_interrupted')).toBe(true);
 });
 it('Double Wield excludes discard wins and suppresses only the self-draw fan', () => {
  const game = round([c('11122233344455'), wait(), wait(), wait()]); game.players[0]!.cards.push('double-wield'); declare(game);
  act(game, 0, { type: 'win' });
  expect(game.payments[0]).toMatchObject({ fan: 3, amount: 8 }); expect(game.payments[0]!.patterns.some(p => p.key === 'self_draw')).toBe(false);
  const offered = b('5')[0]!, other = round([[...c('123456789'), ...b('1234'), offered], wait(), wait(), wait()]);
  other.players[1]!.cards.push('double-wield'); declare(other); act(other, 0, { type: 'discard', tileId: offered.id });
  expect(other.legal(1).claims).not.toContain('win');
 });
 it('Colour Blind permits all-suit wins, ignores forced suit discards and exempts flower pigs', () => {
  const hand = [...c('12355'), ...b('123'), ...d('123789')];
  const game = round([hand, wait(), wait(), wait()]); game.players[0]!.cards.push('colour-blind'); declare(game);
  expect(game.legal(0).discardIds).toHaveLength(14); expect(game.legal(0).canWin).toBe(true);
  const ending = round([hand, wait(), wait(), wait()], []); ending.players[0]!.cards.push('colour-blind'); declare(ending);
  discard(ending, 0, hand[0]!.id); expect(ending.phase).toBe('settled');
  expect(ending.payments.filter(p => p.reason === 'flower_pig' && p.from === 0)).toEqual([]);
 });
 it('pong-card payment is exactly one point, cannot crit and is not a kong receipt', () => {
  const offered = c('1')[0]!, game = round([[...c('123456789'), ...b('1234'), offered], [...c('11'), ...b('12345678912')], wait(), wait()], undefined, rng(0));
  game.players[1]!.cards.push('point-pong-kong', 'jeweled-gauntlet'); declare(game);
  act(game, 0, { type: 'discard', tileId: offered.id }); act(game, 1, { type: 'claim', claim: 'pong' }); pass(game);
  expect(game.payments).toHaveLength(1); expect(game.payments[0]).toMatchObject({ from: 0, to: 1, reason: 'pong_card', amount: 1, critical: false });
 });
});
describe('settlement composition', () => {
 it.each([0, .99])('rolls one critical trial per whole win, across all payers, after the cap (rng %s)', value => {
  let rolls = 0; const game = round([c('11122233344455'), wait(), wait(), wait()], undefined, { next: () => { rolls++; return value; } });
  game.players[0]!.cards.push('jeweled-gauntlet'); declare(game); act(game, 0, { type: 'win' });
  expect(rolls).toBe(1); expect(game.payments.filter(p => p.reason === 'win').map(p => p.amount)).toEqual(value === 0 ? [16, 16, 16] : [8, 8, 8]);
  expect(game.players.reduce((n, p) => n + p.score, 0)).toBe(0);
 });
 it('refunds the exact critical kong receipts without another roll', () => {
  let rolls = 0;
  const hand = [...c('11112346789'), ...b('126')], game = round([hand, wait(), wait(), wait()], b('9'), { next: () => { rolls++; return 0; } });
  game.players[0]!.cards.push('jeweled-gauntlet'); declare(game); act(game, 0, { type: 'kong', tileId: hand[0]!.id });
  discard(game, 0, game.players[0]!.drawnId!);
  expect(game.phase).toBe('settled'); expect(rolls).toBe(1);
  expect(game.payments.filter(p => p.reason === 'kong').map(p => p.amount)).toEqual([4, 4, 4]);
  expect(game.payments.filter(p => p.reason === 'refund').map(p => p.amount)).toEqual([4, 4, 4]);
  expect(game.payments.filter(p => p.reason === 'refund').every(p => !p.critical)).toBe(true);
 });
 it('automatically applies collateral, excludes co-winners and pays extra zero-sum transfers', () => {
  let rolls = 0;
  const offered = c('5')[0]!, pureWait = () => c('1234567891235');
  const game = round([[...c('123456789'), ...b('1234'), offered], pureWait(), pureWait(), wait()], c('99'), { next: () => { rolls++; return 0; } });
  game.players[1]!.cards.push('collateral-damage', 'jeweled-gauntlet'); declare(game);
  act(game, 0, { type: 'discard', tileId: offered.id }); act(game, 1, { type: 'claim', claim: 'win' }); act(game, 2, { type: 'claim', claim: 'win' });
  expect(game.phase).not.toBe('collateral');
  const decision = game.legal(1).decisionId;
  expect(rolls).toBe(1); expect(game.payments.find(p => p.reason === 'win' && p.to === 1)).toMatchObject({ amount: 8, critical: true });
  expect(game.payments.filter(p => p.reason === 'collateral').map(p => [p.from, p.to, p.amount])).toEqual([[3, 1, 4]]);
  expect(game.players.reduce((n, p) => n + p.score, 0)).toBe(0);
  const count = game.payments.length; expect(() => game.act(1, { type: 'collateral', use: false }, decision)).toThrow(); expect(game.payments.length).toBe(count);
 });
});
describe('Blood River hand lock', () => {
 it('keeps its owner active, locks originals, permits repeated self-draw/discard wins and prevents swaps/pongs', () => {
  const game = round(undefined, [...b('5'), ...d('999'), ...b('5'), ...d('999999')]); game.players[0]!.cards.push('blood-river'); declare(game);
  act(game, 0, { type: 'win' }); const baseline = game.players[0]!.hand.map(t => t.id);
  expect(game.players[0]).toMatchObject({ won: false, handLocked: true, winCount: 1 }); expect(baseline).toHaveLength(13);
  expect(game.publicView().events.find(e=>e.kind==='win')?.tile).toEqual({suit:'bamboo',rank:5});
  for(const tileId of baseline)expect(JSON.stringify(game.publicView())).not.toContain(tileId);
  const offered = game.players[1]!.drawnId!; act(game, 1, { type: 'discard', tileId: offered });
  expect(game.legal(0).claims).toContain('win'); expect(game.legal(0).claims).not.toContain('pong');
  act(game, 0, { type: 'claim', claim: 'win' }); pass(game);
  expect(game.players[0]!.winCount).toBe(2); expect(game.players[0]!.hand.map(t => t.id)).toEqual(baseline);
  while (game.turn !== 0) discard(game, game.turn, game.players[game.turn]!.drawnId!);
  expect(game.legal(0).discardIds).toEqual([game.players[0]!.drawnId]);
  expect(() => act(game, 0, { type: 'discard', tileId: baseline[0]! })).toThrow('ACTION_NOT_ALLOWED');
  expect(game.legal(0).canWin).toBe(false); // next draw is the scripted dots tile, not a winning replacement.
 });
 it('allows a drawn tile to add a kong without changing the locked hand, and counts its root on later wins', () => {
  const hand = [...c('123678'), ...b('78955')];
  const wall = [...d('999'), ...c('4'), ...b('5'), ...d('999'), ...b('5'), ...d('999')];
  const game = round([hand, wait(), wait(), wait()], wall);
  game.players[0]!.cards.push('blood-river'); game.players[0]!.melds.push({ kind: 'pong', tiles: c('444'), from: 1 });
  declare(game); act(game, 0, { type: 'win' }); const baseline = game.players[0]!.hand.map(t => t.id);
  for (const seat of [1, 2, 3]) discard(game, seat, game.players[seat]!.drawnId!);
  const drawn = game.players[0]!.drawnId!; expect(game.legal(0).kongIds).toEqual([drawn]);
  act(game, 0, { type: 'kong', tileId: drawn }); pass(game);
  expect(game.players[0]!.melds[0]!.kind).toBe('added_kong'); expect(game.legal(0).canWin).toBe(true);
  act(game, 0, { type: 'win' }); expect(game.players[0]!.hand.map(t => t.id)).toEqual(baseline);
  const second = game.payments.filter(p => p.reason === 'win').slice(3, 6);
  expect(second[0]!.patterns).toContainEqual({ key: 'roots', fan: 1 }); expect(second[0]!.patterns).toContainEqual({ key: 'after_kong', fan: 1 });
  for (const seat of [1, 2, 3]) discard(game, seat, game.players[seat]!.drawnId!);
  act(game, 0, { type: 'win' }); expect(game.players[0]!.winCount).toBe(3); expect(game.phase).not.toBe('settled');
  const third = game.payments.filter(p => p.reason === 'win').slice(-3);
  expect(third[0]!.patterns).toContainEqual({ key: 'roots', fan: 1 }); expect(third[0]!.patterns.some(p => p.key === 'after_kong')).toBe(false);
 });
});
it('completes 80 seeded Hex rounds without duplicate physical identities, leaked offers, repeated selection or score creation', () => {
 const seenCards = new Set<CardId>();
 for (let seed = 1; seed <= 80; seed++) {
  let state = seed; const random = { next: () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; } };
  const game = createRound(random, id, seed % 4, 16, 1, [0, 0, 0, 0], true); let actions = 0;
  while (game.phase !== 'settled' && actions++ < 1200) {
    let acted = false;
    for (let seat = 0; seat < 4; seat++) { const move = game.botMove(seat); if (move) { act(game, seat, move); acted = true; break; } }
    expect(acted).toBe(true);
    const physical = [...game.wall, ...game.resolved, ...game.removed, ...game.players.flatMap(p => [...p.hand, ...p.discards, ...p.melds.flatMap(m => m.tiles)])];
    expect(new Set(physical.map(t => t.id)).size).toBe(physical.length);
    expect(physical.length).toBe(108 + game.events.filter(e => e.effect === 'cheat_draw').length + game.events.filter(e => e.effect === 'wall_copied').reduce((n, e) => n + (e.count ?? 0), 0));
    expect(game.players.reduce((n, p) => n + p.score, 0)).toBe(0);
    const view = game.publicView(); expect(view).not.toHaveProperty('wall'); expect(JSON.stringify(view)).not.toContain('cardOffers'); expect(view.selectionsCompleted).toBeLessThanOrEqual(2);
    for (const p of game.players) for (const card of p.cards) seenCards.add(card);
  }
  expect(game.phase).toBe('settled');
 }
 expect(seenCards.size).toBe(CARDS.length);
}, 30000);

describe('new Hex rules', () => {
 it('refills missing-suit tiles using physical wall tiles, without consuming Cheat', () => {
  let calls = 0;
  const game = round([[...c('123456789'), ...d('12345')], wait(), wait(), wait()], b('99999999999999999999'), {next:()=>++calls===1?.34:calls<=9?0:.99}, true);
  const original = game.players[0]!.hand.filter(t => t.type.suit === 'dots').map(t => t.id);
  const front = game.wall.slice(0, 5).map(t => t.id);
  declare(game); game.players[0]!.cheatArmed = true; chooseAll(game, 'loan-construction');
  expect(game.players[0]!.cheatArmed).toBe(true);
  expect(game.players[0]!.hand).toHaveLength(14);
  expect(game.players[0]!.hand.slice(-5).map(t => t.id)).toEqual(front);
  expect(original.every(id => game.wall.some(t => t.id === id))).toBe(true);
  expect(game.events.find(e => e.effect === 'hand_refilled')).toMatchObject({ count: 5 });
 });
 it('skips an exiting scheduled drawer and freezes all later payments including refunds', () => {
  let value = 0;
  const game = round(undefined, c('99999999999999999'), {next:()=>value}, true);
  declare(game); chooseAll(game, 'machine-malfunction');
  discard(game, 0); value = 0;
  expect(game.publicView().selection?.stage).toBe('last16');
  for (let seat = 0; seat < 4; seat++) act(game, seat, {type:'choose_card',cardId:seat===1?'bathroom-break':'cheat'});
  expect(game.players[1]).toMatchObject({exited:true,won:false,winCount:0,drawnId:null});
  expect(game.turn).toBe(2); expect(game.legal(1).discardIds).toEqual([]);
  const count = game.payments.length, score = game.players[1]!.score;
  let steps=0;
  while(game.phase!=='settled' && steps++<500) for(let seat=0;seat<4;seat++){const move=game.botMove(seat);if(move){act(game,seat,move);break;}}
  expect(game.phase).toBe('settled'); expect(game.players[1]!.score).toBe(score);
  expect(game.payments.slice(count).some(p=>p.from===1||p.to===1)).toBe(false);
 });
 it('requires two actual fan for every player, including the owner and Double Wield', () => {
  const game=round(); declare(game); expect(game.legal(0).canWin).toBe(true);
  game.players[0]!.cards.push('fan-the-flames'); expect(game.legal(0).canWin).toBe(false);
  game.players[0]!.cards.push('double-wield'); expect(game.legal(0).canWin).toBe(false);
  const pure=round([c('11123456789999'),wait(),wait(),wait()]); declare(pure);
  pure.players[1]!.cards.push('fan-the-flames'); expect(pure.legal(0).canWin).toBe(true);
 });
});

describe('revised cards', () => {
 it('guarantees Loan Construction clears the suit even when returned tiles enter the front', () => {
  let calls=0;
  const game=round([[...c('123456789'),...d('12345')],wait(),wait(),wait()], [...d('999'),...b('123456789')], {next:()=>++calls===1?.34:0},true);
  const ids=[...game.wall,...game.players.flatMap(p=>p.hand)].map(t=>t.id).sort();
  declare(game);chooseAll(game,'loan-construction');
  expect(game.players[0]!.hand).toHaveLength(14);
  expect(game.players[0]!.hand.some(t=>t.type.suit==='dots')).toBe(false);
  expect(game.players[0]!.hand.slice(-5).map(t=>t.type.rank)).toEqual([1,2,3,4,5]);
  expect([...game.wall,...game.players.flatMap(p=>p.hand)].map(t=>t.id).sort()).toEqual(ids);
 });
 it.each([['petty-theft',.15],['sneaky-theft',.25],['grand-theft',.45]] as const)('%s respects probability boundaries and can chain', (card,chance) => {
  let value=chance-.000001;
  const game=round(undefined, d('99999999999999999999'), {next:()=>value});
  game.players[0]!.cards.push(card);declare(game);
  discard(game,0);expect(game.turn).toBe(0);expect(game.bonusTurn).toBe(false);
  discard(game,0,game.players[0]!.drawnId!);expect(game.turn).toBe(0);
  expect(game.events.filter(e=>e.effect==='turn_restarted')).toHaveLength(2);
  value=chance;discard(game,0,game.players[0]!.drawnId!);expect(game.turn).toBe(1);
 });
 it('a successful pong interrupts even a guaranteed theft roll', () => {
  const offered=c('1')[0]!;
  const game=round([[...c('123456789'),...b('1234'),offered],[...c('11'),...b('12345678912')],wait(),wait()],undefined,rng(0));
  game.players[0]!.cards.push('grand-theft');declare(game);
  act(game,0,{type:'discard',tileId:offered.id});act(game,1,{type:'claim',claim:'pong'});pass(game);
  expect(game.turn).toBe(1);expect(game.events.some(e=>e.effect==='turn_restarted')).toBe(false);
 });
 it('Great Wall reduces each payer transfer after crit, including a payment reduced to zero', () => {
  const game=round(undefined,undefined,rng(0));game.players[0]!.cards.push('jeweled-gauntlet');game.players[1]!.cards.push('great-wall');declare(game);
  act(game,0,{type:'win'});
  expect(game.payments.filter(p=>p.reason==='win').map(p=>p.amount)).toEqual([3,4,4]);
  expect(game.players.reduce((sum,p)=>sum+p.score,0)).toBe(0);
  const offered=c('1')[0]!, other=round([[...c('123456789'),...b('1234'),offered],[...c('11'),...b('12345678912')],wait(),wait()]);
  other.players[0]!.cards.push('great-wall');other.players[1]!.cards.push('point-pong-kong');declare(other);
  act(other,0,{type:'discard',tileId:offered.id});act(other,1,{type:'claim',claim:'pong'});pass(other);
  expect(other.payments.filter(p=>p.reason==='pong_card')).toEqual([]);
 });
 it('Radiant Echo samples with replacement and creates five unique drawable copies', () => {
  const source=b('1'),wall:Tile[]=[];
  const result=applyWallCard('radiant-echo',source,wall,rng(0),id);
  expect(result.inserted).toBe(5);expect(new Set(wall.map(t=>t.id)).size).toBe(5);
  expect(wall.every(t=>t.type.suit==='bamboo'&&t.type.rank===1&&t.id!==source[0]!.id)).toBe(true);
  expect(applyWallCard('radiant-echo',[],wall,rng(0),id).inserted).toBe(0);
 });
});
