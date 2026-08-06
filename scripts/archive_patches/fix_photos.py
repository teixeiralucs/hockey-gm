import json
import re
import requests
import bs4
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_photo_for_player(p):
    photo = p.get('photo', '')
    match = re.search(r"players/(\d+)\.jpg", photo)
    if not match:
        p['photo'] = "assets/default-player.svg"
        return p
        
    p_id = match.group(1)
    ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
    headers = {'Authorization': f'ticket="{ticket}"', 'User-Agent': 'Mozilla/5.0'}
    
    try:
        r = requests.get(f'https://web.api.digitalshift.ca/partials/stats/player?player_id={p_id}', headers=headers, timeout=5)
        if r.status_code == 200:
            soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
            # Look for an image containing person-photo_url
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if 'person-photo_url' in src:
                    p['photo'] = src
                    return p
    except Exception:
        pass
        
    p['photo'] = "assets/default-player.svg"
    return p

def main():
    with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
        rosters = json.load(f)
        
    all_players = []
    for players in rosters.values():
        all_players.extend(players)
        
    print(f"Fetching photos for {len(all_players)} players...")
    
    # Process with thread pool
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(fetch_photo_for_player, p): p for p in all_players}
        
        completed = 0
        for future in as_completed(futures):
            future.result()
            completed += 1
            if completed % 50 == 0:
                print(f"{completed}/{len(all_players)} completed...")
                
    # Count how many have real photos
    real_photos = sum(1 for p in all_players if p['photo'] != 'assets/default-player.svg')
    print(f"Found {real_photos} real photos.")

    with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
        json.dump(rosters, f, indent=4, ensure_ascii=False)
        
if __name__ == '__main__':
    main()
