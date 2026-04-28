import type { Tile } from "./types";
import type { Occupant, OccupantId } from "./occupants";

export type TileIndex = number;
export type PlantTypeId = string;
export type PlantInstanceId = OccupantId;
export type PlantWeight = number;

export type MeshReference = string;

export type TileOffset = {
  dx: number;
  dz: number;
};

export type PlantType = {
  id: PlantTypeId;
  mesh: MeshReference | null;
  footprint: TileOffset[];
  getTileWeight: (tile: Tile) => PlantWeight;
};

export type PlantInstance = Occupant & {
  kind: "plant";
  plantTypeId: PlantTypeId;
  createdAtMs: number;
};

export const THREE_BY_THREE_FOOTPRINT: TileOffset[] = [
  { dx: -1, dz: -1 },
  { dx: 0, dz: -1 },
  { dx: 1, dz: -1 },
  { dx: -1, dz: 0 },
  { dx: 0, dz: 0 },
  { dx: 1, dz: 0 },
  { dx: -1, dz: 1 },
  { dx: 0, dz: 1 },
  { dx: 1, dz: 1 },
];

export const PLANT_TYPES: PlantType[] = [
  {
    id: "null",
    mesh: null,
    footprint: [],
    getTileWeight: () => 1,
  },
  {
    id: "pine",
    mesh: "/models/plants/pine.gltf",
    footprint: THREE_BY_THREE_FOOTPRINT,
    getTileWeight: tile => tile.salinity<0.15?Math.sqrt(tile.moisture*Math.exp(-5*Math.log(6*tile.temperature)**2)):0,
  },
  {
    id: "deciduous",
    mesh: "/models/plants/deciduous.gltf",
    footprint: THREE_BY_THREE_FOOTPRINT,
    getTileWeight: tile => tile.salinity===0&&tile.moisture>0.35&&tile.moisture<0.67?Math.exp(-60*(tile.temperature-0.5)**2)/0.32:0,
  },
  {
    id: "palm",
    mesh: "/models/plants/palm.gltf",
    footprint: THREE_BY_THREE_FOOTPRINT,
    getTileWeight: tile => tile.temperature>0.5?3*tile.temperature-1.5:0,
  },
  {
    id: "cactus",
    mesh: "/models/plants/cactus.gltf",
    footprint: THREE_BY_THREE_FOOTPRINT,
    getTileWeight: tile => tile.salinity < 0.1?Math.max((tile.temperature-tile.moisture-0.2)/0.7,0):0,
  },
];
