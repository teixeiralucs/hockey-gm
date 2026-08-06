import re

with open('js/main.js', 'r') as f:
    content = f.text if hasattr(f, 'text') else f.read()

# Replace the ternary condition with a function call
content = content.replace("((typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams)", "getActiveLeagueTeams()")
content = content.replace("(typeof localGameState !== 'undefined' && localGameState && localGameState.league === 'whl' || typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams", "getActiveLeagueTeams(typeof localGameState !== 'undefined' ? localGameState : null)")
content = content.replace("(gameState && gameState.league === 'whl') ? whlTeams : ohlTeams", "getActiveLeagueTeams()")

# Also some hardcoded whlTeams checks for originalTeamId
content = content.replace("whlTeams.find(t => t.id === player.originalTeamId)", "(ohlTeams.find(t => t.id === player.originalTeamId) || whlTeams.find(t => t.id === player.originalTeamId) || qmjhlTeams.find(t => t.id === player.originalTeamId))")
content = content.replace("whlTeams.find(t => t.id === p.originalTeamId)", "(ohlTeams.find(t => t.id === p.originalTeamId) || whlTeams.find(t => t.id === p.originalTeamId) || qmjhlTeams.find(t => t.id === p.originalTeamId))")

# Add the getActiveLeagueTeams function at the top after imports
if "function getActiveLeagueTeams" not in content:
    content = content.replace("let gameState = null;", "let gameState = null;\n\nwindow.getActiveLeagueTeams = function(stateObj = gameState) {\n    if (!stateObj) return ohlTeams;\n    if (stateObj.league === 'whl') return whlTeams;\n    if (stateObj.league === 'qmjhl') return qmjhlTeams;\n    return ohlTeams;\n};\n")

# For line 3379: const allTeamsForRight = [...ohlTeams, ...whlTeams];
content = content.replace("const allTeamsForRight = [...ohlTeams, ...whlTeams];", "const allTeamsForRight = [...ohlTeams, ...whlTeams, ...qmjhlTeams];")

# For line 3425: 'whl' : 'ohl'
content = content.replace("whlTeams.some(t => t.id === selectedTeam.id) ? 'whl' : 'ohl'", "qmjhlTeams.some(t => t.id === selectedTeam.id) ? 'qmjhl' : (whlTeams.some(t => t.id === selectedTeam.id) ? 'whl' : 'ohl')")

# For line 3290: { id: 'whl', name: 'WHL', logo: 'assets/whl-logo.svg', color: '#e2373f', teams: whlTeams }
if "id: 'qmjhl'" not in content:
    content = content.replace("{ id: 'whl', name: 'WHL', logo: 'assets/whl-logo.svg', color: '#e2373f', teams: whlTeams }", "{ id: 'whl', name: 'WHL', logo: 'assets/whl-logo.svg', color: '#e2373f', teams: whlTeams },\n        { id: 'qmjhl', name: 'QMJHL', logo: 'assets/qmjhl-logo.svg', color: '#f87171', teams: qmjhlTeams }")

with open('js/main.js', 'w') as f:
    f.write(content)

print("Patched main.js")
