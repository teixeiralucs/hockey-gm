# Hockey GM - Ações de Implementação

Este documento rastreia as implementações reais feitas, explicando _o que_ foi construído e _como_ foi estruturado tecnicamente, versionado por iterações.

## [Alpha 0.2.0] - Mercado Livre e Finanças

### 1. Free Agency (Mercado Livre)

- **O que é**: Um novo sistema de mercado integrado à Loja, permitindo a compra direta de jogadores rotativos com um catálogo renovado ao longo do tempo.
- **Integração Visual (Shop Tabs)**: O módulo da Loja (Hockey Shop) foi refatorado. O layout agora exibe abas alternáveis (`PACKS` e `FREE AGENCY`) estilizadas como *Pills* (design espelhado das abas do Roster), organizando melhor o espaço para as novas features sem poluir a interface.
- **Engine do Mercado (Proporção e Tiers)**: O mercado (`freeAgencyMarket`) gera sempre 6 jogadores em exibição lado a lado na tela. A injeção matemática força a ocorrência estrita de 3 jogadores Bronze, 2 jogadores Prata e 1 jogador Ouro vindos diretamente do `globalDraftPool`.
- **UI Premium de Cartas**: Abandonando caixas estáticas antigas, a interface injeta o método `getTradingCardHTML()` nativo do Modal de Inspeção, redimensionado inteligentemente (`zoom: 0.65`) para que as 6 cartas de colecionador gigantescas caibam fluidamente lado a lado num grid 6x1.

### 2. Sistema Financeiro do Mercado

- **Precificação por Tier**: Ao invés de checar métricas numéricas abstratas de OVR, o preço das cartas de Free Agency é puramente ditado por seu tier. Cartas de Bronze custam **300 🪙**, Prata custam **450 🪙** e Ouro cravam em **600 🪙**.
- **Validação de Saldo (Blocked State)**: Adicionada forte barreira lógica na compra de agentes livres. O sistema valida os `gameState.coins` do jogador. Se não houver saldo, o botão de compra correspondente daquele jogador entra em um estado inerte de erro:
  - Fica em preto e branco (`filter: grayscale(100%)`)
  - Apaga a opacidade (`opacity: 0.5`)
  - Impede o clique via CSS (`pointer-events: none;`).
- **Dedução Real**: A lógica `signFreeAgent` foi corrigida e agora executa ativamente o débito de moedas (`gameState.coins -= price`), invocando a atualização imediata da contagem do painel lateral.
- **Marcador Gráfico de 'SOLD'**: Uma vez comprado, o slot do jogador naquele ciclo não some nem quebra o layout 6x1. Ele continua renderizando o esqueleto do jogador com um filtro em escala de cinza de fundo e um carimbo vermelho e chanfrado de `SOLD` brilhando na frente com sombras projetadas, mantendo o estande da loja com estética realista.

### 3. Melhorias Visuais na Loja de Pacotes

- **Padronização da Moeda (Lucide Icons)**: Todos os botões da sessão de `PACKS` que utilizavam o caractere padrão em emoji de uma moeda (🪙) tiveram sua injeção convertida nativamente para `<i data-lucide="coins"></i>`, colorida com o pantone Dourado `#fbbf24`, combinando uniformemente o sistema de *icons* com a Sidebar e os relatórios financeiros pós-jogo.
