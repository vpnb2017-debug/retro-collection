/**
 * TheGamesDB.net API Service
 * Handles searching and fetching official retail box art covers from TheGamesDB API v1
 */

async function fetchJsonWithFallback(targetUrl) {
    // 1. Try local PowerShell /proxy if on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
            const res = await fetch(`/proxy?url=${encodeURIComponent(targetUrl)}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("[TheGamesDB] Local proxy failed, trying direct fetch...", e);
        }
    }

    // 2. Try direct fetch
    try {
        const res = await fetch(targetUrl);
        if (res.ok) return await res.json();
        if (res.status === 401) throw new Error("Chave API do TheGamesDB inválida (401). Verifica a tua chave nas Definições.");
        if (res.status === 403) throw new Error("Acesso negado pela API do TheGamesDB (403). Verifica se a tua chave é válida.");
    } catch (e) {
        if (e.message.includes("401") || e.message.includes("403")) throw e;
        console.warn("[TheGamesDB] Direct fetch failed, trying CORS proxy fallback...", e);
    }

    // 3. Fallback for GitHub Pages CORS restrictions
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
    ];

    for (const pUrl of proxies) {
        try {
            const res = await fetch(pUrl);
            if (res.ok) {
                const data = await res.json();
                if (data) return data;
            }
        } catch (e) {
            console.warn("[TheGamesDB] CORS proxy failed:", pUrl, e);
        }
    }

    throw new Error("Não foi possível ligar à API do TheGamesDB.net. Verifica a ligação ou a tua API Key.");
}

export const theGamesDBService = {
    /**
     * Search for game covers on TheGamesDB.net
     * @param {string} query - Game title / search term
     * @param {string} apiKey - User's TheGamesDB API key
     * @returns {Promise<Array>} - Array of cover objects { title, image, platform, price }
     */
    async search(query, apiKey) {
        if (!query || !apiKey) return [];

        try {
            console.log(`[TheGamesDB] Searching for: ${query}`);
            const searchUrl = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(query)}`;
            
            const data = await fetchJsonWithFallback(searchUrl);
            if (!data || !data.data || !data.data.games || data.data.games.length === 0) {
                console.log("[TheGamesDB] No game matches found.");
                return [];
            }

            const games = data.data.games.slice(0, 6); // Top 6 matching games
            const gameIds = games.map(g => g.id).join(',');

            // Fetch images associated with these games
            const imagesUrl = `https://api.thegamesdb.net/v1/Games/Images?apikey=${encodeURIComponent(apiKey)}&games_id=${gameIds}`;
            const imgData = await fetchJsonWithFallback(imagesUrl);

            const baseUrl = imgData.data?.base_url?.original || imgData.data?.base_url?.large || "https://cdn.thegamesdb.net/images/original/";

            const results = [];
            const imagesObj = imgData.data?.images || {};

            games.forEach(game => {
                const gameImages = imagesObj[game.id] || [];
                // Filter specifically for front box art
                const frontCovers = gameImages.filter(img => img.type === 'boxart' && (img.side === 'front' || !img.side));
                
                frontCovers.forEach(img => {
                    const imgPath = img.filename;
                    const fullImgUrl = imgPath.startsWith('http') ? imgPath : `${baseUrl}${imgPath}`;
                    
                    results.push({
                        title: game.game_title,
                        image: fullImgUrl,
                        platform: "TheGamesDB",
                        price: ""
                    });
                });
            });

            return results;
        } catch (error) {
            console.error("[TheGamesDB] Search Error:", error);
            throw error;
        }
    }
};
