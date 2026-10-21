import { randomIndex, type Rng, type Tile } from '@hex/shared';
export type TileIdFactory = () => string;
export function copyTile(tile: Tile, id: TileIdFactory): Tile {
  const next = id();
  if (!next || next === tile.id) throw new Error('DUPLICATE_TILE_ID');
  return { id: next, type: { ...tile.type } };
}
export { shuffle } from './random.js';
export class Wall {
  private tiles: Tile[];
  // Retain IDs of drawn/removed tiles to reject reuse during this wall's lifetime.
  private readonly known = new Set<string>();
  constructor(tiles: readonly Tile[]) {
    this.tiles = tiles.map(t => this.accept(t));
  }
  private accept(tile: Tile): Tile {
    if (!tile.id || this.known.has(tile.id)) throw new Error('DUPLICATE_TILE_ID');
    this.known.add(tile.id);
    return { id: tile.id, type: { ...tile.type } };
  }
  get remaining(): number { return this.tiles.length; }
  draw(): Tile | undefined { return this.tiles.shift(); }
  removeRandom(count: number, rng: Rng): Tile[] {
    if (!Number.isSafeInteger(count) || count < 0 || count > this.remaining) throw new Error('INVALID_COUNT');
    const removed: Tile[] = [];
    for (let i = 0; i < count; i++) removed.push(this.tiles.splice(randomIndex(this.remaining, rng), 1)[0]!);
    return removed;
  }
  insertCopy(tile: Tile, rng: Rng, id: TileIdFactory): Tile {
    const copied = copyTile(tile, id);
    const position = randomIndex(this.remaining + 1, rng);
    this.tiles.splice(position, 0, this.accept(copied));
    return copied;
  }
}
export * from './hand.js';
export * from './round.js';
