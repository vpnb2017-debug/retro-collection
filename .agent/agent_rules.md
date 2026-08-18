# Diretrizes e Regras do Projeto RetroCollection

## 1. Informações Básicas e Alojamento
- **Nome da Aplicação**: RetroCollection
- **Tipo de Projeto**: Progressive Web App (PWA) responsiva para gestão e catalogação de coleções de jogos retro e consolas.
- **Repositório Git**: `https://github.com/vpnb2017-debug/retro-collection.git`
- **Branch Principal**: `main`
- **Endereço Público (GitHub Pages)**: `https://vpnb2017-debug.github.io/retro-collection/`
- **Execução Local (Desenvolvimento)**:
  - Servidor HTTP local em PowerShell (`.\server.ps1`) acessível em `http://localhost:8080`.
  - **ATENÇÃO**: Nunca abrir a app como ficheiro local (`file:///`), pois os navegadores bloqueiam módulos JS (`type="module"`) e Service Workers por regras de CORS.
- **Autenticação e Credenciais Git**:
  - As credenciais de autorização de escrita para publicar no Git estão guardadas localmente no ficheiro privado `.git/config` da máquina do programador (fora do histórico público do Git por motivos de segurança).


## 2. Regra de Versionamento por Publicação no Git
- **Incremento Obrigatório de Versão**:
  - Sempre que for efetuada uma nova publicação / commit no Git, a versão da app **DEVE ser incrementada** (ex: `v115` -> `v116`).
- **Locais a Atualizar em Cada Versão**:
  - `index.html`: Versão no `<title>` e no script de controlo de cache (`app_v`, `?v=XXX`).
  - `js/app.js`: Versão nos `import` dos serviços e na propriedade `version` da exportação para a Nuvem.
- **Motivo**: Garantir que o Service Worker da PWA invalida a cache anterior no navegador do utilizador e descarrega o código atualizado imediatamente.

## 3. Regra de Atualização do Histórico
- **OBRIGATÓRIO**: Sempre que uma nova versão for implementada (local ou publicada no Git), o ficheiro `.agent/historico.md` **DEVE ser atualizado** com:
  - Número da versão e data.
  - Lista de novas funcionalidades adicionadas.
  - Lista de correções efetuadas.
  - Lista de ficheiros criados e modificados.
- **Localização**: `.agent/historico.md` na raiz do projeto.
- **Formato**: Seguir o formato Markdown existente no ficheiro (secções por versão em ordem decrescente).

## 4. Arquitetura e Serviços de Dados
- **Armazenamento Local**: IndexedDB (`RetroCollectionDB`, v5) para persistência offline de jogos, consolas e imagens em Base64.
- **Sincronização Cloud**: Sincronização bidirecional automática e manual via GitHub Gist privado.
- **Pesquisa de Capas**:
  - **Prioridade 1**: TheGamesDB.net API (`theGamesDBService.js`) quando a chave `thegamesdb_api_key` estiver configurada nas Definições.
  - **Fallback**: Bing Images (`webuyService.js`) através da rota `/proxy`.
- **Metadados Automáticos**: Integração com a MediaWiki / Wikipedia API (`metadataService.js`).
- **Serviços Adicionais (v123+)**:
  - `barcodeScannerService.js`: Leitor de código de barras EAN/UPC via câmara.
  - `chartService.js`: Renderização de gráficos no Dashboard.
  - `exportService.js`: Exportação para PDF e Excel com imagens.

## 5. Diretrizes Comportamentais do Agente
- Ler obrigatoriamente este ficheiro (`.agent/agent_rules.md`) no início de cada sessão.
- Garantir sempre o cumprimento estrito das regras de versão antes de fazer commits no repositório.
- **Atualizar obrigatoriamente o ficheiro `.agent/historico.md`** sempre que uma nova versão for implementada.
- Manter o código limpo, sem dependências desnecessárias de frameworks pesadas, utilizando ES Modules nativos e CSS Vanilla.
