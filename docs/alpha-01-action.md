# Hockey GM 0.1 Alpha - Ações de Implementação

Este documento rastreia as implementações reais feitas para a versão Alpha 0.1, explicando *o que* foi construído e *como* foi estruturado tecnicamente.

## 1. Estrutura e Fundamentos do Projeto

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

## 2. Features Implementadas

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
