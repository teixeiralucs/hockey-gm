import re

with open('scripts/scrape_qmjhl.py', 'r') as f:
    content = f.read()

# Fix player_id -> person_id
content = content.replace(
    "pid = str(p.get('player_id', ''))\n            # LHJMQ assets might be under a different domain",
    "pid = str(p.get('player_id', ''))\n            if not pid: pid = str(p.get('person_id', ''))\n            # LHJMQ assets might be under a different domain"
)
content = content.replace(
    "pid = str(p.get('player_id', ''))\n            stats = player_stats.get(pid, {})",
    "pid = str(p.get('player_id', ''))\n            if not pid: pid = str(p.get('person_id', ''))\n            stats = player_stats.get(pid, {})"
)

with open('scripts/scrape_qmjhl.py', 'w') as f:
    f.write(content)

print("Patched scrape_qmjhl.py")
