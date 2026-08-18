# 📋 Histórico de Versões — RetroCollection

Registo completo de todas as alterações efetuadas em cada versão da aplicação RetroCollection.

---

## v124 — 2026-08-18
### 🔧 Correções e Otimizações Mobile
- **Responsividade Mobile da Coleção**: Correção de transbordo horizontal (página cortada nas laterais em ecrãs de telemóvel).
- **Barra de Filtros Adaptativa**: Os selects de filtro e campo de pesquisa agora usam flex/grid responsivo com `min-width: 0`, quebrando em 2 linhas em ecrãs `< 480px` sem forçar largura superior a 100vw.
- **Contenção da Prateleira 3D**: `shelf-container` e `shelf-row` atualizados com `box-sizing: border-box`, `overflow-x: auto` e `max-width: 100%`, isolando o scroll horizontal das capas sem afetar o layout principal.
- **Layout Geral Mobile**: Adicionado `overflow-x: hidden` a `#main-content`, `body` e `#app`, ajustando o padding lateral de 20px para 14px em ecrãs pequenos.
- **Analytics Dashboard Responsivo**: Gráficos reorganizados com `repeat(auto-fit, minmax(220px, 1fr))` para ajuste perfeito em coluna única em smartphones.

### 🔧 Ficheiros Modificados
- `index.html` → versão v124, regras CSS responsivas para mobile
- `js/app.js` → versão v124, classes `.filter-controls-row` e `.search-controls-row`, grid de analytics responsivo
- `css/shelf.css` → contenção de largura e box-sizing
- `.agent/historico.md` → registo da versão v124

---

## v123 — 2026-08-18
### ✨ Novas Funcionalidades
- **📷 Leitor de Código de Barras**: Novo serviço `barcodeScannerService.js`. Usa BarcodeDetector API nativa (Chrome/Edge) com fallback para Quagga2. Suporta EAN-13 e UPC-A. Ao detetar um código, pesquisa o título via Open Library API e preenche o formulário automaticamente.
- **📚 Prateleira Virtual 3D**: Nova vista `Prateleira` acessível via toggle na Coleção. Estante 3D horizontal com scroll por lombadas/capas, efeito perspective CSS e animações de hover que revelam a capa frontal.
- **📊 Gráficos & Analytics no Dashboard**: 4 gráficos interativos usando Chart.js (CDN): Donut (por consola), Barras (géneros), Linha temporal (aquisições por ano), Gauge (% validados). Clicáveis para filtrar a coleção.
- **⚡ Auto-Preenchimento via TheGamesDB**: Ao selecionar uma capa no modal de pesquisa, preenche automaticamente ano, género, developer e sinopse a partir da API TheGamesDB (novo método `fetchGameDetails()`).
- **📄 Exportação PDF / Excel com Imagens**: Novo serviço `exportService.js`. Exportação para PDF (catálogo visual com capas miniatura via jsPDF) e Excel (.xlsx com dados completos via SheetJS). Menu de exportação com 3 opções: PDF, Excel, JSON.
- **🚨 Detetor de Duplicados**: Em `saveItem()`, deteção automática de jogos com mesmo título e plataforma já existentes na coleção. Modal de aviso com opções: Ver Existente, Adicionar na Mesma, Cancelar. Verifica também se o item está na Wishlist e oferece mover para Coleção.

### 🗂️ Ficheiros Criados
- `js/services/barcodeScannerService.js`
- `js/services/chartService.js`
- `js/services/exportService.js`
- `css/shelf.css`
- `.agent/historico.md` (este ficheiro)

### 🔧 Ficheiros Modificados
- `js/app.js` → versão incrementada para v123, integração de todas as 6 features
- `js/services/theGamesDBService.js` → novo método `fetchGameDetails()`
- `index.html` → versão v123, CDN jsPDF, CDN Quagga2
- `.agent/agent_rules.md` → regra de atualização obrigatória do histórico

---

## v122 — 2026-08-17
### ✨ Novas Funcionalidades / Correções
- **TheGamesDB exclusivo**: Remoção do Bing Images como fonte de capas. Apenas TheGamesDB.net é utilizado.
- **Prompt interativo de API Key**: Se a chave TheGamesDB não estiver guardada no localStorage do domínio atual (ex: GitHub Pages vs localhost), a app pede ao utilizador para colar a chave uma vez.
- **CORS Proxy Fallback**: `fetchJsonWithFallback()` em `theGamesDBService.js` — tenta proxy local `/proxy`, depois fetch direto, depois `api.allorigins.win`, depois `corsproxy.io`.
- **Pesquisa por título limpo**: Se busca com plataforma retorna 0 resultados, retry com título limpo (sem sufixos de plataforma).

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js`
- `js/app.js`
- `index.html`

---

## v121 — 2026-08-17
### ✨ Correções
- Correções de CORS e autenticação para acesso ao TheGamesDB via GitHub Pages.
- Melhorias no serviço de proxy local.

---

## v120 — 2026-08-17
### ✨ Novas Funcionalidades
- Integração inicial do TheGamesDB.net como fonte de capas.
- Criação do serviço `theGamesDBService.js`.

---

## v117 — 2026-08-17
### ✨ Novas Funcionalidades
- Publicação inicial no GitHub Pages via PAT de escrita.
- Configuração do remote Git com credenciais no `.git/config` local.

---

## v115 — Data anterior
### ✨ Novas Funcionalidades
- **Filtro de Validação**: Novo filtro na Coleção para mostrar apenas itens validados (✅) ou não validados (❌).
- Estado `filterValidation` adicionado ao `state`.

---

## v114 — Data anterior
### ✨ Correções
- Correção do indicador de estado de validação nos cards da coleção (suporte para boolean, string e number).

---

## v111 — Data anterior
### ✨ Correções
- Melhor gestão de erros no registo do Service Worker para localhost.

---

## v109 — Data anterior
### ✨ Correções
- Pesquisa de metadados apenas por título (sem plataforma) para melhores resultados na Wikipedia.

---

## v108 — Data anterior
### ✨ Novas Funcionalidades
- Scrollbar personalizada (cor âmbar/laranja) via CSS.

---

## v107 — Data anterior
### ✨ Novas Funcionalidades
- Filtro dedicado por Década na Coleção.
- Navegação por década no Dashboard.

---

## v106 — Data anterior
### ✨ Novas Funcionalidades
- Pesquisa textual por título, género e ano na Coleção.

---

## v105 — Data anterior
### ✨ Novas Funcionalidades
- Navegação por Género e por Década no Dashboard.
- Secções "Top Géneros" e "Décadas" no Dashboard.

---

## v96 — Data anterior
### ✨ Novas Funcionalidades
- **Sync Sentinel**: Painel de estado da sincronização cloud no Dashboard.

---

## v92 — Data anterior
### ✨ Novas Funcionalidades
- **Auto-Push em background**: Push automático silencioso após guardar ou apagar item.
- Toast de confirmação de sync.

---

*Histórico mantido automaticamente pelo agente. Última atualização: v123 (2026-08-18).*
