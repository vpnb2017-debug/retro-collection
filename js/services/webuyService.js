
const WebuyService = {
    /**
     * Search for covers using Bing Images (Webuy fallback since Webuy blocks scraping)
     * @param {string} query - Game name
     * @returns {Promise<Array>} - Array of { title, image, platform, price }
     */
    async search(query) {
        if (!query) return [];

        // We add "box art cover" to ensure we get covers, not screenshots
        const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query + " box art cover")}&form=HDRSC2`;

        try {
            console.log(`[CoverSearch] Searching for: ${query}`);
            let html = "";

            // Try local PowerShell /proxy first if on localhost
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    const response = await fetch(`/proxy?url=${encodeURIComponent(targetUrl)}`);
                    if (response.ok) {
                        html = await response.text();
                    }
                } catch (e) {
                    console.warn("Local proxy failed, falling back to public CORS proxies...", e);
                }
            }

            // Fallback for GitHub Pages / static hosting or if local proxy fails
            if (!html) {
                const proxies = [
                    async (url) => {
                        const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
                        if (!r.ok) throw new Error("corsproxy failed");
                        return await r.text();
                    },
                    async (url) => {
                        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                        if (!r.ok) throw new Error("allorigins failed");
                        const json = await r.json();
                        return json.contents || "";
                    }
                ];

                for (const getHtml of proxies) {
                    try {
                        html = await getHtml(targetUrl);
                        if (html) break;
                    } catch (e) {
                        console.warn("CORS proxy attempt failed", e);
                    }
                }
            }

            if (!html) throw new Error("Não foi possível aceder à pesquisa no GitHub Pages.");

            return this.parseBingResults(html);
        } catch (error) {
            console.error("[CoverSearch] Error:", error);
            return [];
        }
    },

    parseBingResults(html) {
        const results = [];

        // Bing stores images in 'mediaurl=...' inside the href of anchor tags, url-encoded.
        // Regex to find mediaurl parameter
        const regex = /mediaurl=([^&]+)/g;

        let match;
        // We also want to try to capture the title if possible, but Bing HTML structure is complex.
        // For now, let's just get the images.

        const uniqueImages = new Set();

        while ((match = regex.exec(html)) !== null) {
            try {
                const rawUrl = match[1];
                const decodedUrl = decodeURIComponent(rawUrl);

                // Filter out obviously bad images or duplicates
                if (uniqueImages.has(decodedUrl)) continue;
                if (!decodedUrl.startsWith('http')) continue;

                uniqueImages.add(decodedUrl);

                results.push({
                    title: "Resultado Online", // We don't have the exact title easily, but that's fine
                    image: decodedUrl,
                    platform: "Online",
                    price: "" // No price data from Bing
                });

                if (results.length >= 12) break; // Limit to 12 results
            } catch (e) {
                console.warn("Error parsing bing match", e);
            }
        }

        return results;
    }
};

export default WebuyService;
