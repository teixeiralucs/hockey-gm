import sys
import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# Fix player.photo in getTradingCardHTML
old_photo = "const photoUrl = player.id && player.id.includes('_') ? `https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg` : 'assets/default-player.svg';"
new_photo = "const photoUrl = player.photo || 'assets/default-player.svg';"
content = content.replace(old_photo, new_photo)

# Fix openPlayerCardModal (line 699 approx)
old_teamInfoModal = "const teamInfoModal = player.originalTeamId ? ohlTeams.find(t => t.id === player.originalTeamId) : null;"
new_teamInfoModal = "const activeTeamsForModal = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;\n    const teamInfoModal = player.originalTeamId ? activeTeamsForModal.find(t => t.id === player.originalTeamId) : null;"
content = content.replace(old_teamInfoModal, new_teamInfoModal)

# Fix pre-match simulation logic oppTeamInfo (line 1220 approx)
old_oppTeamInfo = "const oppTeamInfo = ohlTeams.find(t => t.id === opponentId);"
new_oppTeamInfo = "const activeLeagueTeams = (gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;\n    const oppTeamInfo = activeLeagueTeams.find(t => t.id === opponentId);"
content = content.replace(old_oppTeamInfo, new_oppTeamInfo)

# Fix rendering playoff UI / standing logs (line 2456 approx)
old_render_teamInfo = "const teamInfo = ohlTeams.find(t => t.id === s.teamId);"
new_render_teamInfo = "const activeLeagueTeams = (typeof localGameState !== 'undefined' && localGameState && localGameState.league === 'whl' || typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;\n            const teamInfo = activeLeagueTeams.find(t => t.id === s.teamId);"
content = content.replace(old_render_teamInfo, new_render_teamInfo)

# Fix timeline event player team (line 3471 approx)
old_timeline_teamInfo = "const teamInfo = p.originalTeamId ? ohlTeams.find(t => t.id === p.originalTeamId) : null;"
new_timeline_teamInfo = "const activeLeagueTeams = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;\n        const teamInfo = p.originalTeamId ? activeLeagueTeams.find(t => t.id === p.originalTeamId) : null;"
content = content.replace(old_timeline_teamInfo, new_timeline_teamInfo)

with open(path, 'w') as f:
    f.write(content)

print("main.js fully patched!")
