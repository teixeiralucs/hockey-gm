import json
import random

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    fphl_rosters = json.load(f)

if 'mid-south-monarchs' not in fphl_rosters:
    fphl_rosters['mid-south-monarchs'] = []

first_names = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

# Get photo pool
photo_pool = []
for team, players in fphl_rosters.items():
    for p in players:
        if p.get('photo') and p['photo'] != "assets/default-player.svg" and "fphl" not in p['photo']:
            photo_pool.append(p['photo'])

if not photo_pool:
    photo_pool = ["assets/default-player.svg"]

def generate_player(pos):
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    overall = random.randint(48, 62)
    
    if overall >= 58: tier = 'gold'
    elif overall >= 53: tier = 'silver'
    else: tier = 'bronze'

    return {
        "id": f"mid-south-monarchs_{fname.lower()}_{lname.lower()}_{random.randint(100, 999)}",
        "name": f"{fname} {lname}",
        "number": str(random.randint(1, 99)),
        "position": pos,
        "age": random.randint(20, 32),
        "birthplace": "USA",
        "photo": random.choice(photo_pool),
        "overall": overall,
        "tier": tier,
        "originalTeamId": "mid-south-monarchs",
        "isFPHL": True,
        "stats": { "goals": 0, "assists": 0, "points": 0, "games": 0, "shotsAgainst": 0, "saves": 0, "goalsAgainst": 0 },
        "attributes": {
            "skating": { "speed": overall, "agility": overall, "balance": overall, "stamina": overall },
            "shooting": { "wristShot": overall, "slapShot": overall, "accuracy": overall },
            "puckSkills": { "passing": overall, "puckControl": overall, "hands": overall }
        }
    }

# Generate 4 Centers, 4 LW, 4 RW, 6 D, 2 G = 20 players
fphl_rosters['mid-south-monarchs'] = []
for _ in range(4): fphl_rosters['mid-south-monarchs'].append(generate_player('C'))
for _ in range(4): fphl_rosters['mid-south-monarchs'].append(generate_player('LW'))
for _ in range(4): fphl_rosters['mid-south-monarchs'].append(generate_player('RW'))
for _ in range(6): fphl_rosters['mid-south-monarchs'].append(generate_player('D'))
for _ in range(2): fphl_rosters['mid-south-monarchs'].append(generate_player('G'))

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)

print("Generated 20 players for mid-south-monarchs.")
