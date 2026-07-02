import requests
import json
import random
import datetime

API_KEY = "41b145a848f4bd67"
SEASON_ID = 289

WHL_TEAMS = [
    'prince-albert', 'medicine-hat', 'edmonton', 'calgary', 'brandon',
    'saskatoon', 'regina', 'red-deer', 'moose-jaw', 'swift-current',
    'lethbridge', 'everett', 'penticton', 'prince-george', 'kelowna',
    'kamloops', 'spokane', 'seattle', 'portland', 'victoria',
    'tri-city', 'wenatchee', 'vancouver'
]

TEAM_MAPPING = {
    "Prince Albert Raiders": "prince-albert",
    "Medicine Hat Tigers": "medicine-hat",
    "Edmonton Oil Kings": "edmonton",
    "Calgary Hitmen": "calgary",
    "Brandon Wheat Kings": "brandon",
    "Saskatoon Blades": "saskatoon",
    "Regina Pats": "regina",
    "Red Deer Rebels": "red-deer",
    "Moose Jaw Warriors": "moose-jaw",
    "Swift Current Broncos": "swift-current",
    "Lethbridge Hurricanes": "lethbridge",
    "Everett Silvertips": "everett",
    "Penticton Vees": "penticton",
    "Prince George Cougars": "prince-george",
    "Kelowna Rockets": "kelowna",
    "Kamloops Blazers": "kamloops",
    "Spokane Chiefs": "spokane",
    "Seattle Thunderbirds": "seattle",
    "Portland Winterhawks": "portland",
    "Victoria Royals": "victoria",
    "Tri-City Americans": "tri-city",
    "Wenatchee Wild": "wenatchee",
    "Vancouver Giants": "vancouver"
}

def fetch_json(url):
    r = requests.get(url)
    return r.json()

print("Fetching WHL teams...")
teams_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key={API_KEY}&fmt=json&client_code=whl&lang=en&season_id={SEASON_ID}"
teams_data = fetch_json(teams_url)
api_teams = teams_data['SiteKit']['Teamsbyseason']

print("Fetching WHL stats to generate overalls...")
skaters_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=topscorers&key={API_KEY}&fmt=json&client_code=whl&lang=en&league_code=&season_id={SEASON_ID}&first=0&limit=1000"
goalies_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=statviewtype&type=topgoalies&key={API_KEY}&fmt=json&client_code=whl&lang=en&league_code=&season_id={SEASON_ID}&first=0&limit=200"

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

new_whl_players = []

for api_team in api_teams:
    api_team_name = api_team.get('name')
    if not api_team_name:
        api_team_name = f"{api_team.get('city', '')} {api_team.get('nickname', '')}".strip()

    internal_id = TEAM_MAPPING.get(api_team_name)
    if not internal_id: 
        print(f"Unknown team: {api_team_name}")
        continue

    team_id = api_team['id']
    print(f"Fetching roster for {api_team_name} (ID: {team_id})...")
    roster_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key={API_KEY}&fmt=json&client_code=whl&lang=en&season_id={SEASON_ID}&team_id={team_id}"
    
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
            photo = f"https://assets.leaguestat.com/whl/240x240/{pid}.jpg"
            pos = p.get('position', 'C')
            if pos == 'D': pos = random.choice(['LD', 'RD'])
            
            pid = str(p.get('player_id', ''))
            stats = player_stats.get(pid, {})
            overall = stats.get('overall', random.randint(12, 14))
            
            if overall >= 20: tier = 'gold'
            elif overall >= 16: tier = 'silver'
            else: tier = 'bronze'

            # Assign random detailed attributes that average out to the overall
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
            new_whl_players.append(player_data)
    except Exception as e:
        print(f"Error processing {api_team_name}: {e}")

print(f"Total WHL players fetched: {len(new_whl_players)}")

# Now load the original JSON, remove old WHL dummies, append new ones
rosters_path = 'data/rosters.json'
with open(rosters_path, 'r') as f:
    all_players = json.load(f)

# Keep only OHL teams
final_rosters = {team_id: players for team_id, players in all_players.items() if team_id not in WHL_TEAMS}

# Group new WHL players by team
for p in new_whl_players:
    tid = p['originalTeamId']
    if tid not in final_rosters:
        final_rosters[tid] = []
    final_rosters[tid].append(p)

with open(rosters_path, 'w') as f:
    json.dump(final_rosters, f, indent=4)

print("Saved to data/rosters.json!")
