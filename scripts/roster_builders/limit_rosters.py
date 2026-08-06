import json

with open('data/fphl_rosters.json', 'r', encoding='utf-8') as f:
    rosters = json.load(f)

for team_id, players in rosters.items():
    # Sort players: Goalies first (to ensure we keep them), then by overall descending
    # Actually, let's just sort by overall descending and make sure we have at least 2 goalies.
    goalies = [p for p in players if p.get('position') == 'G']
    skaters = [p for p in players if p.get('position') != 'G']
    
    goalies.sort(key=lambda x: x.get('overall', 0), reverse=True)
    skaters.sort(key=lambda x: x.get('overall', 0), reverse=True)
    
    # Take top 3 goalies, top 27 skaters
    top_players = goalies[:3] + skaters[:27]
    
    # If total is still > 30, it's exactly 30 unless the team had fewer
    if len(top_players) > 30:
        top_players = top_players[:30]
        
    rosters[team_id] = top_players
    print(f"{team_id}: {len(top_players)} players")

with open('data/fphl_rosters.json', 'w', encoding='utf-8') as f:
    json.dump(rosters, f, indent=4, ensure_ascii=False)
