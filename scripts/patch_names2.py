import os

def patch(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
        
    replacements = [
        ("t1.name.split(' ').pop()", "getTeamNameParts(t1.name).mascot"),
        ("t2.name.split(' ').pop()", "getTeamNameParts(t2.name).mascot"),
        ("away.name.split(' ').pop()", "getTeamNameParts(away.name).mascot"),
        ("home.name.split(' ').pop()", "getTeamNameParts(home.name).mascot"),
        ("awayTeam.name.split(' ').slice(-1).join(' ')", "getTeamNameParts(awayTeam.name).mascot"),
        ("homeTeam.name.split(' ').slice(-1).join(' ')", "getTeamNameParts(homeTeam.name).mascot"),
        ("awayTeam.name.split(' ').slice(0, -1).join(' ')", "getTeamNameParts(awayTeam.name).city"),
        ("homeTeam.name.split(' ').slice(0, -1).join(' ')", "getTeamNameParts(homeTeam.name).city"),
        ("homeTeam.name.split(' ').slice(-1)", "getTeamNameParts(homeTeam.name).mascot"),
        ("awayTeam.name.split(' ').slice(-1)", "getTeamNameParts(awayTeam.name).mascot"),
        ("teamInfo.name.split(' ').slice(0, -1).join(' ')", "getTeamNameParts(teamInfo.name).city"),
        ("teamInfo.name.split(' ').slice(-1).join(' ')", "getTeamNameParts(teamInfo.name).mascot")
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

patch('js/main.js')
patch('js/ui/dashboardUI.js')
print("Patched explicitly.")
