import * as THREE from "three";
import type { Color as TileColor, ViewportState, VisibleTile } from "../map/types";
import { GAME_CONFIG } from "../shared/config";
import type { VisibleOccupant } from "../map/occupants";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ClientRenderState = {
  x: number;
  z: number;
  viewport: ViewportState;
};

const TILE_COLOR_VARIATION = GAME_CONFIG.mapDebug?0:0.035;
const OCCUPANT_YAW_SEED = 0x45678;
const OCCUPANT_SCALE_SEED = 0x56789;

export function createRenderer() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88ddff);

  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = GAME_CONFIG.mapDebug?450:6;

  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    GAME_CONFIG.mapDebug?3000:100
  );

  const camOffset = GAME_CONFIG.mapDebug?new THREE.Vector3(-1000, 1000, 1000):new THREE.Vector3(-10, 10, 10);
  camera.position.copy(camOffset);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  const shouldRenderOccupants = !GAME_CONFIG.mapDebug;
  const renderDist = GAME_CONFIG.mapDebug?1000:16; //in future pull this from network based on allowed viewport size
  const count = (renderDist+1)**2; 

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial();

  const tileMesh = new THREE.InstancedMesh(geometry, material, count);

  const instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(count * 3),
    3
  );
  tileMesh.instanceColor = instanceColor;
  tileMesh.frustumCulled = false;
  scene.add(tileMesh);

  const occupantsRoot = new THREE.Group();
  scene.add(occupantsRoot);

  const gltfLoader = new GLTFLoader();
  const occupantTemplates = new Map<string, THREE.Object3D>();
  const occupantTemplatePromises = new Map<string, Promise<THREE.Object3D>>();
  const visibleOccupants = new Map<number, VisibleOccupant>();
  const occupantObjects = new Map<number, THREE.Object3D>();
  const pendingOccupantIds = new Set<number>();

  const player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(player);

  const camAlpha = 0.05;

  function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  function randomFromTile(x: number, z: number, seed: number): number {
    let hash = Math.imul(x | 0, 374761393);
    hash ^= Math.imul(z | 0, 668265263);
    hash ^= seed;
    hash = (hash ^ (hash >>> 13)) >>> 0;
    hash = Math.imul(hash, 1274126177) >>> 0;
    return hash / 0xffffffff;
  }

  function updateTileColor(slot: number, tileColor: TileColor, x: number, z: number) {
    color.setRGB(
      clamp01(tileColor.r + (randomFromTile(x, z, 0x12345) * 2 - 1) * TILE_COLOR_VARIATION),
      clamp01(tileColor.g + (randomFromTile(x, z, 0x23456) * 2 - 1) * TILE_COLOR_VARIATION),
      clamp01(tileColor.b + (randomFromTile(x, z, 0x34567) * 2 - 1) * TILE_COLOR_VARIATION),
    );
    tileMesh.setColorAt(slot, color);
  }

  function getOccupantBaseScale(meshPath: string): number {
    if (meshPath === "/models/plants/palm.gltf") {
      return 2;
    }
    else if (meshPath !== "/models/plants/cactus.gltf") {
      return 1.6;
    }

    return 1;
  }

  function getOccupantScaleVariation(occupant: VisibleOccupant): number {
    const u1 = randomFromTile(occupant.anchorX, occupant.anchorZ, OCCUPANT_SCALE_SEED);
    const u2 = randomFromTile(occupant.anchorX, occupant.anchorZ, 0x31415);
    const normal = Math.sqrt(-2*Math.log(u1))*Math.cos(2+Math.PI*u2);
    return 1 + 0.07*normal;
  }

  function getOccupantYaw(occupant: VisibleOccupant): number {
    if (occupant.kind !== "plant") {
      return 0;
    }

    return randomFromTile(occupant.anchorX, occupant.anchorZ, OCCUPANT_YAW_SEED) * Math.PI * 2;
  }

  function loadOccupantTemplate(meshPath: string): Promise<THREE.Object3D> {
    const cachedTemplate = occupantTemplates.get(meshPath);
    if (cachedTemplate) {
      return Promise.resolve(cachedTemplate);
    }

    const pendingTemplate = occupantTemplatePromises.get(meshPath);
    if (pendingTemplate) {
      return pendingTemplate;
    }

    const templatePromise = new Promise<THREE.Object3D>((resolve, reject) => {
      gltfLoader.load(
        meshPath,
        gltf => {
          const template = gltf.scene;
          template.userData.baseScale = template.scale.clone();
          template.userData.baseRotation = template.rotation.clone();
          template.traverse(object => {
            object.frustumCulled = false;
          });
          occupantTemplates.set(meshPath, template);
          occupantTemplatePromises.delete(meshPath);
          resolve(template);
        },
        undefined,
        error => {
          occupantTemplatePromises.delete(meshPath);
          reject(error);
        },
      );
    });

    occupantTemplatePromises.set(meshPath, templatePromise);
    return templatePromise;
  }

  function updateOccupantTransform(object: THREE.Object3D, occupant: VisibleOccupant) {
    object.position.set(occupant.anchorX, 0, occupant.anchorZ);
    const scale = getOccupantBaseScale(occupant.meshPath) * getOccupantScaleVariation(occupant);
    const baseScale = object.userData.baseScale as THREE.Vector3 | undefined;
    const baseRotation = object.userData.baseRotation as THREE.Euler | undefined;

    object.rotation.set(
      baseRotation?.x ?? 0,
      (baseRotation?.y ?? 0) + getOccupantYaw(occupant),
      baseRotation?.z ?? 0,
      baseRotation?.order ?? "XYZ",
    );

    if (baseScale) {
      object.scale.copy(baseScale).multiplyScalar(scale);
    } else {
      object.scale.setScalar(scale);
    }
  }

  function removeHiddenOccupants(nextVisibleIds: Set<number>) {
    for (const [occupantId, object] of occupantObjects) {
      if (nextVisibleIds.has(occupantId)) {
        continue;
      }

      occupantsRoot.remove(object);
      occupantObjects.delete(occupantId);
      visibleOccupants.delete(occupantId);
    }
  }

  function syncVisibleOccupants(occupants: VisibleOccupant[]) {
    const nextVisibleIds = new Set<number>();

    for (const occupant of occupants) {
      nextVisibleIds.add(occupant.id);
      visibleOccupants.set(occupant.id, occupant);

      const existingObject = occupantObjects.get(occupant.id);
      if (existingObject) {
        updateOccupantTransform(existingObject, occupant);
        continue;
      }
      if (pendingOccupantIds.has(occupant.id)) {
        continue;
      }

      pendingOccupantIds.add(occupant.id);
      void loadOccupantTemplate(occupant.meshPath)
        .then(template => {
          pendingOccupantIds.delete(occupant.id);
          const latestOccupant = visibleOccupants.get(occupant.id);
          if (!latestOccupant || latestOccupant.meshPath !== occupant.meshPath) {
            return;
          }
          if (occupantObjects.has(occupant.id)) {
            return;
          }

          const occupantObject = template.clone(true);
          occupantObject.userData.baseScale = template.userData.baseScale;
          occupantObject.userData.baseRotation = template.userData.baseRotation;
          updateOccupantTransform(occupantObject, latestOccupant);
          occupantsRoot.add(occupantObject);
          occupantObjects.set(occupant.id, occupantObject);
        })
        .catch(error => {
          pendingOccupantIds.delete(occupant.id);
          console.warn("Failed to load occupant asset", occupant.meshPath, error);
        });
    }

    removeHiddenOccupants(nextVisibleIds);
  }

  return {
    render(state: ClientRenderState) {
      player.position.set(state.x, 0, state.z);

      const camTarget = player.position.clone().add(camOffset);
      camera.position.lerp(camTarget, camAlpha);

      const tiles: VisibleTile[] = state.viewport.tiles;
      for (let i = 0; i < count; i++) {
        const tile = tiles[i];

        if (!tile) {
          dummy.position.set(0, 0, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          tileMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const dist = Math.max(Math.abs(tile.x - state.x), Math.abs(tile.z - state.z));
        if (dist > renderDist / 2) {
          const scale = Math.max(0, 1 - 2 * (dist - renderDist / 2));
          dummy.scale.set(scale, scale, scale);
        } else {
          dummy.scale.set(1, 1, 1);
        }

        dummy.position.set(tile.x, 0, tile.z);
        dummy.updateMatrix();

        tileMesh.setMatrixAt(i, dummy.matrix);
        updateTileColor(i, tile.appearance.color, tile.x, tile.z);
      }

      tileMesh.instanceMatrix.needsUpdate = true;
      instanceColor.needsUpdate = true;

      if (shouldRenderOccupants) {
        syncVisibleOccupants(state.viewport.occupants);
      }

      renderer.render(scene, camera);
    },
  };
}
