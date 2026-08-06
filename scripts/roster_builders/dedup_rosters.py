import json

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team_id, players in rosters.items():
    seen = set()
    unique_players = []
    
    for p in players:
        name = p['name']
        if name not in seen:
            seen.add(name)
            unique_players.append(p)
            
    # Now enforce the limit of 30 just in case
    goalies = [p for p in unique_players if p.get('position') == 'G']
    skaters = [p for p in unique_players if p.get('position') != 'G']
    
    goalies.sort(key=lambda x: x.get('overall', 0), reverse=True)
    skaters.sort(key=lambda x: x.get('overall', 0), reverse=True)
    
    top_players = goalies[:3] + skaters[:27]
    if len(top_players) > 30:
        top_players = top_players[:30]
        
    rosters[team_id] = top_players
    print(f"{team_id}: {len(unique_players)} unique players -> limited to {len(top_players)}")

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
