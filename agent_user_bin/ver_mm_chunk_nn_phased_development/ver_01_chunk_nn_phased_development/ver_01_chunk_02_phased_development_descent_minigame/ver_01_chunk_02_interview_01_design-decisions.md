# Chunk 02: Design Decisions Interview

Please replace the `[ ]` with an `[x]` next to your chosen option, or type your own custom answer below the prompt. When finished, simply reply to me in the chat.

---

## 🏗️ Architecture & UI

**A1. Dashboard UI Rendering Layer**
The dashboard needs to display the scrolling piano tiles, vector math, and emergency alarms. This can be built as a standard React HTML overlay or baked directly into the 3D world.
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **React 2D Overlay** (HTML/CSS superimposed over the canvas). | **Pros:** Extremely fast UI development, easy to style. **Cons:** Breaks true 3D immersion, ignores camera physics/lighting. |
| **[ ] (b)** | **Babylon 3D GUI** (Rendered directly onto a curved dashboard mesh). | **Pros:** AAA glass-pod immersion, shakes perfectly with the camera, reacts to the Sun's lighting. **Cons:** Slightly more complex to wire up relative to pure React. |
| **[x] (c) Custom** | **3D Babylon GUI Placeholder** | As per user: Build the structure in 3D to easily swap out models/implementations in the future, securing the AAA immersion pipeline without overcommitting on art yet. |

> **Top Recommendations:**
> 1. **(b)** — For a AAA cinematic experience, rendering the interface inside the 3D scene ensures the UI shakes violently *with* the ship rather than floating statically on top of the screen.
> 2. **(a)** — Best if we want to prioritize rapid development speed or if the UI needs complex web animations.
> 
> **Key tradeoff:** Absolute immersion (3D) vs. iteration speed (2D).

---

## 🎙️ Hardware & Accessibility

**A2. Voice Recognition Fallback Mechanism**
The Web Speech API is incredibly powerful, but its accuracy depends on browser support (excellent in Chrome/Edge, poor in Firefox) and requires explicit microphone permissions.
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **Microphone Strictly Required.** No fallback. | **Pros:** Forces the intended frantic cognitive mechanic. **Cons:** Unplayable if the user lacks a mic, refuses permissions, or uses an unsupported browser. |
| **[x] (b)** | **Numpad Fallback.** | **Pros:** Fully accessible. If the mic fails, the user can manually type the 3 digits on their keyboard while holding the Spacebar. **Cons:** Typing is physically easier than speaking under pressure, slightly altering the intended tension. |

> **Locked:** The user deferred answering A2. As the AI acting as Sr. Dev, I am officially locking in **(b) Numpad Fallback** to ensure the web-app remains functional and accessible in the event of WebSpeechAPI failure on unsupported browsers.

> **Top Recommendations:**
> 1. **(b)** — Modern AAA games always ship with accessibility fallbacks. We should prioritize the mic, but silently fail over to listening to Numpad inputs to ensure the game doesn't hard-lock due to hardware.
> 2. **(a)** — If this is a strict simulation/art-piece where the vocal panic is non-negotiable.
> 
> **Key tradeoff:** Guaranteed accessibility vs. strictly enforced gameplay design.

---

## 🎹 Physical Mechanic Feel

**A3. Piano-Tile Input Methodology**
When the turbulence commands (W,A,S,D / I,J,K,L) stream down the columns, how strict should the hit-detection be to secure a "Success"?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **Rhythmic Tapping** (Guitar Hero style). | **Pros:** Fast-paced, distinct impacts. **Cons:** Can feel disjointed from the concept of "wrestling with a joystick". |
| **[ ] (b)** | **Sustained Holds** (Osu! stretch style). | **Pros:** Tiles are rendered as long bars. The player must hold the keys down to violently "steady" the ship against the drag. **Cons:** Requires more complex visual tracking. |
| **[ ] (c)** | **Hybrid Chaos.** | **Pros:** Taps for minor turbulence bumps, Sustained Holds for massive atmospheric atmospheric drag waves. **Cons:** Highest difficulty. |
| **[x] (d) Custom** | **"Pat Belly Rub Head" Holographic Flow** | As per user: Left hand = low freq stochastic spawns (3-6s). Right hand = high freq (1-3s). Holographic 3D streams matching Star Wars hyperspace lines. Visual keys dictating action: White w/ trail = Hold, White Flashing = Rapid Tap, Blue = Single Quick Press. |

> **Top Recommendations:**
> 1. **(c)** — A hybrid approach allows the procedural generator to throw diverse challenges at the player. Long, sweeping holds feel like fighting G-forces, while rapid taps feel like hitting debris or sudden wind shear.
> 2. **(a)** — Simplest rhythm logic to implement; very familiar to most players.
> 
> **Key tradeoff:** Gameplay variety/realism (Hybrid) vs. predictable muscle memory (Tapping).

---

## 🚀 Cinematic Flow

**A4. The Alignment Transition**
The game starts 10x further out for the Initial Alignment phase. After the player centers the reticle, how do we transition into the 8-10 minute minigame?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **Seamless Continuous Drop.** | **Pros:** 100% realistic continuous scale. **Cons:** Depending on physical speed, traversing 10x the distance might leave huge gaps of "dead air" before hitting the atmosphere where the minigame actually starts. |
| **[ ] (b)** | **The "Burn" Jump-Cut.** | **Pros:** The player aligns, hits [Engage], the engine roars, the camera violently shakes, and a hyper-speed effect visually transitions them directly into the upper atmosphere where the minigame immediately begins. **Cons:** Minor break in continuous time. |
| **[x] (c) Custom** | **Pre-Minigame Orbital Vectoring** | As per user: A separate orbital alignment minigame dictating the launch window. Auto-launches if missed, severely penalizing reentry turbulence. Dynamically calculating falling speeds and actively chaining the physics formulas across the entire model. |

> **Top Recommendations:**
> 1. **(b)** — Spoofing the journey with a cinematic hyper-burn skip keeps the action intensely paced and eliminates any boring waiting periods in orbit.
> 2. **(a)** — Retains absolute simulator purity if the descent speed is tuned to perfectly fill the 8-minute window.
> 
> **Key tradeoff:** Snappy cinematic pacing (Jump-Cut) vs. continuous simulator purity (Seamless Drop). 

---

## Interview Summary — 2026-03-21
| ID | Decision | Locked Choice |
|----|----------|--------------|
| A1 | Dashboard Overlays | (c) Babylon 3D GUI Placeholder Engine |
| A2 | Voice Fallbacks | (b) Numpad Fallback |
| A3 | Rhythm Hit Mechanics | (d) Holographic "Pat Belly Rub Head" Mechanics |
| A4 | Transition Pacing | (c) Pre-Minigame Orbital Vectoring Window |

Total: 4 decisions locked.
