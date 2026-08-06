import asyncio
import json
import bs4
import requests
import random
import re

TEAM_MAP = {
    "684285": "fresno",
}

async def main():
    ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
    headers = {
        'Authorization': f'ticket="{ticket}"',
        'User-Agent': 'Mozilla/5.0'
    }
    
    with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
        fphl_rosters = json.load(f)
        
    for ds_team_id, local_team_id in TEAM_MAP.items():
        print(f"Fetching roster for {local_team_id} ({ds_team_id})...")
        try:
            r_roster = requests.get(f'https://web.api.digitalshift.ca/partials/stats/team/roster?team_id={ds_team_id}', headers=headers, timeout=10)
            if r_roster.status_code != 200: continue
            
            soup_r = bs4.BeautifulSoup(r_roster.json().get('content', ''), 'html.parser')
            
            fphl_rosters[local_team_id] = []
            
            for row in soup_r.select('table tbody tr'):
                cols = row.select('td')
                if len(cols) < 5: continue
                
                num = cols[0].text.strip()
                player_link = cols[1].select_one('a.person-inline')
                if not player_link: continue
                
                name = player_link.text.strip()
                if ',' in name:
                    parts = name.split(',')
                    name = f"{parts[1].strip()} {parts[0].strip()}"
                    
                href = player_link.get('href', '')
                p_id_match = re.search(r'/player/(\d+)', href)
                p_id = p_id_match.group(1) if p_id_match else None
                
                pos = cols[2].text.strip()
                if pos not in ['F', 'C', 'LW', 'RW', 'D', 'G']: pos = 'F'
                if pos == 'F': pos = random.choice(['C', 'LW', 'RW'])
                
                photo_url = "assets/default-player.svg"
                if p_id:
                    photo_url = f"https://digitalshift-stats.us-lax-1.linodeobjects.com/fphl/players/{p_id}.jpg"
                    
                games = 0
                goals, assists, points = 0, 0, 0
                saves, shots_against = 0, 0
                
                overall = random.randint(45, 62)
                if overall >= 58: tier = 'gold'
                elif overall >= 53: tier = 'silver'
                else: tier = 'bronze'
                        
                player_obj = {
                    "id": f"{local_team_id}_{name.lower().replace(' ', '_').replace('.', '')}",
                    "name": name,
                    "number": num or str(random.randint(1, 99)),
                    "position": pos,
                    "age": random.randint(21, 30),
                    "birthplace": cols[8].text.strip() if len(cols) > 8 else "Unknown",
                    "photo": photo_url,
                    "overall": overall,
                    "tier": tier,
                    "originalTeamId": local_team_id,
                    "stats": {
                        "goals": goals,
                        "assists": assists,
                        "points": points,
                        "games": games,
                        "shotsAgainst": shots_against,
                        "saves": saves,
                        "goalsAgainst": 0
                    },
                    "attributes": {
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
                }
                fphl_rosters[local_team_id].append(player_obj)
        except Exception as e:
            print(f"Error for {local_team_id}: {e}")
            
    with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
        json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully appended Fresno")

if __name__ == "__main__":
    asyncio.run(main())
