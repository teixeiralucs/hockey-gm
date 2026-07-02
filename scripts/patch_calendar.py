import sys
import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: end of season reset schedule generation (line 2910)
# old: gameState.schedule = generateSeasonSchedule(ohlTeams, newDate);
# new: const currentLeagueTeams = gameState.league === 'whl' ? whlTeams : ohlTeams;
#      gameState.schedule = generateSeasonSchedule(currentLeagueTeams, newDate);
pattern1 = r"gameState\.schedule = generateSeasonSchedule\(ohlTeams, newDate\);"
replacement1 = """const currentLeagueTeams = gameState.league === 'whl' ? whlTeams : ohlTeams;
    gameState.schedule = generateSeasonSchedule(currentLeagueTeams, newDate);"""
content = re.sub(pattern1, replacement1, content)


# Fix 2: Calendar UI teams lookup and league folders (lines 2312-2350 approx)
# We can replace the specific block inside selectedDayObj.matches.forEach(match => {
# old:
#            const homeTeam = ohlTeams.find(t => t.id === match.homeId);
#            const awayTeam = ohlTeams.find(t => t.id === match.awayId);
#            const homeLogo = homeTeam.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
#            const awayLogo = awayTeam.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
pattern2 = r"const homeTeam = ohlTeams\.find\(t => t\.id === match\.homeId\);\s*const awayTeam = ohlTeams\.find\(t => t\.id === match\.awayId\);"
replacement2 = """const activeLeagueTeams = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;
            const leagueFolder = (typeof gameState !== 'undefined' && gameState && gameState.league === 'whl') ? 'whl' : 'ohl';
            const homeTeam = activeLeagueTeams.find(t => t.id === match.homeId);
            const awayTeam = activeLeagueTeams.find(t => t.id === match.awayId);"""
content = re.sub(pattern2, replacement2, content)

# Fix 3: Calendar UI hardcoded /ohl/
# old: <img src="assets/logos/ohl/${homeLogo}.png"
# new: <img src="assets/logos/${leagueFolder}/${homeLogo}.png"
# Notice there are two img tags (home and away)
pattern3 = r"src=\"assets/logos/ohl/\$\{(homeLogo|awayLogo)\}\.png\""
replacement3 = r'src="assets/logos/${leagueFolder}/${\1}.png"'
content = re.sub(pattern3, replacement3, content)

with open(path, 'w') as f:
    f.write(content)

print("main.js calendar patched!")
