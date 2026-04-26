export type Tile = {
  isWater: boolean;
  salinity: number;
  moisture: number;
  temperature: number;
  rockiness: number;
  oil: number;
};

export type Color = {
  r: number,
  g: number,
  b: number
}

export type VisibleTile = {
  x: number;
  z: number;
  appearance: {
    color: Color;
    //possibly add texture later
  };
};



export type Map = {
  width: number;
  height: number;
  tiles: Tile[];
};