import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MinigameOrchestrator } from '../core/MinigameOrchestrator';
import { DescentPayload, DescentMinigameConfig } from '../config/types';
import { Download, Upload, Settings2, Play, AlertTriangle, RotateCcw, Save } from 'lucide-react';

interface DescentMinigameViewProps {
    images: string[];
    equiUrl: string | null;
    onClose: (score?: number) => void;
}

export function DescentMinigameView({ images, equiUrl, onClose }: DescentMinigameViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [result, setResult] = useState<number | null>(null);
    const orchestratorRef = useRef<MinigameOrchestrator | null>(null);

    // Pause & Overlay State
    const [isPaused, setIsPaused] = useState(false);
    const [showDevSettings, setShowDevSettings] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live Config State
    const [liveConfig, setLiveConfig] = useState<DescentMinigameConfig | null>(null);
    const [audioDevices, setAudioDevices] = useState<{deviceId: string, label: string}[]>([]);

    useEffect(() => {
        if (!showDevSettings) return;
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const mics = devices.filter(d => d.kind === 'audioinput');
            setAudioDevices(mics);
        }).catch(err => console.error(err));
    }, [showDevSettings]);

    // Boot Orchestrator
    useEffect(() => {
        if (!canvasRef.current) return;
        orchestratorRef.current = new MinigameOrchestrator(canvasRef.current);
        const payload: DescentPayload = {
            equirectangularMaps: images,
            targetBeaconGPS: { lat: 0, lon: 0 },
            configJsonUrl: "https://raw.githubusercontent.com/Joseph1331767/planet_approach/refs/heads/main/descent-config.json",
            assets: { dashboardGlbUrl: "" },
            equiUrl: equiUrl || undefined
        };
        
        let mounted = true;

        orchestratorRef.current.getConfigManager().subscribe((cfg) => {
            if (mounted) setLiveConfig({ ...cfg });
        });
        
        orchestratorRef.current.start(payload).then(score => {
            if (mounted) setResult(score);
        }).catch(err => {
            console.error(err);
            if (mounted) onClose();
        });

        return () => {
            mounted = false;
            if (orchestratorRef.current) {
                (orchestratorRef.current as any).end?.();
                orchestratorRef.current = null;
            }
        };
    }, [images, equiUrl, onClose]);

    // Handle Hardware Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Babylon from stealing events during dev settings
            if (showDevSettings && e.key !== 'Escape') {
                e.stopPropagation();
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                setIsPaused((prev) => {
                    const nextState = !prev;
                    orchestratorRef.current?.setPaused(nextState);
                    if (!nextState) setShowDevSettings(false); // Close modal when unpausing
                    return nextState;
                });
            }
        };
        // Use capture phase to intercept before Babylon binds it
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [showDevSettings]);

    const handleResume = () => {
        setIsPaused(false);
        setShowDevSettings(false);
        orchestratorRef.current?.setPaused(false);
    };

    const updateConfigPartial = (group: keyof DescentMinigameConfig, field: string, value: any) => {
        if (!liveConfig) return;
        const newGroupState = { ...liveConfig[group], [field]: value };
        const patch = { [group]: newGroupState } as any;
        orchestratorRef.current?.getConfigManager().updateConfig(patch);
    };

    const handleExportConfig = () => {
        if (!liveConfig) return;
        const blob = new Blob([JSON.stringify(liveConfig, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minigame-dev-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);
                orchestratorRef.current?.getConfigManager().updateConfig(content);
                orchestratorRef.current?.getConfigManager().commitToLocalStorage();
                alert("Config successfully imported & applied!");
            } catch (err) {
                alert("Error importing schema");
            }
        };
        reader.readAsText(file);
    };

    if (result !== null) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-8 absolute inset-0 z-[300]">
                <h2 className="text-4xl text-red-500 font-bold mb-4">Descent Completed</h2>
                <p className="text-2xl mb-8">Failure Scalar: {result.toFixed(3)}</p>
                <button onClick={() => onClose(result)} className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200">
                    Return to Orbit
                </button>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-[300] w-full h-full bg-black">
            <canvas ref={canvasRef} className="w-full h-full outline-none block" />
            
            {/* Pause Screen Overlay */}
            {isPaused && (
                <div className="absolute inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                    {!showDevSettings ? (
                        <div className="bg-black/80 border border-white/20 p-8 rounded-2xl flex flex-col items-center gap-4 w-80 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                            <h2 className="text-3xl font-bold text-white mb-4 tracking-widest text-[#33ff33]">PAUSED</h2>
                            
                            <button onClick={handleResume} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                <Play className="w-5 h-5" /> Resume Descent
                            </button>
                            
                            <button onClick={() => setShowDevSettings(true)} className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                <Settings2 className="w-5 h-5" /> Dev Settings
                            </button>
                            
                            <div className="w-full border-t border-white/10 my-2" />
                            
                            <button onClick={() => onClose()} className="w-full py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                <AlertTriangle className="w-5 h-5" /> Abort Simulation
                            </button>
                        </div>
                    ) : (
                        // Expansive Dev Settings Dropdown List Modal
                        <div className="bg-[#111] border border-white/20 rounded max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative font-sans" onKeyDown={(e) => e.stopPropagation()}>
                            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-black">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Settings2 className="w-5 h-5 text-indigo-400" /> Minigame Config
                                </h2>
                                <button onClick={() => setShowDevSettings(false)} className="text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                                    [ESC] Close
                                </button>
                            </div>

                            {liveConfig && (
                                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                                    {/* TIMINGS */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5 flex items-center gap-2">
                                            TIMINGS
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Total Minigame Duration (ms) <span className="text-gray-500 font-mono text-xs ml-2">({(liveConfig.timings.totalDurationMs/60000).toFixed(1)}m)</span></span>
                                                <input type="number" step="10000" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.timings.totalDurationMs} onChange={(e) => updateConfigPartial('timings', 'totalDurationMs', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Alignment Launch Window % <span className="text-gray-500 font-mono text-xs ml-2">({(liveConfig.timings.orbitLaunchWindowPercent*100).toFixed(0)}%)</span></span>
                                                <input type="range" min="0.1" max="0.95" step="0.05" className="w-32 accent-indigo-500"
                                                    value={liveConfig.timings.orbitLaunchWindowPercent} onChange={(e) => updateConfigPartial('timings', 'orbitLaunchWindowPercent', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* PHYSICS */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5 flex items-center gap-2">
                                            NEWTONIAN ORBIT PHYSICS
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Gravitational Parameter (GM)</span>
                                                <input type="number" step="1e13" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.physics.planetGravityGM} onChange={(e) => updateConfigPartial('physics', 'planetGravityGM', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Scale (Meters per Babylon Unit)</span>
                                                <input type="number" step="10000" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.physics.babylonUnitInMeters} onChange={(e) => updateConfigPartial('physics', 'babylonUnitInMeters', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Time-Lapse Speed Multiplier</span>
                                                <input type="number" step="10" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.physics.timelapseMultiplier} onChange={(e) => updateConfigPartial('physics', 'timelapseMultiplier', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* ALARMS */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5">
                                            ALARMS
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Base Spawn Chance (<span className="text-gray-500 font-mono text-xs ml-1">{(liveConfig.alarms.chancePerMinute*100).toFixed(1)}%/min</span>)</span>
                                                <input type="range" min="0" max="1" step="0.01" className="w-32 accent-red-500"
                                                    value={liveConfig.alarms.chancePerMinute} onChange={(e) => updateConfigPartial('alarms', 'chancePerMinute', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* TURBULENCE */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5">
                                            TURBULENCE
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Left Hand Spawn Range (ms)</span>
                                                <div className="flex gap-2">
                                                    <input type="number" step="100" className="bg-[#222] text-white p-1 rounded border border-white/10 w-20 font-mono text-sm" 
                                                        value={liveConfig.turbulence.leftHandSpawnMsRange[0]} onChange={(e) => updateConfigPartial('turbulence', 'leftHandSpawnMsRange', [Number(e.target.value), liveConfig.turbulence.leftHandSpawnMsRange[1]])} />
                                                    <span className="text-gray-600">-</span>
                                                    <input type="number" step="100" className="bg-[#222] text-white p-1 rounded border border-white/10 w-20 font-mono text-sm" 
                                                        value={liveConfig.turbulence.leftHandSpawnMsRange[1]} onChange={(e) => updateConfigPartial('turbulence', 'leftHandSpawnMsRange', [liveConfig.turbulence.leftHandSpawnMsRange[0], Number(e.target.value)])} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Right Hand Spawn Range (ms)</span>
                                                <div className="flex gap-2">
                                                    <input type="number" step="100" className="bg-[#222] text-white p-1 rounded border border-white/10 w-20 font-mono text-sm" 
                                                        value={liveConfig.turbulence.rightHandSpawnMsRange[0]} onChange={(e) => updateConfigPartial('turbulence', 'rightHandSpawnMsRange', [Number(e.target.value), liveConfig.turbulence.rightHandSpawnMsRange[1]])} />
                                                    <span className="text-gray-600">-</span>
                                                    <input type="number" step="100" className="bg-[#222] text-white p-1 rounded border border-white/10 w-20 font-mono text-sm" 
                                                        value={liveConfig.turbulence.rightHandSpawnMsRange[1]} onChange={(e) => updateConfigPartial('turbulence', 'rightHandSpawnMsRange', [liveConfig.turbulence.rightHandSpawnMsRange[0], Number(e.target.value)])} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Penalty Scalar Per Miss</span>
                                                <input type="number" step="0.01" max="1" min="0" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.turbulence.penaltyScalarPerMiss} onChange={(e) => updateConfigPartial('turbulence', 'penaltyScalarPerMiss', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* VOICE */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5">
                                            VOICE COMMS & AUDIO INPUT
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                                                <span className="text-sm text-gray-300">Microphone Device</span>
                                                <select className="bg-[#222] text-white p-2 rounded border border-white/10 text-sm max-w-[300px]"
                                                    value={liveConfig.voice.micDeviceId} onChange={(e) => updateConfigPartial('voice', 'micDeviceId', e.target.value)}>
                                                    <option value="default">System Default</option>
                                                    {audioDevices.map(d => (
                                                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone (${d.deviceId.slice(0,5)})`}</option>
                                                    ))}
                                                </select>
                                                <span className="text-xs text-yellow-500/80">Reboot minigame required to bind new device.</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Sync Interval (ms)</span>
                                                <input type="number" step="1000" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.voice.intervalMs} onChange={(e) => updateConfigPartial('voice', 'intervalMs', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Allowable Response Time (ms)</span>
                                                <input type="number" step="500" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.voice.timeToAnswerMs} onChange={(e) => updateConfigPartial('voice', 'timeToAnswerMs', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Voice Recognition Threshold</span>
                                                <input type="number" step="0.05" max="1" min="0" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.voice.voiceThreshold} onChange={(e) => updateConfigPartial('voice', 'voiceThreshold', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* VISUAL SCALARS */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5">
                                            VISUAL SCALARS & FONT
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Overall Shake Speed (Hz)</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.shakeFreqScalar} onChange={(e) => updateConfigPartial('visuals', 'shakeFreqScalar', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Vibration Amplitude (Stutter)</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.shakeVibrationAmp} onChange={(e) => updateConfigPartial('visuals', 'shakeVibrationAmp', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Turbulence Amplitude (Sway)</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.shakeTurbulenceAmp} onChange={(e) => updateConfigPartial('visuals', 'shakeTurbulenceAmp', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Re-Entry Base Brightness</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.reentryVisualsAmp} onChange={(e) => updateConfigPartial('visuals', 'reentryVisualsAmp', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Re-Entry Plasma Depth Scale</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.reentryPlasmaScale} onChange={(e) => updateConfigPartial('visuals', 'reentryPlasmaScale', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Re-Entry Ember Density</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.reentryEmberDensity} onChange={(e) => updateConfigPartial('visuals', 'reentryEmberDensity', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Re-Entry Wind/Haze Intensity</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.reentryHazeIntensity} onChange={(e) => updateConfigPartial('visuals', 'reentryHazeIntensity', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                    {/* UI SCALARS */}
                                    <details open className="mb-4 bg-black/40 border border-white/10 rounded">
                                        <summary className="px-4 py-2 font-bold cursor-pointer hover:bg-white/5 border-b border-white/5">
                                            UI SCALARS & FONT SIZES
                                        </summary>
                                        <div className="p-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Terminal Output Font Size (px)</span>
                                                <input type="number" step="1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.ui.terminalFontSize} onChange={(e) => updateConfigPartial('ui', 'terminalFontSize', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Base Countdown Timer Size (px)</span>
                                                <input type="number" step="1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.ui.timerFontSize} onChange={(e) => updateConfigPartial('ui', 'timerFontSize', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Master Alarm Icon & Font Size (px)</span>
                                                <input type="number" step="1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.ui.alarmFontSize} onChange={(e) => updateConfigPartial('ui', 'alarmFontSize', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Typography Scale (TAP/PRESS)</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.letterSizeTap} onChange={(e) => updateConfigPartial('visuals', 'letterSizeTap', Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-300">Typography Scale (HIT/HOLD)</span>
                                                <input type="number" step="0.1" className="bg-[#222] text-white p-1 rounded border border-white/10 w-24 font-mono text-sm"
                                                    value={liveConfig.visuals.letterSizeHold} onChange={(e) => updateConfigPartial('visuals', 'letterSizeHold', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </details>

                                </div>
                            )}

                            <div className="px-4 py-3 border-t border-white/10 bg-black flex justify-between items-center">
                                <div className="flex gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center gap-2 text-sm">
                                        <Upload className="w-4 h-4" /> Import JSON
                                    </button>
                                    <button onClick={handleExportConfig} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center gap-2 text-sm">
                                        <Download className="w-4 h-4" /> Export JSON
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleImportConfig} accept=".json" className="hidden" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        orchestratorRef.current?.getConfigManager().clearLocalStorage();
                                        orchestratorRef.current?.getConfigManager().loadFromUrl(undefined);
                                    }} className="px-3 py-1.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded flex items-center gap-2 text-sm font-bold">
                                        <RotateCcw className="w-4 h-4" /> Reset DB
                                    </button>
                                    <button onClick={() => {
                                        orchestratorRef.current?.getConfigManager().commitToLocalStorage();
                                        alert("Configuration committed to Local Persistence DB.");
                                    }} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-2 text-sm font-bold shadow-lg">
                                        <Save className="w-4 h-4" /> Save Setup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
