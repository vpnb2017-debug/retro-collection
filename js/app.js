import { dbService } from './services/db.js?v=106';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js?v=106';
import { coverSearchService } from './services/coverSearch.js?v=106';
import WebuyService from './services/webuyService.js?v=106';
import { localFileSync } from './services/localFileSync.js?v=106';
import { metadataService } from './services/metadataService.js?v=106';
import { cloudSyncService } from './services/cloudSyncService.js?v=106';

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
window.editPlatform = editPlatform;
window.pickLogoForPlatform = pickLogoForPlatform;
window.selectLogo = selectLogo;
window.clearFilters = clearFilters;
window.fetchMetadata = fetchMetadata;
window.clearMetadata = clearMetadata;
window.pullFromCloud = pullFromCloud;
window.pushToCloud = pushToCloud;
window.saveCloudLink = saveCloudLink;
// window.state moved down to avoid TDZ error

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
    viewMode: 'grid',
    lastFilteredList: []
};
window.state = state; // Global Exposure after init

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
        case 'nav-add':
            let itemToEdit = params;
            if (typeof params === 'string') {
                // Fetch from DB if only ID passed
                const g = await dbService.get('games', params);
                const c = await dbService.get('consoles', params);
                itemToEdit = g || c;
                if (itemToEdit) itemToEdit._t = g ? 'games' : 'consoles';
            }
            await renderAddForm(itemToEdit);
            break;
    }
}

// Special navigation for Dashboard platform clicks
async function navigateByPlatform(platform) {
    state.filterPlatform = platform;
    state.filterType = 'all';
    state.filterSearch = '';
    await navigate('nav-collection');
}

// v105: Navigation by Genre
async function navigateByGenre(genre) {
    state.filterPlatform = 'all';
    state.filterType = 'all';
    state.filterSearch = genre.toLowerCase();
    await navigate('nav-collection');
}

