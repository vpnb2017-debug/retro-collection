/**
 * Cloud Sync Service
 * Handles fetching database from cloud providers (initially Google Drive)
 */

export const cloudSyncService = {
    /**
     * Converts a Google Drive share link into a direct download link
     */
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
        // v79+: Use a CORS Proxy to bypass Google Drive's restrictions
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;

        try {
            console.log(`[CloudSync] Original: ${url}`);
            console.log(`[CloudSync] Fetching via Proxy: ${proxiedUrl}`);

            const response = await fetch(proxiedUrl);

            if (!response.ok) {
                // v80: Provide more details for diagnostics
                const status = response.status;
                let errorMsg = `Erro ${status}: Falha ao descarregar cloud link.`;

                if (status === 403) errorMsg = "Erro 403: Acesso Negado. Certifica-te de que o ficheiro está partilhado como 'Qualquer pessoa com o link'.";
                if (status === 404) errorMsg = "Erro 404: Ficheiro não encontrado. Verifica se o link ainda é válido.";

                throw new Error(errorMsg);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error("[CloudSync] Error:", err);
            // Re-throw with more context if it's a parse error
            if (err.name === 'SyntaxError') {
                throw new Error("O ficheiro recebido não é um JSON válido. Verifica se o link é de um ficheiro .json.");
            }
            throw err;
        }
    }
};
