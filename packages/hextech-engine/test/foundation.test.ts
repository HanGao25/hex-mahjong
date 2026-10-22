import { describe, it, expect } from 'vitest';
import { CARDS, parseSettings, SCORE_CAPS, randomIndex, type Tile, type Rng } from '@hex/shared';
import { Wall, copyTile, shuffle } from '@hex/mahjong-engine';
import { selectionOffers, offerCards, rollCritical, dueSelection } from '../src/index.js';
const rng = (n:number):Rng => ({next:()=>n});
const tile = (id:string):Tile => ({id,type:{suit:'bamboo',rank:1}});
describe('foundation contracts',()=>{
 it('has twenty-four unique cards with the specified tiers',()=>{
  expect(CARDS.map(c=>[c.id,c.tier])).toEqual([
   ['bathroom-break','silver'],['loan-construction','gold'],['fan-the-flames','gold'],
   ['cheat','silver'],['machine-malfunction','silver'],['point-pong-kong','silver'],
   ['double-wield','prismatic'],['collateral-damage','gold'],['colour-blind','gold'],
   ['jeweled-gauntlet','gold'],['blood-river','prismatic'],['echo','gold'],['great-wall','silver'],['petty-theft','silver'],['sneaky-theft','gold'],['grand-theft','prismatic'],['radiant-echo','prismatic'],['troublemaker','gold'],['precision-strike','silver'],['willing-victim','gold'],['no-more','gold'],['liandrys-torment','gold'],['machine-wrath','prismatic'],['hard-work','prismatic']]);
  expect(new Set(CARDS.map(c=>c.id)).size).toBe(24);
 });
 it('accepts only specified settings',()=>{
  for(const scoreCap of SCORE_CAPS)for(const rounds of [8,16]) expect(parseSettings({scoreCap,rounds})).toEqual({scoreCap,rounds});
  for(const invalid of [null,[],{}, {scoreCap:'8',rounds:8},{scoreCap:0,rounds:8},{scoreCap:8,rounds:4},{scoreCap:8,rounds:8,extra:true}]) expect(()=>parseSettings(invalid)).toThrow();
 });
 it('offers distinct same-tier cards and excludes previous choices per player',()=>{
  for(const tier of ['silver','gold','prismatic'] as const){
   const offers=offerCards(tier,[],rng(0));
   expect(offers[0]).not.toBe(offers[1]);
   expect(offers.every(id=>CARDS.some(c=>c.id===id&&c.tier===tier))).toBe(true);
   expect(offerCards(tier,[offers[0]],rng(0))).not.toContain(offers[0]);
   expect(offerCards(tier,[],rng(0))).toEqual(offers);
   expect(()=>offerCards(tier,CARDS.filter(c=>c.tier===tier).map(c=>c.id),rng(0))).toThrow('INSUFFICIENT');
  }
 });
 it('copies identity while preserving type and rejects reused IDs',()=>{
  const original=tile('a'), copied=copyTile(original,()=> 'b');
  expect(copied).toEqual({...original,id:'b'});expect(copied.type).not.toBe(original.type);
  expect(()=>copyTile(original,()=> 'a')).toThrow();
  const wall=new Wall([original]);wall.draw();expect(()=>wall.insertCopy(tile('b'),rng(0),()=> 'a')).toThrow();
 });
 it('supports arbitrary tile multiplicity and ordered random insertion/removal',()=>{
  const wall=new Wall(Array.from({length:6},(_,i)=>tile(String(i))));
  expect(wall.remaining).toBe(6);
  expect(wall.removeRandom(2,rng(0)).map(t=>t.id)).toEqual(['0','1']);
  wall.insertCopy(tile('hand'),rng(0),()=> 'copy');
  expect(wall.draw()?.id).toBe('copy');expect(wall.draw()?.id).toBe('2');
  expect(wall.remaining).toBe(3);
  expect(()=>wall.removeRandom(4,rng(0))).toThrow();
  expect(new Wall([]).draw()).toBeUndefined();
 });
 it('controls probability boundaries and shuffle with injected RNG',()=>{
  expect(rollCritical(rng(0))).toBe(true);expect(rollCritical(rng(.399999))).toBe(true);
  expect(rollCritical(rng(.4))).toBe(false);expect(rollCritical(rng(.999999))).toBe(false);
  expect(shuffle([1,2,3],rng(0))).toEqual([2,3,1]);
  for(const n of [-1,1,NaN]) expect(()=>randomIndex(3,rng(n))).toThrow();
 });
 it('does not repeat last-16 selection after wall grows',()=>{
  expect(dueSelection({initialDone:true,last16Done:false},false,16)).toBe('before_draw_with_16_remaining');
  expect(dueSelection({initialDone:true,last16Done:true},false,16)).toBeUndefined();
 });
});

it('filters stage-only cards before choosing offers and a common tier',()=>{
 for(const stage of ['initial','last16'] as const) for(let n=0;n<100;n++) {
  const result=selectionOffers([[],[],[],[]],rng(n/100),stage)!;
  for(const offers of result.offers) {
   expect(offers).not.toContain(stage==='initial'?'bathroom-break':'loan-construction');
   expect(offers).toHaveLength(2);
  }
 }
});
