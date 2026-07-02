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

try:
    print("Testing WHL API...")
    url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key=41b145a848f41128&fmt=json&client_code=whl&lang=en&season_id=281&league_id=1"
    data = fetch_json(url)
    teams = data.get('SiteKit', {}).get('Teamsbyseason', [])
    print(f"Found {len(teams)} teams with key 41b145a848f41128 and season 281")
    for t in teams[:5]:
        print(f"- {t.get('city')} {t.get('nickname')}")
except Exception as e:
    print("Failed with 41b145a848f41128:", e)

try:
    print("\nTesting WHL API with OHL key...")
    url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=teamsbyseason&key=2976319eb44abe94&fmt=json&client_code=whl&lang=en&season_id=281&league_id=1"
    data = fetch_json(url)
    teams = data.get('SiteKit', {}).get('Teamsbyseason', [])
    print(f"Found {len(teams)} teams with key 2976319eb44abe94 and season 281")
    for t in teams[:5]:
        print(f"- {t.get('city')} {t.get('nickname')}")
except Exception as e:
    print("Failed with 2976319eb44abe94:", e)
