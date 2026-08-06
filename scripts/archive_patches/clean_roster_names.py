import json
import re

with open('data/rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team_id, players in rosters.items():
    for p in players:
        name = p['name']
        name = re.sub(r'\s*\([GDF/]+\)$', '', name) # Remove (G), (F/D), etc
        p['name'] = name

with open('data/rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
