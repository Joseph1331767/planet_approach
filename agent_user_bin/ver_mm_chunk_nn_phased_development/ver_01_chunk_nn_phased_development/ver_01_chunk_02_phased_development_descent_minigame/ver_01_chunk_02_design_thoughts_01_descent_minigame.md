# Design Thoughts: Chunk 02 (Descent Minigame Handshake)

## Title & Overview
**Descent Minigame Handshake**
A fully isolated, hyper-modular library intended to act as the primary structural bridge between the "Orbital Space" and "Planetary Surface" phases of the game. The player engages in an 8–10 minute high-stakes, multi-tasking reentry sequence. The core gameplay loop intentionally forces the player to balance high-speed physical reflex actions (rhythmic key presses) with intense cognitive load (mental math vocalization). 

## Deep Context & Design Philosophy
Real planetary descents are lengthy, mathematical processes. To honor the simulation aspect while respecting the player's time, the 30–60 minute ordeal is "spoofed" (time-compressed) into an 8–10 minute pressure-cooker minigame. 
Prior to this phase, the player uses a "flashlight" radio sweep to locate a planetary beacon. The ship's computer then establishes an idealized mathematical trajectory (involving tangential speeds and terminal velocities). The player's job is not to manually fly the ship, but to *fight deviations from this perfect path*. 

The design relies on "Plate-Spinning" mechanics: if the player tunnels their vision too hard onto the physical turbulence controls, they will miss a comms check or an alarm, resulting in cascading penalties. The singular result of this ordeal is an accuracy penalty: `Number of KM Off-Course`. The player cannot die, guaranteeing progress, but poor performance will organically punish the player by dropping them hostile miles away from their target on the surface.

## Core Feature Specifications & Nuances

### 1. Pre-Launch Sequence (Terminal Protocol Typing)
- **Context:** Rather than matching a visual reticle, the player initiates the descent from orbit via a purely textual **Terminal Interface**. The player has one full orbit rotation to complete the launch pad sequence.
- **Mechanic:** The player reads off a protocol list that illuminates sequentially. When a step lights up, the player must physically type the exact 3-letter-dash-3-letter (or number) command string into the terminal (e.g., `cal-thr` for thruster calibration, `ver-tst` for verification, `exc-aut` for launch execution).
- **The Launch Window:** The player must complete the entire sequence before the ship traverses 75% of its orbit. Missing this window forces an auto-launch, severely punishing the player by cranking up the turbulence and coordinate drift scalars during the subsequent atmospheric drop.
- **Lighting:** A stark `DirectionalLight` (Sun) creates a terminator line. Atmospherics are rendered last.

### 2. Turbulence Control (The Physical Layer)
- **Mechanic:** A 3D Holographic "Piano Tile" rhythm game. Letters stream deep out of the 3D environment toward the camera like Star Wars hyperspace trails and get caught in a defined hit-box for a time `t`.
- **Nuance ("Pat Belly, Rub Head"):** The left and right hands operate under highly distinct asynchronous frequencies:
  - **Left Hand (Low Freq):** `W`, `A`, `S`, `D`. Spawns stochastically every `3–6 seconds` (tunable).
  - **Right Hand (High Freq):** `I`, `J`, `K`, `L`. Spawns stochastically every `1–3 seconds` (tunable).
- **Hit Detection Visuals:** Only one letter exists in a column at a time. The physical action required is telegraphed entirely by the visual state of the holographic letter:
  - **White w/ Trail:** Sustained Hold.
  - **White Flashing:** Rapid Tap.
  - **Blue:** Single Quick Press.

### 3. Alarm Dashboard (The Reaction Layer)
- **Mechanic:** Periodic critical sub-system failures.
- **Nuance:** Breaking the turbulence rhythm, the terminal outputs explicitly required keys to silence the alarms (e.g. `Thermal Warning: Press [H]`).
- **Initial Values:** A completely random chance (e.g., `15%` per minute) of spawning. Unanswered alarms dramatically scale the physical turbulence screen shake.

