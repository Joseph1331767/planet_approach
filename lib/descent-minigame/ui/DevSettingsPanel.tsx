import React, { useEffect, useState } from 'react';
import { ConfigManager } from "../config/ConfigManager";
import { DescentMinigameConfig } from "../config/types";

interface DevSettingsPanelProps {
    configManager: ConfigManager;
}

export const DevSettingsPanel: React.FC<DevSettingsPanelProps> = ({ configManager }) => {
    const [config, setConfig] = useState<DescentMinigameConfig>(configManager.getConfig());
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = configManager.subscribe((newConfig) => {
            setConfig(newConfig);
        });
        return () => unsubscribe();
    }, [configManager]);

    const handleMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        configManager.updateConfig({
            turbulence: {
                ...config.turbulence,
                penaltyScalarPerMiss: val
            }
        });
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 9999, background: '#333', color: '#fff', border: '1px solid #555', padding: '5px' }}
            >
                ⚙ Dev Tuning
            </button>
        );
    }

    return (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 300, background: 'rgba(0,0,0,0.85)', color: '#0f0', padding: 15, zIndex: 9999, border: '1px solid #0f0', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <b>Descent Config (Live)</b>
                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', color: '#f00', border: 'none', cursor: 'pointer' }}>X</button>
            </div>

            <div style={{ marginBottom: 10 }}>
                <label>Penalty Scalar Per Miss: {config.turbulence.penaltyScalarPerMiss.toFixed(3)}</label>
                <input 
                    type="range" 
                    min="0" max="0.1" step="0.001" 
                    value={config.turbulence.penaltyScalarPerMiss} 
                    onChange={handleMultiplierChange}
                    style={{ width: '100%' }}
                />
            </div>
            {/* Additional live tunables can be added here as needed by the developers */}
        </div>
    );
};
