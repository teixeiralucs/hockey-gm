import re
import os
from PIL import Image

def get_logo_file(name):
    # JavaScript equivalent: team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-')
    # However javascript \s+ means one or more spaces
    s = name.lower().replace("'", "")
    s = re.sub(r'\s+', '-', s)
    return s

qmjhl_teams = [
    # West Conference
    { "id": "blainville-boisbriand", "name": "Blainville-Boisbriand Armada" },
    { "id": "gatineau", "name": "Gatineau Olympiques" },
    { "id": "rouyn-noranda", "name": "Rouyn-Noranda Huskies" },
    { "id": "val-dor", "name": "Val-d'Or Foreurs" },
    { "id": "drummondville", "name": "Drummondville Voltigeurs" },
    { "id": "shawinigan", "name": "Shawinigan Cataractes" },
    { "id": "sherbrooke", "name": "Sherbrooke Phoenix" },
    { "id": "victoriaville", "name": "Victoriaville Tigres" },
    
    # East Conference
    { "id": "baie-comeau", "name": "Baie-Comeau Drakkar" },
    { "id": "chicoutimi", "name": "Chicoutimi Saguenéens" },
    { "id": "quebec", "name": "Quebec Remparts" },
    { "id": "rimouski", "name": "Rimouski Océanic" },
    { "id": "acadie-bathurst", "name": "Acadie-Bathurst Titan" },
    { "id": "cape-breton", "name": "Cape Breton Eagles" },
    { "id": "charlottetown", "name": "Charlottetown Islanders" },
    { "id": "halifax", "name": "Halifax Mooseheads" },
    { "id": "moncton", "name": "Moncton Wildcats" },
    { "id": "saint-john", "name": "Saint John Sea Dogs" }
]

base_dir = "assets/logos/qmjhl"

for team in qmjhl_teams:
    tid = team["id"]
    tname = team["name"]
    expected_filename = get_logo_file(tname) + ".png"
    expected_path = os.path.join(base_dir, expected_filename)
    
    # Find existing file by tid
    found = None
    for ext in ['.png', '.jpg', '.jpeg', '.svg']:
        p = os.path.join(base_dir, tid + ext)
        if os.path.exists(p):
            found = p
            break
            
    if found:
        if found.endswith('.svg'):
            print(f"Skipping SVG {found}, need manual PNG download")
            continue
        elif found.endswith('.jpg') or found.endswith('.jpeg'):
            print(f"Converting {found} to {expected_path}")
            im = Image.open(found)
            im.save(expected_path)
            os.remove(found)
        else:
            if found != expected_path:
                print(f"Renaming {found} to {expected_path}")
                os.rename(found, expected_path)
    else:
        # Maybe it's already renamed?
        if os.path.exists(expected_path):
            print(f"Already correct: {expected_path}")
        else:
            print(f"Missing logo for {tname} ({tid})")

print("Done fixing QMJHL logos.")
