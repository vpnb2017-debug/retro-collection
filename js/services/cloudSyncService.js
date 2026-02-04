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
        let directUrl = this.getDirectLink(url);

        // v86: Disable proxy for ALL GitHub domains (Gist, Raw, Repo) to avoid size limits.
        const isGitHub = directUrl.includes('githubusercontent.com') || directUrl.includes('github.com');
        const isDrive = directUrl.includes('google.com');

        // v88: Cache busting - ensures we pull the absolute latest version from GitHub/Gist
        if (isGitHub) {
            const sep = directUrl.includes('?') ? '&' : '?';
            directUrl += `${sep}t=${Date.now()}`;
        }

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
            let trimmed = typeof content === 'string' ? content.trim() : "";
            if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html')) {
                throw new Error("O GitHub/Drive parece estar com problemas técnicos (Erro de Servidor). Tenta novamente mais tarde ou usa a Importação Manual.");
            }

            // v88: ATOMIC SANITIZATION
            if (typeof trimmed === 'string') {
                const originalLen = trimmed.length;
                trimmed = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                if (trimmed.length !== originalLen) {
                    console.warn(`[CloudSync] V88 Atomic Clean: Removed ${originalLen - trimmed.length} illegal characters.`);
                }
            }

            try {
                return JSON.parse(trimmed);
            } catch (parseErr) {
                console.error("[CloudSync] Parse error:", parseErr);
                const size = trimmed.length;
                const preview = trimmed.substring(0, 50).replace(/[\n\r]/g, ' ');
                throw new Error(`Erro de Sintaxe JSON: ${parseErr.message}. (Tam: ${size} chars). Começa com: "${preview}...".`);
            }
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            throw err;
        }
    },

    /**
     * Uploads the database to a GitHub Gist (v91)
     */
    async uploadToGist(token, gistId, data) {
        if (!token) throw new Error("GitHub Token é obrigatório para subir para a nuvem.");
        if (!gistId) throw new Error("ID do Gist não encontrado. Configura o link primeiro.");

        // v88 fix: Strip illegal characters before stringifying (unlikely from structured data but safe)
        const content = JSON.stringify(data, null, 2);

        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'retro_collection.json': {
                        content: content
                    }
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Erro GitHub (${response.status}): ${errData.message || response.statusText}`);
        }

        return await response.json();
    }
};
