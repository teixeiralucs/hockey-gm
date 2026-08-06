from curl_cffi import requests
from bs4 import BeautifulSoup
import json
import random

r = requests.get('https://www.eliteprospects.com/team/41320/mid-south-monarchs', impersonate="chrome110")
if r.status_code == 200:
    soup = BeautifulSoup(r.text, 'html.parser')
    roster_table = soup.select('table.roster tbody tr')
    
    with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
        fphl_rosters = json.load(f)
        
    photo_pool = []
    for team, players in fphl_rosters.items():
        if team == 'mid-south-monarchs': continue
        for p_obj in players:
            if p_obj.get('photo') and p_obj['photo'] != "assets/default-player.svg" and "fphl" not in p_obj['photo']:
                photo_pool.append(p_obj['photo'])
    
    if not photo_pool: photo_pool = ["assets/default-player.svg"]
    
    monarch_players = []
    
    for row in roster_table:
        cols = row.select('td')
        if len(cols) < 5: continue
        
        num = cols[0].text.strip()
        player_link = cols[1].select_one('a')
        if not player_link: continue
        name = player_link.text.strip()
        
        pos = cols[2].text.strip()
        if pos not in ['C', 'LW', 'RW', 'D', 'G']: pos = random.choice(['C', 'LW', 'RW', 'D'])
        
        overall = random.randint(48, 62)
        if overall >= 58: tier = 'gold'
        elif overall >= 53: tier = 'silver'
        else: tier = 'bronze'
        
        player_obj = {
            "id": f"mid-south-monarchs_{name.lower().replace(' ', '_').replace('.', '')}",
            "name": name,
            "number": num if num else str(random.randint(1, 99)),
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
                "skating": { "speed": overall, "agility": overall, "balance": overall, "stamina": overall },
                "shooting": { "wristShot": overall, "slapShot": overall, "accuracy": overall },
                "puckSkills": { "passing": overall, "puckControl": overall, "hands": overall }
            }
        }
        monarch_players.append(player_obj)
        
    print(f"Found {len(monarch_players)} players from EP.")
    if len(monarch_players) > 0:
        fphl_rosters['mid-south-monarchs'] = monarch_players
        with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
            json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)
        print("Updated fphl_rosters.json successfully!")
else:
    print("Failed request, code", r.status_code)
