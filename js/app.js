import { dbService } from './services/db.js';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js';
import { coverSearchService } from './services/coverSearch.js';
import WebuyService from './services/webuyService.js';
import { localFileSync } from './services/localFileSync.js?v=36';

// Global Exposure
window.navigate = navigate;
window.openAddModal = openAddModal;
window.saveItem = saveItem;
window.deleteItem = deleteItem;
window.searchCover = searchCover;
window.selectCover = selectCover;

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

    // Reset zones if not coming back from edit
    titleEl.innerHTML = '';
    if (filterEl) filterEl.innerHTML = '';
    scrollEl.innerHTML = '';

    document.querySelectorAll('.desktop-nav button, .bottom-nav button').forEach(b => b.classList.remove('active'));

    state.view = id;

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
        const ownedGames = games.filter(g => !g.isWishlist);
        const ownedConsoles = consoles.filter(c => !c.isWishlist);
        const ownedTotal = ownedGames.length + ownedConsoles.length;
        const wishlistTotal = games.filter(g => g.isWishlist).length + consoles.filter(c => c.isWishlist).length;

        titleEl.innerHTML = `<h2>Resumo <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px 4px; border-radius:4px; margin-left:8px;">v36</span></h2>`;

        scrollEl.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; margin-top:5px;">
                <div onclick="navigate('nav-collection')" style="background:rgba(255,159,10,0.12); padding:24px; border-radius:20px; border:1px solid rgba(255,159,10,0.25); cursor:pointer; transition: transform 0.2s;">
                    <h3 style="font-size:0.85rem; opacity:0.8; margin-bottom:8px;">Coleção</h3>
                    <p style="font-size:2.2rem; font-weight:800; color:#ff9f0a;">${ownedTotal}</p>
                </div>
                <div onclick="navigate('nav-wishlist')" style="background:rgba(255,255,255,0.05); padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
                    <h3 style="font-size:0.85rem; opacity:0.8; margin-bottom:8px;">Pretendidos</h3>
                    <p style="font-size:2.2rem; font-weight:800;">${wishlistTotal}</p>
                </div>
            </div>

            <div style="margin-top:25px; background:rgba(255,255,255,0.03); padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                <h3 style="margin-bottom:15px; font-size:1rem; color:#ffc978; font-weight:800;">📊 Stats por Consola</h3>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                    ${Object.entries(groupBy(games.concat(consoles), 'platform'))
                .sort((a, b) => b[1].length - a[1].length)
                .map(([p, items]) => `
                            <div style="display:flex; flex-direction:column; gap:4px; background:rgba(0,0,0,0.25); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.03);">
                                <span style="font-size:0.65rem; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px;">${p}</span>
                                <span style="font-size:1.1rem; font-weight:800; color:#ff9f0a">${items.length}</span>
                            </div>
                        `).join('') || '<p style="font-size:0.85rem; opacity:0.5;">Sem itens catalogados.</p>'}
                </div>
            </div>
            
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button onclick="navigate('nav-sync')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:14px; border-radius:14px; color:white; font-size:0.85rem; cursor:pointer; font-weight:600;">Definições Cloud ☁️</button>
                <button onclick="navigate('nav-platforms')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:14px; border-radius:14px; color:white; font-size:0.85rem; cursor:pointer; font-weight:600;">Consolas 🕹️</button>
            </div>
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
            <div style="display:flex; gap:8px; flex-wrap:nowrap; overflow-x:auto; background:rgba(255,159,10,0.05); padding:10px; border-radius:14px; border:1px solid rgba(255,159,10,0.15);">
                <select id="f-type" style="background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; min-width:95px;">
                    <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>Tudo</option>
                    <option value="games" ${state.filterType === 'games' ? 'selected' : ''}>Jogos</option>
                    <option value="consoles" ${state.filterType === 'consoles' ? 'selected' : ''}>Hardware</option>
                </select>
                <select id="f-plat" style="background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; min-width:120px;">
                    <option value="all" ${state.filterPlatform === 'all' ? 'selected' : ''}>Plataformas</option>
                    ${platformOptions}
                </select>
                <input id="f-search" type="text" placeholder="🔍 Procurar..." value="${state.filterSearch}" style="flex:1; background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; min-width:120px;">
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
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
                    ${filtered.map(item => `
                        <div onclick="navigate('nav-add', ${JSON.stringify(item).replace(/"/g, '&quot;')})" style="background:rgba(255,255,255,0.05); border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); height:210px; cursor:pointer; display:flex; flex-direction:column; transition: transform 0.2s;">
                            <div style="height:130px; background:#000 url(${item.image || ''}) center/contain no-repeat;"></div>
                            <div style="padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                                <h4 style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.2; font-weight:600;">${item.title}</h4>
                                <span style="font-size:0.65rem; color:#ffc978; font-weight:800; text-transform:uppercase;">${item.platform || 'Geral'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${filtered.length === 0 ? '<p style="text-align:center; margin-top:3rem; opacity:0.4; font-size:0.9rem;">Nenhum item encontrado.</p>' : ''}
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

    titleEl.innerHTML = `<h2>${item ? '✏️ Editar Item' : '➕ Novo Item'}</h2>`;

    const pOptions = platforms.map(p => `<option value="${p.name}" ${(item && item.platform === p.name) ? 'selected' : ''}>${p.name}</option>`).join('');
    const type = item ? (item._t || (item.isConsole ? 'consoles' : 'games')) : 'games';

    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:14px; padding-bottom:120px; max-width:600px; margin:0 auto;">
            
            <div id="cover-preview" style="height:200px; background:#000 url(${item?.image || ''}) center/contain no-repeat; border-radius:15px; border:1px solid rgba(255,255,255,0.1); display:${item?.image ? 'block' : 'none'};"></div>

            <div style="display:flex; gap:12px;">
                <select id="add-type" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <option value="games" ${type === 'games' ? 'selected' : ''}>💾 Jogo</option>
                    <option value="consoles" ${type === 'consoles' ? 'selected' : ''}>🕹️ Consola</option>
                </select>
                <div style="display:flex; align-items:center; gap:10px; background:#2b2b36; border:1px solid #444; padding:0 15px; border-radius:12px;">
                    <input type="checkbox" id="add-wishlist" style="width:18px; height:18px;" ${item && item.isWishlist ? 'checked' : ''}>
                    <label for="add-wishlist" style="font-size:0.85rem; font-weight:600;">Wishlist</label>
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <input id="add-title" type="text" placeholder="Título do Jogo / Consola" value="${item ? item.title : ''}" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                <button onclick="searchCover()" style="background:#ff9f0a; border:none; color:white; padding:0 15px; border-radius:12px; font-weight:700;">🔍</button>
            </div>
            
            <select id="add-platform" style="padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                <option value="">Plataforma / Sistema</option>
                ${pOptions}
            </select>

            <div style="display:flex; gap:12px;">
                <input id="add-image" type="text" placeholder="URL da Capa / Foto" value="${item ? (item.image || '') : ''}" oninput="updatePreview(this.value)" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                <button onclick="document.getElementById('add-image').value = ''; updatePreview('')" style="background:#444; border:none; color:white; padding:0 18px; border-radius:12px; font-size:1.1rem;">🗑️</button>
            </div>

            <div style="display:flex; gap:12px;">
                <div style="flex:1; position:relative;">
                    <span style="position:absolute; left:12px; top:14px; opacity:0.5;">€</span>
                    <input id="add-price" type="number" step="0.01" placeholder="0.00" value="${item ? (item.price || '') : ''}" style="width:100%; padding:14px 14px 14px 30px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                </div>
                <input id="add-date" type="date" value="${item ? (item.acquiredDate || '') : ''}" style="flex:1; padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
            </div>

            <button onclick="saveItem('${item ? item.id : ''}')" class="btn-primary" style="padding:18px; background:#ff9f0a; border:none; color:white; font-weight:800; border-radius:18px; margin-top:15px; font-size:1rem; cursor:pointer;">💾 Guardar Alterações</button>

            ${item ? `<button onclick="deleteItem('${item.id}', '${type}')" style="background:#ff4d4d; border:none; color:white; padding:12px; border-radius:18px; margin-top:25px; font-weight:700; opacity:0.8; font-size:0.85rem; cursor:pointer;">Eliminar Permanente</button>` : ''}
        </div>

        <div id="search-results-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:6000; padding:20px; overflow-y:auto;">
            <div style="max-width:800px; margin:0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3>Escolha a Capa</h3>
                    <button onclick="document.getElementById('search-results-modal').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem;">✕</button>
                </div>
                <div id="search-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:10px;"></div>
            </div>
        </div>
    `;
}

window.updatePreview = (url) => {
    const preview = document.getElementById('cover-preview');
    if (preview) {
        preview.style.display = url ? 'block' : 'none';
        preview.style.backgroundImage = `url(${url})`;
    }
};

async function searchCover() {
    const title = document.getElementById('add-title').value;
    const plat = document.getElementById('add-platform').value;
    if (!title) return uiService.alert("Escreva o título primeiro!");

    logger("A pesquisar capas...");
    try {
        const results = await WebuyService.search(`${title} ${plat}`);
        const grid = document.getElementById('search-grid');
        const modal = document.getElementById('search-results-modal');

        if (results.length === 0) return uiService.alert("Nenhuma capa encontrada.");

        grid.innerHTML = results.map(r => `
            <div onclick="selectCover('${r.image}')" style="aspect-ratio:3/4; background:#000 url(${r.image}) center/contain no-repeat; border-radius:8px; cursor:pointer; border:1px solid #333;"></div>
        `).join('');

        modal.style.display = 'block';
    } catch (err) { logger("SEARCH ERR: " + err.message); }
}

async function selectCover(url) {
    document.getElementById('search-results-modal').style.display = 'none';
    logger("A converter imagem...");
    try {
        const base64 = await coverSearchService.convertUrlToBase64(url);
        document.getElementById('add-image').value = base64;
        window.updatePreview(base64);
        logger("Pronto.");
    } catch (e) {
        document.getElementById('add-image').value = url;
        window.updatePreview(url);
        logger("Guardado link (Base64 falhou)");
    }
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
        uiService.alert("Guardado com sucesso!", "Parabéns ✨");

        // Go back to the right view with filters preserved
        const targetView = newItem.isWishlist ? 'nav-wishlist' : 'nav-collection';
        navigate(targetView);
    } catch (err) { logger("SAVE ERR: " + err.message); }
}

