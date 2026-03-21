export interface DescentMinigameConfig {
    timings: {
        totalDurationMs: number;
        orbitLaunchWindowPercent: number; // e.g. 0.75
    };
    turbulence: {
        leftHandSpawnMsRange: [number, number];
        rightHandSpawnMsRange: [number, number];
        penaltyScalarPerMiss: number;
    };
    alarms: {
        chancePerMinute: number;
    };
    voice: {
        intervalMs: number;
        timeToAnswerMs: number;
        micDeviceId: string;     // Added
        voiceThreshold: number;  // Added
    };
    visuals: {
        shakeFreqScalar: number;
        shakeVibrationAmp: number;
        shakeTurbulenceAmp: number;
        reentryVisualsAmp: number;
        reentryPlasmaScale: number; // Added
        reentryEmberDensity: number; // Added
        reentryHazeIntensity: number; // Added
        letterSizeTap: number;
        letterSizeHold: number;
    };
    physics: {                   // Added
        planetGravityGM: number;
        babylonUnitInMeters: number;
        timelapseMultiplier: number;
    };
    ui: {                        // Added
        terminalFontSize: number;
        timerFontSize: number;
        alarmFontSize: number;
    };
}

export interface DescentPayload {
    equirectangularMaps: string[]; // High-res GenAI slices
    targetBeaconGPS: { lat: number, lon: number };
    configJsonUrl: string; // Remote URL to dev-tunable settings
    assets: {
        dashboardGlbUrl: string; 
        typographyGlbUrl?: string; 
    };
    equiUrl?: string; 
    simPhysics?: {
        planetGravityGM: number;
        babylonUnitInMeters: number;
    };
}
