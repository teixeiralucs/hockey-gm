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
- **Roster Slot Consistente**: Adicionado `min-height: 48px` nas zonas de _drop_ vazias do Roster no gelo, abolindo "saltos" visuais durante o Drag and Drop.

### 2. Otimização do Bench

- **Cabeçalhos Interativos (Sortáveis)**: Implementada uma barra de atributos flutuante no topo da Pool de Reservas (`P`, `T`, `NAME`, `OVR`), copiando o mesmo comportamento dinâmico e flexível da tabela de Standings.

### 3. Bypass Anti-Bugs na Base de Dados Oficial

- **Fuga do Person ID**: Escrita uma lógica inteligente para bypassar IDs incorretos fornecidos pela HockeyTech/CHL (Ex: o caso "Mason Roy com foto de Matthew Schaefer"). A engine frontal ignora o metadado `person_id` maculado do JSON e força a chamada HTTP extraindo matematicamente o `player_id` puro encapsulado no nó de identificação interna. Resolvendo assim de forma limpa o problema das fotos duplicadas/inválidas sem necessidade de web scraping adicional.

### Hotfix v0.1.5.1 (UI State & Routing)

- **Degradê Nativo**: Injeção da cor principal e secundária da OHL diretamente no seletor de franquia, utilizando as cores designadas no sistema de cores base (`#047ac4` e `#aaaaaa`).
- **Botão Voltar Dinâmico**: Restaurado o botão _Back to Leagues_ no topo da tela de seleção de franquia.
- **Vazamento de CSS Controlado**: Corrigido um bug onde o _Leave Game_ limpava as variáveis dinâmicas mas mantinha a injeção em linha de `background`, causando poluição da tela preta/azul estelar na seleção de Ligas.

### Iteração Alpha 0.1.6 (Atributos Avançados)

- **Engine Estatística**: Foi implementado um script Python gerador de sub-atributos baseado em orçamentos paramétricos de multiplicadores (Ratios). Cada jogador recebeu uma fração exata de seu rating nos pilares de `Skating, Creativity, Shooting, Defense`, divididos com uma variância randômica justa de `45%-55%` para suas 8 _skills_ diretas (Speed, Agility, Vision, Intelligence, Power, Accuracy, Contact, Positioning).
- **Player Card Analytics**: O Modal Premium das cartas foi refatorado. Onde antes existia o bloco _"Game Stats Will Appear Here"_, agora há uma tabela rica 2x2 com Barras de Progresso de neón dinâmicas refletindo as 4 habilidades Macro, e a contagem explícita de suas 8 Sub-habilidades. Goleiros usam a aba estendida com os mesmos atributos genéricos como abstrações de técnica no Gelo.

### Iteração Alpha 0.1.7 (Standings e Playoffs Bracket)

- **Estrutura de Classificação**: Atualizado `data/teams.js` adicionando suporte às 4 divisões oficiais da OHL (East, Central, Midwest, West). O motor de estados `gameState.standings` foi aprimorado injetando as estatísticas vitais do hóquei: GF, GA e Tracking de Streak.
- **Standings UI**: Extraímos a tabela compacta do Dashboard e arquitetamos uma nova página robusta acessível via barra lateral. A temporada regular exibe uma Mega-Tabela subdividida por Divisão, renderizando marcações visuais com os Seeds indicando quem vai aos playoffs (`xy`, `x`).
- **Bracket Simulator (Mock)**: Desenhamos via CSS Flexbox a chave clássica de chaves esportivas de Playoffs norte-americanos. Implementamos um botão provisório ("Simulate Playoff Debug") que Randomiza todos os atributos necessários simulando 68 partidas para preencher a UI visual de Standings e rodar as chaves de campeão (J. Ross Robertson Cup).

### Iteração Alpha 0.1.8 (Standings Clinching Logic)

