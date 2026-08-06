import asyncio
import json
import bs4
import requests
import string
import re

async def main():
    ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
    headers = {
        'Authorization': f'ticket="{ticket}"',
        'User-Agent': 'Mozilla/5.0'
    }
    
    player_photos = {}
    
    for letter in string.ascii_uppercase:
        print(f"Fetching letter {letter}...")
        try:
            r = requests.get(f'https://web.api.digitalshift.ca/partials/stats/players/search?league_id=182&season_id=10958&letter={letter}', headers=headers, timeout=5)
            if r.status_code != 200: continue
            
            content = r.json().get('content', '')
            soup = bs4.BeautifulSoup(content, 'html.parser')
            rows = soup.select('table tbody tr')
            for row in rows:
                player_link = row.select_one('a.person-inline')
                if not player_link: continue
                
                name_parts = player_link.text.strip().split(',')
                if len(name_parts) == 2:
                    name = f"{name_parts[1].strip()} {name_parts[0].strip()}"
                else:
                    name = player_link.text.strip()
                    
                href = player_link.get('href', '')
                player_id_match = re.search(r'/player/(\d+)', href)
                
                photo_url = 'assets/default-player.svg'
                if player_id_match:
                    player_id = player_id_match.group(1)
                    photo_url = f"https://digitalshift-stats.us-lax-1.linodeobjects.com/fphl/players/{player_id}.jpg"
                
                player_photos[name.lower()] = photo_url
        except Exception as e:
            print(f"Error on {letter}: {e}")

    print(f"Found {len(player_photos)} players in search.")
    
    # Now update fphl_rosters.json
    try:
        with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
            rosters = json.load(f)
            
        matched = 0
        for team_id, players in rosters.items():
            for p in players:
                name_lower = p['name'].lower()
                
                best_match = None
                for k, v in player_photos.items():
                    if k == name_lower:
                        best_match = v
                        break
                
                if not best_match:
                    for k, v in player_photos.items():
                        if name_lower in k or k in name_lower:
                            best_match = v
                            break
                            
                if best_match:
                    p['photo'] = best_match
                    matched += 1
                    
        with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
            json.dump(rosters, f, indent=4, ensure_ascii=False)
            
        print(f"Updated {matched} players with photos!")
    except Exception as e:
        print("Error updating rosters:", e)

if __name__ == "__main__":
    asyncio.run(main())
