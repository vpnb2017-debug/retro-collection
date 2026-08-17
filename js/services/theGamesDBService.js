/**
 * TheGamesDB.net API Service
 * Handles searching and fetching official retail box art covers from TheGamesDB API v1
 */

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
            
            const response = await fetch(searchUrl);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Chave de API do TheGamesDB inválida ou não autorizada (Erro 401).");
                }
                throw new Error(`Erro na API TheGamesDB (${response.status})`);
            }

            const data = await response.json();
            if (!data.data || !data.data.games || data.data.games.length === 0) {
                console.log("[TheGamesDB] No game matches found.");
                return [];
            }

            const games = data.data.games.slice(0, 6); // Top 6 matching games
            const gameIds = games.map(g => g.id).join(',');

            // Fetch images associated with these games
            const imagesUrl = `https://api.thegamesdb.net/v1/Games/Images?apikey=${encodeURIComponent(apiKey)}&games_id=${gameIds}`;
            const imgResponse = await fetch(imagesUrl);
            if (!imgResponse.ok) {
                throw new Error(`Erro ao obter imagens do TheGamesDB (${imgResponse.status})`);
            }

            const imgData = await imgResponse.json();
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
