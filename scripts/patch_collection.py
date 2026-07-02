import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# 1. Fix Left Column (Team list)
pattern_left = re.compile(r"// Set default team if none selected.*?html \+= `\n                    </div>", re.DOTALL)

replacement_left = """// Set default team if none selected
    const allTeams = [...ohlTeams, ...whlTeams];
    
    if (!window.currentCollectionTeamId) {
        window.currentCollectionTeamId = allTeams[0].id;
    }

    allTeams.forEach(team => {
        const isWhl = whlTeams.some(t => t.id === team.id);
        const loopLeagueFolder = isWhl ? 'whl' : 'ohl';
        const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\\s+/g, '-');
        const isSelected = window.currentCollectionTeamId === team.id;
        
        const isCompleted = (gameState.completedCollections || []).includes(team.id);
        const borderStyle = isSelected ? `2px solid ${team.colors.primary}` : '2px solid rgba(255,255,255,0.05)';
        const bgStyle = isSelected ? `rgba(255,255,255,0.1)` : 'rgba(0,0,0,0.2)';
        const opacityStyle = isSelected ? '1' : '0.6';
        
        html += `
                        <div onclick="window.currentCollectionTeamId='${team.id}'; renderCollectionPage(document.getElementById('main-content'))" 
                             style="position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; border: ${borderStyle}; background: ${bgStyle}; opacity: ${opacityStyle};"
                             onmouseover="this.style.opacity='1'" onmouseout="if(window.currentCollectionTeamId!=='${team.id}') this.style.opacity='0.6'">
                            <img src="assets/logos/${loopLeagueFolder}/${logoFile}.png" alt="${team.name}" style="width: 70%; height: 70%; object-fit: contain;">
                            ${isCompleted ? `<div style="position: absolute; top: -5px; right: -5px; background: #fbbf24; color: #000; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>` : ''}
                        </div>
        `;
    });
    html += `
                    </div>"""

content = re.sub(pattern_left, replacement_left, content)


# 2. Fix Right Column logic
pattern_right = re.compile(r"const selectedTeam = \(\(typeof gameState !== 'undefined' && gameState && gameState\.league === 'whl'\) \? whlTeams : ohlTeams\)\.find\(t => t\.id === window\.currentCollectionTeamId\);")
replacement_right = """const allTeamsForRight = [...ohlTeams, ...whlTeams];
    const selectedTeam = allTeamsForRight.find(t => t.id === window.currentCollectionTeamId);
    const isSelectedWhl = whlTeams.some(t => t.id === selectedTeam.id);
    const selectedLeagueFolder = isSelectedWhl ? 'whl' : 'ohl';"""
content = re.sub(pattern_right, replacement_right, content)


# 3. Fix the player photo hardcoded logic
pattern_photo = re.compile(r"let logoUrl = 'assets/default-player\.svg';\s*if \(player\.id && player\.id\.includes\('_'\)\) \{\s*logoUrl = `https://assets\.leaguestat\.com/ohl/240x240/\$\{player\.id\.split\('_'\)\[1\]\}\.jpg`;\s*\}")
replacement_photo = "let logoUrl = player.photo || 'assets/default-player.svg';"
content = re.sub(pattern_photo, replacement_photo, content)


# 4. Fix the selected team logo hardcoded leagueFolder in Album Header
pattern_header_logo = re.compile(r"<img src=\"assets/logos/\$\{\(typeof gameState !== 'undefined' && gameState && gameState\.league === 'whl'\) \? 'whl' : 'ohl'\}/\$\{selectedTeam\.name\.toLowerCase\(\)\.replace\(\/\['\]\/g, ''\)\.replace\(\/\\\\s\+\/g, '-'\)\}\.png\"")
replacement_header_logo = "<img src=\"assets/logos/${selectedLeagueFolder}/${selectedTeam.name.toLowerCase().replace(/[']/g, '').replace(/\\s+/g, '-')}.png\""
content = re.sub(pattern_header_logo, replacement_header_logo, content)


with open(path, 'w') as f:
    f.write(content)

print("main.js collection fully patched!")
