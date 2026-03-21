import { Engine, Scene, Vector3, FreeCamera, MeshBuilder, StandardMaterial, Texture, Color4, Color3, MultiMaterial, RenderTargetTexture, DynamicTexture, Animation, CubicEase, EasingFunction, Quaternion, Mesh, Tools, ArcRotateCamera, SubMesh, HemisphericLight, Camera, PointLight, VertexData, Matrix, PostProcess, Effect } from '@babylonjs/core';
import { GoogleGenAI } from '@google/genai';

export class PlanetEngine {
    engine: Engine;
    scene: Scene;
    camera: FreeCamera;
    arcCamera: ArcRotateCamera;
    box: Mesh | null = null;
    onProgress: (msg: string) => void;
    onZoomReady?: (images: string[]) => void;
    customApiKey?: string;
    zoomImages: string[] = [];
    equiUrl: string | null = null;
    pickedPoint: Vector3 | null = null;
    zooming: boolean = false;
    tripDuration: number = 1800; // Default 30 minutes in seconds
    zoomMeshes: Mesh[] = [];
    finalLayerOffset: number = 0;
    /** Scalar multiplier on the base layer spacing. Exposed for UI tuning. */
    layerSpacingScalar: number = 1.0;
    layerBaseOffsets: number[] = [];
    upscalePromptTemplate: string = "**Task:** Upscale a low-resolution image of an alien planet surface. **Visual description:** An aerial view at the scale of {targetKm} km × {targetKm} km. The landscape is an uninhabited alien planet. We will keep the colors and visible structure the same. **Instructions:** Upscale the low-resolution image.";
    useHighQuality: boolean = false;
    highQualityModel: string = 'gemini-3-pro-image-preview';

    // AAA Atmospheric Reentry Effects
    reentryPostProcessArc: PostProcess | null = null;
    reentryPostProcessFree: PostProcess | null = null;
    timeElapsed: number = 0;
    currentHeatIntensity: number = 0;
    shakeOffset: Vector3 = new Vector3(0, 0, 0);

    // Dev settings for camera shake
    shakeFreqScalar: number = 1.0;
    shakeVibrationAmp: number = 1.0;
    shakeTurbulenceAmp: number = 1.0;
    reentryVisualsAmp: number = 1.0;

