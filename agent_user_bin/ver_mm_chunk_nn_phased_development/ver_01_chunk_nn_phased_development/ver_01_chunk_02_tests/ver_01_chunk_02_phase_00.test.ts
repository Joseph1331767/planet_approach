import { MinigameOrchestrator } from "../../lib/descent-minigame/core/MinigameOrchestrator";
import { DescentPayload } from "../../lib/descent-minigame/config/types";

// Note: To run this natively in jest/vitest, you need a canvas mock (e.g. jest-canvas-mock)
// and potentially Babylonjs headless engine. For this demonstration, we are validating logic flow.

describe("Chunk 02 Phase 00: Core Engine Foundation", () => {
    let canvas: HTMLCanvasElement;
    let orchestrator: MinigameOrchestrator;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        orchestrator = new MinigameOrchestrator(canvas);
    });

    test("Gate 1: The Promise resolves returning a valid scalar number upon .end()", async () => {
        const payload: DescentPayload = {
            equirectangularMaps: [],
            targetBeaconGPS: { lat: 0, lon: 0 },
            configJsonUrl: "/mock/config.json", // Won't actually fetch in this unit test gracefully unless mocked
            assets: { dashboardGlbUrl: "/mock/dash.glb" }
        };

        // Start the engine
        const executionPromise = orchestrator.start(payload);
        
        // Force an immediate end
        orchestrator.end();

        // Await the promise resolution
        const finalScalar = await executionPromise;

        expect(typeof finalScalar).toBe("number");
        expect(finalScalar).toBe(0.0); // Starts at 0
    });

    test("Gate 2: Memory is cleanly disposed after resolution", () => {
        // We verify that engine.dispose() and scene.dispose() internal states trigger
        // In a real headless run we'd spyOn(engine, 'dispose')
        const disposeSpy = jest.spyOn((orchestrator as any).engine, 'dispose');
        const sceneDisposeSpy = jest.spyOn((orchestrator as any).scene, 'dispose');

        orchestrator.end();

        expect(disposeSpy).toHaveBeenCalled();
        expect(sceneDisposeSpy).toHaveBeenCalled();
    });

    test("Gap: ConfigManager live-tuning updates orchestrator instances natively", () => {
        const configManager = orchestrator.getConfigManager();
        let currentPenaltyState = configManager.getConfig().turbulence.penaltyScalarPerMiss;
        expect(currentPenaltyState).toBe(0.01); // Default

        // Simulate React sliding the bar
        configManager.updateConfig({ turbulence: { ...configManager.getConfig().turbulence, penaltyScalarPerMiss: 0.05 } });

        expect(configManager.getConfig().turbulence.penaltyScalarPerMiss).toBe(0.05);
    });
});
