---
name: interface-web
description: Runbook e diretrizes para criar componentes de interface do usuário de alta qualidade no projeto Hockey GM.
---

# Skill: Desenvolvimento de Interface (UI)

Sempre que você for criar um novo componente visual para o Hockey GM, siga estas diretrizes:

1. **A Estrutura do CSS**:
   - Sempre utilize classes semânticas baseadas em BEM (Block Element Modifier) ou escopos claros.
   - Utilize as variáveis globais do `index.css` (ex: `var(--color-bg)`, `var(--color-accent)`).

2. **Tipografia de Hóquei**:
   - Utilize a classe utilitária da fonte `Blockletter` para títulos grandes, placares e nomes de times.
   - Para tabelas de estatísticas (Overall, Skating, Shooting), use a fonte base de sistema/sans-serif.

3. **Glassmorphism**:
   - Para painéis (ex: cards de jogadores), use a classe ou estilos de vidro:
     `background: rgba(255, 255, 255, 0.05);`
     `backdrop-filter: blur(10px);`
     `border: 1px solid rgba(255, 255, 255, 0.1);`

4. **Regras de Anti-Slop (Hallmark)**:
   - Quebre a simetria. Se fizer um card, tente alinhar textos à esquerda e um ícone ou nota (Overall) à direita.
   - Não centralize conteúdo de texto a menos que seja estritamente necessário.
   - Não use gradients no fundo de elementos principais. Use cores sólidas e fortes para o call-to-action (ex: Botão "Simular Jogo").
