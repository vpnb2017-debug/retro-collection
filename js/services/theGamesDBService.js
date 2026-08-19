/**
 * TheGamesDB.net API Service — RetroCollection v132
 * Handles searching and fetching official retail box art covers from TheGamesDB API v1.
 * Supports platform-aware search ranking, subtitle fallback, and rich metadata.
 */

const TGDB_PLATFORMS = {
    35: 'Sega Master System',
    18: 'Sega Genesis / Mega Drive',
    36: 'Sega Mega Drive',
    17: 'Sega Saturn',
    16: 'Sega Dreamcast',
    20: 'Sega Game Gear',
    21: 'Sega CD',
    22: 'Sega 32X',
    10: 'Sony PlayStation (PS1)',
    11: 'Sony PlayStation 2',
    12: 'Sony PlayStation 3',
    13: 'Sony PlayStation 4',
    4919: 'Sony PlayStation 5',
    14: 'Sony PSP',
    39: 'Sony PlayStation Vita',
    7: 'Nintendo NES',
    6: 'Super Nintendo (SNES)',
    3: 'Nintendo 64',
    2: 'Nintendo GameCube',
    9: 'Nintendo Wii',
    38: 'Nintendo Wii U',
    4971: 'Nintendo Switch',
    4: 'Nintendo Game Boy',
    41: 'Nintendo Game Boy Color',
    5: 'Nintendo Game Boy Advance',
    8: 'Nintendo DS',
    4912: 'Nintendo 3DS',
    15: 'Microsoft Xbox 360',
    4920: 'Microsoft Xbox One',
    4981: 'Microsoft Xbox Series X/S',
    1: 'PC',
    23: 'Atari 2600',
    24: 'Neo Geo',
    4911: 'Commodore Amiga',
    4927: 'Commodore 64',
    4913: 'Sinclair ZX Spectrum',
    4929: 'MSX'
};

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

