import { createRenderer } from "./renderer";
//import { subscribe } from "../client/client";

export function startGame() {
    const renderer = createRenderer();

    let latestState: any = { x: 0, z: 0 };
    const mouse = { x: 0, y: 0 };

    window.addEventListener('mousemove', (event) => {
        // NDC: -1 to +1
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    //   subscribe((state) => {
    //     latestState = state;
    //   });

    const maxSpeed = 0.01;
    const deadZoneRadius = 0.08;
    const fullThrottleRadius = 0.2;
    let currentTime = performance.now();
    function loop() {
        const newTime = performance.now();
        const dt = newTime - currentTime;
        currentTime = newTime;
        const angle = Math.atan2(mouse.x, mouse.y) - Math.PI / 4;
        const amp2 = mouse.x ** 2 + 0.8 * mouse.y ** 2;
        let speed: number;
        if (amp2 < deadZoneRadius) {
            speed = 0;
        }
        if (amp2 > deadZoneRadius && amp2 < fullThrottleRadius) {
            speed = maxSpeed*(amp2-deadZoneRadius)/(fullThrottleRadius-deadZoneRadius);
        }
        else {
            speed = maxSpeed;
        }
        latestState.x += speed*dt*Math.cos(angle);
        latestState.z += speed*dt*Math.sin(angle);

        if (latestState) {
            renderer.render(latestState);
        }
        requestAnimationFrame(loop);
    }

    loop();
}