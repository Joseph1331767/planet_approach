export class PadlockMath {
    /**
     * Generates a random 3-digit padlock math problem.
     * Returns the base number as an array of 3 digits, the offset array to add/subtract,
     * the operator (+ or - text), and the correctly wrapped 3-digit string answer.
     */
    public static generateProblem(): { baseText: string, operationText: string, expectedAnswer: string } {
        const base = [
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10)
        ];

        // We only perturb one or two digits usually to keep it solvable within 5s
        const offsets = [0, 0, 0];
        const numPerturbations = Math.floor(Math.random() * 2) + 1; // 1 or 2
        for (let i = 0; i < numPerturbations; i++) {
            const idx = Math.floor(Math.random() * 3);
            offsets[idx] = Math.floor(Math.random() * 4) + 1; // offset by 1 to 4
        }

        const isAdd = Math.random() > 0.5;
        const answer = [0, 0, 0];

        for (let i = 0; i < 3; i++) {
            if (isAdd) {
                // Wrap around 9 -> 0
                answer[i] = (base[i] + offsets[i]) % 10;
            } else {
                // Wrap around 0 -> 9
                let val = base[i] - offsets[i];
                if (val < 0) val += 10;
                answer[i] = val;
            }
        }

        const baseText = base.join("");
        const opSign = isAdd ? "+" : "-";
        
        // Format offsets properly e.g., if offset is [0, 2, 0] text is "020"
        const offsetText = offsets.join("");
        const operationText = `${opSign} ${offsetText}`;
        const expectedAnswer = answer.join("");

        return { baseText, operationText, expectedAnswer };
    }
}
