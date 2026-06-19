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
teams_url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&season_id=83&league_id=1"
teams_data = fetch_json(teams_url)
api_teams = teams_data['SiteKit']['Teamsbyseason']

# Fetch stats to calculate overalls
print("Fetching OHL Stats...")
stats_url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=topscorers&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&league_code=&season_id=83&first=0&limit=1000"
goalies_url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=goalies&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&league_code=&season_id=83&first=0&limit=100"

player_stats = {}
try:
    scorers = fetch_json(stats_url)['SiteKit']['Statviewtype']
    for s in scorers:
        pid = str(s.get('player_id', ''))
        pts = int(s.get('points', 0))
        goals = int(s.get('goals', 0))
        assists = int(s.get('assists', 0))
        
        # Calculate OVR between 12 and 23
        # Assuming max points around 100
        ovr = 12 + int((pts / 100) * 11)
        if ovr > 23: ovr = 23
        if ovr < 12: ovr = 12
        
        player_stats[pid] = { 'overall': ovr, 'goals': goals, 'assists': assists, 'points': pts }
        
    goalies = fetch_json(goalies_url)['SiteKit']['Statviewtype']
    for g in goalies:
        pid = str(g.get('player_id', ''))
        svp = float(g.get('save_pct', 0.850))
        wins = int(g.get('wins', 0))
        
        # svp ranges usually 0.850 to 0.930. Map to 12-23
        ovr = 12 + int(((svp - 0.850) / (0.930 - 0.850)) * 11)
        if ovr > 23: ovr = 23
        if ovr < 12: ovr = 12
        
        player_stats[pid] = { 'overall': ovr, 'svp': svp, 'wins': wins }
except Exception as e:
    print(f"Error fetching stats: {e}")

all_rosters = {}
total_players = 0

for api_team in api_teams:
    api_team_name = api_team.get('name')
    if not api_team_name:
        api_team_name = f"{api_team.get('city', '')} {api_team.get('nickname', '')}".strip()

    internal_id = TEAM_MAPPING.get(api_team_name)
    if not internal_id: continue

    team_id = api_team['id']
    roster_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&season_id=83&team_id={team_id}"
    
    try:
        data = fetch_json(roster_url)
        roster = data['SiteKit']['Roster']
        if isinstance(roster, list) and len(roster) > 0 and isinstance(roster[0], list):
            flat_roster = []
            for group in roster:
                if isinstance(group, dict): flat_roster.append(group)
                elif isinstance(group, list): flat_roster.extend(group)
            roster = flat_roster

        players = []
        for p in roster:
            if not isinstance(p, dict): continue
            
            birthdate = p.get('birthdate', '')
            age = 18
            if birthdate:
                try:
                    b_date = datetime.datetime.strptime(birthdate, "%Y-%m-%d").date()
                    today = datetime.date.today()
                    age = today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
                except: pass

            person_id = p.get('person_id', '')
            photo = f"https://assets.leaguestat.com/ohl/240x240/{person_id}.jpg"
            pos = p.get('position', 'C')
            if pos == 'D': pos = random.choice(['LD', 'RD'])
            
            pid = str(p.get('player_id', ''))
            
            # Link stats
            stats = player_stats.get(pid, {})
            overall = stats.get('overall', random.randint(12, 14))
            
            # Add tier based on overall
            if overall >= 20: tier = 'gold'
            elif overall >= 16: tier = 'silver'
            else: tier = 'bronze'

            player_data = {
                "id": f"{internal_id}_{pid}",
                "name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
                "number": p.get('tp_jersey_number', '00'),
                "position": pos,
                "age": age,
                "birthplace": p.get('homeplace', 'Canada'),
                "photo": photo,
                "overall": overall,
                "tier": tier,
                "originalTeamId": internal_id,
                "stats": {
                    "goals": stats.get('goals', 0),
                    "assists": stats.get('assists', 0),
                    "points": stats.get('points', 0),
                    "svp": stats.get('svp', 0)
                }
            }
            players.append(player_data)

        all_rosters[internal_id] = players
        total_players += len(players)
    except Exception as e:
        pass

os.makedirs('data', exist_ok=True)
with open('data/rosters.json', 'w') as f:
    json.dump(all_rosters, f, indent=4)

print(f"Successfully saved {total_players} players to data/rosters.json with true Overalls (12-23)")
