import { createRenderer } from "./renderer";
import { GAME_CONFIG } from "../shared/config";
import * as network from "../client/network";
import type { ViewportState } from "../map/types";
import { describeResourceStack } from "../resources/types";

//import { subscribe } from "../client/client";

type ClientRenderState = {
    x: number;
    z: number;
    viewport: ViewportState;
};

export function startGame() {
    const renderer = createRenderer();
    const dock = document.createElement("div");
    dock.className = "resource-dock";
    document.body.appendChild(dock);

    const feedbackLayer = document.createElement("div");
    feedbackLayer.className = "feedback-layer";
    document.body.appendChild(feedbackLayer);

    const initialPlayerState = network.getPlayerState();
    let latestState: ClientRenderState = {
        x: initialPlayerState.x,
        z: initialPlayerState.z,
        viewport: network.requestViewport(),
    };
    const mouse = { x: 0, y: 0 };
    let lastInventoryKey = "__unrendered__";
    let lastFailedFeedbackAtMs = 0;
    const failedFeedbackCooldownMs = 750;

    dock.addEventListener("click", event => {
        event.stopPropagation();
    });

    function getResourceTypeLabel(resourceId: string): string {
        return resourceId.charAt(0).toUpperCase() + resourceId.slice(1);
    }

    function getResourceDetailLabel(resourceDescription: string): string {
        const firstSpaceIndex = resourceDescription.indexOf(" ");
        return firstSpaceIndex === -1 ? resourceDescription : resourceDescription.slice(firstSpaceIndex + 1);
    }

    function showFloatingMessage(messageText: string, clientX: number, clientY: number, kind: "success" | "error") {
        const message = document.createElement("div");
        message.className = `floating-message floating-message--${kind}`;
        message.textContent = messageText;

        const margin = 48;
        const x = Math.max(margin, Math.min(window.innerWidth - margin, clientX));
        const y = Math.max(margin, Math.min(window.innerHeight - margin, clientY));
        message.style.left = `${x}px`;
        message.style.top = `${y}px`;

        feedbackLayer.appendChild(message);
        window.setTimeout(() => {
            message.remove();
        }, 1200);
    }

    function updateInventory() {
        const playerState = network.getPlayerState();
        const inventoryKey = playerState.resources.map(describeResourceStack).join("|");
        if (inventoryKey === lastInventoryKey) {
            return;
        }
        lastInventoryKey = inventoryKey;
        dock.replaceChildren();

        if (playerState.resources.length === 0) {
            const emptySlot = document.createElement("div");
            emptySlot.className = "resource-slot resource-slot--empty";
            emptySlot.textContent = "Empty";
            dock.appendChild(emptySlot);
            return;
        }

        for (const resource of playerState.resources) {
            const resourceDescription = describeResourceStack(resource);
            const slot = document.createElement("button");
            slot.className = `resource-slot resource-slot--${resource.resourceId}`;
            slot.type = "button";
            slot.setAttribute("aria-label", resourceDescription);
            slot.dataset.resourceId = resource.resourceId;

            const quantity = document.createElement("span");
            quantity.className = "resource-slot__quantity";
            quantity.textContent = String(resource.quantity);
            slot.appendChild(quantity);

            const type = document.createElement("span");
            type.className = "resource-slot__type";
            type.textContent = getResourceTypeLabel(resource.resourceId);
            slot.appendChild(type);

            const detail = document.createElement("span");
            detail.className = "resource-slot__detail";
            detail.textContent = getResourceDetailLabel(resourceDescription).replace(`${resource.resourceId}`, "").trim();
            slot.appendChild(detail);

            dock.appendChild(slot);
        }
    }

    window.addEventListener('mousemove', (event) => {
        // NDC: -1 to +1
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener("click", event => {
        const occupantIds = renderer.getOccupantIdsAtClientPoint(event.clientX, event.clientY);
        if (occupantIds.length === 0) {
            return;
        }

        let fallbackMessage = "";
        for (const occupantId of occupantIds) {
            const result = network.harvestOccupant(occupantId);
            if (result.ok) {
                showFloatingMessage(`+${result.resources.map(describeResourceStack).join(", ")}`, event.clientX, event.clientY, "success");
                const playerState = network.getPlayerState();
                latestState = {
                    x: playerState.x,
                    z: playerState.z,
                    viewport: network.requestViewport(),
                };
                updateInventory();
                return;
            }

            fallbackMessage ||= result.message;
        }

        if (fallbackMessage) {
            const now = performance.now();
            if (now - lastFailedFeedbackAtMs >= failedFeedbackCooldownMs) {
                showFloatingMessage(fallbackMessage, event.clientX, event.clientY, "error");
                lastFailedFeedbackAtMs = now;
            }
        }

        const playerState = network.getPlayerState();
        latestState = {
            x: playerState.x,
            z: playerState.z,
            viewport: network.requestViewport(),
        };
        updateInventory();
    });

    //   subscribe((state) => {
    //     latestState = state;
    //   });

    const deadZoneRadius = 0.02;
    const fullThrottleRadius = 0.18;
    let currentTime = performance.now();
    function loop() {
        const newTime = performance.now();
        const dt = newTime - currentTime;
        currentTime = newTime;
        const angle = Math.atan2(mouse.x, mouse.y) - Math.PI / 4;
        const amp2 = mouse.x ** 2 + 0.8 * mouse.y ** 2;
        let throttle: number;
        if (amp2 < deadZoneRadius) {
            throttle = 0;
        }
        else if (amp2 > deadZoneRadius && amp2 < fullThrottleRadius) {
            throttle = (amp2 - deadZoneRadius) / (fullThrottleRadius - deadZoneRadius);
        }
        else {
            throttle = 1;
        }
        const playerState = network.submitMoveIntent({
            directionX: Math.cos(angle),
            directionZ: Math.sin(angle),
            throttle,
            dtMs: dt,
        });

        latestState.x = playerState.x;
        latestState.z = playerState.z;
        latestState.viewport = network.requestViewport();
        updateInventory();

        if (latestState) {
            renderer.render(latestState);
        }
        if (!GAME_CONFIG.mapDebug) {
            requestAnimationFrame(loop);
        }
    }

    loop();
}
