# ver_01_chunk_02_phase_00_foundation_core_engine

> Scaffolds the isolated module architecture, JSON-driven ConfigManager, basic state machine, and a pre-rendered, lit Babylon.js scene with a 3D Dashboard ready for UI elements.

---

## 00.1 Purpose

Before building the intense rhythmic and cognitive mechanics, we need a stable, completely isolated library layer. This ensures the minigame operates as a plug-and-play Promise-based function (`DescentMinigame`) that the outer game can instantiate and destroy without polluting the core loop.

---

## 00.2 Scope (IN / OUT)

### IN
- `ConfigManager.ts` (Parsing remote JSON payloads)
- `MinigameOrchestrator.ts` (State machine: `INIT` -> `ALIGN` -> `DESCENT` -> `END`)
- `<DevSettingsPanel />` (React overlay for hot-reloading Config JSON)
- `DescentCamera` setup (FOV, lighting, skybox layer)
- `HolographicDashboard.ts` (Loading the external `.glb` mesh injected via the initialization payload, acting as the GUI mount point)

### OUT
- Turbulence spawning logic — reserved for Phase 02.
- Terminal Typing typing logic — reserved for Phase 01.

---

## 00.3 Deliverables

- [x] [D00-01] Create `lib/descent-minigame` isolated directory structure.
- [x] [D00-02] Build `ConfigManager` taking a JSON string and casting it to `DescentMinigameConfig`.
- [x] [D00-03] Build `<DevSettingsPanel />` and tether its state to `ConfigManager` for live-tuning.
- [x] [D00-04] Scaffold `MinigameOrchestrator.ts` returning a `Promise<number>`.
- [x] [D00-05] Instantiate a basic isolated `Scene`, `DirectionalLight` (terminator line), and load the `dashboardGlbUrl` (from the initialization payload) into the scene, parenting it to the `DescentCamera` as the primary UI cockpit.

> Mark items as `[x]` when completed, `[~]` when partially done.

---

## 00.4 Implementation Details

### 00.4.1 Isolated Entry Point
The module must only expose `DescentMinigame.start(payload): Promise<number>`. Internally, it creates its own Babylon Engine/Scene, overlaying the canvas exactly on top of the parent context if necessary.

### 00.4.2 Dashboard GLB Mesh
The `HolographicDashboard` must not rely on dynamically generated Babylon.js primitives. Instead, the minigame payload includes a URL to a pre-generated `.glb` file (e.g. `dashboard_v1.glb` generated earlier by the server). Upon initialization, `SceneLoader.ImportMeshAsync` loads this asset, scales it, parents it to the `DescentCamera`, and searches the mesh hierarchy for predefined node names to attach the GUI elements to. This ensures total art-asset decoupling.

---

## 00.5 Isolation Requirements

- **Inputs required**: Parent game canvas element and Equirectangular slices.
- **Outputs produced**: A `failureScalar` promise resolution.
- **No forward dependencies**: True.

---

## 00.6 Gap Checklist

Before proceeding to the next phase, answer explicitly:

- [x] Is the module fully isolated (no global variable leakage)?
- [x] Does the `DevSettingsPanel` successfully update the internal configurations on-the-fly?
- [x] Is the curved dashboard mesh visible and anchored correctly to the camera's FOV?

---

## 00.7 Gate Checklist

Hard requirements that MUST pass before this phase is complete:

- [x] [Gate 1: The Promise resolves returning a valid scalar number when the orchestrator forces an 'END' state.]
- [x] [Gate 2: Memory is proven to be cleanly disposed when the promise resolves.]

---

## 00.8 Verification Tests

### Unit Tests
- [x] [Test 1: Orchestrator Promise resolves correctly]

### Manual Verification (if applicable)
- [x] [Step 1: Check browser DevTools memory allocation to ensure Babylon.js dispose() sweeps clean after exit.]

> All test files: `ver_01_chunk_02_tests/ver_01_chunk_02_phase_00.test.ts`

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| T00.1 | ✅ Pass | Tested via `ver_01_chunk_02_phase_00.test.ts` |

> Status legend: ✅ Pass | ❌ Fail | ⬜ Pending | ⚠️ Partial

---

## 00.10 Completion Criteria

This phase is DONE when:

- [x] All deliverables marked `[x]`
- [x] All gap checklist items answered affirmatively
- [x] All gate checklist items passing
- [x] All verification tests passing
- [x] Test results table updated with outcomes
