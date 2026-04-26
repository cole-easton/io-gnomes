import type { Map, Tile, VisibleTile, Color } from "./types";

function getTile(map: Map, x: number, z: number): Tile | undefined {
    if (x < -map.width / 2 || z < -map.height / 2 || x >= map.width / 2 || z >= map.height / 2) return undefined;
    return map.tiles[x + map.width / 2 + (z + map.height / 2) * map.width];
}

export function getViewport(
    map: Map,
    centerX: number,
    centerZ: number,
    width: number,
    height: number
): VisibleTile[] {
    const tiles: VisibleTile[] = [];

    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    for (let dx = -halfW; dx <= halfW; dx++) {
        for (let dz = -halfH; dz <= halfH; dz++) {
            const x = Math.round(centerX) + dx;
            const z = Math.round(centerZ) + dz;

            const tile = getTile(map, x, z);
            if (!tile) continue;
            let color: Color;
            if (tile.isWater) {
                color = { r: 0, g: tile.salinity, b: 1 };
            }
            else if (tile.salinity > 0) { //beach
                color = { r: 0.95, g: 0.87, b: 0.47 };
            }
            else if (tile.moisture > 0.67 && tile.temperature > 0.65) { //rainforest
                color = { r: 0, g: 0.4, b: 0.2 }
            }
            else if (tile.moisture < 0.35 && tile.temperature > 0.7) { //desert
                color = { r: 0.95, g: 0.87, b: 0.47 };
            }
            else if (tile.temperature < 0.3) {
                if (tile.moisture > 0.3) { //snow/ice
                    color = { r: 0.8, g: 0.88, b: 1 };
                }
                else { //barren wasteland
                    color = { r: 0.33, g: 0.24, b: 0.1 };
                }
            }
            else { //grass
                color = { r: 0.6, g: 0.9, b: 0.1 };
            }
            tiles.push({
                x,
                z,
                appearance: {
                    color
                }
            });
        }
    }

    return tiles;
}