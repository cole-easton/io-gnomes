export type Tile = {
  r: number;
  g: number;
  b: number;
};

export type VisibleTile = {
  x: number;
  z: number;
  r: number;
  g: number;
  b: number;
};

export type Map = {
  width: number;
  height: number;
  tiles: Tile[];
};