import json
import random

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team_id, players in rosters.items():
    for p in players:
        pos = p.get('position', 'F')
        
        # Simulate stats
        games = random.randint(40, 68)
        p['stats']['games'] = games
        
        if pos == 'G':
            p['stats']['saves'] = random.randint(800, 1500)
            p['stats']['shotsAgainst'] = int(p['stats']['saves'] / random.uniform(0.88, 0.93))
            sv_pct = p['stats']['saves'] / p['stats']['shotsAgainst'] if p['stats']['shotsAgainst'] > 0 else 0
            
            if sv_pct > 0.915:
                tier = 'gold'
                overall = random.randint(58, 62)
            elif sv_pct > 0.900:
                tier = 'silver'
                overall = random.randint(53, 57)
            else:
                tier = 'bronze'
                overall = random.randint(45, 52)
        else:
            if pos == 'D':
                points = random.randint(10, 45)
            else:
                points = random.randint(20, 85)
                
            goals = int(points * random.uniform(0.3, 0.6))
            assists = points - goals
            
            p['stats']['goals'] = goals
            p['stats']['assists'] = assists
            p['stats']['points'] = points
            
            ppg = points / games if games > 0 else 0
            
            if ppg > 1.0:
                tier = 'gold'
                overall = random.randint(58, 62)
            elif ppg > 0.6:
                tier = 'silver'
                overall = random.randint(53, 57)
            else:
                tier = 'bronze'
                overall = random.randint(45, 52)
                
        p['tier'] = tier
        p['overall'] = overall
        
        # Override the ugly elite prospects photo with a default one since we can't reliably get the digital shift ones without their IDs
        if 'leaguestat' in p.get('photo', '') or 'eliteprospects' in p.get('photo', ''):
            p['photo'] = 'assets/default-player.svg'
            
        p['attributes'] = {
            "skating": {
                "speed": random.randint(overall-5, overall+5),
                "agility": random.randint(overall-5, overall+5),
                "balance": random.randint(overall-5, overall+5),
                "stamina": random.randint(overall-5, overall+5)
            },
            "shooting": {
                "wristShot": random.randint(overall-5, overall+5),
                "slapShot": random.randint(overall-5, overall+5),
                "accuracy": random.randint(overall-5, overall+5)
            },
            "puckSkills": {
                "passing": random.randint(overall-5, overall+5),
                "puckControl": random.randint(overall-5, overall+5),
                "hands": random.randint(overall-5, overall+5)
            }
        }

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)

print("Successfully updated fphl_rosters.json with simulated 25/26 stats and tiers!")
