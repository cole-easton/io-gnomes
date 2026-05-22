export type ResourceId = "wood";

export type ResourceTraitValue = string | number | boolean;

export type ResourceTraits = Record<string, ResourceTraitValue>;

export type ResourceStack = {
  resourceId: ResourceId;
  quantity: number;
  traits?: ResourceTraits;
};

export function getResourceStackKey(stack: Pick<ResourceStack, "resourceId" | "traits">): string {
  const traitEntries = Object.entries(stack.traits ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const traitKey = traitEntries.map(([key, value]) => `${key}:${String(value)}`).join(",");
  return `${stack.resourceId}|${traitKey}`;
}

export function addResourceStacks(inventory: ResourceStack[], stacks: ResourceStack[]): ResourceStack[] {
  const nextInventory = inventory.map(stack => ({ ...stack, traits: stack.traits ? { ...stack.traits } : undefined }));

  for (const stack of stacks) {
    if (!(stack.quantity > 0)) {
      continue;
    }

    const key = getResourceStackKey(stack);
    const existingStack = nextInventory.find(candidate => getResourceStackKey(candidate) === key);

    if (existingStack) {
      existingStack.quantity += stack.quantity;
    } else {
      nextInventory.push({
        resourceId: stack.resourceId,
        quantity: stack.quantity,
        traits: stack.traits ? { ...stack.traits } : undefined,
      });
    }
  }

  return nextInventory;
}

export function describeResourceStack(stack: ResourceStack): string {
  const species = stack.traits?.species;
  const resourceName = species ? `${species} ${stack.resourceId}` : stack.resourceId;
  return `${stack.quantity} ${resourceName}`;
}
