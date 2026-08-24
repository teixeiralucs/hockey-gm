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

# Anti-Slop UI Rules

O objetivo desta skill é forçar o modelo a projetar interfaces que pareçam software tático e imersivo, e não uma landing page genérica ou um template padrão de dashboard.

## 1. Filosofia Central (Anti-Genérica)

- **NUNCA use o padrão "SaaS Genérico":** Estão terminantemente proibidos gradientes excessivos, cantos excessivamente arredondados (`rounded-3xl`), botões com brilho injustificado e layouts perfeitamente simétricos.
- **A Interface é o Jogo:** O ambiente de um General Manager é um "Centro de Comando". O design deve ser denso em dados, utilitário e transmitir peso. Inspire-se no design editorial e em displays técnicos.

## 2. Tipografia e Dados

- **Hierarquia Estrita (Dual-Font):**
  - Use uma fonte _Display_ forte, condensada e imponente para cabeçalhos (nomes dos jogadores, placares, divisões).
  - Use **OBRIGATORIAMENTE** uma fonte _Monospace_ (ex: JetBrains Mono, Fira Code ou similar) para TODAS as tabelas, atributos físicos, status de contrato, estatísticas da liga e Salary Cap.
- **Sem Fonte Única:** Utilizar uma única fonte (como Inter ou Roboto) para todo o layout é uma falha estrutural.
- **Alinhamento de Dados Numéricos:** Valores de atributos (OVR, POT, PTS) e salários devem estar sempre alinhados à direita para facilitar o escaneamento visual em listas.

## 3. Paleta e Layout

- **Assimetria Intencional:** Quebre a simetria sempre que possível. Painéis de detalhes de um atleta devem adotar divisões espaciais como 70/30 ou 60/40, evitando o comum 50/50.
- **Modo Escuro Tático:** O fundo base nunca é preto puro, mas tons de ardósia ou carvão profundos (ex: `bg-slate-950` ou `bg-zinc-950`).
- **Acentos Contidos (Cores Reais):** Use as cores do time de forma cirúrgica. Exemplo: vermelho tijolo e azul marinho profundo devem aparecer apenas como marcações de _status_, pequenos indicadores (ex: status de _Waiver_ ou lesão) ou linhas de limite super finas (1px). Nunca preencha botões enormes com a cor principal.

## 4. Micro-interações (Game Feel)

- **Cursores CSS (Tátil):** Adicione feedback direto com o mouse. Ao passar sobre a tabela de _Lineup_ para reorganizar jogadores, exiba um cursor magnético ou de manipulação (grab). Ao inspecionar os relatórios de olheiros (scouting), force cursores tipo _crosshair_ (mira).
- **Motion Restrito e Seco:** Animações devem ser rápidas, mecânicas e precisas. Use `ease-out` com durações curtas (ex: `duration-150`). Proibido usar efeitos de "bounce" ou animações elásticas lentas que atrasem o usuário.

## 5. Exemplo de Componente Esperado (Tailwind CSS)

Ao receber a instrução para criar um card de jogador na tela de gerenciamento de elenco (Roster), o agente deve gerar um código com a seguinte "vibe":

```tsx
<div className="flex border-b border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-800/80 transition-colors duration-150 relative cursor-crosshair group">
  {/* Faixa de acento assimétrica */}
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-700/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>

  {/* Identificação (Display) */}
  <div className="flex-1 pl-4 flex flex-col justify-center">
    <h3 className="text-xl font-display font-bold uppercase tracking-wide text-slate-100">
      Suzuki, N.
    </h3>
    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
      Center • 1st Line
    </span>
  </div>

  {/* Bloco de Dados (Monospace) */}
  <div className="flex space-x-8 text-right items-center pr-2">
    <div className="flex flex-col">
      <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
        Cap Hit
      </span>
      <span className="text-sm font-mono text-slate-300">$7.875M</span>
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
        OVR
      </span>
      <span className="text-xl font-mono text-white font-semibold shadow-sm">
        88
      </span>
    </div>
  </div>
</div>
```
