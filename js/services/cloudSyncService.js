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

        // v82+: Gists don't need proxy (CORS allowed). Drive still needs AllOrigins bridge.
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

            let content = "";
            if (isDrive) {
                const wrapper = await response.json();
                if (!wrapper.contents) throw new Error("A nuvem não devolveu conteúdo válido.");
                content = wrapper.contents;
            } else {
                // v83: Fetch as text first to allow better diagnostics
                content = await response.text();
            }

            if (!content) throw new Error("Ficheiro vazio recebido da nuvem.");

            try {
                // v83: Trim and parse
                const data = typeof content === 'string' ? JSON.parse(content.trim()) : content;
                return data;
            } catch (parseErr) {
                console.error("[CloudSync] Parse error:", parseErr);
                const preview = typeof content === 'string' ? content.substring(0, 50).replace(/[\n\r]/g, ' ') : "Array/Object";
                throw new Error(`Erro no JSON recebido. Começa com: "${preview}...". Verifica se colaste o conteúdo corretamente no GitHub.`);
            }
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            throw err;
        }
    }
};
