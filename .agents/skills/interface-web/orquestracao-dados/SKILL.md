---
name: orquestracao-dados
description: Runbook para orquestrar o estado global da simulação usando Zustand no Hockey GM.
---

# Skill: Orquestração de Dados (Zustand)

Sempre que precisar gerenciar estados globais (como Ligas, Times, Simulação de Partida), aplique este padrão:

1. **Separação por Store**:
   - Não crie um único Store gigante. Divida-os, por exemplo: `useLeagueStore`, `useMatchStore`, `useRosterStore`.

2. **Integração com a UI**:
   - Nos componentes React, extraia apenas o estado necessário para evitar re-renderizações desnecessárias.
     *Exemplo correto*: `const players = useRosterStore(state => state.players)`
     *Exemplo incorreto*: `const { players } = useRosterStore()`

3. **Isolamento da Lógica**:
   - As stores do Zustand devem chamar funções puras da `engine/` do jogo. O código do Zustand é apenas o "cola" (glue code) entre o React e a Engine. Ele não deve ter 500 linhas de cálculo de probabilidade de Faceoff.

4. **Ações (Actions)**:
   - Todas as modificações de estado devem ser feitas por meio de actions claramente nomeadas dentro da store (ex: `addPlayerToLine`, `simulatePeriod`, `endGame`).
