# AGENTS.md

## Project Direction

This project is intended to become an io-style multiplayer game. The backend is currently mocked in the client code, but gameplay architecture should still be shaped as if a real authoritative server will replace the mock later.

When adding gameplay features, prefer designs that preserve a clear boundary between:

- **Client input and presentation:** reads user input, renders the world, shows UI feedback, and submits player intent.
- **Authoritative game simulation:** owns player state, map mutations, inventory, resource claims, movement validation, and other gameplay truth.

The current mock backend lives in `src/client/network.ts`. Even though it is local for now, treat it as the server boundary.

## Gameplay Authority

Do not put authoritative gameplay state or validation only in renderer/UI code.

The official client should not be artificially less capable than direct calls to the server/API, such as requests made with Postman or an equivalent tool. If an action is mechanically allowed by the server, the client should not add extra gameplay limits that prevent it. If an action should be limited, rejected, rate-limited, range-checked, or otherwise constrained, implement that rule in the authoritative server/mock layer.

Good patterns:

- Client submits intent, such as movement direction, clicked target IDs, or requested actions.
- Mock server validates intent before mutating state.
- Mock server returns enough state/result data for the client to render feedback.
- Client-side affordances may make interaction easier, but the server/mock decides whether the action actually succeeds.
- Client-side throttling/debouncing is acceptable only for presentation or input ergonomics when it does not reduce what the player can mechanically achieve compared with calling the server/API directly.

Examples:

- Movement should be submitted as intent and constrained by server/mock speed limits.
- Harvesting should validate target existence, range, type, and availability server-side.
- Inventory/resource changes should happen server-side/mock-side, not as client-only UI updates.

Avoid:

- Adding resources directly from click handlers.
- Trusting client distance checks as the only validation.
- Letting renderer state become the source of truth for occupants, resources, or player inventory.
- Adding client-only cooldowns, rate limits, range checks, or action filters that change gameplay outcomes without matching server/mock enforcement.

## Rendering And Input Boundaries

`src/engine/renderer.ts` should primarily own Three.js scene setup, rendering, camera behavior, and visual picking helpers that require camera/scene knowledge.

`src/engine/loop.ts` can coordinate local input, submit intents to the mock server, request viewport/player state, and update lightweight DOM UI.

Keep this boundary narrow:

- Renderer may answer presentation questions like "which occupant IDs are under this screen point?"
- Loop may interpret input and submit gameplay intent.
- Mock server/network decides whether the gameplay action is valid.

If interaction logic grows, prefer extracting dedicated input/controller modules over merging rendering and gameplay authority together.

## Resources And Inventory

Resources are currently modeled as stackable items with optional traits. This is intentional.

Use this direction unless the design changes explicitly:

- `wood` can be fungible at the resource type level.
- Traits can preserve subtype differences, such as `{ species: "pine" }`.
- Inventory stacks should merge when resource ID and traits match.
- Unique objects should be modeled separately when identity matters, such as durability, history, ownership, location, or behavior.

This keeps "wood" simple now while leaving room for later distinctions like pine wood, palm wood, grades of oil, stone hardness, colors, or other material properties.

## UI Feedback

Client-side UI feedback can be optimistic or presentational, but it must not create gameplay truth.

For example:

- It is fine to throttle repeated failed-action messages client-side.
- It is not fine to throttle or skip the underlying server/mock action if doing so could hide valid gameplay outcomes.
- Successful action feedback should come from server/mock results whenever practical.

## Code Style Notes

- Prefer small, focused changes that match existing file/module responsibilities.
- Keep future backend replacement in mind when naming APIs and choosing where state lives.
- If a feature has a "real server later" implication, shape the mock API like a server API now.
- Avoid broad refactors unless needed for the requested gameplay change.
