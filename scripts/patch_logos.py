import re

path = 'js/main.js'
with open(path, 'r') as f:
    content = f.read()

# Replace all hardcoded assets/logos/ohl/ with dynamic league folder check based on gameState.league
# Since gameState is global in main.js, this is mostly safe, except where gameState might not exist.
# But even if it doesn't, it will fallback to 'ohl'.

def replace_ohl_logo(match):
    return 'assets/logos/${(typeof gameState !== \'undefined\' && gameState && gameState.league === \'whl\') ? \'whl\' : \'ohl\'}/'

# Specifically target the exact hardcoded strings we saw:
content = re.sub(r'assets/logos/ohl/', replace_ohl_logo, content)

with open(path, 'w') as f:
    f.write(content)

print("All remaining hardcoded OHL logos patched!")
