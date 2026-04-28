import { NO_OCCUPANT_ID, type OccupantId, type VisibleOccupant } from "./occupants";
import type { Map, Tile, VisibleTile, Color, ViewportState } from "./types";

function getTile(map: Map, x: number, z: number): Tile | undefined {
    if (x < -map.width / 2 || z < -map.height / 2 || x >= map.width / 2 || z >= map.height / 2) return undefined;
    return map.tiles[x + map.width / 2 + (z + map.height / 2) * map.width];
}

function getWorldPositionFromTileIndex(map: Map, tileIndex: number) {
    return {
        x: tileIndex % map.width - map.width / 2,
        z: Math.floor(tileIndex / map.width) - map.height / 2,
    };
}

export function getViewport(
    map: Map,
    centerX: number,
    centerZ: number,
    width: number,
    height: number
): ViewportState {
    const tiles: VisibleTile[] = [];
    const occupants: VisibleOccupant[] = [];
    const seenOccupantIds = new Set<OccupantId>();

    const roundedCenterX = Math.round(centerX);
    const roundedCenterZ = Math.round(centerZ);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    const originX = roundedCenterX - halfW;
    const originZ = roundedCenterZ - halfH;

    for (let dx = -halfW; dx <= halfW; dx++) {
        for (let dz = -halfH; dz <= halfH; dz++) {
            const x = roundedCenterX + dx;
            const z = roundedCenterZ + dz;

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
                occupantId: tile.occupantId,
                appearance: {
                    color
                }
            });

            if (tile.occupantId !== NO_OCCUPANT_ID && !seenOccupantIds.has(tile.occupantId)) {
                seenOccupantIds.add(tile.occupantId);
                const occupant = map.occupantsById.get(tile.occupantId);
                if (!occupant) {
                    continue;
                }
                const anchorPosition = getWorldPositionFromTileIndex(map, occupant.anchorTile);
                occupants.push({
                    id: occupant.id,
                    kind: occupant.kind,
                    meshPath: occupant.meshPath,
                    anchorX: anchorPosition.x,
                    anchorZ: anchorPosition.z,
                });
            }
        }
    }

    return {
        originX,
        originZ,
        width: 2 * halfW + 1,
        height: 2 * halfH + 1,
        tiles,
        occupants,
    };
}
