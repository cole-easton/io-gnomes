import { getViewport } from "../map/viewport"; 
import { GAME_CONFIG } from "../shared/config";
import { getMap } from "../map/map";
import type { Map, ViewportState } from "../map/types";
import { NO_OCCUPANT_ID, type OccupantId } from "../map/occupants";
import { PLANT_TYPES, type PlantInstance } from "../map/plants";
import type { PlayerState } from "../player/types";
import { addResourceStacks, type ResourceStack } from "../resources/types";

const map: Map = getMap(GAME_CONFIG.mapDebug?1000:3000);
const viewportSize = GAME_CONFIG.mapDebug?1000:16;
const maxPlayerSpeedTilesPerMs = 0.005;
const maxHarvestDistance = 9;

const playerState: PlayerState = {
  id: "local-player",
  x: 0,
  z: 0,
  resources: [],
  objects: [],
};

export type MoveIntent = {
  directionX: number;
  directionZ: number;
  throttle: number;
  dtMs: number;
};

export type HarvestResult = {
  ok: boolean;
  resources: ResourceStack[];
  message: string;
};

function cloneResourceStack(stack: ResourceStack): ResourceStack {
  return {
    resourceId: stack.resourceId,
    quantity: stack.quantity,
    traits: stack.traits ? { ...stack.traits } : undefined,
  };
}

function clonePlayerState(): PlayerState {
  return {
    id: playerState.id,
    x: playerState.x,
    z: playerState.z,
    resources: playerState.resources.map(cloneResourceStack),
    objects: playerState.objects.map(object => ({ ...object })),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getWorldPositionFromTileIndex(tileIndex: number) {
  return {
    x: tileIndex % map.width - map.width / 2,
    z: Math.floor(tileIndex / map.width) - map.height / 2,
  };
}

function getPlantType(plant: PlantInstance) {
  return PLANT_TYPES.find(plantType => plantType.id === plant.plantTypeId) ?? null;
}

function removeOccupant(occupantId: OccupantId) {
  const occupant = map.occupantsById.get(occupantId);
  if (!occupant) {
    return;
  }

  for (const tileIndex of occupant.occupiedTiles) {
    const tile = map.tiles[tileIndex];
    if (tile?.occupantId === occupantId) {
      tile.occupantId = NO_OCCUPANT_ID;
    }
  }

  map.occupantsById.delete(occupantId);
}

export function submitMoveIntent(intent: MoveIntent): PlayerState {
  if (!(intent.dtMs > 0) || !Number.isFinite(intent.dtMs)) {
    return clonePlayerState();
  }

  const directionLength = Math.hypot(intent.directionX, intent.directionZ);
  const throttle = clamp(intent.throttle, 0, 1);
  if (!(directionLength > 0) || throttle <= 0) {
    return clonePlayerState();
  }

  const step = maxPlayerSpeedTilesPerMs * intent.dtMs * throttle;
  playerState.x += step * intent.directionX / directionLength;
  playerState.z += step * intent.directionZ / directionLength;

  return clonePlayerState();
}

export function requestViewport(): ViewportState {
  return getViewport(map, playerState.x, playerState.z, viewportSize, viewportSize);
}

export function getPlayerState(): PlayerState {
  return clonePlayerState();
}

export function harvestOccupant(occupantId: OccupantId): HarvestResult {
  const occupant = map.occupantsById.get(occupantId);
  if (!occupant || occupant.kind !== "plant") {
    return { ok: false, resources: [], message: "Nothing harvestable there." };
  }

  const plant = occupant as PlantInstance;
  const plantType = getPlantType(plant);
  if (!plantType || plantType.harvest.resources.length === 0) {
    return { ok: false, resources: [], message: "That plant has nothing useful to harvest yet." };
  }

  const plantPosition = getWorldPositionFromTileIndex(plant.anchorTile);
  const distance = Math.hypot(playerState.x - plantPosition.x, playerState.z - plantPosition.z);
  if (distance > maxHarvestDistance) {
    return { ok: false, resources: [], message: "Too far away to harvest." };
  }

  const resources = plantType.harvest.resources.map(cloneResourceStack);
  playerState.resources = addResourceStacks(playerState.resources, resources);

  if (plantType.harvest.removesPlant) {
    removeOccupant(occupantId);
  }

  return { ok: true, resources, message: "Harvested." };
}
