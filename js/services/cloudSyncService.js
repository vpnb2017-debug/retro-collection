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

        // format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        // format 2: https://drive.google.com/open?id=FILE_ID
        const match = viewUrl.match(/\/d\/([^/?]+)/) || viewUrl.match(/id=([^&?]+)/);

        if (match && match[1]) {
            console.log(`[CloudSync] Extracted ID: ${match[1]}`);
            return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }

        return viewUrl; // Return as is if not a recognized Drive link
    },

    /**
     * Fetches the JSON database from the provided URL
     */
    async fetchDatabase(url) {
        const directUrl = this.getDirectLink(url);
        // v81: Switching to api.allorigins.win for better Google Drive redirect handling
        const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;

        try {
            console.log(`[CloudSync] Original: ${url}`);
            console.log(`[CloudSync] Fetching via AllOrigins: ${proxiedUrl}`);

            const response = await fetch(proxiedUrl);

            if (!response.ok) {
                const status = response.status;
                throw new Error(`Erro ${status}: Falha ao contactar o servidor de sincronização.`);
            }

            const wrapper = await response.json();
            // AllOrigins returns the content in a .contents property
            if (!wrapper.contents) throw new Error("A nuvem não devolveu conteúdo válido.");

            // AllOrigins might return the content as a string if it doesn't auto-detect JSON
            const data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;

            return data;
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            if (err.name === 'SyntaxError' || err.message.includes("Unexpected token")) {
                throw new Error("O ficheiro recebido não é um JSON válido. Verifica se o link é de um ficheiro .json.");
            }
            throw err;
        }
    }
};
