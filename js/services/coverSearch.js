export const coverSearchService = {
    // Utility to fetch an image from a URL and convert it to Base64 for IndexedDB storage
    async convertUrlToBase64(url) {
        try {
            let finalResponse;

            try {
                // 1. Try direct fetch first
                finalResponse = await fetch(url);
                if (!finalResponse.ok) throw new Error("Direct fetch failed");
            } catch (directError) {
                console.warn("Direct fetch failed, trying proxy 1 (corsproxy.io)...", directError);
                try {
                    // 2. Fallback Proxy 1: corsproxy.io
                    const proxyUrl1 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                    finalResponse = await fetch(proxyUrl1);
                    if (!finalResponse.ok) throw new Error("Proxy 1 failed");
                } catch (proxy1Error) {
                    console.warn("Proxy 1 failed, trying proxy 2 (allorigins)...", proxy1Error);
                    // 3. Fallback Proxy 2: allorigins.win
                    const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                    finalResponse = await fetch(proxyUrl2);
                    if (!finalResponse.ok) throw new Error(`All proxies failed. Status: ${finalResponse.status}`);
                }
            }

            const blob = await finalResponse.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (err) => {
                    console.error("FileReader error:", err);
                    reject(new Error("Erro ao converter imagem. Tente outro link ou faça upload manual."));
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Conversion Error", e);
            throw new Error("Não foi possível carregar a imagem. Verifique se o link é direto ou se o site permite acesso (CORS).");
        }
    }
};
