import { afterAll, beforeAll, expect, it } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'node:http';
import { Client, type Room } from 'colyseus.js';
import { HexRoom } from '../src/HexRoom.js';
import type { PublicRoom, TableSnapshot, Move, Tile } from '@hex/shared';
import { MahjongRound, chooseDiscard } from '@hex/mahjong-engine';
const http = createServer();
const game = new Server({transport:new WebSocketTransport({server:http}),greet:false});
game.define('hex',HexRoom);
class FastRoom extends HexRoom { protected botDelay = 1; }
game.define('practice',FastRoom);
class TimedRoom extends FastRoom { protected selectionTimeout = 250; }
game.define('timed',TimedRoom);
class CollateralRoom extends FastRoom {
 protected collateralTimeout = 250;
 protected buildRound(): MahjongRound {
  let serial=0;const tiles=(suit:Tile['type']['suit'],ranks:string):Tile[]=>[...ranks].map(rank=>({id:`fixture-${++serial}`,type:{suit,rank:Number(rank) as Tile['type']['rank']}}));
  const game=new MahjongRound({dealer:0,cap:8,hands:[tiles('characters','12345678912359'),tiles('bamboo','1234567891234'),tiles('bamboo','1234567891234'),tiles('bamboo','1234567891234')],wall:[...tiles('characters','5'),...tiles('dots','99999999')],hex:{rng:{next:()=>0},id:()=>`copy-${++serial}`,selections:false}});
  game.players[0]!.cards.push('collateral-damage','jeweled-gauntlet');return game;
 }
}
game.define('collateral-test',CollateralRoom);
class BloodRiverRoom extends FastRoom {
 protected buildRound(): MahjongRound {
  let serial=0;
  const tiles=(suit:Tile['type']['suit'],ranks:string):Tile[]=>[...ranks].map(rank=>({id:`blood-${++serial}`,type:{suit,rank:Number(rank) as Tile['type']['rank']}}));
  const wait=()=>[...tiles('characters','123456789'),...tiles('bamboo','1235')];
  const round=new MahjongRound({dealer:0,cap:16,hands:[[...tiles('characters','123456789'),...tiles('bamboo','12355')],wait(),wait(),wait()],wall:[...tiles('dots','999'),...tiles('bamboo','5'),...tiles('dots','999999999999')],hex:{rng:{next:()=>.99},id:()=>`copy-${++serial}`,selections:false}});
  round.players[0]!.cards.push('blood-river');return round;
 }
}
game.define('blood-test',BloodRiverRoom);


let client:Client;
const rooms:Room[]=[];
beforeAll(async()=>{await game.listen(0,'127.0.0.1'); const address=http.address(); if(!address||typeof address==='string')throw Error();client=new Client(`http://127.0.0.1:${address.port}`);});
afterAll(async()=>{await Promise.all(rooms.map(r=>r.leave()));await game.gracefullyShutdown(false);});
it('validates settings, allocates four seats, protects actions and reconnects',async()=>{
 await expect(client.create('hex',{scoreCap:9,rounds:8})).rejects.toThrow();
 const host=await client.create('hex',{scoreCap:16,rounds:8});rooms.push(host);host.onMessage('table',()=>{});
 const publicUpdate=new Promise<PublicRoom>(resolve=>host.onMessage('public',(value:PublicRoom)=>{if(value.seats.filter(s=>s.playerId).length===2)resolve(value);}));
 const friend=await client.joinById(host.roomId);rooms.push(friend);friend.onMessage('public',()=>{});friend.onMessage('table',()=>{});
 const snapshot=await publicUpdate;
 expect(snapshot.settings).toEqual({scoreCap:16,rounds:8});expect(snapshot.seats).toHaveLength(4);
 expect(snapshot.seats.filter(s=>s.playerId)).toHaveLength(2);
 expect(JSON.stringify(snapshot)).not.toMatch(/hand|wall|seed|offers|reconnectionToken/);
 const error=new Promise<{code:string}>(resolve=>friend.onMessage('error',resolve));
 friend.send('action',{type:'start_game'});expect((await error).code).toBe('ACTION_NOT_ALLOWED');
 const token=friend.reconnectionToken;const session=friend.sessionId;
 friend.connection.close();
 await new Promise(resolve=>setTimeout(resolve,150));
 const rejoined=await client.reconnect(token);rooms[1]=rejoined;rejoined.onMessage('public',()=>{});rejoined.onMessage('table',()=>{});
 expect(rejoined.sessionId).toBe(session);
 for(let i=0;i<2;i++){const r=await client.joinById(host.roomId);r.onMessage('public',()=>{});r.onMessage('table',()=>{});rooms.push(r);}
 await expect(client.joinById(host.roomId)).rejects.toThrow();
});

