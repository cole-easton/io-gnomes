
import type { Map, Tile } from './types';
import type { NoiseFunction2D } from 'simplex-noise';
import { createNoise2D } from 'simplex-noise';

const rng = Math.random;

const waterMap = createNoise2D(rng);
const waterMap2 = createNoise2D(rng);
const moistureMap = createNoise2D(rng);
const tempMap = createNoise2D(rng);
const rockinessMap = createNoise2D(rng);
const oilMap = createNoise2D(rng);
const k = 0.004;

export function getMap(size: number): Map {
    const tiles: Tile[] = [];
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            tiles.push({
                isWater: waterMap(0.002 * x, 0.002 * z) + waterMap2(k * x + 0.3, k * z + 0.3) < 0,
                salinity: 0,
                moisture: (moistureMap(k * x, k * z) + 1) * 0.45,
                temperature: 0.8 * (1 - Math.abs(x - z) / size) + 0.2 * (tempMap(k * x, k * z) + 1) / 2,
                rockiness: (rockinessMap(k * x, k * z) + 1) / 2,
                oil: (oilMap(k * x, k * z) + 1) / 2,
            });
        }
    }

    const total = size * size;

    const visited = new Uint8Array(total);
    const componentId = new Int32Array(total);

    const directions = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
        [1, 1], [1, -1],
        [-1, 1], [-1, -1],
    ];

    function idx(x: number, z: number) {
        return x + z * size;
    }

    let currentId = 0;
    const componentSizes: number[] = [];

    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const start = idx(x, z);

            if (visited[start] || !tiles[start].isWater) continue;

            let count = 0;
            const stack: number[] = [start];
            visited[start] = 1;

            while (stack.length > 0) {
                const i = stack.pop()!;
                componentId[i] = currentId;
                count++;

                const cx = i % size;
                const cz = (i / size) | 0;

                for (const [dx, dz] of directions) {
                    const nx = cx + dx;
                    const nz = cz + dz;

                    if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                        const ni = idx(nx, nz);

                        if (!visited[ni] && tiles[ni].isWater) {
                            visited[ni] = 1;
                            stack.push(ni);
                        }
                    }
                }
            }

            componentSizes.push(count);
            currentId++;
        }
    }

    const maxSize = Math.max(...componentSizes);

    const salinityById = componentSizes.map(size => {
        if (size / maxSize > 0.8) {
            if (rng() > 0.01) {
                return 0.7 + 0.3 * rng();
            }
            return rng();
        }
        else if (rng() > 0.05) {
            return 0;
        }
        return rng();
    });

    for (let i = 0; i < total; i++) {
        if (tiles[i].isWater) {
            tiles[i].salinity = salinityById[componentId[i]];
        }
    }

    const radius = 6;
    const s = 0.025;
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            const i = idx(x, y);
            if (tiles[i].isWater) {
                continue;
            }
            let salinitySum = 0;
            let moistureSum = 0;
            let weights = 0;
            const xMax = Math.min(x + radius, size - 1) - x;
            const yMax = Math.min(y + radius, size - 1) - y;
            for (let xi = Math.max(x - radius, 0) - x; xi <= xMax; xi++) {
                for (let yi = Math.max(y - radius, 0) - y; yi <= yMax; yi++) {
                    if (!xi && !yi) {
                        continue;
                    }
                    const ii = idx(x+xi, y+yi);
                    const w = Math.exp(-s * xi ** 2);
                    weights += w;
                    if (tiles[ii].isWater) {
                        salinitySum += w * tiles[ii].salinity;
                        moistureSum += w;
                    }
                }
            }
            tiles[i].salinity = salinitySum / weights;
            const newMoisture = moistureSum/weights;
            if (newMoisture > tiles[i].moisture) {
                tiles[i].moisture = newMoisture;
            }
        }
    }

    return { width: size, height: size, tiles };
}