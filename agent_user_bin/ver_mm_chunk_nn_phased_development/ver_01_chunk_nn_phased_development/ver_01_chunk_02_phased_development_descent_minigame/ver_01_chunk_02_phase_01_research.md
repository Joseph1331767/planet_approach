# Chunk 02 Phase 01: Pre-Orbital Controls Research

## Objective
To implement a high-tension typing protocol string minigame that completely isolates key events from normal browser operations or parent canvas captures, establishing initial `failureScalar`.

## AAA Implementation Techniques

### 1. Robust Key Hijacking
- **The Issue:** Listening for `keydown` on `window` or `document` can trigger browser shortcuts (e.g., F5 reload, Ctrl+W exit, Spacebar scrolling). In a frantic typing minigame, stray inputs ruin the UX immediately.
- **AAA Implementation:** The minigame must physically bind a hidden HTML `<input>` over the canvas and aggressively maintain `.focus()` during the `ALIGN` Phase. This inherently captures the `onInput` text buffer cleanly instead of trying to reconstruct strings from raw KeyboardEvents (which fail at handling Shift, Caps Lock, varying layouts, etc.). This ensures typed strings like `cal-thr` are perfectly caught.

### 2. Time Accuracy
- **The Issue:** Relying on `setTimeout` or `new Date()` for the 75% launch window can drift aggressively if the main thread is blocking due to Babylon.js shader compilation or garbage collection.
- **AAA Implementation:** We must use `performance.now()` bound to the Babylon render loop ticker. Babylon's `scene.onBeforeRenderObservable` provides a delta-time (`engine.getDeltaTime()`) that is fundamentally decoupled from JS thread throttling. We tally this `dt` to precisely measure our orbital alignment countdown, guaranteeing a smooth GUI timer visual.
