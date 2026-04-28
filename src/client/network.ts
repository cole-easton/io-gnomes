import { getViewport } from "../map/viewport"; 
import { GAME_CONFIG } from "../shared/config";
import { getMap } from "../map/map";
import type { Map, ViewportState } from "../map/types";
const map: Map = getMap(GAME_CONFIG.mapDebug?1000:3000);
const viewportSize = GAME_CONFIG.mapDebug?1000:16;

export function requestViewport(playerX: number, playerZ: number): ViewportState {
  return getViewport(map, playerX, playerZ, viewportSize, viewportSize);
}
