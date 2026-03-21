import { Scene, AbstractMesh, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, StackPanel, Control, Grid, Rectangle } from "@babylonjs/gui";
import { ConfigManager } from "../config/ConfigManager";
import { VoiceCommsService } from "./VoiceCommsService";

interface Protocol {
    id: string;
    expectedCommand: string;
    description: string;
    loreBabble: string | null;
    requiresVoice: boolean;
}

export class PreLaunchTerminal {
    private uiTexture: AdvancedDynamicTexture;
    private mainContainer!: Rectangle;
    private leftPanel!: StackPanel;
    private rightPanel!: StackPanel;
    
    private timerText!: TextBlock;
    private logText!: TextBlock;
    private inputText!: TextBlock;
    
    private logLines: string[] = [];
    private maxLogLines = 20;
    
    private currentInput = "";
    private caretVisible = true;
    private caretInterval: any;
    
    private protocols: Protocol[] = [];
    private checklistBlocks: TextBlock[] = [];
    private currentProtocolIdx = 0;
    
    private totalWindowMs = 600000;
    private elapsedMs = 0;
    private renderObserver: any;
    
    private keydownHandler: (e: KeyboardEvent) => void;
    private keyupHandler: (e: KeyboardEvent) => void;
    private ctrlDown = false;
    private isVoiceMode = false;
    private fakeHistory: string[] = [];
    private fakeHistoryIdx = 0;
    
    private voiceCallback: ((txt: string) => void) | null = null;
    private voiceCheckInterval: any;
    private isPaused = false;

    public setPaused(p: boolean) {
        this.isPaused = p;
    }
    public inDescent = false;

    constructor(
        private scene: Scene,
        private dashboardMesh: AbstractMesh | null,
        private configManager: ConfigManager,
        private voiceService: VoiceCommsService,
        private onComplete: (uncompletedCount: number) => void,
        private onLaunchTriggered?: () => void,
        private getSimulatedTimeElapsed?: () => number
    ) {
        const config = this.configManager.getConfig();
        const totalDuration = config.timings.totalDurationMs || 600000;
        const windowPercent = config.timings.orbitLaunchWindowPercent || 0.75;
        this.totalWindowMs = totalDuration * windowPercent;

        if (this.dashboardMesh && this.scene.getMeshByName("UI_Terminal_Screen")) {
            this.uiTexture = AdvancedDynamicTexture.CreateForMesh(this.scene.getMeshByName("UI_Terminal_Screen") as AbstractMesh);
        } else {
            this.uiTexture = AdvancedDynamicTexture.CreateFullscreenUI("TerminalUI");
        }

        this.buildUI();
        this.fetchProtocols();

        this.keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e);
        this.keyupHandler = (e: KeyboardEvent) => this.handleKeyup(e);
        window.addEventListener("keydown", this.keydownHandler);
        window.addEventListener("keyup", this.keyupHandler);
        
        // Setup raw voice listener hook
        this.voiceCallback = (transcript: string) => this.handleRawVoice(transcript);
        this.voiceService.onRawVoiceReceived = this.voiceCallback;

