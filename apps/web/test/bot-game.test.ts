import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as engine from '@hex/mahjong-engine';
import { BotGame } from '../src/bot-game.js';
import type { Move, TableSnapshot } from '@hex/shared';
let serial=0;
beforeEach(()=>vi.useFakeTimers({now:100000}));
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
function session(seed=42){
 let state=seed;
 const snapshots:TableSnapshot[]=[],errors:string[]=[];
 const game=new BotGame({scoreCap:16,rounds:8},{rng:{next:()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}},id:()=>`local-${++serial}`,now:()=>Date.now(),later:(callback,ms)=>{const timer=setTimeout(callback,ms);return()=>clearTimeout(timer);},snapshot:value=>snapshots.push(structuredClone(value)),error:code=>errors.push(code)});
 const current=()=>snapshots.at(-1)!;
 const act=(move:Move)=>game.receive({type:'play',decisionId:current().you.legal.decisionId,move});
 return{game,current,act,errors,snapshots};
}
it('runs solo without network state, preserves snapshot privacy and rejects repeated decisions',()=>{
 const {game,current,act,errors}=session();
 expect(current().round).toBeNull();game.receive({type:'start_game'});
 expect(current().you.hand).toHaveLength(14);expect(current().room.seats.filter(s=>s.bot)).toHaveLength(3);
 expect(current().round).not.toHaveProperty('wall');
 for(const player of current().round!.players)expect(player).not.toHaveProperty('hand');
 const command={type:'play' as const,decisionId:current().you.legal.decisionId,move:{type:'declare' as const,suit:'dots' as const}};
 game.receive(command);game.receive(command);expect(errors).toEqual(['ACTION_NOT_ALLOWED']);
 vi.advanceTimersByTime(2100);
 expect(current().you.legal.cardOffers).toHaveLength(2);act({type:'choose_card',cardId:current().you.legal.cardOffers[0]!});
 vi.advanceTimersByTime(2100);
 const discard={type:'play' as const,decisionId:current().you.legal.decisionId,move:{type:'discard' as const,tileId:current().you.legal.discardIds[0]!}};
 game.receive(discard);const count=current().you.hand.length;game.receive(discard);
 expect(errors.at(-1)).toBe('STALE_ACTION');expect(current().you.hand.length).toBe(count);
 game.dispose();expect(vi.getTimerCount()).toBe(0);
});
it('uses a real selection deadline, then waits for the human without auto-discarding',()=>{
 const {game,current,act}=session();game.receive({type:'start_game'});act({type:'declare',suit:'dots'});
 vi.advanceTimersByTime(2100);const deadline=current().round!.selection!.deadline!;
 expect(deadline).toBeGreaterThan(Date.now());expect(current().you.legal.cardOffers).toHaveLength(2);
 vi.advanceTimersByTime(60000);
 expect(current().round!.phase).toBe('discard');expect(current().you.hand).toHaveLength(14);expect(current().round!.players[0]!.discards).toHaveLength(0);
 expect(current().round!.players[0]!.cards).toHaveLength(1);
 game.dispose();expect(vi.getTimerCount()).toBe(0);
});
it('cancels all worker-side timers on leave, with no late snapshots',()=>{
 const {game,current,act,snapshots}=session();game.receive({type:'start_game'});act({type:'declare',suit:'dots'});vi.advanceTimersByTime(2100);
 expect(current().round!.phase).toBe('card_selection');const count=snapshots.length;
 game.dispose();vi.advanceTimersByTime(120000);expect(snapshots.length).toBe(count);expect(vi.getTimerCount()).toBe(0);
});
it('completes full offline Hex rounds and carries only scores/dealer into the next round',()=>{
 for(const seed of [7,42,99]){
  const {game,current,act,errors}=session(seed);game.receive({type:'start_game'});let steps=0;
  while(current().round!.phase!=='settled'&&steps++<1500){
   const snap=current(),legal=snap.you.legal;
   if(legal.declarations.length)act({type:'declare',suit:'dots'});
   else if(legal.cardOffers.length)act({type:'choose_card',cardId:legal.cardOffers[0]!});
   else if(legal.canChooseCollateral)act({type:'collateral',use:true});
   else if(legal.canWin)act({type:'win'});
   else if(legal.claims.length)act({type:'claim',claim:legal.claims.includes('win')?'win':legal.claims.includes('kong')?'kong':legal.claims.includes('pong')?'pong':'pass'});
   else if(legal.kongIds.length)act({type:'kong',tileId:legal.kongIds[0]!});
   else if(legal.discardIds.length)act({type:'discard',tileId:legal.discardIds[0]!});
   vi.advanceTimersByTime(420);
  }
  expect(current().round!.phase).toBe('settled');expect(errors).toEqual([]);
  const balances=current().round!.players.map(p=>p.score),dealer=current().round!.nextDealer;
  expect(balances.reduce((n,score)=>n+score,0)).toBe(0);expect(current().round!.selectionsCompleted).toBeGreaterThanOrEqual(1);
  game.receive({type:'next_round'});expect(current().round!.dealer).toBe(dealer);expect(current().round!.players.map(p=>p.score)).toEqual(balances);
  expect(current().round!.players.every(p=>p.cards.length===0&&!p.handLocked&&p.winCount===0)).toBe(true);
  game.dispose();expect(vi.getTimerCount()).toBe(0);
 }
});
it('automates a human Blood River seat after the first win and returns to manual play next round',()=>{
 let tileId=0;
 const tiles=(suit:'characters'|'bamboo'|'dots',ranks:string)=>[...ranks].map(rank=>({id:`blood-${++tileId}`,type:{suit,rank:Number(rank) as 1}}));
 const wait=()=>[...tiles('characters','123456789'),...tiles('bamboo','1235')];
 const round=new engine.MahjongRound({dealer:0,cap:16,hands:[[...tiles('characters','123456789'),...tiles('bamboo','12355')],wait(),wait(),wait()],wall:[...tiles('dots','999'),...tiles('bamboo','5'),...tiles('dots','999999999999')],hex:{rng:{next:()=>.99},id:()=>`copy-${++tileId}`,selections:false}});
 round.players[0]!.cards.push('blood-river');
 vi.spyOn(engine,'createRound').mockReturnValueOnce(round);
 const {game,current,act,errors,snapshots}=session();game.receive({type:'start_game'});act({type:'declare',suit:'dots'});
 vi.advanceTimersByTime(2100);
 expect(current().you.legal.canWin).toBe(true);expect(round.isAutomatic(0)).toBe(false);
 vi.advanceTimersByTime(1000);expect(round.players[0]!.winCount).toBe(0);
 act({type:'win'});expect(round.isAutomatic(0)).toBe(true);
 vi.advanceTimersByTime(30000);
 expect(current().round!.phase).toBe('settled');expect(errors).toEqual([]);
 expect(round.players[0]!.winCount).toBeGreaterThanOrEqual(2);
 expect(round.players[0]!.discards.length).toBeGreaterThan(0);
 expect(snapshots.some(s=>s.round?.players[0]?.winCount===2)).toBe(true);
 game.receive({type:'next_round'});expect(current().round!.players[0]!.handLocked).toBe(false);
 game.dispose();expect(vi.getTimerCount()).toBe(0);
});
