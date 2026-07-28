import requests
import json
import random
import datetime

API_KEY = "f322673b6bcae299"
SEASON_ID = 211

# Teams as per Alpha 0.3 plan
QMJHL_TEAMS = [
    'blainville-boisbriand', 'gatineau', 'rouyn-noranda', 'val-dor', 'drummondville',
    'shawinigan', 'sherbrooke', 'victoriaville', 'baie-comeau', 'chicoutimi',
    'quebec', 'rimouski', 'newfoundland', 'cape-breton', 'charlottetown',
    'halifax', 'moncton', 'saint-john'
]

TEAM_MAPPING = {
    "Armada de Blainville-Boisbriand": "blainville-boisbriand",
    "Blainville-Boisbriand, Armada": "blainville-boisbriand",
    "Olympiques de Gatineau": "gatineau",
    "Gatineau, Olympiques": "gatineau",
    "Huskies de Rouyn-Noranda": "rouyn-noranda",
    "Rouyn-Noranda, Huskies": "rouyn-noranda",
    "Foreurs de Val-d'Or": "val-dor",
    "Val-d'Or, Foreurs": "val-dor",
    "Voltigeurs de Drummondville": "drummondville",
    "Drummondville, Voltigeurs": "drummondville",
    "Cataractes de Shawinigan": "shawinigan",
    "Shawinigan, Cataractes": "shawinigan",
    "Phoenix de Sherbrooke": "sherbrooke",
    "Sherbrooke, Phœnix": "sherbrooke",
    "Tigres de Victoriaville": "victoriaville",
    "Victoriaville, Tigres": "victoriaville",
    
    "Drakkar de Baie-Comeau": "baie-comeau",
    "Baie-Comeau, Drakkar": "baie-comeau",
    "Saguenéens de Chicoutimi": "chicoutimi",
    "Chicoutimi, Saguenéens": "chicoutimi",
    "Remparts de Québec": "quebec",
    "Québec, Remparts": "quebec",
    "Océanic de Rimouski": "rimouski",
    "Rimouski, Océanic": "rimouski",
    "Regiment de Newfoundland": "newfoundland",
    "Newfoundland, Regiment": "newfoundland",
    "Newfoundland Regiment": "newfoundland",
    "Eagles do Cape Breton": "cape-breton",
    "Cape Breton, Eagles": "cape-breton",
    "Islanders de Charlottetown": "charlottetown",
    "Charlottetown, Islanders": "charlottetown",
    "Mooseheads de Halifax": "halifax",
    "Halifax, Mooseheads": "halifax",
    "Wildcats de Moncton": "moncton",
    "Moncton, Wildcats": "moncton",
    "Sea Dogs de Saint John": "saint-john",
    "Saint John, Sea Dogs": "saint-john"
}

def fetch_json(url):
    r = requests.get(url)
    return r.json()

print("Fetching QMJHL teams...")
teams_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key={API_KEY}&fmt=json&client_code=lhjmq&lang=en&season_id={SEASON_ID}"
teams_data = fetch_json(teams_url)
api_teams = teams_data['SiteKit']['Teamsbyseason']

print("Fetching QMJHL stats to generate overalls...")
skaters_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=topscorers&key={API_KEY}&fmt=json&client_code=lhjmq&lang=en&league_code=&season_id={SEASON_ID}&first=0&limit=1000"
goalies_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=topgoalies&key={API_KEY}&fmt=json&client_code=lhjmq&lang=en&league_code=&season_id={SEASON_ID}&first=0&limit=200"

player_stats = {}
try:
    skaters = fetch_json(skaters_url)['SiteKit']['Statviewtype']
    for p in skaters:
        pid = str(p.get('player_id', ''))
        pts = int(p.get('points', 0))
        goals = int(p.get('goals', 0))
        assists = int(p.get('assists', 0))
        ovr = 12 + int((pts / 100.0) * 11)
        if ovr > 23: ovr = 23
        if ovr < 12: ovr = 12
        player_stats[pid] = { 'overall': ovr, 'goals': goals, 'assists': assists, 'points': pts }
        
    goalies = fetch_json(goalies_url)['SiteKit']['Statviewtype']
    for g in goalies:
        pid = str(g.get('player_id', ''))
        svp = float(g.get('save_pct', 0.850))
        wins = int(g.get('wins', 0))
        ovr = 12 + int(((svp - 0.850) / (0.930 - 0.850)) * 11)
        if ovr > 23: ovr = 23
        if ovr < 12: ovr = 12
        player_stats[pid] = { 'overall': ovr, 'svp': svp, 'wins': wins }
