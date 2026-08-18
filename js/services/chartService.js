/**
 * Chart Service — RetroCollection v127
 * Renders interactive charts in the Dashboard with dynamic retro theme palettes
 */
import { themeService } from './themeService.js?v=127';

export const chartService = {
    instances: {},

    async ensureChartJs() {
        if (typeof Chart !== 'undefined') return true;
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    },

    destroyAll() {
        Object.values(this.instances).forEach(c => { try { c.destroy(); } catch(e){} });
        this.instances = {};
    },

    /**
     * Render donut chart: items by platform
     */
    renderPlatformDonut(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e){} }
        
        const colors = themeService.getThemeColors();
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        // Generate enough colors if labels exceed array length
        const bgColors = labels.map((_, i) => colors[i % colors.length]);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ 
                    data: values, 
                    backgroundColor: bgColors, 
                    borderWidth: 2, 
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim() || '#1e1e24'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#fff', font: { size: 11 }, padding: 8 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} itens` } }
                }
            }
        });
    },

    /**
     * Render horizontal bar chart: genres
     */
    renderGenreBars(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e){} }
        
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ff9f0a';
        const sorted = Object.entries(data).sort((a,b) => b[1]-a[1]).slice(0, 8);
        
        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([g]) => g),
                datasets: [{
                    data: sorted.map(([,v]) => v),
                    backgroundColor: accent + 'aa',
                    borderColor: accent,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#fff', font: { size: 11 } }, grid: { display: false } }
                }
            }
        });
    },

    /**
     * Render line chart: acquisitions per year
     */
    renderAcquisitionLine(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e){} }
        
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ff9f0a';
        const sorted = Object.entries(data).sort((a,b) => a[0]-b[0]);
        
        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(([y]) => y),
                datasets: [{
                    label: 'Aquisições',
                    data: sorted.map(([,v]) => v),
                    borderColor: accent,
                    backgroundColor: accent + '22',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: accent,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
    },

    /**
     * Render validation gauge (% validated)
     */
    renderValidationGauge(canvasId, validated, total) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e){} }
        
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ff9f0a';
        const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
        const notValidated = total - validated;
        
        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Validados', 'Não Validados'],
                datasets: [{
                    data: [validated, notValidated],
                    backgroundColor: ['#22c55e', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw(chart) {
                    const { width, height, ctx: c } = chart;
                    c.restore();
                    c.font = `bold ${Math.round(height / 4)}px Outfit, sans-serif`;
                    c.fillStyle = accent;
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.fillText(`${pct}%`, width / 2, height / 2);
                    c.save();
                }
            }]
        });
    }
};
