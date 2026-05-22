import type { ResourceStack } from "../resources/types";

export type PlayerId = string;

export type InventoryObject = {
  id: string;
  objectTypeId: string;
};

export type PlayerState = {
  id: PlayerId;
  x: number;
  z: number;
  resources: ResourceStack[];
  objects: InventoryObject[];
};
