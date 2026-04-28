export type OccupantId = number;
export type OccupantKind = "plant" | "building";

export type Occupant = {
  id: OccupantId;
  kind: OccupantKind;
  meshPath: string;
  anchorTile: number;
  occupiedTiles: number[];
};

export type VisibleOccupant = {
  id: OccupantId;
  kind: OccupantKind;
  meshPath: string;
  anchorX: number;
  anchorZ: number;
};

export const NO_OCCUPANT_ID = 0;
