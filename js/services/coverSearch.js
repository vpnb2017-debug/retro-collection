export const coverSearchService = {
    // Utility to fetch an image from a URL and convert it to Base64 for IndexedDB storage
    async convertUrlToBase64(url) {
        console.log("Iniciando conversão de imagem:", url);

        try {
            // Priority 1: Try Canvas-based conversion (most robust for images)
            try {
                return await this.loadViaCanvas(url);
            } catch (canvasErr) {
                console.warn("Canvas load failed, trying Proxy methodology...", canvasErr);
            }

            // Priority 2: Try different proxies
            const proxies = [
                (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
                (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
                (u) => `https://image-proxy.deno.dev/fetch/${u}` // Deno proxy specialized for images
            ];

            for (const getProxyUrl of proxies) {
                try {
                    const proxyUrl = getProxyUrl(url);
                    console.log("Trying proxy:", proxyUrl);
                    const response = await fetch(proxyUrl);
                    if (!response.ok) continue;
                    const blob = await response.blob();
                    return await this.blobToBase64(blob);
                } catch (e) {
                    continue;
                }
            }

            throw new Error("Nenhum método de carregamento funcionou.");
        } catch (e) {
            console.error("Erro final na conversão:", e);
            throw new Error(`Não foi possível carregar esta capa. O site de origem bloqueou o acesso. Tente copiar e colar a imagem manualmente ou use outro link.`);
        }
    },

    loadViaCanvas(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.onerror = () => reject(new Error("Erro ao carregar via Image object"));
            // Add cache buster to bypass some CDN/CORS issues
            img.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'cache_bust=' + Date.now();
        });
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};
