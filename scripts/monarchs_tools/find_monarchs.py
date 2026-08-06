import requests
import json
import bs4

ticket = 'JnYnJc-0IdkfmoA7PeoaV1cBOZZRTF8RMyCno5UaXbSeFgrmS2Ge2Q8godyIYCqxK1mkV_j_fnjmAoJTsfdVPzyt'
headers = {
    'Authorization': f'ticket="{ticket}"',
    'User-Agent': 'Mozilla/5.0'
}

r = requests.get('https://web.api.digitalshift.ca/partials/stats/players?league_id=182&season_id=10958&status=Active', headers=headers)
if r.status_code == 200:
    soup = bs4.BeautifulSoup(r.json().get('content', ''), 'html.parser')
    for row in soup.select('table tbody tr'):
        cols = row.select('td')
        if len(cols) < 3: continue
        
        player_link = cols[1].select_one('a')
        name = player_link.text.strip() if player_link else cols[1].text.strip()
        if ',' in name:
            parts = name.split(',')
            name = f"{parts[1].strip()} {parts[0].strip()}"
            
        if 'Marcinkevics' in name or 'Croucher' in name or 'Bartuccio-Pereira' in name or 'Edwards' in name:
            team_link = cols[2].select_one('a')
            team_name = team_link.text.strip() if team_link else cols[2].text.strip()
            print(f"Player: {name}, Team: {team_name}")
            
            if team_link:
                print(f"Team Link: {team_link.get('href', '')}")
else:
    print("Failed to fetch")
