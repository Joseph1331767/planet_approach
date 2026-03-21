export class VoiceCommsService {
    private recognition: any = null;
    public isListening = false;
    public failoverMode = false;
    private spacebarDown = false;
    private numpadBuffer = "";

    public onAnswerReceived: ((answer: string) => void) | null = null;
    public onFailoverStateChange: ((isFailover: boolean) => void) | null = null;
    public onRawVoiceReceived: ((transcript: string) => void) | null = null;
    
    private keydownHandler!: (e: KeyboardEvent) => void;
    private keyupHandler!: (e: KeyboardEvent) => void;

    constructor() {
        this.initSpeechAPI();
        this.initKeyboardFailover();
    }

    private initSpeechAPI() {
        // @ts-ignore - Vendor prefixes
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("[VoiceCommsService] WebSpeechAPI not supported. Entering failover mode.");
            this.setFailoverMode(true);
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => {
            this.isListening = true;
        };

        this.recognition.onresult = (event: any) => {
            if (this.failoverMode) return; // Only process voice if not in failover
            
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript;
            
            if (this.onRawVoiceReceived) {
                this.onRawVoiceReceived(text.toUpperCase());
            }
            
            // Clean up text: convert spoken words to digits potentially, rip all spaces
            let cleaned = text.replace(/\s+/g, "").toLowerCase();
            
            // basic word to number replacements if dictation writes "three zero five"
            const wordToNum: {[key:string]:string} = {
                "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
                "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
                "to": "2", "too": "2", "for": "4"
            };
            Object.keys(wordToNum).forEach(w => {
                cleaned = cleaned.replace(new RegExp(w, "g"), wordToNum[w]);
            });

            // Keep only digits
            cleaned = cleaned.replace(/\D/g, "");

            if (cleaned.length >= 3) {
                // If they said too many numbers, just take the last 3 for the sequence
                const answer = cleaned.slice(-3);
                if (this.onAnswerReceived) this.onAnswerReceived(answer);
            }
        };

        this.recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                console.warn("[VoiceCommsService] Microphone permission denied. Entering failover mode.");
                this.setFailoverMode(true);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            // Auto-restart if we didn't explicitly stop it (unless we switched to failover)
            if (!this.failoverMode) {
                try {
                    this.recognition.start();
                } catch(e) {}
            }
        };
    }

    private initKeyboardFailover() {
        // Watch for spacebar hold + 3 digit numpad strikes
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                this.spacebarDown = true;
                this.numpadBuffer = "";
            } else if (this.spacebarDown && /^[0-9]$/.test(e.key)) {
                this.numpadBuffer += e.key;
                if (this.numpadBuffer.length === 3) {
                    if (this.onAnswerReceived) this.onAnswerReceived(this.numpadBuffer);
                    this.numpadBuffer = ""; // Reset for next time
                }
            }
        };

        this.keyupHandler = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                this.spacebarDown = false;
                this.numpadBuffer = "";
            }
        };

        window.addEventListener("keydown", this.keydownHandler);
        window.addEventListener("keyup", this.keyupHandler);
    }

    public setFailoverMode(state: boolean) {
        this.failoverMode = state;
        if (state && this.recognition && this.isListening) {
            this.recognition.stop();
        }
        if (!state && this.recognition && !this.isListening) {
            try { this.recognition.start(); } catch(e){}
        }
        if (this.onFailoverStateChange) {
            this.onFailoverStateChange(this.failoverMode);
        }
    }

    public async requestMicrophone(deviceId: string = "default") {
        if (!this.recognition) return;
        try {
            const constraints: any = { audio: true };
            if (deviceId && deviceId !== "default") {
                constraints.audio = { deviceId: { exact: deviceId } };
            }
            await navigator.mediaDevices.getUserMedia(constraints);
            this.setFailoverMode(false);
            try { this.recognition.start(); } catch(e){}
        } catch(e) {
            this.setFailoverMode(true);
        }
    }

    public dispose() {
        if (this.recognition) {
            this.recognition.onend = null; // Prevent restart loops
            try { this.recognition.stop(); } catch(e){}
        }
        window.removeEventListener("keydown", this.keydownHandler);
        window.removeEventListener("keyup", this.keyupHandler);
    }
}