- **Magic Numbers Engine**: Criado o motor de cálculo lógico `updateClinchStatuses()` baseado em "Max Points Possíveis". Ele processa todos os adversários de uma equipe para determinar se um oponente ainda consegue, matematicamente, alcançá-la.
- **Integração Visual**: Letras `x` (Playoffs), `y` (Divisão) e `z` (Temporada Regular) agora são renderizadas de forma programática baseadas no algoritmo, sendo independentes apenas de ranqueamento posicional estático. A função `simulatePlayoffDebug` foi atualizada para rodar o cálculo ao forçar o término da temporada de 68 jogos.
- **UI Estática e Sem Hover**: Remoção da classe que atrelava a tela de classificação às propriedades do dashboard principal, anulando animações e brilhos indesejados e mantendo as tabelas como painéis analíticos fixos.
- **Edge Cases Estatísticos**: Correção do tracking do estado de Streaks. Quando um time possui 0 jogos (início de temporada) o contador não imprime mais "None0", renderizando apenas o caractere '-' nativo.
- **Árvore de Playoffs com Linhas**: Implementado todo o sistema de classes lógicas e pseudo-elementos em CSS (`::after`, `::before`) responsáveis por traçar programaticamente as famosas "linhas conectoras" de galhos entre as rodadas das chaves Oito-Avos até a Grande Final. Corrigidos também os cortes horizontais garantindo o scroll adequado de chaves extensas.

### Iteração Alpha 0.1.9 (RF09 - Buffs e Modificadores)
- **Engine de Modificadores OVR**: Desenvolvida a função `getPlayerModifiers()` que varre o roster e calcula incrementos aditivos no Overall base dos jogadores.
- **Regras Matemáticas de Bônus**: Os jogadores recebem `+15%` de OVR se colocados em suas posições de origem no gelo, `-25%` caso arrastados para posições erradas, `+20%` se pertencerem na vida real à franquia controlada pelo jogador (Time do Coração), e `+15%` de bônus de Química de Linha caso compartilhem a mesma linha de gelo com outro ex-companheiro de time real. O buff máximo possível salta para generosos `+50%`.
- **UI de Impacto Analítico**: Renderização dinâmica nas minicartas do Roster de setas geométricas `▲` (Verde Neon) ou `▼` (Vermelho Alerta) dependendo do estado do modificador final do jogador. No interior do Modal Premium, o multiplicador final é exibido matematicamente puro (Ex: `+35%`) entremeando o novo valor astronômico de OVR e a estampa "OVR".
- **Reatividade Nativa**: Toda transação de "Drag and Drop" recalcula o quadro de modificadores da linha inteira simultaneamente e instantaneamente.

### Iteração Alpha 0.1.9.1 (Hotfix de Motor & UI)
- **Correção da Lógica de Sinergia (Franchise Buff)**: Corrigido o target de propriedade de `gameState.teamId` para `gameState.team.id` na engine de química, destravando com sucesso o multiplicador de +20% para jogadores vinculados à franquia escolhida.
- **Correção do Infinite Money Glitch e Softlock**: Removida a duplicação inadvertida de jogadores selecionados no draft em times gerenciados pela CPU. O motor de anti-softlock foi aprimorado para contar ativamente apenas os jogadores não-CPU, barrando exclusões sob limite (mín. 20) com aviso dinâmico. Adicionado slice no filtro para limpar completamente os jogadores em cash out.
- **Fim das Caixas Nativas (Alert/Confirm)**: Substituição radical de todos os eventos síncronos de `window.alert` e `window.confirm` do navegador para Modais Assíncronos Customizados da interface premium (Vender Jogador, Mandar para a Coleção, Falta de Moedas, Limite de Elenco, Draft Esgotado). Essa mudança previne bugs no ciclo de vida nativo do *Drag and Drop* HTML5 e elimina comportamentos de elementos "fantasmas".
- **Reveal de Pacotes Múltiplos**: Adicionada a função `openPackRevealModal` que abre a animação de sorteio com os 3 cards do pacote injetados num modal Flexbox com microanimações de zoom, melhorando absurdamente o "feel" de *opening* do sistema de gacha.
- **Sinalização Visual de Tiers**: A tela do Hockey Shop foi reestruturada para suportar Headers de Tier (ex: D-Tier Packs), segmentando as prateleiras de compra. Caso o elenco atinja o limite mínimo, a engine bloqueia transações a menos que o usuário possua ao menos 200 moedas para suprir a vaga comprando um substituto no Shopping.
- **Sidebar Reativa**: A barra lateral foi reescrita para refletir dinamicamente o time ativo. Fora do Dashboard principal, todas as abas (Roster, Standings, Shop, etc.) exibem orgulhosamente o logo da franquia do usuário e seu record (V-D-OTL) no canto superior esquerdo.

