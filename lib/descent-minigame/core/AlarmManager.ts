import { Scene, AbstractMesh } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, StackPanel, Control } from "@babylonjs/gui";
import { ConfigManager } from "../config/ConfigManager";
import { PadlockMath } from "./PadlockMath";
import { VoiceCommsService } from "./VoiceCommsService";

export class AlarmManager {
    private uiTexture: AdvancedDynamicTexture;
    private panel: StackPanel;
    private alarmText: TextBlock;
    private subText: TextBlock;

    private activeAlarm: 'NONE' | 'MATH' | 'TEXT' = 'NONE';
    private expectedMathAnswer = "";
    private expectedTextKey = "";
    
    // Timers
    private timeToAnswerMs = 8000;
    private alarmElapsedMs = 0;
    private renderObserver: any;
    
    private nextAlarmSpawnMs = 0;
    private totalElapsedMs = 0;
    private isPaused = false;

    public setPaused(p: boolean) {
        this.isPaused = p;
    }

    constructor(
        private scene: Scene,
        private dashboardMesh: AbstractMesh | null,
        private configManager: ConfigManager,
        private voiceService: VoiceCommsService,
        private onFailedAlarm: () => void // Trigger penalty
    ) {
        if (this.dashboardMesh && this.scene.getMeshByName("UI_Terminal_Screen")) {
            this.uiTexture = AdvancedDynamicTexture.CreateForMesh(this.scene.getMeshByName("UI_Terminal_Screen") as AbstractMesh);
        } else {
            this.uiTexture = AdvancedDynamicTexture.CreateFullscreenUI("AlarmUI");
        }

        this.panel = new StackPanel();
        this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.panel.top = "-100px";
        this.panel.width = "600px";
        this.uiTexture.addControl(this.panel);

        const config = this.configManager.getConfig();

        this.alarmText = new TextBlock();
        this.alarmText.height = "50px";
        this.alarmText.color = "red";
        this.alarmText.fontSize = config.ui.alarmFontSize;
        this.alarmText.isVisible = false;
        this.panel.addControl(this.alarmText);

        this.subText = new TextBlock();
        this.subText.height = "30px";
        this.subText.color = "yellow";
        this.subText.fontSize = config.ui.alarmFontSize * 0.6;
        this.subText.isVisible = false;
        this.panel.addControl(this.subText);

        this.timeToAnswerMs = config.voice.timeToAnswerMs;
        this.scheduleNextAlarm();

        // Bind voice service answers
        this.voiceService.onAnswerReceived = (ans) => {
            if (this.activeAlarm === 'MATH' && this.expectedMathAnswer === ans) {
                this.resolveAlarm();
            }
        };

        // Bind keyboard for specific text alarms
        window.addEventListener("keydown", this.handleTextAlarmKey);

        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isPaused) return;
            const dt = this.scene.getEngine().getDeltaTime();
            this.totalElapsedMs += dt;

            // Spawn new alarm if time
            if (this.activeAlarm === 'NONE' && this.totalElapsedMs >= this.nextAlarmSpawnMs) {
                this.triggerRandomAlarm();
                this.scheduleNextAlarm();
            }

            // Check expiration if alarm is active
            if (this.activeAlarm !== 'NONE') {
                this.alarmElapsedMs += dt;
                
                // Flash the text
                this.alarmText.color = Math.floor(this.alarmElapsedMs / 200) % 2 === 0 ? "red" : "white";

                if (this.alarmElapsedMs > this.timeToAnswerMs) {
                    this.failAlarm();
                }
            }
        });
    }

    private scheduleNextAlarm() {
        const interval = this.configManager.getConfig().voice.intervalMs;
        this.nextAlarmSpawnMs = this.totalElapsedMs + interval + (Math.random() * 10000 - 5000); // +/- 5 sec jitter
    }

    private triggerRandomAlarm() {
        this.alarmElapsedMs = 0;
        this.activeAlarm = Math.random() > 0.5 ? 'MATH' : 'TEXT';

        this.alarmText.isVisible = true;
        this.subText.isVisible = true;

        if (this.activeAlarm === 'MATH') {
            const problem = PadlockMath.generateProblem();
            this.expectedMathAnswer = problem.expectedAnswer;
            
            this.alarmText.text = `COMMS: ${problem.baseText} ${problem.operationText}`;
            this.subText.text = this.voiceService.failoverMode 
                ? "(HOLD SPACE + TYPE 3 DIGITS)" 
                : "(SPEAK 3 DIGITS)";
        } else {
            const terribleKeys = ["U", "H", "O", "C", "M", "Y"]; // Keys far from WSAD and IKJL
            this.expectedTextKey = terribleKeys[Math.floor(Math.random() * terribleKeys.length)];
            
            this.alarmText.text = `THERMAL CRITICAL: SILENCE [ ${this.expectedTextKey} ]`;
            this.subText.text = "(BREAK RHYTHM TO PRESS)";
        }
    }

    private handleTextAlarmKey = (e: KeyboardEvent) => {
        if (this.isPaused) return;
        if (this.activeAlarm === 'TEXT') {
            if (e.key.toUpperCase() === this.expectedTextKey) {
                this.resolveAlarm();
            }
        }
    };

    private resolveAlarm() {
        this.activeAlarm = 'NONE';
        this.alarmText.isVisible = false;
        this.subText.isVisible = false;
        // Turn text green briefly before hiding if desired, but hiding instantly is fine.
    }

    private failAlarm() {
        this.activeAlarm = 'NONE';
        this.alarmText.isVisible = false;
        this.subText.isVisible = false;
        this.onFailedAlarm();
    }

    public dispose() {
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
        window.removeEventListener("keydown", this.handleTextAlarmKey);
        this.uiTexture.dispose();
    }
}
