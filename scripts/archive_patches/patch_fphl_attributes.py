import json
import random

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team, players in rosters.items():
    for p in players:
        overall = p.get('overall', 30)
        base_attr = overall / 2.0  # Attributes out of ~20? Or is it out of 100?
        
        # Wait, the modal displays OVR as e.g. 30.
        # But in the JS, the bar is (total / 35) * 100. So max total is around 35?
        # That means each stat (e.g. speed) is out of 100, or out of 20?
        # Let's check: total = speed + agility. If total is 35, speed is ~17.5.
        # So stats should be around overall / 2 ? No, if OVR is 32, total of 2 stats could be ~32.
        
        def gen(stat1, stat2):
            # random around overall/2
            v1 = max(1, min(99, int(overall / 2 + random.randint(-2, 2))))
            v2 = max(1, min(99, int(overall / 2 + random.randint(-2, 2))))
            return {
                stat1: v1,
                stat2: v2,
                'total': v1 + v2
            }

        p['attributes'] = {
            'skating': gen('speed', 'agility'),
            'creativity': gen('vision', 'intelligence'),
            'shooting': gen('power', 'accuracy'),
            'defense': gen('contact', 'positioning')
        }

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
print("Updated attributes schema for FPHL!")
