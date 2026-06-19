import json

with open('data/rosters.json', 'r') as f:
    rosters = json.load(f)

photo_map = {}

# Build map of photo -> list of dicts with player info
for team_id, players in rosters.items():
    for p in players:
        photo = p.get('photo')
        if photo:
            if photo not in photo_map:
                photo_map[photo] = []
            photo_map[photo].append({
                "id": p["id"],
                "name": p["name"],
                "team": p["originalTeamId"]
            })

# Find photos used by different names (which indicates a real collision)
real_collisions = {}
for photo, player_list in photo_map.items():
    names = set([p["name"] for p in player_list])
    if len(names) > 1:
        real_collisions[photo] = player_list

with open('data/photo_errors_report.json', 'w') as f:
    json.dump(real_collisions, f, indent=4)

print(f"Generated data/photo_errors_report.json with {len(real_collisions)} real face collisions.")
