import { createRenderer } from "./renderer";
//import { subscribe } from "../client/client";

export function startGame() {
  const renderer = createRenderer();

  let latestState: any = {x: 1};

//   subscribe((state) => {
//     latestState = state;
//   });

  function loop() {
    requestAnimationFrame(loop);

    if (latestState) {
      renderer.render(latestState);
    }
  }

  loop();
}