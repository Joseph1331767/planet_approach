# Chunk 02 Phase 03: Cognitive Comms Research

## Objective
To implement `WebSpeechAPI` based audio recognition alongside random keyboard-interrupt alarms, injecting intense cognitive dissonance over the ongoing physical rhythm loop.

## AAA Implementation Techniques

### 1. WebSpeechAPI "Continuous" Stalling Bug
- **The Issue:** Native implementations of the JavaScript `window.SpeechRecognition` interface suffer from a notorious defect specifically on Chrome and Chrome-Android where the recognition engine simply hangs silently if it encounters 10+ seconds of silence, failing to trigger the `onend` event and breaking the loop permanently.
- **AAA Implementation:** We must avoid the `continuous = true` property. Instead, manually attach a recursive listener. Upon `onstart`, engage an absolute `setTimeout`. If the API hasn't resolved within `X` seconds (meaning the player likely failed the math check anyway), manually fire `recognition.stop()`. Inside the `onend` event handler, conditionally restart the microphone by calling `recognition.start()` as long as the Orchestrator remains in the `DESCENT` state.

### 2. Math Processing Resiliency
- **The Issue:** Speech-to-Text models often return numbers interchangeably with words ("three zero five" vs "305" vs "3 O 5"), or return trailing whitespace, causing strict integer `====` matching to fail instantly.
- **AAA Implementation:** The input buffer string provided by `event.results[0][0].transcript` must be sanitized through a RegEx stripper:
  1. `.toLowerCase()`
  2. Replace textual integer mapping (e.g. `replace(/zero|oh/g, "0").replace(/one/g, "1")...`)
  3. Strip whitespace `/s/g`
  4. Compare the raw sanitized character string.

### 3. Critical Failover (The "Numpad" Mechanic)
- **The Issue:** `WebSpeechAPI` will immediately trigger `.onerror` returning `not-allowed`, `no-speech`, or `network` if the client blocks the mic, has no hardware, or is using an unsupported browser (Firefox/Brave strict modes).
- **AAA Implementation:** The module must wrap the initialization in a `try/catch`. The moment it fails to instance `recognition.start()`, it silently cascades to standard `KeyboardEvent` capture. While the Spacebar is held (`event.code === "Space"`), all standard `WSAD/IKJL` logic halts, and Numpad/NumberRow integers are captured into a 3-digit buffer queue until the Spacebar is released. This guarantees 100% accessibility without locking the minigame or requiring page reloads.
