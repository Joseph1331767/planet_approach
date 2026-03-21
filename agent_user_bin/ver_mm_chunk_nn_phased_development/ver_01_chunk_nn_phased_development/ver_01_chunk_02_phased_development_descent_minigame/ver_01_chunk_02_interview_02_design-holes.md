# Chunk 02: Design Holes Interview (Interview 02)

Following up on your request, I scoured the `design_thoughts` and `interview_01` documents from a senior engineering perspective. I found 4 major mechanical "holes" or edge-cases that lack explicit definitions. If we start coding without locking these down, the minigame’s logic will become muddy.

As before, please place an `[x]` next to your chosen option or type a custom answer.

---

## 🧠 Cognitive Math Logic

**B1. Vector Math "Carry Over" (Digit Wrapping)**
The Comms minigame tasks the user with adding a diff matrix to a base matrix (e.g., `345` + `+1+1-2` = `453`). However, what happens when a digit naturally exceeds 9 or drops below 0? Does it mathematically carry over (like standard arithmetic), or does it "roll over" like a padlock dial?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **Standard Arithmetic Carry** (e.g., `395` + `0+10` = `405`). | **Pros:** It's how human brains are traditionally wired to do math. **Cons:** The diff string `+1` in the middle slot technically changes the left-most slot due to the carry, which might be too hard to calculate mentally in 8 seconds. |
| **[x] (b)** | **Padlock Roll-Over (Isolated Digits)** (e.g., `395` + `0+10` = `305`). | **Pros:** Each digit is an isolated math problem. 9+1=0. 1-2=9. **Cons:** Requires the player to explicitly learn "spaceship navigation math" rules. |
| **[ ] (c)** | **Clamped Math** (e.g., `395` + `0+10` = `395`). | **Pros:** Digits max at 9 and minimum at 0. **Cons:** Easiest option, reduces cognitive load slightly. |

> **Top Recommendations:**
> 1. **(b)** — Padlock Roll-Over is the ultimate "plate-spinning" mechanic. By enforcing isolated-digit vector logic, you force the player to actively separate the three numbers mentally rather than treating it like a standard 3rd-grade addition problem. It feels much more like sci-fi decryption.
> 2. **(a)** — Best if you want the cognitive load to rely purely on standard fast-math.
> 
> **Key tradeoff:** Sci-fi isolation logic (b) vs. Standard intuitive math (a).

---

## 🚨 UX & Feedback

**B2. Alarm Dismissal Prompts**
When a critical sub-system failure occurs in the dashboard, the player must hit a specific tertiary keyboard key. Does the UI explicitly tell them the key, or do they have to rely on memorization/manual reading?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[x] (a)** | **Explicit UI Prompting** (e.g., "Thermal Warning! Press [H] to vent"). | **Pros:** Highly accessible, focuses the challenge on reaction time and breaking the pianist rhythm rather than pure memorization. **Cons:** Less hardcore. |
| **[ ] (b)** | **Manual Memorization** (e.g., A red light flashes next to the word `HYD`, player must know to press `U` for Hydraulics). | **Pros:** Extremely hardcore simulator feel. **Cons:** Steep learning curve, players will fail constantly until they memorize the manual. |

> **Top Recommendations:**
> 1. **(a)** — Because the player is already juggling a dual-handed rhythm game *and* mental vocal math, forcing pure rote memorization of warning keybinds might push the cognitive load from "fun & frantic" into "frustrating & unfair".
> 2. **(b)** — Use this if the overarching game design is deeply rooted in hardcore simulation (e.g., *DCS World* or *Steel Battalion*).
> 
> **Key tradeoff:** Reaction-time challenge vs. Simulator memorization challenge.

---

## 🕹️ Controls

**B3. Orbital Alignment Input Method**
For the Pre-Minigame launch window you established in Interview 01, the player has to match an orbit vector (angle + tangential speed). How are they physically controlling the ship during this phase?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **Mouse Look + Keyboard Throttle.** (FPS Style) |
| **[ ] (b)** | **Pure Keyboard** (Arrow keys to pitch/yaw, W/S for throttle). |
| **[x] (c) Custom** | **Terminal Protocol Typing** | As per user: A pre-orbit terminal minigame where users read a protocol list and type `xxx-xxx` string commands (like `cal-thr` or `ver-tst`). Must be completed before 75% of the orbit is reached. |

> **Top Recommendations:**
> 1. **(b)** — Since the descent minigame requires two hands on the keyboard (`WSAD` + `IKJL`), forcing the user to use the Mouse during the alignment phase means they will scramble to put their right hand back onto `IKJL` when the drop begins. Using pure keyboard for alignment ensures their hands are already perfectly positioned for the drop.
> 2. **(a)** — Better if the alignment phase takes a long time and precision aiming is paramount.
> 
> **Key tradeoff:** Ergonomic hand-transition vs. Aiming precision.

---

## 🧮 Win/Loss Logic

**B4. Drift Penalty Calculation**
The entire library only outputs one final number: `KM off-course`. How are we accumulating this number under the hood?
| Option | Description | Tradeoffs |
|--------|-------------|-----------|
| **[ ] (a)** | **The "Score Sheet" Method** (Linear addition). | **Pros:** Extremely predictable. Missed tile = +0.5km. Wrong math = +5.0km. Missed launch window = +15km. Added up at the end. **Cons:** Doesn't account for *when* the mistake happened (a mistake at the top of the atmosphere is theoretically worse than a mistake at the bottom). |
| **[ ] (b)** | **Physical Drift Algorithm** (Trigonometric divergence). | **Pros:** Mistakes alter your physical velocity vector in 3D space. The further you fall while off vector, the exponentially worse the distance becomes. **Cons:** Harder to balance; players might clip outside of the generated imagery bounds if they fail spectacularly early on. |
| **[x] (c) Custom** | **The Grand Illusion (Scalar Output)** | As per user: The minigame visually *never* drifts. The player always experiences a perfect, centered cinematic landing visually. Behind the scenes, the module calculates a `failureScalar` (0.0 to 1.0). The underlying game then explicitly moves the physical beacon object 1-5km away on the terrain. |

> **Top Recommendations:**
> 1. **(a)** — For a standalone, isolated library acting as a discrete minigame handshake, a rigid Score Sheet approach guarantees you can easily balance the minimum/maximum penalties in your `config.json` without fighting rogue physics equations. 
> 2. **(b)** — If you want the visual rendering of the planet to physically slide away from the target beacon accurately over the 8 minute span.
> 
> **Key tradeoff:** Mathematical dev control vs. Physical simulation purity.

---

## Interview 02 Summary — 2026-03-21
| ID | Decision | Locked Choice |
|----|----------|--------------|
| B1 | Vector Math "Carry Over" | (b) Padlock Roll-Over (Isolated 0-9) |
| B2 | Alarm Dismissal Feedback | (a) Explicit Terminal UI Prompting |
| B3 | Pre-Orbital Controls | (c) Terminal Protocol Typing Minigame |
| B4 | Penalty Calculation | (c) The Grand Illusion (Failure Scalar Output) |

Total: 4 decisions locked.
