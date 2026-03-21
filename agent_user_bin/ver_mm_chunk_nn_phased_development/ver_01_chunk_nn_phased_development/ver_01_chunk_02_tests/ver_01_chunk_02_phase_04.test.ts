import { MinigameOrchestrator } from "../../lib/descent-minigame/core/MinigameOrchestrator";
import { DescentPayload } from "../../lib/descent-minigame/config/types";

describe("Chunk 02 Phase 04: AAA VFX Handoff", () => {
    let canvas: HTMLCanvasElement;
    let orchestrator: MinigameOrchestrator;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        orchestrator = new MinigameOrchestrator(canvas);
    });

    test("D04-04 & Gate 1: Promise calculation rigidly clamps massive failure scalar overload to 1.0 max", async () => {
        const payload: DescentPayload = {
            equirectangularMaps: [],
            targetBeaconGPS: { lat: 0, lon: 0 },
            configJsonUrl: "/mock/config.json", 
            assets: { dashboardGlbUrl: "/mock/dash.glb" }
        };

        const executionPromise = orchestrator.start(payload);
        
        // Simulating the player being catastrophically bad and getting hit with hundreds of penalties
        for(let i=0; i<300; i++) {
            (orchestrator as any).failureScalar += 0.5;
        }

        // Extremely massive scalar artificially injected
        expect((orchestrator as any).failureScalar).toBeGreaterThan(100.0);

        // Force an immediate end
        orchestrator.end();

        // Await the promise resolution which should run the clamp logic
        const finalScalar = await executionPromise;

        // Verify the parent context only receives a clamped maximum of 1.0 safely
        expect(typeof finalScalar).toBe("number");
        expect(finalScalar).toBe(1.0); 
    });
});
