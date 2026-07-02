import json

rosters_path = 'data/rosters.json'
with open(rosters_path, 'r') as f:
    rosters = json.load(f)

for team_id, players in rosters.items():
    for p in players:
        # player id format: {team_id}_{player_id}
        parts = p['id'].split('_')
        if len(parts) >= 2:
            player_id = parts[-1]
            # determine league based on photo URL pattern or team
            if 'whl' in p.get('photo', ''):
                p['photo'] = f"https://assets.leaguestat.com/whl/240x240/{player_id}.jpg"
            else:
                p['photo'] = f"https://assets.leaguestat.com/ohl/240x240/{player_id}.jpg"

with open(rosters_path, 'w') as f:
    json.dump(rosters, f, indent=4)

print("Fixed photos!")
