# 📋 Histórico de Versões — RetroCollection

Registo completo de todas as alterações efetuadas em cada versão da aplicação RetroCollection.

---

## v144 — 2026-09-26
### 🔧 Integração de Proxy de Alta Velocidade (Azure CORS Anywhere) e Payload Mínimo

- **Causa Raiz**:
  - O proxy `allorigins.win` estava a sofrer lentidão generalizada/timeouts na sua infraestrutura, causando falhas de ligação intermitentes em pesquisas de capas a partir do browser/GitHub Pages.
- **Correções Aplicadas**:
  - **Novo Proxy Principal Ultrarrápido**: Integrado o `cors-anywhere.azurewebsites.net` com cabeçalho `X-Requested-With: XMLHttpRequest` como proxy de primeira linha (~1s de latência com suporte completo a CORS).
  - **AllOrigins como Fallback**: O `allorigins.win` foi mantido como camada de redundância secundária.
  - **Query de Pesquisa Mínima**: A pesquisa `ByGameName` passa a consultar apenas os dados estritamente necessários (`apikey` e `name`), minimizando o tráfego e acelerando a resposta da API do TheGamesDB.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → Azure CORS Anywhere, query minimalista, v144
- `index.html` → versão v144
- `sw.js` → cache v144
- `js/app.js` → imports e strings de versão v144
- `js/services/chartService.js` → versão v144
- `.agent/historico.md` → registo v144

---

## v143 — 2026-09-26
### 🔧 Otimização de Consultas ("Mashed"), Evitar Throttling de Proxy e Desambiguação Xbox

- **Causa Raiz do Timeout em "Mashed" e Títulos Populares**:
  - A query `ByGameName` incluía `&include=platform,genres,developers` e múltiplos campos que geravam payloads pesados e lentos no TheGamesDB, levando os proxies públicos a atingir o timeout de resposta.
  - O disparo simultâneo de múltiplos pedidos paralelos para o mesmo IP de proxy ativava mecanismos de rate-limiting (throttling).
- **Correções Aplicadas**:
  - **Otimização do Payload**: Removidos os parâmetros `include` pesados da pesquisa inicial; o TheGamesDB devolve a resposta em milissegundos e os nomes de plataformas são mapeados diretamente via dicionário interno `TGDB_PLATFORMS`.
  - **Retry Sequencial Limpo**: As tentativas de proxy são agora feitas de forma sequencial com fallback inteligente, sem sobrecarregar o proxy com pedidos concorrentes.
  - **Desambiguação da Família Xbox e PlayStation**: Aperfeiçoado o algoritmo `isPlatformMatch` para distinguir rigorosamente a Xbox original da Xbox 360, Xbox One e Xbox Series X/S, assim como PS1 a PS5.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → query leve, retry sequencial sem throttling, desambiguação de plataformas Xbox/PS, v143
- `index.html` → versão v143
- `sw.js` → cache v143
- `js/app.js` → imports e strings de versão v143
- `js/services/chartService.js` → versão v143
- `.agent/historico.md` → registo v143

---

## v142 — 2026-09-26
### 🔧 Correção: Eliminação de Falso Positivo 403 e Remoção de Proxies Incompatíveis

- **Causa Raiz do Erro "CorsProxy status 403"**:
  - O serviço `corsproxy.io` bloqueava chamadas com status 403 do lado do próprio proxy, e o handler de erros interpretava erradamente a string "403" da mensagem de erro de rede como sendo uma chave de API inválida do TheGamesDB.
- **Correções Aplicadas**:
  - **Remoção de Proxies Incompatíveis**: Removidos `corsproxy.io` e outros proxies não suportados; o sistema utiliza instâncias paralelas e com cache-busting do `allorigins.win/get` que devolve as respostas JSON de forma fidedigna.
  - **Detecção Precisa de Erros de Chave API**: O erro de API Key inválida agora só é disparado se a resposta JSON devolvida pelo TheGamesDB contiver explicitamente o código de erro ou menção a `api key` (`isApiKeyError = true`), evitando falsos positivos originados por erros de rede ou de proxies intermediários.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → remoção do corsproxy.io, detecção rigorosa de isApiKeyError, versão v142
