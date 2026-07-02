import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# Helper macro for active teams
active_teams_str = "((typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams)"

# Replace specific lines where ohlTeams is still hardcoded

# Line 2033: currentTeam = ohlTeams.find(t => t.id === gameState.team.id);
content = content.replace("currentTeam = ohlTeams.find", f"currentTeam = {active_teams_str}.find")

# Line 2439: const info = ohlTeams.find(t => t.id === s.teamId);
content = content.replace("const info = ohlTeams.find(t => t.id === s.teamId);", f"const info = {active_teams_str}.find(t => t.id === s.teamId);")

# Line 2721: const t = ohlTeams.find(x => x.id === awards[awardKey]);
content = content.replace("const t = ohlTeams.find(x => x.id === awards[awardKey]);", f"const t = {active_teams_str}.find(x => x.id === awards[awardKey]);")

# Line 2886: gameState.standings = ohlTeams.map(team => ({
content = content.replace("gameState.standings = ohlTeams.map", f"gameState.standings = {active_teams_str}.map")

# Line 3062: window.currentCollectionTeamId = ohlTeams[0].id;
content = content.replace("window.currentCollectionTeamId = ohlTeams[0].id;", f"window.currentCollectionTeamId = {active_teams_str}[0].id;")

# Line 3065: ohlTeams.forEach(team => {
content = content.replace("ohlTeams.forEach(team => {", f"{active_teams_str}.forEach(team => {{")

# Line 3090: const selectedTeam = ohlTeams.find(t => t.id === window.currentCollectionTeamId);
content = content.replace("const selectedTeam = ohlTeams.find(t => t.id === window.currentCollectionTeamId);", f"const selectedTeam = {active_teams_str}.find(t => t.id === window.currentCollectionTeamId);")

# Line 3176: const team = ohlTeams.find(t => t.id === teamId);
content = content.replace("const team = ohlTeams.find(t => t.id === teamId);", f"const team = {active_teams_str}.find(t => t.id === teamId);")

# Line 3264: let champTeam = ohlTeams.find(t => t.id === p.champion);
content = content.replace("let champTeam = ohlTeams.find(t => t.id === p.champion);", f"let champTeam = {active_teams_str}.find(t => t.id === p.champion);")

# Line 3287: const t1 = ohlTeams.find(t => t.id === s.highSeedId) || { name: 'TBD', id: 'tbd' };
content = content.replace("const t1 = ohlTeams.find(t => t.id === s.highSeedId)", f"const t1 = {active_teams_str}.find(t => t.id === s.highSeedId)")

# Line 3288: const t2 = ohlTeams.find(t => t.id === s.lowSeedId) || { name: 'TBD', id: 'tbd' };
content = content.replace("const t2 = ohlTeams.find(t => t.id === s.lowSeedId)", f"const t2 = {active_teams_str}.find(t => t.id === s.lowSeedId)")

# Line 3381: let home = ohlTeams.find(t => t.id === m.homeId) || { name: 'TBD', id: 'tbd' };
content = content.replace("let home = ohlTeams.find(t => t.id === m.homeId)", f"let home = {active_teams_str}.find(t => t.id === m.homeId)")

# Line 3382: let away = ohlTeams.find(t => t.id === m.awayId) || { name: 'TBD', id: 'tbd' };
content = content.replace("let away = ohlTeams.find(t => t.id === m.awayId)", f"let away = {active_teams_str}.find(t => t.id === m.awayId)")

# Line 3426: const high = ohlTeams.find(t => t.id === series.highSeedId) || { name: 'TBD' };
content = content.replace("const high = ohlTeams.find(t => t.id === series.highSeedId)", f"const high = {active_teams_str}.find(t => t.id === series.highSeedId)")

# Line 3427: const low = ohlTeams.find(t => t.id === series.lowSeedId) || { name: 'TBD' };
content = content.replace("const low = ohlTeams.find(t => t.id === series.lowSeedId)", f"const low = {active_teams_str}.find(t => t.id === series.lowSeedId)")

# Line 3514: const t = ohlTeams.find(x => x.id === teamId);
content = content.replace("const t = ohlTeams.find(x => x.id === teamId);", f"const t = {active_teams_str}.find(x => x.id === teamId);")

with open(path, 'w') as f:
    f.write(content)

print("All remaining ohlTeams hardcoded references fixed!")
