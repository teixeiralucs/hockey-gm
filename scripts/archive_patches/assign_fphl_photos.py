import json
import random

with open('data/rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

# Collect all valid photo URLs from CHL players
photo_pool = set()
for team_id, players in rosters.items():
    if team_id not in ['binghamton', 'blue-ridge', 'danbury', 'twin-city', 'port-huron', 'motor-city', 'indiana', 'watertown', 'baton-rouge-kingfish', 'monroe', 'columbus', 'fresno', 'minnesota', 'oceanside', 'topeka', 'stockton']:
        for p in players:
            photo = p.get('photo', '')
            if photo and 'default' not in photo and photo.startswith('http'):
                photo_pool.add(photo)

photo_pool = list(photo_pool)
print(f"Found {len(photo_pool)} real photos in CHL pool")

# Assign randomly to FPHL
assigned = 0
for team_id, players in rosters.items():
    if team_id in ['binghamton', 'blue-ridge', 'danbury', 'twin-city', 'port-huron', 'motor-city', 'indiana', 'watertown', 'baton-rouge-kingfish', 'monroe', 'columbus', 'fresno', 'minnesota', 'oceanside', 'topeka', 'stockton']:
        for p in players:
            if 'default' in p.get('photo', ''):
                p['photo'] = random.choice(photo_pool)
                assigned += 1

with open('data/rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
    
print(f"Assigned {assigned} photos to FPHL players")