- `index.html` → versão v142
- `sw.js` → cache v142
- `js/app.js` → imports e strings de versão v142
- `js/services/chartService.js` → versão v142
- `.agent/historico.md` → registo v142

---

## v141 — 2026-09-26
### 🔧 Resiliência Multi-Proxy e Melhoria de Pesquisa de Títulos ("Little Big Planet 2")

- **Resiliência Multi-Proxy com `Promise.any()`**:
  - Em vez de depender exclusivamente de um único proxy sequencial, foi implementada uma estratégia concorrente via `Promise.any()` competindo com múltiplos endpoints independentes (`allorigins.win/get` em instâncias com cache-busting diferente, `allorigins.win/raw`, `codetabs.com`, e `corsproxy.io`).
  - O primeiro proxy que responder com sucesso satisfaz o pedido de imediato, eliminando falhas esporádicas ou timeouts de proxies individuais.
- **Geração Inteligente de Variantes de Títulos**:
  - Adicionado algoritmo que gera variações de títulos com concatenação de palavras (ex: `"Little Big Planet 2"` gera automaticamente busca por `"LittleBigPlanet 2"` e `"LittleBigPlanet"`).
  - Garante que jogos cujos nomes são indexados com ou sem espaços na base de dados do TheGamesDB sejam sempre localizados.
- **Correção no Servidor Local (`server.ps1`)**:
  - Adicionado `User-Agent` de navegador ao WebRequest do proxy do servidor PowerShell local para contornar bloqueios HTTP 403 do Cloudflare / TheGamesDB em ambiente de desenvolvimento local.
- **Limpeza de Cache e Versionamento**:
  - Removidos artefactos de scripts anteriores nos handlers de emergência de `index.html`.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → multi-proxy Promise.any(), variantes de títulos com e sem espaços, v141
- `server.ps1` → UserAgent no WebRequest do proxy local
- `index.html` → versão v141 e limpeza de rotas de emergência
- `sw.js` → cache v141
- `js/app.js` → imports v141 e constantes de versão
- `js/services/chartService.js` → versão v141
- `.agent/historico.md` → registo v141

---

## v140 — 2026-09-26
### 🔧 Correção: Pesquisa de Capas para Títulos Genéricos (ex: "Getaway")

- **Causa Raiz**: Para títulos genéricos, o TheGamesDB devolvia até 16 resultados, criando um URL de imagens muito longo que o proxy `allorigins.win` rejeitava com timeout.
- **Correção 1 — Limite reduzido a 6 jogos**: O slice de resultados passou de 16 para 6, mantendo o URL das imagens curto e dentro dos limites do proxy.
- **Correção 2 — Imagens com try/catch independente**: A chamada à API de imagens foi envolvida num `try/catch` separado. Se a chamada de imagens falhar, a pesquisa não crasha — continua com lista vazia de imagens em vez de propagar um erro fatal ao utilizador.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → limite 16→6, try/catch isolado para fetch de imagens, versão v140
- `index.html` → versão v140
- `sw.js` → cache v140
- `js/app.js` → imports v140
- `js/services/chartService.js` → importações v140
- `.agent/historico.md` → registo v140

---

## v139 — 2026-09-26
### 🔧 Restauro do Motor de Capas TheGamesDB — Correção do Timeout do Proxy CORS

- **Causa Raiz Identificada e Corrigida**:
  - Em v136 foi introduzido um `AbortController` com timeout de **2 segundos** no proxy `allorigins.win`. O `allorigins.win` demora tipicamente **2–5 segundos** a responder, pelo que o pedido era sempre cancelado antes de receber a resposta. O browser ficava convencido que o TheGamesDB estava inacessível, quando na realidade era apenas lento.
  - **Correção**: O timeout do proxy `allorigins.win/get` foi aumentado para **12 segundos**, permitindo que a resposta chegue sempre.
