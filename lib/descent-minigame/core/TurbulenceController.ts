import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, AbstractMesh, TransformNode } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import { ConfigManager } from "../config/ConfigManager";

export type NoteAction = 'PRESS' | 'TAP' | 'HOLD';

interface RhythmNote {
    mesh: AbstractMesh;
    textBlock: TextBlock;
    active: boolean;
    hand: 'LEFT' | 'RIGHT'; 
    key: string;
    action: NoteAction;
    actionState: 'PENDING' | 'STUCK' | 'HOLDING'; 
    tapCount: number;
    spawnTime: number;
    startZ: number;
    speed: number;
    material: StandardMaterial;
    heldTimeMs: number;
    targetHoldTimeMs: number;
}

export class TurbulenceController {
    private notePool: RhythmNote[] = [];
    private activeNotes: RhythmNote[] = [];
    private catchers: Record<string, AbstractMesh> = {};
    private renderObserver: any;
    
    private keydownHandler: (e: KeyboardEvent) => void;
    private keyupHandler: (e: KeyboardEvent) => void;
    private heldKeys = new Set<string>();

    private leftKeys = ["W", "A", "S", "D"];
    private rightKeys = ["I", "J", "K", "L"];

    private nextLeftSpawn = 0;
    private nextRightSpawn = 0;
    private elapsedMs = 0;
    private burstPenaltyEndTime = 0;
    private isPaused = false;
    private rootNode: TransformNode;

    public setPaused(p: boolean) {
        this.isPaused = p;
    }

    constructor(
        private scene: Scene,
        private configManager: ConfigManager,
        public typographyUrl: string | undefined,
        private onFeedback: (hand: 'LEFT' | 'RIGHT', action: 'HIT' | 'MISS', scalar?: number) => void,
        private onKeyEcho: (key: string, hand: string, actionStr: string) => void
    ) {
        this.rootNode = new TransformNode("TurbulenceRoot", this.scene);
        this.buildCatchers();
        this.initializePool(30);

        this.keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e.key.toUpperCase());
        this.keyupHandler = (e: KeyboardEvent) => this.handleKeyup(e.key.toUpperCase());
        
        window.addEventListener("keydown", this.keydownHandler);
        window.addEventListener("keyup", this.keyupHandler);

