import re

# Playoffs.js
with open('js/playoffs.js', 'r') as f:
    playoffs_content = f.read()

playoffs_content = playoffs_content.replace("import { ohlTeams, whlTeams } from '../data/teams.js';", "import { ohlTeams, whlTeams, qmjhlTeams } from '../data/teams.js';")
playoffs_content = playoffs_content.replace("const activeTeams = gameState.league === 'whl' ? whlTeams : ohlTeams;", "const activeTeams = gameState.league === 'whl' ? whlTeams : (gameState.league === 'qmjhl' ? qmjhlTeams : ohlTeams);")

with open('js/playoffs.js', 'w') as f:
    f.write(playoffs_content)

# engine/simulation.js
with open('js/engine/simulation.js', 'r') as f:
    sim_content = f.read()

sim_content = sim_content.replace("import { ohlTeams, whlTeams } from '../../data/teams.js';", "import { ohlTeams, whlTeams, qmjhlTeams } from '../../data/teams.js';")
sim_content = sim_content.replace("return (gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;", "if (!gameState) return ohlTeams;\n    if (gameState.league === 'whl') return whlTeams;\n    if (gameState.league === 'qmjhl') return qmjhlTeams;\n    return ohlTeams;")

with open('js/engine/simulation.js', 'w') as f:
    f.write(sim_content)

# ui/dashboardUI.js
with open('js/ui/dashboardUI.js', 'r') as f:
    dash_content = f.read()

dash_content = dash_content.replace("import { ohlTeams, whlTeams } from '../../data/teams.js';", "import { ohlTeams, whlTeams, qmjhlTeams } from '../../data/teams.js';")
dash_content = dash_content.replace("function getActiveTeams() { return (localGameState && localGameState.league === 'whl') ? whlTeams : ohlTeams; }", "function getActiveTeams() { if (!localGameState) return ohlTeams; if (localGameState.league === 'whl') return whlTeams; if (localGameState.league === 'qmjhl') return qmjhlTeams; return ohlTeams; }")

with open('js/ui/dashboardUI.js', 'w') as f:
    f.write(dash_content)

print("Patched playoffs, simulation, and dashboard UI")
