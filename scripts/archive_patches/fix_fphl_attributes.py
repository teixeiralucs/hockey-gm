import json

with open('data/fphl_rosters.json', 'r') as f:
    rosters = json.load(f)

for team, players in rosters.items():
    for p in players:
        ovr = p.get('overall', 50)
        # We need a 1-10 scale for each attribute so that total is around (ovr / 10) * 2?
        # Actually, if ovr is 78, maybe the attributes should be around 7.8 each.
        base_attr = ovr / 10.0
        
        # We'll just set them all to base_attr for simplicity, or slightly randomize.
        def gen_attr(base):
            return {
                'speed': round(base, 1), 'agility': round(base, 1), 'total': round(base * 2, 1)
            }
        def gen_creativity(base):
            return {
                'passing': round(base, 1), 'vision': round(base, 1), 'total': round(base * 2, 1)
            }
        def gen_shooting(base):
            return {
                'power': round(base, 1), 'accuracy': round(base, 1), 'total': round(base * 2, 1)
            }
        def gen_defense(base):
            return {
                'positioning': round(base, 1), 'stickChecking': round(base, 1), 'total': round(base * 2, 1)
            }
        def gen_physical(base):
            return {
                'hitting': round(base, 1), 'strength': round(base, 1), 'total': round(base * 2, 1)
            }

        p['attributes'] = {
            'skating': gen_attr(base_attr),
            'creativity': gen_creativity(base_attr),
            'shooting': gen_shooting(base_attr),
            'defense': gen_defense(base_attr),
            'physical': gen_physical(base_attr)
        }

with open('data/fphl_rosters.json', 'w') as f:
    json.dump(rosters, f, indent=4)

print("Attributes fixed!")
