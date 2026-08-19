# 📋 Histórico de Versões — RetroCollection

Registo completo de todas as alterações efetuadas em cada versão da aplicação RetroCollection.

---

## v134 — 2026-08-19
### 📊 Novo Gráfico de Estatísticas: "Lançamentos por Ano"
- **Gráfico Cronológico de Lançamentos de Jogos na Página Principal**:
  - Adicionado o gráfico interativo **Lançamentos por Ano** (`#chart-release-year`) na secção *Analytics & Estatísticas* do Dashboard.
  - Ordenação cronológica por ano de lançamento (`item.year`), com barras temáticas e tooltips informativos (`X jogo(s) lançado(s)`).
  - Adaptação dinâmica à paleta de cores do tema retro ativo na aplicação.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `js/services/chartService.js` e `js/app.js` atualizados para a versão `v134`.

### 🔧 Ficheiros Modificados
- `js/services/chartService.js` → implementação da função `renderReleaseYearChart`
- `js/app.js` → agregação de dados por ano de lançamento e integração do canvas na grelha de analytics
- `index.html` → versão v134 e scripts de cache control
- `sw.js` → versão v134
- `.agent/historico.md` → registo da versão v134

---

## v133 — 2026-08-19
### ✨ Feedback Visual Instantâneo ao Selecionar Capa & Efeito Glow
- **Indicadores de Progresso em Tempo Real ao Clicar na Capa**:
  - Ao clicar numa capa no modal do TheGamesDB, a caixa de pré-visualização (`#cover-preview`) exibe de imediato um spinner e a mensagem `⏳ A descarregar e processar imagem...`.
  - A barra dinâmica `#search-feedback-zone` atualiza instantaneamente para `⏳ A descarregar capa em alta resolução e a preencher dados...`.
  - Concluído o download (conversão Base64 HD), o feedback exibe `✅ Capa e informações aplicadas com sucesso! (+N campos preenchidos)`.
- **Efeito Visual Glow nos Campos Auto-Preenchidos**:
  - Os campos que recebem novos metadados (Ano, Género, Desenvolvedora, Notas, Plataforma) recebem uma animação de pulso luminoso sincronizada com a cor do tema (`.field-glow`) para o utilizador identificar instantaneamente os dados preenchidos.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `css/themes.css` e `js/app.js` atualizados para a versão `v133`.

### 🔧 Ficheiros Modificados
- `js/app.js` → feedback instantâneo na seleção de capas, preview com spinner e destaque luminoso de campos
- `css/themes.css` → animação `@keyframes fieldHighlightGlow` e classe `.field-glow`
- `index.html` → versão v133 e scripts de cache control
- `sw.js` → versão v133
- `.agent/historico.md` → registo da versão v133

---

## v132 — 2026-08-19
### 🔍 Correção da Pesquisa de Capas no TheGamesDB (Ex: Speedball / Master System)
- **Desacoplamento do Título e Plataforma na Pesquisa da API**:
  - Corrigido o envio concatenado do título com o nome da plataforma (ex: `Speedball MASTERSYSTEM`), que gerava zero resultados porque a base de dados do TheGamesDB indexa apenas o título puro (`Speedball`).
  - Implementada limpeza e extração inteligente do título base (removendo sufixos ou plataformas anexadas).
  - O parâmetro de plataforma é agora utilizado para **classificação e priorização inteligente** de resultados.
- **Identificação e Distinção de Plataforma nas Capas**:
  - Deteção e mapeamento de IDs de plataformas da TheGamesDB (ex: Master System = 35, Mega Drive = 18/36, SNES = 6, PS1 = 10, etc.).
  - Os resultados correspondentes à plataforma selecionada pelo utilizador são colocados no topo com a máxima pontuação de relevância.
  - Adicionado badge visual com o nome da plataforma no canto superior de cada capa no modal de escolha.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html` e `js/app.js` atualizados para a versão `v132`.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → pesquisa desacoplada, limpeza de título, mapeamento de plataformas e ranking por relevância
- `js/app.js` → chamada separada de título e plataforma em `searchCover` e badges visuais de plataforma no modal
- `index.html` → versão v132 e scripts de cache control
- `sw.js` → versão v132
- `.agent/historico.md` → registo da versão v132

---

## v131 — 2026-08-19
### 📚 Correção de Visibilidade dos Nomes na Prateleira Virtual 3D
- **Eliminação do Corte (Clipping) dos Nomes/Tooltips em Hover**:
  - Ajustado o espaçamento superior (`padding-top: 85px`) da prateleira 3D (`.shelf-row`) e altura mínima (`min-height: 240px`) para acomodar com folga a elevação da capa em hover (`translateY(-24px)`) e a caixa com o nome/título do jogo.
  - A caixa de título flutuante (`.shelf-item-tooltip`) agora utiliza posicionamento calibrado, `z-index: 9999`, cores dinâmicas do tema ativo (`var(--accent-color)`, `var(--bg-surface)`, `var(--text-main)`) e quebra de texto elegante sem transbordar.
  - Corrigido o carregamento de `css/shelf.css` no `<head>` com cache-busting `?v=131` para garantir atualização imediata em todos os dispositivos.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html` e `js/app.js` atualizados para a versão `v131`.

