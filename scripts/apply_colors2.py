import re
import json

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
    # normalize
    nid = tid.lower().replace('-', '').replace(' ', '')
    nname = tname.lower().replace('-', '').replace(' ', '').replace('é', 'e').replace('ó', 'o').replace('\'', '')
    
    # check exact matches
    if nid in cores: return cores[nid]
    if nname in cores: return cores[nname]
    
    # partial matches
    for ckey, (cp, cs) in cores.items():
        ckey_no_accents = ckey.replace('é', 'e').replace('jogn', 'john').replace('sherbooke', 'sherbrooke')
        if ckey_no_accents in nname or ckey_no_accents in nid or nid in ckey_no_accents:
            return (cp, cs)
    return None

with open('data/teams.js', 'r') as f:
    teams_js = f.read()

# teams.js has lines like:
# { id: 'barrie', name: 'Barrie Colts', conference: 'East', division: 'Central', colors: { primary: '#ec2634', secondary: '#001c63' } },
# We will use a regex to find each team block and replace colors

def repl(match):
    prefix = match.group(1)
    tid = match.group(2)
    mid = match.group(3)
    tname = match.group(4)
    suffix = match.group(5)
    end = match.group(6)
    
    colors = get_color_for_team(tid, tname)
    if colors:
        return f"{prefix}id: '{tid}'{mid}name: '{tname}'{suffix}colors: {{ primary: '{colors[0]}', secondary: '{colors[1]}' }}{end}"
    else:
        print(f"Failed to find color for {tname} ({tid})")
        return match.group(0)

# Regex to capture id and name and then replace colors
# group 1: before id
# group 2: id value
# group 3: between id and name
# group 4: name value
# group 5: between name and colors:
# group 6: after colors object
pattern = re.compile(r"(\{.*?id:\s*')([^']+)(.*?name:\s*')([^']+)(.*?colors:\s*\{[^}]+\})(.*?)")
# Actually it's better to just replace the colors part
# let's capture up to the colors object
pattern = re.compile(r"(\{.*?id:\s*')([^']+)(.*?name:\s*')([^']+)(.*?)(colors:\s*\{[^}]+\})(.*?)", re.DOTALL)

new_teams, count = pattern.subn(repl, teams_js)
with open('data/teams.js', 'w') as f:
    f.write(new_teams)
print("Updated teams.js")
