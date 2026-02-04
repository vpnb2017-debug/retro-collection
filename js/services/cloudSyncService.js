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

        // format 4: GitHub Repository (github.com/.../blob/main/file.json)
        // or direct raw link (raw.githubusercontent.com/...)
        if (viewUrl.includes('github.com') && viewUrl.includes('/blob/')) {
            const rawRepo = viewUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            console.log(`[CloudSync] Repo link converted to raw: ${rawRepo}`);
            return rawRepo;
        }

        return viewUrl; // Return as is if already a direct/raw link or unrecognized
    },

    /**
     * Fetches the JSON database from the provided URL
     */
    async fetchDatabase(url) {
        const directUrl = this.getDirectLink(url);

        // v86: Disable proxy for ALL GitHub domains (Gist, Raw, Repo) to avoid size limits.
        const isGitHub = directUrl.includes('githubusercontent.com') || directUrl.includes('github.com');
        const isDrive = directUrl.includes('google.com');

        const fetchUrl = (isDrive && !isGitHub)
            ? `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`
            : directUrl;

        try {
            console.log(`[CloudSync] Original: ${url}`);
            console.log(`[CloudSync] Fetching (${isGitHub ? 'GITHUB' : 'NORMAL'}): ${fetchUrl}`);

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

            // v85: Detect if we received an HTML error page instead of JSON
            const trimmed = typeof content === 'string' ? content.trim() : "";
            if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html')) {
                throw new Error("O GitHub/Drive parece estar com problemas técnicos (Erro de Servidor). Tenta novamente mais tarde ou usa a Importação Manual.");
            }

            try {
                // v83+: Trim and parse
                const data = typeof content === 'string' ? JSON.parse(trimmed) : content;
                return data;
            } catch (parseErr) {
                console.error("[CloudSync] Parse error:", parseErr);
                const size = typeof content === 'string' ? content.length : "N/A";
                const preview = trimmed.substring(0, 50).replace(/[\n\r]/g, ' ');
                // v84: Expose technical error for precise debugging
                throw new Error(`Erro de Sintaxe JSON: ${parseErr.message}. (Tam: ${size} chars). Começa com: "${preview}...".`);
            }
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            throw err;
        }
    }
};
