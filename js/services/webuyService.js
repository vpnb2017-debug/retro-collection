/**
 * Webuy / Wikipedia Resilient Cover Service — RetroCollection v138
 * Provides fast, high-resolution box art search with native browser CORS (pilicense=any).
 * Acts as primary fallback when TheGamesDB is blocked by CORS on GitHub Pages.
 */

const WebuyService = {
    /**
     * Search for covers using Bing Images (if local server.ps1 is available) or Wikipedia API
     * @param {string} rawTitle - Game name
     * @param {string} [platform] - Optional platform context
     * @returns {Promise<Array>} - Array of { id, title, image, platform, platformName, price, score, meta }
     */
    async search(rawTitle, platform = '') {
        if (!rawTitle) return [];

        // 1. If running on localhost with server.ps1, try local /proxy with Bing for 100% accurate results
        const isLocal = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.port === '8080';

        if (isLocal) {
            try {
                const query = platform ? `${rawTitle} ${platform}` : rawTitle;
                const targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query + " box art cover")}&form=HDRSC2`;
                const response = await fetch(`/proxy?url=${encodeURIComponent(targetUrl)}`);
                if (response.ok) {
                    const html = await response.text();
                    const results = this.parseBingResults(html, rawTitle, platform);
                    if (results.length > 0) return results;
                }
            } catch (e) {
                console.warn("[CoverSearch] Local Bing proxy failed, using Wikipedia fallback...", e);
            }
        }

        // 2. On GitHub Pages or standalone, query Wikipedia API natively via CORS with pilicense=any
        return await this.searchWikipediaCover(rawTitle, platform);
    },

    /**
     * Searches Wikipedia / Wikimedia for official box art covers using pilicense=any
     * Natively supports CORS (origin=*) with zero API keys required.
     */
    async searchWikipediaCover(rawTitle, rawPlatform = '') {
        try {
            console.log(`[CoverSearch] Searching Wikipedia Image API for: "${rawTitle}" (Platform: "${rawPlatform}")`);

            // Clean title: remove attached platform strings, brackets, etc.
            const platformRegex = /\s*[\(\[\-–]?\s*(mastersystem|master\s*system|megadrive|mega\s*drive|genesis|playstation\s*\d?|ps\d|psx|xbox(\s*360|\s*one|\s*series)?|nintendo\s*\d*|n64|snes|nes|super\s*nintendo|game\s*boy(\s*advance|\s*color)?|gba|gbc|gamecube|switch|wii\s*u?|ds|3ds|psp|vita|saturn|dreamcast|amiga|c64|atari\s*\d*|sega)[^\)\]]*[\)\]]?/gi;
            const cleanTitle = (rawTitle || '')
                .replace(platformRegex, '')
                .replace(/\(.*\)/g, '')
                .replace(/\[.*\]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            const subTitle = (cleanTitle.includes(':') || cleanTitle.includes('-'))
                ? cleanTitle.split(/[:\-]/)[0].trim()
                : '';

            // Build search terms list
            const queries = [];
            if (cleanTitle) {
                queries.push(`${cleanTitle} video game`);
                queries.push(cleanTitle);
            }
            if (subTitle && subTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
                queries.push(`${subTitle} video game`);
                queries.push(subTitle);
            }
            if (rawPlatform && cleanTitle) {
                queries.push(`${cleanTitle} ${rawPlatform}`);
            }

            const seenUrls = new Set();
            const results = [];

            for (const q of queries) {
                // Notice pilicense=any: MANDATORY to allow fair-use copyrighted box art thumbnails!
                const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=8&prop=pageimages|extracts&exintro=1&explaintext=1&exchars=300&pilicense=any&pithumbsize=600&format=json&origin=*`;
                
                try {
                    const response = await fetch(searchUrl);
                    if (!response.ok) continue;

                    const data = await response.json();
                    const pages = data.query?.pages || {};

                    for (const page of Object.values(pages)) {
                        const thumb = page.thumbnail?.source;
                        if (!thumb) continue;

                        const srcLower = thumb.toLowerCase();
                        // Ignore SVGs (logos/icons) and unwanted symbols
                        if (srcLower.endsWith('.svg') || (srcLower.includes('/commons/thumb/') && (srcLower.includes('logo') || srcLower.includes('symbol')))) {
                            continue;
                        }
                        if (seenUrls.has(thumb)) continue;
                        seenUrls.add(thumb);

                        const pageTitle = page.title || '';
                        let score = 0;
                        if (pageTitle.toLowerCase() === cleanTitle.toLowerCase() || pageTitle.toLowerCase().startsWith(`${cleanTitle.toLowerCase()} (`)) {
                            score += 100;
                        } else if (pageTitle.toLowerCase().includes(cleanTitle.toLowerCase())) {
                            score += 50;
                        }
                        if (srcLower.includes('cover') || srcLower.includes('box') || srcLower.includes('art') || srcLower.includes('pack')) {
                            score += 30;
                        }

                        // Auto-extract year from article snippet
                        let year = null;
                        const extract = page.extract || '';
                        const ym = extract.match(/\b(19\d{2}|20\d{2})\b/);
                        if (ym) year = parseInt(ym[0]);

                        results.push({
                            id: page.pageid,
                            title: pageTitle,
                            platformName: rawPlatform || 'Wikipedia',
                            image: thumb,
                            platform: "Wikipedia",
                            price: "",
                            score,
                            meta: {
                                year,
                                genre: '',
                                developer: '',
                                description: extract.substring(0, 350),
                                platform: rawPlatform
                            }
                        });
                    }
                } catch (fetchErr) {
                    console.warn("[CoverSearch] Wikipedia query failed for:", q, fetchErr);
                }

                if (results.length >= 6) break;
            }

            results.sort((a, b) => b.score - a.score);
            return results;
        } catch (err) {
            console.error("[CoverSearch] Wikipedia fallback error:", err);
            return [];
        }
    },

    parseBingResults(html, title, platform) {
        const results = [];
        const regex = /mediaurl=([^&]+)/g;
        let match;
        const uniqueImages = new Set();

        while ((match = regex.exec(html)) !== null) {
            try {
                const rawUrl = match[1];
                const decodedUrl = decodeURIComponent(rawUrl);

                if (uniqueImages.has(decodedUrl)) continue;
                if (!decodedUrl.startsWith('http')) continue;
                uniqueImages.add(decodedUrl);

                results.push({
                    title: title || "Resultado Online",
                    image: decodedUrl,
                    platform: "Bing Images",
                    platformName: platform || "Online",
                    price: "",
                    score: 50,
                    meta: {
                        year: null,
                        genre: '',
                        developer: '',
                        description: '',
                        platform: platform
                    }
                });

                if (results.length >= 12) break;
            } catch (e) {
                console.warn("[CoverSearch] Error parsing bing match", e);
            }
        }

        return results;
    }
};

export default WebuyService;
