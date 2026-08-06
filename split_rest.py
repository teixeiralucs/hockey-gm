with open('js/main.js', 'r') as f:
    lines = f.readlines()

standings_start = -1
modals_start = -1
season_start = -1
end_of_file = len(lines)

for i, line in enumerate(lines):
    if line.startswith('let standingsCurrentTab =') and standings_start == -1:
        standings_start = i
    elif line.startswith('function openRosterErrorModal()') and modals_start == -1:
        modals_start = i
    elif line.startswith('function computeSeasonAwards()') and season_start == -1:
        season_start = i

if standings_start != -1 and modals_start != -1 and season_start != -1:
    standings_lines = lines[standings_start:modals_start]
    modals_lines = lines[modals_start:season_start]
    season_lines = lines[season_start:]
    
    # Expose local functions to window
    for idx, L in enumerate(standings_lines):
        if L.startswith('function renderStandingsPage('):
            standings_lines[idx] = 'window.renderStandingsPage = function(' + L.split('(')[1]
        elif L.startswith('function renderCalendarPage('):
            standings_lines[idx] = 'window.renderCalendarPage = function(' + L.split('(')[1]
        elif L.startswith('function renderFullStandings('):
            standings_lines[idx] = 'window.renderFullStandings = function(' + L.split('(')[1]
            
    for idx, L in enumerate(modals_lines):
        if L.startswith('function openRosterErrorModal()'):
            modals_lines[idx] = 'window.openRosterErrorModal = function() {\n'
        elif L.startswith('function openInsufficientCoinsModal('):
            modals_lines[idx] = 'window.openInsufficientCoinsModal = function(' + L.split('(')[1]
        elif L.startswith('function openEmptyPoolModal()'):
            modals_lines[idx] = 'window.openEmptyPoolModal = function() {\n'
        elif L.startswith('function openIncompleteMatchModal()'):
            modals_lines[idx] = 'window.openIncompleteMatchModal = function() {\n'
            
    for idx, L in enumerate(season_lines):
        if L.startswith('function computeSeasonAwards()'):
            season_lines[idx] = 'window.computeSeasonAwards = function() {\n'
        elif L.startswith('function advanceSeasonLogic('):
            season_lines[idx] = 'window.advanceSeasonLogic = function(' + L.split('(')[1]
            
    with open('js/ui/standingsUI.js', 'w') as f:
        f.writelines(standings_lines)
    with open('js/ui/modalsUI.js', 'w') as f:
        f.writelines(modals_lines)
    with open('js/engine/season.js', 'w') as f:
        f.writelines(season_lines)
        
    new_lines = lines[:standings_start]
    
    # Add imports to top
    insert_idx = 0
    for i, line in enumerate(new_lines):
        if line.startswith('import '):
            insert_idx = i + 1
            
    new_lines.insert(insert_idx, "import './ui/standingsUI.js';\n")
    new_lines.insert(insert_idx + 1, "import './ui/modalsUI.js';\n")
    new_lines.insert(insert_idx + 2, "import './engine/season.js';\n")
    
    with open('js/main.js', 'w') as f:
        f.writelines(new_lines)
    print("Spliced standings, modals, and season!")
else:
    print("Could not find boundaries")
    print(standings_start, modals_start, season_start)