it('plays a complete private human-versus-bots round and carries balances into the next round',async()=>{
 const human=await client.create('practice',{scoreCap:8,rounds:8});rooms.push(human);
 human.onMessage('public',()=>{});
 const errors:string[]=[];human.onMessage('error',(value:{code:string})=>errors.push(value.code));
 let latest:TableSnapshot|null=null;
 human.onMessage('table',(snapshot:TableSnapshot)=>{latest=snapshot;});
 const until=async(predicate:()=>boolean)=>{const deadline=Date.now()+12000;while(!predicate()){if(Date.now()>deadline)throw Error('Timed out waiting for table');await new Promise(resolve=>setTimeout(resolve,10));}};
 await until(()=>!!latest);
 human.send('action',{type:'start_game'});
 await until(()=>latest?.round?.phase==='declare');
 expect(latest!.room.seats.filter(s=>s.bot)).toHaveLength(3);
 expect(latest!.you.hand).toHaveLength(14);
 // The host cannot act as a bot, set scores, use a stale decision or submit extra authoritative fields.
 human.send('action',{type:'play',decisionId:latest!.you.legal.decisionId,move:{type:'declare',suit:'dots',score:999}});
 await until(()=>errors.includes('INVALID_ACTION'));
 human.send('action',{type:'play',decisionId:'forged',move:{type:'declare',suit:'dots'}});
 await until(()=>errors.includes('STALE_ACTION'));
 let sent='';
 while(latest!.round!.phase!=='settled'){
  const snap=latest!,l=snap.you.legal,p=snap.round!.players[snap.you.seat]!;
  expect(JSON.stringify(snap.round)).not.toContain('cardOffers');
  expect(snap.round!.players.every(p=>p.revealedHand===null)).toBe(true);
  let move:Move|null=null;
  if(l.declarations.length){const missing=[...l.declarations].sort((a,b)=>snap.you.hand.filter(t=>t.type.suit===a).length-snap.you.hand.filter(t=>t.type.suit===b).length)[0]!;move={type:'declare',suit:missing};}
  else if(l.cardOffers.length)move={type:'choose_card',cardId:l.cardOffers[0]!};
  else if(l.canChooseCollateral)move={type:'collateral',use:true};
  else if(l.canWin)move={type:'win'};
  else if(l.claims.length)move={type:'claim',claim:l.claims.includes('win')?'win':l.claims.includes('kong')?'kong':l.claims.includes('pong')?'pong':'pass'};
  else if(l.kongIds.length)move={type:'kong',tileId:l.kongIds[0]!};
  else if(l.discardIds.length)move={type:'discard',tileId:p.handLocked?l.discardIds[0]!:chooseDiscard(snap.you.hand,p.melds.length,p.cards.includes('colour-blind')?null:p.missingSuit!,l.discardIds)};
  if(move&&sent!==l.decisionId){sent=l.decisionId;human.send('action',{type:'play',decisionId:l.decisionId,move});}
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 const settled=latest!.round!;
 expect(settled.selectionsCompleted).toBeGreaterThanOrEqual(1);
 expect(settled.players.every(p=>p.cards.length>=1&&p.cards.length<=2)).toBe(true);
 expect(settled.endReason).not.toBeNull();expect(settled.players.reduce((n,p)=>n+p.score,0)).toBe(0);
 expect(settled.events.some(e=>e.kind==='discard')).toBe(true);
 // Check the actual wire envelope: only the owner's concealed tile IDs are present.
 const envelope=latest! as unknown as Record<string,unknown>;
 expect(Object.keys(envelope).sort()).toEqual(['room','round','you']);
 for(const player of settled.players){expect(player).not.toHaveProperty('hand');expect(player).not.toHaveProperty('drawnId');expect(player.revealedHand).toHaveLength(player.handCount);for(const tile of player.revealedHand!)expect(Object.keys(tile).sort()).toEqual(['rank','suit']);}
 expect(settled).not.toHaveProperty('wall');
 const balances=settled.players.map(p=>p.score),nextDealer=settled.nextDealer;
 human.send('action',{type:'next_round'});await until(()=>latest!.round!.number===2);
 expect(latest!.round!.players.every(p=>p.cards.length===0&&p.winCount===0&&!p.handLocked&&p.revealedHand===null)).toBe(true);
 expect(latest!.round!.dealer).toBe(nextDealer);expect(latest!.round!.players.map(p=>p.score)).toEqual(balances);
 const expectedHand=latest!.you.hand.map(t=>t.id),token=human.reconnectionToken;
 human.connection.close();await new Promise(resolve=>setTimeout(resolve,100));
 const resumed=await client.reconnect(token);rooms[rooms.indexOf(human)]=resumed;
 resumed.onMessage('public',()=>{});resumed.onMessage('error',()=>{});
 const restored=await new Promise<TableSnapshot>(resolve=>resumed.onMessage('table',resolve));
 expect(restored.you.hand.map(t=>t.id)).toEqual(expectedHand);
 expect(restored.round!.players.map(p=>p.score)).toEqual(balances);
 expect(restored.room.seats[restored.you.seat]!.bot).toBe(false);
 expect(errors.filter(e=>e!=='INVALID_ACTION'&&e!=='STALE_ACTION')).toEqual([]);
});

it('privately restores pending offers and the same deadline on reconnect, with no early public reveal',async()=>{
 const host=await client.create('practice',{scoreCap:16,rounds:8});rooms.push(host);host.onMessage('public',()=>{});host.onMessage('error',()=>{});
 let a:TableSnapshot|null=null,b:TableSnapshot|null=null;
 host.onMessage('table',(v:TableSnapshot)=>{a=v;});
 const friend=await client.joinById(host.roomId);rooms.push(friend);friend.onMessage('public',()=>{});friend.onMessage('error',()=>{});friend.onMessage('table',(v:TableSnapshot)=>{b=v;});
 const wait=async(test:()=>boolean)=>{const end=Date.now()+3000;while(!test()){if(Date.now()>end)throw Error('Timed out');await new Promise(resolve=>setTimeout(resolve,10));}};
 await wait(()=>!!a&&!!b);host.send('action',{type:'start_game'});await wait(()=>a?.round?.phase==='declare'&&b?.round?.phase==='declare');
 host.send('action',{type:'play',decisionId:a!.you.legal.decisionId,move:{type:'declare',suit:'dots'}});
 friend.send('action',{type:'play',decisionId:b!.you.legal.decisionId,move:{type:'declare',suit:'dots'}});
 await wait(()=>a?.you.legal.cardOffers.length===2&&b?.you.legal.cardOffers.length===2);
 const offers=[...a!.you.legal.cardOffers],deadline=a!.round!.selection!.deadline,token=host.reconnectionToken;
 expect(deadline).toBeGreaterThan(Date.now());expect(a!.room.lifecycle).toBe('card_selection');expect(a!.round!.players.every(p=>p.cards.length===0)).toBe(true);
 expect(JSON.stringify(a!.round)).not.toContain('cardOffers');expect(new Set(offers).size).toBe(2);
 host.connection.close();await new Promise(resolve=>setTimeout(resolve,100));const resumed=await client.reconnect(token);rooms[rooms.indexOf(host)]=resumed;resumed.onMessage('public',()=>{});resumed.onMessage('error',()=>{});
 const restored=await new Promise<TableSnapshot>(resolve=>resumed.onMessage('table',resolve));
 expect(restored.you.legal.cardOffers).toEqual(offers);expect(restored.round!.selection!.deadline).toBe(deadline);
 resumed.send('action',{type:'play',decisionId:restored.you.legal.decisionId,move:{type:'choose_card',cardId:offers[0]}});
 await wait(()=>b!.round!.selection!.pendingSeats.includes(0)===false);
 expect(b!.round!.players[0]!.cards).toEqual([]);
 friend.send('action',{type:'play',decisionId:b!.you.legal.decisionId,move:{type:'choose_card',cardId:b!.you.legal.cardOffers[0]}});
 await wait(()=>b!.round!.phase!=='card_selection');expect(b!.round!.players.every(p=>p.cards.length===1)).toBe(true);
});
it('auto-picks a private offer on its server deadline without discarding for the human',async()=>{
 const human=await client.create('timed',{scoreCap:8,rounds:8});rooms.push(human);human.onMessage('public',()=>{});human.onMessage('error',()=>{});
 let snapshot:TableSnapshot|null=null;human.onMessage('table',(v:TableSnapshot)=>{snapshot=v;});
 const wait=async(test:()=>boolean)=>{const end=Date.now()+4000;while(!test()){if(Date.now()>end)throw Error('Timed out');await new Promise(resolve=>setTimeout(resolve,5));}};
 await wait(()=>!!snapshot);human.send('action',{type:'start_game'});await wait(()=>snapshot?.round?.phase==='declare');
 human.send('action',{type:'play',decisionId:snapshot!.you.legal.decisionId,move:{type:'declare',suit:'dots'}});
 await wait(()=>snapshot!.you.legal.cardOffers.length===2);const offered=[...snapshot!.you.legal.cardOffers];
 await wait(()=>snapshot!.round!.phase==='discard');
 expect(offered).toContain(snapshot!.round!.players[0]!.cards[0]);expect(snapshot!.you.hand).toHaveLength(14);
 await new Promise(resolve=>setTimeout(resolve,350));
 expect(snapshot!.round!.turn).toBe(0);expect(snapshot!.round!.players[0]!.discards).toHaveLength(0);
});

it('applies mandatory collateral without a decision deadline, rolls one crit and charges only eligible bystanders',async()=>{
 const human=await client.create('collateral-test',{scoreCap:8,rounds:8});rooms.push(human);human.onMessage('public',()=>{});human.onMessage('error',()=>{});
 let snap:TableSnapshot|null=null;human.onMessage('table',(v:TableSnapshot)=>{snap=v;});
 const wait=async(test:()=>boolean)=>{const end=Date.now()+4000;while(!test()){if(Date.now()>end)throw Error('Timed out');await new Promise(resolve=>setTimeout(resolve,5));}};
 const move=(value:Move)=>human.send('action',{type:'play',decisionId:snap!.you.legal.decisionId,move:value});
 await wait(()=>!!snap);human.send('action',{type:'start_game'});await wait(()=>!!snap!.you.legal.declarations.length);move({type:'declare',suit:'dots'});
 await wait(()=>!!snap!.you.legal.discardIds.length);move({type:'discard',tileId:snap!.you.hand.at(-1)!.id});
 await wait(()=>snap!.you.legal.claims.includes('win'));move({type:'claim',claim:'win'});
 await wait(()=>snap!.round!.payments.some(p=>p.reason==='collateral'));
 expect(snap!.you.legal.canChooseCollateral).toBe(false);expect(snap!.round!.collateral).toBeNull();
 expect(snap!.round!.payments.filter(p=>p.reason==='win')).toHaveLength(1);
 expect(snap!.round!.payments.find(p=>p.reason==='win')).toMatchObject({from:1,to:0,amount:8,critical:true});
 expect(snap!.round!.payments.filter(p=>p.reason==='collateral').map(p=>[p.from,p.to,p.amount])).toEqual([[2,0,4],[3,0,4]]);
 expect(snap!.round!.players.reduce((n,p)=>n+p.score,0)).toBe(0);
});

it('automatically continues a connected human Blood River seat after the first win',async()=>{
 const human=await client.create('blood-test',{scoreCap:16,rounds:8});rooms.push(human);human.onMessage('public',()=>{});human.onMessage('error',()=>{});
 let snap:TableSnapshot|null=null;human.onMessage('table',(v:TableSnapshot)=>{snap=v;});
 const wait=async(test:()=>boolean)=>{const end=Date.now()+4000;while(!test()){if(Date.now()>end)throw Error('Timed out');await new Promise(resolve=>setTimeout(resolve,5));}};
 const move=(value:Move)=>human.send('action',{type:'play',decisionId:snap!.you.legal.decisionId,move:value});
 await wait(()=>!!snap);human.send('action',{type:'start_game'});await wait(()=>!!snap!.you.legal.declarations.length);move({type:'declare',suit:'dots'});
 await wait(()=>snap!.you.legal.canWin);expect(snap!.round!.players[0]!.handLocked).toBe(false);move({type:'win'});
 await wait(()=>snap!.round!.phase==='settled');
 expect(snap!.round!.players[0]!.winCount).toBeGreaterThanOrEqual(2);
 expect(snap!.round!.players[0]!.discards.length).toBeGreaterThan(0);
 expect(snap!.room.seats[0]).toMatchObject({bot:false,connected:true});
});
