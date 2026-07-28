import json
import random

QMJHL_TEAMS = [
    'blainville-boisbriand', 'gatineau', 'rouyn-noranda', 'val-dor', 'drummondville',
    'shawinigan', 'sherbrooke', 'victoriaville', 'baie-comeau', 'chicoutimi',
    'quebec', 'rimouski', 'acadie-bathurst', 'cape-breton', 'charlottetown',
    'halifax', 'moncton', 'saint-john'
]

rosters_path = 'data/rosters.json'
with open(rosters_path, 'r') as f:
    all_players = json.load(f)

first_names = ["Mathieu", "Jean", "Marc", "Louis", "Pierre", "Antoine", "Gabriel", "Alexandre", "Nicolas", "Samuel", "Charles", "Maxime", "Vincent", "Simon", "Julien", "Thomas", "Arthur", "Leo", "Victor", "Hugo"]
last_names = ["Tremblay", "Gagnon", "Roy", "Cote", "Bouchard", "Gauthier", "Morin", "Lavoie", "Fortin", "Gagne", "Ouellet", "Pelletier", "Belanger", "Levesque", "Bergeron", "Leblanc", "Paquette", "Girard", "Simard", "Boucher"]

for t_id in QMJHL_TEAMS:
    if t_id not in all_players:
        all_players[t_id] = []
        
    team_roster = all_players[t_id]
    current_count = len(team_roster)
    
    if current_count < 22:
        needed = 22 - current_count
        print(f"Padding {t_id} with {needed} players...")
        for _ in range(needed):
            pos = random.choice(['C', 'C', 'LW', 'LW', 'RW', 'RW', 'LD', 'RD', 'G'])
            overall = random.randint(12, 14)
            
            tier = 'bronze'
            
            player = {
                "id": f"{t_id}_dummy_{random.randint(10000, 99999)}",
                "name": f"{random.choice(first_names)} {random.choice(last_names)}",
                "number": str(random.randint(1, 99)),
                "position": pos,
                "age": random.randint(16, 20),
                "birthplace": "Canada",
                "photo": "assets/default-player.svg",
                "overall": overall,
                "tier": tier,
                "originalTeamId": t_id,
                "stats": {
                    "goals": random.randint(0, 5),
                    "assists": random.randint(0, 5),
                    "points": random.randint(0, 10),
                    "svp": random.uniform(0.850, 0.900) if pos == 'G' else 0
                },
                "attributes": {
                    "skating": { "speed": round(overall * 0.5, 1), "agility": round(overall * 0.5, 1), "total": round(overall, 1) },
                    "creativity": { "vision": round((overall / 2.0) * 0.5, 1), "intelligence": round((overall / 2.0) * 0.5, 1), "total": round(overall / 2.0, 1) },
                    "shooting": { "power": round(overall * 0.5, 1), "accuracy": round(overall * 0.5, 1), "total": round(overall, 1) },
                    "defense": { "contact": round((overall / 2.0) * 0.5, 1), "positioning": round((overall / 2.0) * 0.5, 1), "total": round(overall / 2.0, 1) }
                }
            }
            team_roster.append(player)

with open(rosters_path, 'w') as f:
    json.dump(all_players, f, indent=4)

print("QMJHL Rosters padded to 22 players each.")
