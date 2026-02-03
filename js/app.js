import { dbService } from './services/db.js';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js';
import { coverSearchService } from './services/coverSearch.js';
import WebuyService from './services/webuyService.js';
import { localFileSync } from './services/localFileSync.js?v=46';

// Global Exposure
window.navigate = navigate;
window.openAddModal = openAddModal;
window.saveItem = saveItem;
window.deleteItem = deleteItem;
window.searchCover = searchCover;
window.selectCover = selectCover;
window.navigateByPlatform = navigateByPlatform;
window.exportCollection = exportCollection;
window.importCollection = importCollection;

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

// Special navigation for Dashboard platform clicks
async function navigateByPlatform(platform) {
    state.filterPlatform = platform;
    state.filterType = 'all';
    state.filterSearch = '';
    await navigate('nav-collection');
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

        titleEl.innerHTML = `<h2>Resumo <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px 4px; border-radius:4px; margin-left:8px;">v46</span></h2>`;

        scrollEl.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-top:5px;">
                <div onclick="navigate('nav-collection')" style="background:rgba(255,159,10,0.12); padding:20px; border-radius:18px; border:1px solid rgba(255,159,10,0.25); cursor:pointer;">
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
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:10px;">
                    ${Object.entries(groupBy(games.concat(consoles), 'platform'))
                .sort((a, b) => b[1].length - a[1].length)
                .map(([p, items]) => `
                            <div onclick="navigateByPlatform('${p}')" style="display:flex; flex-direction:column; gap:4px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); cursor:pointer;">
                                <span style="font-size:0.65rem; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px;">${p}</span>
                                <span style="font-size:1.1rem; font-weight:800; color:#ff9f0a">${items.length}</span>
                            </div>
                        `).join('') || '<p style="font-size:0.85rem; opacity:0.5;">Sem itens catalogados.</p>'}
                </div>
            </div>
            
            <div style="margin-top:25px; display:flex; gap:10px;">
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
            <div style="display:flex; gap:8px; flex-wrap:wrap; background:rgba(255,159,10,0.05); padding:10px; border-radius:14px; border:1px solid rgba(255,159,10,0.15);">
                <select id="f-type" style="flex:1; background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; min-width:90px;">
                    <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>Tudo</option>
                    <option value="games" ${state.filterType === 'games' ? 'selected' : ''}>Jogos</option>
                    <option value="consoles" ${state.filterType === 'consoles' ? 'selected' : ''}>Hardware</option>
                </select>
                <select id="f-plat" style="flex:1; background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; min-width:110px;">
                    <option value="all" ${state.filterPlatform === 'all' ? 'selected' : ''}>Plataformas</option>
                    <option value="(Sem Consola)" ${state.filterPlatform === '(Sem Consola)' ? 'selected' : ''}>(Sem Consola)</option>
                    ${platformOptions}
                </select>
                <input id="f-search" type="text" placeholder="🔍 Procurar..." value="${state.filterSearch}" style="width:100%; background:#1e1e24; border:1px solid #444; color:white; padding:10px; border-radius:10px; font-size:0.85rem; margin-top:2px;">
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

                const itemPlat = i.platform || '(Sem Consola)';
                if (state.filterPlatform !== 'all' && itemPlat !== state.filterPlatform) return false;

                if (state.filterSearch && !i.title.toLowerCase().includes(state.filterSearch)) return false;
                return true;
            }).sort((a, b) => a.title.localeCompare(b.title));

            scrollEl.innerHTML = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:12px;">
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
        <div style="display:flex; flex-direction:column; gap:16px; padding-bottom:120px; max-width:600px; margin:0 auto;">
            
            <div id="cover-preview" style="height:200px; background:#000 url(${item?.image || ''}) center/contain no-repeat; border-radius:15px; border:1px solid rgba(255,255,255,0.1); display:${item?.image ? 'block' : 'none'};"></div>

            <div style="display:flex; gap:12px;">
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Tipo de Item</label>
                    <select id="add-type" style="padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                        <option value="games" ${type === 'games' ? 'selected' : ''}>💾 Jogo</option>
                        <option value="consoles" ${type === 'consoles' ? 'selected' : ''}>🕹️ Consola</option>
                    </select>
                </div>
                <div style="display:flex; align-items:flex-end; gap:10px; background:#2b2b36; border:1px solid #444; padding:12px 15px; border-radius:12px;">
                    <input type="checkbox" id="add-wishlist" style="width:18px; height:18px;" ${item && item.isWishlist ? 'checked' : ''}>
                    <label for="add-wishlist" style="font-size:0.85rem; font-weight:600;">Wishlist</label>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Título / Nome</label>
                <div style="display:flex; gap:10px;">
                    <input id="add-title" type="text" placeholder="Ex: God of War" value="${item ? item.title : ''}" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <button onclick="searchCover()" style="background:#ff9f0a; border:none; color:white; padding:0 15px; border-radius:12px; font-weight:700;">🔍</button>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Plataforma / Consola</label>
                <select id="add-platform" style="padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <option value="">Selecionar Sistema</option>
                    ${pOptions}
                </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Capa (URL ou Base64)</label>
                <div style="display:flex; gap:12px;">
                    <input id="add-image" type="text" placeholder="URL da Capa" value="${item ? (item.image || '') : ''}" oninput="updatePreview(this.value)" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <button onclick="document.getElementById('add-image').value = ''; updatePreview('')" style="background:#444; border:none; color:white; padding:0 18px; border-radius:12px; font-size:1.1rem;">🗑️</button>
                </div>
            </div>

            <div style="display:flex; gap:12px;">
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Preço Pago (€)</label>
                    <div style="position:relative;">
                        <span style="position:absolute; left:12px; top:14px; opacity:0.5;">€</span>
                        <input id="add-price" type="number" step="0.01" placeholder="0.00" value="${item ? (item.price || '') : ''}" style="width:100%; padding:14px 14px 14px 30px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Data (DD/MM/AAAA)</label>
                    <input id="add-date" type="date" value="${item ? (item.acquiredDate || '') : ''}" style="padding:12px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                </div>
            </div>

            <div style="margin-top:10px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Notas / Observações</label>
                <textarea id="add-notes" placeholder="Detalhes, estado, série, etc..." style="width:100%; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem; min-height:80px; font-family:inherit; margin-top:5px;">${item ? (item.notes || '') : ''}</textarea>
            </div>

            <div style="margin-top:10px; display:flex; align-items:center; gap:12px; background:rgba(255,159,10,0.05); padding:15px; border-radius:15px; border:1px solid rgba(255,159,10,0.1);">
                <input type="checkbox" id="add-validated" style="width:20px; height:20px; accent-color:#ff9f0a;" ${item && item.isValidated ? 'checked' : ''}>
                <label for="add-validated" style="font-size:0.9rem; font-weight:700;">Validado</label>
                <span id="add-validation-date" style="font-size:0.8rem; opacity:0.7; margin-left:auto; color:#ff9f0a; font-weight:800;">${item && item.isValidated ? (item.validatedDate || '') : ''}</span>
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

    // Validated logic - Correct Placement
    const cb = document.getElementById('add-validated');
    const ds = document.getElementById('add-validation-date');
    if (cb && ds) {
        cb.onchange = (e) => {
            if (e.target.checked) {
                const n = new Date();
                ds.innerText = `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`;
            } else {
                ds.innerText = '';
            }
        };
    }
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

        // Validated logic
        const cb = document.getElementById('add-validated');
        const ds = document.getElementById('add-validation-date');
        cb.onchange = (e) => {
            if (e.target.checked) {
                const n = new Date();
                ds.innerText = `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`;
            } else {
                ds.innerText = '';
            }
        };

        modal.style.display = 'flex';
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
        notes: document.getElementById('add-notes').value,
        isValidated: document.getElementById('add-validated').checked,
        validatedDate: document.getElementById('add-validation-date').innerText,
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
                 <p style="margin-bottom:20px; font-size:0.85rem; opacity:0.7; line-height:1.4;">Usa estes botões para mover a tua coleção entre o PC e o Telemóvel.</p>
                 
                 <div style="display:flex; flex-direction:column; gap:10px;">
                    <button onclick="exportCollection()" style="width:100%; border:none; padding:16px; border-radius:14px; background:#ff9f0a; color:white; font-weight:800; cursor:pointer; font-size:1rem;">📤 Exportar para Nuvem/Ficheiro</button>
                    <button onclick="importCollection()" style="width:100%; border:none; padding:16px; border-radius:14px; background:rgba(255,159,10,0.1); border:2px solid #ff9f0a; color:#ff9f0a; font-weight:800; cursor:pointer; font-size:1rem;">📥 Importar da Nuvem/Ficheiro</button>
                 </div>
            </div>
            
            <div style="background:rgba(255,100,100,0.05); padding:24px; border-radius:20px; border:1px solid rgba(255,0,0,0.2); margin-top:20px;">
                 <h3 style="margin-bottom:10px; font-size:1rem; color:#ff4d4d;">Zona de Perigo 🚨</h3>
                 <p style="margin-bottom:20px; font-size:0.8rem; opacity:0.65; line-height:1.4;">Se a App estiver a falhar ou se quiseres limpar tudo para começar do zero.</p>
                 <button id="btn-force-update" style="width:100%; background:#ff4d4d; color:white; border:none; padding:14px; border-radius:14px; font-weight:800; cursor:pointer;">WIPE TOTAL DA APP (v46)</button>
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

