/**
 * Cloud Sync Service
 * Handles fetching database from cloud providers (initially Google Drive)
 */

export const cloudSyncService = {
    /**
     * Converts a Cloud share link into a direct download link
     */
    getDirectLink(viewUrl) {
        if (!viewUrl) return null;

        // format 1: Google Drive (file/d/...)
        // format 2: Google Drive (open?id=...)
        const driveMatch = viewUrl.match(/\/d\/([^/?]+)/) || viewUrl.match(/id=([^&?]+)/);
        if (driveMatch && driveMatch[1]) {
            console.log(`[CloudSync] Drive ID: ${driveMatch[1]}`);
            return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
        }

        // format 3: GitHub Gist (gist.github.com/user/gist_id)
        if (viewUrl.includes('gist.github.com')) {
            // Remove /raw if already present to avoid duplication
            const base = viewUrl.split('/raw')[0];
            // Format for raw gist download
            const rawGist = base.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
            console.log(`[CloudSync] Gist detected. Raw: ${rawGist}`);
            return rawGist;
        }

        return viewUrl; // Return as is if not a recognized Drive link
    },

    /**
     * Fetches the JSON database from the provided URL
     */
    async fetchDatabase(url) {
        const directUrl = this.getDirectLink(url);

        // v82: Gists don't need proxy (CORS allowed). Drive still needs AllOrigins bridge.
        const isDrive = directUrl.includes('google.com');
        const fetchUrl = isDrive ? `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}` : directUrl;

        try {
            console.log(`[CloudSync] Original: ${url}`);
            console.log(`[CloudSync] Fetching: ${fetchUrl}`);

            const response = await fetch(fetchUrl);

            if (!response.ok) {
                const status = response.status;
                throw new Error(`Erro ${status}: Falha ao contactar a nuvem.`);
            }

            if (isDrive) {
                const wrapper = await response.json();
                if (!wrapper.contents) throw new Error("A nuvem não devolveu conteúdo válido.");
                return typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
            } else {
                // Direct fetch (Gist, Gist Raw, etc)
                const data = await response.json();
                return data;
            }
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            if (err.name === 'SyntaxError' || err.message.includes("Unexpected token")) {
                throw new Error("O ficheiro recebido não é um JSON válido. No Gist, certifica-te de que o ficheiro tem a extensão .json.");
            }
            throw err;
        }
    }
};
