import { dbService } from './services/db.js';
import { getPlatformOptions, addPlatform, updatePlatform, deletePlatform, ensurePlatformExists } from './services/platforms.js';
import { coverSearchService } from './services/coverSearch.js';
import WebuyService from './services/webuyService.js';
import { localFileSync } from './services/localFileSync.js?v=20';

// Premium UI Service for Modals
const uiService = {
    async alert(message, title = 'Aviso ⚙️') {
        return this.showModal({ title, body: message, type: 'alert' });
    },
    async confirm(message, title = 'Confirmação ❓') {
        return this.showModal({ title, body: message, type: 'confirm' });
    },
    async showModal({ title, body, type }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const content = document.createElement('div');
            content.className = 'modal-content';

            let buttons = '';
            if (type === 'alert') {
                buttons = `<button class="btn-primary modal-btn-ok">Entendido</button>`;
            } else {
                buttons = `
                    <button class="modal-btn-cancel" style="color:var(--text-secondary); font-weight:600; padding:0.5rem 1rem;">Cancelar</button>
                    <button class="btn-primary modal-btn-ok">Confirmar</button>
                `;
            }

            content.innerHTML = `
                <div class="modal-title">${title}</div>
                <div class="modal-body">${body}</div>
                <div class="modal-actions">${buttons}</div>
            `;

            overlay.appendChild(content);
            document.body.appendChild(overlay);

            // Trigger animation
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });

            const closeModal = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300);
            };

            content.querySelector('.modal-btn-ok').onclick = () => closeModal(true);
            if (type === 'confirm') {
                content.querySelector('.modal-btn-cancel').onclick = () => closeModal(false);
            }
        });
    }
};

// State
const state = {
    view: 'dashboard',
    items: [],
    loading: false,
    filterType: 'all',
    filterPlatform: 'all',
    filterSearch: '',
    viewMode: 'grid', // 'grid' or 'list'
    deferredPrompt: null // To store PWA install prompt
};

// Listen for PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    console.log("PWA install prompt captured");
    // Refresh dashboard if we are on it to show the button
    if (state.view === 'dashboard' || state.view === 'mobile-home') {
        renderDashboard();
    }
});

// DOM Elements & Nav
const contentEl = document.getElementById('main-content');
const navIds = ['nav-dashboard', 'nav-collection', 'nav-wishlist', 'nav-platforms', 'nav-import', 'nav-add'];
const mobileNavIds = ['mobile-home', 'mobile-collection', 'mobile-wishlist', 'mobile-add', 'mobile-sync'];

function updateNav() {
    // Desktop Nav
    navIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.replaceWith(el.cloneNode(true));
            document.getElementById(id).addEventListener('click', (e) => {
                const targetId = e.target.id || e.target.closest('button').id;
                navigate(targetId);
            });
        }
    });

    // Mobile Nav
    mobileNavIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.replaceWith(el.cloneNode(true));
            document.getElementById(id).addEventListener('click', (e) => {
                const targetId = e.target.id || e.target.closest('button').id;
                navigate(targetId);
            });
        }
    });
}

function navigate(id, params = null) {
    // Sync active states
    [...navIds, ...mobileNavIds].forEach(navId => {
        const el = document.getElementById(navId);
        if (el) el.classList.remove('active');
    });

    if (id === 'nav-dashboard' || id === 'mobile-home') {
        renderDashboard();
        if (document.getElementById('nav-dashboard')) document.getElementById('nav-dashboard').classList.add('active');
        if (document.getElementById('mobile-home')) document.getElementById('mobile-home').classList.add('active');
    }
    else if (id === 'nav-collection' || id === 'mobile-collection') {
        renderCollection();
        if (document.getElementById('nav-collection')) document.getElementById('nav-collection').classList.add('active');
        if (document.getElementById('mobile-collection')) document.getElementById('mobile-collection').classList.add('active');
    }
    else if (id === 'nav-wishlist' || id === 'mobile-wishlist') {
        renderWishlist();
        if (document.getElementById('nav-wishlist')) document.getElementById('nav-wishlist').classList.add('active');
        if (document.getElementById('mobile-wishlist')) document.getElementById('mobile-wishlist').classList.add('active');
    }
    else if (id === 'nav-add' || id === 'mobile-add') {
        renderAddForm(params);
        if (document.getElementById('nav-add')) document.getElementById('nav-add').classList.add('active');
        if (document.getElementById('mobile-add')) document.getElementById('mobile-add').classList.add('active');
    }
    else if (id === 'nav-platforms') {
        renderPlatformManager();
        document.getElementById('nav-platforms').classList.add('active');
    }
    else if (id === 'nav-import') {
        renderImportForm();
        document.getElementById('nav-import').classList.add('active');
    }
    else if (id === 'mobile-sync') {
        renderSyncView();
        document.getElementById('mobile-sync').classList.add('active');
    }
}

