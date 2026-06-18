import json

with open('data/rosters.json', 'r') as f:
    rosters = json.load(f)

photo_map = {}

# Build map of photo -> list of players
for team_id, players in rosters.items():
    for p in players:
        photo = p.get('photo')
        if photo:
            if photo not in photo_map:
                photo_map[photo] = []
            photo_map[photo].append(f"{p['name']} ({p['originalTeamId']})")

duplicates = {photo: names for photo, names in photo_map.items() if len(names) > 1}

print(f"Encontramos {len(duplicates)} fotos (person_ids) sendo usadas por mais de um jogador:")
for photo, names in duplicates.items():
    person_id = photo.split('/')[-1].split('.')[0]
    print(f"\nPerson ID: {person_id}")
    for name in names:
        print(f" - {name}")

