// --- SAVE & LOAD SYSTEM ---

window.openSaveModal = function() {
    let slotsHTML = '';
    ['1', '2', '3'].forEach(slot => {
        const saved = localStorage.getItem(`hockeyGmSave_${slot}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const year = data.gameState.seasonYear || new Date().getFullYear();
                const teamName = data.currentTeam ? data.currentTeam.name : 'Unknown Team';
                let logoHtml = '';
                
                if (data.currentTeam && data.currentTeam.name) {
                    const logoName = data.currentTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\\s+/g, '-');
                    const league = (data.gameState && data.gameState.league) ? data.gameState.league : 'ohl';
                    logoHtml = `<img src="assets/logos/${league}/${logoName}.png" style="width: 40px; height: 40px; object-fit: contain; margin-right: 1rem; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));" onerror="this.style.display='none'">`;
                }
                
                slotsHTML += `
                    <div class="save-slot-card" onclick="saveGame('${slot}')" style="background: rgba(255,255,255,0.05); padding: 1.2rem; border-radius: 16px; margin-bottom: 0.8rem; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='var(--primary-color)'; this.style.transform='scale(1.02)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center;">
                            ${logoHtml}
                            <div>
                                <div style="font-family: 'Blockletter', sans-serif; color: #fff; font-size: 1.3rem; letter-spacing: 1px;">SLOT ${slot}: ${teamName.toUpperCase()}</div>
                                <div style="color: var(--accent-color); font-size: 0.85rem; font-weight: bold; text-transform: uppercase;">Year: ${year}</div>
                            </div>
                        </div>
                        <i data-lucide="save" style="width: 24px; height: 24px; color: #f59e0b;"></i>
                    </div>
                `;
            } catch(e) {
                slotsHTML += `<div class="save-slot-card empty" style="background: rgba(239,68,68,0.1); padding: 1.2rem; border-radius: 16px; border: 1px solid #ef4444; color: #f87171; margin-bottom: 0.8rem;">Corrupted Save (${slot})</div>`;
            }
        } else {
            slotsHTML += `
                <div class="save-slot-card empty" onclick="saveGame('${slot}')" style="background: rgba(0,0,0,0.2); padding: 1.2rem; border-radius: 16px; margin-bottom: 0.8rem; cursor: pointer; border: 1px dashed rgba(255,255,255,0.2); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(59,130,246,0.1)'; this.style.borderColor='var(--primary-color)'; this.style.transform='scale(1.02)'" onmouseout="this.style.background='rgba(0,0,0,0.2)'; this.style.borderColor='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'">
                    <div style="font-family: 'Blockletter', sans-serif; color: var(--text-muted); font-size: 1.3rem; letter-spacing: 1px;">EMPTY SLOT ${slot}</div>
                    <i data-lucide="plus-circle" style="width: 24px; height: 24px; color: var(--primary-color);"></i>
                </div>
            `;
        }
    });

    const modalHTML = `
        <div id="save-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: rgba(255, 255, 255, 0.1); width: 600px; max-width: 95%; border-radius: 24px; border-top: 1px solid rgba(255, 255, 255, 0.12); border-left: 1px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5); padding: 2.5rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fff; margin: 0 0 1.5rem 0; text-align: center; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); letter-spacing: 2px;">SAVE GAME</h2>
                
                <div style="margin-bottom: 2rem; max-height: 450px; overflow-y: auto; overflow-x: hidden; padding: 0.5rem;">
                    ${slotsHTML}
                </div>
                
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; text-align: center; display: flex; flex-direction: column; gap: 0.8rem;">
                    <button class="btn btn-primary" onclick="exportSaveFile()" style="width: 100%; background: linear-gradient(90deg, #8b5cf6, #7c3aed); box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4); border: none;"><i data-lucide="download" style="margin-right: 0.5rem; width: 18px; height: 18px; vertical-align: middle;"></i> Export Save to File</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('save-modal').remove()" style="width: 100%; border: 1px solid rgba(255,255,255,0.2); color: #fff;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
}

window.openLoadModal = function() {
    let slotsHTML = '';
    ['auto', '1', '2', '3'].forEach(slot => {
        const saved = localStorage.getItem(`hockeyGmSave_${slot}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const year = data.gameState.seasonYear || new Date().getFullYear();
                const teamName = data.currentTeam ? data.currentTeam.name : 'Unknown Team';
                const dateStr = data.gameState.currentDate ? new Date(data.gameState.currentDate).toLocaleDateString() : 'N/A';
                
                let logoHtml = '';
                if (data.currentTeam && data.currentTeam.name) {
                    const logoName = data.currentTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\\s+/g, '-');
                    const league = (data.gameState && data.gameState.league) ? data.gameState.league : 'ohl';
                    logoHtml = `<img src="assets/logos/${league}/${logoName}.png" style="width: 40px; height: 40px; object-fit: contain; margin-right: 1rem; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));" onerror="this.style.display='none'">`;
                }
                
                slotsHTML += `
                    <div class="save-slot-card" onclick="loadGame('${slot}')" style="background: rgba(255,255,255,0.05); padding: 1.2rem; border-radius: 16px; margin-bottom: 0.8rem; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='var(--primary-color)'; this.style.transform='scale(1.02)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.1)'; this.style.transform='scale(1)'">
                        <div style="display: flex; align-items: center;">
                            ${logoHtml}
                            <div>
                                <div style="font-family: 'Blockletter', sans-serif; color: #fff; font-size: 1.3rem; letter-spacing: 1px;">SLOT ${slot.toUpperCase()}: ${teamName.toUpperCase()}</div>
                                <div style="color: var(--accent-color); font-size: 0.85rem; font-weight: bold; text-transform: uppercase;">Year: ${year} &bull; ${dateStr}</div>
                            </div>
                        </div>
                        <i data-lucide="play" style="width: 24px; height: 24px; color: #10b981; filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.5));"></i>
                    </div>
                `;
            } catch(e) {
                slotsHTML += `<div class="save-slot-card empty" style="background: rgba(239,68,68,0.1); padding: 1.2rem; border-radius: 16px; border: 1px solid #ef4444; color: #f87171; margin-bottom: 0.8rem;">Corrupted Save (${slot})</div>`;
            }
        } else {
            slotsHTML += `
                <div class="save-slot-card empty" style="background: rgba(0,0,0,0.2); padding: 1.2rem; border-radius: 16px; margin-bottom: 0.8rem; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-muted); text-align: center; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">
                    EMPTY SLOT ${slot.toUpperCase()}
                </div>
            `;
        }
    });

    const modalHTML = `
        <div id="load-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: rgba(255, 255, 255, 0.1); width: 600px; max-width: 95%; border-radius: 24px; border-top: 1px solid rgba(255, 255, 255, 0.12); border-left: 1px solid rgba(255, 255, 255, 0.08); border-right: 1px solid rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5); padding: 2.5rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fff; margin: 0 0 1.5rem 0; text-align: center; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); letter-spacing: 2px;">LOAD FRANCHISE</h2>
                
                <div style="margin-bottom: 2rem; max-height: 450px; overflow-y: auto; overflow-x: hidden; padding: 0.5rem;">
                    ${slotsHTML}
                </div>
                
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; text-align: center; display: flex; flex-direction: column; gap: 0.8rem;">
                    <input type="file" id="import-save-file" accept=".json" style="display: none;" onchange="importSaveFile(event)">
                    <button class="btn btn-primary" onclick="document.getElementById('import-save-file').click()" style="width: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4); border: none;"><i data-lucide="upload" style="margin-right: 0.5rem; width: 18px; height: 18px; vertical-align: middle;"></i> Import from File</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('load-modal').remove()" style="width: 100%; border: 1px solid rgba(255,255,255,0.2); color: #fff;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
}

window.exportSaveFile = function() {
    if (!gameState || !currentTeam) return;
    const saveData = {
        gameState: gameState,
        currentTeam: currentTeam
    };
    const jsonStr = JSON.stringify(saveData);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HockeyGM_Save_${currentTeam.name.replace(/\s+/g, '')}_Year${gameState.seasonYear || new Date().getFullYear()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (document.getElementById('save-modal')) document.getElementById('save-modal').remove();
}

window.importSaveFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && data.gameState && data.currentTeam) {
                // Save it to auto slot to serve as the import destination
                localStorage.setItem('hockeyGmSave_auto', JSON.stringify(data));
                if (document.getElementById('load-modal')) document.getElementById('load-modal').remove();
                loadGame('auto');
            } else {
                alert("Invalid save file format.");
            }
        } catch (err) {
            alert("Error reading file.");
        }
    };
    reader.readAsText(file);
}

window.saveGame = function(slotId = 'auto') {
    if (!gameState || !currentTeam) return;
    
    // Create a lean copy of gameState to avoid QuotaExceededError
    // globalDraftPool is loaded directly from rosters.json anyway
    const gameStateCopy = { ...gameState };
    delete gameStateCopy.globalDraftPool;
    
    const saveData = {
        gameState: gameStateCopy,
        currentTeam: currentTeam
    };
    
    try {
        localStorage.setItem(`hockeyGmSave_${slotId}`, JSON.stringify(saveData));
        if (slotId === 'auto') {
            localStorage.setItem('hockeyGmSave', JSON.stringify(saveData));
        }
    } catch (e) {
        console.error("Storage limit reached:", e);
        const toast = document.createElement('div');
        toast.style.cssText = "position: fixed; bottom: 2rem; right: 2rem; background: #ef4444; color: #fff; padding: 1rem 2rem; border-radius: 8px; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; z-index: 9999; box-shadow: 0 5px 15px rgba(0,0,0,0.3);";
        toast.innerHTML = `<i data-lucide="alert-triangle" style="margin-right: 0.5rem; vertical-align: middle;"></i> STORAGE FULL! DATA NOT SAVED.`;
        document.body.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
        return; // Exit without showing success toast
    }
    
    if (document.getElementById('save-modal')) document.getElementById('save-modal').remove();
    
    // Toast notification
    const toast = document.createElement('div');
    toast.style.cssText = "position: fixed; bottom: 2rem; right: 2rem; background: #10b981; color: #fff; padding: 1rem 2rem; border-radius: 8px; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; z-index: 9999; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: opacity 0.5s ease;";
    toast.innerHTML = `<i data-lucide="save" style="margin-right: 0.5rem; vertical-align: middle;"></i> GAME SAVED (SLOT: ${slotId.toUpperCase()})`;
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}

window.loadGame = async function(slotId = 'auto') {
    if (document.getElementById('load-modal')) document.getElementById('load-modal').remove();
    let saved = localStorage.getItem(`hockeyGmSave_${slotId}`);
    
    // Fallback to legacy save
    if (!saved && slotId === 'auto') {
        saved = localStorage.getItem('hockeyGmSave');
    }
    
    if (!saved) return false;
    
    const loadBtn = document.getElementById('league-load');
    if(loadBtn) loadBtn.innerHTML = '<h3 class="team-card-title">LOADING...</h3>';
    
    const data = JSON.parse(saved);
    
    try {
        let tempGameState = data.gameState;
        const rosterFile = tempGameState.league === 'fphl' ? 'data/fphl_rosters.json' : 'data/rosters.json';
        const response = await fetch(rosterFile);
        const allRosters = await response.json();
        let globalDraftPool = [];
        
        let activeTeamsRef = getActiveLeagueTeams(tempGameState);
        let activeTeamIds = activeTeamsRef.map(t => t.id);
        
        Object.keys(allRosters).forEach(teamId => {
            if (activeTeamIds.includes(teamId)) {
                let teamRoster = allRosters[teamId];
                if (teamRoster && teamRoster.length > 0) {
                    globalDraftPool = globalDraftPool.concat(teamRoster);
                }
            }
        });
        
        window.globalDraftPool = globalDraftPool;
    } catch(e) {
        console.error("Failed to load rosters", e);
        if(loadBtn) loadBtn.innerHTML = '<h3 class="team-card-title" style="color: #ef4444;">ERROR</h3>';
        return false;
    }
    
    gameState = data.gameState;
    if (data.currentTeam) {
        currentTeam = data.currentTeam;
    } else if (gameState.team && gameState.team.id) {
        currentTeam = getActiveLeagueTeams().find(t => t.id === gameState.team.id);
    }
    
    // Revive or reset global stats
    if (gameState.globalDraftPool) {
        window.globalDraftPool = gameState.globalDraftPool;
    } else {
        window.globalDraftPool.forEach(p => {
            p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        });
        gameState.globalDraftPool = window.globalDraftPool;
    }
    
    // Revive Date objects
    if (gameState.currentDate) {
        gameState.currentDate = new Date(gameState.currentDate);
    }
    
    // Polyfill for old saves missing freeAgencyMarket
    if (!gameState.freeAgencyMarket) {
        gameState.freeAgencyMarket = {
            players: [],
            nextRefreshGames: 5,
            soldSlots: []
        };
    }
    
    // Use the unified layout function instead of duplicating HTML
    initHomeScreen();
    return true;
}


window.saveGameState = function() {
    if (window.saveGame) window.saveGame();
};
