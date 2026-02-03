export const coverSearchService = {
    // Utility to fetch an image from a URL and convert it to Base64 for IndexedDB storage
    async convertUrlToBase64(url) {
        try {
            let finalResponse;

            try {
                // Try direct fetch first
                finalResponse = await fetch(url);
                if (!finalResponse.ok) throw new Error("Direct fetch failed");
            } catch (directError) {
                console.warn("Direct fetch failed (likely CORS), trying public proxy...", directError);
                // Fallback: Use a public CORS proxy for static sites (GitHub Pages)
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                finalResponse = await fetch(proxyUrl);
                if (!finalResponse.ok) throw new Error(`Proxy fetch failed: ${finalResponse.status}`);
            }

            const blob = await finalResponse.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (err) => {
                    console.error("FileReader error:", err);
                    reject(new Error("Erro ao converter imagem para dados locais."));
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Conversion Error", e);
            throw new Error("Não foi possível carregar a imagem. Verifique se o link é direto ou se o site permite acesso (CORS).");
        }
    }
};
