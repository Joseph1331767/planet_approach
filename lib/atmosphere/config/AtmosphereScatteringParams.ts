import { Vector3 } from "@babylonjs/core";

export class AtmosphereScatteringParams {
    /**
     * The physical Rayleigh scattering coefficients mapped to (R, G, B) representing wavelength falloff.
     * Earth default is roughly (5.8e-3, 13.5e-3, 33.1e-3) km^-1. 
     * Stored here as a base vector to be multiplied by the UI density scalar.
     */
    public rayleighScattering = new Vector3(0.0058, 0.0135, 0.0331);
    
    /**
     * Mie scattering coefficient (affects the "halo" around the sun).
     * Earth default is roughly 3.996e-3 km^-1.
     */
    public mieScattering = 0.003996;
    
    /**
     * Mie extinction (scattering + absorption). Usually ~1.11 * mieScattering.
     */
    public mieExtinction = 0.00444;
    
    /**
     * The Mie asymmetry factor (g). Controls how strongly forward-scattering the aerosols are.
     * Typical Earth range is [0.76, 0.9].
     */
    public mieAsymmetry = 0.8;
    
    // Ozone absorption mapping (Earth defaults)
    public ozoneAbsorption = new Vector3(0.000000650, 0.000001881, 0.000000085);

    /**
     * Apply shifting based on UI Config inputs.
     * We accept multipliers against the Earth baseline to allow for easy UI tweaking while preserving valid bounds.
     */
    public updateFromConfig(rayleighMultipliers: [number, number, number], mieDensityScale: number, asymmetry: number) {
        this.rayleighScattering.copyFromFloats(
            0.0058 * Math.max(0.01, rayleighMultipliers[0]),
            0.0135 * Math.max(0.01, rayleighMultipliers[1]),
            0.0331 * Math.max(0.01, rayleighMultipliers[2])
        );
        this.mieScattering = 0.003996 * Math.max(0.01, mieDensityScale);
        this.mieExtinction = 0.00444 * Math.max(0.01, mieDensityScale);
        this.mieAsymmetry = Math.max(0.0, Math.min(0.999, asymmetry));
    }
}
