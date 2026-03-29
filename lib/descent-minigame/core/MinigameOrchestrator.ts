import { Engine, Scene, FreeCamera, ArcRotateCamera, Vector3, DirectionalLight, SceneLoader, Color4, AbstractMesh, MeshBuilder, StandardMaterial, Texture, Color3, PostProcess, Effect, Mesh, Quaternion, VertexData, Camera, Constants, ShaderLanguage } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { ConfigManager } from "../config/ConfigManager";
import { DescentPayload } from "../config/types";
import { PreLaunchTerminal } from "./PreLaunchTerminal";
import { TurbulenceController } from "./TurbulenceController";
import { VoiceCommsService } from "./VoiceCommsService";
import { AlarmManager } from "./AlarmManager";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore";
import { AtmospherePipeline } from "../../atmosphere/core/AtmospherePipeline";
import { CloudPipeline } from "../../atmosphere/core/CloudPipeline";
import { atmospherePassWGSL } from "../../atmosphere/shaders/atmospherePassShader";
import { cloudShellWGSL } from "../../atmosphere/shaders/cloudShellShader";

export enum MinigameState {
    INIT = 'INIT',
    ALIGN = 'ALIGN',
    DESCENT = 'DESCENT',
    END = 'END'
}

export class MinigameOrchestrator {
    private engine: Engine;
    private scene: Scene;
    private arcCamera: ArcRotateCamera;
    private freeCamera: FreeCamera;
    private configManager: ConfigManager;
    private currentState: MinigameState = MinigameState.INIT;
    private failureScalar: number = 0.0;
    
    private resolvePromise!: (scalar: number) => void;
    private minigamePromise: Promise<number>;

    private dashboardMesh: AbstractMesh | null = null;
    private canvas: HTMLCanvasElement;
    
    private terminal?: PreLaunchTerminal;
    private turbulence?: TurbulenceController;
    private voiceService?: VoiceCommsService;
    private alarmManager?: AlarmManager;

    private ambientPlanet: AbstractMesh | null = null;
    private orbitRenderObserver: any = null;
    private isPaused = false;
    
    public isTimelapsing = false;
    public simulatedTimeElapsed = 0;
    public onNapStateChanged?: (isNapping: boolean) => void;
    private hasLaunchBeenAuthorized = false;
    private typographyUrl?: string; 
    
    private timelapsePhase: 'OFF' | 'FADE_OUT' | 'JUMP' | 'WAIT' | 'FADE_IN' | 'FADE_IN_FINAL' = 'OFF';
    private timelapseTimer = 0;
    private timelapseFadeLevel = 0.0;
    private timelapsePostProcess: PostProcess | null = null;
    
    // Store exact orbital intercept angles for mathematically flawless descent curves
    private initialDescentAlpha = 0;
    private initialDescentBeta = 0;

    public setPaused(paused: boolean) {
        this.isPaused = paused;
        if (this.turbulence) this.turbulence.setPaused(paused);
        if (this.alarmManager) this.alarmManager.setPaused(paused);
        if (this.terminal) (this.terminal as any).setPaused?.(paused);
    }

    // --- Ported PlanetEngine Reentry Mechanics ---
    private reentryPostProcessArc: PostProcess | null = null;
    private reentryPostProcessFree: PostProcess | null = null;
    private timeElapsed: number = 0;
    private currentHeatIntensity: number = 0;
    private shakeOffset: Vector3 = new Vector3(0, 0, 0);
    private zoomMeshes: Mesh[] = [];
    private finalLayerOffset: number = 0;
    
    // Scale Parameters (Tunable via typing penalties)
    public shakeFreqScalar: number = 1.0;
    public shakeVibrationAmp: number = 1.0;
    public shakeTurbulenceAmp: number = 1.0;
    public reentryVisualsAmp: number = 1.0;

    private surfaceRadius = 5.0; // EXACT PORT VALUE
    private pickedPoint?: Vector3;
    private pickedDir = new Vector3(0, 0, -1); 

    // --- WebGPU Atmosphere & Cloud Pipeline Integration ---
    private atmospherePipeline: AtmospherePipeline | null = null;
    private cloudPipeline: CloudPipeline | null = null;
    private atmospherePostProcessArc: PostProcess | null = null;
    private atmospherePostProcessFree: PostProcess | null = null;
    private cloudPostProcessArc: PostProcess | null = null;
    private cloudPostProcessFree: PostProcess | null = null;
    private sunLight!: DirectionalLight;
    private sunDirection = new Vector3(1, 0.5, -1).normalize();

    constructor(
        canvas: HTMLCanvasElement,
        public configUrl?: string
    ) {
        this.canvas = canvas;
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        this.configManager = new ConfigManager();
        
        // Exact replicated cameras
        this.arcCamera = new ArcRotateCamera("arcCam", 0, Math.PI / 2, 20, Vector3.Zero(), this.scene);
        this.arcCamera.minZ = 0.000001;
        
        this.freeCamera = new FreeCamera("mainCam", new Vector3(0, 0, -20), this.scene);
        this.freeCamera.minZ = 0.000001;

        this.scene.activeCamera = this.arcCamera;
        
        this.sunLight = new DirectionalLight("SunLight", new Vector3(-1, -0.5, 1), this.scene);

        this.minigamePromise = new Promise<number>((res) => {
            this.resolvePromise = res;
        });
        
        window.addEventListener("resize", this.handleResize);
    }
    