### Iteração Alpha 0.1.10 (RF10 - Sistema Financeiro e Loja)
- **Barreira Anti-Softlock**: O sistema de "Drag and Drop" do Roster foi fortificado. As áreas de "Sell" e "Collection" agora validam a contagem mínima de 20 jogadores ativos. Caso o elenco atinja o limite mínimo, a engine bloqueia transações a menos que o usuário possua ao menos 200 moedas para suprir a vaga comprando um substituto no Shopping.
- **Loja e Economia**: Adicionado roteamento e tela dedicada "Hockey Shop" na sidebar. O jogador acessa seu saldo em tempo real (🪙 Coins).
- **Prateleira de Pacotes Modulares**: Implementado um motor genérico de draft (`buyPack`) que suporta configurações flexíveis de preço, quantidade de cartas, restrições posicionais e "drop rates" especiais.
- **Expansão do D-Tier**: Foram criados 5 pacotes iniciais na prateleira da loja:
  - **Standard Pack (200 🪙)**: 3 jogadores aleatórios.
  - **Jumbo D-List (600 🪙)**: 6 jogadores aleatórios. Possui **15% de chance** (por carta) de critar num jogador **C-Tier**, elevando suas métricas em 50%, garantindo borda Silver e aplicando a tag " (C-TIER)".
  - **Forwards Pack (400 🪙)**: 2 Atacantes garantidos (LW, C, RW).
  - **Defense Pack (400 🪙)**: 2 Defensores garantidos (LD, RD).
  - **Goalie Pack (400 🪙)**: 2 Goleiros garantidos (G).

### Iteração Alpha 0.1.11 (RF11 - Match Simulation Engine)
- **Engine de Simulação Baseada em Eventos**: Substituição do modelo estático de 1-minuto por uma timeline gerada matematicamente que usa a diferença de "Team OVR" (Overall Rating) para rolar dados invisíveis. Gols ocorrem em minutos e segundos específicos calculados antes mesmo do "puck drop".
- **Cinemática de Cronômetro**: O relógio do jogo não passa de forma linear, ele pula freneticamente no tempo diretamente para os timestamps onde um gol ou o final de um período ocorrem, pausando para drama.
- **Goal Overlay Animation**: Uma tela dramática pisca na tela contendo o grito de "GOAL" gigante em vermelho com a sombra baseada na cor do time que marcou.
- **Design de Placar Glassmorphism**: O Placar da partida ganhou vida ao combinar linearmente (gradient cross) a cor nativa dos dois times presentes na partida, um corte de lâmina de gelo (slash) diagonal e fundos translúcidos de vidro, melhorando absurdamente a imersão de arena digital.
- **Ocultação da HUD**: A Sidebar se recolhe automaticamente durante a partida simulada para prevenir interferência ("cheat") do jogador mudando o roster no meio de uma partida.
- **Event Log (Caixa de Textos)**: A renderização dos eventos (como goals ou Puck Drops) ocorre de forma perene no rodapé da simulação, permitindo uma leitura fria da timeline da partida.