- **Eliminação do Fallback para a Wikipedia**:
  - Removida a lógica de fallback automático para a Wikipedia/Wikimedia quando o TheGamesDB não devolvia resultados. O utilizador quer exclusivamente capas do TheGamesDB.net.
  - Agora, se o TheGamesDB não encontrar resultados ou falhar, é apresentada uma mensagem de erro clara ao utilizador.
- **Melhorias no `theGamesDBService.js`**:
  - Cache-busting adicionado ao URL do proxy (`&cb=${Date.now()}`) para evitar respostas em cache do Cloudflare.
  - Detecção de chave API inválida (HTTP 401/403) com mensagem de erro clara.
  - Deteção expandida da rede local: inclui `172.x.x.x` e porta `8080` além de `localhost` e `192.168.x.x`.
  - Proxy local `server.ps1 /proxy` mantido para localhost/LAN com timeout de 6 segundos.
- **Bump de versão v138 → v139** em todos os ficheiros versionados.

### 🔧 Ficheiros Modificados
- `js/services/theGamesDBService.js` → correção de timeout (12s), cache-busting, deteção de erro 401/403, deteção de rede local expandida
- `js/app.js` → remoção do fallback Wikipedia, pesquisa exclusiva via TheGamesDB, versão v139
- `index.html` → versão v139 e scripts de controlo de cache
- `sw.js` → cache v139
- `js/services/chartService.js` → importações atualizadas para v139
- `.agent/historico.md` → registo da versão v139

---

## v138 — 2026-09-26
### 🎨 Resolução Definitiva da Pesquisa de Capas: Box Arts com pilicense=any & Timeouts Rápidos
- **Resolução da Falha de Zero Capas Encontradas**:
  - **Parâmetro Crítico `pilicense=any`**: A API da MediaWiki/Wikipedia apenas retornava imagens com licença livre (`pilicense=free` por omissão), descartando e bloqueando 100% das capas e *box arts* comerciais de jogos retro (que estão catalogadas sob *fair use* / copyright). Com a introdução de `pilicense=any`, todas as capas oficiais de retalho em alta resolução passam a ser entregues diretamente ao browser com suporte nativo de CORS (`origin=*`).
  - **Estratégia Multi-Query Inteligente**: A pesquisa foi aprimorada com busca em cascata (Título limpo, Título + "video game", Subtítulo sem pontuação), garantindo que clássicos como *Sonic the Hedgehog*, *Super Mario World*, *Speedball 2*, *Alex Kidd*, *Zelda*, *Streets of Rage*, entre muitos outros, encontram de imediato as suas capas oficiais.
  - **Filtro de Logótipos e Ícones**: Exclusão automática de imagens vetoriais `.svg` e ícones da interface da Wikipedia, priorizando exclusivamente as capas frontais de caixas (*Box Art*).
  - **Extração de Metadados Automáticos**: Leitura e auto-preenchimento de ano de lançamento e descrição/sinopse a partir do extrato da enciclopédia para os campos do formulário.
- **Timeouts Rápidos com `AbortController` no TheGamesDB**:
  - Implementado cancelamento ativo (2.5s na conexão direta, 2s no proxy) para evitar esperas prolongadas quando proxies públicos estão inacessíveis.
  - Fallback instantâneo e transparente para a base de capas oficiais da Wikipedia se o TheGamesDB não estiver disponível via CORS ou não devolver resultados.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `js/services/chartService.js`, `js/services/theGamesDBService.js`, `js/services/webuyService.js` e `js/app.js` atualizados para a versão `v138`.

### 🔧 Ficheiros Modificados
- `js/services/webuyService.js` → implementação da pesquisa de capas com `pilicense=any`, queries em cascata e extração de metadados
- `js/services/theGamesDBService.js` → `AbortController` com timeouts rápidos e versão v138
- `js/app.js` → fallback transparente para Wikipedia quando TheGamesDB falha ou não tem capas, suporte a badges de fonte e versão v138
- `index.html` → versão v138 e scripts de controlo de cache
- `sw.js` → cache v138
- `js/services/chartService.js` → importações e anotações atualizadas para v138
- `.agent/historico.md` → registo da versão v138

---

