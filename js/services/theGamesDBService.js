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

        const searchTerms = [query.trim()];
        const cleanTitle = query.replace(/\s+(playstation|ps\d|xbox|nintendo|sega|game boy|pc|switch|wii|ds|3ds|psp|vita|mega drive|snes|nes|genesis|saturn|dreamcast).*/i, '').trim();
        if (cleanTitle && cleanTitle.toLowerCase() !== query.trim().toLowerCase()) {
            searchTerms.push(cleanTitle);
        }

        for (const term of searchTerms) {
            try {
                console.log(`[TheGamesDB] Searching for term: "${term}"`);
                const searchUrl = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(term)}`;
                
                const data = await fetchJsonWithFallback(searchUrl);
                if (data && data.data && data.data.games && data.data.games.length > 0) {
                    const games = data.data.games.slice(0, 8); // Top 8 matching games
                    const gameIds = games.map(g => g.id).join(',');

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

                    if (results.length > 0) return results;
                }
            } catch (error) {
                console.error(`[TheGamesDB] Search Error for "${term}":`, error);
                if (term === searchTerms[searchTerms.length - 1]) throw error;
            }
        }

        return [];
    },

    /**
     * Fetch game details (genre, developer, year, overview) by game ID — v123 Auto-Fill
     * @param {number} gameId
     * @param {string} apiKey
     * @returns {Promise<{year, genre, developer, description, players}|null>}
     */
    async fetchGameDetails(gameId, apiKey) {
        if (!gameId || !apiKey) return null;
        try {
            const url = `https://api.thegamesdb.net/v1/Games/ByGameID?apikey=${encodeURIComponent(apiKey)}&id=${gameId}&fields=overview,genres,developers,rating,players,release_date`;
            const data = await fetchJsonWithFallback(url);
            if (!data || !data.data || !data.data.games) return null;

            const game = data.data.games[gameId] || Object.values(data.data.games)[0];
            if (!game) return null;

            const result = { year: null, genre: '', developer: '', description: '', players: '' };

            if (game.release_date) {
                const m = game.release_date.match(/(\d{4})/);
                if (m) result.year = parseInt(m[1]);
            }
            if (game.overview) result.description = game.overview.substring(0, 400);
            if (game.players) result.players = game.players;

            // Resolve genre IDs
            if (game.genres && data.include?.genres?.data) {
                const genreData = data.include.genres.data;
                const names = game.genres.map(id => genreData[id]?.name).filter(Boolean);
                result.genre = names.slice(0, 2).join(', ');
            }
            // Resolve developer IDs
            if (game.developers && data.include?.developers?.data) {
                const devData = data.include.developers.data;
                const names = game.developers.map(id => devData[id]?.name).filter(Boolean);
                result.developer = names[0] || '';
            }

            return result;
        } catch (err) {
            console.warn('[TheGamesDB] fetchGameDetails error:', err);
            return null;
        }
    },

    /**
     * Search with include fields for richer auto-fill data — used with fetchGameDetails
     */
    async searchWithDetails(query, apiKey) {
        if (!query || !apiKey) return [];
        const searchTerms = [query.trim()];
        const cleanTitle = query.replace(/\s+(playstation|ps\d|xbox|nintendo|sega|game boy|pc|switch|wii|ds|3ds|psp|vita|mega drive|snes|nes|genesis|saturn|dreamcast).*/i, '').trim();
        if (cleanTitle && cleanTitle.toLowerCase() !== query.trim().toLowerCase()) {
            searchTerms.push(cleanTitle);
        }

        for (const term of searchTerms) {
            try {
                const searchUrl = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(term)}&fields=overview,genres,developers,release_date&include=genres,developers`;
                const data = await fetchJsonWithFallback(searchUrl);
                if (data?.data?.games?.length > 0) {
                    const games = data.data.games.slice(0, 8);
                    const gameIds = games.map(g => g.id).join(',');
                    const imagesUrl = `https://api.thegamesdb.net/v1/Games/Images?apikey=${encodeURIComponent(apiKey)}&games_id=${gameIds}`;
                    const imgData = await fetchJsonWithFallback(imagesUrl);
                    const baseUrl = imgData.data?.base_url?.original || "https://cdn.thegamesdb.net/images/original/";
                    const results = [];
                    const imagesObj = imgData.data?.images || {};
                    const genreMap = data.include?.genres?.data || {};
                    const devMap = data.include?.developers?.data || {};

                    games.forEach(game => {
                        const gameImages = imagesObj[game.id] || [];
                        const frontCovers = gameImages.filter(img => img.type === 'boxart' && (img.side === 'front' || !img.side));
                        const genres = (game.genres || []).map(id => genreMap[id]?.name).filter(Boolean);
                        const developers = (game.developers || []).map(id => devMap[id]?.name).filter(Boolean);
                        let year = null;
                        if (game.release_date) { const m = game.release_date.match(/(\d{4})/); if (m) year = parseInt(m[1]); }

                        frontCovers.forEach(img => {
                            const imgPath = img.filename;
                            const fullImgUrl = imgPath.startsWith('http') ? imgPath : `${baseUrl}${imgPath}`;
                            results.push({
                                id: game.id,
                                title: game.game_title,
                                image: fullImgUrl,
                                platform: "TheGamesDB",
                                price: "",
                                meta: { year, genre: genres.slice(0,2).join(', '), developer: developers[0] || '', description: (game.overview || '').substring(0, 400) }
                            });
                        });
                    });
                    if (results.length > 0) return results;
                }
            } catch (error) {
                console.error(`[TheGamesDB] searchWithDetails Error for "${term}":`, error);
                if (term === searchTerms[searchTerms.length - 1]) throw error;
            }
        }
        return [];
    }
};
