"use client";

import { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { PlanetEngine } from '@/lib/PlanetEngine';
import { Vector3 } from '@babylonjs/core';
import { Loader2, Key, Download, Upload, History, Play, ArrowUp, Info, Eye, EyeOff, Layers, Globe, Activity } from 'lucide-react';
import { zoomDB, ZoomSession } from '@/lib/db';
import { DescentMinigameView } from '@/lib/descent-minigame/components/DescentMinigameView';

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<string>("Ready");
    const [isGenerating, setIsGenerating] = useState(false);
    const engineRef = useRef<PlanetEngine | null>(null);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [customKey, setCustomKey] = useState("");
    
    const defaultBasePrompt = `Equirectangular UV texture map of a spherical planet (2:1 aspect ratio), seamless horizontal wrap.

Orthographic top-down surface capture, not a perspective view. The entire image represents the full planetary surface unwrapped to latitude-longitude projection.

No background, no stars, no sky, no lighting direction, no shadows from space. The image must be flat and uniform, like a GIS or satellite texture map.

Surface details only:
- Large-scale continents and oceans with realistic planetary proportions
- Coherent tectonic-style landmasses (no tiny scattered islands unless secondary)
- Natural coastline variation (bays, peninsulas)
- Ocean color variation (depth gradients, subtle currents)
- Terrain variation: deserts, forests, rocky regions, ice caps near poles
- Smooth transitions between biomes

Style:
- Photorealistic satellite map
- Physically plausible geography
- No stylization, no artistic brush strokes

Constraints:
- No side view, no horizon, no curvature shading
- No clouds, no atmosphere, no stars
- No lighting gradients across the globe
- Seamless left-right tiling
- Polar regions correctly represented (top = north pole, bottom = south pole)

Resolution: high detail, texture-quality`;

    const defaultUpscalePrompt = `**Task:** Upscale a low-resolution image of an alien planet surface. **Visual description:** An aerial view at the scale of {targetKm} km × {targetKm} km. The landscape is an uninhabited alien planet. We will keep the colors and visible structure the same. **Instructions:** Upscale the low-resolution image.`;

    const [basePrompt, setBasePrompt] = useState(defaultBasePrompt);
    const [upscalePrompt, setUpscalePrompt] = useState(defaultUpscalePrompt);
    
    // High Quality "Nano Banana" 4K Model toggles
    const [useHighQuality, setUseHighQuality] = useState(false);
    const [highQualityModel, setHighQualityModel] = useState("gemini-3-pro-image-preview");

    // Dev settings for Camera Shake
    const [shakeFreqScalar, setShakeFreqScalar] = useState(1.0);
    const [shakeVibrationAmp, setShakeVibrationAmp] = useState(1.0);
    const [shakeTurbulenceAmp, setShakeTurbulenceAmp] = useState(1.0);
    const [reentryVisualsAmp, setReentryVisualsAmp] = useState(1.0);

    const [cachedSession, setCachedSession] = useState<ZoomSession | null>(null);
    const [isApproaching, setIsApproaching] = useState(false);
    const [tripMinutes, setTripMinutes] = useState(30);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAssetPanel, setShowAssetPanel] = useState(false);
    const [layerVisibility, setLayerVisibility] = useState<boolean[]>([]);
    const [planetVisible, setPlanetVisible] = useState(true);
    const [layerSpacingScalar, setLayerSpacingScalar] = useState(1.0);
    const [isAscending, setIsAscending] = useState(false);
    
    // Minigame State
    const [showMinigame, setShowMinigame] = useState(false);
    const [lastMinigameScore, setLastMinigameScore] = useState<number | null>(null);

    const isZoomSession = (obj: any): obj is ZoomSession => {
        return obj && typeof obj === 'object' && Array.isArray(obj.images);
    };

    useEffect(() => {
        const savedKey = localStorage.getItem('customGeminiKey');
        if (savedKey) setCustomKey(savedKey);

        const savedBasePrompt = localStorage.getItem('customBasePrompt');
        if (savedBasePrompt) setBasePrompt(savedBasePrompt);

        const savedUpscalePrompt = localStorage.getItem('customUpscalePrompt');
        if (savedUpscalePrompt) setUpscalePrompt(savedUpscalePrompt);

        const savedHQ = localStorage.getItem('useHighQuality');
        if (savedHQ) setUseHighQuality(savedHQ === 'true');

        const savedHQModel = localStorage.getItem('highQualityModel');
        if (savedHQModel) setHighQualityModel(savedHQModel);

        const savedFreq = localStorage.getItem('shakeFreqScalar');
        if (savedFreq) setShakeFreqScalar(parseFloat(savedFreq));

        const savedVib = localStorage.getItem('shakeVibrationAmp');
        if (savedVib) setShakeVibrationAmp(parseFloat(savedVib));

        const savedTurb = localStorage.getItem('shakeTurbulenceAmp');
        if (savedTurb) setShakeTurbulenceAmp(parseFloat(savedTurb));

        const savedVisuals = localStorage.getItem('reentryVisualsAmp');
        if (savedVisuals) setReentryVisualsAmp(parseFloat(savedVisuals));

        const savedSpacing = localStorage.getItem('customLayerSpacing');
        if (savedSpacing) setLayerSpacingScalar(parseFloat(savedSpacing));

        // Load last session from IndexedDB
        zoomDB.getLastSession().then(session => {
            if (session) {
                if (isZoomSession(session)) {
                    setCachedSession(session);
                } else if (Array.isArray(session)) {
                    // Migrate old format
                    setCachedSession({
                        images: session,
                        equiUrl: null,
                        pickedPoint: null
                    });
                }
            }
        });
    }, []);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.tripDuration = tripMinutes * 60;
        }
    }, [tripMinutes]);

    const handleSelectKey = () => {
        setShowKeyModal(true);
    };

    const handleSaveSettings = () => {
        const trimmedKey = customKey.trim();
        localStorage.setItem('customGeminiKey', trimmedKey);
        localStorage.setItem('customBasePrompt', basePrompt);
        localStorage.setItem('customUpscalePrompt', upscalePrompt);
        localStorage.setItem('useHighQuality', useHighQuality.toString());
        localStorage.setItem('highQualityModel', highQualityModel);
        
        localStorage.setItem('shakeFreqScalar', shakeFreqScalar.toString());
        localStorage.setItem('shakeVibrationAmp', shakeVibrationAmp.toString());
        localStorage.setItem('shakeTurbulenceAmp', shakeTurbulenceAmp.toString());
        localStorage.setItem('reentryVisualsAmp', reentryVisualsAmp.toString());
        
        setCustomKey(trimmedKey);
        setShowKeyModal(false);
        if (engineRef.current) {
            engineRef.current.customApiKey = trimmedKey;
            engineRef.current.upscalePromptTemplate = upscalePrompt;
            engineRef.current.layerSpacingScalar = layerSpacingScalar;
            engineRef.current.useHighQuality = useHighQuality;
            engineRef.current.highQualityModel = highQualityModel;
            engineRef.current.shakeFreqScalar = shakeFreqScalar;
            engineRef.current.shakeVibrationAmp = shakeVibrationAmp;
            engineRef.current.shakeTurbulenceAmp = shakeTurbulenceAmp;
            engineRef.current.reentryVisualsAmp = reentryVisualsAmp;
        }
        localStorage.setItem('customLayerSpacing', layerSpacingScalar.toString());
    };

    const handleExport = () => {
        const images = engineRef.current?.zoomImages || cachedSession?.images;
        const equiUrl = engineRef.current?.equiUrl || cachedSession?.equiUrl;
        const pickedPoint = engineRef.current?.pickedPoint || cachedSession?.pickedPoint;
        
        if (!images) return;
        
        const session: ZoomSession = {
            images,
            equiUrl: equiUrl || null,
            pickedPoint: pickedPoint ? { x: pickedPoint.x, y: pickedPoint.y, z: pickedPoint.z } : null
        };
        
        const blob = new Blob([JSON.stringify(session)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planet-zoom-session-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);
                let session: ZoomSession | null = null;
                
                if (isZoomSession(content)) {
                    session = content;
                } else if (Array.isArray(content)) {
                    session = { images: content, equiUrl: null, pickedPoint: null };
                }

                if (session) {
                    setCachedSession(session);
                    await zoomDB.saveSession(session);
                    
                    if (!engineRef.current && canvasRef.current) {
                        engineRef.current = new PlanetEngine(canvasRef.current, customKey, (msg) => {
                            setStatus(msg);
                        }, (images) => {
                            if (engineRef.current) {
                                const newSession: ZoomSession = {
                                    images,
                                    equiUrl: engineRef.current.equiUrl,
                                    pickedPoint: engineRef.current.pickedPoint ? { 
                                        x: engineRef.current.pickedPoint.x, 
                                        y: engineRef.current.pickedPoint.y, 
                                        z: engineRef.current.pickedPoint.z 
                                    } : null
                                };
                                setCachedSession(newSession);
                                zoomDB.saveSession(newSession);
                            }
                        });
                        engineRef.current.tripDuration = tripMinutes * 60;
                        engineRef.current.useHighQuality = useHighQuality;
                        engineRef.current.highQualityModel = highQualityModel;
                        engineRef.current.shakeFreqScalar = shakeFreqScalar;
                        engineRef.current.shakeVibrationAmp = shakeVibrationAmp;
                        engineRef.current.shakeTurbulenceAmp = shakeTurbulenceAmp;
                        engineRef.current.reentryVisualsAmp = reentryVisualsAmp;
                    }

                    if (engineRef.current) {
                        engineRef.current.zoomImages = session.images;
                        await engineRef.current.createPlanet(session.equiUrl || null);
                        
                        if (session.pickedPoint) {
                            engineRef.current.pickedPoint = new Vector3(session.pickedPoint.x, session.pickedPoint.y, session.pickedPoint.z);
                            engineRef.current.focusOnPickedPoint();
                        } else {
                            // Legacy session formatting fallback
                            engineRef.current.pickedPoint = new Vector3(0, 0, -5);
                        }
                        
                        // Create zoom layers immediately so they're visible
                        await engineRef.current.createZoomLayers(session.images);
                    }
                    setStatus("Session imported. Orbit to explore, then click 'Approach'.");
                }
            } catch (err) {
                console.error("Failed to import images:", err);
                setStatus("Error: Invalid import file.");
            }
        };
        reader.readAsText(file);
    };

    const handleLoadLast = async () => {
        if (!cachedSession || !canvasRef.current) return;

        setIsGenerating(true);
        setStatus("Loading cached sequence...");

        try {
            if (!engineRef.current) {
                engineRef.current = new PlanetEngine(canvasRef.current, customKey, (msg) => {
                    setStatus(msg);
                }, (images) => {
                    if (engineRef.current) {
                        const newSession: ZoomSession = {
                            images,
                            equiUrl: engineRef.current.equiUrl,
                            pickedPoint: engineRef.current.pickedPoint ? { 
                                x: engineRef.current.pickedPoint.x, 
                                y: engineRef.current.pickedPoint.y, 
                                z: engineRef.current.pickedPoint.z 
                            } : null
                        };
                        setCachedSession(newSession);
                        zoomDB.saveSession(newSession);
                    }
                });
                engineRef.current.tripDuration = tripMinutes * 60;
                engineRef.current.useHighQuality = useHighQuality;
                engineRef.current.highQualityModel = highQualityModel;
                engineRef.current.shakeFreqScalar = shakeFreqScalar;
                engineRef.current.shakeVibrationAmp = shakeVibrationAmp;
                engineRef.current.shakeTurbulenceAmp = shakeTurbulenceAmp;
                engineRef.current.reentryVisualsAmp = reentryVisualsAmp;
            }
            
            engineRef.current.zoomImages = cachedSession.images;
            await engineRef.current.createPlanet(cachedSession.equiUrl || null);
            
            if (cachedSession.pickedPoint) {
                engineRef.current.pickedPoint = new Vector3(cachedSession.pickedPoint.x, cachedSession.pickedPoint.y, cachedSession.pickedPoint.z);
                engineRef.current.focusOnPickedPoint();
            } else {
                // Legacy session formatting fallback
                engineRef.current.pickedPoint = new Vector3(0, 0, -5);
            }
            
            // Create zoom layers immediately so they're visible
            await engineRef.current.createZoomLayers(cachedSession.images);
            
            setStatus("Session loaded. Orbit to explore, then click 'Approach'.");
        } catch (error: any) {
            console.error(error);
            setStatus("Error loading session: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApproach = async () => {
        if (!engineRef.current) return;
        setIsApproaching(true);
        setStatus("Approaching...");
        await engineRef.current.approach(() => {
            setIsApproaching(false);
        });
    };

    const handleAscend = () => {
        if (!engineRef.current) return;
        setIsAscending(true);
        setStatus("Ascending...");
        engineRef.current.ascend(() => {
            setIsAscending(false);
        });
    };

    const handleStart = async () => {
        if (!canvasRef.current) return;

        setIsGenerating(true);
        setStatus("Generating initial planet...");

        try {
            if (!customKey.trim()) {
                setStatus("Error: You must enter your API key first.");
                setShowKeyModal(true);
                setIsGenerating(false);
                return;
            }

            const apiKeyToUse = customKey.trim();
            let initialImageUrl = "";

            try {
                const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
                const modelToUse = useHighQuality ? highQualityModel : 'gemini-2.5-flash-image';
                
                const response = await ai.models.generateContent({
                    model: modelToUse,
                    contents: { parts: [{ text: basePrompt }] },
                    config: { imageConfig: { aspectRatio: "16:9" } }
                });
                
                if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
                    throw new Error("Invalid or empty response from Gemini API");
                }
                
                let base64 = "";
                let mimeType: string = "image/jpeg";
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64 = part.inlineData.data as string;
                        const m = part.inlineData.mimeType as string | undefined;
                        if (m) mimeType = m as string;
                        break;
                    }
                }
                
                if (!base64) throw new Error("No image data found");
                initialImageUrl = `data:${mimeType};base64,${base64}`;
            } catch (err: any) {
                console.error("API Error:", err);
                setStatus("Error generating planet: " + (err.message || "Unknown error"));
                setIsGenerating(false);
                return;
            }

            if (!engineRef.current) {
                engineRef.current = new PlanetEngine(canvasRef.current, apiKeyToUse, (msg) => setStatus(msg), (images) => {
                    if (engineRef.current) {
                        const sess: ZoomSession = {
                            images,
                            equiUrl: engineRef.current.equiUrl,
                            pickedPoint: engineRef.current.pickedPoint ? { x: engineRef.current.pickedPoint.x, y: engineRef.current.pickedPoint.y, z: engineRef.current.pickedPoint.z } : null
                        };
                        setCachedSession(sess);
                        zoomDB.saveSession(sess);
                    }
                });
                engineRef.current.tripDuration = tripMinutes * 60;
                engineRef.current.useHighQuality = useHighQuality;
                engineRef.current.highQualityModel = highQualityModel;
                engineRef.current.shakeFreqScalar = shakeFreqScalar;
                engineRef.current.shakeVibrationAmp = shakeVibrationAmp;
                engineRef.current.shakeTurbulenceAmp = shakeTurbulenceAmp;
                engineRef.current.reentryVisualsAmp = reentryVisualsAmp;
            } else {
                engineRef.current.customApiKey = apiKeyToUse;
                engineRef.current.useHighQuality = useHighQuality;
                engineRef.current.highQualityModel = highQualityModel;
                engineRef.current.shakeFreqScalar = shakeFreqScalar;
                engineRef.current.shakeVibrationAmp = shakeVibrationAmp;
                engineRef.current.shakeTurbulenceAmp = shakeTurbulenceAmp;
                engineRef.current.reentryVisualsAmp = reentryVisualsAmp;
            }

            await engineRef.current.createPlanet(initialImageUrl);
            
        } catch (error: any) {
            console.error(error);
            setStatus("Error: " + error.message);
        } finally {
            setIsGenerating(false);
            if (engineRef.current && engineRef.current.zoomImages.length > 0) {
                const session: ZoomSession = {
                    images: engineRef.current.zoomImages,
                    equiUrl: engineRef.current.equiUrl,
                    pickedPoint: engineRef.current.pickedPoint ? { x: engineRef.current.pickedPoint.x, y: engineRef.current.pickedPoint.y, z: engineRef.current.pickedPoint.z } : null
                };
                setCachedSession(session);
                zoomDB.saveSession(session);
            }
        }
    };

    return (
        <main className="relative w-full h-screen bg-black text-white overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full outline-none" />
            
            <button 
                onClick={handleSelectKey} 
                className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors pointer-events-auto z-50 flex items-center gap-2" 
            >
                <Key className={`w-5 h-5 ${customKey ? 'text-green-400' : 'text-white/70'}`} />
                {customKey && <span className="text-xs font-medium text-green-400 pr-1">Key Active</span>}
            </button>

            <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col items-center pointer-events-auto z-40 shadow-xl">
                <label className="text-white/80 text-xs font-bold mb-4 tracking-wider text-center">DESCENT<br/>TIME</label>
                <div className="h-48 flex items-center justify-center mb-4">
                    <input 
                        type="range" 
                        min="1" 
                        max="30" 
                        step="1"
                        value={tripMinutes}
                        onChange={(e) => setTripMinutes(parseInt(e.target.value))}
                        className="w-1 h-full appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-ns-resize rotate-180"
                        style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' } as any}
                    />
                </div>
                <span className="text-indigo-400 font-bold text-lg">{tripMinutes}</span>
                <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Mins</span>
            </div>

            <div className="absolute top-0 left-0 w-full p-6 flex flex-col items-center pointer-events-none z-40">
                <h1 className="text-4xl font-bold tracking-tight mb-2 text-white/90 drop-shadow-lg text-center">Infinite Zoom</h1>
                <p className="text-white/70 mb-6 drop-shadow-md text-center">Curved 3D Planet Descent</p>
                
                <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col items-center pointer-events-auto w-full max-w-xs shadow-xl">
                    {cachedSession && cachedSession.images && cachedSession.images.length > 0 && !isGenerating && !isApproaching && !isAscending && (
                        <div className="flex flex-col gap-4 w-full mb-4">
                            <div className="flex gap-2 w-full">
                                <button onClick={handleApproach} className="flex-1 px-4 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 scale-105 active:scale-100">
                                    <Play className="w-5 h-5 fill-current" />
                                    Approach
                                </button>
                                <button onClick={() => setShowMinigame(true)} className="flex-1 px-4 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 scale-105 active:scale-100">
                                    <Activity className="w-5 h-5" />
                                    Minigame
                                </button>
                            </div>
                            <div className="flex gap-2 w-full">
                                <button onClick={handleAscend} className="flex-1 px-4 py-3 bg-zinc-700 text-white font-bold rounded-xl hover:bg-zinc-600 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg">
                                    <ArrowUp className="w-5 h-5" />
                                    Ascend
                                </button>
                            </div>
                            {lastMinigameScore !== null && (
                                <div className="text-center text-xs text-red-400 font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                    Last Drop Scalar: {lastMinigameScore.toFixed(3)}
                                </div>
                            )}
                            <button onClick={handleLoadLast} className="w-full px-4 py-2 bg-indigo-900/40 text-indigo-200 text-xs font-semibold rounded-lg hover:bg-indigo-900/60 transition-colors border border-indigo-500/20 mt-2">
                                Re-Sync Session
                            </button>
                        </div>
                    )}

                    {(isApproaching || isAscending) && (
                        <div className="flex items-center gap-3 mb-4">
                            <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                            <span className="text-sm font-medium text-white/90 text-center">{status}</span>
                        </div>
                    )}

                    {!engineRef.current && !isGenerating ? (
                        <button onClick={handleStart} className={`w-full px-6 py-3 ${cachedSession ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-black hover:bg-white/90'} font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md`}>
                            <Play className="w-4 h-4" />
                            {cachedSession ? "Generate New Planet" : "Generate Planet"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            {(!status.includes("explore") && !status.includes("Zoom Ready") && isGenerating) && (
                                <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                            )}
                            <span className="text-sm font-medium text-white/90 text-center">{status}</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 flex gap-2 pointer-events-auto shadow-lg">
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-zinc-800 text-white text-xs font-semibold rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> Import
                    </button>
                    <button onClick={handleExport} disabled={!cachedSession && (!engineRef.current || engineRef.current.zoomImages.length === 0)} className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${(cachedSession || (engineRef.current && engineRef.current.zoomImages.length > 0)) ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}>
                        <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </div>
            </div>

            {/* Asset Layer Debug Panel */}
            {cachedSession && cachedSession.images && cachedSession.images.length > 0 && (
                <div className={`absolute left-0 top-0 h-full z-40 flex pointer-events-auto transition-transform duration-300 ${showAssetPanel ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'}`}>
                    {/* Panel content */}
                    <div className="w-56 h-full bg-black/80 backdrop-blur-md border-r border-white/10 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-white/10 flex items-center justify-between">
                            <span className="text-xs font-bold text-white/80 tracking-wider uppercase">Layers</span>
                            <span className="text-[10px] text-white/40">{cachedSession.images.length} items</span>
                        </div>
                        
                        {/* Planet toggle */}
                        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    if (engineRef.current) {
                                        const nowVisible = engineRef.current.togglePlanetVisibility();
                                        setPlanetVisible(nowVisible);
                                    }
                                }}
                                className={`p-1 rounded transition-colors ${planetVisible ? 'text-green-400 hover:text-green-300' : 'text-red-400/60 hover:text-red-300'}`}
                            >
                                {planetVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <Globe className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-white/70 font-medium">Planet Sphere</span>
                        </div>

                        {/* Scrollable layer list */}
                        <div className="flex-1 overflow-y-auto">
                            {(engineRef.current?.zoomImages || cachedSession.images).map((img, i) => {
                                const isVisible = layerVisibility[i] !== undefined ? layerVisibility[i] : true;
                                return (
                                    <div key={i} className={`px-3 py-2 border-b border-white/5 flex items-center gap-2 hover:bg-white/5 transition-colors ${!isVisible ? 'opacity-40' : ''}`}>
                                        <button 
                                            onClick={() => {
                                                if (engineRef.current) {
                                                    const nowVisible = engineRef.current.toggleLayerVisibility(i);
                                                    setLayerVisibility(prev => {
                                                        const next = [...prev];
                                                        next[i] = nowVisible;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`p-1 rounded transition-colors flex-shrink-0 ${isVisible ? 'text-green-400 hover:text-green-300' : 'text-red-400/60 hover:text-red-300'}`}
                                        >
                                            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        </button>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={img} 
                                            alt={`Layer ${i}`} 
                                            className="w-10 h-10 rounded object-cover border border-white/10 flex-shrink-0" 
                                        />
                                        <span className="text-[11px] text-white/60 font-mono">L{i}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab toggle button */}
                    <button 
                        onClick={() => setShowAssetPanel(!showAssetPanel)} 
                        className="self-center ml-0 w-10 h-20 bg-black/70 backdrop-blur-md border border-l-0 border-white/10 rounded-r-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <Layers className="w-4 h-4 text-white/70" />
                    </button>
                </div>
            )}


            {showKeyModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto p-4">
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-white mb-2">Settings & Prompts</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Gemini API Key</label>
                            <input type="password" value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-white/50" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Base Planet Prompt</label>
                            <textarea 
                                value={basePrompt} 
                                onChange={(e) => setBasePrompt(e.target.value)} 
                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-white/50 h-32 text-sm" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Upscale Prompt Template (use {'{targetKm}'} for scale)</label>
                            <textarea 
                                value={upscalePrompt} 
                                onChange={(e) => setUpscalePrompt(e.target.value)} 
                                className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-white/50 h-24 text-sm" 
                            />
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer group" onClick={(e) => { e.preventDefault(); setUseHighQuality(!useHighQuality); }}>
                                <div className={`relative w-12 h-6 rounded-full transition-colors flex items-center ${useHighQuality ? 'bg-indigo-500' : 'bg-black border border-white/20'}`}>
                                    <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform ${useHighQuality ? 'translate-x-7' : 'translate-x-1'}`} />
                                </div>
                                <span className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">Use "Nano Banana" 4K (High Quality Model)</span>
                            </label>
                            
                            {useHighQuality && (
                                <div className="pl-14">
                                    <label className="block text-xs font-medium text-white/50 mb-1">Model String</label>
                                    <input 
                                        type="text" 
                                        value={highQualityModel} 
                                        onChange={(e) => setHighQualityModel(e.target.value)} 
                                        className="w-full bg-black border border-indigo-500/30 rounded-lg p-2.5 text-indigo-100 text-sm focus:outline-none focus:border-indigo-500" 
                                        placeholder="gemini-3-pro-image-preview"
                                    />
                                    <p className="text-[10px] text-white/30 mt-1">Defaults to the highest quality Google image model.</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">
                                Layer Spacing Scalar — <span className="text-indigo-400 font-bold">{layerSpacingScalar.toFixed(1)}x</span>
                                <span className="text-white/40 text-xs ml-2">(bigger = more gap between layers, helps Z-fighting)</span>
                            </label>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="20" 
                                step="0.5"
                                value={layerSpacingScalar}
                                onChange={(e) => setLayerSpacingScalar(parseFloat(e.target.value))}
                                className="w-full accent-indigo-400"
                            />
                            <div className="flex justify-between text-xs text-white/30 mt-1">
                                <span>0.5x tight</span>
                                <span>20x wide</span>
                            </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-4">
                            <h3 className="text-sm font-bold text-white/90 border-b border-white/10 pb-2">Reentry Effects Dev Settings</h3>
                            
                            <div>
                                <label className="flex justify-between text-xs font-medium text-white/70 mb-1">
                                    <span>Visual Shader Intensity</span>
                                    <span className="text-orange-400 font-bold">{reentryVisualsAmp.toFixed(2)}x</span>
                                </label>
                                <input type="range" min="0" max="3" step="0.1" value={reentryVisualsAmp} onChange={(e) => setReentryVisualsAmp(parseFloat(e.target.value))} className="w-full accent-orange-400" />
                            </div>

                            <div>
                                <label className="flex justify-between text-xs font-medium text-white/70 mb-1">
                                    <span>Shake Frequency / Speed Multiplier</span>
                                    <span className="text-orange-400 font-bold">{shakeFreqScalar.toFixed(2)}x</span>
                                </label>
                                <input type="range" min="0.1" max="5" step="0.1" value={shakeFreqScalar} onChange={(e) => setShakeFreqScalar(parseFloat(e.target.value))} className="w-full accent-orange-400" />
                            </div>

                            <div>
                                <label className="flex justify-between text-xs font-medium text-white/70 mb-1">
                                    <span>High-Frequency Vibration Amplitude</span>
                                    <span className="text-orange-400 font-bold">{shakeVibrationAmp.toFixed(2)}x</span>
                                </label>
                                <input type="range" min="0" max="5" step="0.1" value={shakeVibrationAmp} onChange={(e) => setShakeVibrationAmp(parseFloat(e.target.value))} className="w-full accent-orange-400" />
                            </div>

                            <div>
                                <label className="flex justify-between text-xs font-medium text-white/70 mb-1">
                                    <span>Low-Frequency Turbulence Amplitude</span>
                                    <span className="text-orange-400 font-bold">{shakeTurbulenceAmp.toFixed(2)}x</span>
                                </label>
                                <input type="range" min="0" max="10" step="0.1" value={shakeTurbulenceAmp} onChange={(e) => setShakeTurbulenceAmp(parseFloat(e.target.value))} className="w-full accent-orange-400" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowKeyModal(false)} className="px-5 py-2.5 rounded-lg text-white/70 hover:bg-white/5 transition-colors font-medium">Cancel</button>
                            <button onClick={handleSaveSettings} className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium">Save Settings</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showMinigame && (
                <DescentMinigameView 
                    images={engineRef.current?.zoomImages || cachedSession?.images || []}
                    equiUrl={engineRef.current?.equiUrl || cachedSession?.equiUrl || null}
                    onClose={(score) => {
                        setShowMinigame(false);
                        if (score !== undefined) setLastMinigameScore(score);
                    }}
                />
            )}
        </main>
    );
}
