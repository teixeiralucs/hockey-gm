import asyncio
import json
import bs4
from playwright.async_api import async_playwright
import requests
import random
import math

TEAM_MAP = {
    "Binghamton": "binghamton", "Blue Ridge": "blue-ridge", "Carolina": "twin-city", 
    "Danbury": "danbury", "Hudson Valley": "indiana", "Motor City": "motor-city",
    "Port Huron": "port-huron", "Watertown": "watertown", "Athens": "fresno", 
    "Baton Rouge": "baton-rouge-kingfish", "Columbus": "columbus", "Monroe": "monroe"
}

def get_team_id(name):
    for k, v in TEAM_MAP.items():
        if k.lower() in name.lower():
            return v
    return name.lower().replace(' ', '-')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        ticket = None
        async def handle_request(route, request):
            nonlocal ticket
            headers = request.headers
            if 'authorization' in headers and 'ticket=' in headers['authorization']:
                ticket = headers['authorization'].split('ticket="')[1].split('"')[0]
            await route.continue_()
            
        await page.route("**/*", handle_request)
        await page.goto("https://www.federalhockey.com/stats", wait_until="networkidle")
        await browser.close()
        
        if not ticket:
            print("Failed to find ticket.")
            return
            
        headers = {
            "Authorization": f'ticket="{ticket}"',
            "User-Agent": "Mozilla/5.0"
        }
        
        print("Fetching players HTML...")
        r = requests.get("https://web.api.digitalshift.ca/partials/stats/players?league_id=182&season_id=10958&status=Active", headers=headers)
        html_content = r.json().get('content', '')
        
        soup = bs4.BeautifulSoup(html_content, 'html.parser')
        rows = soup.select('table tbody tr')
        print(f"Parsed {len(rows)} player rows from HTML.")
        
        if len(rows) == 0:
            print("No rows found. Aborting.")
            return

        fphl_rosters = {}
        for row in rows:
            cols = row.select('td')
            if len(cols) < 10:
                continue
            
            # Col 1 is photo and name
            img_tag = cols[1].select_one('img')
            photo_url = img_tag['src'] if img_tag else "assets/default-player.svg"
            if photo_url.startswith('//'): photo_url = "https:" + photo_url
            
            name = cols[1].text.strip()
            team_name = cols[2].text.strip()
            local_team_id = get_team_id(team_name)
            
            pos = cols[3].text.strip()
            if pos not in ['F', 'C', 'LW', 'RW', 'D', 'G']: pos = 'F'
            if pos == 'F': pos = random.choice(['C', 'LW', 'RW'])
            
            try: games = int(cols[4].text.strip())
            except: games = 0
            try: goals = int(cols[5].text.strip())
            except: goals = 0
            try: assists = int(cols[6].text.strip())
            except: assists = 0
            try: points = int(cols[7].text.strip())
            except: points = 0
            
            ppg = points / games if games > 0 else 0
            if ppg > 1.2:
                tier = 'gold'
                overall = random.randint(58, 62)
            elif ppg > 0.7:
                tier = 'silver'
                overall = random.randint(53, 57)
            else:
                tier = 'bronze'
                overall = random.randint(45, 52)
                
            player_obj = {
                "id": f"{local_team_id}_{name.lower().replace(' ', '_').replace('.', '')}",
                "name": name,
                "number": str(random.randint(1, 99)),
                "position": pos,
                "age": random.randint(21, 28),
                "birthplace": "Unknown",
                "photo": photo_url,
                "overall": overall,
                "tier": tier,
                "originalTeamId": local_team_id,
                "stats": {
                    "goals": goals,
                    "assists": assists,
                    "points": points,
                    "games": games,
                    "shotsAgainst": 0,
                    "saves": 0,
                    "goalsAgainst": 0
                },
                "attributes": {
                    "skating": { "speed": overall, "agility": overall, "balance": overall, "stamina": overall },
                    "shooting": { "wristShot": overall, "slapShot": overall, "accuracy": overall },
                    "puckSkills": { "passing": overall, "puckControl": overall, "hands": overall }
                }
            }
            if local_team_id not in fphl_rosters:
                fphl_rosters[local_team_id] = []
            fphl_rosters[local_team_id].append(player_obj)
            
        # Do the same for goalies!
        r_goalies = requests.get("https://web.api.digitalshift.ca/partials/stats/goalies?league_id=182&season_id=10958", headers=headers)
        goalies_html = r_goalies.json().get('content', '')
        soup_g = bs4.BeautifulSoup(goalies_html, 'html.parser')
        rows_g = soup_g.select('table tbody tr')
        print(f"Parsed {len(rows_g)} goalie rows from HTML.")
        
        for row in rows_g:
            cols = row.select('td')
            if len(cols) < 10:
                continue
                
            img_tag = cols[1].select_one('img')
            photo_url = img_tag['src'] if img_tag else "assets/default-player.svg"
            if photo_url.startswith('//'): photo_url = "https:" + photo_url
            
            name = cols[1].text.strip()
            team_name = cols[2].text.strip()
            local_team_id = get_team_id(team_name)
            
            try: games = int(cols[3].text.strip())
            except: games = 0
            try: sv_pct = float(cols[8].text.strip())
            except: sv_pct = 0.900
            
            if sv_pct > 0.920:
                tier = 'gold'
                overall = random.randint(58, 62)
            elif sv_pct > 0.905:
                tier = 'silver'
                overall = random.randint(53, 57)
            else:
                tier = 'bronze'
                overall = random.randint(45, 52)
                
            player_obj = {
                "id": f"{local_team_id}_{name.lower().replace(' ', '_').replace('.', '')}",
                "name": name,
                "number": str(random.randint(1, 99)),
                "position": 'G',
                "age": random.randint(21, 28),
                "birthplace": "Unknown",
                "photo": photo_url,
                "overall": overall,
                "tier": tier,
                "originalTeamId": local_team_id,
                "stats": {
                    "goals": 0, "assists": 0, "points": 0, "games": games,
                    "shotsAgainst": 0, "saves": 0, "goalsAgainst": 0
                },
                "attributes": {
                    "skating": { "speed": overall, "agility": overall, "balance": overall, "stamina": overall },
                    "shooting": { "wristShot": overall, "slapShot": overall, "accuracy": overall },
                    "puckSkills": { "passing": overall, "puckControl": overall, "hands": overall }
                }
            }
            if local_team_id not in fphl_rosters:
                fphl_rosters[local_team_id] = []
            fphl_rosters[local_team_id].append(player_obj)
            
        # Merge with existing file to ensure we don't drop teams accidentally if they don't have players listed
        try:
            with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
                existing = json.load(f)
                for t, players in existing.items():
                    if t not in fphl_rosters:
                        fphl_rosters[t] = players
        except: pass
        
        with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
            json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)
        print("Successfully saved data/fphl_rosters.json")

asyncio.run(main())
