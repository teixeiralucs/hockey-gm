# Hockey GM - Ações de Implementação

Este documento rastreia as implementações reais feitas, explicando _o que_ foi construído e _como_ foi estruturado tecnicamente, versionado por iterações.

## [Alpha 0.1.0] - Fundação Inicial

### 1. Estrutura e Fundamentos do Projeto

### 1.1 Arquitetura e Stack

- **Stack**: Vanilla HTML, CSS e JavaScript com ES Modules (`type="module"`).
- **Estrutura de Arquivos**:
  - `index.html`: Container de entrada principal (`#app`).
  - `css/style.css`: Estilos globais, CSS Variables (Custom Properties) e Tipografia.
  - `js/main.js`: Lógica principal da view e roteamento da UI.
  - `data/teams.js`: Fonte da verdade (somente leitura) dos dados dos times da OHL.
  - `assets/fonts/`: Arquivos de fontes locais.

### 1.2 Design System & Estética

- **Tema**: Premium Dark Mode. Fundo Midnight Blue (`#0b1121`) com cores de superfície mais claras (`#151e32`) e azul primário como destaque (`#3b82f6`).
- **Tipografia**:
  - **Blockletter**: Fonte OTF local usada em cabeçalhos primários e elementos de destaque da UI para dar uma estética de esportes/hockey.
  - **Roboto**: Carregada via Google Fonts para textos de apoio limpos e legíveis.
- **Efeitos Visuais**: Gradientes radiais no CSS para textura de fundo, efeitos de brilho (glow) no hover, e transições CSS nos elementos interativos para criar o fator "wow" moderno.

### 2. Features Implementadas

### 2.1 Tela de Seleção de Liga (League Selection)

- **O que é**: A primeira tela que o usuário vê ao iniciar um novo jogo. Permite a escolha da liga onde a carreira será iniciada.
- **Como funciona**: Renderiza uma lista das ligas disponíveis (atualmente apenas OHL). Clicar no card da liga avança o estado para a tela de Seleção de Franquia daquela liga específica.
- **Fonte de Dados**: Fixado no estado da UI por enquanto. Apresenta o logo oficial da liga em formato quadrado.

### 2.2 Tela de Seleção de Franquia (RF01)

- **O que é**: A tela onde o usuário seleciona seu time inicial.
- **Como funciona**: O sistema filtra a base de dados em `data/teams.js`, randomiza a ordem dos times e apresenta exatamente 6 opções para o jogador.
- **Interações**:
  - **Reroll Button**: Permite sortear novamente e obter 6 novos times.
  - **Back Button**: Permite voltar para a tela de Seleção de Ligas.
  - **Seleção do Time**: Clicar em um card de time confirma a seleção (atualmente exibe um alert como placeholder da lógica de criação do save).
- **Idioma**: Totalmente localizado para o Inglês, facilitando a base global de jogadores.

## [Alpha 0.1.1] - Refinamentos e QoL

### 1. Refinamentos Visuais e de UI

- **Logo da OHL em Vetor**: O card da liga OHL foi remodelado (formato quadrado perfeito) e agora apresenta o logo oficial em formato SVG vetorial nativo, removendo as marcações antigas de tier.
- **Formatação Uniforme de Nomes**: Desenvolvida lógica javascript que separa a "Cidade" do "Nome do Time" (Mascote), renderizando de forma padronizada todos os 20 cards da UI em exatas duas linhas (Cidade cima/translúcido, Nome baixo/destaque).

### 2. Navegação (Quality of Life)

- **Botão de Retorno**: Adicionado o botão secundário "Back to Leagues" na tela de Seleção de Franquia para reverter o fluxo ao estado anterior.

### 3. Organização de Documentação e Git

- **Atualização de Requisitos**: O requisito funcional de Tabelas de Classificação (Standings) teve sua prioridade elevada para a posição RF04 na documentação principal.
- **Branching**: As modificações foram testadas e comitadas de forma sincronizada entre `development`, `featured` e `bugs`.

## [Alpha 0.1.2] - Dashboard e Tematização Dinâmica

### 1. Tematização e Layout Dinâmico (Design System)