// v105: Navigation by Decade
async function navigateByDecade(decade) {
    state.filterPlatform = 'all';
    state.filterType = 'all';
    state.filterSearch = decade.toString();
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

        titleEl.innerHTML = `<h2>Resumo <span style="font-size:0.6rem; color:#ff9f0a; border:1px solid; padding:2px 4px; border-radius:4px; margin-left:8px;">v106</span></h2>`;

        const platData = await getPlatformOptions();

        // Sync Sentinel Logic v96
        const cloudUrl = localStorage.getItem('cloud_sync_url');
        const githubToken = localStorage.getItem('github_token');
        const lastError = localStorage.getItem('last_push_error');
        const lastSync = localStorage.getItem('last_sync_timestamp') || 'Nunca';

        let statusColor = '#22c55e'; // Green (OK)
        let statusTitle = 'Sincronização Ativa';
        let statusIcon = '🟢';
        let errorMessage = '';

        if (!cloudUrl || !githubToken) {
            statusColor = '#ffb300'; // Yellow (Config Missing)
            statusTitle = 'Configuração Incompleta';
            statusIcon = '🟡';
            errorMessage = 'Verifica o Token e o Link nas definições.';
        } else if (lastError) {
            statusColor = '#ef4444'; // Red (Error)
            statusTitle = 'Erro de Sincronização';
            statusIcon = '🔴';
            errorMessage = lastError;
        }

        scrollEl.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px; padding-bottom:40px;">
                
                <!-- Sync Sentinel v96 -->
                <div style="background:rgba(0,0,0,0.2); padding:16px; border-radius:18px; border:2px solid ${statusColor}; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.2rem;">${statusIcon}</span>
                            <span style="font-weight:700; font-size:0.85rem; color:${statusColor};">${statusTitle}</span>
                        </div>
                        <span style="font-size:0.65rem; opacity:0.6;">Última: ${lastSync}</span>
                    </div>
                    
                    ${errorMessage ? `<div style="font-size:0.75rem; color:#fff; background:rgba(239,68,68,0.1); padding:8px 12px; border-radius:10px;">${errorMessage}</div>` : ''}

                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:6px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div style="font-size:0.75rem; opacity:0.8;">
                           <b>${games.length}</b> Jogos | <b>${consoles.length}</b> Itens
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="pullFromCloud()" style="background:#444; border:none; color:white; padding:8px 12px; border-radius:10px; font-weight:700; font-size:0.7rem; cursor:pointer;">Puxar 📥</button>
                            <button onclick="pushToCloud()" style="background:${statusColor}; border:none; color:white; padding:8px 12px; border-radius:10px; font-weight:700; font-size:0.7rem; cursor:pointer;">Repetir 📤</button>
                        </div>
                    </div>
                </div>
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

            <div style="margin-top:25px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                    <h3 style="margin-bottom:12px; font-size:0.85rem; color:#ffc978; font-weight:800;">🎨 Top Géneros</h3>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${Object.entries(groupBy(games.filter(g => g.genre), 'genre'))
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 5)
                .map(([g, items]) => `
                                <div onclick="navigateByGenre('${g}')" style="display:flex; justify-content:space-between; font-size:0.75rem; cursor:pointer; padding:6px 8px; border-radius:8px; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,159,10,0.1)'" onmouseout="this.style.background='transparent'">
                                    <span style="opacity:0.7;">${g}</span>
                                    <span style="font-weight:800; color:#ff9f0a;">${items.length}</span>
                                </div>
                            `).join('') || '<p style="font-size:0.65rem; opacity:0.4;">Sem dados de género.</p>'}
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                    <h3 style="margin-bottom:12px; font-size:0.85rem; color:#ffc978; font-weight:800;">📅 Décadas</h3>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${Object.entries(groupBy(games.filter(g => g.year), g => Math.floor(g.year / 10) * 10))
                .sort((a, b) => b[0] - a[0])
                .map(([d, items]) => `
                                <div onclick="navigateByDecade(${d})" style="display:flex; justify-content:space-between; font-size:0.75rem; cursor:pointer; padding:6px 8px; border-radius:8px; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,159,10,0.1)'" onmouseout="this.style.background='transparent'">
                                    <span style="opacity:0.7;">Anos ${d}</span>
                                    <span style="font-weight:800; color:#ff9f0a;">${items.length}</span>
                                </div>
                            `).join('') || '<p style="font-size:0.65rem; opacity:0.4;">Sem dados de ano.</p>'}
                    </div>
                </div>
            </div>

            <div style="margin-top:25px; background:rgba(255,255,255,0.03); padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                <h3 style="margin-bottom:15px; font-size:1rem; color:#ffc978; font-weight:800;">📊 Stats por Consola</h3>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
                    ${Object.entries(groupBy(games.concat(consoles), 'platform'))
                .sort((a, b) => b[1].length - a[1].length)
                .map(([p, items]) => {
                    const platInfo = platData.find(x => x.name === p);
                    const logo = platInfo?.logo;
                    const fallbackHtml = `<div style="width:24px; height:24px; background:rgba(255,159,10,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:800; color:#ff9f0a;">${p.substring(0, 2).toUpperCase()}</div>`;

                    const logoHtml = logo
                        ? `<img src="${logo}" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex'" style="width:24px; height:24px; object-fit:contain; border-radius:4px;"><div style="display:none; width:24px; height:24px; background:rgba(255,159,10,0.2); border-radius:50%; align-items:center; justify-content:center; font-size:0.6rem; font-weight:800; color:#ff9f0a;">${p.substring(0, 2).toUpperCase()}</div>`
                        : fallbackHtml;

                    return `
                        <div onclick="navigateByPlatform('${p}')" style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.03); cursor:pointer;">
                            ${logoHtml}
                            <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                                <span style="font-size:0.6rem; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p}</span>
                                <span style="font-size:1rem; font-weight:800; color:#ff9f0a">${items.length}</span>
                            </div>
                        </div>
                    `;
                }).join('') || '<p style="font-size:0.85rem; opacity:0.5;">Sem itens catalogados.</p>'}
                </div>
            </div>
            
            <div style="margin-top:25px; display:flex; gap:10px;">
                <button onclick="navigate('nav-sync')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:14px; border-radius:14px; color:white; font-size:0.85rem; cursor:pointer; font-weight:600;">Definições Cloud ☁️</button>
                <button onclick="navigate('nav-platforms')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:14px; border-radius:14px; color:white; font-size:0.85rem; cursor:pointer; font-weight:600;">Consolas 🕹️</button>
            </div>
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
                <button onclick="window.clearFilters()" style="width:100%; background:rgba(255,159,10,0.1); border:1px dashed rgba(255,159,10,0.3); color:#ff9f0a; padding:8px; border-radius:10px; font-size:0.75rem; font-weight:700; cursor:pointer; margin-top:5px;">Limpar Filtros 🧹</button>
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

                // v106: Search in title, genre, and year
                if (state.filterSearch) {
                    const searchLower = state.filterSearch;
                    const titleMatch = i.title.toLowerCase().includes(searchLower);
                    const genreMatch = i.genre && i.genre.toLowerCase().includes(searchLower);
                    const yearMatch = i.year && i.year.toString().includes(searchLower);
                    if (!titleMatch && !genreMatch && !yearMatch) return false;
                }
                return true;
            }).sort((a, b) => a.title.localeCompare(b.title));

            state.lastFilteredList = filtered;

            scrollEl.innerHTML = `
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
                    ${filtered.map(item => `
                        <div onclick="navigate('nav-add', '${item.id}')" style="background:rgba(255,255,255,0.05); border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); height:210px; cursor:pointer; display:flex; flex-direction:column; transition: transform 0.2s;">
                            <div style="height:130px; background:#000 url(${item.image || ''}) center/contain no-repeat; pointer-events:none;"></div>
                            <div style="padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                                <div>
                                    <h4 style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.2; font-weight:600; margin-bottom:2px;">${item.title}</h4>
                                    ${item.year ? `<div style="font-size:0.6rem; opacity:0.5; margin-bottom:4px;">${item.year}</div>` : ''}
                                </div>
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

function clearFilters() {
    state.filterType = 'all';
    state.filterPlatform = 'all';
    state.filterSearch = '';
    const view = state.view === 'nav-collection' ? renderCollection : renderWishlist;
    view();
}

async function renderCollection() { await renderGenericGrid('Minha Coleção', i => !i.isWishlist); }
async function renderWishlist() { await renderGenericGrid('Lista de Desejos', i => !!i.isWishlist); }

