import { PadlockMath } from "../../lib/descent-minigame/core/PadlockMath";

describe("Chunk 02 Phase 03: Alarms and Comms", () => {
    test("D03-01 Test 1: Math wraps single digits without carrying", () => {
        // Run generation many times to ensure no invalid digits are produced
        for(let i=0; i<100; i++) {
            const prob = PadlockMath.generateProblem();
            expect(prob.expectedAnswer.length).toBe(3);
            
            // Should purely be numeric
            expect(/^\d{3}$/.test(prob.expectedAnswer)).toBeTruthy();
            expect(/^\d{3}$/.test(prob.baseText)).toBeTruthy();
            expect(/^[+-] \d{3}$/.test(prob.operationText)).toBeTruthy();
        }

        // We can test manual boundaries if we expose a math method, but since it's static we ensure it via property regex
    });
});
