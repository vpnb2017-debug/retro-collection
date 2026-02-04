/**
 * Cloud Sync Service
 * Handles fetching database from cloud providers (initially Google Drive)
 */

export const cloudSyncService = {
    /**
     * Converts a Google Drive share link into a direct download link
     */
    getDirectLink(viewUrl) {
        if (!viewUrl) return null;

        // Handle Google Drive file links
        // format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        const driveMatch = viewUrl.match(/\/d\/([^/]+)/);
        if (driveMatch && driveMatch[1]) {
            return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
        }

        return viewUrl; // Return as is if not a recognized Drive link
    },

    /**
     * Fetches the JSON database from the provided URL
     */
    async fetchDatabase(url) {
        const directUrl = this.getDirectLink(url);
        // v79: Use a CORS Proxy to bypass Google Drive's restrictions
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;

        try {
            console.log(`[CloudSync] Fetching from (via Proxy): ${proxiedUrl}`);
            const response = await fetch(proxiedUrl);
            if (!response.ok) throw new Error("Falha ao descarregar ficheiro da nuvem.");

            const data = await response.json();
            return data;
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            throw err;
        }
    }
};
