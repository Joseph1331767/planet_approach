# ver_01_chunk_02 — Descent Minigame Spec

> **Goal**: Create an isolated, hyper-modular library that handles an immersive atmospheric descent minigame, combining physical reflex challenges with cognitive load tasks, outputting a scalar failure value.

---

## Locked Design Decisions

### Section A: Architecture & Flow

**A1. Dashboard Overlays** → **(X) Babylon 3D GUI Placeholder Engine**
- Built completely in 3D to easily swap out models/implementations in the future, securing the AAA immersion pipeline without overcommitting on art assets, allowing the UI to natively react to extreme screen shake.

**A2. Transition Pacing & Pre-Orbital Controls** → **(X) Terminal Protocol Typing Minigame**
- The player initiates the atmospheric drop via a Terminal interface by reacting to a protocol list and typing specific 3-letter strings (e.g., `cal-thr`, `exc-aut`). Must be executed before 75% orbit traversal. Ergonomically perfect as their hands are inherently positioned on the keyboard for the subsequent drop.

**A3. Penalty Calculation & Module Output** → **(X) The Grand Illusion (Failure Scalar Output)**
- The visual descent *always* concludes seamlessly on-target. The module secretly outputs a `failureScalar (0.0 - 1.0)`, enabling the outer game layer to dynamically move the physical beacon away from the player based on their performance, bypassing the need for complex off-course terrain generation.

---

### Section B: Core Mechanics

**B1. Rhythm Hit Mechanics** → **(X) Holographic "Pat Belly Rub Head" System**
- Dual-frequency mechanics. Left hand (`WSAD`) spawns stochastically every 3-6s. Right hand (`IKJL`) spawns every 1-3s. Distinct visual states (holographic Star Wars hyperspace trails) dictate the physical action required (White/Trail = Hold, Flash = Tap, Blue = Press).

**B2. Vector Math "Carry Over"** → **(X) Padlock Roll-Over (Isolated 0-9)**
- Digits are isolated logic puzzles (0-9 wrapping, e.g. 9+1=0) forcing the player to cognitively separate the three numbers rather than performing standard carrying addition, drastically increasing the "sci-fi decryption" mental load.

**B3. Alarm Dismissal Feedback** → **(X) Explicit Terminal UI Prompting**
- The system explicitly identifies the key required to silence alarms (e.g. `Thermal Warning: Press [H]`), focusing the challenge purely on breaking the physical pianist rhythm rather than frustrating memorization techniques.

**B4. Voice Fallbacks** → **(X) Numpad Fallback**
- To guarantee accessibility and cross-browser reliability, the game will silently failover to manual numpad entry if the `WebSpeechAPI` is unsupported, misread, or hardware-denied.

---

## New Types Summary

```typescript
export interface DescentMinigameConfig {
    timings: {
        totalDurationMs: number;
        orbitLaunchWindowPercent: number; // e.g. 0.75
    };
    turbulence: {
        leftHandSpawnMsRange: [number, number];
        rightHandSpawnMsRange: [number, number];
        penaltyScalarPerMiss: number;
    };
    alarms: {
        chancePerMinute: number;
    };
    voice: {
        intervalMs: number;
        timeToAnswerMs: number;
    };
}

export interface DescentPayload {
    equirectangularMaps: string[]; // High-res GenAI slices
    targetBeaconGPS: { lat: number, lon: number };
    configJsonUrl: string; // Remote URL to dev-tunable settings
    assets: {
        dashboardGlbUrl: string; // The 3D mesh for the UI cockpit
        typographyGlbUrl?: string; // Optional: specific 3D fonts/meshes for the piano tiles
    }
}

// Module Output
// Returns: Promise<number> // The failureScalar (0.0 perfect landing, 1.0 maximum distance failure)
```

---

## Unfinished Business Coverage

- [x] Initial Alignment execution logic → covered by Section A2
- [x] Voice Recognition hardware failure handling → covered by Section B4
- [x] Math formula calculation bounds → covered by Section B2

---

## Ready for `/create-phase-plan`

All 7 decisions locked. Proceed to phase planning when ready.