- **Cores Dinâmicas da Franquia**: A interface do jogo (`index.html`) agora absorve completamente a paleta oficial da franquia escolhida (`primary` e `secondary` colors importados do BD de times).
- **Background Global**: O fundo do app implementa um elegante `linear-gradient` misturando a cor Primária e a cor Secundária em 60% de opacidade fundidos a uma base escura (`#0b1121`).
- **Cards e Opacidade**: Os painéis de conteúdo do Dashboard (Standings, Matches) usam 60% da cor secundária fundida, gerando contraste e legibilidade sem usar pretos chapados.
- **Iconografia Premium**: O Sidebar abandonou emojis e agora integra dinamicamente a biblioteca **Lucide Icons** via CDN (usando os ícones `layout-dashboard`, `users`, `calendar`, `library`, `save` e `log-out`).

### 2. Standings Component (Tabela de Classificação)

- **Tabela Sortable**: O usuário consegue reorganizar a tabela dinamicamente clicando nos headers de GP, W, L, OTL, PTS e Team Name.
- **Ranking Absoluto (#)**: A coluna de Posição (#) foi isolada do mecanismo de sorteio HTML. Ela sempre calcula a posição "real" do time baseada no seguinte Tiebreaker: `Maior PTS > Maior Wins > Maior OTL`. Clicar na coluna `#` reseta a tabela para a ordem oficial.
- **Sistema de Conferências**: O painel exibe abas alternáveis entre `East` e `West`, renderizando apenas os times daquela conferência. A aba ativa por padrão é a da conferência na qual a franquia do jogador se encontra.

### 3. Next Match Component

- **Engine de Sorteio**: A `initNewGame` cria e define um oponente aleatório para o Match 1 de 68. Também determina o mando de gelo (Home ou Away).
- **Duelo Visual**: O Card de próxima partida exibe um formato `<AWAY> VS <HOME>`. Logo, nomes e recordes da temporada (`0-0-0`) de ambos aparecem lado a lado.
- **Botão Gradiente**: O botão de "Play Match" implementa um gradiente único fundindo visualmente 50/50 da Cor Primária do visitante com a Cor Primária do mandante.

### 4. League Leaders Component

- **Mock Data Generator**: Criado um script temporário na `initNewGame` para sortear nomes e sobrenomes de jogadores falsos, associá-los a um time aleatório do banco de dados para renderizar sua logo, e criar atributos de liderança em 4 modalidades (`PTS`, `G`, `A`, `SV%`).
- **Navegação em Abas**: Micro-sistema de abas idêntico ao Standings que permite ao usuário filtrar o Top 3 da liga nas 4 categorias.
- **Design de Lista Premium**: Cada linha lista o `#Rank`, a logo em miniatura do time de origem, o nome do jogador e seu stat enorme na direita. A linha possui highlight ao passar o mouse e uma borda à esquerda puxando a cor primária da franquia de origem do jogador.

## [Alpha 0.1.3] - OHL Global Database (RF03)

### 1. Global Scraper (CHL API)
- **O que é**: Script em Python (`scripts/scrape_all_teams.py`) desenhado para se conectar à API da HockeyTech/CHL e extrair os plantéis reais das franquias.
- **Como funciona**: O script foca no `season_id=83` (Temporada 2024-2025). Faz o loop sobre os 20 times da liga, extraindo e processando metadados de jogadores em tempo real (calculando a idade baseada em data de nascimento).
- **Dados Extraídos**:
  - Foto (`photo`)
  - Nome, Posição e Número
  - Local de Nascimento (`birthplace`)
  - Idade (`age`)
- **Storage**: O script gera o arquivo centralizado `data/rosters.json` (aprox. 730 jogadores reais).

### 2. Refatoração da Engine Principal (Init Game)
- **Processamento Assíncrono**: As funções `initNewGame` e `handleTeamSelection` foram refatoradas para arquitetura `async/await`. O jogo pausa a UI até que o banco `rosters.json` seja carregado.
- **Roster Inteligente**: O gerador de jogadores aleatórios ("J. Smith") foi permanentemente removido. O jogo pesquisa o arquivo JSON e constrói a Roster completa do usuário usando as Lendas reais da OHL.
- **Inteligência da CPU**: Ao criar um save, não apenas o Roster do usuário, mas os elencos das outras 19 franquias (controladas pela máquina) também são montados na memória em estado `cpu_bench`, preparando o campo para partidas reais.

### 3. Ajustes no League Leaders
- **Lógica de Fallback Vazio**: Com a remoção dos dummy data gerados aleatoriamente, as tabelas de líderes implementam tratamento para Arrays vazios, exibindo a mensagem: "No stats available yet. Play matches to see leaders." nas categorias de PTS, G, A e SV%.

## [Alpha 0.1.4] - OHL Ultimate Draft & Premium Cards (RF05/RF06)

### 1. Stats Reais e True Overalls
- **Nova lógica do Scraper**: O Scraper agora coleta ativamente estatísticas oficiais da API CHL (Temporada 83) para Top Scorers e Goalies, preenchendo Gols, Assistências, Pontos, Vitórias e Porcentagem de Defesa (SV%).
- **Balanceamento do Overall (RF06)**: As pontuações geram um Rating de Overall perfeitamente escalonado de 12 a 23, simulando os valores fiéis de ligas de base (juniores). 
- **Sistema de Tiers Visual**: O banco de dados classifica e armazena os Tiers (Gold, Silver e Bronze) baseados puramente no mérito numérico do novo Overall.

### 2. Sorteio de 20 Jogadores (Random Draft - RF03)
- **Quebra do Roster Fixo**: O jogo abandona o fornecimento da Roster original da franquia selecionada. A engine embaralha os 730+ jogadores da OHL em um pool gigante e transfere exatamente 20 jogadores aleatórios, de diversos times e em diferentes quantidades posicionais, gerando um "Pack" inicial completamente randômico. As demais franquias controladas pela CPU mantém seus elencos originais intactos.
- **Roster Dinâmico**: A interface fina de arraste (`.player-card`) passa a exibir a logomarca da franquia original de onde o jogador foi sorteado.

### 3. Player Cards Premium Interativos (RF05)
- **Modal Glassmorphism**: Desenvolvido um modal escuro e estético ativado através do clique nativo no `.player-card`.
- **Anatomia do Card**:
  - Máscara vetorial no topo tingida de acordo com a Posição do jogador no gelo.
  - Foto em alta resolução com formato circular flutuante, abraçada por anéis dourados, prateados ou acobreados com sombras estendidas (`box-shadow`), ditadas pelo atributo `tier`.
  - Distintivos absolutos com Badge do Overall enorme no canto superior esquerdo e logo original do time à direita.
  - Stats dinâmicos com ícones para PTS/G/A (Forwards e Defensors) e WINS/SV% (Goalies), assim como metadados geográficos e faixa etária (`age`).

## Iteração Alpha 0.1.5 (Atual)
### 1. Refinamento de UI e UX
- **Correção Visual de Logos**: O script JavaScript responsável pela manipulação de URLs e IDs das logos foi corrigido. Substituído o escape inválido `\s` por espaço literal no Regex, permitindo renderização perfeita dos escudos nas cartas.
- **Transição de SVG para PNG**: Implementado fallback e priorização global para ícones `.png` devido a vetores encápsulados (base64) corrompidos na fonte original, melhorando a clareza da UI no Roster e nos Cards de Franquia.
- **Roster Slot Consistente**: Adicionado `min-height: 48px` nas zonas de *drop* vazias do Roster no gelo, abolindo "saltos" visuais durante o Drag and Drop.

### 2. Otimização do Bench
- **Cabeçalhos Interativos (Sortáveis)**: Implementada uma barra de atributos flutuante no topo da Pool de Reservas (`P`, `T`, `NAME`, `OVR`), copiando o mesmo comportamento dinâmico e flexível da tabela de Standings.

### 3. Bypass Anti-Bugs na Base de Dados Oficial
- **Fuga do Person ID**: Escrita uma lógica inteligente para bypassar IDs incorretos fornecidos pela HockeyTech/CHL (Ex: o caso "Mason Roy com foto de Matthew Schaefer"). A engine frontal ignora o metadado `person_id` maculado do JSON e força a chamada HTTP extraindo matematicamente o `player_id` puro encapsulado no nó de identificação interna. Resolvendo assim de forma limpa o problema das fotos duplicadas/inválidas sem necessidade de web scraping adicional.
