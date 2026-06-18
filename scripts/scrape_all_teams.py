import urllib.request
import json
import random
import os
import datetime

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        text = response.read().decode('utf-8')
        if text.startswith('null('): text = text[5:-1]
        elif text.startswith('('): text = text[1:-1]
        return json.loads(text)

# Mapeamento do nome da equipe oficial do CHL API para os nossos IDs locais
TEAM_MAPPING = {
    'Brantford Bulldogs': 'brantford',
    'Barrie Colts': 'barrie',
    "Ottawa 67's": 'ottawa',
    'Peterborough Petes': 'peterborough',
    'North Bay Battalion': 'north-bay',
    'Kingston Frontenacs': 'kingston',
    'Niagara IceDogs': 'niagara',
    'Sudbury Wolves': 'sudbury',
    'Brampton Steelheads': 'brampton',
    'Oshawa Generals': 'oshawa',
    'Kitchener Rangers': 'kitchener',
    'Windsor Spitfires': 'windsor',
    'Flint Firebirds': 'flint',
    'London Knights': 'london',
    'Soo Greyhounds': 'soo',
    'Guelph Storm': 'guelph',
    'Saginaw Spirit': 'saginaw',
    'Sarnia Sting': 'sarnia',
    'Erie Otters': 'erie',
    'Owen Sound Attack': 'owen-sound'
}

print("Fetching OHL Teams for Season 83...")

# URL para pegar todos os times da season 83 (2024-2025)
teams_url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&season_id=83&league_id=1"

try:
    teams_data = fetch_json(teams_url)
    api_teams = teams_data['SiteKit']['Teamsbyseason']
except Exception as e:
    print(f"Could not fetch teams list: {e}")
    exit(1)

all_rosters = {}
total_players = 0

for api_team in api_teams:
    api_team_name = api_team.get('name')
    if not api_team_name:
        # Se name vier vazio, junta city e nickname
        api_team_name = f"{api_team.get('city', '')} {api_team.get('nickname', '')}".strip()

    # Match the API team name to our internal ID
    internal_id = TEAM_MAPPING.get(api_team_name)
    if not internal_id:
        print(f"Team mapping not found for API Team: {api_team_name}")
        continue

    team_id = api_team['id']
    print(f"Scraping {api_team_name} (ID: {team_id})...")

    roster_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&season_id=83&team_id={team_id}"
    
    try:
        data = fetch_json(roster_url)
        roster = data['SiteKit']['Roster']
        
        # Flatten se for lista de listas
        if isinstance(roster, list) and len(roster) > 0 and isinstance(roster[0], list):
            flat_roster = []
            for group in roster:
                if isinstance(group, dict):
                    flat_roster.append(group)
                elif isinstance(group, list):
                    flat_roster.extend(group)
            roster = flat_roster

        players = []
        for p in roster:
            if not isinstance(p, dict):
                continue
            
            # Cálculo de Idade
            birthdate = p.get('birthdate', '')
            age = 18
            if birthdate:
                try:
                    b_year = int(birthdate.split('-')[0])
                    b_month = int(birthdate.split('-')[1])
                    b_day = int(birthdate.split('-')[2])
                    b_date = datetime.date(b_year, b_month, b_day)
                    today = datetime.date.today()
                    age = today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
                except:
                    pass

            person_id = p.get('person_id', '')
            photo = f"https://assets.leaguestat.com/ohl/240x240/{person_id}.jpg"
            overall = random.randint(65, 85)
            pos = p.get('position', 'C')
            if pos == 'D': pos = random.choice(['LD', 'RD'])

            player_data = {
                "id": f"{internal_id}_{p.get('player_id', random.randint(1000, 9999))}",
                "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
                "number": p.get('tp_jersey_number', '00'),
                "position": pos,
                "age": age,
                "birthplace": p.get('homeplace', 'Canada'),
                "photo": photo,
                "overall": overall
            }
            players.append(player_data)

        all_rosters[internal_id] = players
        total_players += len(players)
        
    except Exception as e:
        print(f"Failed to fetch roster for {api_team_name}: {e}")

os.makedirs('data', exist_ok=True)
with open('data/rosters.json', 'w') as f:
    json.dump(all_rosters, f, indent=4)

print(f"\nSuccessfully saved {total_players} players across {len(all_rosters)} teams to data/rosters.json")
