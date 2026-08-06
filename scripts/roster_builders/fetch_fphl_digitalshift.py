import asyncio
import json
import os
import re
from playwright.async_api import async_playwright
import requests
import random
import math

# We can import our known teams list, but since this is python, let's just define the FPHL ids
# mapping based on team names.
TEAM_MAP = {
    "Binghamton": "binghamton",
    "Blue Ridge": "blue-ridge",
    "Carolina": "twin-city", 
    "Danbury": "danbury",
    "Hudson Valley": "indiana", 
    "Motor City": "motor-city",
    "Port Huron": "port-huron",
    "Watertown": "watertown",
    "Athens": "fresno", 
    "Baton Rouge": "baton-rouge-kingfish",
    "Columbus": "columbus",
    "Monroe": "monroe",
    "Dashers": "indiana", 
    "Prowlers": "port-huron",
    "Rockers": "motor-city",
    "Wolves": "watertown",
    "Hat Tricks": "danbury",
    "Zydeco": "baton-rouge-kingfish",
    "Moccasins": "monroe",
    "River Dragons": "columbus"
}

def get_team_id_from_name(name):
    name = name.replace('(', '').replace(')', '')
    for k, v in TEAM_MAP.items():
        if k.lower() in name.lower():
            return v
    
    # Fallback to generating an id
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
        
        print("Loading FPHL stats page to grab ticket...")
        await page.goto("https://www.federalhockey.com/stats", wait_until="networkidle")
        
        if not ticket:
            print("Failed to find ticket.")
            await browser.close()
            return
            
        print(f"Got ticket: {ticket}")
        await browser.close()
        
        headers = {
            "Authorization": f'ticket="{ticket}"',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        print("Fetching players...")
        r = requests.get("https://web.api.digitalshift.ca/partials/stats/players?league_id=182&season_id=10958&status=Active", headers=headers)
        
        if r.status_code != 200:
            print(f"Failed to fetch players. Status: {r.status_code}")
            return
            
        players_data = r.json()
        
        fphl_rosters = {}
        
        for p in players_data:
            # name, team, id, image, position, stats
            # The API gives us basic info, but we need stats to rank them.
            # actually this endpoint /partials/stats/players gives us points and games played!
            
            # Example response object in p:
            # { "id": 123, "first_name": "John", "last_name": "Doe", "team_name": "Danbury Hat Tricks", "position": "F", "games_played": 10, "points": 5, "goals": 2, "assists": 3, "player_image_url": "..." }
            
            team_val = p.get('team')
            if isinstance(team_val, dict):
                team_name = team_val.get('name')
            elif isinstance(team_val, str):
                team_name = team_val
            else:
                team_name = p.get('team_name')
            if not team_name:
                continue
                
            local_team_id = get_team_id_from_name(team_name)
            if local_team_id not in fphl_rosters:
                fphl_rosters[local_team_id] = []
                
            first_name = p.get('first_name', '')
            last_name = p.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            
            pos = p.get('position', 'F')
            if pos == 'F':
                pos = random.choice(['C', 'LW', 'RW'])
            elif pos == 'D':
                pos = 'D'
            elif pos == 'G':
                pos = 'G'
                
            games = p.get('games_played', 0)
            goals = p.get('goals', 0)
            assists = p.get('assists', 0)
            points = p.get('points', 0)
            
            ppg = points / games if games > 0 else 0
            
            # Determine Tier (Gold, Silver, Bronze)
            if pos == 'G':
                wins = p.get('wins', 0)
                sv_pct = p.get('save_percentage', 0.900)
                if sv_pct > 0.920:
                    tier = 'gold'
                    overall = random.randint(58, 62)
                elif sv_pct > 0.905:
                    tier = 'silver'
                    overall = random.randint(53, 57)
                else:
                    tier = 'bronze'
                    overall = random.randint(45, 52)
            else:
                if ppg > 1.2:
                    tier = 'gold'
                    overall = random.randint(58, 62)
                elif ppg > 0.7:
                    tier = 'silver'
                    overall = random.randint(53, 57)
                else:
                    tier = 'bronze'
                    overall = random.randint(45, 52)
            
            photo_url = p.get('player_image_url', p.get('image_url', p.get('photo_url')))
            if not photo_url:
                # Construct CDN URL if possible, otherwise default
                player_id = p.get('id', p.get('player_id'))
                if player_id:
                    photo_url = f"https://digitalshift-stats.us-lax-1.linodeobjects.com/fphl/players/{player_id}.jpg"
                else:
                    photo_url = "assets/default-player.svg"
            
            # If the URL is missing protocol
            if photo_url and photo_url.startswith('//'):
                photo_url = "https:" + photo_url
                
            player_obj = {
                "id": f"{local_team_id}_{full_name.lower().replace(' ', '_').replace('.', '')}",
                "name": full_name,
                "number": str(p.get('jersey_number', random.randint(1, 99))),
                "position": pos,
                "age": random.randint(21, 28),
                "birthplace": p.get('hometown', 'Unknown'),
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
            
        with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
            json.dump(fphl_rosters, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully saved {len(fphl_rosters)} teams to data/fphl_rosters.json")

if __name__ == "__main__":
    asyncio.run(main())
