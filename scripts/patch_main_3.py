import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# Fix getPlayerCardHTML
pattern1 = re.compile(r"const activeTeams =[^\n]*\n\s*const leagueFolder =[^\n]*\n\s*const teamInfo = player\.originalTeamId \? activeTeams\.find\(t => t\.id === player\.originalTeamId\) : null;")
replacement1 = """let teamInfo = null;
    let leagueFolder = 'ohl';
    if (player.originalTeamId) {
        teamInfo = ohlTeams.find(t => t.id === player.originalTeamId);
        if (!teamInfo) {
            teamInfo = whlTeams.find(t => t.id === player.originalTeamId);
            leagueFolder = 'whl';
        }
    }"""
content = re.sub(pattern1, replacement1, content)

# Fix getTradingCardHTML
pattern2 = re.compile(r"const activeTeams =[^\n]*\n\s*const leagueFolder =[^\n]*\n\s*const teamInfo = player\.originalTeamId \? activeTeams\.find\(t => t\.id === player\.originalTeamId\) : null;")
content = re.sub(pattern2, replacement1, content)

# Fix getTradingCardHTML photoUrl
pattern3 = re.compile(r"const photoUrl = player\.id && player\.id\.includes[^;]*;")
replacement3 = "const photoUrl = player.photo || 'assets/default-player.svg';"
content = re.sub(pattern3, replacement3, content)

# Fix openPlayerCardModal
pattern4 = re.compile(r"const activeTeamsForModal = [^\n]*\n\s*const teamInfoModal = player\.originalTeamId \? activeTeamsForModal\.find\(t => t\.id === player\.originalTeamId\) : null;")
replacement4 = """let teamInfoModal = null;
    if (player.originalTeamId) {
        teamInfoModal = ohlTeams.find(t => t.id === player.originalTeamId);
        if (!teamInfoModal) teamInfoModal = whlTeams.find(t => t.id === player.originalTeamId);
    }"""
content = re.sub(pattern4, replacement4, content)

# Fix timeline event player team
pattern5 = re.compile(r"const activeLeagueTeams = [^\n]*\n\s*const teamInfo = p\.originalTeamId \? activeLeagueTeams\.find\(t => t\.id === p\.originalTeamId\) : null;")
replacement5 = """let teamInfo = null;
        if (p.originalTeamId) {
            teamInfo = ohlTeams.find(t => t.id === p.originalTeamId);
            if (!teamInfo) teamInfo = whlTeams.find(t => t.id === p.originalTeamId);
        }"""
content = re.sub(pattern5, replacement5, content)

with open(path, 'w') as f:
    f.write(content)

print("main.js fully patched with cross-league logo support!")
