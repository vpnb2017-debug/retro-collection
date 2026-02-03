/**
 * Local File Sync Service (Zero API)
 * Uses File System Access API to read/write directly to a local JSON file.
 */

let fileHandle = null;

export const localFileSync = {
    async selectFileForSave() {
        if (!window.showSaveFilePicker) return null;
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'retro_collection.json',
                types: [{
                    description: 'RetroCollection Database (JSON)',
                    accept: { 'application/json': ['.json'] },
                }]
            });
            fileHandle = handle;
            return handle.name;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    async selectFileForLoad() {
        if (!window.showOpenFilePicker) return null;
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'RetroCollection Database (JSON)',
                    accept: { 'application/json': ['.json'] },
                }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            fileHandle = handle;
            return handle.name;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    async save(data) {
        if (!fileHandle) {
            // Fallback for mobile or if handle is lost: Download the file
            this.downloadFallback(data);
            return "downloaded";
        }

        try {
            // Explicitly truncate to ensure no old data remains if the new file is smaller
            const writable = await fileHandle.createWritable({ keepExistingData: false });
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            return "saved";
        } catch (err) {
            console.error("Direct save failed, trying fallback...", err);
            this.downloadFallback(data);
            return "downloaded";
        }
    },

    async load() {
        if (!fileHandle) {
            const [handle] = await window.showOpenFilePicker();
            fileHandle = handle;
        }
        const file = await fileHandle.getFile();
        const text = await file.text();
        return this.robustJSONParse(text);
    },

    downloadFallback(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'retro_collection_sync.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    async importFromFile(file) {
        const text = await file.text();
        return this.robustJSONParse(text);
    },

    robustJSONParse(text) {
        text = text.trim();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn("Simple JSON parse failed, attempting recovery...", e);
            // If there's trailing junk, find the last closing brace
            const lastBrace = text.lastIndexOf('}');
            if (lastBrace !== -1) {
                try {
                    return JSON.parse(text.substring(0, lastBrace + 1));
                } catch (e2) {
                    throw new Error("Ficheiro de base de dados corrompido. Certifique-se de que o ficheiro é um JSON válido.");
                }
            }
            throw e;
        }
    }
};