        this.scheduleNextSpawn('LEFT');
        this.scheduleNextSpawn('RIGHT');

        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isPaused) return;
            const dt = this.scene.getEngine().getDeltaTime();
            this.elapsedMs += dt;
            
            if (this.rootNode.parent !== this.scene.activeCamera) {
                this.rootNode.parent = this.scene.activeCamera;
            }
            
            this.updateSpawns();
            this.updateNotes(dt);
        });
    }

    private buildCatchers() {
        ['LEFT', 'RIGHT'].forEach(hand => {
            const x = hand === 'LEFT' ? -3 : 3;
            const mesh = MeshBuilder.CreatePlane(`Catcher_${hand}`, { size: 1.5 }, this.scene);
            mesh.parent = this.rootNode;
            mesh.position = new Vector3(x, -2, 5); // 5 units in front of camera
            mesh.rotation.x = Math.PI / 4; 
            
            const mat = new StandardMaterial(`CatcherMat_${hand}`, this.scene);
            mat.disableLighting = true;
            mat.emissiveColor = new Color3(0.2, 0.2, 0.2);
            mat.wireframe = true;
            mat.disableDepthWrite = true;
            mesh.material = mat;
            mesh.renderingGroupId = 2;

            this.catchers[hand] = mesh;
        });
    }

    private initializePool(size: number) {
        for (let i = 0; i < size; i++) {
            const plane = MeshBuilder.CreatePlane(`HoloNote_${i}`, { size: 1 }, this.scene);
            plane.parent = this.rootNode;
            plane.position = new Vector3(0, 0, 100); 
            plane.isVisible = false;
            plane.rotation.x = Math.PI / 4; 

            const mat = new StandardMaterial(`HoloMat_${i}`, this.scene);
            mat.disableLighting = true;
            mat.emissiveColor = Color3.White();
            mat.alpha = 0.9;
            mat.disableDepthWrite = true;
            plane.material = mat;
            plane.renderingGroupId = 2;

            const adt = AdvancedDynamicTexture.CreateForMesh(plane);
            const tb = new TextBlock();
            tb.text = "A";
            tb.color = "white";
            tb.fontSize = 250;
            tb.fontWeight = "bold";
            adt.addControl(tb);

            this.notePool.push({
                mesh: plane,
                textBlock: tb,
                active: false,
                hand: 'LEFT',
                key: "",
                action: 'PRESS',
                actionState: 'PENDING',
                tapCount: 0,
                spawnTime: 0,
                startZ: 50, 
                speed: 8, 
                material: mat,
                heldTimeMs: 0,
                targetHoldTimeMs: 1000
            });
        }
    }

    private scheduleNextSpawn(hand: 'LEFT' | 'RIGHT') {
        const config = this.configManager.getConfig();
        const range = hand === 'LEFT' ? config.turbulence.leftHandSpawnMsRange : config.turbulence.rightHandSpawnMsRange;
        
        let delay = Math.random() * (range[1] - range[0]) + range[0];
        
        if (this.elapsedMs < this.burstPenaltyEndTime) {
            delay *= 0.25; 
        }
        
        if (hand === 'LEFT') {
            this.nextLeftSpawn = this.elapsedMs + delay;
        } else {
            this.nextRightSpawn = this.elapsedMs + delay;
        }
    }
    
    // Kept for AlarmManager compatibility (it just forces high spawn rate for a bit)
    public applyBurstPenalty(durationMs: number = 8000) {
        this.burstPenaltyEndTime = this.elapsedMs + durationMs;
        this.scheduleNextSpawn('LEFT');
        this.scheduleNextSpawn('RIGHT');
    }

    private updateSpawns() {
        if (this.elapsedMs >= this.nextLeftSpawn) {
            this.spawnNote('LEFT');
            this.scheduleNextSpawn('LEFT');
        }
        if (this.elapsedMs >= this.nextRightSpawn) {
            this.spawnNote('RIGHT');
            this.scheduleNextSpawn('RIGHT');
        }
    }

    private spawnNote(hand: 'LEFT' | 'RIGHT') {
        const inactive = this.notePool.find(n => !n.active);
        if (!inactive) return; 

        const keys = hand === 'LEFT' ? this.leftKeys : this.rightKeys;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        
        const r = Math.random();
        let action: NoteAction = 'PRESS';
        if (r > 0.8) action = 'HOLD';
        else if (r > 0.6) action = 'TAP';

        inactive.active = true;
        inactive.hand = hand;
        inactive.key = randomKey;
        inactive.action = action;
        inactive.actionState = 'PENDING';
        inactive.tapCount = 0;
        inactive.textBlock.text = randomKey;
        inactive.spawnTime = this.elapsedMs;
        inactive.heldTimeMs = 0;
        inactive.targetHoldTimeMs = 800 + Math.random() * 800; // 0.8s to 1.6s

        const tapSize = this.configManager.getConfig().visuals.letterSizeTap;
        const holdSize = this.configManager.getConfig().visuals.letterSizeHold;

        inactive.mesh.scaling = new Vector3(tapSize, tapSize, tapSize);
        inactive.material.emissiveColor = new Color3(1, 1, 1); // ALL WHITE VISUALS
        
        if (action === 'HOLD') {
            inactive.mesh.scaling = new Vector3(holdSize, holdSize, holdSize); // Larger char
        }

        const xOffset = hand === 'LEFT' ? -3 : 3;
        inactive.mesh.position = new Vector3(xOffset, -2, inactive.startZ);
        inactive.speed = 8; // Reset speed in case it was modified
        inactive.mesh.isVisible = true;

        this.activeNotes.push(inactive);
    }

    private updateNotes(dt: number) {
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const note = this.activeNotes[i];
            const ds = note.speed * (dt / 1000);
            
            if (note.actionState === 'PENDING') {
                note.mesh.position.z -= ds;
                
                // Catchers are at Z=5
                if (note.mesh.position.z <= 5) {
                    note.mesh.position.z = 5;
                    note.speed = 0;
                    note.actionState = 'STUCK';
                    
                    // KNOCK OUT previous STUCK note on this hand
                    for (let j = 0; j < this.activeNotes.length; j++) {
                        const other = this.activeNotes[j];
                        if (other !== note && other.hand === note.hand && other.actionState === 'STUCK') {
                            this.knockoutMiss(other, j);
                            break;
                        }
                    }
                }
            } else if (note.actionState === 'HOLDING') {
                note.heldTimeMs += dt;
                
                // Visual feedback: Shrink the uniform scale from hold size towards 0.5
                const shrinkFactor = Math.max(0, 1.0 - (note.heldTimeMs / note.targetHoldTimeMs));
                const holdScale = this.configManager.getConfig().visuals.letterSizeHold;
                const currentScale = 0.5 + ((holdScale - 0.5) * shrinkFactor);
                note.mesh.scaling = new Vector3(currentScale, currentScale, currentScale);

                if (note.heldTimeMs >= note.targetHoldTimeMs) {
                    this.hitNote(note, i);
                    this.flashCatcher(note.hand, new Color3(0, 1, 0));
                    continue;
                }
            }

            if (note.action === 'TAP') {
                // Hard strobe between black and white at 1Hz (Math.sin ~1000ms period)
                const flash = Math.sin(this.elapsedMs / 150) > 0;
                note.textBlock.color = flash ? "white" : "black";
                note.material.emissiveColor = flash ? new Color3(1, 1, 1) : new Color3(0, 0, 0);
            } else {
                note.textBlock.color = "white";
                note.material.emissiveColor = new Color3(1, 1, 1);
            }
            
            // If the note was knocked out and is flying away
            if (note.speed < 0) {
                 note.mesh.position.y += note.speed * (dt / 1000); 
                 // Recycle after it falls far enough off screen
                 if (note.mesh.position.y < -15) {
                     this.recycleNote(note, i);
                 }
            }
        }
    }

    private knockoutMiss(note: RhythmNote, arrayIndex: number) {
        // Trigger the turbulence Miss!
        this.flashCatcher(note.hand, new Color3(1, 0, 0));
        this.onFeedback(note.hand, 'MISS');
        
        // Knock it downwards physically off screen instead of instantly disappearing
        note.actionState = 'PENDING'; // Clear stuck lock
        note.speed = -30; // Negative so logic in updateNotes makes it fall on Y axis
    }

    private handleKeydown(key: string) {
        if (this.isPaused) return;
        if (this.heldKeys.has(key)) return; // Ignore browser auto-repeat
        this.heldKeys.add(key);

        const isLeftKey = this.leftKeys.includes(key);
        const isRightKey = this.rightKeys.includes(key);
        if (!isLeftKey && !isRightKey) return;
        
        const hand = isLeftKey ? 'LEFT' : 'RIGHT';
        this.flashCatcher(hand, new Color3(1, 1, 1)); 

        const hittable = this.activeNotes.filter(n => n.hand === hand && n.actionState === 'STUCK');
        
        // Echo to Terminal
        let actionStr = "ENGAGED";
        if (hittable.length > 0) {
           if (hittable[0].key === key) {
               actionStr = hittable[0].action === 'HOLD' ? 'HOLDING' : 'STROBE';
           } else {
               actionStr = "MISSED O-R";
           }
        }
        this.onKeyEcho(key, hand, actionStr);

        if (hittable.length > 0) {
            const note = hittable[0];
            const idx = this.activeNotes.indexOf(note);
            
            if (note.key === key) {
                // Correct Key!
                if (note.action === 'PRESS') {
                    this.hitNote(note, idx);
                    this.flashCatcher(hand, new Color3(0, 1, 0));
                } 
                else if (note.action === 'TAP') {
                    note.tapCount++;
                    if (note.tapCount >= 3) {
                        this.hitNote(note, idx);
                        this.flashCatcher(hand, new Color3(0, 1, 0));
                    } else {
                        note.mesh.scaling.x = 1.5;
                        setTimeout(() => { if (note.active) note.mesh.scaling.x = 1; }, 100);
                    }
                }
                else if (note.action === 'HOLD') {
                    note.actionState = 'HOLDING'; // starts draining
                }
            } else {
                // Wrong Key inside hit window! That's a MISS!
                this.knockoutMiss(note, idx);
            }
        } else {
            // Pressed a key but nothing is in the catcher.
            this.flashCatcher(hand, new Color3(1, 0, 0));
            this.onFeedback(hand, 'MISS');
        }
    }

    private handleKeyup(key: string) {
        if (this.isPaused) return;
        this.heldKeys.delete(key);

        const isLeftKey = this.leftKeys.includes(key);
        const isRightKey = this.rightKeys.includes(key);
        if (!isLeftKey && !isRightKey) return;
        
        const hand = isLeftKey ? 'LEFT' : 'RIGHT';
        
        // Find if we were HOLDING a note on this hand
        const holdingIdx = this.activeNotes.findIndex(n => n.hand === hand && n.actionState === 'HOLDING');
        if (holdingIdx > -1) {
            const note = this.activeNotes[holdingIdx];
            
            // Proportional miss scaling based on how early it was released
            const holdRatio = Math.min(1.0, note.heldTimeMs / note.targetHoldTimeMs);
            const missScalar = 1.0 - holdRatio;

            if (missScalar > 0.1) {
                // Let go too early!
                this.flashCatcher(note.hand, new Color3(1, 0, 0));
                this.onFeedback(note.hand, 'MISS', missScalar);
            } else {
                // Good enough hit
                this.hitNote(note, holdingIdx);
                this.flashCatcher(note.hand, new Color3(0, 1, 0));
            }
            
            this.recycleNote(note, holdingIdx);
        }
    }
    
    private flashCatcher(hand: 'LEFT' | 'RIGHT', color: Color3) {
        const mesh = this.catchers[hand];
        if (!mesh) return;
        const mat = mesh.material as StandardMaterial;
        mat.emissiveColor = color;
        mat.wireframe = false;
        
        setTimeout(() => {
            if (mat && mesh) {
                mat.emissiveColor = new Color3(0.2, 0.2, 0.2);
                mat.wireframe = true;
            }
        }, 150);
    }

    private hitNote(note: RhythmNote, arrayIndex: number) {
        this.onFeedback(note.hand, 'HIT'); // Hitting decreases turbulence
        this.recycleNote(note, arrayIndex);
    }

    private recycleNote(note: RhythmNote, arrayIndex: number) {
        note.active = false;
        note.mesh.isVisible = false;
        note.mesh.position.y = -2; // Restore normal Y
        note.mesh.position.z = 100; 
        note.actionState = 'PENDING';
        this.activeNotes.splice(arrayIndex, 1);
    }

    public dispose() {
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
        window.removeEventListener("keydown", this.keydownHandler);
        window.removeEventListener("keyup", this.keyupHandler);
        
        Object.values(this.catchers).forEach(m => m.dispose());
        this.catchers = {};

        this.notePool.forEach(note => {
            note.mesh.dispose();
            note.material.dispose();
        });
        this.notePool = [];
        this.activeNotes = [];
    }
}