### 🔧 Ficheiros Modificados
- `css/shelf.css` → ampliação de `padding-top` e calibração de `.shelf-item-tooltip` e `.shelf-item:hover`
- `index.html` → inclusão de `shelf.css?v=131` no `<head>` e versão v131
- `js/app.js` → importações e registo da versão v131
- `sw.js` → versão v131
- `.agent/historico.md` → registo da versão v131

---

## v130 — 2026-08-18
### 🔍 Modo Ultra-Grande Angular (Zoom 0.5x) no Leitor de Código de Barras
- **Suporte a Zoom 0.5x & Alternância de Lentes**:
  - Adicionado seletor com opção **0.5x** (Ultra-Wide / Grande Angular Ampla), **1x** (Normal) e **2x** (Zoom).
  - Deteção e comutação automática entre a câmara Ultra-Grande Angular do telemóvel e a câmara principal via `enumerateDevices()` e restrições avançadas de zoom de hardware.
  - Permite enquadrar caixas de jogos completas a curta distância sem necessidade de afastar o telemóvel.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html` e `js/app.js` atualizados para a versão `v130`.

### 🔧 Ficheiros Modificados
- `js/services/barcodeScannerService.js` → suporte a lente 0.5x Ultra-Wide, comutador dinâmico de fluxo de câmara e botões 0.5x/1x/2x
- `js/app.js` → importações e registo da versão v130
- `index.html` → versão v130 e scripts de cache control
- `sw.js` → versão v130
- `.agent/historico.md` → registo da versão v130

---

## v129 — 2026-08-18
### 📷 Correção de Zoom e Melhorias no Leitor de Código de Barras
- **Seleção Inteligente da Lente Principal (Eliminação do Zoom Automático)**:
  - Implementada enumeração inteligente de câmaras (`enumerateDevices()`) para selecionar a lente traseira normal/grande angular e evitar a ativação automática de lentes teleobjetiva (2x/3x) ou macro em telemóveis multilente.
  - Eliminação de restrições horizontais fixas (`1280x720`) que causavam *crop* (recorte) forçado do sensor em ecrãs verticais.
  - Aplicação explícita de `zoom: 1.0` via `MediaTrackConstraints.advanced` para abrir a câmara sempre no campo de visão natural (1x).
- **Controlos Rápidos de Zoom & Tocha/Lanterna**:
  - Adicionados botões de alternância rápida de zoom (`1x` / `2x`) quando o hardware e o navegador suportam controlo de zoom.
  - Adicionado botão de lanterna/tocha (`🔦 Lanterna`) para leitura em ambientes com pouca luz quando suportado.
- **Interface e Mira Laser Dinâmica**:
  - Nova mira de leitura com cantos destacados e animação laser contínua sincronizada com a cor do tema ativo (`var(--accent-color)`).
  - Encerramento seguro de faixas de vídeo e desativação automática da lanterna ao fechar o scanner.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html` e `js/app.js` atualizados para a versão `v129`.

### 🔧 Ficheiros Modificados
- `js/services/barcodeScannerService.js` → motor de seleção de lente, restrição de zoom 1x, controlos de zoom/tocha e animação laser
- `js/app.js` → importações e registo da versão v129
- `index.html` → versão v129 e scripts de cache control
- `sw.js` → versão v129
- `.agent/historico.md` → registo da versão v129

---

## v128 — 2026-08-18
### ✨ Melhorias de UX & Estados de Carregamento Assíncrono
- **Indicadores de Carregamento na Pesquisa de Capas (TheGamesDB)**:
  - O botão de pesquisa `🔍` passa a exibir um spinner animado de rotação e pulso suave durante a comunicação com a API.
  - Bloqueio de cliques múltiplos acidentais (`disabled` e bloqueio por flag de concorrência `isSearchingCover`).
  - Adicionada barra de estado dinâmica (`#search-feedback-zone`) que informa o utilizador em tempo real (ex: `⏳ A pesquisar capas no TheGamesDB para "Super Mario"...`, `✅ X capa(s) encontrada(s)!` ou `⚠️ Nenhuma capa encontrada`).
- **Estados de Carregamento no Auto-Preencher (Wikipedia)**:
  - O botão `🤖 Auto-Preencher` exibe spinner animado e texto `⏳ A consultar Wikipedia...`, com feedback claro e bloqueio de cliques múltiplos.
