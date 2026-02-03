import { dbService } from './services/db.js';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js';
import { coverSearchService } from './services/coverSearch.js';
import WebuyService from './services/webuyService.js';
import { localFileSync } from './services/localFileSync.js?v=30';

// Global Exposure for HTML onclick usage
window.navigate = navigate;
window.openAddModal = openAddModal;

// Utility to get Grid Zones safely
function getZones() {
    return {
        titleEl: document.querySelector('.v29-title-zone'),
        filterEl: document.querySelector('.v29-filter-zone'),
        scrollEl: document.querySelector('.v29-scroll-zone')
    };
}

// Premium UI Service 
const uiService = {
    async alert(message, title = 'RetroCollection') {
        return this.showModal({ title, body: message, type: 'alert' });
    },
    async confirm(message, title = 'Questão') {
        return this.showModal({ title, body: message, type: 'confirm' });
    },
    async showModal({ title, body, type }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            // Simple inline styles to avoid CSS issues
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '5000',
                backdropFilter: 'blur(10px)', color: 'white'
            });

            const content = document.createElement('div');
            content.className = 'modal-content';
            Object.assign(content.style, {
                background: '#2b2b36', border: '1px solid rgba(255,159,10,0.3)',
                padding: '2rem', borderRadius: '15px', width: '90%', maxWidth: '450px',
                textAlign: 'center', boxShadow: '0 0 30px rgba(255,159,10,0.15)'
            });

            let buttons = '';
            if (type === 'alert') {
                buttons = `<button class="btn-primary" id="modal-ok" style="padding:10px 30px; border-radius:30px; border:none; background:#ff9f0a; color:white; font-weight:700; cursor:pointer; margin-top:20px;">OK</button>`;
            } else {
                buttons = `
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                        <button id="modal-cancel" style="background:none; border:none; color:#ffc978; cursor:pointer;">Cancelar</button>
                        <button class="btn-primary" id="modal-ok" style="padding:10px 30px; border-radius:30px; border:none; background:#ff9f0a; color:white; font-weight:700; cursor:pointer;">Confirmar</button>
                    </div>
                `;
            }

            content.innerHTML = `<h3 style="margin-bottom:15px; color:#ff9f0a">${title}</h3><p style="opacity:0.9">${body}</p>${buttons}`;
            overlay.appendChild(content);
            document.body.appendChild(overlay);

            document.getElementById('modal-ok').onclick = () => { overlay.remove(); resolve(true); };
            if (type === 'confirm') {
                document.getElementById('modal-cancel').onclick = () => { overlay.remove(); resolve(false); };
            }
        });
    }
};

const state = {
    view: 'dashboard',
    items: [],
    filterType: 'all',
    filterPlatform: 'all',
    filterSearch: '',
    viewMode: 'grid',
    deferredPrompt: null
};

async function navigate(id, params = null) {
    console.log("Navigating to:", id);
    const { titleEl, filterEl, scrollEl } = getZones();

    // Clear zones
    if (titleEl) titleEl.innerHTML = '';
    if (filterEl) filterEl.innerHTML = '';
    if (scrollEl) scrollEl.innerHTML = '';

    // Update Nav UI
    document.querySelectorAll('.desktop-nav button, .bottom-nav button').forEach(b => b.classList.remove('active'));

    if (id === 'nav-dashboard') {
        renderDashboard();
    } else if (id === 'nav-collection') {
        renderCollection();
    } else if (id === 'nav-platforms') {
        renderPlatformManager();
    } else if (id === 'nav-sync') {
        renderSyncView();
    } else if (id === 'nav-add') {
        renderAddForm(params);
    }
}

