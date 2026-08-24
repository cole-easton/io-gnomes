# Multiplayer World Prototype

A browser-based multiplayer game prototype exploring an `io`-style world with procedural terrain, resource gathering, and an architecture shaped for an eventual authoritative server.

## Current State

This is an early playable prototype built with Vite, TypeScript, and Three.js. The current client renders a procedural world, lets the local player move through it, loads plant models into the visible viewport, and supports harvesting plants into a stack-based inventory.

The backend is mocked locally in [`src/client/network.ts`](src/client/network.ts), but it is intentionally shaped like a server boundary. Client code submits movement and harvesting intent; the mock server owns player state, map state, resource changes, range checks, and harvest validation.

## Features

- Procedural tile map generation with water, salinity, moisture, temperature, rockiness, and oil values.
- Biome-influenced plant placement for pine, deciduous, palm, and cactus models.
- Three.js orthographic world rendering with GLTF plant assets.
- Server-shaped mock API for movement, viewport requests, player state, and harvesting.
- Resource inventory with stack merging by resource type and traits, such as wood species.
- Click-to-harvest interaction with success and failure feedback.

## Related Prototype

An earlier standalone demo of the map loader is available at [coleeaston.net/mapLoader](https://coleeaston.net/mapLoader/). This repository builds on that direction with gameplay systems, rendering, and a server-shaped simulation boundary.

## Architecture Notes

The main project boundary to preserve is between client presentation and authoritative simulation:

- [`src/engine/renderer.ts`](src/engine/renderer.ts) owns Three.js setup, rendering, camera behavior, model loading, and visual picking helpers.
- [`src/engine/loop.ts`](src/engine/loop.ts) coordinates local input, submits player intent, updates DOM UI, and passes render state to the renderer.
- [`src/client/network.ts`](src/client/network.ts) is the mock server layer. It owns gameplay truth: player position, map mutations, inventory updates, movement validation, harvest range checks, and occupant removal.
- [`src/map`](src/map) contains map, viewport, occupant, and plant modeling.
- [`src/resources`](src/resources) contains stackable resource and trait logic.

When adding gameplay features, prefer APIs that will still make sense once `src/client/network.ts` is replaced by a real authoritative backend.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

## Development Direction

Near-term work likely belongs in these areas:

- Turn the mock network layer into a cleaner server-shaped API surface.
- Expand player actions beyond harvesting.
- Add real multiplayer transport and authoritative state sync.
- Improve map streaming and persistence.
- Replace placeholder player rendering with proper character art or animation.
