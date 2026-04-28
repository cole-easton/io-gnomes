import type { Occupant, OccupantId, VisibleOccupant } from "./occupants";

export type Tile = {
  isWater: boolean;
  salinity: number;
  moisture: number;
  temperature: number;
  rockiness: number;
  oil: number;
  occupantId: OccupantId;
};

export type Color = {
  r: number,
  g: number,
  b: number
}

export type VisibleTile = {
  x: number;
  z: number;
  occupantId: OccupantId;
  appearance: {
    color: Color;
    //possibly add texture later
  };
};

export type ViewportState = {
  originX: number;
  originZ: number;
  width: number;
  height: number;
  tiles: VisibleTile[];
  occupants: VisibleOccupant[];
};

export type Map = {
  width: number;
  height: number;
  tiles: Tile[];
  occupantsById: globalThis.Map<OccupantId, Occupant>;
};
