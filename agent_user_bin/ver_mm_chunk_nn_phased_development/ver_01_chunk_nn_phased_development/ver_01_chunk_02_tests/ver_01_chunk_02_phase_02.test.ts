import { Scene, Engine, NullEngine } from "@babylonjs/core";
import { ConfigManager } from "../../lib/descent-minigame/config/ConfigManager";
import { TurbulenceController } from "../../lib/descent-minigame/core/TurbulenceController";

describe("Chunk 02 Phase 02: Holographic Turbulence", () => {
    let engine: Engine;
    let scene: Scene;
    let configManager: ConfigManager;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        configManager = new ConfigManager();
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    test("D02-04 & Test 1: Mismatched keys explicitly add to failureScalar via callback", () => {
        let currentScalar = 0.0;
        const penaltyAmountPerMiss = configManager.getConfig().turbulence.penaltyScalarPerMiss;
        
        const controller = new TurbulenceController(scene, configManager, (penalty) => {
            currentScalar += penalty;
        });

        // Force a mistype input manually
        (controller as any).handleInput("Z"); // Z is never spawned by default

        // It penalizes half amount for spam
        expect(currentScalar).toBe(penaltyAmountPerMiss * 0.5);
    });

    test("Gate 1: Object Pool instantiates correctly without ballooning on spawn", () => {
        const controller = new TurbulenceController(scene, configManager, () => {});
        const maxPoolSize = (controller as any).notePool.length;
        expect(maxPoolSize).toBe(20);

        // Force time to spawn a block
        (controller as any).elapsedMs = 10000;
        (controller as any).updateSpawns();

        // The active array grew, but the overall memory pool size stayed stable at 20.
        expect((controller as any).notePool.length).toBe(20);
        expect((controller as any).activeNotes.length).toBeGreaterThan(0);
    });
});
