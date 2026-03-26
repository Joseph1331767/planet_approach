# Investigation Pass 1: Sun Source & Babylon Physics
**Objective**: Determine the origin, orientation, and behavioral state of the physical sun light source within the Babylon.js scene, ensuring it mathematically aligns with the visual lighting observed on the planet mesh.

## 1. Light Instantiation
Located in `MinigameOrchestrator.ts`, line 169:
`this.sunLight = new DirectionalLight("SunLight", new Vector3(-1, -0.5, 1), this.scene);`

## 2. Babylon DirectionalLight Behavior
In Babylon.js, the `direction` vector of a `DirectionalLight` defines the trajectory of the photons themselves (the vector along which the light travels).
- Vector `(-1, -0.5, 1)` means photons are traveling towards the negative X, negative Y, and positive Z direction.
- Consequently, an object at the origin `(0,0,0)` receives light on its faces pointing towards `(+1, +0.5, -1)`.

## 3. Light Animation & State
Extensive codebase searches confirm `this.sunLight.direction` is **statically locked**. It is not animated or rotated by the `OrbitCamera`. The light source is a fixed stellar body.

## Pass 1 Conclusion
The sun source works exactly as standard physical engines dictate. The illuminated face of the planet mesh correctly faces the `(1, 0.5, -1)` vector. There are no engine-level glitches or rogue rotation matrices applied to the light source itself.