    constructor(canvas: HTMLCanvasElement, customApiKey: string | undefined, onProgress: (msg: string) => void, onZoomReady?: (images: string[]) => void) {
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        this.onProgress = onProgress;
        this.onZoomReady = onZoomReady;
        this.customApiKey = customApiKey;

        // Ensure canvas is sized correctly
        const resizeObserver = new ResizeObserver(() => {
            this.engine.resize();
        });
        resizeObserver.observe(canvas);

        this.arcCamera = new ArcRotateCamera("arcCam", 0, Math.PI / 2, 20, Vector3.Zero(), this.scene);
        this.arcCamera.attachControl(canvas, true);
        this.arcCamera.minZ = 0.000001; // Prevent near-clipping through the planet surface at extreme zooms
        
        // Add a camera-attached light for better visibility
        const pointLight = new PointLight("pointLight", Vector3.Zero(), this.scene);
        pointLight.intensity = 0.8;
        pointLight.parent = this.arcCamera;

        this.camera = new FreeCamera("mainCam", new Vector3(0, 0, -20), this.scene);
        this.camera.setTarget(Vector3.Zero());
        this.camera.minZ = 0.001; // Prevent near-clipping
        this.scene.activeCamera = this.arcCamera;

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    captureScreenshot(size: number): Promise<string> {
        return new Promise((resolve) => {
            Tools.CreateScreenshotUsingRenderTarget(this.engine, this.scene.activeCamera!, { width: size, height: size }, (data) => {
                resolve(data);
            });
        });
    }

    async createPlanet(equiUrl: string | null) {
        this.equiUrl = equiUrl;
        
        // Clean up previous planet if it exists
        this.scene.getMeshByName("planetSphere")?.dispose();
        
        this.box = MeshBuilder.CreateSphere("planetSphere", { diameter: 10, segments: 64 }, this.scene);
        const mat = new StandardMaterial("planetMat", this.scene);
        mat.ambientColor = new Color3(0.1, 0.1, 0.1);
        mat.specularColor = new Color3(0, 0, 0); // Disable specular highlights
        mat.useLogarithmicDepth = true; // Massively improves z-fighting resolution from afar

        if (equiUrl) {
            this.onProgress("Loading texture...");
            const tex = new Texture(equiUrl, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, () => {}, (message) => {
                console.error("Texture failed to load:", message);
            });
            
            if (!tex.isReady()) {
                await new Promise<void>((resolve, reject) => {
                    tex.onLoadObservable.addOnce(() => resolve());
                    setTimeout(() => {
                        if (!tex.isReady()) reject(new Error("Texture load timeout"));
                    }, 10000);
                });
            }

            mat.diffuseTexture = tex;
            // Equirectangular textures usually need to be inverted on X in Babylon
            tex.uScale = -1;
            tex.uOffset = 1;
        } else {
            this.onProgress("Loading legacy session...");
            // Fallback alien color for legacy sessions
            mat.diffuseColor = new Color3(0.2, 0.4, 0.6);
        }

        this.box.material = mat;

        this.scene.activeCamera = this.arcCamera;

        this.scene.onPointerDown = (evt, pickResult) => {
            if (evt.altKey) {
                return; // Allow orbiting when Alt is held
            }
            if (pickResult.hit && pickResult.pickedMesh === this.box) {
                this.scene.onPointerDown = undefined;
                this.processZoomImages(pickResult.pickedPoint!);
            }
        };

        this.onProgress("Planet ready. Hold ALT and drag to orbit. Click without ALT to zoom.");
    }

    async extractBaseImage(pickedPoint: Vector3): Promise<string> {
        const cam = new FreeCamera("captureCam", Vector3.Zero(), this.scene);
        cam.setTarget(pickedPoint);
        cam.fov = Math.PI / 2; // 90 degrees = cube map face

        // Make sphere visible from inside
        if (this.box && this.box.material) {
            this.box.material.backFaceCulling = false;
        }

        const dataUrl = await new Promise<string>((resolve) => {
            Tools.CreateScreenshotUsingRenderTarget(this.engine, cam, { width: 1024, height: 1024 }, (data) => {
                resolve(data);
            });
        });

        cam.dispose();

        // Restore culling
        if (this.box && this.box.material) {
            this.box.material.backFaceCulling = true;
        }

        // Flip horizontally because we rendered from inside the sphere
        const img = new Image();
        img.src = dataUrl;
        await new Promise(r => img.onload = r);
        
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(1024, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        
        return canvas.toDataURL('image/jpeg');
    }

    async upscaleImage(croppedBase64: string, layerIndex: number): Promise<string> {
        if (!this.customApiKey) {
            throw new Error("No API key provided. Please enter your Gemini API key.");
        }
        
        // Calculate approximate scale for the prompt
        // Assume planet ~10,000 km diameter. Base view covers ~2,500 km.
        // Each layer is 2x zoom, so layer i covers 2500 / 2^(i+1) km.
        const targetKm = Math.round(2500 / Math.pow(2, layerIndex + 1));
        const promptText = this.upscalePromptTemplate.replace(/\{targetKm\}/g, targetKm.toString());
        
        const ai = new GoogleGenAI({ apiKey: this.customApiKey });
        const modelToUse = this.useHighQuality ? this.highQualityModel : 'gemini-2.5-flash-image';
        
        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: croppedBase64.split(',')[1],
                            mimeType: 'image/jpeg'
                        }
                    },
                    {
                        text: promptText
                    }
                ]
            },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
            throw new Error("Invalid or empty response from Gemini API");
        }

        let base64Upscaled = "";
        let mimeType: string = "image/jpeg";
        for (const part of response.candidates[0].content.parts) {
            const inlineData = part.inlineData;
            if (inlineData) {
                base64Upscaled = inlineData.data as string;
                const m = inlineData.mimeType as string | undefined;
                if (m) mimeType = m as string;
                break;
            }
        }
        
        if (!base64Upscaled) {
            throw new Error("No image data found in Gemini response");
        }
        
        return `data:${mimeType};base64,${base64Upscaled}`;
    }

    private async applyCircularMask(base64: string): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(base64);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                ctx.globalCompositeOperation = 'destination-in';
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(centerX, centerY);
                const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = base64;
        });
    }

    async processZoomImages(pickedPoint: Vector3) {
        this.pickedPoint = pickedPoint;
        this.arcCamera.detachControl();
        
        try {
            this.onProgress("Extracting base image from planet surface...");
            const baseImage = await this.extractBaseImage(pickedPoint);
            
            const zoomImages: string[] = [baseImage];
            let currentImage = baseImage;
            
            const numLayers = 14;

            for (let i = 0; i < numLayers; i++) {
                this.onProgress(`Processing zoom layer ${i + 1}/${numLayers}...`);
                const img = new Image();
                img.src = currentImage;
                await new Promise(r => img.onload = r);
                
                const w = img.width;
                const h = img.height;
                const cropW = w / 2;
                const cropH = h / 2;
                const cropX = w / 4;
                const cropY = h / 4;
                
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                // Crop center 25% (50% width × 50% height = 2x zoom) dynamically handles any resolution (e.g. 4K)
                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, w, h);
                const croppedDataUrl = canvas.toDataURL('image/jpeg');
                
                this.onProgress(`Upscaling zoom layer ${i + 1}/${numLayers}...`);
                const upscaled = await this.upscaleImage(croppedDataUrl, i);
                const masked = await this.applyCircularMask(upscaled);
                zoomImages.push(masked);
                currentImage = upscaled;
            }
            
            this.onProgress("Processing complete. Planet is ready for exploration.");
            this.zoomImages = zoomImages;
            if (this.onZoomReady) this.onZoomReady(zoomImages);
            
            // Re-enable controls for exploration
            this.arcCamera.attachControl(this.engine.getRenderingCanvas()!, true);
        } catch (error: any) {
            console.error("Error during zoom processing:", error);
            this.onProgress("Error processing zoom. Please try again.");
            this.arcCamera.attachControl(this.engine.getRenderingCanvas()!, true);
        }
    }

    async approach(onComplete?: () => void) {
        if (this.zoomImages.length === 0 || !this.pickedPoint) return;
        this.onProgress("Approaching surface...");
        this.arcCamera.detachControl();
        
        // Create zoom layers immediately so they're visible during approach
        await this.createZoomLayers(this.zoomImages);
        
        const startAlpha = this.arcCamera.alpha;
        const targetAlpha = Math.atan2(this.pickedPoint.z, this.pickedPoint.x);
        const startBeta = this.arcCamera.beta;
        const targetBeta = Math.acos(this.pickedPoint.y / this.pickedPoint.length());
        
        // Approach in terms of DISTANCE FROM SURFACE (not radius from center)
        // This gives constant visual zoom rate (Google Earth logarithmic altitude)
        const surfaceRadius = 5.0;
        const startDist = this.arcCamera.radius - surfaceRadius; // ~15 from orbit
        const endDist = 0.05; // where descent takes over
        
        // Duration split matched to log-space velocity:
        // Approach: ln(15/0.05) = 5.70 doublings
        // Descent:  ln(0.05/0.0024) = 3.04 doublings
        // Split: 5.70/(5.70+3.04) = 0.652
        const approachDuration = this.tripDuration * 0.652; 
        let approachTime = 0;
        
        const approachObserver = this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            approachTime += dt;
            if (approachTime > approachDuration) approachTime = approachDuration;
            
            const progress = approachTime / approachDuration;
            
            // Exponential distance-from-surface decrease = constant visual zoom rate
            const currentDist = startDist * Math.pow(endDist / startDist, progress);
            this.arcCamera.radius = surfaceRadius + currentDist;
            
            // Smooth orbital correction (sine ease for natural arc)
            const angularEase = 0.5 - 0.5 * Math.cos(Math.PI * progress);
            const baseAlpha = startAlpha + (targetAlpha - startAlpha) * angularEase;
            const baseBeta = startBeta + (targetBeta - startBeta) * angularEase;
            
            this.setupAtmosphericEffects();
            this.updateAtmosphericEffects(currentDist, this.arcCamera, dt);
            
            // Adjust scale of shake because alpha/beta are radians natively
            const shakeAngularX = this.shakeOffset.x;
            const shakeAngularY = this.shakeOffset.y;

            this.arcCamera.alpha = baseAlpha + shakeAngularX;
            this.arcCamera.beta = baseBeta + shakeAngularY;
            
            if (approachTime >= approachDuration) {
                this.scene.onBeforeRenderObservable.remove(approachObserver);
                if (onComplete) onComplete();
                this.startDescentAnimation();
            }
        });
    }

    /**
     * Creates and configures the screen-space PostProcess shader for reentry wind and heat.
     */
    private setupAtmosphericEffects() {
        if (this.reentryPostProcessArc || this.reentryPostProcessFree) return; // Already setup
        
        Effect.ShadersStore["reentryPixelShader"] = `
            #ifdef GL_ES
            precision highp float;
            #endif

            varying vec2 vUV;
            uniform sampler2D textureSampler;
            uniform float time;
            uniform float intensity;
            uniform float screenRatio;

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
                vec2 distOffset = (p / (r + 0.001)) * hazeNoise * 0.03 * intensity * edgeMask;
                vec3 col = texture2D(textureSampler, uv + distOffset).rgb;

                // Plasma Shield
                float flowTime = time * 8.0;
                vec2 plasmaDomain = vec2(angle * 4.0, r * 3.0 - flowTime);
                plasmaDomain += fbm(p * 8.0 + time * 2.0) * 1.5; // Turbulence
                
                float plasmaNoise = fbm(plasmaDomain * vec2(2.0, 1.0));
                plasmaNoise = pow(plasmaNoise, 2.5); // Sharpen flames
                
                float heatBoundary = 1.0 - (intensity * 0.7); 
                float fireMask = smoothstep(heatBoundary - 0.4, heatBoundary + 0.3, r);
                float plasma = plasmaNoise * fireMask * intensity;
                
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
                
                // Stretch radially for motion blur (y controls radial scale)
                float emberDist = length((emberFract - emberCenter) * vec2(1.0, 0.1)); 
                float emberDot = smoothstep(0.4, 0.0, emberDist);
                
                float emberStrength = emberDot * emberMask * smoothstep(0.2, 0.5, r) * intensity * 2.0;
                vec3 emberColor = vec3(1.0, 0.7, 0.2) * emberStrength;
                
                // Screen edge ambient red glow
                float vignette = smoothstep(0.4, 1.2, r);
                vec3 ambientGlow = vec3(0.6, 0.15, 0.0) * vignette * intensity;
                
                col += plasmaColor * 2.5; 
                col += emberColor;
                col += ambientGlow;

                gl_FragColor = vec4(clamp(col, 0.0, 1.0), baseColor.a);
            }
        `;

        const applyParams = (effect: Effect) => {
            effect.setFloat("time", this.timeElapsed);
            effect.setFloat("intensity", this.currentHeatIntensity);
            effect.setFloat("screenRatio", this.engine.getRenderWidth() / this.engine.getRenderHeight());
        };

        this.reentryPostProcessArc = new PostProcess(
            "reentryArc", "reentry", ["time", "intensity", "screenRatio"], null, 1.0, this.arcCamera
        );
        this.reentryPostProcessArc.onApply = applyParams;

        this.reentryPostProcessFree = new PostProcess(
            "reentryFree", "reentry", ["time", "intensity", "screenRatio"], null, 1.0, this.camera
        );
        this.reentryPostProcessFree.onApply = applyParams;
    }

    private updateAtmosphericEffects(currentDist: number, activeCamera: Camera, dt: number) {
        // Peak heat at 0.5 distance from surface (~500km scaled). Spread covers ~2.0 distance.
        const peakDist = 0.5;
        const spread = 0.8;
        
        let heatIntensity = Math.exp(-Math.pow(currentDist - peakDist, 2) / (2 * Math.pow(spread, 2)));
        if (currentDist > 3.0 || currentDist < 0.005) heatIntensity = 0;
        
        this.currentHeatIntensity = heatIntensity * this.reentryVisualsAmp;
        this.timeElapsed += dt;

        if (heatIntensity > 0) {
            const time = this.timeElapsed * this.shakeFreqScalar;
            const vibrationAmp = 0.005 * heatIntensity * this.shakeVibrationAmp;
            const vibX = (Math.sin(time * 60) + Math.cos(time * 73)) * vibrationAmp;
            const vibY = (Math.cos(time * 65) + Math.sin(time * 68)) * vibrationAmp;

            let turbulence = Math.sin(time * 11) * Math.cos(time * 19) * Math.sin(time * 3);
            turbulence = Math.sign(turbulence) * Math.pow(Math.abs(turbulence), 3); 
            const jerkAmp = 0.015 * heatIntensity * this.shakeTurbulenceAmp;
            const jerkX = turbulence * jerkAmp;
            const jerkY = (Math.cos(time * 14) * Math.sin(time * 22) * Math.cos(time * 5)) * jerkAmp;

            this.shakeOffset.x = vibX + jerkX;
            this.shakeOffset.y = vibY + jerkY;
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
    }

    private cleanupAtmosphericEffects() {
        if (this.reentryPostProcessArc) { this.reentryPostProcessArc.dispose(); this.reentryPostProcessArc = null; }
        if (this.reentryPostProcessFree) { this.reentryPostProcessFree.dispose(); this.reentryPostProcessFree = null; }
        this.timeElapsed = 0;
        this.currentHeatIntensity = 0;
    }

    /**
     * Starts the camera descent animation through the zoom layers.
     * Called after approach completes. Assumes createZoomLayers() was already called.
     */
    private startDescentAnimation() {
        if (!this.pickedPoint || this.zoomMeshes.length === 0) return;
        
        this.setupAtmosphericEffects();
        
        const pickedDir = this.pickedPoint.normalize();
        const surfaceRadius = 5.0;
        
        this.arcCamera.detachControl();
        
        // Dynamically stop right above the layer stack
        const startDistFromSurface = 0.05;
        const endDistFromSurface = this.finalLayerOffset + 0.0003;
        
        this.camera.position = pickedDir.scale(surfaceRadius + startDistFromSurface);
        this.camera.setTarget(pickedDir.scale(surfaceRadius));
        this.camera.minZ = 0.000001;
        this.scene.activeCamera = this.camera;
        
        // Duration: remaining 34.8% of trip time
        const zoomDuration = this.tripDuration * 0.348;
        let zoomElapsed = 0;
        
        this.onProgress("Descending through zoom layers...");
        
        const zoomObserver = this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            zoomElapsed += dt;
            this.timeElapsed += dt;
            if (zoomElapsed > zoomDuration) zoomElapsed = zoomDuration;
            
            const progress = zoomElapsed / zoomDuration;
            
            // Exponential zoom: same log-space velocity as approach
            const currentDist = startDistFromSurface * Math.pow(endDistFromSurface / startDistFromSurface, progress);
            this.camera.position = pickedDir.scale(surfaceRadius + currentDist);
            
            this.updateAtmosphericEffects(currentDist, this.camera, dt);
            
            // Calculate base target and inject screen shake
            const baseTarget = pickedDir.scale(surfaceRadius);
            
            // Construct up and right vectors to apply shake parallel to screen bounds
            const forward = baseTarget.subtract(this.camera.position).normalize();
            let up = new Vector3(0, 1, 0);
            if (Math.abs(Vector3.Dot(forward, up)) > 0.999) up = new Vector3(0, 0, -1);
            const right = Vector3.Cross(up, forward).normalize();
            up = Vector3.Cross(forward, right).normalize();
            
            // The further away the target, the more we need to offset it for the same visual angle shake
            const targetDist = Vector3.Distance(this.camera.position, baseTarget);
            const shakeRight = right.scale(this.shakeOffset.x * targetDist);
            const shakeUp = up.scale(this.shakeOffset.y * targetDist);

            this.camera.setTarget(baseTarget.add(shakeRight).add(shakeUp));
            
            if (zoomElapsed >= zoomDuration) {
                this.scene.onBeforeRenderObservable.remove(zoomObserver);
                this.cleanupAtmosphericEffects();
                
                this.arcCamera.target = pickedDir.scale(surfaceRadius);
                this.arcCamera.radius = endDistFromSurface;
                this.arcCamera.alpha = Math.atan2(pickedDir.z, pickedDir.x);
                this.arcCamera.beta = Math.acos(pickedDir.y);
                this.scene.activeCamera = this.arcCamera;
                this.arcCamera.attachControl(this.engine.getRenderingCanvas()!, true);
                
                this.onProgress("Descent complete. Orbit to explore the surface.");
            }
        });
    }

    /**
     * Creates the zoom layer cap meshes and loads their textures.
     * Call this immediately when a session is loaded so layers exist for debugging.
     */
    async createZoomLayers(images: string[]) {
        this.zoomImages = images;
        if (!this.pickedPoint) return;
        
        // Dispose any previously created zoom layers
        for (const mesh of this.scene.meshes.filter(m => m.name.startsWith('zoomLayer_'))) {
            mesh.dispose();
        }
        this.zoomMeshes = [];
        
        const pickedDir = this.pickedPoint.normalize();
        
        // Compute explicit geographic tangent basis to avoid shortest-arc twist
        let upPlane = new Vector3(0, 1, 0);
        // Handle singularity at poles
        if (Math.abs(Vector3.Dot(pickedDir, upPlane)) > 0.999) {
            upPlane = new Vector3(0, 0, -1);
        }
        
        const planetNorth = upPlane.subtract(pickedDir.scale(Vector3.Dot(pickedDir, upPlane))).normalize();
        const planetEast = Vector3.Cross(planetNorth, pickedDir).normalize();
        
        const rotationQuat = Quaternion.RotationQuaternionFromAxis(planetEast, planetNorth, pickedDir);
        
        // Helper: generate a spherical cap mesh centered at origin with pole along +Z
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
                    // Negate the cosine term to fix horizontal mirroring
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
        
        // Create all textured zoom layers as spherical caps
        const meshes: Mesh[] = [];
        const baseRadius = 5.0;
        let currentOffset = 0;
        let currentBaseOffset = 0;
        this.layerBaseOffsets = [];
        
        for (let i = 0; i < images.length; i++) {
            const arcTheta = (Math.PI / 2) * Math.pow(2, -i);
            
            // Dynamic exponential spacing: starts large for the biggest layers,
            // halves each step to match the 2x zoom rate.
            const baseSpacing = Math.max(0.001 * Math.pow(0.5, i), 0.00005);
            const spacing = baseSpacing * this.layerSpacingScalar;
            
            currentOffset += spacing;
            currentBaseOffset += baseSpacing;
            this.layerBaseOffsets.push(currentBaseOffset);
            
            const radius = baseRadius + currentOffset;
            
            const name = `zoomLayer_${i}`;
            const segmentation = i < 4 ? 64 : 32; 
            
            const cap = createSphericalCap(name, radius, arcTheta, segmentation);
            cap.position = Vector3.Zero();
            
            // Apply quaternion rotation to orient cap pole toward pickedDir
            cap.rotationQuaternion = rotationQuat.clone();
            
            const mat = new StandardMaterial(name + "Mat", this.scene);
            mat.disableLighting = true;
            mat.emissiveColor = new Color3(1, 1, 1);
            mat.specularColor = new Color3(0, 0, 0);
            mat.backFaceCulling = false;
            mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
            mat.alpha = 1.0;
            mat.useLogarithmicDepth = true; // Massively improves depth precision, fixing Z-fighting without altering minZ
            // Polygon offset: push each layer further from camera in depth buffer.
            // A value of -(i+1)*2 ensures layer i always renders on top of layer i-1
            // regardless of floating-point precision at any zoom distance.
            mat.zOffset = -(i + 1) * 2;
            
            cap.material = mat;
            cap.visibility = 1;
            
            meshes.push(cap);
            this.zoomMeshes.push(cap);
        }
        
        this.finalLayerOffset = currentOffset;
        
        // Load textures onto the caps
        await Promise.all(images.map(async (src, i) => {
            const tex = new Texture(src, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
                () => console.log(`[ZoomLayers] Texture ${i} loaded OK`),
                (msg) => console.error(`[ZoomLayers] Texture ${i} FAILED:`, msg)
            );
            tex.hasAlpha = true;
            if (!tex.isReady()) {
                await new Promise<void>((resolve) => {
                    tex.onLoadObservable.addOnce(() => resolve());
                });
            }
            const mat = meshes[i].material as StandardMaterial;
            // Use diffuseTexture + useAlphaFromDiffuseTexture for proper alpha channel support
            // (opacityTexture reads RED channel, not alpha — wrong for our circular-masked PNGs)
            mat.diffuseTexture = tex;
            mat.emissiveTexture = tex;
            mat.useAlphaFromDiffuseTexture = true;
            return tex;
        }));
        
        console.log(`[ZoomLayers] Created ${images.length} layers oriented toward`, pickedDir.toString());
        
        if (this.onZoomReady) {
            this.onZoomReady(images);
        }
    }

    toggleLayerVisibility(index: number): boolean {
        if (index < 0 || index >= this.zoomMeshes.length) return false;
        const mesh = this.zoomMeshes[index];
        mesh.setEnabled(!mesh.isEnabled());
        return mesh.isEnabled();
    }

    togglePlanetVisibility(): boolean {
        if (!this.box) return false;
        this.box.setEnabled(!this.box.isEnabled());
        return this.box.isEnabled();
    }
    
    private async applyCircularAlphaGradient(base64: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject("Failed to get 2d context");

                // Draw original image
                ctx.drawImage(img, 0, 0);

                // Create radial gradient for alpha mask
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(centerX, centerY);

                const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                // Maintain solid opacity for the core of the image
                gradient.addColorStop(0, 'rgba(0,0,0,1)'); 
                gradient.addColorStop(0.65, 'rgba(0,0,0,1)'); 
                // Feather the outer 35% into pure transparency at the circular boundary
                gradient.addColorStop(1, 'rgba(0,0,0,0)'); 

                // Execute masking: keeps target pixels mapped to gradient alpha, erases square corners
                ctx.globalCompositeOperation = 'destination-in';
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => reject(e);
            img.src = base64;
        });
    }

    /**
     * Ascends (zoom out in reverse) back to the approach camera.
     */
    public ascend(onComplete?: () => void) {
        if (!this.pickedPoint) return;
        const pickedDir = this.pickedPoint.normalize();
        const surfaceRadius = 5.0;
        
        const endDistFromSurface = 0.05;
        const startDistFromSurface = this.finalLayerOffset + 0.0003;
        
        this.arcCamera.detachControl();
        this.camera.position = pickedDir.scale(surfaceRadius + startDistFromSurface);
        this.camera.setTarget(pickedDir.scale(surfaceRadius));
        this.camera.minZ = 0.000001;
        this.scene.activeCamera = this.camera;
        
        const zoomDuration = this.tripDuration * 0.348;
        let zoomElapsed = 0;
        
        this.onProgress("Ascending...");
        
        const ascendObserver = this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.engine.getDeltaTime() / 1000;
            zoomElapsed += dt;
            if (zoomElapsed > zoomDuration) zoomElapsed = zoomDuration;
            
            const progress = zoomElapsed / zoomDuration;
            // Reverse exponential: start close, pull away
            const currentDist = startDistFromSurface * Math.pow(endDistFromSurface / startDistFromSurface, progress);
            this.camera.position = pickedDir.scale(surfaceRadius + currentDist);
            this.camera.setTarget(pickedDir.scale(surfaceRadius));
            
            if (zoomElapsed >= zoomDuration) {
                this.scene.onBeforeRenderObservable.remove(ascendObserver);
                this.cleanupAtmosphericEffects();
                
                // Hand back to arc camera at pull-away orbit position
                this.arcCamera.target = Vector3.Zero();
                this.arcCamera.alpha = Math.atan2(pickedDir.z, pickedDir.x);
                this.arcCamera.beta = Math.acos(pickedDir.y);
                this.arcCamera.radius = 15;
                this.scene.activeCamera = this.arcCamera;
                this.arcCamera.attachControl(this.engine.getRenderingCanvas()!, true);
                
                this.onProgress("Ascent complete. Orbit to explore.");
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Instantly moves the arc camera to look directly at the picked point.
     * Useful for restoring a session state so the camera isn't in a default position.
     */
    public focusOnPickedPoint() {
        if (!this.pickedPoint) return;
        this.arcCamera.target = Vector3.Zero();
        this.arcCamera.alpha = Math.atan2(this.pickedPoint.z, this.pickedPoint.x);
        this.arcCamera.beta = Math.acos(this.pickedPoint.y / this.pickedPoint.length());
        this.arcCamera.radius = 15; // default orbit distance
    }

    /**
     * Updates the spacing of all current zoom layers in real-time.
     */
    public updateLayerSpacing(newScalar: number) {
        this.layerSpacingScalar = newScalar;
        if (this.zoomMeshes.length === 0 || this.layerBaseOffsets.length === 0) return;

        const baseRadius = 5.0;
        for (let i = 0; i < this.zoomMeshes.length; i++) {
            const mesh = this.zoomMeshes[i];
            const baseOffset = this.layerBaseOffsets[i];
            const oldTargetRadius = baseRadius + (baseOffset * 1.0); // radius if scalar was 1.0 (BAKED IN MESH)
            
            // Wait, the mesh was created with radius = baseRadius + (baseOffset * initialScalar).
            // No, the createSphericalCap function used 'radius' as the actual vertex distance from origin.
            // Let's check what 'radius' was when createSphericalCap was called.
            // In createZoomLayers, I changed it to:
            // spacing = baseSpacing * this.layerSpacingScalar;
            // radius = baseRadius + currentOffset;
            // AND I populated this.layerBaseOffsets[i] = currentBaseOffset.
            // So the radius used for the mesh was: baseRadius + (this.layerBaseOffsets[i] * creationScalar).
            // This is getting complicated because we don't store creationScalar.
            
            // Simpler: let's store the radius that the mesh was actually created with.
        }
    }
}
