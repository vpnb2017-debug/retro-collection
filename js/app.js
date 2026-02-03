import { dbService } from './services/db.js';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js';
import { coverSearchService } from './services/coverSearch.js';
import WebuyService from './services/webuyService.js';
import { localFileSync } from './services/localFileSync.js?v=32';

// Global Exposure
window.navigate = navigate;
window.openAddModal = openAddModal;
window.saveItem = saveItem;
window.deleteItem = deleteItem;

// Utility for logging 
const logger = (msg) => { if (window.log) window.log(msg); else console.log(msg); };

// Grid Zones
function getZones() {
    return {
        titleEl: document.querySelector('.v29-title-zone'),
        filterEl: document.querySelector('.v29-filter-zone'),
        scrollEl: document.querySelector('.v29-scroll-zone')
    };
}

// UI Service 
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
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '5000',
                backdropFilter: 'blur(10px)', color: 'white'
            });

            const content = document.createElement('div');
            Object.assign(content.style, {
                background: '#2b2b36', border: '1px solid rgba(255,159,10,0.3)',
                padding: '2rem', borderRadius: '15px', width: '90%', maxWidth: '400px',
                textAlign: 'center', boxShadow: '0 0 30px rgba(0,0,0,0.5)'
            });

            let buttons = '';
            if (type === 'alert') {
                buttons = `<button class="btn-primary" id="modal-ok" style="padding:10px 30px; border-radius:30px; border:none; background:#ff9f0a; color:white; font-weight:700; cursor:pointer; margin-top:20px;">OK</button>`;
            } else {
                buttons = `
                    <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                        <button id="modal-cancel" style="background:none; border:none; color:#ffc978; cursor:pointer;">Cancelar</button>
                        <button class="btn-primary" id="modal-ok" style="padding:10px 30px; border-radius:30px; border:none; background:#ff9f0a; color:white; font-weight:700; cursor:pointer;">Sim</button>
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
    filterType: 'all',
    filterPlatform: 'all',
    filterSearch: '',
    viewMode: 'grid'
};

/** NAVIGATE **/
async function navigate(id, params = null) {
    const { titleEl, filterEl, scrollEl } = getZones();
    if (!titleEl || !scrollEl) return;

    titleEl.innerHTML = '';
    if (filterEl) filterEl.innerHTML = '';
    scrollEl.innerHTML = '';

    document.querySelectorAll('.desktop-nav button, .bottom-nav button').forEach(b => b.classList.remove('active'));

    switch (id) {
        case 'nav-dashboard': await renderDashboard(); break;
        case 'nav-collection': await renderCollection(); break;
        case 'nav-wishlist': await renderWishlist(); break;
        case 'nav-platforms': await renderPlatformManager(); break;
        case 'nav-sync': await renderSyncView(); break;
        case 'nav-add': await renderAddForm(params); break;
    }
}

/** DASHBOARD **/
async function renderDashboard() {
    const { titleEl, scrollEl } = getZones();
    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const ownedTotal = games.filter(g => !g.isWishlist).length + consoles.filter(c => !c.isWishlist).length;
        const wishlistTotal = games.filter(g => g.isWishlist).length + consoles.filter(c => c.isWishlist).length;

        titleEl.innerHTML = `<h2>Olá! <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px 4px; border-radius:4px; margin-left:8px;">v32</span></h2>`;

        scrollEl.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:5px;">
                <div onclick="navigate('nav-collection')" style="background:rgba(255,159,10,0.12); padding:20px; border-radius:18px; border:1px solid rgba(255,159,10,0.25); cursor:pointer;">
                    <h3 style="font-size:0.8rem; opacity:0.8; margin-bottom:5px;">Coleção</h3>
                    <p style="font-size:1.8rem; font-weight:800; color:#ff9f0a;">${ownedTotal}</p>
                </div>
                <div onclick="navigate('nav-wishlist')" style="background:rgba(255,255,255,0.05); padding:20px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                    <h3 style="font-size:0.8rem; opacity:0.8; margin-bottom:5px;">Pretendidos</h3>
                    <p style="font-size:1.8rem; font-weight:800;">${wishlistTotal}</p>
                </div>
            </div>

            <div style="margin-top:20px; background:rgba(255,255,255,0.03); padding:18px; border-radius:18px; border:1px solid rgba(255,255,255,0.05);">
                <h3 style="margin-bottom:12px; font-size:0.95rem; color:#ffc978;">📊 Por Plataforma</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    ${Object.entries(groupBy(games.concat(consoles), 'platform'))
                .sort((a, b) => b[1].length - a[1].length)
                .map(([p, items]) => `
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:8px;">
                                <span style="opacity:0.75">${p}</span>
                                <span style="font-weight:700; color:#ff9f0a">${items.length}</span>
                            </div>
                        `).join('') || '<p style="font-size:0.8rem; opacity:0.5;">Sem itens.</p>'}
                </div>
            </div>
            
            <button onclick="navigate('nav-sync')" style="width:100%; margin-top:15px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:12px; color:white; font-size:0.85rem; cursor:pointer;">Configurações & Nuvem ☁️</button>
        `;
    } catch (err) { logger("DASH ERR: " + err.message); }
}

/** GENERIC GRID (Collection/Wishlist) **/
async function renderGenericGrid(viewTitle, itemsFilter) {
    const { titleEl, filterEl, scrollEl } = getZones();
    try {
        const platforms = await getPlatformOptions();
        const platformOptions = platforms.map(p => `<option value="${p.name}" ${state.filterPlatform === p.name ? 'selected' : ''}>${p.name}</option>`).join('');

        titleEl.innerHTML = `<h2>${viewTitle}</h2>`;
        filterEl.innerHTML = `
            <div style="display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; background:rgba(255,159,10,0.05); padding:8px; border-radius:12px; border:1px solid rgba(255,159,10,0.15);">
                <select id="f-type" style="background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:8px; font-size:0.8rem; min-width:85px;">
                    <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>Tudo</option>
                    <option value="games" ${state.filterType === 'games' ? 'selected' : ''}>Jogos</option>
                    <option value="consoles" ${state.filterType === 'consoles' ? 'selected' : ''}>Consolas</option>
                </select>
                <select id="f-plat" style="background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:8px; font-size:0.8rem; min-width:110px;">
                    <option value="all" ${state.filterPlatform === 'all' ? 'selected' : ''}>Plataformas</option>
                    ${platformOptions}
                </select>
                <input id="f-search" type="text" placeholder="🔍" value="${state.filterSearch}" style="flex:1; background:#1e1e24; border:1px solid #444; color:white; padding:8px; border-radius:8px; font-size:0.8rem; min-width:100px;">
            </div>
        `;

        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const all = [...games.map(g => ({ ...g, _t: 'games' })), ...consoles.map(c => ({ ...c, _t: 'consoles' }))].filter(itemsFilter);

        const updateUI = () => {
            state.filterType = document.getElementById('f-type').value;
            state.filterPlatform = document.getElementById('f-plat').value;
            state.filterSearch = document.getElementById('f-search').value.toLowerCase();

            const filtered = all.filter(i => {
                if (state.filterType !== 'all' && i._t !== state.filterType) return false;
                if (state.filterPlatform !== 'all' && i.platform !== state.filterPlatform) return false;
                if (state.filterSearch && !i.title.toLowerCase().includes(state.filterSearch)) return false;
                return true;
            }).sort((a, b) => a.title.localeCompare(b.title));

            scrollEl.innerHTML = `
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px;">
                    ${filtered.map(item => `
                        <div onclick="navigate('nav-add', ${JSON.stringify(item).replace(/"/g, '&quot;')})" style="background:rgba(255,255,255,0.05); border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); height:220px; cursor:pointer; display:flex; flex-direction:column;">
                            <div style="height:140px; background:#000 url(${item.image || ''}) center/contain no-repeat;"></div>
                            <div style="padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                                <h4 style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.2;">${item.title}</h4>
                                <span style="font-size:0.65rem; color:#ff9900; font-weight:700;">${item.platform || 'Geral'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${filtered.length === 0 ? '<p style="text-align:center; margin-top:2rem; opacity:0.5;">Vazio.</p>' : ''}
            `;
        };

        document.getElementById('f-type').onchange = updateUI;
        document.getElementById('f-plat').onchange = updateUI;
        document.getElementById('f-search').oninput = updateUI;
        updateUI();
    } catch (err) { logger("GRID ERR: " + err.message); }
}

