/**
 * Theme Service — RetroCollection v125
 * Manages retro visual themes, persistence, and dynamic color palettes
 */

export const THEMES = [
    {
        id: 'amber',
        name: 'Retro Amber',
        icon: '🕹️',
        subtitle: 'Arcade Clássico',
        swatches: ['#1e1e24', '#ff9f0a', '#ff7950'],
        accent: '#ff9f0a',
        chartColors: ['#ff9f0a', '#ff7950', '#ffc978', '#22c55e', '#3b82f6', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#60a5fa']
    },
    {
        id: 'gameboy',
        name: 'Game Boy DMG',
        icon: '🟢',
        subtitle: 'Nintendo 1989',
        swatches: ['#1f271b', '#8bac0f', '#9bbc0f'],
        accent: '#8bac0f',
        chartColors: ['#8bac0f', '#9bbc0f', '#306230', '#cadc9f', '#4a784a', '#688c58', '#b8d488', '#557733']
    },
    {
        id: 'ps1',
        name: 'PlayStation 1',
        icon: '⚪',
        subtitle: 'Sony 1994',
        swatches: ['#18191f', '#00d2ff', '#ff3366'],
        accent: '#00d2ff',
        chartColors: ['#00d2ff', '#ff3366', '#ffd000', '#00e676', '#7c4dff', '#ff9100', '#40c4ff', '#e040fb']
    },
    {
        id: 'megadrive',
        name: 'Mega Drive 16-Bit',
        icon: '🔵',
        subtitle: 'Sega 1988',
        swatches: ['#0c1021', '#00b4d8', '#ffd166'],
        accent: '#00b4d8',
        chartColors: ['#00b4d8', '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#90e0ef', '#f77f00', '#e63946']
    },
    {
        id: 'snes',
        name: 'Super Nintendo',
        icon: '🟣',
        subtitle: 'SNES 1990',
        swatches: ['#1a1824', '#a78bfa', '#f472b6'],
        accent: '#a78bfa',
        chartColors: ['#8b5cf6', '#ec4899', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#818cf8']
    },
    {
        id: 'oled',
        name: 'OLED Pure Dark',
        icon: '🖤',
        subtitle: 'Preto Absoluto',
        swatches: ['#000000', '#ffaa00', '#ff5500'],
        accent: '#ffaa00',
        chartColors: ['#ffaa00', '#ff5500', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#06b6d4', '#f97316']
    },
    {
        id: 'synthwave',
        name: 'Synthwave 80s',
        icon: '💖',
        subtitle: 'Neon Outrun',
        swatches: ['#150921', '#ff2a85', '#05d9e8'],
        accent: '#ff2a85',
        chartColors: ['#ff2a85', '#05d9e8', '#ffe700', '#d300c5', '#7700a6', '#00f0ff', '#ff71ce', '#01cdfe']
    }
];

export const themeService = {
    currentTheme: 'amber',

    init() {
        const saved = localStorage.getItem('app_theme') || 'amber';
        this.apply(saved);
    },

    getThemes() {
        return THEMES;
    },

    getCurrentTheme() {
        return this.currentTheme;
    },

    getThemeColors(themeId = null) {
        const id = themeId || this.currentTheme;
        const theme = THEMES.find(t => t.id === id) || THEMES[0];
        return theme.chartColors;
    },

    apply(themeId) {
        const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
        this.currentTheme = theme.id;
        document.documentElement.setAttribute('data-theme', theme.id);
        localStorage.setItem('app_theme', theme.id);

        // Update theme-color meta tag in head
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', theme.swatches[0]);

        // Dispatch custom event for charts or components to re-render
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },

    setTheme(themeId) {
        this.apply(themeId);
    }
};
