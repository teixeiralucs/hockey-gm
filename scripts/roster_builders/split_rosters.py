import json

with open('data/rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

fphl_ids = ['binghamton', 'blue-ridge', 'danbury', 'twin-city', 'port-huron', 'motor-city', 'indiana', 'watertown', 'baton-rouge-kingfish', 'monroe', 'columbus', 'fresno', 'minnesota', 'oceanside', 'topeka', 'stockton']

fphl_rosters = {}
chl_rosters = {}

for team_id, players in rosters.items():
    if team_id in fphl_ids:
        fphl_rosters[team_id] = players
    else:
        chl_rosters[team_id] = players

with open('data/rosters.json', 'w', encoding='utf-8') as f:
    json.dump(chl_rosters, f, indent=4, ensure_ascii=False)

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)

print(f"CHL rosters: {len(chl_rosters)} teams")
print(f"FPHL rosters: {len(fphl_rosters)} teams")
