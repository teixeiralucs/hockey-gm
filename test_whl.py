import requests

url = "https://lscluster.hockeytech.com/feed/?feed=modulekit&view=roster&key=41b145a5e33a508b&fmt=json&client_code=whl&lang=en&season_id=289&team_id=201"
r = requests.get(url)
print(r.text[:500])

