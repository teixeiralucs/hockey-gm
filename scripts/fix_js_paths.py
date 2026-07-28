import re
import os

# 1. Fix getLeagueFolder in dashboardUI.js
with open('js/ui/dashboardUI.js', 'r') as f:
    content = f.read()
    
# function getLeagueFolder() { return (localGameState && localGameState.league === 'whl') ? 'whl' : 'ohl'; }
content = content.replace(
    "function getLeagueFolder() { return (localGameState && localGameState.league === 'whl') ? 'whl' : 'ohl'; }",
    "function getLeagueFolder() { if (!localGameState) return 'ohl'; if (localGameState.league === 'whl') return 'whl'; if (localGameState.league === 'qmjhl') return 'qmjhl'; return 'ohl'; }"
)
with open('js/ui/dashboardUI.js', 'w') as f:
    f.write(content)

# 2. Fix inline ternaries in main.js
with open('js/main.js', 'r') as f:
    main_js = f.read()

# Replace: (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? 'whl' : 'ohl'
main_js = main_js.replace(
    "(typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? 'whl' : 'ohl'",
    "(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')"
)
# There's also ${leagueFolder} which is computed earlier in main.js
# Let's find where leagueFolder is defined.
# let leagueFolder = gameState.league === 'whl' ? 'whl' : 'ohl';
main_js = main_js.replace(
    "const leagueFolder = gameState.league === 'whl' ? 'whl' : 'ohl';",
    "const leagueFolder = gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl');"
)
main_js = main_js.replace(
    "let leagueFolder = gameState.league === 'whl' ? 'whl' : 'ohl';",
    "let leagueFolder = gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl');"
)
main_js = main_js.replace(
    "const loopLeagueFolder = loopGameState.league === 'whl' ? 'whl' : 'ohl';",
    "const loopLeagueFolder = loopGameState.league === 'whl' ? 'whl' : (loopGameState.league === 'qmjhl' ? 'qmjhl' : 'ohl');"
)
with open('js/main.js', 'w') as f:
    f.write(main_js)
    
print("Fixed JS paths!")
