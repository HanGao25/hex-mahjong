import { describe, expect, it } from 'vitest';
import { createRound, MahjongRound, scoreHand, readyScore, sameType, shanten, type Meld } from '../src/index.js';
import type { Tile, Suit, Move, ScoreCap } from '@hex/shared';
let serial = 0;
const tiles = (suit: Suit, ranks: string): Tile[] => [...ranks].map(rank => ({ id: `fixture-${++serial}`, type: { suit, rank: Number(rank) as Tile['type']['rank'] } }));
const c = (r: string) => tiles('characters', r), b = (r: string) => tiles('bamboo', r), d = (r: string) => tiles('dots', r);
const mixedWait = () => [...c('123456789'), ...b('1235')];
function declare(game: MahjongRound, suits: Suit[] = ['dots', 'dots', 'dots', 'dots']) { for (let i = 0; i < 4; i++) game.act(i, { type: 'declare', suit: suits[i]! }, game.legal(i).decisionId); }
function play(game: MahjongRound, seat: number, move: Move) { game.act(seat, move, game.legal(seat).decisionId); }
function fixture(hands: Tile[][], wall: Tile[] = c('999'), cap: ScoreCap = 'uncapped') { return new MahjongRound({ hands, wall, dealer: 0, cap }); }
function finishClaims(game: MahjongRound) { for (let seat = 0; seat < 4 && game.phase === 'claims'; seat++) { const legal = game.legal(seat); if (legal.claims.length) play(game, seat, { type: 'claim', claim: legal.claims.includes('win') ? 'win' : 'pass' }); } }
function seeded(seed: number) { let n = seed; return { next: () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; } }; }
describe('winning hands and fan', () => {
 it('recognizes ordinary sequences, rejects invalid shapes and missing suits', () => {
  const hand = [...c('123456789'), ...b('12355')];
  expect(scoreHand(hand, [], 'dots', 'uncapped')?.fan).toBe(0);
  expect(scoreHand(hand, [], 'bamboo', 'uncapped')).toBeNull();
  expect(scoreHand([...c('123456789'), ...b('12455')], [], 'dots', 8)).toBeNull();
  expect(scoreHand(hand.slice(1), [], 'dots', 8)).toBeNull();
 });
 it('matches the owner’s all-pong pure self-draw example and applies per-payer caps', () => {
  const hand = c('11122233344455');
  expect(scoreHand(hand, [], 'dots', 'uncapped', { selfDraw: true })).toMatchObject({ fan: 4, points: 16 });
  expect(scoreHand(hand, [], 'dots', 8, { selfDraw: true })?.points).toBe(8);
 });
 it('uses the special pure-seven-pairs score and arbitrary even multiplicities', () => {
  expect(scoreHand(c('11223344556677'), [], 'dots', 32)?.fan).toBe(3);
  expect(scoreHand(c('11112233445566'), [], 'dots', 32)?.fan).toBe(4);
  expect(scoreHand(c('11111111111111'), [], 'dots', 'uncapped')?.fan).toBe(6);
 });
 it('counts declared roots and kong/self-draw bonuses exactly once', () => {
  const meld: Meld = { kind: 'concealed_kong', tiles: c('1111'), from: 0 };
  expect(scoreHand([...c('234567'), ...b('78955')], [meld], 'dots', 32, { selfDraw: true, afterKong: true })).toMatchObject({ fan: 3, points: 8 });
  const melds: Meld[] = [c('111'), c('222'), b('333'), b('444')].map(tiles => ({ kind: 'pong', tiles, from: 1 }));
  expect(scoreHand(b('55'), melds, 'dots', 32, { selfDraw: true })?.fan).toBe(3);
 });
 it('calculates readiness without hypothetical self-draw/kong bonuses', () => {
  expect(readyScore(mixedWait(), [], 'dots', 8)).toMatchObject({ fan: 0, points: 1 });
  expect(shanten(mixedWait(), 0)).toBe(0);
  expect(shanten([...mixedWait(), ...b('5')], 0)).toBe(-1);
 });
});
describe('authoritative round transitions', () => {
 it('deals unique physical tiles, forces missing-suit discards, rejects ownership/stale actions', () => {
  const game = createRound(seeded(42), () => `deal-${++serial}`, 0, 16);
  expect(game.players.map(p => p.hand.length)).toEqual([14, 13, 13, 13]); expect(game.wall.length).toBe(55);
  const old = game.legal(0).decisionId; declare(game);
  const ids = game.legal(0).discardIds;
  expect(ids.every(id => game.players[0]!.hand.find(t => t.id === id)!.type.suit === 'dots')).toBe(true);
  expect(() => game.act(0, { type: 'discard', tileId: ids[0]! }, old)).toThrow('STALE_ACTION');
  expect(() => play(game, 0, { type: 'discard', tileId: game.players[1]!.hand[0]!.id })).toThrow('ACTION_NOT_ALLOWED');
  expect(() => play(game, 1, { type: 'discard', tileId: game.players[1]!.hand[0]!.id })).toThrow('ACTION_NOT_ALLOWED');
 });
 it('pays capped self-draw winnings from each active payer', () => {
  const game = fixture([c('11122233344455'), b('1234567891234'), b('1234567891234'), b('1234567891234')], c('9'), 8);
  declare(game); play(game, 0, { type: 'win' });
  expect(game.players.map(p => p.score)).toEqual([24, -8, -8, -8]);
  expect(game.publicView().players[0]!.winningTiles).toEqual([{ suit: 'characters', rank: 5 }]);
  expect(game.players[0]!.won).toBe(true);expect(game.turn).toBe(1);expect(game.players[1]!.hand.length).toBe(14);
 });
 it('resolves all discard wins ahead of a competing pong', () => {
  const winningTile = b('5')[0]!;
  const game = fixture([[...c('123456789'), ...b('1234'), winningTile], mixedWait(), mixedWait(), [...c('11223344'), ...b('55678')]], c('99'));
  declare(game); play(game, 0, { type: 'discard', tileId: winningTile.id });
  expect(game.legal(3).claims).toContain('pong');
  play(game, 3, { type: 'claim', claim: 'pong' });
  play(game, 1, { type: 'claim', claim: 'win' });
  expect(game.phase).toBe('claims');
  play(game, 2, { type: 'claim', claim: 'win' });
  expect(game.players[1]!.won && game.players[2]!.won).toBe(true);
  expect(game.publicView().players[1]!.winningTiles).toEqual([winningTile.type]);
  expect(game.publicView().players[2]!.winningTiles).toEqual([winningTile.type]);
  expect(game.players[3]!.melds).toHaveLength(0);
  expect(game.payments.filter(p => p.reason === 'win').map(p => [p.from, p.to, p.amount])).toEqual([[0, 1, 1], [0, 2, 1]]);
  expect(game.players[0]!.discards).toHaveLength(0);
 });
 it('handles concealed kong payments and replacement draw, and forbids a kong on empty wall', () => {
  const hand = [...c('111123456789'), ...b('55')];
  const game = fixture([hand, mixedWait(), mixedWait(), mixedWait()], b('9'));
  declare(game); play(game, 0, { type: 'kong', tileId: hand[0]!.id });
  expect(game.players[0]!.melds[0]!.kind).toBe('concealed_kong'); expect(game.wall.length).toBe(0);
  expect(game.publicView().players[0]!.melds[0]!.tiles).toEqual([]);
  expect(game.privateView(0).concealedKongs).toEqual([{meldIndex:0,tile:hand[0]!.type}]);
  expect(game.privateView(1).concealedKongs).toEqual([]);
  expect(game.players.map(p => p.score)).toEqual([6, -2, -2, -2]);
  expect(game.players[0]!.hand.at(-1)!.type.rank).toBe(9);
  const empty = fixture([c('11112345678955'), mixedWait(), mixedWait(), mixedWait()], []);
  declare(empty); expect(empty.legal(0).kongIds).toHaveLength(0);
 });
 it('charges only the discarder for an exposed kong and draws its replacement from the front', () => {
  const offered=c('1')[0]!,replacement=b('9')[0]!;
  const game=fixture([[...c('123456789'),...b('1234'),offered],[...c('111'),...b('1234567891')],mixedWait(),mixedWait()],[replacement,...b('88')]);
  declare(game);play(game,0,{type:'discard',tileId:offered.id});
  expect(game.legal(1).claims).toContain('kong');play(game,1,{type:'claim',claim:'kong'});finishClaims(game);
  expect(game.players[1]!.melds[0]!.kind).toBe('exposed_kong');
  expect(game.players[1]!.drawnId).toBe(replacement.id);
  expect(game.players.map(p=>p.score)).toEqual([-2,2,0,0]);
 });
 it('completes an unrobbed added kong and includes that meld root in later scoring', () => {
  const added=c('4')[0]!;
  const game=fixture([[...c('1235678991'),added],mixedWait(),mixedWait(),mixedWait()],b('999'));
  game.players[0]!.melds.push({kind:'pong',tiles:c('444'),from:1});
  declare(game);play(game,0,{type:'kong',tileId:added.id});
  expect(game.players[0]!.melds[0]!.kind).toBe('added_kong');
  expect(game.players.map(p=>p.score)).toEqual([3,-1,-1,-1]);
  const score=scoreHand([...c('123678'),...b('78955')],game.players[0]!.melds,'dots',32,{selfDraw:true});
  expect(score!.patterns).toContainEqual({key:'roots',fan:1});
 });
 it('robs only an added kong and retains the original pong without kong payment', () => {
  const drawn = b('5')[0]!;
  const game = fixture([[...c('1234567891'), drawn], mixedWait(), mixedWait(), mixedWait()], c('999'));
  game.players[0]!.melds.push({ kind: 'pong', tiles: b('555'), from: 1 });
  declare(game); play(game, 0, { type: 'kong', tileId: drawn.id });
  expect(game.publicView().pending?.robKong).toBe(true);
  finishClaims(game);
  expect(game.players[0]!.melds[0]!.kind).toBe('pong');expect(game.players[0]!.melds[0]!.tiles).toHaveLength(3);
  expect(game.payments.every(p => p.reason === 'win')).toBe(true);
  expect(game.payments[0]!.patterns).toContainEqual({ key: 'rob_kong', fan: 1 });
  expect(game.endReason).toBe('three_winners'); expect(game.nextDealer).toBe(0);
 });
 it('finishes the final-discard pong chain before wall-exhaustion settlement', () => {
  const offered = b('5')[0]!;
  const game = fixture([[...c('123456789'), ...b('1234'), offered], [...c('11223344'), ...b('55678')], [...c('123456789'), ...b('1267')], [...c('123456789'), ...b('1267')]], []);
  declare(game);play(game, 0, { type: 'discard', tileId: offered.id });
  play(game, 1, { type: 'claim', claim: 'pong' });
  expect(game.phase).toBe('discard');expect(game.turn).toBe(1);
  const tile = game.players[1]!.hand.find(t => t.type.suit === 'bamboo' && t.type.rank === 8)!;
  play(game, 1, { type: 'discard', tileId: tile.id });
  finishClaims(game); expect(game.phase).toBe('settled');expect(game.endReason).toBe('wall_empty');
 });
 it('charges flower pigs and ready-hand payments at exhaustion, preserving zero sum', () => {
  const discarded = c('9')[0]!;
  const game = fixture([[...c('123456789'), ...b('1267'), discarded], mixedWait(), [...c('123456789'), ...b('1267')], [...c('123456789'), ...d('1234')]], [], 8);
  declare(game);play(game, 0, { type: 'discard', tileId: discarded.id });finishClaims(game);
  expect(game.phase).toBe('settled');
  expect(game.payments.filter(p => p.reason === 'flower_pig')).toHaveLength(3);
  expect(game.payments.filter(p => p.reason === 'not_ready')).toHaveLength(2);
  expect(game.players.reduce((n,p)=>n+p.score,0)).toBe(0);
 });
 it('refunds actual kong receipts to their original payers when claimant is not ready', () => {
  const hand=[...c('11112346789'),...b('126')];
  const game=fixture([hand,mixedWait(),mixedWait(),mixedWait()],b('9'));
  declare(game);play(game,0,{type:'kong',tileId:hand[0]!.id});
  play(game,0,{type:'discard',tileId:game.players[0]!.drawnId!});finishClaims(game);
  expect(game.phase).toBe('settled');
  expect(game.payments.filter(p=>p.reason==='refund').map(p=>[p.from,p.to,p.amount])).toEqual([[0,1,2],[0,2,2],[0,3,2]]);
 });
 it('reveals remaining hands and concealed kongs only after settlement, without physical IDs', () => {
  const hand=[...c('11112346789'),...b('126')];
  const game=fixture([hand,mixedWait(),mixedWait(),mixedWait()],b('9'));
  declare(game);play(game,0,{type:'kong',tileId:hand[0]!.id});
  expect(game.publicView().players.every(p=>p.revealedHand===null)).toBe(true);
  expect(game.publicView().players[0]!.melds[0]!.tiles).toEqual([]);
  play(game,0,{type:'discard',tileId:game.players[0]!.drawnId!});finishClaims(game);
  expect(game.phase).toBe('settled');
  const view=game.publicView();
  for(const player of view.players){
   expect(player.revealedHand).toEqual(game.players[player.seat]!.hand.map(t=>t.type));
   expect(player.revealedHand).toHaveLength(player.handCount);
   for(const tile of player.revealedHand!)expect(Object.keys(tile).sort()).toEqual(['rank','suit']);
  }
  expect(view.players[0]!.melds[0]!.tiles).toEqual(game.players[0]!.melds[0]!.tiles.map(t=>t.type));
  view.players[0]!.revealedHand![0]!.rank=9;
  expect(game.publicView().players[0]!.revealedHand).toEqual(game.players[0]!.hand.map(t=>t.type));
 });
 it('never puts other concealed hands, private IDs, wall tiles or concealed-kong faces in public state', () => {
  const game=createRound(seeded(8),()=>`secret-${++serial}`,0,16);declare(game);
  const publicText=JSON.stringify(game.publicView());
  for(const tile of [...game.wall,...game.players.flatMap(p=>p.hand)])expect(publicText).not.toContain(tile.id);
  expect(game.privateView(0).hand.map(t=>t.id)).toEqual(game.players[0]!.hand.map(t=>t.id));
  expect(publicText).not.toContain('drawnId'); expect(publicText).not.toContain('decisionId');
 });
});
it('plays twenty seeded all-bot rounds to completion with tile conservation and zero-sum accounting', () => {
 let totalWins=0;
 for(let seed=1;seed<=20;seed++){
  const game=createRound(seeded(seed),()=>`round-${seed}-${++serial}`,seed%4,16);
  const original=new Set([...game.wall,...game.players.flatMap(p=>p.hand)].map(t=>t.id));
  let steps=0;
  while(game.phase!=='settled'&&steps++<800){
   let moved=false;
   for(let seat=0;seat<4;seat++){
    const move=game.botMove(seat);
    if(move){play(game,seat,move);moved=true;break;}
   }
   expect(moved).toBe(true);
   const physical=[...game.wall,...game.resolved,...game.players.flatMap(p=>[...p.hand,...p.discards,...p.melds.flatMap(m=>m.tiles)])];
   expect(physical).toHaveLength(108);expect(new Set(physical.map(t=>t.id))).toEqual(original);
   expect(game.players.reduce((n,p)=>n+p.score,0)).toBe(0);
  }
  expect(game.phase).toBe('settled');expect(steps).toBeLessThan(800);
  totalWins+=game.players.filter(p=>p.won).length;
 }
 expect(totalWins).toBeGreaterThan(20);
},30000);