/** ADD / EDIT FORM **/
async function renderAddForm(item) {
    const { titleEl, scrollEl } = getZones();
    const platforms = await getPlatformOptions();

    // Sequential Navigation Logic
    let navArrows = '';
    if (item && state.lastFilteredList.length > 1) {
        const idx = state.lastFilteredList.findIndex(x => x.id === item.id);
        if (idx !== -1) {
            const prev = state.lastFilteredList[idx - 1];
            const next = state.lastFilteredList[idx + 1];
            navArrows = `
                <div style="display:flex; gap:10px; align-items:center; margin-left:auto;">
                    <button onclick="navigate('nav-add', '${prev?.id}')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:${prev ? 1 : 0.2}; pointer-events:${prev ? 'auto' : 'none'};">⬅️</button>
                    <span style="font-size:0.7rem; opacity:0.5;">${idx + 1} / ${state.lastFilteredList.length}</span>
                    <button onclick="navigate('nav-add', '${next?.id}')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:${next ? 1 : 0.2}; pointer-events:${next ? 'auto' : 'none'};">➡️</button>
                </div>
            `;
        }
    }

    titleEl.innerHTML = `
        <div style="display:flex; align-items:center; width:100%; gap:15px;">
            <button onclick="navigate('nav-dashboard')" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; padding:5px;">🏠</button>
            <h2 style="margin:0; font-size:1.2rem;">${item ? '✏️ Editar Item' : '➕ Novo Item'}</h2>
            ${navArrows}
        </div>
    `;

    const pOptions = platforms.map(p => `<option value="${p.name}" ${(item && item.platform === p.name) ? 'selected' : ''}>${p.name}</option>`).join('');
    const type = item ? (item._t || (item.isConsole ? 'consoles' : 'games')) : 'games';

    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px; padding-bottom:120px; max-width:600px; margin:0 auto;">
            
            <div id="cover-preview" style="height:200px; background:#000 url(${item?.image || ''}) center/contain no-repeat; border-radius:15px; border:1px solid rgba(255,255,255,0.1); display:${item?.image ? 'block' : 'none'};"></div>

            <div class="v74-form-row">
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Tipo de Item</label>
                    <select id="add-type" style="padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                        <option value="games" ${type === 'games' ? 'selected' : ''}>💾 Jogo</option>
                        <option value="consoles" ${type === 'consoles' ? 'selected' : ''}>🕹️ Consola</option>
                    </select>
                </div>
                <div style="display:flex; align-items:center; gap:12px; background:#2b2b36; border:1px solid #444; padding:0 20px; border-radius:12px; height:54px; margin-top:auto;">
                    <input type="checkbox" id="add-wishlist" style="width:22px; height:22px;" ${item && item.isWishlist ? 'checked' : ''}>
                    <label for="add-wishlist" style="font-size:1rem; font-weight:600;">Wishlist</label>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Título / Nome</label>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:10px;">
                        <input id="add-title" type="text" placeholder="Ex: God of War" value="${item ? item.title : ''}" style="flex:1; padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                        <button onclick="searchCover()" style="background:#ff9f0a; border:none; color:white; padding:0 15px; border-radius:12px; font-weight:700; cursor:pointer;"><span style="font-size:1.2rem;">🔍</span></button>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="fetchMetadata()" style="flex:1; background:rgba(255,159,10,0.1); border:1px solid #ff9f0a; color:#ff9f0a; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">🤖 Auto-Preencher</button>
                        <button onclick="clearMetadata()" style="background:rgba(255,255,255,0.05); border:1px solid #444; color:#fff; padding:0 15px; border-radius:12px; font-size:1.1rem; cursor:pointer;">🧹</button>
                    </div>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Plataforma / Consola</label>
                <select id="add-platform" style="padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                    <option value="">Selecionar Sistema</option>
                    ${pOptions}
                </select>
            </div>

            <div class="v74-form-row">
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Lançamento (Ano)</label>
                    <input id="add-year" type="number" placeholder="Ex: 1991" value="${item ? (item.year || '') : ''}" style="padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Género</label>
                    <input id="add-genre" type="text" placeholder="Ex: RPG" value="${item ? (item.genre || '') : ''}" style="padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Desenvolvedora</label>
                <input id="add-developer" type="text" placeholder="Ex: SEGA" value="${item ? (item.developer || '') : ''}" style="padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Capa (URL ou Base64)</label>
                <div style="display:flex; gap:12px;">
                    <input id="add-image" type="text" placeholder="URL da Capa" value="${item ? (item.image || '') : ''}" oninput="updatePreview(this.value)" style="flex:1; padding:14px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <button onclick="document.getElementById('add-image').value = ''; updatePreview('')" style="background:#444; border:none; color:white; padding:0 18px; border-radius:12px; font-size:1.1rem;">🗑️</button>
                </div>
            </div>

            <div class="v74-form-row">
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Preço Pago (€)</label>
                    <div style="position:relative;">
                        <span style="position:absolute; left:12px; top:15px; opacity:0.5; font-size:1rem;">€</span>
                        <input id="add-price" type="number" step="0.01" placeholder="0.00" value="${item ? (item.price || '') : ''}" style="width:100%; padding:15px 15px 15px 35px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Data (DD/MM/AAAA)</label>
                    <input id="add-date" type="text" placeholder="DD/MM/AAAA" maxlength="10" value="${item ? (item.acquiredDate || '') : ''}" style="padding:15px; background:#2b2b36; border:1px solid #444; color:white; border-radius:12px; font-size:1rem; height:54px;">
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

    const acquiredDate = document.getElementById('add-date').value;
    if (acquiredDate && !isValidDate(acquiredDate)) {
        return uiService.alert("A data inserida é inválida. Use o formato DD/MM/AAAA (ex: 31/12/2023).", "Data Inválida 📅🛑");
    }

    const store = document.getElementById('add-type').value;
    const newItem = {
        id: id || crypto.randomUUID(),
        title: title,
        platform: document.getElementById('add-platform').value,
        image: document.getElementById('add-image').value,
        price: parseFloat(document.getElementById('add-price').value) || 0,
        acquiredDate: acquiredDate,
        year: parseInt(document.getElementById('add-year').value) || null,
        genre: document.getElementById('add-genre').value.trim(),
        developer: document.getElementById('add-developer').value.trim(),
        notes: document.getElementById('add-notes').value,
        isValidated: document.getElementById('add-validated').checked,
        validatedDate: document.getElementById('add-validation-date').innerText,
        isWishlist: document.getElementById('add-wishlist').checked,
        updatedAt: new Date().toISOString()
    };

    try {
        await dbService.add(store, newItem);
        uiService.alert("Guardado com sucesso!", "Parabéns ✨");

        // v92: Auto-Push in background
        pushToCloud(true);

        // Go back to the right view with filters preserved
        const targetView = newItem.isWishlist ? 'nav-wishlist' : 'nav-collection';
        navigate(targetView);
    } catch (err) { logger("SAVE ERR: " + err.message); }
}

