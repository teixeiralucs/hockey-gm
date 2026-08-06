import re

cores = {}
with open('cores.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or ':' not in line:
            continue
        key, vals = line.split(':', 1)
        key = key.strip().lower()
        colors = [c.strip() for c in vals.split() if c.strip().startswith('#')]
        if len(colors) >= 2:
            cores[key] = (colors[0], colors[1])

# For teams in data/teams.js
with open('data/teams.js', 'r') as f:
    teams_js = f.read()

# Update qmjhlTeams
# Need to match each team by its id
for key, (primary, secondary) in cores.items():
    if key in ('ohl', 'whl', 'qmjhl'):
        continue
    
    # Simple heuristic to find id from name
    # e.g., 'baie-comeau drakkar' -> 'baie-comeau'
    # 'blainville-boisbriand armada' -> 'blainville-boisbriand'
    
    # We can use regex to find { id: '...', name: '...', ..., colors: { primary: '...', secondary: '...' } }
    # Let's find the matching name pattern
    
    # For Saint John, user typed 'saint jogn sea dogs'
    search_key = key.replace('sanguenéens', 'saguenéens').replace('jogn', 'john').replace('sherbooke', 'sherbrooke')
    
    def repl_func(m):
        # m.group(1) is everything before colors:
        # m.group(2) is the end
        return f"{m.group(1)}colors: {{ primary: '{primary}', secondary: '{secondary}' }}{m.group(2)}"
    
    # We just look for name that contains the team name (case insensitive)
    # Actually, teams.js has names like 'Baie-Comeau Drakkar'
    
    pattern = re.compile(rf"({{.*?name:\s*'[^']*?(?:{search_key.split()[0]})[^']*'.*?)colors:\s*{{[^}}]+}}(.*?)", re.IGNORECASE | re.DOTALL)
    
    # Replace in teams_js
    new_teams_js, count = pattern.subn(repl_func, teams_js)
    if count > 0:
        teams_js = new_teams_js
    else:
        print(f"Could not find team matching: {search_key}")

with open('data/teams.js', 'w') as f:
    f.write(teams_js)

# Update setupUI.js for QMJHL league card and background
with open('js/ui/setupUI.js', 'r') as f:
    setup_js = f.read()

qmjhl_primary, qmjhl_secondary = cores.get('qmjhl', ('#0062b0', '#010101'))

# Update card colors
setup_js = re.sub(
    r'id="league-qmjhl" style="--card-color-light:\s*#[0-9a-fA-F]+;\s*--card-color-dark:\s*#[0-9a-fA-F]+;',
    f'id="league-qmjhl" style="--card-color-light: {qmjhl_secondary}; --card-color-dark: {qmjhl_primary};',
    setup_js
)

# Update bg gradient for qmjhl
# } else if (league === 'qmjhl') {
#        bgGradient = 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(0, 0, 0, 0.25) 100%)';
#    }

def hex_to_rgba(h, a):
    h = h.lstrip('#')
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, {a})"

rgba_primary = hex_to_rgba(qmjhl_primary, 0.15)
rgba_secondary = hex_to_rgba(qmjhl_secondary, 0.25)

setup_js = re.sub(
    r"else if \(league === 'qmjhl'\) {\s*bgGradient = 'linear-gradient\(135deg, rgba\([^)]+\) 0%, rgba\([^)]+\) 100%\)';\s*}",
    f"else if (league === 'qmjhl') {{\n        bgGradient = 'linear-gradient(135deg, {rgba_primary} 0%, {rgba_secondary} 100%)';\n    }}",
    setup_js
)

with open('js/ui/setupUI.js', 'w') as f:
    f.write(setup_js)

print("Updated colors successfully")
