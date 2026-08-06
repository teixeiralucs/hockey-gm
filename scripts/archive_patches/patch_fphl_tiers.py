import json

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team, players in rosters.items():
    for p in players:
        ovr = p.get('overall', 30)
        if ovr >= 38:
            p['tier'] = 'gold'
        elif ovr >= 33:
            p['tier'] = 'silver'
        else:
            p['tier'] = 'bronze'

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
print("Updated FPHL tiers to bronze, silver, gold!")
