import { PreLaunchTerminal } from "../../lib/descent-minigame/core/PreLaunchTerminal";
import { Scene, Engine, NullEngine } from "@babylonjs/core";
import { ConfigManager } from "../../lib/descent-minigame/config/ConfigManager";

describe("Chunk 02 Phase 01: PreLaunch Terminal", () => {
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

    test("D01-05 & Gate 1: Timer expiration triggers failure and automatically disposes of DOM hooks", (done) => {
        let terminalFailed = false;

        const terminal = new PreLaunchTerminal(scene, null, configManager, (failed) => {
            terminalFailed = failed;
            
            // Should pass true for failed due to timer
            expect(terminalFailed).toBe(true);

            // Verify Gate 1: DOM hooks are removed
            // The hidden input should no longer be attached to body
            const allInputs = document.querySelectorAll("input");
            let found = false;
            allInputs.forEach(input => {
                if (input.style.opacity === "0" && input.style.zIndex === "-1") {
                    found = true;
                }
            });
            expect(found).toBe(false);

            done();
        });

        // Tweak total duration so it expires immediately upon first loop
        (terminal as any).totalWindowMs = 0;
        
        // Force a render step to trigger the onBeforeRenderObservable timer logic
        scene.render();
    });
});