### 4. Voice Recognition Comms (The Cognitive Layer)
- **Mechanic:** The player must frequently vocalize calculated Vector corrections to Mission Control.
- **Nuance:** The dashboard permanently renders a base vector (`345`) and a shifting diff (`+1+1-2`). When the comms light flashes, the player has a short window to mentally calculate the sum (`453`), hold `Spacebar` (Mic), and speak it. Speech-To-Text processing validates the answer.
- **The Punishment/Reward Loop:** 
  - **Correct:** The computer regains control; physical piano tiles slow down and become sparse.
- **Failure / Accessibility:** Incorrectly spoken vectors instantly throw the ship off course and trigger "overdrive" turbulence. If the user lacks a microphone, a numpad-entry fallback activates.
- **Initial Values:** Comms checks occur roughly every `45-60 seconds`. The user has `8 seconds` to solve the math and speak.

## Architecture & AAA Modular Structure

To strictly adhere to the "no mega-modules" philosophy, the library must decouple the pure rendering engine from the minigame logic.

### 1. Library I/O Isolation & "The Grand Illusion"
The module will expose a single initialization interface. It accepts the necessary external contexts and returns a single *scalar* variable upon destruction.
```typescript
interface DescentPayload {
    equirectangularMaps: string[]; // High-res GenAI slices
    targetBeaconGPS: { lat: number, lon: number };
    configJsonUrl: string; // Remote URL to dev-tunable settings
    assets: {
        dashboardGlbUrl: string; // The 3D mesh for the UI cockpit pre-generated at load
    }
}
// Outputs: Promise<number> resolving to failureScalar (0.0 to 1.0)
```
- **The Output Illusion:** The visual rendering of the minigame *always* concludes with a perfectly centered, cinematic landing directly on top of the planetary target. The off-course calculation (`failureScalar`, where 1.0 is the 5km maximum distance) is passed secretly back to the core game. The core game then technically *moves the beacon* away from the player based on this scalar before ground-gameplay begins. The player never knows they landed perfectly while the environment shifted around them.

### 2. Data-Driven Gameplay (config.json)
Every scalar that defines the "feel" must be hot-tunable by the developer. By placing this in a JSON object, the minigame can be re-balanced without recompiling React/TypeScript.
```json
{
  "DescentMinigame": {
    "timings": {
      "totalDurationMs": 600000,
      "commsIntervalMs": 45000 
    },
    "turbulence": {
      "baseSpawnRateMs": 1000,
      "penaltyMultiplier": 1.5,
      "maxAccuracyLossKm": 2.5
    },
    "voice": {
      "fuzzinessTolerance": 0.8,
      "timeToAnswerMs": 8000
    }
  }
}
```

### 3. Intelligent Functional Groups (File Structure)
The `chunk_02` codebase will follow an MVC and highly service-oriented pattern to prevent `PlanetEngine.ts` spaghetti:
- `/core`
  - `MinigameOrchestrator.ts` (Controls the state machine: Alignment -> Descent -> End)
  - `ConfigManager.ts` (Parses and supplies the JSON payload)
- `/mechanics`
  - `PreLaunchTerminal.ts` (Handles the typing sequence mini-game in orbit)
  - `TurbulenceController.ts` (Handles piano-tile spawning, hit detection, scalar calculation)
  - `VoiceCommsService.ts` (Interfaces with the browser's SpeechRecognition API, handles math generation)
  - `AlarmManager.ts` (Event bus for random physical failures)
- `/render` (Babylon.js layer)
  - `DescentCamera.ts` (Isolated camera tracking/shake logic)
  - `AtmosphereEffects.ts` (AAA Shaders, Sun lighting, Terminator lines)
- `/ui` (React/Babylon layer)
  - `HolographicDashboard.ts` (Imports the external injected `.glb` mesh to serve as the physical GUI mount point, ensuring total art-asset decoupling).
  - `DevSettingsPanel.tsx` (In-game React tool to hot-reload JSON tunables).

### 4. Mathematical Cascade
- All physics calculations within the Infini-Zoom logic must be dynamically tethered to the spoofed falling speeds. If a baseline falling speed is tweaked in the dev tools, *every dependent sub-system* must mathematically scale across the entire model automatically (e.g., shader intensity thresholds, turbulence spawning overlaps).

---
*Decisions Locked via Interview 01. Phase Execution Pipeline Ready.*
