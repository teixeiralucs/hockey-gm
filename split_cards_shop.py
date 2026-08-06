with open('js/main.js', 'r') as f:
    lines = f.readlines()

cards_start = -1
shop_start = -1
shop_end = -1

for i, line in enumerate(lines):
    if line.startswith('function getPlayerModifiers(player) {') and cards_start == -1:
        cards_start = i
    elif line.startswith('window.renderShopPage = function(container) {') and shop_start == -1:
        shop_start = i
    elif line.startswith('// --- MATCH SIMULATION ---') and shop_end == -1:
        shop_end = i
        break

if cards_start != -1 and shop_start != -1 and shop_end != -1:
    cards_lines = lines[cards_start:shop_start]
    shop_lines = lines[shop_start:shop_end]
    
    # Expose local functions to window so main.js can use them
    for i, line in enumerate(cards_lines):
        if line.startswith('function getPlayerModifiers(player) {'):
            cards_lines[i] = 'window.getPlayerModifiers = function(player) {\n'
        elif line.startswith('function getPlayerModifiersDetails(player) {'):
            cards_lines[i] = 'window.getPlayerModifiersDetails = function(player) {\n'
        elif line.startswith('function getPlayerCardHTML(player) {'):
            cards_lines[i] = 'window.getPlayerCardHTML = function(player) {\n'
    
    with open('js/ui/cardsUI.js', 'w') as f:
        f.writelines(cards_lines)
        
    with open('js/ui/shopUI.js', 'w') as f:
        f.writelines(shop_lines)
        
    new_lines = lines[:cards_start] + lines[shop_end:]
    
    # insert imports below the first import
    insert_idx = 0
    for i, line in enumerate(new_lines):
        if line.startswith('import '):
            insert_idx = i + 1
    
    new_lines.insert(insert_idx, "import './ui/cardsUI.js';\n")
    new_lines.insert(insert_idx + 1, "import './ui/shopUI.js';\n")
    
    # We also need to fix calls to getPlayerModifiers and getPlayerCardHTML in main.js
    # Actually if they are attached to window, we can just call them as window.getPlayerModifiers
    # but in JS, a global window.foo can just be called as foo().
    # Let's make sure.
    
    with open('js/main.js', 'w') as f:
        f.writelines(new_lines)
    print("Spliced cards and shop!")
else:
    print("Could not find boundaries")