- **Feedback no Leitor de Código de Barras**:
  - O botão `📷` passa a exibir spinner de carregamento enquanto consulta os metadados do código detetado antes de abrir a pesquisa de capas.
- **Harmonização do Formulário com Temas Retro**:
  - Todos os campos, seletores, caixas de verificação, botões de ação e modal de seleção de capas utilizam agora variáveis CSS dinâmicas (`var(--accent-color)`, `var(--bg-surface)`, `var(--border-subtle)`).
- **Invalidação de Cache e Service Worker**:
  - `sw.js` e `index.html` atualizados para a versão `v128`.

### 🔧 Ficheiros Modificados
- `css/themes.css` → classes `.btn-loading`, `.spinner-icon`, `.btn-pulse` e `.search-status-bar`
- `js/app.js` → implementação de loading states, barras de feedback e transição para variáveis CSS no formulário
- `index.html` → versão v128 e links de cache busting
- `sw.js` → versão v128
- `.agent/historico.md` → registo da versão v128

---

## v127 — 2026-08-18
### 🔧 Correções e Melhorias no Motor de Temas
- **Correção da Seleção de Temas**: Corrigido o evento de clique nos cartões de tema para alternar instantaneamente e atualizar todas as vistas ativas.
- **Feedback Visual Imediato (Toast)**: Adicionado alerta flutuante de confirmação instantânea ao selecionar qualquer um dos 7 temas (`✨ Tema [Nome] Ativado!`).
- **Conversão Completa para Variáveis CSS**: Eliminadas cores hexadecimais estáticas hardcoded no Dashboard, Grelha de Jogos, Prateleiras 3D, Formulário e Nuvem, permitindo que toda a interface (cabeçalho, fundos, texto secundário, acentos, botões, gráficos e molduras) mude dinamicamente de acordo com a paleta da consola selecionada.
- **Invalidação de Cache e Service Worker**: Atualizado o `sw.js` com estratégia Network-First para ficheiros de código (HTML/JS/CSS), inclusão de todos os novos serviços e ficheiros de estilo na pré-cache e renovação automática de cache na versão `v127`.

### 🔧 Ficheiros Modificados
- `index.html` → versão v127, utilização de variáveis CSS nos estilos críticos e renovação de cache
- `css/themes.css` → versão v127, mapeamento robusto de variáveis CSS, estilos do toast e transições suaves
- `js/services/themeService.js` → versão v127, método `showToast()`, atualização de meta tags e propagação de eventos
- `js/services/chartService.js` → versão v127, sincronização dinâmica com o novo themeService
- `js/app.js` → versão v127, integração de variáveis CSS em todas as vistas e handlers de temas
- `sw.js` → versão v127, estratégia Network-First e lista completa de assets
- `.agent/historico.md` → registo da versão v127

---

## v125 — 2026-08-18
### ✨ Novas Funcionalidades
- **🎨 Sistema de Temas Visuais Retro**: Motor completo de personalização visual com 7 temas inspirados na história das consolas e estética retro:
  1. 🕹️ **Retro Amber** *(Padrão Arcade / CRT — Fundo grafite & Acento âmbar)*
  2. 🟢 **Game Boy DMG** *(Nintendo 1989 — Tons de verde LCD monocromático)*
  3. ⚪ **PlayStation 1** *(Sony 1994 — Cinza industrial & Azul Teal dos anos 90)*
  4. 🔵 **Mega Drive 16-Bit** *(Sega 1988 — Sonic Cyber Blue & Dourado)*
  5. 🟣 **Super Nintendo** *(SNES 1990 — Cinza neutro com lilás e roxo)*
  6. 🖤 **OLED Pure Dark** *(Preto 100% absoluto com acento dourado néon)*
  7. 💖 **Synthwave 80s** *(Rosa choque néon & Ciano retro wave)*
- **Seletor Visual de Temas**: Novo painel interativo em "Nuvem & Definições ☁️" com cartões visuais, amostras de paleta e badge de tema ativo.
- **Gráficos Dinâmicos com Chart.js**: Os 4 gráficos do Dashboard recalculam e adaptam automaticamente a paleta de cores ao tema selecionado sem necessidade de recarregar.
- **Carregamento Instantâneo sem Flicker**: Aplicação de CSS variables e tema direto no `<head>` do HTML antes da renderização.

### 🗂️ Ficheiros Criados
- `css/themes.css`
- `js/services/themeService.js`

### 🔧 Ficheiros Modificados
- `index.html` → versão v125, import de `themes.css`, carregador de tema no `<head>`
- `js/app.js` → versão v125, integração do `themeService`, seletor de temas nas definições
- `js/services/chartService.js` → integração com paletas dinâmicas por tema
- `.agent/historico.md` → registo da versão v125

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