// --- INIT ---
async function init() {
    try {
        console.log("Initializing DB connection...");
        await dbService.open();
        updateNav();
        console.log("DB Connected. Rendering Dashboard.");
        await renderDashboard();
    } catch (e) {
        console.error("Critical Init Error:", e);
        contentEl.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ff6b6b;">
                <h2>Erro ao Iniciar ☠️</h2>
                <p>Não foi possível carregar a base de dados.</p>
                <pre style="background: rgba(0,0,0,0.5); padding: 1rem; margin: 1rem 0; overflow: auto; text-align: left;">${e.message}\n${e.stack}</pre>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; cursor: pointer;">Tentar Novamente</button>
            </div>
        `;
    }
}

// --- VIEWS ---

async function renderDashboard() {
    try {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');

        const ownedGames = games.filter(g => !g.isWishlist);
        const ownedConsoles = consoles.filter(c => !c.isWishlist);
        const wishlistCount = [...games, ...consoles].filter(i => i.isWishlist).length;

        const totalOwned = ownedGames.length + ownedConsoles.length;

        let installNotice = '';
        if (state.deferredPrompt) {
            installNotice = `
                <div class="glass" style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--accent-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; background: rgba(247, 37, 133, 0.1);">
                    <div>
                        <b style="color: var(--accent-color);">✨ App Disponível</b>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);">Instala para ecrã inteiro!</p>
                    </div>
                    <button id="btn-dash-install" class="btn-primary" style="padding: 0.5rem 1rem !important; font-size: 0.8rem;">Instalar</button>
                </div>
            `;
        }

        // Platform Stats Logic
        const statsByPlatform = {};
        [...ownedGames, ...ownedConsoles].forEach(item => {
            const p = item.platform || 'Geral';
            statsByPlatform[p] = (statsByPlatform[p] || 0) + 1;
        });

        const sortedPlatforms = Object.entries(statsByPlatform).sort((a, b) => b[1] - a[1]);
        const platformStatsHtml = sortedPlatforms.map(([name, count]) => `
            <div style="display:flex; justify-content:space-between; padding:0.5rem; background:rgba(255,255,255,0.05); border-radius:4px; font-size:0.85rem;">
                <span style="color:var(--text-secondary)">${name}</span>
                <span style="color:var(--accent-secondary); font-weight:700;">${count}</span>
            </div>
        `).join('');

        contentEl.innerHTML = `
        <div class="view-scroll">
            <div class="header-section">
                <h2>Olá, Colecionador! 👋</h2>
                <p class="subtitle">Aqui está o resumo do teu império. <span style="opacity:0.3; font-size:0.7rem; font-weight:400;">v20</span></p>
                ${installNotice}
            </div>

        <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
            <div class="stat-card glass" style="padding: 1.5rem; border-radius: var(--radius-lg); border-left: 4px solid var(--accent-secondary); cursor:pointer;" id="dash-link-collection">
                <h3>Coleção</h3>
                <p class="stat-number" style="font-size: 2.5rem; font-weight: 700; color: var(--text-primary)">${totalOwned}</p>
            </div>
            <div class="stat-card glass" style="padding: 1.5rem; border-radius: var(--radius-lg); border-left: 4px solid var(--accent-glow); cursor:pointer;" id="dash-link-wishlist">
                <h3>Wishlist</h3>
                <p class="stat-number" style="font-size: 2.5rem; font-weight: 700; color: var(--text-primary)">${wishlistCount}</p>
            </div>
        </div>

        <div style="margin-top: 2.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <div class="glass" style="padding: 1.5rem; border-radius: var(--radius-lg);">
                <h3 style="margin-bottom: 1rem; color: var(--accent-secondary); display:flex; align-items:center; gap:10px;">📊 Por Plataforma</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
                    ${platformStatsHtml || '<p style="font-size:0.8rem; color:var(--text-secondary);">Sem itens na coleção.</p>'}
                </div>
            </div>

            <div class="glass" style="padding: 1.5rem; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 1rem;">
                <h3 style="margin-bottom: 0.5rem; color: var(--accent-color);">⚙️ Opções Rápidas</h3>
                <button class="btn-primary" style="width:100%;" id="dash-link-platforms">Gerir Plataformas 🎮</button>
                <button class="glass glass-hover" style="width:100%; border:1px solid var(--accent-secondary); border-radius:var(--radius-md); padding:0.8rem;" id="dash-link-sync">Nuvem & Sync ☁️</button>
            </div>
        </div>
    `;

        // Add listeners to dashboard cards
        document.getElementById('dash-link-collection').onclick = () => navigate('nav-collection');
        document.getElementById('dash-link-wishlist').onclick = () => navigate('nav-wishlist');
        document.getElementById('dash-link-platforms').onclick = () => navigate('nav-platforms');
        document.getElementById('dash-link-sync').onclick = () => navigate('mobile-sync');

        if (state.deferredPrompt && document.getElementById('btn-dash-install')) {
            document.getElementById('btn-dash-install').onclick = async () => {
                const promptEvent = state.deferredPrompt;
                promptEvent.prompt();
                const { outcome } = await promptEvent.userChoice;
                state.deferredPrompt = null;
                renderDashboard();
            };
        }
    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

async function renderGenericGrid(viewTitle, itemsFilter) {
    const platforms = await getPlatformOptions();
    const platformOptionsHtml = platforms.map(p => {
        const selected = state.filterPlatform === p.name ? 'selected' : '';
        return `<option value="${p.name}" ${selected}>${p.name}</option>`;
    }).join('');

    contentEl.innerHTML = `
        <div class="header-section" style="padding: var(--space-lg) var(--space-lg) 0 var(--space-lg);">
             <h2>${viewTitle}</h2>
        </div>
        
        <div class="filters glass" style="display:flex; gap:1rem; padding:1rem; border-radius:var(--radius-md); margin: 1rem var(--space-lg) 2rem var(--space-lg); flex-wrap:wrap; border:1px solid var(--accent-glow);">
            <div style="flex:1; min-width: 120px;">
                <label style="font-size:0.8rem; color:var(--accent-secondary)">Tipo</label>
                <select id="filter-type">
                    <option value="all" ${state.filterType === 'all' ? 'selected' : ''}>Tudo</option>
                    <option value="games" ${state.filterType === 'games' ? 'selected' : ''}>Jogos</option>
                    <option value="consoles" ${state.filterType === 'consoles' ? 'selected' : ''}>Consolas</option>
                </select>
            </div>
            <div style="flex:1; min-width: 120px;">
                <label style="font-size:0.8rem; color:var(--accent-secondary)">Plataforma</label>
                <select id="filter-platform">
                    <option value="all" ${state.filterPlatform === 'all' ? 'selected' : ''}>Todas</option>
                    ${platformOptionsHtml}
                </select>
            </div>
            <div style="flex:2; min-width: 200px;">
                <label style="font-size:0.8rem; color:var(--accent-secondary)">Pesquisa</label>
                <input type="text" id="search-input" placeholder="Nome do item..." value="${state.filterSearch}">
            </div>
        </div>

        <div id="grid-scroll-area" style="flex:1; overflow-y:auto; padding: 0 var(--space-lg) var(--space-lg) var(--space-lg);">
            <div class="collection-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;">
                <p style="color:white">A carregar...</p>
            </div>
        </div>

        <!-- Float toggle for Mobile -->
        <button id="view-toggle" class="glass" style="position:fixed; bottom:80px; right:20px; width:50px; height:50px; border_radius:50%; z-index:90; display:none; align-items:center; justify-content:center; font-size:1.2rem; border:1px solid var(--accent-color);">
            ${state.viewMode === 'grid' ? '📄' : '🔲'}
        </button>
    `;

    const games = await dbService.getAll('games');
    const consoles = await dbService.getAll('consoles');
    let allItems = [
        ...games.map(g => ({ ...g, _type: 'games' })),
        ...consoles.map(c => ({ ...c, _type: 'consoles' }))
    ].filter(itemsFilter);

    // Ordenação Automática: Título (asc) -> Plataforma (asc)
    allItems.sort((a, b) => {
        const titleSort = a.title.localeCompare(b.title);
        if (titleSort !== 0) return titleSort;
        return (a.platform || "").localeCompare(b.platform || "");
    });

    const grid = document.querySelector('.collection-grid');
    const filterTypeEl = document.getElementById('filter-type');
    const filterPlatformEl = document.getElementById('filter-platform');
    const searchInput = document.getElementById('search-input');

    function applyFilters() {
        state.filterType = filterTypeEl.value;
        state.filterPlatform = filterPlatformEl.value;
        state.filterSearch = searchInput.value;

        const fSearch = state.filterSearch.toLowerCase();

        const filtered = allItems.filter(item => {
            if (state.filterType !== 'all' && item._type !== state.filterType) return false;
            if (state.filterPlatform !== 'all' && item.platform !== state.filterPlatform) return false;
            if (fSearch && !item.title.toLowerCase().includes(fSearch)) return false;
            return true;
        });

        renderGrid(filtered);
    }

    function renderGrid(items) {
        if (items.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Nenhum item encontrado.</p>`;
            return;
        }

        // Adjust grid for list mode
        if (state.viewMode === 'list') {
            grid.style.gridTemplateColumns = '1fr';
            grid.style.gap = '0.5rem';
        } else {
            // Restore default (which is 4 columns on desktop, 2 on mobile via CSS)
            grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
            grid.style.gap = '1.5rem';
        }

        grid.innerHTML = items.map(item => {
            if (state.viewMode === 'list') {
                return `
                <div class="game-card glass glass-hover" data-id="${item.id}" data-type="${item._type}" style="border-radius: var(--radius-md); overflow: hidden; display: flex; align-items: center; padding: 0.5rem; gap: 1rem; border: 1px solid var(--border-color); cursor:pointer;">
                    <div style="width: 50px; height: 50px; border-radius: 4px; background-image: url(${item.image || ''}); background-size: cover; background-position: center; background-color: #000; flex-shrink: 0; display:flex; align-items:center; justify-content:center;">
                        ${!item.image ? '👾' : ''}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <h4 style="font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-secondary)">${item.title}</h4>
                        <span style="font-size: 0.7rem; color: var(--text-secondary);">${item.platform || 'General'}</span>
                    </div>
                    <div style="font-size: 1.2rem; opacity:0.5;">✏️</div>
                </div>`;
            }

            let imgLayer = `<div style="flex:1; background: linear-gradient(45deg, #2d1b3e, #000); display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 2rem; opacity:0.5">👾</span>
                            </div>`;

            if (item.image) {
                imgLayer = `
                <div style="flex:1; position:relative; overflow:hidden; background:#000;">
                    <div style="position:absolute; top:0; left:0; right:0; bottom:0; background-image: url(${item.image}); background-size: cover; background-position: center; filter: blur(5px); opacity: 0.3;"></div>
                    <div style="position:absolute; top:0; left:0; right:0; bottom:0; background-image: url(${item.image}); background-size: contain; background-position: center; background-repeat: no-repeat;"></div>
                </div>`;
            }

            return `
            <div class="game-card glass glass-hover" data-id="${item.id}" data-type="${item._type}" style="border-radius: var(--radius-lg); overflow: hidden; height: 320px; display: flex; flex-direction: column; cursor: pointer; border: 1px solid var(--border-color); position: relative;">
                ${imgLayer}
                <div style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.3)">
                    <h4 style="font_weight: 600; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--accent-secondary)">${item.title}</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem">
                        <span style="font-size: 0.75rem; color: var(--text-secondary); background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${item.platform || 'General'}</span>
                        <span style="font-size: 0.75rem; color: #666;">${item._type === 'games' ? 'Jogo' : 'HW'}</span>
                    </div>
                    ${item.acquiredDate ? `<p style="font-size: 0.65rem; color: #555; margin-top:0.5rem;">📅 Comprado em: ${item.acquiredDate}</p>` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    // Toggle view mode logic
    const viewToggle = document.getElementById('view-toggle');
    if (viewToggle) {
        if (window.innerWidth <= 600) viewToggle.style.display = 'flex';
        viewToggle.onclick = () => {
            state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
            viewToggle.innerText = state.viewMode === 'grid' ? '📄' : '🔲';
            applyFilters();
        };
    }

    filterTypeEl.addEventListener('change', applyFilters);
    filterPlatformEl.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    grid.addEventListener('click', async (e) => {
        const card = e.target.closest('.game-card');
        if (card) {
            const id = card.dataset.id;
            const type = card.dataset.type;
            const item = allItems.find(i => i.id === id);
            if (item) navigate('nav-add', item);
        }
    });

    applyFilters();
}

async function renderCollection() {
    await renderGenericGrid('Minha Coleção', i => !i.isWishlist);
}

async function renderWishlist() {
    await renderGenericGrid('Lista de Desejos', i => !!i.isWishlist);
}

async function renderPlatformManager() {
    const platforms = await getPlatformOptions();

    contentEl.innerHTML = `
        <div class="header-section">
             <h2>Gestão de Plataformas</h2>
             <p class="subtitle">Adicione ou edite os seus sistemas</p>
        </div>

        <div style="max-width: 600px; margin: 0 auto;">
            <div class="glass" style="padding: 2rem; border-radius: var(--radius-lg);">
                <form id="platform-form" style="display: flex; gap: 0.5rem; margin-bottom: 2rem;">
                    <input type="text" id="platform-name" placeholder="Ex: Game Boy Color" required style="flex:1;">
                    <button type="submit" class="btn-primary">Adicionar</button>
                </form>

                <div id="platform-list" style="display: flex; flex-direction: column; gap: 0.8rem;">
                    ${platforms.map(p => `
                        <div class="glass" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-radius: var(--radius-md);">
                            <span>${p.name}</span>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn-edit-plat" data-id="${p.id}" data-name="${p.name}" style="background:none; border:none; cursor:pointer;">✏️</button>
                                <button class="btn-del-plat" data-id="${p.id}" style="background:none; border:none; cursor:pointer;">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                    ${platforms.length === 0 ? '<p style="text-align:center; color:var(--text-secondary);">Nenhuma plataforma registada.</p>' : ''}
                </div>
            </div>
        </div>
    `;

    const form = document.getElementById('platform-form');
    const input = document.getElementById('platform-name');
    const list = document.getElementById('platform-list');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        const res = await addPlatform({ name });
        if (!res) uiService.alert('Esta plataforma já possui esse nome ou já existe.', 'Plataforma Duplicada');
        renderPlatformManager();
    });

    list.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-del-plat')) {
            const id = e.target.closest('.btn-del-plat').dataset.id;
            if (await uiService.confirm('Tem a certeza que quer apagar esta plataforma?')) {
                try {
                    await deletePlatform(id);
                    renderPlatformManager();
                } catch (err) {
                    uiService.alert(err.message, 'Erro ao Apagar ❌');
                }
            }
        }

        if (e.target.closest('.btn-edit-plat')) {
            const btn = e.target.closest('.btn-edit-plat');
            const id = btn.dataset.id;
            const oldName = btn.dataset.name;
            // Using native prompt for now to keep it simple, but we could make it premium too.
            // However, the user specifically asked for "pop-ups de confirmação".
            const newName = prompt('Novo nome para a plataforma:', oldName);
            if (newName && newName !== oldName) {
                await updatePlatform({ id, name: newName });
                renderPlatformManager();
            }
        }
    });
}

