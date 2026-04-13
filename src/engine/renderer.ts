import * as THREE from "three";
import type { VisibleTile } from "../map/types";
import * as network from "../client/network";

export function createRenderer() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88ddff);

  const aspect = window.innerWidth / window.innerHeight;
  const viewSize = 6;

  const camera = new THREE.OrthographicCamera(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    0.1,
    100
  );

  const camOffset = new THREE.Vector3(-10, 10, 10);
  camera.position.copy(camOffset);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  const renderDist = 16; //in future pull this from network based on allowed viewport size
  const count = (renderDist+1)**2; 

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial();

  const tileMesh = new THREE.InstancedMesh(geometry, material, count);

  tileMesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(count * 3),
    3
  );
  tileMesh.frustumCulled = false;
  scene.add(tileMesh);

  const player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(player);

  console.log(network.requestViewport(0, 0));
  const camAlpha = 0.05;

  return {
    render(state: any) {
      player.position.set(state.x, 0, state.z);

      const camTarget = player.position.clone().add(camOffset);
      camera.position.lerp(camTarget, camAlpha);

      const tiles: VisibleTile[] = network.requestViewport(state.x, state.z);
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

        color.setRGB(tile.r, tile.g, tile.b);
        tileMesh.setColorAt(i, color);
      }
      tileMesh.instanceMatrix.needsUpdate = true;
      tileMesh.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    },
  };
}