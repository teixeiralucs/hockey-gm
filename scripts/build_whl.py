import json
import random
import os

WHL_TEAMS_EAST = [
    ('Prince Albert Raiders', 'prince-albert'),
    ('Medicine Hat Tigers', 'medicine-hat'),
    ('Edmonton Oil Kings', 'edmonton'),
    ('Calgary Hitmen', 'calgary'),
    ('Brandon Wheat Kings', 'brandon'),
    ('Saskatoon Blades', 'saskatoon'),
    ('Regina Pats', 'regina'),
    ('Red Deer Rebels', 'red-deer'),
    ('Moose Jaw Warriors', 'moose-jaw'),
    ('Swift Current Broncos', 'swift-current'),
    ('Lethbridge Hurricanes', 'lethbridge')
]

WHL_TEAMS_WEST = [
    ('Everett Silvertips', 'everett'),
    ('Penticton Vees', 'penticton'),
    ('Prince George Cougars', 'prince-george'),
    ('Kelowna Rockets', 'kelowna'),
    ('Kamloops Blazers', 'kamloops'),
    ('Spokane Chiefs', 'spokane'),
    ('Seattle Thunderbirds', 'seattle'),
    ('Portland Winterhawks', 'portland'),
    ('Victoria Royals', 'victoria'),
    ('Tri-City Americans', 'tri-city'),
    ('Wenatchee Wild', 'wenatchee'),
    ('Vancouver Giants', 'vancouver')
]

# Update teams.js
teams_js_path = 'data/teams.js'
with open(teams_js_path, 'a') as f:
    f.write('\nexport const whlTeams = [\n')
    
    all_teams = []
    for t_name, t_id in WHL_TEAMS_EAST:
        f.write(f"    {{ id: '{t_id}', name: '{t_name}', conference: 'East', division: 'East', colors: {{ primary: '#333333', secondary: '#ffffff' }} }},\n")
        all_teams.append((t_id, t_name, 'East'))
        
    for i, (t_name, t_id) in enumerate(WHL_TEAMS_WEST):
        comma = "," if i < len(WHL_TEAMS_WEST)-1 else ""
        f.write(f"    {{ id: '{t_id}', name: '{t_name}', conference: 'West', division: 'West', colors: {{ primary: '#333333', secondary: '#ffffff' }} }}{comma}\n")
        all_teams.append((t_id, t_name, 'West'))
        
    f.write('];\n')

# Update rosters.json
rosters_path = 'data/rosters.json'
with open(rosters_path, 'r') as f:
    rosters = json.load(f)

first_names = ["Jackson", "Logan", "Lucas", "Liam", "Oliver", "Ethan", "Aiden", "Noah", "Caleb", "Mason", "Wyatt", "Carter", "Owen", "Dylan", "Luke", "Gavin", "Levi", "Isaac", "Eli", "Hunter"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]

for t_id, t_name, conf in all_teams:
    team_roster = []
    for _ in range(22):
        pos = random.choice(['C', 'C', 'LW', 'LW', 'RW', 'RW', 'LD', 'RD', 'G'])
        overall = random.randint(12, 16)
        
        tier = 'bronze'
        if overall >= 20: tier = 'gold'
        elif overall >= 16: tier = 'silver'
        
        player = {
            "id": f"{t_id}_{random.randint(10000, 99999)}",
            "name": f"{random.choice(first_names)} {random.choice(last_names)}",
            "number": str(random.randint(1, 99)),
            "position": pos,
            "age": random.randint(16, 20),
            "birthplace": "Canada",
            "photo": "assets/default-player.svg",
            "overall": overall,
            "tier": tier,
            "originalTeamId": t_id,
            "stats": {
                "goals": random.randint(0, 5),
                "assists": random.randint(0, 5),
                "points": random.randint(0, 10),
                "svp": random.uniform(0.850, 0.900) if pos == 'G' else 0
            }
        }
        team_roster.append(player)
        
    rosters[t_id] = team_roster

with open(rosters_path, 'w') as f:
    json.dump(rosters, f, indent=4)

print("Added WHL teams to teams.js and generated dummy rosters in rosters.json")