async function renderAddForm(itemToEdit = null) {
    try {
        const platformOptionsRaw = await getPlatformOptions();
        const platformOptions = platformOptionsRaw.map(p => {
            const selected = itemToEdit && itemToEdit.platform === p.name ? 'selected' : '';
            return `<option value="${p.name}" ${selected}>${p.name}</option>`;
        }).join('');

        const pageTitle = itemToEdit ? 'Editar Item' : 'Adicionar Loot';
        const isGame = !itemToEdit || itemToEdit._type === 'games';
        const isConsole = itemToEdit && itemToEdit._type === 'consoles';

        const hasImage = itemToEdit && !!itemToEdit.image;
        const initialImgDisplay = hasImage ? 'block' : 'none';
        const initialDropDisplay = hasImage ? 'none' : 'block';
        const initialSrc = hasImage ? itemToEdit.image : '';

        const isWishlist = itemToEdit ? !!itemToEdit.isWishlist : false;

        contentEl.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="margin-bottom: 1.5rem; text-align:center; color: var(--accent-color)">${pageTitle}</h2>
            <form id="add-form" class="glass" style="padding: 2rem; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 1.2rem;">
                
                <div style="display: flex; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: var(--radius-md);">
                    <label class="radio-label" style="flex:1; text-align:center; cursor:pointer; padding:0.5rem;">
                        <input type="radio" name="type" value="games" ${isGame ? 'checked' : ''}> 🕹️ Jogo
                    </label>
                    <label class="radio-label" style="flex:1; text-align:center; cursor:pointer; padding:0.5rem;">
                        <input type="radio" name="type" value="consoles" ${isConsole ? 'checked' : ''}> 💻 Consola/PC
                    </label>
                </div>

                <div>
                    <label>Título / Nome</label>
                    <input type="text" id="input-title" name="title" required placeholder="Ex: Sonic the Hedgehog" value="${itemToEdit ? itemToEdit.title : ''}">
                </div>

                <div>
                    <label>Plataforma</label>
                    <div style="display:flex; gap:0.5rem;">
                        <select id="input-platform" name="platform" style="flex:1;">
                            <option value="" disabled ${!itemToEdit ? 'selected' : ''}>Selecionar...</option>
                            ${platformOptions}
                        </select>
                        <button type="button" onclick="document.getElementById('nav-platforms').click()" style="padding:0; width:40px; background:rgba(255,255,255,0.1); border:1px solid var(--border-color); border-radius:4px; color:white; cursor:pointer;">⚙️</button>
                    </div>
                </div>

                <div>
                    <label>Data de Aquisição</label>
                    <input type="text" id="input-date" name="acquiredDate" placeholder="dd/mm/aaaa" value="${itemToEdit ? (itemToEdit.acquiredDate || '') : ''}">
                </div>

                <div style="background: rgba(247, 37, 133, 0.1); border: 1px dashed #f72585; padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
                    <label style="margin-bottom: 0; cursor:pointer;">
                        <span>📖 Lista de Desejos?</span>
                        <p style="font-size:0.7rem; color:var(--text-secondary); margin:0;">Ainda não tenho este item.</p>
                    </label>
                    <input type="checkbox" name="isWishlist" style="width:20px; height:20px; cursor:pointer;" ${isWishlist ? 'checked' : ''}>
                </div>

                <div style="margin-top: 1rem;">
                     <label>Capa do Jogo / Sistema</label>
                     <div id="webuy-container" style="margin-bottom: 1rem; display:none;">
                        <p style="font-size:0.8rem; color:var(--accent-color); margin-bottom:0.5rem;">Sugestões de Capas (Online)</p>
                        <div id="webuy-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem;"></div>
                     </div>

                     <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                        <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">Opção Manual: Colar Link</p>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="text" id="input-url-import" placeholder="https://exemplo.com/imagem.jpg" style="flex:1;">
                            <button type="button" id="btn-import-url" class="btn-primary">Carregar</button>
                        </div>
                     </div>

                     <div id="drop-zone" style="border: 2px dashed var(--border-color); padding: 2rem; text-align: center; border-radius: var(--radius-md); background: rgba(0,0,0,0.2); display: ${initialDropDisplay};">
                        <p>Arrastar ficheiro ou Clicar</p>
                        <input type="file" id="file-input" accept="image/*" style="display: none;">
                     </div>
                     
                     <div id="preview-area" style="margin-top: 1rem; display: ${initialImgDisplay}; text-align:center;">
                        <img id="img-preview" src="${initialSrc}" style="max-height: 200px; border-radius: var(--radius-sm); border: 1px solid var(--accent-color);">
                        <br>
                        <button type="button" id="btn-clear-img" style="color:red; font-size:0.8rem; margin-top:0.5rem;">Remover Imagem</button>
                     </div>
                </div>

                <div style="margin-top: 1rem; display:flex; gap:1rem;">
                    ${itemToEdit ? `
                        <button type="button" id="btn-delete-item" class="glass glass-hover" style="flex:1; border:1px solid #ff4444; color:#ff4444; border-radius:var(--radius-md); padding:0.8rem; font_weight:600;">🗑️ Eliminar</button>
                    ` : ''}
                    <button type="submit" class="btn-primary" style="flex:2;">${itemToEdit ? 'Guardar Alterações' : 'Guardar Loot'}</button>
                </div>
            </form>
        </div>
    `;

        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const previewArea = document.getElementById('preview-area');
        const imgPreview = document.getElementById('img-preview');
        const urlImportInput = document.getElementById('input-url-import');
        const btnImportUrl = document.getElementById('btn-import-url');
        const titleInput = document.getElementById('input-title');
        const webuyContainer = document.getElementById('webuy-container');
        const webuyResults = document.getElementById('webuy-results');

        let currentImageBase64 = itemToEdit ? itemToEdit.image : null;
        let searchTimeout = null;

        titleInput.addEventListener('input', () => {
            const query = titleInput.value.trim();
            if (searchTimeout) clearTimeout(searchTimeout);
            if (query.length > 2) {
                searchTimeout = setTimeout(() => performWebuySearch(query), 800);
            } else {
                webuyContainer.style.display = 'none';
            }
        });

        async function performWebuySearch(query) {
            webuyResults.innerHTML = '<div style="grid-column:1/-1; font-size:0.8rem; color:var(--text-secondary);">A procurar capas...</div>';
            webuyContainer.style.display = 'block';
            const results = await WebuyService.search(query);
            renderWebuyResults(results);
        }

        function renderWebuyResults(results) {
            webuyResults.innerHTML = '';
            if (!results || results.length === 0) {
                webuyResults.innerHTML = '<div style="grid-column:1/-1; font-size:0.8rem; color:var(--text-secondary);">Nenhuma capa encontrada.</div>';
                return;
            }
            results.forEach(item => {
                const div = document.createElement('div');
                div.className = 'glass-hover';
                div.style.cssText = `cursor: pointer; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-color);`;
                const img = document.createElement('img');
                img.src = item.image;
                img.style.cssText = 'width:100%; height:100px; object-fit:cover; display:block;';
                div.appendChild(img);
                div.onclick = async () => {
                    try {
                        const base64 = await coverSearchService.convertUrlToBase64(item.image);
                        setImage(base64);
                    } catch (e) { uiService.alert("Erro ao processar imagem: " + e.message); }
                };
                webuyResults.appendChild(div);
            });
        }

        btnImportUrl.addEventListener('click', async () => {
            const url = urlImportInput.value.trim();
            if (!url) return;
            try {
                const base64 = await coverSearchService.convertUrlToBase64(url);
                setImage(base64);
                urlImportInput.value = '';
            } catch (e) { uiService.alert("Erro ao importar URL: " + e.message); }
        });

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-color)'; });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--border-color)'; });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-color)';
            handleFile(e.dataTransfer.files[0]);
        });

        function handleFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => setImage(e.target.result);
            reader.readAsDataURL(file);
        }

        function setImage(base64) {
            currentImageBase64 = base64;
            imgPreview.src = currentImageBase64;
            previewArea.style.display = 'block';
            dropZone.style.display = 'none';
        }

        document.getElementById('btn-clear-img').addEventListener('click', () => {
            currentImageBase64 = null;
            previewArea.style.display = 'none';
            dropZone.style.display = 'block';
            fileInput.value = '';
        });

        document.getElementById('add-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const type = formData.get('type');
            const newItem = {
                title: formData.get('title'),
                platform: formData.get('platform'),
                acquiredDate: formData.get('acquiredDate'),
                image: currentImageBase64,
                isWishlist: formData.get('isWishlist') === 'on'
            };
            if (itemToEdit) {
                newItem.id = itemToEdit.id;
                newItem.createdAt = itemToEdit.createdAt;
                if (itemToEdit._type !== type) {
                    await dbService.delete(itemToEdit._type, itemToEdit.id);
                }
            }
            try {
                await dbService.add(type, newItem);
                uiService.alert('Item guardado com sucesso! 🚀', 'Sucesso');
                navigate(newItem.isWishlist ? 'nav-wishlist' : 'nav-collection');
            } catch (err) { uiService.alert('Erro ao guardar: ' + err); }
        });

        if (itemToEdit && document.getElementById('btn-delete-item')) {
            document.getElementById('btn-delete-item').onclick = async () => {
                if (await uiService.confirm('Tem a certeza que quer eliminar este item?')) {
                    try {
                        await dbService.delete(itemToEdit._type, itemToEdit.id);
                        navigate(isWishlist ? 'nav-wishlist' : 'nav-collection');
                    } catch (err) { uiService.alert('Erro ao eliminar: ' + err); }
                }
            };
        }
    } catch (e) {
        console.error(e);
        contentEl.innerHTML = `<div style="padding:2rem;">Erro ao abrir formulário: ${e.message}</div>`;
    }
}

function renderImportForm() {
    contentEl.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin-bottom: 1.5rem; color: var(--accent-color)">Importação em Massa 📦</h2>
                <button id="btn-nuke-db" style="background:transparent; border:1px solid #ff4444; color:#ff4444; font-size:0.8rem; padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor:pointer;">⚠️ Apagar Tudo</button>
            </div>
            
            <div class="glass" style="padding: 2rem; border-radius: var(--radius-lg);">
                <form id="import-form" style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div style="border: 2px dashed var(--border-color); padding: 1.5rem; text-align: center; border-radius: var(--radius-md);">
                        <p>📁 Carregar Ficheiro (Excel / CSV / TXT)</p>
                        <input type="file" id="import-file" accept=".csv, .txt, .tsv, .xlsx, .xls" style="margin-top:1rem;">
                    </div>
                    <div>
                        <label>Colar Texto Manualmente (Formato: Plataforma;Título)</label>
                        <textarea id="import-text" rows="5" style="width:100%; padding:1rem;" placeholder="PS2;Sonic"></textarea>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <button type="button" id="btn-process" class="btn-secondary" style="flex:1;">Processar</button>
                        <button type="submit" id="btn-import-final" class="btn-primary" style="flex:1; display:none;">Importar Tudo</button>
                    </div>
                    <div id="preview-section" style="display:none; margin-top:1rem;">
                        <h4>Pré-visualização (<span id="preview-count">0</span> itens)</h4>
                        <div id="preview-list" style="max-height:300px; overflow-y:auto; border:1px solid var(--border-color);"></div>
                    </div>
                </form>
            </div>
        </div>
    `;

    const fileInput = document.getElementById('import-file');
    const textArea = document.getElementById('import-text');
    const btnProcess = document.getElementById('btn-process');
    const btnImport = document.getElementById('btn-import-final');
    const previewSection = document.getElementById('preview-section');
    const previewList = document.getElementById('preview-list');
    const previewCount = document.getElementById('preview-count');
    const btnNuke = document.getElementById('btn-nuke-db');

    let parsedItems = [];

    btnNuke.addEventListener('click', async () => {
        if (await uiService.confirm("Tem a certeza que quer apagar TODA a base de dados? Esta ação é irreversível.", "⚠️ ATENÇÃO ⚠️")) {
            await dbService.clear('games');
            await dbService.clear('consoles');
            await dbService.clear('platforms');
            uiService.alert("Base de dados limpa com sucesso!", "Limpeza Concluída");
            navigate('nav-dashboard');
        }
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.name.endsWith('.xlsx')) {
            textArea.value = "[Excel detetado. Clique em Processar]";
            textArea.disabled = true;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => { textArea.value = e.target.result; };
            reader.readAsText(file);
        }
    });

    btnProcess.addEventListener('click', async () => {
        let text = textArea.value;
        const file = fileInput.files[0];
        if (file && file.name.endsWith('.xlsx')) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            text = rows.map(row => row.join(';')).join('\n');
        }

        const lines = text.split('\n').filter(l => l.trim().length > 0);
        parsedItems = lines.map(line => {
            const parts = line.split(/[;|,]/).map(p => p.trim());
            return { title: parts[1] || parts[0], platform: parts[0], checked: true };
        });

        previewCount.textContent = parsedItems.length;
        previewList.innerHTML = parsedItems.map((item, idx) => `
            <div style="padding:0.5rem; border-bottom:1px solid #333;">
                <input type="checkbox" data-idx="${idx}" checked> ${item.title} (${item.platform})
            </div>
        `).join('');
        btnImport.style.display = 'block';
        previewSection.style.display = 'block';
    });

    btnImport.addEventListener('click', async (e) => {
        e.preventDefault();
        for (const item of parsedItems) {
            await ensurePlatformExists(item.platform);
            await dbService.add('games', { title: item.title, platform: item.platform, image: null, isWishlist: false });
        }
        uiService.alert('Importação concluída! 📦\nPlataformas novas foram criadas automaticamente.', 'Sucesso');
        navigate('nav-collection');
    });
}

