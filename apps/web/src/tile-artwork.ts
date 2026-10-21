import type { TileType } from '@hex/shared';

// Adapted verbatim from the existing site's script.js tileArtwork renderer.
// Keep its palettes, layouts, Chinese numerals and bird artwork in sync.
// All SVG markup is generated from these local constants, never user HTML.
const birdUrl = new URL('./assets/bird.png', import.meta.url).href;

export function tileArtwork(tile: TileType): string {
    // The practice game's numeric order is 万, 筒, 条 (different from engine indices).
    const id = ({ characters: 0, dots: 1, bamboo: 2 }[tile.suit] * 9) + tile.rank - 1;
    const rank = id % 9 + 1, suit = Math.floor(id / 9);
    const red = '#b42f32', green = '#176448', blue = '#214977';
    let drawing = '';
    if (suit === 0) {
        drawing = `<text x="30" y="31" text-anchor="middle" fill="${blue}" font-size="29" font-family="Kaiti SC, STKaiti, KaiTi, serif">${'一二三四五六七八九'[rank-1]}</text><text x="30" y="64" text-anchor="middle" fill="${red}" font-size="32" font-family="Kaiti SC, STKaiti, KaiTi, serif">萬</text>`;
    } else if (suit === 2 && rank === 1) {
        // One bamboo traditionally uses a bird instead of a single stalk.
        drawing = `<image href="${birdUrl}" x="2" y="2" width="56" height="72" preserveAspectRatio="xMidYMid meet"/>`;
    } else {
        const layouts: Record<number, [number, number][]> = {
            1: [[30,38]], 2: [[30,21],[30,55]], 3: [[16,17],[30,38],[44,59]],
            4: [[16,20],[44,20],[16,56],[44,56]],
            5: [[16,16],[44,16],[30,38],[16,60],[44,60]],
            6: [[16,16],[44,16],[16,38],[44,38],[16,60],[44,60]],
            7: [[30,12],[16,30],[44,30],[16,46],[44,46],[16,62],[44,62]],
            8: [[16,12],[44,12],[16,29],[44,29],[16,47],[44,47],[16,64],[44,64]],
            9: [[14,16],[30,16],[46,16],[14,38],[30,38],[46,38],[14,60],[30,60],[46,60]]
        };
        const positions: [number, number][] = suit === 1 && rank === 7
            ? [[14,12],[30,23],[46,34],[16,48],[44,48],[16,66],[44,66]]
            : layouts[rank]!;
        drawing = positions.map(([x,y], i) => {
            const color = suit === 1 ? (rank === 7 ? (i < 3 ? green : red) : rank === 1 ? green : rank === 5 && i === 2 ? red : rank === 9 ? [green,red,blue][Math.floor(i/3)] : i % 2 ? blue : green) : (rank === 7 && i === 0 ? red : green);
            if (suit === 1) {
                const r = rank === 1 ? 21 : rank === 9 ? 6 : 8;
                return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${r*0.55}" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${rank === 1 ? 5 : 2}" fill="${rank === 1 ? red : color}"/>`;
            }
            return `<g stroke="${color}" stroke-linecap="round"><path d="M${x-2} ${y-6} V${y+6} M${x+2} ${y-6} V${y+6}" stroke-width="2.5"/><path d="M${x-4} ${y-6} H${x+4} M${x-4} ${y} H${x+4} M${x-4} ${y+6} H${x+4}" stroke-width="2"/></g>`;
        }).join('');
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
