
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

            // 1. If running on localhost with server.ps1, use local /proxy for 100% accurate Bing results
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    const response = await fetch(`/proxy?url=${encodeURIComponent(targetUrl)}`);
                    if (response.ok) {
                        const html = await response.text();
                        const results = this.parseBingResults(html);
                        if (results.length > 0) return results;
                    }
                } catch (e) {
                    console.warn("Local proxy failed, falling back to Wikipedia API...", e);
                }
            }

            // 2. On GitHub Pages / Production without server.ps1, query Wikipedia API natively via CORS
            return await this.searchWikipediaCover(query);
        } catch (error) {
            console.error("[CoverSearch] Error:", error);
            return [];
        }
    },

    async searchWikipediaCover(title) {
        try {
            console.log(`[CoverSearch] Searching Wikipedia Image API for: ${title}`);
            const cleanTitle = title.replace(/\(.*\)/g, '').trim();
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanTitle + " video game")}&gsrlimit=8&prop=pageimages&pithumbsize=600&format=json&origin=*`;
            
            const response = await fetch(searchUrl);
            if (!response.ok) return [];

            const data = await response.json();
            if (!data.query || !data.query.pages) return [];

            const results = [];
            Object.values(data.query.pages).forEach(page => {
                if (page.thumbnail && page.thumbnail.source) {
                    results.push({
                        title: `${page.title}`,
                        image: page.thumbnail.source,
                        platform: "Wikipedia",
                        price: ""
                    });
                }
            });

            return results;
        } catch (err) {
            console.error("[CoverSearch] Wikipedia fallback error:", err);
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
