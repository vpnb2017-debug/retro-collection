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
        // v109: Search only by title (without platform) for better results
        const query = `${title} video game`.trim();
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

        try {
            console.log(`[Metadata v109] Searching for: ${query}`);
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            const results = searchData.query.search || [];
            if (results.length === 0) return null;

            // v73: Semantic Scoring Logic
            const searchWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 1);
            const searchNumbers = title.match(/\b\d+\b/g) || [];
            const gamingKeywords = ['video game', 'game', 'series', 'console', 'developed', 'software'];

            let bestPage = null;
            let highestScore = -200;

            // Deep search in top 10 results
            for (let i = 0; i < Math.min(10, results.length); i++) {
                const res = results[i];
                const resTitle = res.title.toLowerCase();
                const snippet = res.snippet.toLowerCase();
                let score = 0;

                // 1. Exact or Partial Title Match
                if (resTitle === title.toLowerCase()) score += 100;
                else if (resTitle.includes(title.toLowerCase())) score += 40;

                // 2. Significant Word Matching (Key for Moto GP 3 vs Ride)
                const matchedWords = searchWords.filter(w => resTitle.includes(w) || snippet.includes(w));
                const matchRatio = matchedWords.length / searchWords.length;
                if (matchRatio === 1) score += 50;
                else if (matchRatio < 0.5) score -= 100; // Hard penalty if missing half the words

                // 3. Gaming Context
                if (gamingKeywords.some(k => snippet.includes(k) || resTitle.includes(k))) score += 20;
                if (resTitle.includes('(video game)')) score += 50;

                // 4. Numerical Integrity (Critical for series)
                const resNumbers = (resTitle + " " + snippet).match(/\b\d+\b/g) || [];
                if (searchNumbers.length > 0) {
                    const allMatch = searchNumbers.every(n => resNumbers.includes(n));
                    const anyMismatch = resNumbers.some(n => !searchNumbers.includes(n) && n.length > 1 && !searchNumbers.some(sn => n.includes(sn)));

                    if (allMatch) score += 60;
                    if (anyMismatch && !allMatch) score -= 120; // Extra penalty for wrong version
                }

                console.log(`[Metadata] v73 Scoring "${res.title}": ${score} (Words: ${matchedWords.length}/${searchWords.length})`);
                if (score > highestScore) {
                    highestScore = score;
                    bestPage = res;
                }
            }

            if (!bestPage || highestScore < -50) bestPage = results[0];

            const pageId = bestPage.pageid;
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
