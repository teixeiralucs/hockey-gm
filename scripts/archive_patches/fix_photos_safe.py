import json
import re
import requests
import bs4
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# 1. Fetch name -> player_id mapping
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

name_to_id = {}
print("Building player_id mapping...")
for ds_team_id in TEAM_MAP.keys():
    try:
        r = requests.get(f'https://web.api.digitalshift.ca/partials/stats/team/roster?team_id={ds_team_id}', headers=headers, timeout=10)
        soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
        for row in soup.select('table tbody tr'):
            cols = row.select('td')
            if len(cols) > 1 and cols[1].select_one('a'):
                name = cols[1].text.strip()
                if ',' in name:
                    parts = name.split(',')
                    name = f"{parts[1].strip()} {parts[0].strip()}"
                
                href = cols[1].select_one('a').get('href', '')
                p_match = re.search(r'/player/(\d+)', href)
                if p_match:
                    name_to_id[name] = p_match.group(1)
    except Exception as e:
        print(f"Error fetching {ds_team_id}")

print(f"Found {len(name_to_id)} player IDs.")

def fetch_photo(p):
    name = p['name']
    p_id = name_to_id.get(name)
    if not p_id:
        return p
        
    try:
        r = requests.get(f'https://web.api.digitalshift.ca/partials/stats/player?player_id={p_id}', headers=headers, timeout=10)
        if r.status_code == 200:
            soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if 'person-photo_url' in src:
                    p['photo'] = src
                    return p
    except Exception:
        pass
        
    return p

def main():
    with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
        rosters = json.load(f)
        
    all_players = []
    for players in rosters.values():
        all_players.extend(players)
        
    print(f"Fetching photos for {len(all_players)} players...")
    
    # Process with thread pool (max 5 to avoid rate limits)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_photo, p): p for p in all_players}
        
        completed = 0
        for future in as_completed(futures):
            future.result()
            completed += 1
            if completed % 20 == 0:
                print(f"{completed}/{len(all_players)} completed...")
                
    real_photos = sum(1 for p in all_players if p['photo'] != 'assets/default-player.svg')
    print(f"Found {real_photos} real photos.")

    with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
        json.dump(rosters, f, indent=4, ensure_ascii=False)

if __name__ == '__main__':
    main()
