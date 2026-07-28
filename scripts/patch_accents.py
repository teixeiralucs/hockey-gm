import os
import re
import glob

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find and replace all logoFile assignments that use the old pattern
    pattern = r"(\.toLowerCase\(\))(\.replace\(/\[\'\]/g,\s*['\"]{2}\))"
    new_content = re.sub(pattern, r"\1.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')\2", content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched accents in {filepath}")

for root, _, files in os.walk('js'):
    for file in files:
        if file.endswith('.js'):
            process_file(os.path.join(root, file))

