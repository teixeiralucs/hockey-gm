import re

cores = {}
with open('cores.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or ':' not in line:
            continue
        key, vals = line.split(':', 1)
        key = key.strip().lower().replace('-', '').replace(' ', '')
        colors = [c.strip() for c in vals.split() if c.strip().startswith('#')]
        if len(colors) >= 2:
            cores[key] = (colors[0], colors[1])

def get_color_for_team(tid, tname):
    nid = tid.lower().replace('-', '').replace(' ', '')
    nname = tname.lower().replace('-', '').replace(' ', '').replace('é', 'e').replace('ó', 'o').replace('\'', '')
    
    if nid in cores: return cores[nid]
    if nname in cores: return cores[nname]
    
    for ckey, (cp, cs) in cores.items():
        ckey_no_accents = ckey.replace('é', 'e').replace('jogn', 'john').replace('sherbooke', 'sherbrooke')
        if ckey_no_accents in nname or ckey_no_accents in nid or nid in ckey_no_accents:
            return (cp, cs)
    return None

with open('data/teams.js', 'r') as f:
    teams_js = f.read()

# We will search line by line, if the line has an id: '...' and name: '...', we extract id and name and replace the colors block
new_lines = []
for line in teams_js.split('\n'):
    m = re.search(r"id:\s*'([^']+)'", line)
    n = re.search(r"name:\s*'([^']+)'", line)
    if m and n:
        tid = m.group(1)
        tname = n.group(1)
        colors = get_color_for_team(tid, tname)
        if colors:
            line = re.sub(r"colors:\s*\{[^}]+\}", f"colors: {{ primary: '{colors[0]}', secondary: '{colors[1]}' }}", line)
        else:
            print(f"No color found for {tname} ({tid})")
    new_lines.append(line)

# Add QMJHL teams at the bottom with colors
qmjhl_teams = [
    # West Conference
    { "id": "blainville-boisbriand", "name": "Blainville-Boisbriand Armada", "conf": "West", "div": "West" },
    { "id": "gatineau", "name": "Gatineau Olympiques", "conf": "West", "div": "West" },
    { "id": "rouyn-noranda", "name": "Rouyn-Noranda Huskies", "conf": "West", "div": "West" },
    { "id": "val-dor", "name": "Val-d'Or Foreurs", "conf": "West", "div": "West" },
    { "id": "drummondville", "name": "Drummondville Voltigeurs", "conf": "West", "div": "West" },
    { "id": "shawinigan", "name": "Shawinigan Cataractes", "conf": "West", "div": "West" },
    { "id": "sherbrooke", "name": "Sherbrooke Phoenix", "conf": "West", "div": "West" },
    { "id": "victoriaville", "name": "Victoriaville Tigres", "conf": "West", "div": "West" },
    
    # East Conference
    { "id": "baie-comeau", "name": "Baie-Comeau Drakkar", "conf": "East", "div": "East" },
    { "id": "chicoutimi", "name": "Chicoutimi Saguenéens", "conf": "East", "div": "East" },
    { "id": "quebec", "name": "Quebec Remparts", "conf": "East", "div": "East" },
    { "id": "rimouski", "name": "Rimouski Océanic", "conf": "East", "div": "East" },
    { "id": "acadie-bathurst", "name": "Acadie-Bathurst Titan", "conf": "East", "div": "East" },
    { "id": "cape-breton", "name": "Cape Breton Eagles", "conf": "East", "div": "East" },
    { "id": "charlottetown", "name": "Charlottetown Islanders", "conf": "East", "div": "East" },
    { "id": "halifax", "name": "Halifax Mooseheads", "conf": "East", "div": "East" },
    { "id": "moncton", "name": "Moncton Wildcats", "conf": "East", "div": "East" },
    { "id": "saint-john", "name": "Saint John Sea Dogs", "conf": "East", "div": "East" }
]

qmjhl_str = "\nexport const qmjhlTeams = [\n"
for t in qmjhl_teams:
    c = get_color_for_team(t["id"], t["name"])
    if not c:
        # Default for acadie-bathurst
        c = ('#a6192e', '#d3ba82')
        print(f"Using default color for {t['name']}")
    name_str = t['name'].replace("'", "\\'")
    qmjhl_str += f"    {{ id: '{t['id']}', name: '{name_str}', conference: '{t['conf']}', division: '{t['div']}', colors: {{ primary: '{c[0]}', secondary: '{c[1]}' }} }},\n"

qmjhl_str = qmjhl_str.rstrip(",\n") + "\n];\n"

with open('data/teams.js', 'w') as f:
    f.write("\n".join(new_lines) + qmjhl_str)

print("Perfectly updated data/teams.js")
