import type { Tile, TileType, Suit, MeldKind, Pattern, ScoreCap } from '@hex/shared';
export const SUITS: Suit[] = ['characters', 'bamboo', 'dots'];
export const typeIndex = (type: TileType): number => SUITS.indexOf(type.suit) * 9 + type.rank - 1;
export const fromIndex = (index: number): TileType => ({ suit: SUITS[Math.floor(index / 9)]!, rank: (index % 9 + 1) as TileType['rank'] });
export const sameType = (a: TileType, b: TileType): boolean => typeIndex(a) === typeIndex(b);
export function counts(tiles: readonly Tile[]): number[] {
  const c = Array<number>(27).fill(0);
  for (const tile of tiles) c[typeIndex(tile.type)]!++;
  return c;
}
export interface Meld { kind: MeldKind; tiles: Tile[]; from: number }
export interface WinScore { fan: number; points: number; patterns: Pattern[] }
export interface WinContext { selfDraw?: boolean; robKong?: boolean; afterKong?: boolean }
function canMakeSets(c: number[], needed: number, tripletsOnly: boolean): boolean {
  const index = c.findIndex(n => n > 0);
  if (index < 0) return needed === 0;
  if (needed <= 0) return false;
  if (c[index]! >= 3) {
    c[index]! -= 3;
    const yes = canMakeSets(c, needed - 1, tripletsOnly); c[index]! += 3;
    if (yes) return true;
  }
  if (!tripletsOnly && index % 9 < 7 && c[index + 1]! > 0 && c[index + 2]! > 0) {
    c[index]!--; c[index + 1]!--; c[index + 2]!--;
    const yes = canMakeSets(c, needed - 1, false);
    c[index]!++; c[index + 1]!++; c[index + 2]!++;
    if (yes) return true;
  }
  return false;
}
function ordinary(c: number[], needed: number, tripletsOnly: boolean): boolean {
  for (let i = 0; i < 27; i++) if (c[i]! >= 2) {
    c[i]! -= 2; const yes = canMakeSets(c, needed, tripletsOnly); c[i]! += 2;
    if (yes) return true;
  }
  return false;
}
export function scoreHand(hand: readonly Tile[], melds: readonly Meld[], missing: Suit | null, cap: ScoreCap, context: WinContext = {}): WinScore | null {
  if (melds.length > 4 || hand.length !== 14 - 3 * melds.length || hand.some(t => t.type.suit === missing)) return null;
  const c = counts(hand);
  const seven = melds.length === 0 && c.every(n => n % 2 === 0);
  const regular = ordinary(c, 4 - melds.length, false);
  if (!seven && !regular) return null;
  const all = [...hand, ...melds.flatMap(m => m.tiles)];
  const pure = new Set(all.map(t => t.type.suit)).size === 1;
  const roots = counts(all).reduce((n, c) => n + Math.floor(c / 4), 0);
  const variants: Pattern[][] = [];
  if (regular) {
    const patterns: Pattern[] = [];
    if (ordinary(c, 4 - melds.length, true)) patterns.push({ key: 'all_pongs', fan: 1 });
    if (pure) patterns.push({ key: 'pure_suit', fan: 2 });
    if (melds.length === 4) patterns.push({ key: 'single_wait', fan: 1 });
    variants.push(patterns);
  }
  if (seven) variants.push([{ key: pure ? 'pure_seven_pairs' : 'seven_pairs', fan: pure ? 3 : 2 }]);
  const patterns = variants.sort((a, b) => b.reduce((n, p) => n + p.fan, 0) - a.reduce((n, p) => n + p.fan, 0))[0]!;
  if (roots) patterns.push({ key: 'roots', fan: roots });
  if (context.selfDraw) patterns.push({ key: 'self_draw', fan: 1 });
  if (context.robKong) patterns.push({ key: 'rob_kong', fan: 1 });
  if (context.afterKong) patterns.push({ key: 'after_kong', fan: 1 });
  const fan = patterns.reduce((n, p) => n + p.fan, 0);
  return { fan, patterns, points: cap === 'uncapped' ? 2 ** fan : Math.min(cap, 2 ** fan) };
}
export function readyScore(hand: readonly Tile[], melds: readonly Meld[], missing: Suit | null, cap: ScoreCap, minimumFan = 0): WinScore | null {
  let best: WinScore | null = null;
  for (let i = 0; i < 27; i++) {
    const score = scoreHand([...hand, { id: 'hypothetical', type: fromIndex(i) }], melds, missing, cap);
    if (score && score.fan >= minimumFan && (!best || score.fan > best.fan)) best = score;
  }
  return best;
}
// Exact standard shanten search using only this player's visible tiles; no wall/opponent input.
export function shanten(tiles: readonly Tile[], meldCount: number): number {
  const c = counts(tiles);
  let best = 8;
  const search = (start: number, sets: number, partial: number, pair: number): void => {
    while (start < 27 && !c[start]) start++;
    if (start >= 27) { best = Math.min(best, 8 - 2 * (sets + meldCount) - Math.min(partial, 4 - sets - meldCount) - pair); return; }
    const n = c[start]!;
    if (n >= 3) { c[start]! -= 3; search(start, sets + 1, partial, pair); c[start]! += 3; }
    if (start % 9 < 7 && c[start + 1]! && c[start + 2]!) {
      c[start]!--; c[start + 1]!--; c[start + 2]!--; search(start, sets + 1, partial, pair); c[start]!++; c[start + 1]!++; c[start + 2]!++;
    }
    if (n >= 2) {
      c[start]! -= 2;
      if (!pair) search(start, sets, partial, 1);
      search(start, sets, partial + 1, pair); c[start]! += 2;
    }
    for (const gap of [1, 2]) if (start % 9 + gap < 9 && c[start + gap]!) {
      c[start]!--; c[start + gap]!--; search(start, sets, partial + 1, pair); c[start]!++; c[start + gap]!++;
    }
    c[start]!--; search(start, sets, partial, pair); c[start]!++;
  };
  search(0, 0, 0, 0);
  if (!meldCount) best = Math.min(best, 6 - c.reduce((n, count) => n + Math.floor(count / 2), 0));
  return best;
}
export function chooseDiscard(hand: readonly Tile[], meldCount: number, missing: Suit | null, legalIds: readonly string[]): string {
  const candidates = hand.filter(t => legalIds.includes(t.id));
  const cache = new Map<number, number>();
  let best = Infinity, chosen = candidates[0]!.id;
  const c = counts(hand);
  for (const tile of candidates) {
    const i = typeIndex(tile.type);
    let value = cache.get(i);
    if (value === undefined) {
      const remaining = hand.filter(t => t.id !== tile.id && t.type.suit !== missing);
      const distance = shanten(remaining, meldCount);
      const support = (c[i]! - 1) * 3 + [1, 2].reduce((n, gap) => n + (i % 9 >= gap ? c[i - gap]! : 0) + (i % 9 + gap < 9 ? c[i + gap]! : 0), 0);
      // Shanten dominates; break ties by preserving connected/paired tiles and dropping edges.
      value = distance * 100 + support * 2 + (4 - Math.abs(4 - i % 9)); cache.set(i, value);
    }
    if (value < best) { best = value; chosen = tile.id; }
  }
  return chosen;
}
