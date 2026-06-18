import urllib.request
import json
import random
import os
import datetime

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        # The CHL JSON feed has a weird prefix sometimes like "null({"SiteKit": ... })"
        text = response.read().decode('utf-8')
        if text.startswith('null('): text = text[5:-1]
        elif text.startswith('('): text = text[1:-1]
        return json.loads(text)

team_id = 7 # Barrie Colts
roster_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=2976319eb44abe94&fmt=json&client_code=ohl&lang=en&season_id=79&team_id={team_id}"

data = fetch_json(roster_url)

# Print what Roster actually looks like
roster = data['SiteKit']['Roster']
if isinstance(roster, list) and len(roster) > 0 and isinstance(roster[0], list):
    # Sometimes it's a list of [goalies, defense, forwards]
    print("Roster is a list of lists. Flattening...")
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
    
    # Calculate age
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

    # Extract photo URL
    person_id = p.get('person_id', '')
    photo = f"https://assets.leaguestat.com/ohl/240x240/{person_id}.jpg"

    overall = random.randint(65, 85)
    
    pos = p.get('position', 'C')
    # OHL uses standard pos (C, LW, RW, D, G)
    if pos == 'D': pos = random.choice(['LD', 'RD'])

    player_data = {
        "id": f"bc_{p.get('player_id', random.randint(1000, 9999))}",
        "name": f"{p.get('first_name', '')} {p.get('last_name', '')}",
        "number": p.get('tp_jersey_number', '00'),
        "position": pos,
        "age": age,
        "birthplace": p.get('homeplace', 'Canada'),
        "photo": photo,
        "overall": overall
    }
    players.append(player_data)

os.makedirs('data', exist_ok=True)
with open('data/barrie_roster.json', 'w') as f:
    json.dump(players, f, indent=4)

print(f"Successfully saved {len(players)} real players to data/barrie_roster.json")
