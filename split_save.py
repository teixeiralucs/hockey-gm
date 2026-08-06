import re

with open('js/main.js', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '// --- SAVE & LOAD SYSTEM ---' in line:
        start_idx = i
    if 'function openSellConfirmationModal' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    save_lines = lines[start_idx:end_idx]
    
    with open('js/core/saveManager.js', 'w') as f:
        f.writelines(save_lines)
        f.write("\nwindow.saveGameState = function() {\n    if (window.saveGame) window.saveGame();\n};\n")
        
    # Remove these lines from main.js, and also remove saveGameState on line 2440
    new_lines = lines[:start_idx] + lines[end_idx:]
    
    # filter out function saveGameState() { ... }
    final_lines = []
    skip = False
    for line in new_lines:
        if 'function saveGameState()' in line:
            skip = True
            continue
        if skip and '}' in line:
            skip = False
            continue
        if skip:
            continue
        final_lines.append(line)
        
    # add import at the top
    final_lines.insert(0, "import './core/saveManager.js';\n")
    
    with open('js/main.js', 'w') as f:
        f.writelines(final_lines)
    print("Spliced save system!")
else:
    print("Could not find boundaries")
