import json
import random

def scale_rosters():
    with open('data/fphl_rosters.json', 'r') as f:
        rosters = json.load(f)

    for team, players in rosters.items():
        for p in players:
            # Plan 2.1 says: "as médias dos jogadores serão entre 28 e 42 variando de forma aleatória"
            new_overall = random.randint(28, 42)
            p['overall'] = new_overall
            
            if new_overall >= 38: p['tier'] = 'gold'
            elif new_overall >= 33: p['tier'] = 'silver'
            else: p['tier'] = 'bronze'
            
            p['attributes'] = {
                'skating': {
                    'speed': random.randint(new_overall//2-2, new_overall//2+2),
                    'agility': random.randint(new_overall//2-2, new_overall//2+2),
                    'total': new_overall + random.randint(-2, 2)
                },
                'creativity': {
                    'vision': random.randint(new_overall//2-2, new_overall//2+2),
                    'intelligence': random.randint(new_overall//2-2, new_overall//2+2),
                    'total': new_overall + random.randint(-2, 2)
                },
                'shooting': {
                    'power': random.randint(new_overall//2-2, new_overall//2+2),
                    'accuracy': random.randint(new_overall//2-2, new_overall//2+2),
                    'total': new_overall + random.randint(-2, 2)
                },
                'defense': {
                    'contact': random.randint(new_overall//2-2, new_overall//2+2),
                    'positioning': random.randint(new_overall//2-2, new_overall//2+2),
                    'total': new_overall + random.randint(-2, 2)
                }
            }

    with open('data/fphl_rosters.json', 'w') as f:
        json.dump(rosters, f, indent=4)

    print("Successfully scaled FPHL overalls to 28-42 and updated tier to c-tier.")

if __name__ == '__main__':
    scale_rosters()