function normalizePlatform(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isPlatformMatch(userPlat, dbPlatName) {
    if (!userPlat || !dbPlatName) return false;
    const u = normalizePlatform(userPlat);
    const d = normalizePlatform(dbPlatName);
    if (!u || !d) return false;
    if (u === d || d.includes(u) || u.includes(d)) return true;

    // Special aliases
    if (u.includes('mastersystem') && (d.includes('mastersystem') || d.includes('sms'))) return true;
    if (u.includes('megadrive') && (d.includes('megadrive') || d.includes('genesis'))) return true;
    if (u.includes('genesis') && (d.includes('megadrive') || d.includes('genesis'))) return true;
    if ((u === 'ps1' || u === 'psx' || u.includes('playstation1')) && (d.includes('playstation') && !d.includes('2') && !d.includes('3') && !d.includes('4') && !d.includes('5') && !d.includes('vita') && !d.includes('portable'))) return true;
    if (u.includes('snes') && (d.includes('snes') || d.includes('supernintendo'))) return true;
    if (u.includes('nes') && (d.includes('nes') || d.includes('nintendoentertainment'))) return true;
    if (u.includes('gameboyadvance') || u === 'gba') return d.includes('advance') || d.includes('gba');
    if (u.includes('gameboycolor') || u === 'gbc') return d.includes('color') || d.includes('gbc');
    if (u === 'gameboy' || u === 'gb') return d.includes('gameboy') && !d.includes('color') && !d.includes('advance');
    return false;
}

export const theGamesDBService = {
    /**
     * Search for game covers on TheGamesDB.net
     */
    async search(query, apiKey) {
        return await this.searchWithDetails(query, '', apiKey);
    },

    /**
     * Fetch game details (genre, developer, year, overview) by game ID — v123 Auto-Fill
     */
    async fetchGameDetails(gameId, apiKey) {
        if (!gameId || !apiKey) return null;
        try {
            const url = `https://api.thegamesdb.net/v1/Games/ByGameID?apikey=${encodeURIComponent(apiKey)}&id=${gameId}&fields=overview,genres,developers,rating,players,release_date,platform&include=platform,genres,developers`;
            const data = await fetchJsonWithFallback(url);
            if (!data || !data.data || !data.data.games) return null;

            const game = data.data.games[gameId] || Object.values(data.data.games)[0];
            if (!game) return null;

            const result = { year: null, genre: '', developer: '', description: '', players: '', platform: '' };

            if (game.release_date) {
                const m = game.release_date.match(/(\d{4})/);
                if (m) result.year = parseInt(m[1]);
            }
            if (game.overview) result.description = game.overview.substring(0, 400);
            if (game.players) result.players = game.players;

            const genreData = data.include?.genres?.data || {};
            if (game.genres) {
                const names = game.genres.map(id => genreData[id]?.name).filter(Boolean);
                result.genre = names.slice(0, 2).join(', ');
            }
            const devData = data.include?.developers?.data || {};
            if (game.developers) {
                const names = game.developers.map(id => devData[id]?.name).filter(Boolean);
                result.developer = names[0] || '';
            }

            const platData = data.include?.platform?.data || data.include?.platforms?.data || {};
            if (game.platform) {
                result.platform = platData[game.platform]?.name || TGDB_PLATFORMS[game.platform] || '';
            }

            return result;
        } catch (err) {
            console.warn('[TheGamesDB] fetchGameDetails error:', err);
            return null;
        }
    },

    /**
     * Search with include fields for richer auto-fill data & platform ranking
     * @param {string} rawTitle - Game Title
     * @param {string} platformOrKey - User selected platform (optional) or apiKey
     * @param {string} [maybeKey] - Api Key if platform is passed
     */
    async searchWithDetails(rawTitle, platformOrKey, maybeKey) {
        let userPlatform = '';
        let apiKey = '';

        if (maybeKey !== undefined) {
            userPlatform = (platformOrKey || '').trim();
            apiKey = (maybeKey || '').trim();
        } else {
            apiKey = (platformOrKey || '').trim();
        }

        if (!rawTitle || !apiKey) return [];

        // Clean title: remove attached platform strings like "Speedball MASTERSYSTEM" or "Sonic (Mega Drive)"
        const platformRegex = /\s*[\(\[\-–]?\s*(mastersystem|master\s*system|megadrive|mega\s*drive|genesis|playstation\s*\d?|ps\d|psx|xbox(\s*360|\s*one|\s*series)?|nintendo\s*64|n64|snes|nes|super\s*nintendo|game\s*boy(\s*advance|\s*color)?|gba|gbc|gamecube|switch|wii\s*u?|ds|3ds|psp|vita|saturn|dreamcast|amiga|c64|atari\s*\d*|sega)\s*[\)\]]?/gi;
        const cleanTitle = rawTitle.replace(platformRegex, '').trim();

        // Build search terms list
        const searchTerms = [];
        if (cleanTitle) searchTerms.push(cleanTitle);
        if (rawTitle.trim() && rawTitle.trim().toLowerCase() !== cleanTitle.toLowerCase()) {
            searchTerms.push(rawTitle.trim());
        }

        // Subtitle stripping: "Speedball 2: Brutal Deluxe" -> "Speedball 2"
        if (cleanTitle.includes(':') || cleanTitle.includes('-')) {
            const baseSub = cleanTitle.split(/[:\-]/)[0].trim();
            if (baseSub && !searchTerms.includes(baseSub)) {
                searchTerms.push(baseSub);
            }
        }

        for (const term of searchTerms) {
            try {
                console.log(`[TheGamesDB] Querying API for: "${term}" (Platform context: "${userPlatform}")`);
                const searchUrl = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${encodeURIComponent(apiKey)}&name=${encodeURIComponent(term)}&fields=overview,genres,developers,release_date,platform&include=platform,genres,developers`;
                const data = await fetchJsonWithFallback(searchUrl);

                if (data?.data?.games?.length > 0) {
                    const games = data.data.games.slice(0, 16); // Check up to 16 matches
                    const gameIds = games.map(g => g.id).join(',');
                    const imagesUrl = `https://api.thegamesdb.net/v1/Games/Images?apikey=${encodeURIComponent(apiKey)}&games_id=${gameIds}`;
                    const imgData = await fetchJsonWithFallback(imagesUrl);
                    const baseUrl = imgData.data?.base_url?.original || imgData.data?.base_url?.large || "https://cdn.thegamesdb.net/images/original/";

                    const imagesObj = imgData.data?.images || {};
                    const platMap = data.include?.platform?.data || data.include?.platforms?.data || {};
                    const genreMap = data.include?.genres?.data || {};
                    const devMap = data.include?.developers?.data || {};

                    const results = [];

                    games.forEach(game => {
                        const gameImages = imagesObj[game.id] || [];
                        const frontCovers = gameImages.filter(img => img.type === 'boxart' && (img.side === 'front' || !img.side));
                        
                        const platName = platMap[game.platform]?.name || TGDB_PLATFORMS[game.platform] || '';
                        const genres = (game.genres || []).map(id => genreMap[id]?.name).filter(Boolean);
                        const developers = (game.developers || []).map(id => devMap[id]?.name).filter(Boolean);
                        
                        let year = null;
                        if (game.release_date) {
                            const m = game.release_date.match(/(\d{4})/);
                            if (m) year = parseInt(m[1]);
                        }

                        // Calculate platform match score
                        const isMatch = isPlatformMatch(userPlatform, platName);
                        const isExactTitle = game.game_title.toLowerCase() === cleanTitle.toLowerCase();
                        let score = 0;
                        if (isMatch) score += 100;
                        if (isExactTitle) score += 50;

                        frontCovers.forEach(img => {
                            const imgPath = img.filename;
                            const fullImgUrl = imgPath.startsWith('http') ? imgPath : `${baseUrl}${imgPath}`;
                            results.push({
                                id: game.id,
                                title: game.game_title,
                                platformName: platName,
                                image: fullImgUrl,
                                platform: "TheGamesDB",
                                price: "",
                                score,
                                isPlatformMatch: isMatch,
                                meta: {
                                    year,
                                    genre: genres.slice(0, 2).join(', '),
                                    developer: developers[0] || '',
                                    description: (game.overview || '').substring(0, 400),
                                    platform: platName
                                }
                            });
                        });
                    });

                    if (results.length > 0) {
                        // Sort so matching platform covers appear first, then highest score
                        results.sort((a, b) => b.score - a.score);
                        return results;
                    }
                }
            } catch (error) {
                console.error(`[TheGamesDB] searchWithDetails Error for "${term}":`, error);
                if (term === searchTerms[searchTerms.length - 1]) throw error;
            }
        }

        return [];
    }
};