async function deleteItem(id, store) {
    if (await uiService.confirm("Tem a certeza que quer apagar este item permanentemente?", "Apagar Item")) {
        try {
            await dbService.delete(store, id);
            // v92: Auto-Push in background
            pushToCloud(true);
            navigate(state.view === 'nav-add' ? 'nav-collection' : state.view);
        } catch (err) { logger("DEL ERR: " + err.message); }
    }
}

async function fetchMetadata() {
    const title = document.getElementById('add-title').value;
    const platform = document.getElementById('add-platform').value;
    if (!title) return uiService.alert("Escreva o título primeiro!");

    logger("A consultar Wikipedia... 🤖");
    try {
        const data = await metadataService.fetchMetadata(title, platform);
        if (!data) return uiService.alert("Não encontrei dados para este título.");

        if (data.year) document.getElementById('add-year').value = data.year;
        if (data.genre) document.getElementById('add-genre').value = data.genre;
        if (data.developer) document.getElementById('add-developer').value = data.developer;

        if (data.description && (!document.getElementById('add-notes').value || document.getElementById('add-notes').value.length < 5)) {
            document.getElementById('add-notes').value = data.description;
        }

        logger("Metadados preenchidos!");
        uiService.alert("Dados carregados da Wikipedia com sucesso!", "Inteligência 🤖");
    } catch (err) {
        logger("METADATA ERR: " + err.message);
        uiService.alert("Erro ao consultar metadados.");
    }
}

