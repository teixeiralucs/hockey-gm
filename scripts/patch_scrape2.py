import re

with open('scripts/scrape_qmjhl.py', 'r') as f:
    content = f.read()

content = content.replace("SEASON_ID = 214", "SEASON_ID = 211")

# Also change Acadie-Bathurst to Newfoundland
content = content.replace("'acadie-bathurst', ", "")
content = content.replace("'rimouski', ", "'rimouski', 'newfoundland', ")

content = content.replace('"Titan d\'Acadie-Bathurst": "newfoundland",', '')
content = content.replace('"Acadie-Bathurst, Titan": "newfoundland",', '')
content = content.replace('"Acadie-Bathurst Titan": "newfoundland",', '')

content = content.replace('"Titan d\'Acadie-Bathurst": "acadie-bathurst",', '"Titan d\'Acadie-Bathurst": "newfoundland",')
content = content.replace('"Acadie-Bathurst, Titan": "acadie-bathurst",', '"Acadie-Bathurst, Titan": "newfoundland",')
content = content.replace('"Acadie-Bathurst Titan": "acadie-bathurst",', '"Acadie-Bathurst Titan": "newfoundland",')

with open('scripts/scrape_qmjhl.py', 'w') as f:
    f.write(content)

print("Patched scrape_qmjhl.py")
