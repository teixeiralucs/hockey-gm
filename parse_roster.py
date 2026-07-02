import requests

url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=41b145a848f4bd67&fmt=json&client_code=whl&lang=en&season_id=289&team_id=201"
r = requests.get(url)
roster = r.json()['SiteKit']['Roster']
flat = []
for g in roster:
    if isinstance(g, dict): flat.append(g)
    elif isinstance(g, list): flat.extend(g)
if flat:
    p = flat[0]
    print("Person ID:", p.get('person_id'))
    print("Player ID:", p.get('player_id'))
    print("Photo:", p.get('player_image', 'No image key'))