async function renderCollection() { await renderGenericGrid('Minha Coleção', i => !i.isWishlist); }
async function renderWishlist() { await renderGenericGrid('Lista de Desejos', i => !!i.isWishlist); }

/** ADD / EDIT FORM **/
async function renderAddForm(item) {
    const { titleEl, scrollEl } = getZones();
    const platforms = await getPlatformOptions();

    titleEl.innerHTML = `<h2>${item ? '✏️ Editar' : '➕ Novo'}</h2>`;

    const pOptions = platforms.map(p => `<option value="${p.name}" ${(item && item.platform === p.name) ? 'selected' : ''}>${p.name}</option>`).join('');
    const type = item ? (item._t || (item.isConsole ? 'consoles' : 'games')) : 'games';

    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; padding-bottom:100px;">
            <div style="display:flex; gap:10px;">
                <select id="add-type" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
                    <option value="games" ${type === 'games' ? 'selected' : ''}>Jogo</option>
                    <option value="consoles" ${type === 'consoles' ? 'selected' : ''}>Consola</option>
                </select>
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="add-wishlist" ${item && item.isWishlist ? 'checked' : ''}>
                    <label for="add-wishlist" style="font-size:0.8rem;">Wishlist</label>
                </div>
            </div>

            <input id="add-title" type="text" placeholder="Título" value="${item ? item.title : ''}" style="padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
            
            <select id="add-platform" style="padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
                <option value="">Plataforma</option>
                ${pOptions}
            </select>

            <div style="display:flex; gap:10px;">
                <input id="add-image" type="text" placeholder="URL da Imagem" value="${item ? (item.image || '') : ''}" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
                <button onclick="document.getElementById('add-image').value = ''" style="background:#444; border:none; color:white; padding:0 15px; border-radius:10px;">🗑️</button>
            </div>

            <div style="display:flex; gap:10px;">
                <input id="add-price" type="number" step="0.01" placeholder="Preço (€)" value="${item ? (item.price || '') : ''}" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
                <input id="add-date" type="date" value="${item ? (item.acquiredDate || '') : ''}" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
            </div>

            <button onclick="saveItem('${item ? item.id : ''}')" class="btn-primary" style="padding:16px; background:#ff9f0a; border:none; color:white; font-weight:700; border-radius:15px; margin-top:10px;">Guardar Item</button>

            ${item ? `<button onclick="deleteItem('${item.id}', '${type}')" style="background:#ff4d4d; border:none; color:white; padding:12px; border-radius:15px; margin-top:20px; font-weight:600; opacity:0.8;">Eliminar Permanente</button>` : ''}
        </div>
    `;
}

async function saveItem(id) {
    const title = document.getElementById('add-title').value;
    if (!title) return uiService.alert("O título é obrigatório!");

    const store = document.getElementById('add-type').value;
    const newItem = {
        id: id || crypto.randomUUID(),
        title: title,
        platform: document.getElementById('add-platform').value,
        image: document.getElementById('add-image').value,
        price: parseFloat(document.getElementById('add-price').value) || 0,
        acquiredDate: document.getElementById('add-date').value,
        isWishlist: document.getElementById('add-wishlist').checked,
        updatedAt: new Date().toISOString()
    };

    try {
        await dbService.add(store, newItem);
        uiService.alert("Guardado com sucesso!", "✅");
        navigate('nav-dashboard');
    } catch (err) { logger("SAVE ERR: " + err.message); }
}

async function deleteItem(id, store) {
    if (await uiService.confirm("Tem a certeza que quer apagar?", "Apagar")) {
        try {
            await dbService.delete(store, id);
            navigate('nav-dashboard');
        } catch (err) { logger("DEL ERR: " + err.message); }
    }
}

/** PLATFORM MANAGER **/
async function renderPlatformManager() {
    const { titleEl, scrollEl } = getZones();
    const platforms = await getPlatformOptions();

    titleEl.innerHTML = `<h2>Consolas</h2>`;
    scrollEl.innerHTML = `
        <div style="margin-bottom:20px; display:flex; gap:10px;">
            <input id="plat-new-name" type="text" placeholder="Nome da Plataforma" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:10px;">
            <button id="btn-add-plat" style="background:#ff9f0a; border:none; color:white; padding:0 20px; border-radius:10px; font-weight:700;">+</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            ${platforms.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                    <span>${p.name}</span>
                    <button onclick="window.delPlatform('${p.id}')" style="background:none; border:none; opacity:0.5; color:white;">🗑️</button>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('btn-add-plat').onclick = async () => {
        const name = document.getElementById('plat-new-name').value;
        if (!name) return;
        await addPlatform({ name });
        renderPlatformManager();
    };

    window.delPlatform = async (id) => {
        try {
            await deletePlatform(id);
            renderPlatformManager();
        } catch (e) { uiService.alert(e.message); }
    };
}

/** SYNC / SETTINGS **/
async function renderSyncView() {
    const { titleEl, scrollEl } = getZones();
    titleEl.innerHTML = `<h2>Definições</h2>`;
    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:15px;">
            <div style="background:rgba(255,159,10,0.05); padding:20px; border-radius:18px; border:1px solid rgba(255,159,10,0.2);">
                 <p style="margin-bottom:15px; font-size:0.9rem;">Sincronização Cloud está ativa (Mock).</p>
                 <button class="btn-primary" style="width:100%; border:none; padding:12px; border-radius:12px; background:#ff9f0a; color:white; font-weight:700;">Sincronizar Agora ☁️</button>
            </div>
            
            <div style="background:rgba(255,100,100,0.05); padding:20px; border-radius:18px; border:1px solid rgba(255,0,0,0.2); margin-top:20px;">
                 <p style="margin-bottom:15px; font-size:0.8rem; opacity:0.7;">Só use isto se a App estiver bloqueada ou se mudou de telemóvel recentemente.</p>
                 <button id="btn-force-update" style="width:100%; background:#ff4d4d; color:white; border:none; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">🚨 FORÇAR RESET TOTAL (v32)</button>
            </div>
        </div>
    `;

    document.getElementById('btn-force-update').onclick = async () => {
        if (confirm("Isto apagará cache e dados locais! Continuar?")) {
            localStorage.clear();
            const rs = await navigator.serviceWorker.getRegistrations();
            for (let r of rs) await r.unregister();
            location.href = location.href.split('?')[0] + '?v=' + Date.now();
        }
    };
}

/** INITIALIZATION **/
async function init() {
    logger("Iniciando RetroCollection v32...");
    try {
        await dbService.open();
        logger("DB Pronto.");
        await navigate('nav-dashboard');

        // Hide log after 3s of success
        setTimeout(() => {
            const logEl = document.getElementById('loading-log');
            if (logEl) logEl.style.transition = 'opacity 1s';
            if (logEl) logEl.style.opacity = '0';
            setTimeout(() => { if (logEl) logEl.style.display = 'none'; }, 1000);
        }, 3000);

    } catch (err) {
        logger("FALHA: " + err.message);
    }
}

// Helpers
function groupBy(arr, key) {
    return arr.reduce((acc, obj) => {
        const k = obj[key] || 'Geral';
        if (!acc[k]) acc[k] = [];
        acc[k].push(obj);
        return acc;
    }, {});
}

init();
