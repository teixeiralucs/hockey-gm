import sys

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# getPlayerCardHTML
old_team_lookup = "const teamInfo = player.originalTeamId ? ohlTeams.find(t => t.id === player.originalTeamId) : null;"
new_team_lookup = """const activeTeams = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;
    const leagueFolder = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? 'whl' : 'ohl';
    const teamInfo = player.originalTeamId ? activeTeams.find(t => t.id === player.originalTeamId) : null;"""

content = content.replace(old_team_lookup, new_team_lookup)

old_logo_html = '<img src="assets/logos/ohl/${logoFile}.png"'
new_logo_html = '<img src="assets/logos/${leagueFolder}/${logoFile}.png"'
content = content.replace(old_logo_html, new_logo_html)

old_bg_html = "background-image: url('assets/logos/ohl/${logoFile}.png');"
new_bg_html = "background-image: url('assets/logos/${leagueFolder}/${logoFile}.png');"
content = content.replace(old_bg_html, new_bg_html)

with open(path, 'w') as f:
    f.write(content)

print("main.js patched successfully!")
