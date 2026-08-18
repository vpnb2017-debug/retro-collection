/**
 * Chart Service — RetroCollection v123
 * Renders interactive charts in the Dashboard using Chart.js (CDN)
 */

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
        const colors = [
            '#ff9f0a','#ff7950','#ffc978','#22c55e','#3b82f6','#a78bfa',
            '#f472b6','#34d399','#fb923c','#60a5fa','#c084fc','#f87171'
        ];
        const labels = Object.keys(data);
        const values = Object.values(data);
        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 2, borderColor: '#1e1e24' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#fff', font: { size: 11 }, padding: 10 } },
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
        const sorted = Object.entries(data).sort((a,b) => b[1]-a[1]).slice(0, 8);
        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(([g]) => g),
                datasets: [{
                    data: sorted.map(([,v]) => v),
                    backgroundColor: 'rgba(255,159,10,0.7)',
                    borderColor: '#ff9f0a',
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
        const sorted = Object.entries(data).sort((a,b) => a[0]-b[0]);
        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(([y]) => y),
                datasets: [{
                    label: 'Aquisicoes',
                    data: sorted.map(([,v]) => v),
                    borderColor: '#ff9f0a',
                    backgroundColor: 'rgba(255,159,10,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ff9f0a',
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
        const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
        const notValidated = total - validated;
        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Validados', 'Nao Validados'],
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
                    c.fillStyle = '#ff9f0a';
                    c.textAlign = 'center';
                    c.textBaseline = 'middle';
                    c.fillText(`${pct}%`, width / 2, height / 2);
                    c.save();
                }
            }]
        });
    }
};