async function renderDashboard() {
    const { titleEl, filterEl, scrollEl } = getZones();
    if (!titleEl || !scrollEl) return;

    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const platformOptions = await getPlatformOptions();

        const total = games.length + consoles.length;

        titleEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Resumo <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px 4px; border-radius:4px; margin-left:10px;">v30</span></h2>
            </div>
            <p style="opacity:0.7; font-size:0.85rem;">Pronto para catalogar o próximo?</p>
        `;

        scrollEl.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:10px;">
                <div onclick="navigate('nav-collection')" style="background:rgba(255,159,10,0.1); padding:20px; border-radius:15px; border:1px solid rgba(255,159,10,0.2); cursor:pointer;">
                    <h3 style="font-size:0.9rem; opacity:0.8;">Coleção</h3>
                    <p style="font-size:2rem; font-weight:800;">${total}</p>
                </div>
                <div onclick="navigate('nav-sync')" style="background:rgba(255,255,255,0.05); padding:20px; border-radius:15px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                    <h3 style="font-size:0.9rem; opacity:0.8;">Nuvem ☁️</h3>
                    <p style="font-size:1.5rem; font-weight:800;">Ativa</p>
                </div>
            </div>

            <div style="margin-top:25px; background:rgba(255,255,255,0.03); padding:20px; border-radius:15px; border:1px solid rgba(255,255,255,0.05);">
                <h3 style="margin-bottom:15px; font-size:1rem; color:#ffc978;">📊 Por Consola</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    ${Object.entries(groupBy(games.concat(consoles), 'platform')).map(([p, items]) => `
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px;">
                            <span style="opacity:0.8">${p}</span>
                            <span style="font-weight:800; color:#ff9f0a">${items.length}</span>
                        </div>
                    `).join('') || '<p>Ainda sem dados...</p>'}
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Dashboard Render Failed:", err);
    }
}

async function renderGenericGrid(viewTitle, itemsFilter) {
    const { titleEl, filterEl, scrollEl } = getZones();
    if (!titleEl || !filterEl || !scrollEl) return;

    try {
        const platforms = await getPlatformOptions();
        const platformOptionsHtml = platforms.map(p => {
            const selected = state.filterPlatform === p.name ? 'selected' : '';
            return `<option value="${p.name}" ${selected}>${p.name}</option>`;
        }).join('');

        titleEl.innerHTML = `<h2>${viewTitle} <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px; border-radius:3px;">FIXED v30</span></h2>`;

        filterEl.innerHTML = `
            <div style="display:flex; gap:8px; flex-wrap:wrap; background:rgba(255,159,10,0.05); padding:10px; border-radius:10px; border:1px solid rgba(255,159,10,0.2);">
                <select id="f-type" style="flex:1; min-width:80px; background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:6px;">
                    <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>Tudo</option>
                    <option value="games" ${state.filterType === 'games' ? 'selected' : ''}>Jogos</option>
                    <option value="consoles" ${state.filterType === 'consoles' ? 'selected' : ''}>Hardware</option>
                </select>
                <select id="f-plat" style="flex:1; min-width:110px; background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:6px;">
                    <option value="all" ${state.filterPlatform === 'all' ? 'selected' : ''}>Plataformas</option>
                    ${platformOptionsHtml}
                </select>
                <input id="f-search" type="text" placeholder="🔍 Procurar..." value="${state.filterSearch}" style="flex:2; min-width:140px; background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:6px;">
            </div>
        `;

        scrollEl.innerHTML = `<p style="text-align:center; padding-top:2rem;">A carregar lista...</p>`;

        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');

        const allItems = [
            ...games.map(g => ({ ...g, _t: 'games' })),
            ...consoles.map(c => ({ ...c, _t: 'consoles' }))
        ].filter(itemsFilter);

        const updateUI = () => {
            state.filterType = document.getElementById('f-type').value;
            state.filterPlatform = document.getElementById('f-plat').value;
            state.filterSearch = document.getElementById('f-search').value.toLowerCase();

            const filtered = allItems.filter(i => {
                if (state.filterType !== 'all' && i._t !== state.filterType) return false;
                if (state.filterPlatform !== 'all' && i.platform !== state.filterPlatform) return false;
                if (state.filterSearch && !i.title.toLowerCase().includes(state.filterSearch)) return false;
                return true;
            }).sort((a, b) => a.title.localeCompare(b.title));

            scrollEl.innerHTML = `
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:15px;">
                    ${filtered.map(item => `
                        <div onclick="navigate('nav-add', ${JSON.stringify(item).replace(/"/g, '&quot;')})" style="background:rgba(255,255,255,0.05); border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; height:240px; cursor:pointer;">
                            <div style="height:160px; background: #000 url(${item.image || ''}) center/contain no-repeat;"></div>
                            <div style="padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                                <h4 style="font-size:0.85rem; line-height:1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${item.title}</h4>
                                <span style="font-size:0.7rem; color:#ffc978; font-weight:700;">${item.platform || 'Geral'}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${filtered.length === 0 ? '<p style="grid-column:1/-1; text-align:center; padding:2rem; opacity:0.5;">Sem resultados.</p>' : ''}
                </div>
            `;
        };

        document.getElementById('f-type').onchange = updateUI;
        document.getElementById('f-plat').onchange = updateUI;
        document.getElementById('f-search').oninput = updateUI;

        updateUI();
    } catch (err) {
        console.error("Grid Render Failed:", err);
    }
}

async function renderCollection() { await renderGenericGrid('Minha Coleção', i => !i.isWishlist); }

// Helper: Group by
function groupBy(arr, key) {
    return arr.reduce((acc, obj) => {
        const k = obj[key] || 'Geral';
        if (!acc[k]) acc[k] = [];
        acc[k].push(obj);
        return acc;
    }, {});
}

// Function to handle NEW items
async function openAddModal() { navigate('nav-add'); }

// Placeholder for other views to avoid crashes in v30 overhaul
async function renderPlatformManager() {
    const { titleEl, scrollEl } = getZones();
    titleEl.innerHTML = `<h2>Consolas</h2>`;
    scrollEl.innerHTML = `<p style="padding:2rem;">Gestor de Plataformas em manutenção (v30).</p>`;
}

async function renderSyncView() {
    const { titleEl, scrollEl } = getZones();
    titleEl.innerHTML = `<h2>Nuvem ☁️</h2>`;
    scrollEl.innerHTML = `
        <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:15px; border:1px solid rgba(255,159,10,0.2); text-align:center;">
             <p style="margin-bottom:20px;">Forçar atualização para garantir a estabilidade da v30.</p>
             <button id="btn-force-update" style="background:#ff4d4d; color:white; border:none; padding:12px 24px; border-radius:12px; font-weight:700; cursor:pointer;">🚨 FORÇAR RESET TOTAL (v30)</button>
        </div>
    `;
    document.getElementById('btn-force-update').onclick = async () => {
        if (confirm("Isto apagará cache e dados locais (backup antes!). Continuar?")) {
            localStorage.clear();
            if ('serviceWorker' in navigator) {
                const rs = await navigator.serviceWorker.getRegistrations();
                for (let r of rs) await r.unregister();
            }
            location.href = location.href.split('?')[0] + '?v=' + Date.now();
        }
    };
}

async function renderAddForm(item) {
    const { titleEl, scrollEl } = getZones();
    titleEl.innerHTML = `<h2>${item ? 'Editar Item' : 'Novo Item'}</h2>`;
    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px; padding-bottom:50px;">
            <p>Formulário simplificado v30...</p>
            <input id="add-title" type="text" placeholder="Título" value="${item ? item.title : ''}" style="padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:8px;">
            <button class="btn-primary" style="padding:15px; background:#ff9f0a; border:none; color:white; font-weight:700; border-radius:12px;" onclick="navigate('nav-dashboard')">Guardar (Simulação v30)</button>
        </div>
    `;
}

// Init Function
async function init() {
    console.log("App Init v30...");
    try {
        await dbService.open();
        navigate('nav-dashboard');
    } catch (err) {
        console.error("Init Failure:", err);
    }
}

init();