function clearMetadata() {
    const fields = ['add-year', 'add-genre', 'add-developer', 'add-notes'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    logger("Metadados limpos.");
}

async function openAddModal() { navigate('nav-add'); }

/** PLATFORM MANAGER **/
async function renderPlatformManager() {
    const { titleEl, scrollEl } = getZones();
    const platforms = await getPlatformOptions();

    titleEl.innerHTML = `<h2>Gestor de Consolas</h2>`;
    scrollEl.innerHTML = `
        <div style="max-width:600px; margin:0 auto;">
            <div style="margin-bottom:25px; display:flex; flex-direction:column; gap:12px; background:rgba(255,159,10,0.05); padding:15px; border-radius:18px; border:1px solid rgba(255,159,10,0.15);">
                <input id="plat-new-name" type="text" placeholder="Nome (Ex: PlayStation 5)" style="flex:1; padding:12px; background:#1e1e24; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                <div style="display:flex; gap:10px;">
                    <input id="plat-new-logo" type="text" placeholder="URL do Logo" style="flex:1; padding:12px; background:#1e1e24; border:1px solid #444; color:white; border-radius:12px; font-size:0.9rem;">
                    <button id="btn-add-plat" style="background:#ff9f0a; border:none; color:white; padding:0 25px; border-radius:12px; font-weight:800; font-size:1.2rem; cursor:pointer;">+</button>
                </div>
                <button onclick="window.syncPlatLogos()" style="width:100%; border:1px solid #ff9f0a; background:rgba(255,159,10,0.1); color:#ff9f0a; padding:10px; border-radius:10px; font-weight:700; font-size:0.8rem; cursor:pointer; margin-top:5px;">Sincronizar Logos 🤖</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${platforms.map(p => `
                    <div id="plat-row-${p.id}" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            ${p.logo ? `<img src="${p.logo}" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex'" style="width:24px; height:24px; object-fit:contain;"><div style="display:none; width:24px; height:24px; background:rgba(255,255,255,0.1); border-radius:50%; align-items:center; justify-content:center; font-size:0.6rem;">${p.name.substring(0, 1)}</div>` : `<div style="width:24px; height:24px; background:rgba(255,255,255,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">${p.name.substring(0, 1)}</div>`}
                            <span style="font-weight:600;">${p.name}</span>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button onclick="window.editPlatform('${p.id}')" style="background:none; border:none; opacity:0.6; color:white; cursor:pointer;">✏️</button>
                            <button onclick="window.delPlatform('${p.id}')" style="background:none; border:none; opacity:0.4; color:white; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Logo Picker Modal -->
        <div id="logo-picker-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:7000; padding:20px; flex-direction:column; align-items:center; backdrop-filter:blur(8px);">
            <div style="width:100%; max-width:600px; display:flex; justify-content:space-between; margin-bottom:20px;">
                <h3 style="color:#ff9f0a;">Selecionar Logo 🤖🎨</h3>
                <button onclick="document.getElementById('logo-picker-modal').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">✕</button>
            </div>
            <div id="logo-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap:15px; width:100%; max-width:600px; overflow-y:auto; padding-bottom:40px;">
                <!-- Logos will be injected here -->
            </div>
        </div>
    `;

    document.getElementById('btn-add-plat').onclick = async () => {
        const name = document.getElementById('plat-new-name').value;
        const logo = document.getElementById('plat-new-logo').value;
        if (!name) return;
        await addPlatform({ name, logo });
        renderPlatformManager();
    };

    window.syncPlatLogos = async () => {
        logger("Sincronizando logos...");
        await autoSyncLogos();
        renderPlatformManager();
        uiService.alert("Logos sincronizados!", "Sucesso 🤖");
    };

    window.delPlatform = async (id) => {
        try {
            await deletePlatform(id);
            renderPlatformManager();
        } catch (e) { uiService.alert(e.message); }
    };
}

async function editPlatform(id) {
    const plat = (await getPlatformOptions()).find(p => p.id === id);
    if (!plat) return;

    const row = document.getElementById(`plat-row-${id}`);
    row.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
            <input id="edit-plat-name-${id}" type="text" value="${plat.name}" style="padding:10px; background:#1e1e24; border:1px solid #ff9f0a; color:white; border-radius:10px; font-size:0.85rem;">
            <div style="display:flex; gap:8px;">
                <input id="edit-plat-logo-${id}" type="text" value="${plat.logo || ''}" placeholder="URL do Logo" style="flex:1; padding:10px; background:#1e1e24; border:1px solid #444; color:white; border-radius:10px; font-size:0.85rem;">
                <button onclick="window.pickLogoForPlatform('${id}')" style="background:#444; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer;">🎨</button>
            </div>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <button onclick="renderPlatformManager()" style="flex:1; background:none; border:none; color:white; opacity:0.6; cursor:pointer;">Cancelar</button>
                <button id="btn-save-plat-${id}" style="flex:2; background:#ff9f0a; border:none; color:white; padding:10px; border-radius:10px; font-weight:800; cursor:pointer;">Guardar ✅</button>
            </div>
        </div>
    `;

    document.getElementById(`btn-save-plat-${id}`).onclick = async () => {
        plat.name = document.getElementById(`edit-plat-name-${id}`).value;
        plat.logo = document.getElementById(`edit-plat-logo-${id}`).value;
        await updatePlatform(plat);
        renderPlatformManager();
    };
}

async function pickLogoForPlatform(id) {
    const modal = document.getElementById('logo-picker-modal');
    const grid = document.getElementById('logo-grid');
    modal.style.display = 'flex';

    // Add Search UI at the top
    grid.style.flexDirection = 'column';
    grid.style.display = 'flex';
    grid.innerHTML = `
        <div style="margin-bottom:15px; width:100%;">
            <input type="text" id="logo-search" placeholder="Procurar logo (ex: PSX, Nintendo...)" 
                style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; padding:12px; border-radius:10px; font-size:0.9rem;"
                oninput="window.filterLogos(this.value)">
        </div>
        <div id="logo-grid-inner" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap:10px; width:100%;">
            <p style="grid-column:1/-1; text-align:center; opacity:0.5;">A carregar galeria...</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1); width:100%;">
            <p style="font-size: 0.8rem; margin-bottom: 8px; opacity: 0.7;">Ou cola um link direto:</p>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="manual-logo-url" placeholder="https://exemplo.com/logo.png" style="flex: 1; background: #111; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 6px; font-size: 0.8rem;">
                <button onclick="window.selectLogo('${id}', document.getElementById('manual-logo-url').value)" style="background: #ff9f0a; border: none; color: #000; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
            </div>
        </div>
    `;

    const base = 'https://cdn.jsdelivr.net/gh/KyleBing/retro-game-console-icons@main/art/';
    const icons = [
        'PS', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'VITA', 'PSMINIS',
        'FC', 'SFC', 'N64', 'N64DD', 'NGC', 'WII', 'WIIU', 'SWITCH',
        'GB', 'GBC', 'GBA', 'DS', '3DS', 'GW', 'POKEMINI', 'VB',
        'MD', 'MS', 'SATURN', 'DC', 'GG', 'SEGACD', 'SEGA32X', 'SG1000',
        'XBOX', 'XBOX360', 'XBOXONE', 'XBOXSERIES',
        'ATARI2600', 'ATARI5200', 'ATARI7800', 'ATARI800', 'ATARIST', 'LYNX',
        'AMIGA', 'AMIGACD', 'C64', 'VIC20', 'CPC', 'MSX', 'MSX2', 'PC', 'DOS', 'PC88', 'PC98', 'PCE', 'PCECD', 'PCFX',
        'ARCADE', 'MAME', 'NEOGEO', 'NEOCD', 'CPS1', 'CPS2', 'CPS3', 'NAOMI', 'ATOMISWAVE', 'PGM',
        'COLECO', 'INTELLIVISION', 'VECTREX', 'MSX', 'SCUMMVM', 'PICO', 'TIC', 'ARDUBOY', 'UZEBOX'
    ];

    window.allIcons = icons; // Store for filtering
    window.currentEditingId = id;

    const renderInner = (list) => {
        const inner = document.getElementById('logo-grid-inner');
        inner.innerHTML = list.map(name => `
            <div onclick="window.selectLogo('${id}', '${base}${name}.png')" style="background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1); aspect-ratio:1/1;">
                <img src="${base}${name}.png" style="width:100%; height:70%; object-fit:contain;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/681/681122.png'; this.style.opacity='0.2';">
                <span style="font-size:0.5rem; margin-top:5px; opacity:0.4;">${name}</span>
            </div>
        `).join('') || '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:20px;">Nenhum logo encontrado.</p>';
    };

    renderInner(icons);

    window.filterLogos = (query) => {
        const filtered = icons.filter(i => i.toLowerCase().includes(query.toLowerCase()));
        renderInner(filtered);
    };
}

function selectLogo(id, url) {
    if (!url) return;
    const input = document.getElementById(`edit-plat-logo-${id}`) || document.getElementById('plat-new-logo');
    if (input) input.value = url;
    document.getElementById('logo-picker-modal').style.display = 'none';
}

/** SYNC / SETTINGS **/
async function renderSyncView() {
    const { titleEl, scrollEl } = getZones();
    const cloudUrl = localStorage.getItem('cloud_sync_url') || '';
    const githubToken = localStorage.getItem('github_token') || '';
    const lastSync = localStorage.getItem('last_sync_timestamp') || 'Nunca';

    // Status Logic
    const hasToken = githubToken.length > 10;
    const hasUrl = cloudUrl.includes('gist.github.com');

    titleEl.innerHTML = `<h2>Nuvem & Definições</h2>`;
    scrollEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px; max-width:600px; margin:0 auto;">
            
            <!-- Cloud Sync Section -->
            <div style="background:linear-gradient(135deg, rgba(255,159,10,0.1) 0%, rgba(255,121,80,0.1) 100%); padding:28px; border-radius:24px; border:1px solid rgba(255,159,10,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                 <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:1.8rem;">☁️</span>
                        <h3 style="margin:0; font-size:1.2rem; color:#ff9f0a;">Sincronização Cloud</h3>
                    </div>
                    ${hasToken ? '<span style="background:#22c55e; color:white; padding:4px 10px; border-radius:20px; font-size:0.65rem; font-weight:800;">🔐 PROTEGIDO</span>' : '<span style="background:#ef4444; color:white; padding:4px 10px; border-radius:20px; font-size:0.65rem; font-weight:800;">⚠️ SEM TOKEN</span>'}
                 </div>
                 
                 <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:12px; margin-bottom:20px; font-size:0.8rem; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="opacity:0.6;">Última Puxada:</span>
                        <span style="color:#ff9f0a; font-weight:700;">${lastSync}</span>
                    </div>
                 </div>

                 <p style="margin-bottom:20px; font-size:0.9rem; opacity:0.8; line-height:1.5;">A sincronização é **automática** em background. Usa estes botões apenas para verificação manual.</p>
                 
                 <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">Link do Gist (Secret)</label>
                    <input type="text" id="cloud-url-input" placeholder="https://gist.github.com/..." value="${cloudUrl}" style="background:#1a1a20; border:1px solid #444; color:white; padding:15px; border-radius:12px; font-size:0.9rem;">
                 </div>

                 <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px;">
                    <label style="font-size:0.75rem; color:#ff9f0a; font-weight:700; margin-left:5px;">GitHub Token (Escrita)</label>
                    <input type="password" id="github-token-input" placeholder="ghp_..." value="${githubToken}" style="background:#1a1a20; border:1px solid #444; color:white; padding:15px; border-radius:12px; font-size:0.9rem;">
                    <p style="font-size:0.65rem; opacity:0.4; margin-top:4px;">Invisível por segurança. Necessário para enviar dados para a nuvem.</p>
                 </div>

                 <div style="display:flex; flex-direction:column; gap:12px;">
                    <button onclick="saveCloudLink()" style="width:100%; height:50px; background:#444; border:none; color:white; border-radius:14px; font-weight:700; cursor:pointer;">Gravar Chaves 💾</button>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
                        <button onclick="pullFromCloud()" style="border:none; padding:18px; border-radius:16px; background:#ff9f0a; color:white; font-weight:800; cursor:pointer; font-size:0.9rem; box-shadow: 0 4px 15px rgba(255,159,10,0.3); display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <span style="font-size:1.5rem;">📥</span> Puxar Agora
                        </button>
                        <button onclick="pushToCloud()" style="border:none; padding:18px; border-radius:16px; background:#22c55e; color:white; font-weight:800; cursor:pointer; font-size:0.9rem; box-shadow: 0 4px 15px rgba(34,197,94,0.3); display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <span style="font-size:1.5rem;">📤</span> Enviar Agora
                        </button>
                    </div>
                 </div>
                 
                <p style="margin-top:15px; font-size:0.75rem; color:#22c55e; font-weight:700; text-align:center;">🤖 Sentinela de Sync Ativo (v106)</p>
            </div>

            <!-- Legacy Local Sync Section -->
            <div style="background:rgba(255,255,255,0.03); padding:24px; border-radius:20px; border:1px solid rgba(255,255,255,0.05);">
                 <h3 style="margin-bottom:10px; font-size:1rem; opacity:0.7;">Ficheiro Local (Manual) 📂</h3>
                 <div style="display:flex; flex-direction:column; gap:10px;">
                    <button onclick="exportCollection()" style="width:100%; border:none; padding:16px; border-radius:14px; background:rgba(255,255,255,0.05); color:white; font-weight:700; cursor:pointer; font-size:0.9rem; border:1px solid rgba(255,255,255,0.1);">📤 Exportar JSON</button>
                    <button onclick="importCollection()" style="width:100%; border:none; padding:16px; border-radius:14px; background:rgba(255,255,255,0.05); color:white; font-weight:700; cursor:pointer; font-size:0.9rem; border:1px solid rgba(255,255,255,0.1);">📥 Importar JSON</button>
                 </div>
            </div>
            
            <div style="background:rgba(255,100,100,0.05); padding:24px; border-radius:20px; border:1px solid rgba(255,0,0,0.2); margin-top:10px;">
                 <h3 style="margin-bottom:10px; font-size:1rem; color:#ff4d4d;">Zona de Perigo 🚨</h3>
                 <button id="btn-force-update" style="width:100%; background:#ff4d4d; color:white; border:none; padding:14px; border-radius:14px; font-weight:800; cursor:pointer;">WIPE TOTAL DA APP</button>
            </div>
        </div>
    `;

    document.getElementById('btn-force-update').onclick = async () => {
        if (confirm("ATENÇÃO: Isto apagará TODOS os dados locais! Tem o JSON guardado?")) {
            localStorage.clear();
            const rs = await navigator.serviceWorker.getRegistrations();
            for (let r of rs) await r.unregister();
            location.href = location.href.split('?')[0] + '?v=' + Date.now();
        }
    };
}

async function saveCloudLink() {
    const url = document.getElementById('cloud-url-input').value.trim();
    const token = document.getElementById('github-token-input').value.trim();

    if (!url) return uiService.alert("Por favor insira um link válido.");

    localStorage.setItem('cloud_sync_url', url);
    if (token) localStorage.setItem('github_token', token);
    localStorage.removeItem('last_push_error'); // Limpa erro ao gravar novas chaves

    uiService.alert("Chaves guardadas com sucesso! 💎", "Configurado!");
}

async function pullFromCloud(silent = false) {
    const url = localStorage.getItem('cloud_sync_url');
    if (!url) {
        if (!silent) uiService.alert("Configura primeiro o link do Gist nas definições.");
        return;
    }

    if (!silent) logger("A ligar à nuvem...");
    try {
        const data = await cloudSyncService.fetchDatabase(url);
        if (!data || (!data.games && !data.consoles)) {
            throw new Error("Dados da nuvem inválidos.");
        }

        const now = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('last_sync_timestamp', now);

        if (silent) {
            await performFullImport(data);
            if (state.view === 'nav-dashboard') renderDashboard();
            return;
        }

        const totalItems = (data.games?.length || 0) + (data.consoles?.length || 0);
        if (await uiService.confirm(`A Nuvem contém ${totalItems} itens (${data.games?.length || 0} jogos e ${data.consoles?.length || 0} consolas). Desejas substituir a coleção local?`, "Sincronização Cloud ☁️")) {
            await performFullImport(data);
            uiService.alert("Coleção sincronizada com sucesso! ✨", "Sucesso!");
            await navigate('nav-dashboard');
        }
    } catch (err) {
        if (!silent) {
            logger("PULL ERR: " + err.message);
            uiService.alert("Erro ao receber: " + err.message);
        }
    }
}

async function pushToCloud(silent = false) {
    const url = localStorage.getItem('cloud_sync_url');
    const token = localStorage.getItem('github_token');

    if (!url || !url.includes('gist.github.com')) {
        if (!silent) return uiService.alert("O upload requer um link do GitHub Gist.");
        return;
    }
    if (!token) {
        if (!silent) return uiService.alert("Precisas de um GitHub Token para subir dados.");
        return;
    }

    // v103: Diagnostic logging
    console.log('[GIST DEBUG] URL:', url);
    const gistIdMatch = url.match(/\/([a-fA-F0-9]{20,40})\b/);
    console.log('[GIST DEBUG] Match result:', gistIdMatch);
    const gistId = gistIdMatch ? gistIdMatch[1] : null;
    console.log('[GIST DEBUG] Extracted ID:', gistId);

    if (!gistId) {
        const errorMsg = `Link do Gist inválido. Não encontrei o ID. URL: ${url}`;
        console.error('[GIST DEBUG] ERRO:', errorMsg);
        localStorage.setItem('last_push_error', errorMsg);
        if (state.view === 'nav-dashboard') renderDashboard();
        if (!silent) uiService.alert(errorMsg);
        return;
    }

    if (!silent) logger("A preparar envio...");
    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const platforms = await dbService.getAll('platforms');

        const data = {
            version: "v106",
            timestamp: new Date().toISOString(),
            games,
            consoles,
            platforms
        };

        const totalItems = games.length + consoles.length;
        if (silent || await uiService.confirm(`Desejas exportar ${totalItems} itens para a Nuvem?`, "Sincronizar 📤")) {
            if (!silent) logger("A enviar...");
            await cloudSyncService.uploadToGist(token, gistId, data);

            localStorage.removeItem('last_push_error');

            if (silent) {
                const toast = document.createElement('div');
                toast.style = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(34,197,94,0.9); color:white; padding:10px 20px; border-radius:20px; font-size:0.75rem; z-index:99999; border:1px solid #fff; animation: fadeout 3s forwards;";
                toast.innerText = "☁️ Nuvem Atualizada!";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            } else {
                uiService.alert("Sincronizado com sucesso! 🚀", "Enviado!");
            }
            if (state.view === 'nav-dashboard') renderDashboard();
        }
    } catch (err) {
        let errorMsg = err.message;
        if (errorMsg.includes("404")) {
            errorMsg = "Gist não encontrado (404). Verifica se o Link está correto no telemóvel.";
        }
        localStorage.setItem('last_push_error', errorMsg);
        if (state.view === 'nav-dashboard') renderDashboard();

        if (!silent) {
            logger("PUSH ERR: " + errorMsg);
            uiService.alert("Erro ao enviar: " + errorMsg);
        } else {
            const toast = document.createElement('div');
            toast.style = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(239,68,68,0.9); color:white; padding:10px 20px; border-radius:20px; font-size:0.75rem; z-index:99999; border:1px solid #fff; animation: fadeout 5s forwards;";
            toast.innerText = "❌ Falha na Nuvem!";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }
}

async function performFullImport(data) {
    logger("A limpar colecção...");
    await dbService.clear('games');
    await dbService.clear('consoles');
    await dbService.clear('platforms');

    logger("A processar novos dados...");
    if (data.platforms) {
        for (let p of data.platforms) await dbService.put('platforms', p);
    }
    if (data.games) {
        for (let g of data.games) await dbService.put('games', g);
    }
    if (data.consoles) {
        for (let c of data.consoles) await dbService.put('consoles', c);
    }
    logger("Importação concluída com sucesso.");
}

async function exportCollection() {
    logger("A exportar coleção...");
    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const platforms = await dbService.getAll('platforms');

        const data = {
            version: "v92",
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

        if (await uiService.confirm("Desejas substituir a coleção local?", "Confirmar Importação")) {
            await performFullImport(data);
            uiService.alert("Importação concluída! 🎮");
            await navigate('nav-dashboard');
        }
    } catch (err) {
        logger("IMPORT ERR: " + err.message);
        uiService.alert("Erro ao importar: " + err.message);
    }
}

/** INITIALIZATION **/
async function init() {
    logger("Iniciando RetroCollection v106...");
    try {
        await dbService.open();
        logger("DB Conectado.");

        // Auto-Sync Logos logic for v106
        if (!localStorage.getItem('logos_synced_v106')) {
            await autoSyncLogos();
            localStorage.setItem('logos_synced_v106', 'true');
        }

        // v98 Resilient Startup
        try {
            await pullFromCloud(true);
        } catch (e) {
            logger("Aviso: Falha no pull inicial, continuando...");
        }

        // Cloud Check
        try {
            const cloudUrl = localStorage.getItem('cloud_sync_url');
            if (cloudUrl && !sessionStorage.getItem('startup_synced')) {
                sessionStorage.setItem('startup_synced', 'true');
                const gamesCount = (await dbService.getAll('games')).length;
                if (gamesCount === 0) {
                    logger("Base de dados vazia. A tentar puxar da nuvem...");
                    await pullFromCloud();
                }
            }
        } catch (e) { logger("Erro no cloud check inicial."); }

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
        }, 1500);

    } catch (err) {
        logger("FALHA CRÍTICA: " + err.message);
    }
}

async function autoSyncLogos() {
    const platforms = await getPlatformOptions();
    const base = 'https://cdn.jsdelivr.net/gh/KyleBing/retro-game-console-icons@main/art/';
    const map = {
        'playstation': 'PS.png', 'ps1': 'PS.png', 'psx': 'PS.png', 'playstation 1': 'PS.png', 'psone': 'PS.png',
        'playstation 2': 'PS2.png', 'ps2': 'PS2.png',
        'playstation 3': 'PS3.png', 'ps3': 'PS3.png',
        'playstation 4': 'PS4.png', 'ps4': 'PS4.png',
        'playstation 5': 'PS5.png', 'ps5': 'PS5.png',
        'psp': 'PSP.png', 'ps vita': 'VITA.png', 'psvita': 'VITA.png',
        'nes': 'FC.png', 'nintendo': 'FC.png', 'famicom': 'FC.png', 'nintendo entertainment system': 'FC.png',
        'snes': 'SFC.png', 'super nintendo': 'SFC.png', 'super famicom': 'SFC.png',
        'n64': 'N64.png', 'nintendo 64': 'N64.png',
        'gamecube': 'NGC.png', 'ngc': 'NGC.png', 'nintendo gamecube': 'NGC.png',
        'wii': 'WII.png', 'wii u': 'WIIU.png', 'wiiu': 'WIIU.png',
        'switch': 'SWITCH.png', 'nintendo switch': 'SWITCH.png',
        'game boy': 'GB.png', 'gb': 'GB.png',
        'game boy color': 'GBC.png', 'gbc': 'GBC.png',
        'game boy advance': 'GBA.png', 'gba': 'GBA.png', 'gba sp': 'GBA.png',
        'ds': 'DS.png', 'nintendo ds': 'DS.png', 'ds lite': 'DS.png',
        '3ds': '3DS.png', 'nintendo 3ds': '3DS.png', 'new 3ds': '3DS.png',
        'mega drive': 'MD.png', 'megadrive': 'MD.png', 'genesis': 'MD.png', 'sega mega drive': 'MD.png',
        'master system': 'MS.png', 'mastersystem': 'MS.png', 'sega master system': 'MS.png',
        'saturn': 'SATURN.png', 'sega saturn': 'SATURN.png',
        'dreamcast': 'DC.png', 'sega dreamcast': 'DC.png',
        'game gear': 'GG.png', 'sega game gear': 'GG.png',
        'atari 2600': 'ATARI2600.png', 'atari': 'ATARI2600.png',
        'xbox': 'XBOX.png', 'xbox 360': 'XBOX360.png', 'xbox one': 'XBOXONE.png', 'xbox series': 'XBOXSERIES.png'
    };

    for (const p of platforms) {
        // Only sync if logo is missing or is just a placeholder
        if (!p.logo || p.logo.includes('flaticon.com')) {
            const key = p.name.trim().toLowerCase();
            if (map[key]) {
                p.logo = base + map[key];
                await updatePlatform(p);
            }
        }
    }
}

// Helpers
function isValidDate(dateString) {
    if (!dateString) return true;
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateString.match(regex)) return false;

    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && (date.getMonth() + 1) === month && date.getDate() === day;
}

function groupBy(arr, key) {
    return arr.reduce((acc, obj) => {
        const k = (typeof key === 'function' ? key(obj) : obj[key]) || '(Geral)';
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
window.navigateByGenre = navigateByGenre; // v105
window.navigateByDecade = navigateByDecade; // v105
window.exportCollection = exportCollection;
window.importCollection = importCollection;

init();
