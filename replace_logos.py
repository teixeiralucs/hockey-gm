import re

with open('js/main.js', 'r') as f:
    content = f.read()

# Replace .svg with .png for the ohl logos
# Specifically targeting paths that look like assets/logos/ohl/something.svg
content = re.sub(r'(assets/logos/ohl/[^.]*)\.svg', r'\1.png', content)

with open('js/main.js', 'w') as f:
    f.write(content)
