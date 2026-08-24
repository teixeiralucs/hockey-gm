# Diretrizes de Projeto: Hockey GM

Estas são as regras fundamentais que o agente (eu) deve seguir ao desenvolver o projeto Hockey GM.

## 1. Stack Tecnológico
- **Framework**: Vite + React + TypeScript.
- **Gerenciamento de Estado**: Zustand (estado global para a liga, simulação, finanças e times).
- **Estilização**: Vanilla CSS (com variáveis CSS globais para tema).

## 2. Design System & UI/UX (Inspiração "Anti-slop")
- **Tipografia**: 
  - **Display/Títulos**: Fonte `Blockletter` para dar o tom esportivo/hóquei.
  - **Corpo/Dados**: Fonte moderna sem serifa (ex: `Inter`, `Outfit` ou `Geist`) para alta legibilidade de estatísticas.
  - *Nunca usar a mesma fonte para display e texto corrido.*
- **Estética Visual**:
  - **Dark Mode Padrão**: Fundo muito escuro com toques de `Glassmorphism` (fundo translúcido com `backdrop-filter: blur()`).
  - **Sem "Gradients Genéricos"**: Evitar fundos roxos/rosas. O design deve parecer uma UI profissional, com uma cor de destaque sólida (neon ice blue ou vermelho).
- **Layout (Inspirado em Hallmark/Modern SaaS)**:
  - **Assimetria**: Evitar centralizar tudo. Criar layouts intencionalmente assimétricos (ex: imagem à direita, texto enviesado à esquerda).
  - Espaçamentos em múltiplos de 4 (ex: 8px, 16px, 24px).
  - Micro-animações sutis de hover e cursores customizados para dar vida à UI.

## 3. Arquitetura (Feature-Based)
O código deve ser estritamente modular:
- `src/features/`: Cada funcionalidade (ex: `roster`, `simulation`, `standings`) deve ter sua própria pasta contendo componentes, estado e lógica.
- **Isolamento de Lógica**: As regras complexas de simulação (faceoffs, penalties, power plays descritos nos `docs/`) NÃO devem ficar misturadas nos componentes visuais. Use classes ou funções puras em `src/engine/` ou `src/features/simulation/logic.ts`.
