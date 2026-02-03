import { dbService } from './db.js';

export async function getPlatformOptions() {
    const platforms = await dbService.getAll('platforms');
    return platforms.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addPlatform(platform) {
    // Check if duplicate name
    const all = await getPlatformOptions();
    if (all.some(p => p.name.toLowerCase() === platform.name.toLowerCase())) {
        return null; // Already exists
    }
    return await dbService.add('platforms', platform);
}

export async function updatePlatform(platform) {
    return await dbService.add('platforms', platform);
}

export async function deletePlatform(id) {
    // 1. Find the platform name
    const all = await getPlatformOptions();
    const platform = all.find(p => p.id === id);
    if (!platform) return;

    // 2. Check if any games use it
    const games = await dbService.getAll('games');
    const consoles = await dbService.getAll('consoles');

    const inUse = [...games, ...consoles].some(item => item.platform === platform.name);

    if (inUse) {
        throw new Error(`Não é possível apagar a plataforma "${platform.name}" porque existem itens associados a ela.`);
    }

    return await dbService.delete('platforms', id);
}

export async function ensurePlatformExists(name) {
    if (!name) return;
    const cleanName = name.trim();
    const all = await getPlatformOptions();
    const exists = all.some(p => p.name.toLowerCase() === cleanName.toLowerCase());

    if (!exists) {
        await addPlatform({ name: cleanName });
        console.log(`Auto-created platform: ${cleanName}`);
    }
}