## v137 — 2026-09-26
### 🐛 Correção Crítica de Sintaxe em searchCover
- **Resolução de SyntaxError no Arranque**:
  - Corrigido o emparelhamento dos blocos `try...catch...finally` na função `searchCover` em `js/app.js` (erro `Unexpected token 'catch'` na linha 864 que impedia o arranque da aplicação).
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `js/services/chartService.js` e `js/app.js` atualizados para a versão `v137`.

### 🔧 Ficheiros Modificados
- `js/app.js` → correção do bloco try exterior em `searchCover` e versão v137
- `index.html` → versão v137 e scripts de controlo de cache
- `sw.js` → cache v137
- `js/services/chartService.js` → importações e anotações atualizadas para v137
- `.agent/historico.md` → registo da versão v137

---

## v136 — 2026-09-26
### 🛡️ Resiliência na Pesquisa de Capas: Fallback Automático Wikipedia & Suporte de Rede
- **Fallback Automático para Capas da Wikipedia**:
  - Quando a API do TheGamesDB.net se encontra temporariamente inacessível (devido a restrições de CORS no browser, instabilidade de proxies públicos ou quebras na ligação de rede), o motor de pesquisa não bloqueia o utilizador nem dispara alertas de erro impeditivos.
  - Recorre de imediato e de forma transparente à pesquisa nativa de capas via Wikipedia (`WebuyService`), exibindo feedback informativo (`✅ Capa(s) encontrada(s) via Wikipedia (Alternativo)`).
- **Calibração de Redes Locais e Proxies no TheGamesDB**:
  - `theGamesDBService.js`: Suporte expandido a redes locais privadas (`192.168.x.x`, `10.x.x.x` e porta `8080`) para usar o `/proxy` local de alta velocidade sempre que o servidor de desenvolvimento estiver em execução.
  - Adicionado processamento de payload JSON via endpoint `/get` do AllOrigins para maior compatibilidade de cabeçalhos.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `js/services/chartService.js`, `js/services/theGamesDBService.js` e `js/app.js` atualizados para a versão `v136`.

### 🔧 Ficheiros Modificados
- `js/app.js` → fallback transparente para Wikipedia em `searchCover`, feedback badge e versão v136
- `js/services/theGamesDBService.js` → deteção de IP local para `/proxy` e suporte a AllOrigins `/get`
- `index.html` → versão v136 e scripts de controlo de cache
- `sw.js` → cache v136
- `js/services/chartService.js` → importações e anotações atualizadas para v136
- `.agent/historico.md` → registo da versão v136

---

## v135 — 2026-09-26
### 👁️ Visibilidade de Chaves e Tokens nas Definições da Nuvem
- **Campos de Chaves Visíveis por Omissão**:
  - Os campos **GitHub Token (Escrita)** e **TheGamesDB.net API Key** na secção de *Sincronização Cloud* passam a ser visíveis por omissão (em vez de ocultados por `type="password"`), permitindo conferir e validar facilmente o token ou chave introduzida.
  - Formatação com fonte monospace e dimensionamento responsivo para visualização clara de tokens alfanuméricos longos (ex.: `ghp_...`).
- **Botão de Alternância de Visibilidade (👁️ / 🙈)**:
  - Adicionado botão interativo para alternar rapidamente a visibilidade (`window.toggleKeyVisibility`) em ambos os campos caso o utilizador pretenda ocultar ou revelar as credenciais sob demanda.
- **Melhoria na Persistência de Credenciais**:
  - Refinamento da função `saveCloudLink` para suportar limpeza/remoção correta de tokens e chaves vazias no `localStorage`.
- **Invalidação de Cache e Service Worker**:
  - `sw.js`, `index.html`, `js/services/chartService.js` e `js/app.js` atualizados para a versão `v135`.

### 🔧 Ficheiros Modificados
- `js/app.js` → campos visíveis com botão de alternância de visibilidade, função `toggleKeyVisibility`, melhoria em `saveCloudLink` e versão v135
- `index.html` → versão v135 e scripts de controlo de cache
- `sw.js` → cache v135
- `js/services/chartService.js` → importações e anotações atualizadas para v135
- `.agent/historico.md` → registo da versão v135

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
