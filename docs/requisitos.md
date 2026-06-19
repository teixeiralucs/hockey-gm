# Requisitos de Software: Hockey GM Alpha 0.1

## Requisitos Funcionais (RF)

- **RF01 - Seleção de Franquia:** ✅ O sistema deve permitir que o usuário inicie um save escolhendo um dos 20 times iniciais da OHL.
- **RF02 - Tela Inicial (Dashboard):** ✅ O sistema deve fornecer um hub central exibindo o time escolhido pelo jogador, com resumo da temporada e navegação para as demais áreas do jogo (Roster, Standings, etc).
- **RF03 - Estrutura do Roster:** ✅ O sistema deve gerenciar um roster ativo contendo exatamente 20 jogadores exigidos (12 Forwards, 6 Defensemen e 2 Goalies), distribuídos em hierarquia de linhas (1ª a 4ª).
- **RF04 - Validação de Salvamento:** ✅ O sistema de Roster deve impedir o salvamento da escalação e o avanço para a simulação caso existam espaços vazios na formação.
- **RF05 - Criação de Card dos Jogadores:** ✅ O sistema deve gerar cartas visuais para cada jogador contendo sua Foto oficial, Nome, Idade, Posição, Número da camisa e Local de Nascimento, adotando um visual premium e moderno.
- **RF06 - Cálculo de Overall Base:** ✅ O sistema deve calcular o Overall inicial de cada jogador com base em suas estatísticas ou de forma programática antes da aplicação de modificadores dinâmicos.
- **RF07 - Tabelas de Classificação (Standings):** ✅ O sistema deve exibir e atualizar a tabela de classificação das conferências a cada rodada da temporada regular, bem como exibir as chaves de mata-mata (brackets) durante os Playoffs.
- **RF08 - Drag and Drop (Benching):** ✅ O sistema deve fornecer 4 interações de arraste: alocar titular, manter no banco, vender ou arquivar na coleção.
- **RF09 - Cálculo de Modificadores (Buffs/Debuffs):** ✅ O motor lógico deve recalcular os atributos dos jogadores em tempo real com base em alocação de linha (x1.25 certa / x0.75 errada), time real (x1.75) e química de linha (x1.15).
- **RF10 - Cálculo Financeiro (Shop/Venda):** ✅ O sistema deve realizar cobrança de 200 moedas na compra de pacotes do Tier D e calcular o valor de liquidação (venda) pela fórmula: `Valor Base * (Overall / 100)`.
- **RF11 - Motor de Simulação Sequencial:** ✅ O sistema deve processar rodadas inteiras simulando partidas de todos os times em 3 períodos de 20 minutos.
- **RF12 - Probabilidade de Eventos:** ✅ O sistema deve basear a chance de ocorrência de eventos (Faceoffs, Hits, Shots, Penalties) em uma Força de Franquia calculada por: `(Média de Atributos / 500) * 125`.
- **RF13 - Condições de Overtime (OT):** ✅ O sistema deve aplicar regras distintas de prorrogação baseadas na fase do campeonato: OT de 5 minutos (3v3) seguido de shootout para Temporada Regular, e OT contínuo sem shootout para Playoffs.
- **RF14 - Gerenciamento de Idades:** O banco de dados deve registrar a idade base dos jogadores no draft e incrementá-la anualmente (Season End).
- **RF15 - Aposentadoria Automática:** O sistema deve varrer o Roster ao final da temporada e transferir jogadores maiores ou iguais a 22 anos diretamente para o banco de Coleção, disparando notificações na UI.
- **RF16 - Estrutura de Temporada e Playoffs:** O sistema deve gerar um calendário de 68 rodadas e avançar os 8 melhores da conferência para chaves de mata-mata em melhor de 7.
- **RF17 - Hall of Fame e Loop:** O sistema deve gravar o ID dos campeões e líderes estatísticos em um log persistente ao final dos Playoffs e ativar a opção de reinício do calendário.
- **RF18 - Múltiplos Saves:** O sistema deve permitir que o jogador mantenha até 3 jogos salvos simultaneamente (slots de save), garantindo o armazenamento isolado em pastas separadas contendo as informações próprias de cada progresso.

## Requisitos Não Funcionais (RNF)

- **RNF01 - Usabilidade Front-End:** As zonas de Drop (Linhas, Venda, Cofre) devem possuir feedback visual imediato e animações de encaixe ao receber as interações de _dragging_.
- **RNF02 - Persistência do Estado:** O ciclo de vida do jogo (estado do elenco, moedas e coleção) deve ser gravado de forma segura em um banco de dados relacional para não perder progresso na virada de rodadas.
- **RNF03 - Desempenho da Engine Matemática:** O processamento da simulação de todos os eventos probabilísticos e estatísticas dos times da OHL não deve resultar em travamento da interface.
- **RNF04 - Seed de Dados (Fonte da Verdade):** As matrizes de atributos iniciais, nomes, times de origem e bônus dos jogadores reais da OHL devem ser isoladas e imutáveis, funcionando como molde estático para o gatilho de draft de pacotes.
