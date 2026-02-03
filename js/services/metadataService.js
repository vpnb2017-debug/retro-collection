/**
 * Metadata Intelligence Service
 * Uses Wikipedia API (MediaWiki) to find game information without API keys.
 */

export const metadataService = {
    /**
     * Search for a game and return metadata
     * @param {string} title - Game Title
     * @param {string} platform - Optional platform context
     */
    async fetchMetadata(title, platform = '') {
        const query = `${title} ${platform} video game`.trim();
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

        try {
            console.log(`[Metadata] Searching for: ${query}`);
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (!searchData.query.search || searchData.query.search.length === 0) {
                return null;
            }

            // Get first result details
            const pageId = searchData.query.search[0].pageid;
            const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|revisions&exintro&explaintext&rvprop=content&rvsection=0&pageids=${pageId}&format=json&origin=*`;

            const contentRes = await fetch(contentUrl);
            const contentData = await contentRes.json();
            const page = contentData.query.pages[pageId];

            const extract = page.extract || "";
            const wikitext = page.revisions?.[0]?.['*'] || "";

            return this.parseWikipediaData(extract, wikitext, title);
        } catch (error) {
            console.error("[Metadata] Error:", error);
            return null;
        }
    },

    parseWikipediaData(extract, wikitext, originalTitle) {
        const data = {
            year: '',
            genre: '',
            developer: '',
            description: extract.substring(0, 300) + (extract.length > 300 ? '...' : '')
        };

        // 1. Try to find Year in Extract (e.g. "released in 1991")
        const yearMatch = extract.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) data.year = yearMatch[0];

        // 2. Try to find Developer in Extract (e.g. "developed by Sega")
        const devMatch = extract.match(/developed by ([^,.]+)/i) || extract.match(/developer ([^,.]+)/i);
        if (devMatch) data.developer = devMatch[1].trim();

        // 3. Try to find Genre (e.g. "platform game", "role-playing game")
        const genres = ['platform', 'role-playing', 'action', 'adventure', 'racing', 'sports', 'fighting', 'shooter', 'strategy', 'puzzle', 'rpg', 'fps'];
        for (const g of genres) {
            if (extract.toLowerCase().includes(g)) {
                data.genre = g.charAt(0).toUpperCase() + g.slice(1);
                break;
            }
        }

        // 4. Refine with Wikitext (Infobox parsing - simpler regex)
        // This is a bit "naive" but often works for typical Wikipedia Infoboxes
        if (wikitext) {
            const wYear = wikitext.match(/released\s*=\s*.*((19|20)\d{2})/i);
            if (wYear) data.year = wYear[1];

            const wDev = wikitext.match(/developer\s*=\s*\[?\[?([^|\]\n]+)/i);
            if (wDev && !data.developer) data.developer = wDev[1].trim();

            const wGenre = wikitext.match(/genre\s*=\s*\[?\[?([^|\]\n]+)/i);
            if (wGenre && (!data.genre || data.genre === 'Action')) data.genre = wGenre[1].trim();
        }

        // Cleanup
        if (data.developer) data.developer = data.developer.replace(/\[\[|\]\]/g, '').split('|')[0].trim();
        if (data.genre) data.genre = data.genre.replace(/\[\[|\]\]/g, '').split('|')[0].trim();

        return data;
    }
};
