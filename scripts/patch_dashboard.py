import sys

path = 'js/ui/dashboardUI.js'
with open(path, 'r') as f:
    content = f.read()

# 1. Add whlTeams and helper functions
old_import = "import { ohlTeams } from '../../data/teams.js';"
new_import = """import { ohlTeams, whlTeams } from '../../data/teams.js';
function getActiveTeams() { return (localGameState && localGameState.league === 'whl') ? whlTeams : ohlTeams; }
function getLeagueFolder() { return (localGameState && localGameState.league === 'whl') ? 'whl' : 'ohl'; }"""

content = content.replace(old_import, new_import)

# 2. Replace ohlTeams.find with getActiveTeams().find
content = content.replace("ohlTeams.find", "getActiveTeams().find")
content = content.replace("ohlTeams.filter", "getActiveTeams().filter")

# 3. Replace assets/logos/ohl/ with assets/logos/${getLeagueFolder()}/
content = content.replace("assets/logos/ohl/", "assets/logos/${getLeagueFolder()}/")

with open(path, 'w') as f:
    f.write(content)

print("dashboardUI.js patched successfully!")
