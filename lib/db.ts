export interface ZoomSession {
    images: string[];
    equiUrl: string | null;
    pickedPoint: { x: number, y: number, z: number } | null;
}

export class ZoomDB {
    private dbName = "PlanetZoomDB";
    private storeName = "sessions";
    private db: IDBDatabase | null = null;

    async init() {
        if (this.db) return;
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async saveSession(session: ZoomSession) {
        await this.init();
        if (!this.db) return;
        return new Promise<void>((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.put(session, "last_session");
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getLastSession(): Promise<ZoomSession | null> {
        await this.init();
        if (!this.db) return null;
        return new Promise<ZoomSession | null>((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get("last_session");
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
}

export const zoomDB = new ZoomDB();
