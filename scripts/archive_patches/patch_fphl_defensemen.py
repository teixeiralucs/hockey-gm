import json
import requests
import bs4
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

ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
headers = {'Authorization': f'ticket="{ticket}"', 'User-Agent': 'Mozilla/5.0'}

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for ds_team_id, local_team_id in TEAM_MAP.items():
    print(f"Fetching roster for {local_team_id}...")
    try:
        r = requests.get(f'https://web.api.digitalshift.ca/partials/stats/team/roster?team_id={ds_team_id}', headers=headers, timeout=10)
        soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
        
        for row in soup.select('table tbody tr'):
            cols = row.select('td')
            if len(cols) < 6: continue
            
            player_link = cols[1].select_one('a.person-inline')
            if not player_link: continue
            
            name = player_link.text.strip()
            if ',' in name:
                parts = name.split(',')
                name = f"{parts[1].strip()} {parts[0].strip()}"
                
            href = player_link.get('href', '')
            p_match = re.search(r'/player/(\d+)', href)
            p_id = p_match.group(1) if p_match else name.lower().replace(' ', '_')
            
            # Find this player in our local JSON
            # The ID in JSON is local_team_id + '_' + name.lower().replace(' ', '_').replace('.', '')
            json_id = f"{local_team_id}_{name.lower().replace(' ', '_').replace('.', '')}"
            
            shoots = cols[5].text.strip()
            pos = cols[2].text.strip()
            
            if pos == 'D':
                new_pos = 'LD' if shoots == 'L' else 'RD'
                # Find in rosters
                if local_team_id in rosters:
                    for p in rosters[local_team_id]:
                        if p['id'] == json_id and p['position'] == 'D':
                            p['position'] = new_pos
    except Exception as e:
        print(f"Error for {local_team_id}: {e}")

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
print("Updated Defensemen positions based on Shoots column!")