except Exception as e:
    print(f"Error fetching stats: {e}")

new_qmjhl_players = []

for api_team in api_teams:
    api_team_name = api_team.get('name')
    if not api_team_name:
        api_team_name = f"{api_team.get('city', '')} {api_team.get('nickname', '')}".strip()

    # Try mapping with full name, or fallback to city
    internal_id = TEAM_MAPPING.get(api_team_name)
    if not internal_id:
        print(f"Trying to map by city: {api_team.get('city')}")
        internal_id = TEAM_MAPPING.get(api_team.get('city'))
        
    if not internal_id: 
        print(f"Unknown team: {api_team_name}")
        continue

    team_id = api_team['id']
    print(f"Fetching roster for {api_team_name} (ID: {team_id})...")
    roster_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key={API_KEY}&fmt=json&client_code=lhjmq&lang=en&season_id={SEASON_ID}&team_id={team_id}"
    
    try:
        data = fetch_json(roster_url)
        roster = data['SiteKit']['Roster']
        if isinstance(roster, list) and len(roster) > 0 and isinstance(roster[0], list):
            flat_roster = []
            for group in roster:
                if isinstance(group, dict): flat_roster.append(group)
                elif isinstance(group, list): flat_roster.extend(group)
            roster = flat_roster

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
            pid = str(p.get('player_id', ''))
            if not pid: pid = str(p.get('person_id', ''))
            # LHJMQ assets might be under a different domain but usually ls.s3 or assets.leaguestat.com
            photo = f"https://assets.leaguestat.com/lhjmq/240x240/{pid}.jpg"
            pos = p.get('position', 'C')
            if pos == 'D': pos = random.choice(['LD', 'RD'])
            
            pid = str(p.get('player_id', ''))
            if not pid: pid = str(p.get('person_id', ''))
            stats = player_stats.get(pid, {})
            overall = stats.get('overall', random.randint(12, 14))
            
            if overall >= 20: tier = 'gold'
            elif overall >= 16: tier = 'silver'
            else: tier = 'bronze'

            skating_total = overall
            creativity_total = overall / 2.0
            shooting_total = overall
            defense_total = overall / 2.0

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
                },
                "attributes": {
                    "skating": {
                        "speed": round(skating_total * 0.5, 1),
                        "agility": round(skating_total * 0.5, 1),
                        "total": round(skating_total, 1)
                    },
                    "creativity": {
                        "vision": round(creativity_total * 0.5, 1),
                        "intelligence": round(creativity_total * 0.5, 1),
                        "total": round(creativity_total, 1)
                    },
                    "shooting": {
                        "power": round(shooting_total * 0.5, 1),
                        "accuracy": round(shooting_total * 0.5, 1),
                        "total": round(shooting_total, 1)
                    },
                    "defense": {
                        "contact": round(defense_total * 0.5, 1),
                        "positioning": round(defense_total * 0.5, 1),
                        "total": round(defense_total, 1)
                    }
                }
            }
            new_qmjhl_players.append(player_data)
    except Exception as e:
        print(f"Error processing {api_team_name}: {e}")

print(f"Total QMJHL players fetched: {len(new_qmjhl_players)}")

rosters_path = 'data/rosters.json'
with open(rosters_path, 'r') as f:
    all_players = json.load(f)

# Keep OHL and WHL
final_rosters = {team_id: players for team_id, players in all_players.items() if team_id not in QMJHL_TEAMS}

for p in new_qmjhl_players:
    tid = p['originalTeamId']
    if tid not in final_rosters:
        final_rosters[tid] = []
    final_rosters[tid].append(p)

with open(rosters_path, 'w') as f:
    json.dump(final_rosters, f, indent=4)

print("Saved to data/rosters.json!")