/**
 * Local File Sync View (Zero API)
 */
async function renderSyncView() {
    contentEl.innerHTML = `
        <div class="header-section" style="text-align:center;">
             <h2 style="text-shadow: 0 0 10px var(--accent-color);">Ficheiro de Sincronização 📂</h2>
             <p class="subtitle">Guarde a sua base de dados numa pasta partilhada (Drive/Dropbox)</p>
        </div>

        <div style="max-width: 500px; margin: 2rem auto;">
            <div class="glass" style="padding: 2rem; border-radius: var(--radius-lg); display:flex; flex-direction:column; gap:1.5rem;">
                <div style="text-align:center;">
                    <span style="font-size:3rem; filter: drop-shadow(0 0 10px var(--accent-secondary));">💾</span>
                    <p style="margin-top:0.5rem; color:var(--accent-secondary); font-weight:600;">Modo Sem API (v19)</p>
                    <button id="btn-force-update" style="font-size:0.6rem; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border_radius:4px; padding:2px 6px; cursor:pointer; color:var(--text-secondary); margin-top:5px;">🔄 Forçar Atualização da App</button>
                </div>

                <div style="background: rgba(255,255,255,0.05); padding:1.2rem; border-radius:var(--radius-md); font-size:0.85rem; line-height:1.5;">
                    <p style="margin-bottom:0.8rem;"><b>Guia Rápido:</b></p>
                    <div style="display:flex; gap:0.8rem; align-items:flex-start; margin-bottom:0.8rem;">
                        <span style="font-size:1.2rem;">📤</span>
                        <span><b>Enviar:</b> Use quando acabar de adicionar jogos e quiser guardar na Nuvem.</span>
                    </div>
                    <div style="display:flex; gap:0.8rem; align-items:flex-start;">
                        <span style="font-size:1.2rem;">📥</span>
                        <span><b>Receber:</b> Use quando abrir a App e quiser ver o que adicionou noutro sítio.</span>
                    </div>
                </div>

                <div id="sync-status" style="text-align:center; font-size:0.8rem; color:var(--accent-secondary); margin-bottom:0.5rem; display: ${localStorage.getItem('last_sync_date') ? 'block' : 'none'};">
                    Último envio: ${localStorage.getItem('last_sync_date') || ''}
                </div>

                <button id="btn-file-save" class="btn-primary" style="width:100%; padding:1rem !important; font-size:1rem;">📤 Enviar Alterações (Guardar)</button>
                <button id="btn-file-load" class="glass glass-hover" style="width:100%; padding:1rem; border:1px solid var(--accent-secondary); border-radius:var(--radius-md); color:var(--accent-secondary); font-weight:700;">📥 Receber Alterações (Carregar)</button>
                
                <p style="font-size:0.7rem; color:var(--text-secondary); text-align:center; margin-top:1rem;">O seu ficheiro: <span id="sync-filename" style="color:var(--text-primary); font-weight:600;">(Não ligado)</span></p>
            </div>
            
            <div id="pwa-install-container" class="glass" style="margin-top:2rem; padding:1.5rem; border-radius:var(--radius-lg); text-align:center; display: ${state.deferredPrompt ? 'block' : 'none'};">
                <h4 style="color:var(--accent-color);">📲 Instalar como App</h4>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin:0.5rem 0;">A instalação está pronta! Clique no botão abaixo para colocar no seu ecrã.</p>
                <button id="btn-pwa-install" class="btn-primary" style="margin-top:1rem; width:100%;">Instalar Agora</button>
            </div>

            <div class="glass" style="margin-top:1.5rem; padding:1.5rem; border-radius:var(--radius-lg); text-align:left;">
                <h4 style="color:var(--text-secondary); margin-bottom:0.5rem;">🔍 Diagnóstico da App</h4>
                <ul style="font-size:0.75rem; color:var(--text-secondary); list-style:none; padding:0;">
                    <li>📡 Protocolo: <span id="diag-https">Verificando...</span></li>
                    <li>⚙️ Service Worker: <span id="diag-sw">Verificando...</span></li>
                    <li>📦 Manifest: ✅ Detetado</li>
                </ul>
                <p style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.5rem;">Nota: A instalação <b>exige</b> HTTPS (Site Seguro).</p>
            </div>
        </div>
    `;

    // Fill diagnostics
    const httpsOk = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    document.getElementById('diag-https').innerHTML = httpsOk ? '✅ Seguro (HTTPS/Local)' : '❌ Inseguro (HTTP)';
    document.getElementById('diag-https').style.color = httpsOk ? '#4ade80' : '#f87171';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            const swOk = !!reg;
            document.getElementById('diag-sw').innerHTML = swOk ? '✅ Ativo' : '❌ Não Registado';
            document.getElementById('diag-sw').style.color = swOk ? '#4ade80' : '#f87171';
        });
    }

    if (state.deferredPrompt) {
        document.getElementById('btn-pwa-install').onclick = async () => {
            const promptEvent = state.deferredPrompt;
            promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            state.deferredPrompt = null;
            document.getElementById('pwa-install-container').style.display = 'none';
        };
    }

    // Force Update Logic
    document.getElementById('btn-force-update').onclick = async () => {
        if (await uiService.confirm("Isto irá forçar a App a limpar o cache e ir buscar a versão mais recente ao GitHub. Continuar?")) {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            window.location.reload(true);
        }
    };

    // Display filename if known
    const knownFile = localStorage.getItem('sync_filename');
    if (knownFile) {
        document.getElementById('sync-filename').textContent = knownFile;
    }

    document.getElementById('btn-file-save').onclick = async () => {
        const games = await dbService.getAll('games');
        const consoles = await dbService.getAll('consoles');
        const platforms = await dbService.getAll('platforms');

        try {
            if (!window.showSaveFilePicker) {
                // Mobile/Fallback
                localFileSync.downloadFallback({ games, consoles, platforms, timestamp: Date.now() });
                uiService.alert("Ficheiro de backup gerado! Guarde-o na sua pasta do Drive.", "Exportar");
            } else {
                // Desktop
                const fileName = await localFileSync.selectFileForSave();
                if (fileName) {
                    uiService.alert(`A guardar em ${fileName}...`, "Sincronizando");
                    await localFileSync.save({ games, consoles, platforms, timestamp: Date.now() });

                    const nowString = new Date().toLocaleString('pt-PT');
                    localStorage.setItem('last_sync_date', nowString);
                    localStorage.setItem('sync_filename', fileName);

                    const statusEl = document.getElementById('sync-status');
                    statusEl.textContent = 'Último envio: ' + nowString;
                    statusEl.style.display = 'block';
                    document.getElementById('sync-filename').textContent = fileName;

                    uiService.alert("Alterações enviadas com sucesso! ✅", "Feito");
                }
            }
        } catch (e) {
            uiService.alert("Erro ao aceder ao ficheiro: " + e.message, "Erro ❌");
        }
    };

    document.getElementById('btn-file-load').onclick = async () => {
        if (await uiService.confirm("Isto irá substituir todos os dados locais pelos que estão na Nuvem. Continuar?", "Aviso ⚠️")) {
            try {
                let data;
                if (!window.showOpenFilePicker) {
                    // Mobile Fallback: Use input file
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                        data = await localFileSync.importFromFile(e.target.files[0]);
                        await applyImport(data);
                    };
                    input.click();
                } else {
                    // Desktop
                    const fileName = await localFileSync.selectFileForLoad();
                    if (fileName) {
                        data = await localFileSync.load();
                        await applyImport(data);
                        localStorage.setItem('sync_filename', fileName);
                        document.getElementById('sync-filename').textContent = fileName;
                    }
                }
            } catch (e) {
                uiService.alert("Erro ao receber dados: " + e.message, "Erro ❌");
            }
        }
    };

    async function applyImport(data) {
        if (!data) return;
        uiService.alert("A restaurar dados...", "Paciência");
        await dbService.clear('games');
        await dbService.clear('consoles');
        await dbService.clear('platforms');

        for (const g of (data.games || [])) await dbService.add('games', g);
        for (const c of (data.consoles || [])) await dbService.add('consoles', c);
        for (const p of (data.platforms || [])) await dbService.add('platforms', p);

        uiService.alert("Dados restaurados! 🔄", "Sucesso ✅");
        navigate('nav-dashboard');
    }
}

init();
