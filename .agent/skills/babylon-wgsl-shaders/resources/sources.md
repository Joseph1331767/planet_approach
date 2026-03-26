# Upstream Source References

These are the original documentation sources used to build this skill. Consult them for the latest updates.

## Tier 1 — Critical (Babylon.js Official)

### B1: Writing WGSL shaders for Babylon.js
- **URL**: https://doc.babylonjs.com/setup/support/webGPU/webGPUWGSL
- **GitHub**: https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU/webGPUWGSL.md
- **Covers**: ShaderMaterial WGSL mode, entry points, includes, uniform access (`uniforms.X`), binding auto-generation, `var` for resources, NDC differences
- **License**: Apache-2.0

### B2: WebGPU Breaking Changes
- **URL**: https://doc.babylonjs.com/setup/support/webGPU/webGPUBreakingChanges
- **GitHub**: https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU/webGPUBreakingChanges.md
- **Covers**: Sampler passing restrictions, binding strictness, async readPixels, texture array indexing, viewport constraints
- **License**: Apache-2.0

### B3: WebGPU Internals
- **URL**: https://doc.babylonjs.com/setup/support/webGPU/webGPUInternals
- **GitHub**: https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU/webGPUInternals.md
- **Covers**: Engine architecture, shader processing pipeline, pipeline creation
- **License**: Apache-2.0

### B7: Shader Code in Babylon.js
- **URL**: https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/shaderCodeInBjs
- **GitHub**: https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/materials/shaders/shaderCodeInBjs.md
- **Covers**: Shader injection modalities, ShaderMaterial pipeline, code organization
- **License**: Apache-2.0

## Tier 2 — WebGPU/WGSL General

### W8/W9: WebGPU Agent Skill
- **GitHub**: https://github.com/cazala/webgpu-skill
- **Files**: SKILL.md, REFERENCE.md
- **Covers**: Framework-agnostic WebGPU patterns, buffer creation, uniform packing, pipeline setup, dispatch, readback
- **License**: Not specified

### B10/W10: Multi-Pass Shader Architecture
- **GitHub**: https://github.com/AvneeshSarwate/browser_drawn_projections/blob/main/shader_pass_architecture.md
- **Covers**: Conventions-first WGSL authoring, pass function signatures, generated bindings, runtime execution model
- **License**: Not specified

## Tier 3 — Specification References

### WGSL Specification
- **URL**: https://gpuweb.github.io/gpuweb/wgsl/
- **Covers**: Complete WGSL language specification

### WebGPU Specification
- **URL**: https://gpuweb.github.io/gpuweb/
- **Covers**: Complete WebGPU API specification

### MDN: WGSL Language Features
- **GitHub**: https://github.com/mdn/content/blob/main/files/en-us/web/api/wgsllanguagefeatures/index.md
- **Covers**: WGSL extension discovery, feature detection, portability caveats

### GPUWeb Proposals (Advanced)
- **Subgroups**: https://github.com/gpuweb/gpuweb/blob/main/proposals/subgroups.md
- **Fragment Depth**: https://github.com/gpuweb/gpuweb/blob/main/proposals/fragment-depth.md
- **Sized Binding Arrays**: https://github.com/gpuweb/gpuweb/blob/main/proposals/sized-binding-arrays.md
- **Note**: Proposals are explainers only — always verify against the current spec