### Iteração Alpha 0.1.12 (Deep Simulation Engine V3 & Economia)
- **Redesign 70/30 e Imersão de Rinque**: A tela da partida foi redesenhada. 70% da tela abraça o Placar sobre uma imagem CSS abstrata de um Rinque de Hockey (linhas azuis, vermelhas, e marcações de faceoff). Os outros 30% são dedicados a um painel de Play-by-Play Event Log em tempo real.
- **Deep State Machine (Tick Simulation)**: O motor evoluiu de cálculos aleatórios soltos para uma rigorosa Máquina de Estados. A simulação percorre a partida em blocos de 10 a 20 segundos. Ela trackeia: Posse de Disco, Zona de Gelo (Defesa, Neutra, Ataque), Fadiga das linhas, e Penalidades (Power Plays de 5v4 que garantem bônus de 15% de OVR ao time em vantagem).
- **Trilha Lógica Física**: A Engine simula perfeitamente transições de zona (Dump & Chase, Entradas), Rebounds, Chutes Bloqueados por defensores, trancos (Hits) e roubadas de disco. Goleiros utilizam matemática de *Save Quality* contra *Shot Quality* para decidir a física dos gols.
- **Sudden Death Overtime & Empty Net**: Injeção da regra esportiva oficial. Se as equipes estiverem empatadas ao fim do Terceiro Período, o jogo entra em prorrogação de 5 Minutos (Morte Súbita - o primeiro a marcar acaba com o jogo). Além disso, times perdendo por 1 a 2 gols no fim da partida acionarão um modo de desespero (Empty Net), puxando o goleiro da quadra por um atacante extra.
- **Microestatísticas Diretas**: Os gols marcados na simulação não são mais apenas pontos na parede; o algoritmo varre os jogadores que estavam no gelo (Line F e Line D atual), sorteia o artilheiro com base em peso estatístico, e também rola probabilidades para distribuir as assistências da jogada diretamente na ficha (`stats`) do jogador.
- **Event Log Dinâmico (Highlights)**: Eventos críticos (Gols, Penalidades, Final de Partida) são injetados no log com forte Negrito (`highlight`) e barras coloridas para destacar o impacto visual.
- **Fix do Ultimate Team Draft**: Consertado um grave bug que forçava a loja a "re-comprar" jogadores nativos do próprio time caso o elenco não estivesse completo. Agora a loja física rouba abertamente jogadores dos times da CPU ao longo da OHL e os substitui no seu banco, concretizando a mecânica "Ultimate Team".
- **Economia Integrada**: As partidas agora têm peso no bolso. Vitorias garantem entre ~60-75 moedas (Multplicador 1.75x). Derrotas em OT pagam consoláveis 1.5x, e derrotas regulamentares pagam um Base de ~30 a 45 moedas.

### Iteração Alpha 0.1.13 (Phase 4: Overtime & Shootout UI)
- **Roster Dinâmico (Tabs)**: Adição de Abas visuais (5v5 LINES e 3v3 OVERTIME) na tela de gerenciamento de equipe. O estado de arrastar e soltar (Drag and Drop) foi aprimorado para salvar a escalação de jogadores de forma isolada na propriedade `ot_location`, permitindo que titulares do 5v5 também atuem no gelo estendido sem duplicação de dados.
- **Validação Anti-Softlock (OT)**: O sistema agora impede que os usuários iniciem uma simulação de partida (Play Match) caso não existam exatamente 20 jogadores no gelo 5v5 e 9 jogadores escalados nas linhas 3v3.
- **Transição Engine para OT**: O motor de simulação (`generateMatchTimeline`) identifica perfeitamente o fim do terceiro período. Se houver empate, a partida é empurrada para um "4th Period" onde apenas a escalação isolada de Overtime (3v3) entra no rinque virtual, calculando modificadores específicos.
- **Motor de Shootout Pós-Súbito**: Desenvolvida a matemática para o Evento de Pênaltis. Se os 5 minutos de Overtime não tiverem gols, o sistema intercala 3 rounds fixos de "Atirador (Foward) vs Goleiro", rolando seus OVR base com forte dose de variação e, se necessário, aplica regras de morte súbita, gerando eventos no log e bonificando a equipe vencedora com o placar final.
- **Sinalizadores de Match Dinâmicos**: Injeção da UI interativa na Arena. Se ocorrer um evento físico (`Penalty`), um farol em Laranja exibe ao vivo o déficit de jogadores (`5 PP 4`). Da mesma forma, caso um time entre em modo desespero retirando o goleiro da arena, um indicador chamativo da cor primária do time brilha informando a condição gráfica de "EMPTY NET".