async function exportCollection() {
    logger("A exportar coleção...");
    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const platforms = await dbService.getAll('platforms');

        const data = {
            version: "v46",
            timestamp: new Date().toISOString(),
            games,
            consoles,
            platforms
        };

        // Forçar escolha de local no PC
        if (window.showSaveFilePicker) {
            const chosen = await localFileSync.selectFileForSave();
            if (!chosen) {
                logger("Exportação cancelada.");
                return;
            }
        }

        const result = await localFileSync.save(data);
        if (result === "saved") {
            uiService.alert("Ficheiro guardado com sucesso!", "Exportação Realizada 📤");
        } else {
            uiService.alert("Ficheiro enviado para a pasta de Transferências (Downloads).", "Exportação Realizada 📤");
        }
        logger("Exportação concluída.");
    } catch (err) {
        logger("EXPORT ERR: " + err.message);
        uiService.alert("Erro ao exportar: " + err.message);
    }
}

async function importCollection() {
    if (!await uiService.confirm("ATENÇÃO: Isto irá substituir toda a tua coleção local pelos dados do ficheiro. Continuar?", "Importação de Dados")) {
        return;
    }

    logger("A importar coleção...");
    try {
        const data = await localFileSync.load();
        if (!data || (!data.games && !data.consoles)) {
            throw new Error("Ficheiro inválido ou vazio.");
        }

        // Wipe current db stores
        await dbService.clear('games');
        await dbService.clear('consoles');
        await dbService.clear('platforms');

        // Insert new data
        if (data.games) {
            for (const g of data.games) await dbService.add('games', g);
        }
        if (data.consoles) {
            for (const c of data.consoles) await dbService.add('consoles', c);
        }
        if (data.platforms) {
            // Platforms store uses 'id', but add helper might generate new ones if not careful.
            // platforms.js has its own logic, but here we just put raw items.
            for (const p of data.platforms) await dbService.add('platforms', p);
        }

        uiService.alert("Importação concluída com sucesso! A App vai recarregar.", "Sucesso 📥");
        logger("Importação concluída. Recarregando...");
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        logger("IMPORT ERR: " + err.message);
        uiService.alert("Erro ao importar: " + err.message);
    }
}

/** INITIALIZATION **/
async function init() {
    logger("Iniciando RetroCollection v46...");
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
        const k = obj[key] || '(Sem Consola)';
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
window.navigateByPlatform = navigateByPlatform;
window.exportCollection = exportCollection;
window.importCollection = importCollection;

init();
