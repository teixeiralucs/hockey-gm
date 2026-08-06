import requests
import json
import bs4
import random
import re

ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
headers = {
    'Authorization': f'ticket="{ticket}"',
    'User-Agent': 'Mozilla/5.0'
}

def clean_name(name):
    # Strip jersey number and status (e.g. #30 - R)
    name = name.split('#')[0].strip()
    
    if ',' in name:
        parts = name.split(',')
        name = f"{parts[1].strip()} {parts[0].strip()}"
    return name.lower().replace(' ', '_').replace('.', '').replace("'", "")

def get_stats(player_type):
    all_stats = {}
    seen_names = set()
    page = 1
    while page <= 20:
        url = f"https://web.api.digitalshift.ca/partials/stats/leaders/table?season_id=9071&game_type=Regular+Season&player_type={player_type}&limit=200&page={page}"
        r = requests.get(url, headers=headers)
        if r.status_code != 200: break
        
        soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
        rows = soup.select('table tbody tr')
        if not rows: break
        
        added_new = False
        for row in rows:
            cols = row.select('td')
            if len(cols) < 5: continue
            
            player_link = cols[1].select_one('a.person-inline')
            if not player_link: continue
            
            name = clean_name(player_link.text.strip())
            
            if name in seen_names:
                continue
            seen_names.add(name)
            added_new = True
            
            if player_type == 'players':
                try:
                    pts = int(cols[6].text.strip())
                    all_stats[name] = pts
                except ValueError:
                    pass
            elif player_type == 'goalies':
                try:
                    sv_pct_str = cols[13].text.strip()
                    sv_pct = float(sv_pct_str) if sv_pct_str.startswith('.') or '.' in sv_pct_str else 0.850
                    all_stats[name] = sv_pct
                except Exception:
                    all_stats[name] = 0.850 # fallback

        if not added_new:
            break
        page += 1
    return all_stats

print("Fetching skater stats...")
skater_stats = get_stats('players')
print(f"Fetched {len(skater_stats)} skaters.")

print("Fetching goalie stats...")
goalie_stats = get_stats('goalies')
print(f"Fetched {len(goalie_stats)} goalies.")

# Load existing rosters
with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

# Collect all players to map them
skaters_list = []
goalies_list = []

unmatched_skaters = 0
unmatched_goalies = 0

for team, players in rosters.items():
    for p in players:
        name_key = p['name'].lower().replace(' ', '_').replace('.', '').replace("'", "")
        if p['position'] == 'G':
            score = goalie_stats.get(name_key, 0)
            if score == 0: unmatched_goalies += 1
            goalies_list.append((p, score))
        else:
            score = skater_stats.get(name_key, 0)
            if score == 0: unmatched_skaters += 1
            skaters_list.append((p, score))

print(f"Unmatched skaters: {unmatched_skaters}/{len(skaters_list)}")
print(f"Unmatched goalies: {unmatched_goalies}/{len(goalies_list)}")

# Sort and assign tiers
# Distribution: 15% Gold (38-42), 25% Silver (33-37), 60% Bronze (28-32)
def assign_overalls(player_list):
    # Sort by score descending
    player_list.sort(key=lambda x: x[1], reverse=True)
    
    total = len(player_list)
    gold_count = int(total * 0.15)
    silver_count = int(total * 0.25)
    
    for i, (p, score) in enumerate(player_list):
        if i < gold_count:
            ovr = random.randint(38, 42)
            tier = 'gold'
        elif i < gold_count + silver_count:
            ovr = random.randint(33, 37)
            tier = 'silver'
        else:
            ovr = random.randint(28, 32)
            tier = 'bronze'
            
        p['overall'] = ovr
        p['tier'] = tier
        
        # Re-roll attributes
        p['attributes'] = {
            'skating': {
                'speed': random.randint(ovr//2-2, ovr//2+2),
                'agility': random.randint(ovr//2-2, ovr//2+2),
                'total': ovr + random.randint(-2, 2)
            },
            'creativity': {
                'vision': random.randint(ovr//2-2, ovr//2+2),
                'intelligence': random.randint(ovr//2-2, ovr//2+2),
                'total': ovr + random.randint(-2, 2)
            },
            'shooting': {
                'power': random.randint(ovr//2-2, ovr//2+2),
                'accuracy': random.randint(ovr//2-2, ovr//2+2),
                'total': ovr + random.randint(-2, 2)
            },
            'defense': {
                'contact': random.randint(ovr//2-2, ovr//2+2),
                'positioning': random.randint(ovr//2-2, ovr//2+2),
                'total': ovr + random.randint(-2, 2)
            }
        }

assign_overalls(skaters_list)
assign_overalls(goalies_list)

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)

print("Successfully applied stats-based scaling to FPHL rosters!")
