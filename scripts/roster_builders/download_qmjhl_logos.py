import requests
import os
import json

API_KEY = "f322673b6bcae299"
SEASON_ID = 214

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
    "Titan d'Acadie-Bathurst": "acadie-bathurst",
    "Acadie-Bathurst, Titan": "acadie-bathurst",
    "Acadie-Bathurst Titan": "acadie-bathurst",
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

teams_url = f"https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key={API_KEY}&fmt=json&client_code=lhjmq&lang=en&season_id={SEASON_ID}"
teams_data = fetch_json(teams_url)
api_teams = teams_data['SiteKit']['Teamsbyseason']

os.makedirs("assets/logos/qmjhl", exist_ok=True)

for api_team in api_teams:
    api_team_name = api_team.get('name', '')
    if not api_team_name:
        api_team_name = f"{api_team.get('city', '')} {api_team.get('nickname', '')}".strip()
        
    internal_id = TEAM_MAPPING.get(api_team_name)
    if not internal_id:
        internal_id = TEAM_MAPPING.get(api_team.get('city'))
        
    if not internal_id:
        continue
        
    logo_url = api_team.get('team_logo_url')
    if logo_url:
        print(f"Downloading {internal_id} logo...")
        # usually it's a png or jpg
        ext = logo_url.split('.')[-1]
        res = requests.get(logo_url)
        with open(f"assets/logos/qmjhl/{internal_id}.{ext}", 'wb') as f:
            f.write(res.content)
            
print("Done downloading logos.")
