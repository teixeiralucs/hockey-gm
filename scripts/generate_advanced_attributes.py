import json
import random

def generate_attributes():
    with open('data/rosters.json', 'r') as f:
        rosters = json.load(f)

    # Ratios (Skating, Creativity, Shooting, Defense)
    ratios = {
        'forward': [2.0, 1.0, 2.0, 1.25],
        'defense': [1.75, 1.75, 1.75, 2.0],
        'goalie': [1.0, 2.0, 1.0, 1.75]
    }
    
    sub_keys = [
        ('speed', 'agility'),
        ('vision', 'intelligence'),
        ('power', 'accuracy'),
        ('contact', 'positioning')
    ]
    
    macro_keys = ['skating', 'creativity', 'shooting', 'defense']

    for team, players in rosters.items():
        for p in players:
            pos = p['position']
            if pos in ['LW', 'C', 'RW']:
                role = 'forward'
            elif pos in ['LD', 'RD']:
                role = 'defense'
            else:
                role = 'goalie'
                
            r = ratios[role]
            total_ratio = sum(r)
            
            # The player's overall is their average score.
            # Thus, the total points to distribute is overall * 4.
            overall = p['overall']
            total_budget = overall * 4.0
            
            attributes = {}
            check_sum = 0
            
            for i in range(4):
                macro = macro_keys[i]
                macro_score = (r[i] / total_ratio) * total_budget
                check_sum += macro_score
                
                # Split macro score into two sub-attributes with a small random variance (45%-55%)
                variance = random.uniform(0.45, 0.55)
                sub1_val = round(macro_score * variance, 1)
                sub2_val = round(macro_score - sub1_val, 1)
                
                attributes[macro] = {
                    sub_keys[i][0]: sub1_val,
                    sub_keys[i][1]: sub2_val,
                    "total": round(macro_score, 1)
                }
            
            # Sanity check: average of totals should equal overall roughly
            # Not exactly due to rounding, but the internal "total" keys are the true source.
            
            p['attributes'] = attributes

    with open('data/rosters.json', 'w') as f:
        json.dump(rosters, f, indent=4)
        
    print("Attributes generated and applied to data/rosters.json!")

if __name__ == '__main__':
    generate_attributes()
