import { getViewport } from "../map/viewport"; 
import { getMap } from "../map/map";
import type { Map } from "../map/types";
const map: Map = getMap(100);

export function requestViewport(playerX: number, playerZ: number) {
  return getViewport(map, playerX, playerZ, 16, 9);
}