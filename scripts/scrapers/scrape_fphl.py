import asyncio
import json
import bs4
import requests
import random
import re

TEAM_MAP = {
    "684215": "watertown",
    "684285": "fresno",
    "684213": "port-huron",
    "684208": "blue-ridge",
    "684200": "monroe",
    "684281": "minnesota",
    "684207": "binghamton",
    "684212": "motor-city",
    "684206": "baton-rouge-kingfish",
    "684203": "columbus",
    "684211": "indiana",
    "684214": "topeka",
    "684210": "danbury",
    "684205": "twin-city",
    "684287": "oceanside",
    "684286": "stockton"
}

async def main():
    ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
    headers = {
        'Authorization': f'ticket="{ticket}"',
        'User-Agent': 'Mozilla/5.0'
    }
    
    fphl_rosters = {v: [] for v in TEAM_MAP.values()}
    
    for ds_team_id, local_team_id in TEAM_MAP.items():
        print(f"Fetching roster for {local_team_id} ({ds_team_id})...")
        try:
            r_roster = requests.get(f'https://web.api.digitalshift.ca/partials/stats/team/roster?team_id={ds_team_id}', headers=headers, timeout=5)
            if r_roster.status_code != 200: continue
            
            soup_r = bs4.BeautifulSoup(r_roster.json().get('content', ''), 'html.parser')
            
            seen_ids = set()
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
                p_id = p_id_match.group(1) if p_id_match else name.lower().replace(' ', '_')
                
                if p_id in seen_ids:
                    continue
                seen_ids.add(p_id)
                
                pos = cols[2].text.strip()
                if pos not in ['F', 'C', 'LW', 'RW', 'D', 'G']: pos = 'F'
                if pos == 'F': pos = random.choice(['C', 'LW', 'RW'])
                
                # Split Defensemen into LD and RD based on 'Shoots' column
                if pos == 'D':
                    shoots = cols[5].text.strip() if len(cols) > 5 else ''
                    pos = 'LD' if shoots == 'L' else 'RD'
                
                photo_url = "assets/default-player.svg"
                if p_id:
                    photo_url = f"https://digitalshift-stats.us-lax-1.linodeobjects.com/fphl/players/{p_id}.jpg"
                    
                # Setting stats to 0 since season 26-27 hasn't started yet!
                games = 0
                goals, assists, points = 0, 0, 0
                saves, shots_against = 0, 0
                
                # FPHL Overall rules (Section 2.1): between 28 and 42
                overall = random.randint(28, 42)
                if overall >= 38: tier = 'gold'
                elif overall >= 33: tier = 'silver'
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
                fphl_rosters[local_team_id].append(player_obj)
        except Exception as e:
            print(f"Error for {local_team_id}: {e}")
            
    with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
        json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully saved full real rosters to data/fphl_rosters.json")

if __name__ == "__main__":
    asyncio.run(main())