    private handleResize = () => {
        this.engine.resize();
    }

    public async start(payload: DescentPayload): Promise<number> {
        this.setState(MinigameState.INIT);
        
        this.typographyUrl = payload.assets.typographyGlbUrl;

        await this.configManager.loadFromUrl(payload.configJsonUrl);
        
        if (payload.simPhysics) {
            this.configManager.updateConfig({
                physics: {
                    planetGravityGM: payload.simPhysics.planetGravityGM,
                    babylonUnitInMeters: payload.simPhysics.babylonUnitInMeters,
                    timelapseMultiplier: this.configManager.getConfig().physics.timelapseMultiplier
                }
            });
        }
        
        await this.loadDashboard(payload.assets.dashboardGlbUrl);
        
        if (this.currentState === MinigameState.END) return this.minigamePromise;
        
        // 1. Create Exact Planet Engine baseline
        this.ambientPlanet = MeshBuilder.CreateSphere("AmbientPlanet", { diameter: this.surfaceRadius * 2, segments: 64 }, this.scene);
        this.ambientPlanet.position = Vector3.Zero();

        if (payload.equiUrl) {
            const mat = new StandardMaterial("AmbientPlanetMat", this.scene);
            const tex = new Texture(payload.equiUrl, this.scene);
            tex.uScale = -1; tex.uOffset = 1;
            mat.diffuseTexture = tex;
            mat.specularColor = new Color3(0, 0, 0); 
            mat.useLogarithmicDepth = true;
            this.ambientPlanet.material = mat;
        }

        this.pickedPoint = new Vector3(0, 0, -this.surfaceRadius);
        this.pickedDir = this.pickedPoint.normalize();

        // 2. Build 15 nested zoom layers
        await this.createZoomLayers(payload.equirectangularMaps);

        // 2.5 Create TimeLapse Shutter PostProcess
        Effect.ShadersStore["timelapseFadePixelShader"] = `
            #ifdef GL_ES
            precision highp float;
            #endif
            varying vec2 vUV;
            uniform sampler2D textureSampler;
            uniform float fadeLevel;
            void main(void) {
                vec4 baseColor = texture2D(textureSampler, vUV);
                gl_FragColor = mix(baseColor, vec4(0.0, 0.0, 0.0, 1.0), fadeLevel);
            }
        `;
        this.timelapsePostProcess = new PostProcess("timelapseFade", "timelapseFade", ["fadeLevel"], null, 1.0, this.arcCamera);
        this.timelapsePostProcess.onApply = (effect) => {
            effect.setFloat("fadeLevel", this.timelapseFadeLevel);
        };

        // 3. Setup ALIGN Orbit Animation
        // Matches exact starting distance of Approach phase
        this.arcCamera.radius = 20.0;
        this.arcCamera.alpha = Math.PI / 2; // Spawn opposite beacon (-Z)
        this.arcCamera.beta = Math.PI / 2;
        
        this.orbitRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isPaused) return;
            if (this.currentState === MinigameState.ALIGN) {
                const cfg = this.configManager.getConfig();
                const GM = cfg.physics.planetGravityGM;
                const scale = cfg.physics.babylonUnitInMeters;

                const rMeters = this.arcCamera.radius * scale;
                const omega = Math.sqrt(GM / Math.pow(rMeters, 3)); // rad/s
                
                const targetAlpha = (3 * Math.PI) / 2;
                const approachStartAlpha = targetAlpha - (Math.PI / 6);
                const dt = (this.scene.getEngine().getDeltaTime() / 1000);

                if (!this.isTimelapsing) {
                    this.arcCamera.alpha += omega * dt;
                    this.simulatedTimeElapsed += dt;

                    if (this.hasLaunchBeenAuthorized && this.arcCamera.alpha >= approachStartAlpha) {
                        this.hasLaunchBeenAuthorized = false; 
                        this.beginDescent();
                    }
                } else {
                    this.timelapseTimer += dt;
                    const fadeDuration = 0.5;
                    const holdDuration = 0.8;
                    const warpDurationSimulated = 1200; // 20 simulated minutes jump
                    
                    if (this.timelapsePhase === 'OFF') {
                        this.timelapsePhase = 'FADE_OUT';
                        this.timelapseTimer = 0;
                        if (this.terminal) (this.terminal as any).printLog("[SYSTEM] TIMELAPSE SEQUENCE ENGAGED...", "#ffaa00");
                    }
                    else if (this.timelapsePhase === 'FADE_OUT') {
                        this.timelapseFadeLevel = Math.min(1.0, this.timelapseTimer / fadeDuration);
                        if (this.timelapseTimer >= fadeDuration) {
                            this.timelapsePhase = 'JUMP';
                        }
                    }
                    else if (this.timelapsePhase === 'JUMP') {
                        let jumpAngle = omega * warpDurationSimulated;
                        
                        if (this.arcCamera.alpha + jumpAngle >= approachStartAlpha) {
                            jumpAngle = Math.max(0, approachStartAlpha - this.arcCamera.alpha - 0.0001);
                            this.timelapsePhase = 'FADE_IN_FINAL';
                        } else {
                            this.timelapsePhase = 'WAIT';
                        }
                        
                        this.arcCamera.alpha += jumpAngle;
                        this.simulatedTimeElapsed += jumpAngle / omega;
                        this.timelapseTimer = 0;
                    }
                    else if (this.timelapsePhase === 'WAIT') {
                        if (this.timelapseTimer >= holdDuration) {
                            this.timelapsePhase = 'FADE_IN';
                            this.timelapseTimer = 0;
                        }
                    }
                    else if (this.timelapsePhase === 'FADE_IN') {
                        this.timelapseFadeLevel = Math.max(0.0, 1.0 - (this.timelapseTimer / fadeDuration));
                        if (this.timelapseTimer >= fadeDuration) {
                            this.timelapsePhase = 'OFF';
                            this.timelapseTimer = 0;
                        }
                    }
                    else if (this.timelapsePhase === 'FADE_IN_FINAL') {
                        this.timelapseFadeLevel = Math.max(0.0, 1.0 - (this.timelapseTimer / fadeDuration));
                        if (this.timelapseTimer >= fadeDuration) {
                            this.isTimelapsing = false;
                            this.timelapsePhase = 'OFF';
                            this.timelapseFadeLevel = 0.0;
                            if (this.timelapsePostProcess) {
                                this.timelapsePostProcess.dispose();
                                this.timelapsePostProcess = null;
                            }
                            if (this.onNapStateChanged) this.onNapStateChanged(false);
                            if (this.terminal) (this.terminal as any).printLog("[SYSTEM] TIMELAPSE COMPLETE. RESUMING 1x TIMELINE.", "#33ff33");
                        }
                    }
                }
            }
        });

        this.engine.runRenderLoop(() => this.scene.render());

        // 4. Initialize WebGPU Atmosphere & Cloud Pipelines
        this.initAtmosphereAndClouds();

        this.setState(MinigameState.ALIGN);

        this.voiceService = new VoiceCommsService();
        this.voiceService.requestMicrophone();

        this.terminal = new PreLaunchTerminal(
            this.scene, 
            this.dashboardMesh, 
            this.configManager, 
            this.voiceService, 
            (uncompletedCount: number) => {
                if (uncompletedCount > 0) {
                    this.failureScalar = Math.min(1.0, this.failureScalar + (uncompletedCount * 0.15));
                }
                this.handleLaunchCommand();
            },
            () => this.initiateNap(),
            () => this.simulatedTimeElapsed
        );

        return this.minigamePromise;
    }

    private handleLaunchCommand() {
        if (this.terminal) {
            (this.terminal as any).printLog("AWAITING APPROACH VECTOR ALIGNMENT...", "#ffaa00");
        }
        this.hasLaunchBeenAuthorized = true;
        
        const targetAlpha = (3 * Math.PI) / 2;
        const approachStartAlpha = targetAlpha - (Math.PI / 6);
        
        if (this.arcCamera.alpha < approachStartAlpha) {
            this.initiateNap();
        }
    }

    private beginDescent() {
        this.setState(MinigameState.DESCENT);
        
        if (this.terminal) {
            (this.terminal as any).printLog("APPROACH VECTOR ALIGNED. READY FOR DESCENT.", "#33ff33");
            (this.terminal as any).printLog("INITIATING ORBITAL DROP...", "#33ff33");
        }
        
        if (this.orbitRenderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.orbitRenderObserver);
            this.orbitRenderObserver = null;
        }

        this.initialDescentAlpha = this.arcCamera.alpha;
        this.initialDescentBeta = this.arcCamera.beta;

        this.runApproachSequence(() => {
            this.startDescentAnimation();
        });

        this.turbulence = new TurbulenceController(
            this.scene, 
            this.configManager, 
            this.typographyUrl,
            (hand, action, scalar = 1.0) => {
                if (action === 'MISS') {
                    this.failureScalar = Math.min(1.0, this.failureScalar + (this.configManager.getConfig().turbulence.penaltyScalarPerMiss * scalar));
                    this.shakeTurbulenceAmp = Math.min(8.0, this.shakeTurbulenceAmp + (1.5 * scalar));
                    this.shakeVibrationAmp = Math.min(4.0, this.shakeVibrationAmp + (1.0 * scalar));
                } else {
                    this.shakeTurbulenceAmp = Math.max(1.0, this.shakeTurbulenceAmp - 0.5);
                    this.shakeVibrationAmp = Math.max(1.0, this.shakeVibrationAmp - 0.2);
                }
            },
            (key: string, hand: string, actionStr: string) => {
                if (this.terminal) {
                    (this.terminal as any).printDescentLog(key, hand, actionStr);
                }
            }
        );

        this.alarmManager = new AlarmManager(this.scene, this.dashboardMesh, this.configManager, this.voiceService!, () => {
            this.failureScalar = Math.min(1.0, this.failureScalar + 0.1); 
            this.shakeTurbulenceAmp += 3.0;
            this.shakeVibrationAmp += 1.5;
        });
    }

    private runApproachSequence(onComplete: () => void) {
        this.setupAtmosphericEffects();
        
        const startAlpha = this.initialDescentAlpha;
        const targetAlpha = (3 * Math.PI) / 2; // 270 degrees
        const startBeta = this.initialDescentBeta;
        const targetBeta = Math.PI / 2;
        
        const globalStartDist = 20.0 - this.surfaceRadius; // 15
        const globalEndDist = this.finalLayerOffset + 0.0003;
        const totalDistToDrop = globalStartDist - globalEndDist;

        const startDist = this.arcCamera.radius - this.surfaceRadius; 
        const endDist = 0.05; 
        
        const totalDuration = this.configManager.getConfig().timings.totalDurationMs / 1000;
        const approachDuration = totalDuration * 0.652; 
        let approachTime = 0;
        
        const approachObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.currentState !== MinigameState.DESCENT) return;
            if (this.isPaused) return;

            const dt = this.engine.getDeltaTime() / 1000;
            approachTime += dt;
            this.timeElapsed += dt;
            if (approachTime > approachDuration) approachTime = approachDuration;
            
            const distProgress = approachTime / approachDuration;
            const currentDist = startDist * Math.pow(endDist / startDist, distProgress);
            this.arcCamera.radius = this.surfaceRadius + currentDist;
            
            // Map angle proportionally to altitude drop for a continuous Glideslope
            const distDroppedSoFar = globalStartDist - currentDist;
            const angularProgress = distDroppedSoFar / totalDistToDrop;
            
            const baseAlpha = startAlpha + (targetAlpha - startAlpha) * angularProgress;
            const baseBeta = startBeta + (targetBeta - startBeta) * angularProgress;
            
            this.updateAtmosphericEffects(currentDist, dt);
            
            this.arcCamera.alpha = baseAlpha + this.shakeOffset.x;
            this.arcCamera.beta = baseBeta + this.shakeOffset.y;
            
            if (approachTime >= approachDuration) {
                this.scene.onBeforeRenderObservable.remove(approachObserver);
                onComplete();
            }
        });
    }

    private startDescentAnimation() {
        const totalDuration = this.configManager.getConfig().timings.totalDurationMs / 1000;
        const zoomDuration = totalDuration * 0.348;
        
        const startAlpha = this.initialDescentAlpha;
        const targetAlpha = (3 * Math.PI) / 2;
        const startBeta = this.initialDescentBeta;
        const targetBeta = Math.PI / 2;
        
        const globalStartDist = 20.0 - this.surfaceRadius;
        const globalEndDist = this.finalLayerOffset + 0.0003;
        const totalDistToDrop = globalStartDist - globalEndDist;
        
        const startDistFromSurface = 0.05; 
        const endDistFromSurface = this.finalLayerOffset + 0.0003;
        this.freeCamera.setTarget(this.pickedDir.scale(this.surfaceRadius));
        this.scene.activeCamera = this.freeCamera;

        if (this.dashboardMesh) {
            this.dashboardMesh.parent = this.freeCamera;
            this.dashboardMesh.position = new Vector3(0, -1, 2); 
        }
        
        let zoomElapsed = 0;
        
        const zoomObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.currentState !== MinigameState.DESCENT) return;
            if (this.isPaused) return;
            
            const dt = this.engine.getDeltaTime() / 1000;
            zoomElapsed += dt;
            this.timeElapsed += dt;
            if (zoomElapsed > zoomDuration) zoomElapsed = zoomDuration;
            
            const distProgress = (zoomElapsed / zoomDuration);
            const currentDist = startDistFromSurface * Math.pow(endDistFromSurface / startDistFromSurface, distProgress);
            
            const distDroppedSoFar = globalStartDist - currentDist;
            const angularProgress = distDroppedSoFar / totalDistToDrop;
            
            const baseAlpha = startAlpha + (targetAlpha - startAlpha) * angularProgress;
            const baseBeta = startBeta + (targetBeta - startBeta) * angularProgress;
            
            // Convert spherical coords to position for freeCamera
            const r = this.surfaceRadius + currentDist;
            const px = r * Math.cos(baseAlpha) * Math.sin(baseBeta);
            const py = r * Math.cos(baseBeta);
            const pz = r * Math.sin(baseAlpha) * Math.sin(baseBeta);
            
            this.freeCamera.position = new Vector3(px, py, pz);
            
            this.updateAtmosphericEffects(currentDist, dt);
            
            const baseTarget = new Vector3(0, 0, 0); // Always look down at the core
            
            const forward = baseTarget.subtract(this.freeCamera.position).normalize();
            let up = new Vector3(0, 1, 0);
            if (Math.abs(Vector3.Dot(forward, up)) > 0.999) up = new Vector3(0, 0, -1);
            const right = Vector3.Cross(up, forward).normalize();
            up = Vector3.Cross(forward, right).normalize();
            
            const targetDist = Vector3.Distance(this.freeCamera.position, baseTarget);
            const shakeRight = right.scale(this.shakeOffset.x * targetDist);
            const shakeUp = up.scale(this.shakeOffset.y * targetDist);

            this.freeCamera.setTarget(baseTarget.add(shakeRight).add(shakeUp));
            
            if (zoomElapsed >= zoomDuration) {
                this.scene.onBeforeRenderObservable.remove(zoomObserver);
                this.end();
            }
        });
    }

    // --- PlanetEngine 15 Nested Image Constructor EXACT MATH ---
    private async createZoomLayers(images: string[]) {
        if (images.length === 0) return;
        
        let upPlane = new Vector3(0, 1, 0);
        if (Math.abs(Vector3.Dot(this.pickedDir, upPlane)) > 0.999) {
            upPlane = new Vector3(0, 0, -1);
        }
        
        const planetNorth = upPlane.subtract(this.pickedDir.scale(Vector3.Dot(this.pickedDir, upPlane))).normalize();
        const planetEast = Vector3.Cross(planetNorth, this.pickedDir).normalize();
        
        const rotationQuat = Quaternion.RotationQuaternionFromAxis(planetEast, planetNorth, this.pickedDir);
        
        const createSphericalCap = (name: string, radius: number, totalTheta: number, segments: number) => {
            const cap = new Mesh(name, this.scene);
            const positions: number[] = [];
            const indices: number[] = [];
            const normals: number[] = [];
            const uvs: number[] = [];
            
            const maxPhi = totalTheta / 2;
            
            for (let r = 0; r <= segments; r++) {
                const phi = (r / segments) * maxPhi;
                const z = radius * Math.cos(phi);
                const ringRadius = radius * Math.sin(phi);
                
                for (let s = 0; s <= segments; s++) {
                    const theta = (s / segments) * Math.PI * 2;
                    const x = ringRadius * Math.cos(theta);
                    const y = ringRadius * Math.sin(theta);
                    
                    positions.push(x, y, z);
                    normals.push(x / radius, y / radius, z / radius);
                    
                    const rNormalized = r / segments; 
                    const u = 0.5 - (rNormalized * Math.cos(theta) * 0.5);
                    const v = 0.5 + (rNormalized * Math.sin(theta) * 0.5);
                    uvs.push(u, v);
                }
            }
            
            const stride = segments + 1;
            for (let r = 0; r < segments; r++) {
                for (let s = 0; s < segments; s++) {
                    const current = r * stride + s;
                    const next = current + stride;
                    indices.push(current, current + 1, next);
                    indices.push(current + 1, next + 1, next);
                }
            }
            
            const vertexData = new VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.normals = normals;
            vertexData.uvs = uvs;
            vertexData.applyToMesh(cap);
            return cap;
        };
        
        let currentOffset = 0;
        
        for (let i = 0; i < images.length; i++) {
            const arcTheta = (Math.PI / 2) * Math.pow(2, -i);
            const baseSpacing = Math.max(0.001 * Math.pow(0.5, i), 0.00005);
            const spacing = baseSpacing * 1.0; 
            
            currentOffset += spacing;
            const radius = this.surfaceRadius + currentOffset;
            const segmentation = i < 4 ? 64 : 32; 
            
            const cap = createSphericalCap(`minigameLayer_${i}`, radius, arcTheta, segmentation);
            cap.position = Vector3.Zero();
            cap.rotationQuaternion = rotationQuat.clone();
            
            const mat = new StandardMaterial(`mMat_${i}`, this.scene);
            mat.specularColor = new Color3(0, 0, 0);
            mat.backFaceCulling = false;
            mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
            mat.alpha = 1.0;
            mat.useLogarithmicDepth = true; 
            mat.zOffset = -(i + 1) * 2;
            
            cap.material = mat;
            this.zoomMeshes.push(cap);
        }
        
        this.finalLayerOffset = currentOffset;
        
        await Promise.all(images.map(async (src, i) => {
            const tex = new Texture(src, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
            tex.hasAlpha = true;
            if (!tex.isReady()) {
                await new Promise<void>((resolve) => tex.onLoadObservable.addOnce(() => resolve()));
            }
            const mat = this.zoomMeshes[i].material as StandardMaterial;
            mat.diffuseTexture = tex;
            mat.useAlphaFromDiffuseTexture = true;
        }));
    }

    // --- Atmospheric Shader Setup EXACT PORT ---
    private setupAtmosphericEffects() {
        if (this.reentryPostProcessArc || this.reentryPostProcessFree) return;
        
        Effect.ShadersStore["reentryPixelShader"] = `
            #ifdef GL_ES
            precision highp float;
            #endif

            varying vec2 vUV;
            uniform sampler2D textureSampler;
            uniform float time;
            uniform float intensity;
            uniform float screenRatio;
            
            uniform float plasmaScale;
            uniform float emberDensity;
            uniform float hazeIntensity;

            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            float valueNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                float a = hash(i + vec2(0.0, 0.0));
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                for (int i = 0; i < 4; i++) {
                    v += a * valueNoise(p);
                    p = rot * p * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = vUV;
                vec2 p = vUV - 0.5;
                p.x *= screenRatio;
                
                float r = length(p);
                float angle = atan(p.y, p.x);
                
                vec4 baseColor = texture2D(textureSampler, uv);
                if (intensity <= 0.001) {
                    gl_FragColor = baseColor;
                    return;
                }

                // Heat Distortion Haze
                vec2 hazeUV = p * 15.0 + vec2(0.0, time * -8.0);
                float hazeNoise = fbm(hazeUV) * 2.0 - 1.0;
                float edgeMask = smoothstep(0.1, 0.6, r);
                vec2 distOffset = (p / (r + 0.001)) * hazeNoise * 0.03 * intensity * edgeMask * hazeIntensity;
                vec3 col = texture2D(textureSampler, uv + distOffset).rgb;

                // Plasma Shield
                float flowTime = time * 8.0;
                vec2 plasmaDomain = vec2(angle * 4.0, r * 3.0 - flowTime);
                plasmaDomain += fbm(p * 8.0 + time * 2.0) * 1.5; 
                
                float plasmaNoise = fbm(plasmaDomain * vec2(2.0, 1.0));
                plasmaNoise = pow(plasmaNoise, 2.5); 
                
                float heatBoundary = 1.0 - (intensity * 0.7); 
                float fireMask = smoothstep(heatBoundary - 0.4, heatBoundary + 0.3, r);
                float plasma = plasmaNoise * fireMask * intensity * plasmaScale;
                
                vec3 c1 = vec3(0.0, 0.0, 0.0);
                vec3 c2 = vec3(0.8, 0.1, 0.0);
                vec3 c3 = vec3(1.0, 0.5, 0.1);
                vec3 c4 = vec3(1.0, 0.9, 0.6);
                
                vec3 plasmaColor = vec3(0.0);
                if(plasma < 0.3)      plasmaColor = mix(c1, c2, plasma / 0.3);
                else if(plasma < 0.7) plasmaColor = mix(c2, c3, (plasma - 0.3) / 0.4);
                else                  plasmaColor = mix(c3, c4, (plasma - 0.7) / 0.3);
                
                // Embers (Sparks)
                float emberAngle = angle * 25.0;
                float emberRadius = r * 15.0 - time * 35.0;
                
                vec2 emberId = floor(vec2(emberAngle, emberRadius));
                vec2 emberFract = fract(vec2(emberAngle, emberRadius));
                float emberHash = hash(emberId);
                
                float emberMask = step(0.98, emberHash); 
                vec2 emberCenter = vec2(0.5) + (vec2(hash(emberId+1.0), hash(emberId+2.0)) - 0.5) * 0.5;
                
                float emberDist = length((emberFract - emberCenter) * vec2(1.0, 0.1)); 
                float emberDot = smoothstep(0.4, 0.0, emberDist);
                
                float emberStrength = emberDot * emberMask * smoothstep(0.2, 0.5, r) * intensity * 2.0 * emberDensity;
                vec3 emberColor = vec3(1.0, 0.7, 0.2) * emberStrength;
                
                float vignette = smoothstep(0.4, 1.2, r);
                vec3 ambientGlow = vec3(0.6, 0.15, 0.0) * vignette * intensity;
                
                col += plasmaColor * 2.5; 
                col += emberColor;
                col += ambientGlow;

                gl_FragColor = vec4(clamp(col, 0.0, 1.0), baseColor.a);
            }
        `;

        const applyParams = (effect: Effect) => {
            const cfg = this.configManager.getConfig().visuals;
            effect.setFloat("time", this.timeElapsed);
            effect.setFloat("intensity", this.currentHeatIntensity);
            effect.setFloat("screenRatio", this.engine.getRenderWidth() / this.engine.getRenderHeight());
            
            effect.setFloat("plasmaScale", cfg.reentryPlasmaScale);
            effect.setFloat("emberDensity", cfg.reentryEmberDensity);
            effect.setFloat("hazeIntensity", cfg.reentryHazeIntensity);
        };

        this.reentryPostProcessArc = new PostProcess(
            "reentryArc", "reentry", ["time", "intensity", "screenRatio", "plasmaScale", "emberDensity", "hazeIntensity"], null, 1.0, this.arcCamera
        );
        this.reentryPostProcessArc.onApply = applyParams;
        
        this.reentryPostProcessFree = new PostProcess(
            "reentryFree", "reentry", ["time", "intensity", "screenRatio", "plasmaScale", "emberDensity", "hazeIntensity"], null, 1.0, this.freeCamera
        );
        this.reentryPostProcessFree.onApply = applyParams;
    }

    private updateAtmosphericEffects(currentDist: number, dt: number) {
        // Peak heat at 0.5 distance from surface
        const peakDist = 0.5;
        const spread = 0.8;
        
        let heatIntensity = Math.exp(-Math.pow(currentDist - peakDist, 2) / (2 * Math.pow(spread, 2)));
        if (currentDist > 3.0 || currentDist < 0.005) heatIntensity = 0;
        
        this.currentHeatIntensity = heatIntensity * this.configManager.getConfig().visuals.reentryVisualsAmp;

        if (heatIntensity > 0) {
            const time = this.timeElapsed * this.configManager.getConfig().visuals.shakeFreqScalar;
            const vibrationAmp = 0.005 * heatIntensity * this.configManager.getConfig().visuals.shakeVibrationAmp * this.shakeVibrationAmp;
            const vibX = (Math.sin(time * 60) + Math.cos(time * 73)) * vibrationAmp;
            const vibY = (Math.cos(time * 65) + Math.sin(time * 68)) * vibrationAmp;

            let turbulence = Math.sin(time * 11) * Math.cos(time * 19) * Math.sin(time * 3);
            turbulence = Math.sign(turbulence) * Math.pow(Math.abs(turbulence), 3); 
            const jerkAmp = 0.015 * heatIntensity * this.configManager.getConfig().visuals.shakeTurbulenceAmp * this.shakeTurbulenceAmp;
            const jerkX = turbulence * jerkAmp;
            const jerkY = (Math.cos(time * 14) * Math.sin(time * 22) * Math.cos(time * 5)) * jerkAmp;

            this.shakeOffset.x = vibX + jerkX;
            this.shakeOffset.y = vibY + jerkY;
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
    }

    private setState(newState: MinigameState) {
        this.currentState = newState;
    }

    private async loadDashboard(url: string | undefined) {
        if (!url) return;
        try {
            const matches = url.match(/(.*\/)(.*)$/);
            const rootUrl = matches ? matches[1] : "";
            const fileName = matches ? matches[2] : url;

            const result = await SceneLoader.ImportMeshAsync("", rootUrl, fileName, this.scene);
            this.dashboardMesh = result.meshes[0];
            this.dashboardMesh.parent = this.arcCamera; // Parent to orbit cam first
            this.dashboardMesh.position = new Vector3(0, -1, 2); 
        } catch (e) {
            console.error("[MinigameOrchestrator] Failed to load dashboard:", e);
        }
    }

    // --- WebGPU Atmosphere & Cloud Pipeline Integration Methods ---

    private initAtmosphereAndClouds() {
        try {
            this.atmospherePipeline = new AtmospherePipeline(this.engine);

            if (this.atmospherePipeline.getState() !== 2 /* PipelineState.READY */) {
                console.warn("[MinigameOrchestrator] AtmospherePipeline failed to init. Atmospheric effects disabled.");
                this.atmospherePipeline = null;
                return;
            }

            this.cloudPipeline = new CloudPipeline(this.engine, this.scene, this.atmospherePipeline.dispatcher);

            if (this.cloudPipeline.getState() !== 2 /* CloudPipelineState.READY */) {
                console.warn("[MinigameOrchestrator] CloudPipeline failed to init. Cloud effects disabled.");
                this.cloudPipeline = null;
            }

            this.createAtmospherePostProcesses();
            this.createCloudPostProcesses();

            console.log("[MinigameOrchestrator] Atmosphere & Cloud pipelines initialized successfully.");
        } catch (e) {
            console.warn("[MinigameOrchestrator] WebGPU atmosphere/cloud init failed (WebGL fallback?):", e);
            this.atmospherePipeline = null;
            this.cloudPipeline = null;
        }
    }

    private getCameraVectors(): { pos: Vector3, fwd: Vector3, right: Vector3, up: Vector3, fov: number } {
        const cam = this.scene.activeCamera!;
        const pos = cam.position.clone();
        let fwd: Vector3;

        if (cam instanceof ArcRotateCamera) {
            fwd = cam.target.subtract(cam.position).normalize();
        } else {
            fwd = (cam as FreeCamera).getDirection(Vector3.Forward());
        }

        let tempUp = Vector3.Up();
        if (Math.abs(Vector3.Dot(fwd, tempUp)) > 0.999) {
            tempUp = new Vector3(0, 0, -1);
        }
        // Babylon Left-Handed: Right = Cross(Up, Forward)
        const right = Vector3.Cross(tempUp, fwd).normalize();
        const up = Vector3.Cross(fwd, right).normalize();
        const fov = (cam as any).fov || 0.8;

        return { pos, fwd, right, up, fov };
    }

    private createAtmospherePostProcesses() {
        if (!this.atmospherePipeline) return;

        // Register the WGSL fragment shader in Babylon's ShaderStore
        ShaderStore.ShadersStoreWGSL["atmospherePassFragmentShader"] = atmospherePassWGSL;

        const atmoUniforms = [
            "planetRadius", "atmoTop", "camPos", "sunDir",
            "camFwd", "camRight", "camUp", "tanFov", "aspectRatio"
        ];
        const atmoSamplers = ["transmittanceLUT"];

        const applyAtmoUniforms = (effect: Effect) => {
            const cv = this.getCameraVectors();
            const sunDir = this.sunDirection;

            effect.setFloat("planetRadius", this.surfaceRadius);
            effect.setFloat("atmoTop", this.surfaceRadius + 0.15);
            effect.setFloat3("camPos", cv.pos.x, cv.pos.y, cv.pos.z);
            effect.setFloat3("sunDir", sunDir.x, sunDir.y, sunDir.z);
            effect.setFloat3("camFwd", cv.fwd.x, cv.fwd.y, cv.fwd.z);
            effect.setFloat3("camRight", cv.right.x, cv.right.y, cv.right.z);
            effect.setFloat3("camUp", cv.up.x, cv.up.y, cv.up.z);
            effect.setFloat("tanFov", Math.tan(cv.fov / 2));
            effect.setFloat("aspectRatio", this.engine.getRenderWidth() / this.engine.getRenderHeight());

            effect.setTexture("transmittanceLUT", this.atmospherePipeline!.transmittanceTexture);
        };

        this.atmospherePostProcessArc = new PostProcess(
            "atmospherePassArc", "atmospherePass",
            atmoUniforms, atmoSamplers, 1.0, this.arcCamera,
            Texture.BILINEAR_SAMPLINGMODE, this.engine,
            false, null, Constants.TEXTURETYPE_UNSIGNED_BYTE,
            undefined, undefined, false, undefined,
            ShaderLanguage.WGSL
        );
        this.atmospherePostProcessArc.onApply = applyAtmoUniforms;

        this.atmospherePostProcessFree = new PostProcess(
            "atmospherePassFree", "atmospherePass",
            atmoUniforms, atmoSamplers, 1.0, this.freeCamera,
            Texture.BILINEAR_SAMPLINGMODE, this.engine,
            false, null, Constants.TEXTURETYPE_UNSIGNED_BYTE,
            undefined, undefined, false, undefined,
            ShaderLanguage.WGSL
        );
        this.atmospherePostProcessFree.onApply = applyAtmoUniforms;
    }

    private createCloudPostProcesses() {
        if (!this.cloudPipeline || !this.atmospherePipeline) return;

        // Register the WGSL fragment shader — noise_common include was already
        // registered by CloudPipeline's constructor
        ShaderStore.ShadersStoreWGSL["cloudShellFragmentShader"] = cloudShellWGSL;

        const cloudUniforms = [
            "planetRadius", "cloudBottom", "cloudTop", "coverageAmt",
            "densityMul", "elapsedTime", "camPos", "sunDir",
            "camFwd", "camRight", "camUp", "tanFov", "aspectRatio"
        ];
        const cloudSamplers = ["transmittanceLUT", "baseNoiseTex", "detailNoiseTex"];

        // Tropospheric scaling: compress cloud bounds to physical Earth proportions
        // surfaceRadius 5.0 = 6360km, so 0.01 BU ≈ 12.7km, 0.05 BU ≈ 63.5km
        const cloudBottom = this.surfaceRadius + 0.01;
        const cloudTop = this.surfaceRadius + 0.05;

        const applyCloudUniforms = (effect: Effect) => {
            // isReady() guard: prevent GPU BindGroup evaluation until compute passes finish
            if (!this.cloudPipeline || this.cloudPipeline.getState() !== 2 /* READY */) return;
            if (!this.atmospherePipeline) return;

            const cv = this.getCameraVectors();
            const sunDir = this.sunDirection;

            effect.setFloat("planetRadius", this.surfaceRadius);
            effect.setFloat("cloudBottom", cloudBottom);
            effect.setFloat("cloudTop", cloudTop);
            effect.setFloat("coverageAmt", 1.0);
            effect.setFloat("densityMul", 500.0);
            effect.setFloat("elapsedTime", this.timeElapsed);
            effect.setFloat3("camPos", cv.pos.x, cv.pos.y, cv.pos.z);
            effect.setFloat3("sunDir", sunDir.x, sunDir.y, sunDir.z);
            effect.setFloat3("camFwd", cv.fwd.x, cv.fwd.y, cv.fwd.z);
            effect.setFloat3("camRight", cv.right.x, cv.right.y, cv.right.z);
            effect.setFloat3("camUp", cv.up.x, cv.up.y, cv.up.z);
            effect.setFloat("tanFov", Math.tan(cv.fov / 2));
            effect.setFloat("aspectRatio", this.engine.getRenderWidth() / this.engine.getRenderHeight());

            effect.setTexture("transmittanceLUT", this.atmospherePipeline!.transmittanceTexture);
            effect.setTexture("baseNoiseTex", this.cloudPipeline!.baseNoiseTexture);
            effect.setTexture("detailNoiseTex", this.cloudPipeline!.detailNoiseTexture);
        };

        this.cloudPostProcessArc = new PostProcess(
            "cloudShellArc", "cloudShell",
            cloudUniforms, cloudSamplers, 1.0, this.arcCamera,
            Texture.BILINEAR_SAMPLINGMODE, this.engine,
            false, null, Constants.TEXTURETYPE_UNSIGNED_BYTE,
            undefined, undefined, false, undefined,
            ShaderLanguage.WGSL
        );
        this.cloudPostProcessArc.onApply = applyCloudUniforms;

        this.cloudPostProcessFree = new PostProcess(
            "cloudShellFree", "cloudShell",
            cloudUniforms, cloudSamplers, 1.0, this.freeCamera,
            Texture.BILINEAR_SAMPLINGMODE, this.engine,
            false, null, Constants.TEXTURETYPE_UNSIGNED_BYTE,
            undefined, undefined, false, undefined,
            ShaderLanguage.WGSL
        );
        this.cloudPostProcessFree.onApply = applyCloudUniforms;
    }

    public end() {
        this.setState(MinigameState.END);
        
        const finalScalar = Math.min(1.0, Math.max(0.0, this.failureScalar));
        
        window.removeEventListener("resize", this.handleResize);
        
        if (this.turbulence) this.turbulence.dispose();
        if (this.alarmManager) this.alarmManager.dispose();
        if (this.voiceService) this.voiceService.dispose();
        
        if (this.reentryPostProcessFree) {
            this.reentryPostProcessFree.dispose();
            this.reentryPostProcessFree = null;
        }
        if (this.reentryPostProcessArc) {
            this.reentryPostProcessArc.dispose();
            this.reentryPostProcessArc = null;
        }
        if (this.timelapsePostProcess) {
            this.timelapsePostProcess.dispose();
            this.timelapsePostProcess = null;
        }
        if (this.atmospherePostProcessArc) {
            this.atmospherePostProcessArc.dispose();
            this.atmospherePostProcessArc = null;
        }
        if (this.atmospherePostProcessFree) {
            this.atmospherePostProcessFree.dispose();
            this.atmospherePostProcessFree = null;
        }
        if (this.cloudPostProcessArc) {
            this.cloudPostProcessArc.dispose();
            this.cloudPostProcessArc = null;
        }
        if (this.cloudPostProcessFree) {
            this.cloudPostProcessFree.dispose();
            this.cloudPostProcessFree = null;
        }
        this.atmospherePipeline = null;
        this.cloudPipeline = null;

        this.engine.stopRenderLoop(); 
        
        // Defer disposal to ensure Babylon finishes its current internal render call stack
        setTimeout(() => {
            this.scene.dispose();
            this.engine.dispose();
        }, 10);
        
        this.resolvePromise(finalScalar);
    }

    public initiateNap() {
        if (this.currentState === MinigameState.ALIGN) {
            this.isTimelapsing = true;
            if (this.onNapStateChanged) this.onNapStateChanged(true);
        }
    }

    public getConfigManager(): ConfigManager {
        return this.configManager;
    }
}