        this.caretInterval = setInterval(() => {
            this.caretVisible = !this.caretVisible;
            this.updateInputDisplay();
        }, 500);

        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isPaused) return;

            let seconds = 0;
            if (this.getSimulatedTimeElapsed) {
                seconds = this.getSimulatedTimeElapsed();
            } else {
                const dt = this.scene.getEngine().getDeltaTime();
                this.elapsedMs += dt;
                seconds = this.elapsedMs / 1000;
            }
            
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            this.timerText.text = `MISSION CLOCK: T+${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        });
    }

    public onTimeLapseComplete() {
        this.printLog("APPROACH VECTOR ALIGNED. READY FOR DESCENT.", "#33ff33");
    }

    private buildUI() {
        this.mainContainer = new Rectangle();
        this.mainContainer.width = "50%";
        this.mainContainer.height = "25%";
        this.mainContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.mainContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.mainContainer.top = "-20px"; // slight margin from bottom of screen
        this.mainContainer.thickness = 3;
        this.mainContainer.color = "#33ff33";
        this.mainContainer.background = "rgba(0, 10, 0, 0.85)";
        this.mainContainer.cornerRadius = 5;
        this.uiTexture.addControl(this.mainContainer);

        const grid = new Grid();
        grid.addColumnDefinition(0.35); // Checklist
        grid.addColumnDefinition(0.01); // Divider
        grid.addColumnDefinition(0.64); // Terminal
        grid.addRowDefinition(0.15); // Header
        grid.addRowDefinition(0.85); // Body
        this.mainContainer.addControl(grid);

        // Header Timer
        this.timerText = new TextBlock();
        this.timerText.color = "#ffcc00";
        this.timerText.fontSize = this.configManager.getConfig().ui.timerFontSize;
        this.timerText.fontWeight = "bold";
        this.timerText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        grid.addControl(this.timerText, 0, 0);
        this.timerText.text = "LAUNCH WINDOW: T-MINUS 00:00";

        // Vertical Divider
        const divider = new Rectangle();
        divider.width = "2px";
        divider.height = "90%";
        divider.background = "#33ff33";
        divider.thickness = 0;
        grid.addControl(divider, 1, 1);

        // Left Panel (Checklist)
        this.leftPanel = new StackPanel();
        this.leftPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.leftPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.leftPanel.paddingLeft = "10px";
        this.leftPanel.paddingTop = "10px";
        grid.addControl(this.leftPanel, 1, 0);

        const checklistHeader = new TextBlock();
        checklistHeader.text = "--- PROTOCOLS ---";
        checklistHeader.color = "#33ff33";
        checklistHeader.fontSize = this.configManager.getConfig().ui.terminalFontSize + 2;
        checklistHeader.height = "25px";
        checklistHeader.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.leftPanel.addControl(checklistHeader);

        // Right Panel (Terminal)
        this.rightPanel = new StackPanel();
        this.rightPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.rightPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.rightPanel.paddingLeft = "10px";
        this.rightPanel.paddingBottom = "10px";
        grid.addControl(this.rightPanel, 1, 2);

        this.logText = new TextBlock();
        this.logText.color = "#aaaaaa";
        this.logText.fontSize = this.configManager.getConfig().ui.terminalFontSize;
        this.logText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.logText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.logText.fontFamily = "Courier New, monospace";
        // Allow infinite height and wrap, we manually trim array
        this.logText.resizeToFit = true; 
        this.rightPanel.addControl(this.logText);

        this.inputText = new TextBlock();
        this.inputText.color = "#ffffff";
        this.inputText.fontSize = this.configManager.getConfig().ui.terminalFontSize + 2;
        this.inputText.height = "25px";
        this.inputText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.inputText.fontFamily = "Courier New, monospace";
        this.inputText.paddingTop = "5px";
        this.rightPanel.addControl(this.inputText);
        
        this.updateInputDisplay();
    }

    private async fetchProtocols() {
        try {
            // Simulated fetch since it's a local JSON file path in minigame config
            // Normally this is fetched via URL, but we will hardcode the default for durability
            this.protocols = [
                { id: "init_sys", expectedCommand: "sys-001", description: "Initialize Boot Sequence", loreBabble: null, requiresVoice: false },
                { id: "chk_pwr", expectedCommand: "pwr-chk", description: "Power Grid Diagnostics", loreBabble: null, requiresVoice: false },
                { id: "align_nav", expectedCommand: "nav-xyz", description: "Align Navigation Matrix", loreBabble: null, requiresVoice: false },
                { id: "sync_comms", expectedCommand: "com-hz1", description: "Synchronize Comm Relays", loreBabble: "COMM RELAYS ENGAGED AND HOLDING STEADY ON FREQUENCY ALPHA", requiresVoice: true },
                { id: "rtr_pwr", expectedCommand: "rtr-bck", description: "Route Backup Power", loreBabble: null, requiresVoice: false },
                { id: "eng_rdn", expectedCommand: "eng-rdn", description: "Engage Redundancy Ops", loreBabble: null, requiresVoice: false },
                { id: "tgl_lif", expectedCommand: "lif-spt", description: "Toggle Life Support", loreBabble: null, requiresVoice: false },
                { id: "arm_shd", expectedCommand: "shd-max", description: "Arm Thermal Shields", loreBabble: "THERMAL SHIELDS FULLY CHARGED AND READY FOR HIGH KINETIC ENTRY", requiresVoice: true },
                { id: "verify_drop", expectedCommand: "drp-cfg", description: "Verify Drop Config", loreBabble: "DROP COORDINATES LOCKED PAYLOAD ARMED FOR ATMOSPHERIC DESCENT", requiresVoice: true }
            ];

            this.protocols.forEach((p, idx) => {
                const tb = new TextBlock();
                tb.text = `[ ] ${p.expectedCommand.toUpperCase()}: ${p.description}`;
                tb.color = "#999999";
                tb.fontSize = this.configManager.getConfig().ui.terminalFontSize; // Scaled down
                tb.height = "20px";
                tb.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                this.leftPanel.addControl(tb);
                this.checklistBlocks.push(tb);
            });

            this.printLog("ORBITAL FLIGHT OS v9.2.4", "#33ff33");
            this.printLog("ALL SYSTEMS ONLINE. AWAITING PROTOCOL EXECUTION.", "#33ff33");
            this.updateProtocolState();

        } catch (e) {
            console.error(e);
        }
    }

    private printLog(msg: string, color: string = "#aaaaaa") {
        // Simple hack to add color via BBCode if Babylon GUI supported it natively, 
        // but since it's one block, we'll just use plaintext.
        this.logLines.push(msg);
        if (this.logLines.length > this.maxLogLines) {
            this.logLines.shift();
        }
        this.logText.text = this.logLines.join('\n');
    }

    private updateInputDisplay() {
        if (this.inDescent) {
            this.inputText.text = "OS-LOCKED // MANUAL DESCENT ENGAGED";
            this.inputText.color = "red";
            return;
        }
        const prefix = this.isVoiceMode ? "SEARCH>" : "OS>";
        this.inputText.text = `${prefix} ${this.currentInput}${this.caretVisible ? '_' : ''}`;
    }

    private handleKeydown(e: KeyboardEvent) {
        if (this.isPaused || this.inDescent) return;
        if (e.key === "Control") this.ctrlDown = true;
        
        // Prevent default browser scrolling with arrows
        if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();

        // Voice Microphone trigger
        if (e.code === "Space" && this.ctrlDown && this.isVoiceMode) {
            // Simulates holding space to talk
            return;
        }

        if (e.key === "Enter") {
            this.submitCommand();
            return;
        }

        if (e.key === "Backspace") {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateInputDisplay();
            return;
        }

        if (this.isVoiceMode && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            this.navigateFakeHistory(e.key === "ArrowUp" ? -1 : 1);
            return;
        }

        // Typed characters
        if (e.key.length === 1 && !this.ctrlDown) {
            if (this.isVoiceMode) {
                // If they type normally during voice mode, act like it's locked or clears fake history
                this.currentInput += e.key;
            } else {
                this.currentInput += e.key;
            }
            this.updateInputDisplay();
        }
    }

    private handleKeyup(e: KeyboardEvent) {
        if (e.key === "Control") this.ctrlDown = false;
    }

    private handleRawVoice(transcript: string) {
        if (this.isPaused) return;
        if (!this.isVoiceMode) return;
        const currentParams = this.protocols[this.currentProtocolIdx];
        if (!currentParams || !currentParams.loreBabble) return;

        const expectedWords = currentParams.loreBabble.split(" ").filter(w => w.length > 3);
        let matchCount = 0;
        expectedWords.forEach(w => {
            if (transcript.includes(w.toUpperCase())) matchCount++;
        });

        // Loose match (needs at least half the keywords)
        if (matchCount >= Math.floor(expectedWords.length / 2)) {
            this.printLog(">> VOICE OVERRIDE ACCEPTED.", "#33ff33");
            this.currentInput = `send_to_mother: ${currentParams.loreBabble}`;
            this.updateInputDisplay();
            setTimeout(() => this.submitCommand(), 800);
        }
    }

    private updateProtocolState() {
        if (this.currentProtocolIdx >= this.protocols.length) {
            this.printLog("ALL PROTOCOLS VERIFIED. WAITING FOR END OF WINDOW OR 'launch' COMMAND.", "#33ff33");
            this.isVoiceMode = false;
            return;
        }
        
        const current = this.protocols[this.currentProtocolIdx];
        this.printLog(`\n[SYSTEM] AWAITING PROTOCOL: ${current.description}`, "#ffffff");
        
        if (current.requiresVoice) {
            this.isVoiceMode = true;
            this.printLog(`[VOICE OVERRIDE REQUIRED] HOLD CTRL+SPACE AND READ ALOUD:`, "#ffaa00");
            this.printLog(`"${current.loreBabble}"`, "#ffffff");
            this.printLog(`[OR] USE ARROW KEYS TO SEARCH PREVIOUS COMMAND HISTORY`, "#ffaa00");
            this.generateFakeHistory(current);
            this.fakeHistoryIdx = 0;
            this.currentInput = "";
        } else {
            this.isVoiceMode = false;
        }
        this.updateInputDisplay();
        
        // Highlight active visually
        this.checklistBlocks.forEach((tb, i) => {
            if (i === this.currentProtocolIdx) {
                tb.color = "#ffffff";
            }
        });
    }

    private generateFakeHistory(protocol: Protocol) {
        // Create 20 random junk commands
        const prefixes = ["sys-flush", "mem-dump", "net-reset", "pwr-cycle", "auth-req", "log-tail"];
        const suffixes = ["-a", "-b", "--force", "-v", "0x4F2A", "0x98FF", "--dry-run"];
        
        this.fakeHistory = Array.from({length: 20}, () => {
            const p = prefixes[Math.floor(Math.random() * prefixes.length)];
            const s = suffixes[Math.floor(Math.random() * suffixes.length)];
            return `${p} ${s}`;
        });
        
        // Insert the correct command at a random spot near the middle-end (-5 commands deep)
        const correctTarget = `send_to_mother: ${protocol.loreBabble}`;
        const insertIdx = Math.max(0, this.fakeHistory.length - 5 - Math.floor(Math.random() * 5));
        this.fakeHistory.splice(insertIdx, 0, correctTarget);
        
        // Start AT the end (empty prompt) so ArrowUp (-1) goes into history
        this.fakeHistoryIdx = this.fakeHistory.length;
    }

    private navigateFakeHistory(dir: number) {
        this.fakeHistoryIdx += dir;
        
        if (this.fakeHistoryIdx < 0) this.fakeHistoryIdx = 0;
        if (this.fakeHistoryIdx > this.fakeHistory.length) this.fakeHistoryIdx = this.fakeHistory.length;
        
        if (this.fakeHistoryIdx === this.fakeHistory.length) {
            this.currentInput = "";
        } else {
            this.currentInput = this.fakeHistory[this.fakeHistoryIdx];
        }
        this.updateInputDisplay();
    }

    private submitCommand() {
        const cmd = this.currentInput.trim();
        this.printLog(`> ${cmd}`, "#ffffff");
        this.currentInput = "";
        this.updateInputDisplay();

        if (cmd.toLowerCase() === "help") {
            this.printLog("OS HELP MANUAL:", "#00aaff");
            this.printLog("- Type the expected command for the current protocol.", "#00aaff");
            this.printLog("- Voice protocols require reading the text via Mic (Ctrl+Space), or relying on arrow key failovers.", "#00aaff");
            this.printLog("- Type 'launch' anytime to authorize orbital descent override.", "#00aaff");
            return;
        }

        if (cmd.toLowerCase() === "launch") {
            this.forceEnd();
            return;
        }

        if (this.currentProtocolIdx >= this.protocols.length) {
            this.printLog("SYNTAX ERROR: ALL PROTOCOLS COMPLETE. WAITING FOR LAUNCH.", "red");
            return;
        }

        const current = this.protocols[this.currentProtocolIdx];
        
        let passed = false;
        if (this.isVoiceMode) {
            const expected = `send_to_mother: ${current.loreBabble}`;
            if (cmd === expected) passed = true;
        } else {
            if (cmd.toLowerCase() === current.expectedCommand.toLowerCase()) passed = true;
        }

        const checklistItem = this.checklistBlocks[this.currentProtocolIdx];

        if (passed) {
            this.printLog(`[OK] PROTOCOL <${current.expectedCommand.toUpperCase()}> VERIFIED.`, "#33ff33");
            if (checklistItem) {
                checklistItem.text = `[OK] ${current.description.toUpperCase()}`;
                checklistItem.color = "#33ff33";
            }
        } else {
            this.printLog(`SYNTAX ERROR: UNRECOGNIZED INPUT '${cmd}'`, "red");
            // Mark as failed in UI
            if (checklistItem) {
                checklistItem.text = `[!!] ${current.description.toUpperCase()}`;
                checklistItem.color = "red";
            }
            // In a fully strictly verified OS this might not advance, 
            // but the user design says it spoofed it as a MISS and advanced.
        }

        this.currentProtocolIdx++;
        this.updateProtocolState();
    }

    private forceEnd() {
        const uncompleted = this.protocols.length - this.currentProtocolIdx; // Everything left + skipped but we treat skipped as uncompleted conceptually, or we only count fully untouched ones.
        // Wait, the design says "if they miss a step we just spoof it and count it as a miss... we also dont check it off". 
        // So uncompleted is technically any checklist block that isn't green.
        let actualMisses = 0;
        this.checklistBlocks.forEach(tb => {
            if (!tb.text.startsWith("[OK]")) actualMisses++;
        });

        this.printLog("LAUNCH AUTHORIZED. CALCULATING APPROACH TRAJECTORY...", "#33ff33");
        this.inDescent = true;
        this.updateInputDisplay();
        this.onComplete(actualMisses);
    }

    public printDescentLog(key: string, hand: string, actionStr: string) {
        if (!this.inDescent) return;
        const side = hand === 'LEFT' ? 'PORT' : 'STARBOARD';
        this.printLog(`[ECHO] ${side} THRUSTER <${key}> ${actionStr}...`, "#00aaff");
    }

    public dispose() {
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
        clearInterval(this.caretInterval);
        if (this.voiceService.onRawVoiceReceived === this.voiceCallback) {
            this.voiceService.onRawVoiceReceived = null;
        }
        window.removeEventListener("keydown", this.keydownHandler);
        window.removeEventListener("keyup", this.keyupHandler);
        this.uiTexture.dispose();
    }
}
