import os

files_to_update = ['js/ui/setupUI.js', 'js/ui/dashboardUI.js', 'js/main.js']
new_mascots = ", 'Black Bears', 'River Dragons', 'Northern Lights', 'Hat Tricks'"

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We find the closing bracket of the twoWordMascots array
        target = "];"
        if "'Wild', 'Giants'];" in content:
            content = content.replace("'Wild', 'Giants'];", f"'Wild', 'Giants'{new_mascots}];")
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