async function deleteItem(id, store) {
    if (await uiService.confirm("Tem a certeza que quer apagar este item permanentemente?", "Apagar Item")) {
        try {
            await dbService.delete(store, id);
            navigate(state.view === 'nav-add' ? 'nav-collection' : state.view);
        } catch (err) { logger("DEL ERR: " + err.message); }
    }
}

async function openAddModal() { navigate('nav-add'); }

/** PLATFORM MANAGER **/
async function renderPlatformManager() {
    const { titleEl, scrollEl } = getZones();
    const platforms = await getPlatformOptions();

    titleEl.innerHTML = `<h2>Gestor de Consolas</h2>`;
    scrollEl.innerHTML = `
        <div style="max-width:600px; margin:0 auto;">
            <div style="margin-bottom:25px; display:flex; gap:12px;">
                <input id="plat-new-name" type="text" placeholder="Ex: PlayStation 5" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                <button id="btn-add-plat" style="background:#ff9f0a; border:none; color:white; padding:0 25px; border-radius:12px; font-weight:800; font-size:1.2rem; cursor:pointer;">+</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${platforms.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.05);">
                        <span style="font-weight:600;">${p.name}</span>
                        <button onclick="window.delPlatform('${p.id}')" style="background:none; border:none; opacity:0.4; color:white; cursor:pointer; font-size:1.1rem;">🗑️</button>
                    </div>
                `).join('')}
            </div>
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
    titleEl.innerHTML = `<h2>Nuvem & Definições</h2>`;
    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px; max-width:600px; margin:0 auto;">
            <div style="background:rgba(255,159,10,0.05); padding:24px; border-radius:20px; border:1px solid rgba(255,159,10,0.2);">
                 <h3 style="margin-bottom:10px; font-size:1rem; color:#ff9f0a;">Sync Cloud ☁️</h3>
                 <p style="margin-bottom:20px; font-size:0.85rem; opacity:0.7; line-height:1.4;">A tua coleção está a ser guardada localmente e simulada na Cloud.</p>
                 <button class="btn-primary" style="width:100%; border:none; padding:14px; border-radius:14px; background:#ff9f0a; color:white; font-weight:800; cursor:pointer;">Forçar Sincronização Now</button>
            </div>
            
            <div style="background:rgba(255,100,100,0.05); padding:24px; border-radius:20px; border:1px solid rgba(255,0,0,0.2); margin-top:20px;">
                 <h3 style="margin-bottom:10px; font-size:1rem; color:#ff4d4d;">Zona de Perigo 🚨</h3>
                 <p style="margin-bottom:20px; font-size:0.8rem; opacity:0.65; line-height:1.4;">Se a App estiver a falhar ou se quiseres limpar tudo para começar do zero.</p>
                 <button id="btn-force-update" style="width:100%; background:#ff4d4d; color:white; border:none; padding:14px; border-radius:14px; font-weight:800; cursor:pointer;">WIPE TOTAL DA APP (v36)</button>
            </div>
        </div>
    `;

    document.getElementById('btn-force-update').onclick = async () => {
        if (confirm("ATENÇÃO: Isto apagará TODOS os dados e a cache! Tem backup?")) {
            localStorage.clear();
            const rs = await navigator.serviceWorker.getRegistrations();
            for (let r of rs) await r.unregister();
            location.href = location.href.split('?')[0] + '?v=' + Date.now();
        }
    };
}

/** INITIALIZATION **/
async function init() {
    logger("Iniciando RetroCollection v36...");
    try {
        await dbService.open();
        logger("DB Conectado.");
        await navigate('nav-dashboard');

        // Hide log after success
        setTimeout(() => {
            const logEl = document.getElementById('loading-log');
            if (logEl) {
                logEl.style.transition = 'opacity 0.8s, transform 0.8s';
                logEl.style.opacity = '0';
                logEl.style.transform = 'translateY(20px)';
                setTimeout(() => logEl.style.display = 'none', 800);
            }
        }, 2500);

    } catch (err) {
        logger("FALHA CRÍTICA: " + err.message);
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

// Fixed Global Exposure
window.navigate = navigate;
window.openAddModal = openAddModal;
window.saveItem = saveItem;
window.deleteItem = deleteItem;
window.searchCover = searchCover;
window.selectCover = selectCover;

init();
