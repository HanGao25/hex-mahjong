import { CARDS, randomIndex, type CardId, type Rng, type Tier, type Tile, type Card } from '@hex/shared';
function eligible(tier: Tier, selected: readonly CardId[], stage: 'initial' | 'last16') {
  return CARDS.filter((c: Card) => c.tier === tier && !selected.includes(c.id) && (!c.selectionStage || c.selectionStage === stage)).map(c => c.id);
}
export function offerCards(tier: Tier, selected: readonly CardId[], rng: Rng, stage: 'initial' | 'last16' = 'initial'): readonly [CardId, CardId] {
  const pool = eligible(tier, selected, stage);
  if (pool.length < 2) throw new Error('INSUFFICIENT_ELIGIBLE_CARDS');
  const first = pool.splice(randomIndex(pool.length, rng), 1)[0]!;
  return [first, pool[randomIndex(pool.length, rng)]!];
}
export function selectionOffers(owned: readonly (readonly CardId[])[], rng: Rng, stage: 'initial' | 'last16' = 'initial') {
  const tiers = (['silver', 'gold', 'prismatic'] as const).filter(tier => owned.every(cards => eligible(tier, cards, stage).length >= 2));
  if (!tiers.length) return null;
  const tier = tiers[randomIndex(tiers.length, rng)]!;
  return { tier, offers: owned.map(cards => offerCards(tier, cards, rng, stage)) };
}
export function rollCritical(rng: Rng): boolean { return randomIndex(1000000, rng) < 400000; }
export function sampleTiles(tiles: readonly Tile[], count: number, rng: Rng): Tile[] {
  const pool = [...tiles], chosen: Tile[] = [];
  for (let n = 0; n < count && pool.length; n++) chosen.push(pool.splice(randomIndex(pool.length, rng), 1)[0]!);
  return chosen;
}
export function copyInstance(tile: Tile, id: () => string): Tile {
  const next = id();
  if (!next || next === tile.id) throw Error('DUPLICATE_TILE_ID');
  return { id: next, type: { ...tile.type } };
}
export function applyWallCard(card: CardId, sources: readonly Tile[], wall: Tile[], rng: Rng, id: () => string): { removed: Tile[]; inserted: number } {
  if (card === 'machine-malfunction') {
    const removed: Tile[] = [];
    for (let n = 0; n < 2 && wall.length; n++) removed.push(wall.splice(randomIndex(wall.length, rng), 1)[0]!);
    return { removed, inserted: 0 };
  }
  if (card === 'echo' || card === 'radiant-echo') {
    const selected = card === 'radiant-echo' ? (sources.length ? Array.from({ length: 5 }, () => sources[randomIndex(sources.length, rng)]!) : []) : sampleTiles(sources, 3, rng);
    const copies = selected.map(tile => copyInstance(tile, id));
    for (const tile of copies) wall.splice(randomIndex(wall.length + 1, rng), 0, tile);
    return { removed: [], inserted: copies.length };
  }
  return { removed: [], inserted: 0 };
}
export interface SelectionProgress { initialDone: boolean; last16Done: boolean }
export function dueSelection(progress: SelectionProgress, beforeFirstDiscard: boolean, wallRemaining: number) {
  if (beforeFirstDiscard && !progress.initialDone) return 'before_dealer_first_discard' as const;
  if (wallRemaining > 0 && wallRemaining <= 16 && !progress.last16Done) return 'before_draw_with_16_remaining' as const;
  return undefined;
}
