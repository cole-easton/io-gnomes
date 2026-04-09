import type {Map, Tile, VisibleTile} from "./types";

function getTile(map: Map, x: number, z: number): Tile | undefined {
  if (x < 0 || z < 0 || x >= map.width || z >= map.height) return undefined;
  return map.tiles[x + z * map.width];
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
      const x = centerX + dx;
      const z = centerZ + dz;

      const tile = getTile(map, x, z);
      if (!tile) continue;

      tiles.push({
        x,
        z,
        r: tile.r,
        g: tile.g,
        b: tile.b,
      });
    }
  }

  return tiles;
}