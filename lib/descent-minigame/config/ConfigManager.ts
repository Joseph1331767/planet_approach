import { DescentMinigameConfig } from "./types";

export const DEFAULT_DESCENT_CONFIG: DescentMinigameConfig = {
    timings: {
        totalDurationMs: 8 * 60 * 1000, 
        orbitLaunchWindowPercent: 0.75,
    },
    turbulence: {
        leftHandSpawnMsRange: [3000, 6000],
        rightHandSpawnMsRange: [1000, 3000],
        penaltyScalarPerMiss: 0.01,
    },
    alarms: {
        chancePerMinute: 0.15,
    },
    voice: {
        intervalMs: 45000, 
        timeToAnswerMs: 8000,
        micDeviceId: "default",
        voiceThreshold: 0.5,
    },
    visuals: {
        shakeFreqScalar: 1.0,
        shakeVibrationAmp: 1.0,
        shakeTurbulenceAmp: 1.0,
        reentryVisualsAmp: 1.0,
        reentryPlasmaScale: 1.0,
        reentryEmberDensity: 1.0,
        reentryHazeIntensity: 1.0,
        letterSizeTap: 1.0,
        letterSizeHold: 1.5,
    },
    physics: {
        planetGravityGM: 3.986e14,
        babylonUnitInMeters: 1274200,
        timelapseMultiplier: 60,
    },
    ui: {
        terminalFontSize: 14,
        timerFontSize: 48,
        alarmFontSize: 32,
    }
};

type ConfigSubscriber = (config: DescentMinigameConfig) => void;

export class ConfigManager {
    private config: DescentMinigameConfig;
    private subscribers: Set<ConfigSubscriber> = new Set();
    private LOCAL_KEY = "minigame_dev_config";

    constructor(initialConfig?: DescentMinigameConfig) {
        this.config = initialConfig || { ...DEFAULT_DESCENT_CONFIG };
    }

    public async loadFromUrl(url: string | undefined): Promise<void> {
        // ALWAYS prioritize local dev tuning overrides!
        try {
            const cachedStr = localStorage.getItem(this.LOCAL_KEY);
            if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                this.updateConfig(parsed);
                console.log("[ConfigManager] Loaded DEV TUNING config from localStorage.");
                return;
            }
        } catch(e) {
            console.warn("Invalid cached config, falling back to URL or Defaults.");
        }

        if (!url) {
            this.updateConfig(DEFAULT_DESCENT_CONFIG);
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                this.updateConfig(DEFAULT_DESCENT_CONFIG);
                return;
            }
            const data = await response.json();
            this.updateConfig(data);
        } catch (e) {
            console.warn(`[ConfigManager] Failed to load config from ${url}. Using defaults.`);
            this.updateConfig(DEFAULT_DESCENT_CONFIG);
        }
    }

    public updateConfig(newConfigPartial: Partial<DescentMinigameConfig>): void {
        this.config = {
            timings: { ...this.config.timings, ...(newConfigPartial.timings || {}) },
            turbulence: { ...this.config.turbulence, ...(newConfigPartial.turbulence || {}) },
            alarms: { ...this.config.alarms, ...(newConfigPartial.alarms || {}) },
            voice: { ...this.config.voice, ...(newConfigPartial.voice || {}) },
            visuals: { ...this.config.visuals, ...(newConfigPartial.visuals || {}) },
            physics: { ...this.config.physics, ...(newConfigPartial.physics || {}) },
            ui: { ...this.config.ui, ...(newConfigPartial.ui || {}) },
        };
        this.notifySubscribers();
    }

    // Commits the current live configuration into LocalStorage for future sessions
    public commitToLocalStorage(): void {
        localStorage.setItem(this.LOCAL_KEY, JSON.stringify(this.config));
        console.log("[ConfigManager] Dev config committed to localStorage.", this.config);
    }
    
    // Clears the local override and re-fetches or resets
    public clearLocalStorage(): void {
        localStorage.removeItem(this.LOCAL_KEY);
    }

    public getConfig(): Readonly<DescentMinigameConfig> {
        return this.config;
    }

    public subscribe(callback: ConfigSubscriber): () => void {
        this.subscribers.add(callback);
        // Fire immediately upon subscription with current state
        callback(this.config);
        
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private notifySubscribers(): void {
        this.subscribers.forEach(cb => cb(this.config));
    }
}
