import re
import os

helper = """
function getTeamNameParts(fullName) {
    if (!fullName) return { city: '', mascot: '' };
    const twoWordMascots = ['Sea Dogs', 'Wheat Kings', 'Oil Kings', 'Ice Dogs', 'IceDogs', '67\\'s', 'Frontenacs', 'Greyhounds', 'Steelheads', 'Firebirds', 'Battalion', 'Winterhawks', 'Silvertips', 'Americans', 'Thunderbirds', 'Cataractes', 'Saguenéens', 'Olympiques', 'Voltigeurs', 'Foreurs', 'Huskies', 'Océanic', 'Remparts', 'Drakkar', 'Tigres', 'Eagles', 'Wildcats', 'Mooseheads', 'Islanders', 'Regiment', 'Armada', 'Titan', 'Colts', 'Petes', 'Rangers', 'Spitfires', 'Knights', 'Storm', 'Spirit', 'Sting', 'Otters', 'Attack', 'Raiders', 'Tigers', 'Hitmen', 'Blades', 'Pats', 'Rebels', 'Warriors', 'Broncos', 'Hurricanes', 'Vees', 'Cougars', 'Rockets', 'Blazers', 'Chiefs', 'Royals', 'Wild', 'Giants'];
    for (let m of twoWordMascots) {
        if (fullName.endsWith(m)) {
            return { city: fullName.substring(0, fullName.length - m.length).trim(), mascot: m };
        }
    }
    const parts = fullName.split(' ');
    const mascot = parts.pop();
    const city = parts.join(' ');
    return { city, mascot };
}
"""

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # If it's a UI JS file, inject helper at top if not present
    if "getTeamNameParts(" not in content:
        content = helper + content

    # Patch instances like: team.name.split(' ').pop() -> getTeamNameParts(team.name).mascot
    content = re.sub(r'([a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?name)\.split\(\' \'\)\.pop\(\)', r'getTeamNameParts(\1).mascot', content)
    
    # Patch slice(-1).join(' ') -> mascot
    content = re.sub(r'([a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?name)\.split\(\' \'\)\.slice\(-1\)\.join\(\' \'\)', r'getTeamNameParts(\1).mascot', content)
    # Patch slice(0, -1).join(' ') -> city
    content = re.sub(r'([a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?name)\.split\(\' \'\)\.slice\(0, -1\)\.join\(\' \'\)', r'getTeamNameParts(\1).city', content)

    # In setupUI.js
    if 'const parts = team.name.split(\' \');' in content:
        content = content.replace(
            "const parts = team.name.split(' ');\n        const mascot = parts.pop();\n        const city = parts.join(' ');",
            "const { city, mascot } = getTeamNameParts(team.name);"
        )
        
    with open(filepath, 'w') as f:
        f.write(content)

patch_file('js/main.js')
patch_file('js/ui/dashboardUI.js')
patch_file('js/ui/setupUI.js')
print("Patched all JS files with getTeamNameParts")
