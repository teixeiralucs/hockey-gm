import json
import random

first_names = [
    "Connor", "Liam", "Ethan", "Jackson", "Noah", "Aiden", "Caden", "Grayson", "Lucas", "Mason", 
    "Oliver", "Elijah", "Logan", "Alexander", "Carter", "Owen", "Wyatt", "Jack", "Luke", "Jayden"
]
last_names = [
    "MacDonald", "Tremblay", "Roy", "Gagnon", "Bouchard", "Gauthier", "Morin", "Lavoie", "Fortin", "Pelletier",
    "Bélanger", "Richard", "Ouellet", "Côté", "Leblanc", "Tardif", "Desjardins", "Caron", "Lefebvre", "Leduc"
]

real_players = [
    {"name": "Mac Jansen", "pos": "C"},
    {"name": "Tyson Kirkby", "pos": "C"},
    {"name": "Dominiks Marcinkevics", "pos": "RW"},
    {"name": "Luke Croucher", "pos": "LW"},
    {"name": "Jonathan Bartuccio-Pereira", "pos": "D"},
    {"name": "Jackson Edwards", "pos": "D"},
    {"name": "Tommy Nappier", "pos": "G"}
]

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    fphl_rosters = json.load(f)

photo_pool = []
for team, players in fphl_rosters.items():
    if team == 'mid-south-monarchs': continue
    for p_obj in players:
        if p_obj.get('photo') and p_obj['photo'] != "assets/default-player.svg" and "fphl" not in p_obj['photo']:
            photo_pool.append(p_obj['photo'])

if not photo_pool: photo_pool = ["assets/default-player.svg"]

fphl_rosters['mid-south-monarchs'] = []

def add_player(name, pos):
    # Scale overall to 28-42 (FPHL rules)
    overall = random.randint(28, 42)
    if overall >= 38: tier = 'gold'
    elif overall >= 33: tier = 'silver'
    else: tier = 'bronze'
    
    player_obj = {
        "id": f"mid-south-monarchs_{name.lower().replace(' ', '_').replace('.', '')}",
        "name": name,
        "number": str(random.randint(1, 99)),
        "position": pos,
        "age": random.randint(21, 28),
        "birthplace": "Unknown",
        "photo": random.choice(photo_pool),
        "overall": overall,
        "tier": tier,
        "originalTeamId": "mid-south-monarchs",
        "isFPHL": True,
        "stats": { "goals": 0, "assists": 0, "points": 0, "games": 0, "shotsAgainst": 0, "saves": 0, "goalsAgainst": 0 },
        "attributes": {
            "skating": {
                "speed": random.randint(overall//2-2, overall//2+2),
                "agility": random.randint(overall//2-2, overall//2+2),
                "total": overall + random.randint(-2, 2)
            },
            "creativity": {
                "vision": random.randint(overall//2-2, overall//2+2),
                "intelligence": random.randint(overall//2-2, overall//2+2),
                "total": overall + random.randint(-2, 2)
            },
            "shooting": {
                "power": random.randint(overall//2-2, overall//2+2),
                "accuracy": random.randint(overall//2-2, overall//2+2),
                "total": overall + random.randint(-2, 2)
            },
            "defense": {
                "contact": random.randint(overall//2-2, overall//2+2),
                "positioning": random.randint(overall//2-2, overall//2+2),
                "total": overall + random.randint(-2, 2)
            }
        }
    }
    fphl_rosters['mid-south-monarchs'].append(player_obj)

for p in real_players:
    add_player(p['name'], p['pos'])

positions_needed = ['C', 'C', 'LW', 'LW', 'RW', 'RW', 'D', 'D', 'D', 'D', 'G']
for pos in positions_needed:
    name = f"{random.choice(first_names)} {random.choice(last_names)}"
    add_player(name, pos)

# We should now have 7 + 11 = 18 players. Let's add 2 more to get exactly 20.
add_player(f"{random.choice(first_names)} {random.choice(last_names)}", 'LW')
add_player(f"{random.choice(first_names)} {random.choice(last_names)}", 'D')

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)

print(f"Generated 20 realistic players for mid-south-monarchs (including 7 real players).")
