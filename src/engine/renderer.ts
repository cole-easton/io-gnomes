import * as THREE from "three";
import type { ViewportState, VisibleTile } from "../map/types";
import { GAME_CONFIG } from "../shared/config";
import type { VisibleOccupant } from "../map/occupants";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type ClientRenderState = {
  x: number;
  z: number;
  viewport: ViewportState;
};

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
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];

        const dist = Math.max(Math.abs(tile.x-state.x), Math.abs(tile.z-state.z));
        if (dist > renderDist/2) {
          const scale = 1-2*(dist-renderDist/2);
          dummy.scale.set(scale, scale, scale);
        }
        else {
          dummy.scale.set(1, 1, 1);
        }

        dummy.position.set(tile.x, 0, tile.z);
        dummy.updateMatrix();

        tileMesh.setMatrixAt(i, dummy.matrix);

        const tileColor = tile.appearance.color;
        color.setRGB(tileColor.r, tileColor.g, tileColor.b);
        tileMesh.setColorAt(i, color);
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
