
import type { Map, Tile } from './types';

const rng = Math.random;


export function getMap(size: number): Map {
    const tiles: Tile[] = [];
    for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
            const g = 0.5 * rng() + 0.5;
            tiles.push({ r: 0.9 * g * rng(), g: g, b: 0.05 * rng()});
        }
    }
    return {width: size, height: size, tiles};
}