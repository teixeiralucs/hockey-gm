// rosterUI.js
import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams } from '../../data/teams.js';

let benchSortMetric = 'overall';
let benchSortDesc = true;

window.rosterTab = window.rosterTab || '5v5';
window.rosterLineTab = window.rosterLineTab || 1;

window.setRosterTab = function(tab) {
    window.rosterTab = tab;
    window.rosterLineTab = 1;
    renderRoster(document.getElementById('main-content'), window.gameState);
};

window.setRosterLineTab = function(tab) {
    window.rosterLineTab = tab;
    renderRoster(document.getElementById('main-content'), window.gameState);
};

function renderRinkSlot(slotId, label, gameState) {
    const player = gameState.players.find(p => p.location === slotId);
    
    let roleClass = 'role-offense';
    if (label === 'LD' || label === 'RD' || label === 'D') roleClass = 'role-defense';
    if (label === 'G') roleClass = 'role-goalie';

    return `
        <div class="tactical-slot drop-zone ${roleClass}" data-slot-id="${slotId}" data-filled="${!!player}">
            ${!player ? `<div class="tactical-label">${label}</div>` : ''}
            ${player ? getPlayerMinicardHTML(player) : ''}
        </div>
    `;
}

function getPlayerMinicardHTML(player) {
    let logoUrl = player.photo || 'assets/default-player.svg';
    const playerLeague = typeof qmjhlTeams !== 'undefined' && qmjhlTeams.some(t => t.id === player.originalTeamId) ? 'lhjmq' : 'other';
    const tierColors = {
        'gold': '#fbbf24',
        'silver': '#94a3b8',
        'bronze': '#b45309',
        'c-tier': '#94a3b8'
    };
    const tierColor = tierColors[player.tier?.toLowerCase()] || '#3b82f6';
    const bColor = player.isFPHL ? '#fbbf24' : tierColor;

    const mod = window.getPlayerModifiers(player);
    const finalOVR = Math.round(player.overall * (1 + mod));
    let ovrBgColor = 'var(--team-primary, #3b82f6)';
    if (mod > 0) {
        ovrBgColor = '#10b981';
    } else if (mod < 0) {
        ovrBgColor = '#ef4444';
    }


    const photoFilter = playerLeague === 'lhjmq' ? `object-fit: contain !important; object-position: bottom; background: radial-gradient(circle, ${tierColor}40 0%, rgba(15,23,42,1) 100%); border-bottom: 2px solid ${tierColor};` : '';

    const nameParts = player.name.split(' ');
    const shortName = nameParts.length > 1 ? `${nameParts[0][0]}. ${nameParts[nameParts.length - 1]}` : player.name;

    return `
        <div class="player-minicard player-card" draggable="true" data-player-id="${player.id}" onclick="window.openPlayerCardModal('${player.id}')" style="cursor: pointer; border: 3px solid ${bColor}; padding: 0 !important; background: #0f172a !important; min-height: 0 !important; display: flex; flex-direction: column;">
            <img src="${logoUrl}" alt="${player.name}" onerror="this.src='assets/default-player.svg'" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; clip-path: circle(50%); display: block; margin: 0; padding: 0; ${photoFilter}">
            <div class="minicard-ovr" style="position: absolute; top: -6px; right: -6px; background: ${ovrBgColor}; color: #fff; font-size: 0.88rem; font-weight: bold; width: 27px; height: 27px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #0f172a;">${finalOVR}</div>
            <div class="minicard-name" style="position: absolute; bottom: -8px; background: #0f172a; color: #fff; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; line-height: 1;">${shortName}</div>
        </div>
    `;
}

export function renderRoster(container, gameState) {
    if(!gameState) return;
    const teamOvr = window.getTeamOverall(gameState.team?.id, true);
    let benchPlayers = gameState.players.filter(p => p.location === 'bench');
    
    benchPlayers.sort((a, b) => {
        let valA = a[benchSortMetric] || '';
        let valB = b[benchSortMetric] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return benchSortDesc ? 1 : -1;
        if (valA > valB) return benchSortDesc ? -1 : 1;
        return 0;
    });
    
    let benchHTML = '';
    benchPlayers.forEach(p => {
        benchHTML += window.getPlayerCardHTML(p);
    });

    let rinkContentHTML = '';
    const line = window.rosterLineTab || 1;
    
    rinkContentHTML = `
        <div class="ice-rink" style="flex: 1;">
            <div class="ice-red-line"></div>
            <div class="ice-blue-line-top"></div>
            <div class="ice-blue-line-bottom"></div>
            <div class="faceoff-circle top-left"></div>
            <div class="faceoff-circle top-right"></div>
            <div class="faceoff-circle bottom-left"></div>
            <div class="faceoff-circle bottom-right"></div>
            <div class="faceoff-circle center"></div>
            <div class="goal-crease"></div>

            <div class="rink-row" style="position: absolute; top: 20%; left: 0; width: 100%; height: 0; padding: 0; margin: 0;">
                <div style="position: absolute; left: 22%; top: 0; transform: translate(-50%, -50%);">
                    ${renderRinkSlot(`f_${line}_LW`, 'LW', gameState)}
                </div>
                <div style="position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%);">
                    ${renderRinkSlot(`f_${line}_C`, 'C', gameState)}
                </div>
                <div style="position: absolute; right: 22%; top: 0; transform: translate(50%, -50%);">
                    ${renderRinkSlot(`f_${line}_RW`, 'RW', gameState)}
                </div>
            </div>
            
            ${line <= 3 ? `
            <div class="rink-row" style="position: absolute; bottom: 20%; left: 0; width: 100%; height: 0; padding: 0; margin: 0;">
                <div style="position: absolute; left: 22%; bottom: 0; transform: translate(-50%, 50%);">
                    ${renderRinkSlot(`d_${line}_LD`, 'LD', gameState)}
                </div>
                <div style="position: absolute; right: 22%; bottom: 0; transform: translate(50%, 50%);">
                    ${renderRinkSlot(`d_${line}_RD`, 'RD', gameState)}
                </div>
            </div>
            ` : ''}
            
            ${line <= 2 ? `
            <div class="rink-row" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 0; padding: 0; margin: 0;">
                <div style="position: absolute; left: 50%; bottom: 85px; transform: translate(-50%, 50%);">
                    ${renderRinkSlot(line === 1 ? 'g_1_Starter' : 'g_2_Backup', 'G', gameState)}
                </div>
            </div>
            ` : ''}
        </div>
    `;


    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; height: 100%; padding-bottom: 0;">
            <!-- LEFT COLUMN: ICE + ACTION ZONES -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%; min-height: 0;">
                
                <!-- BENTO 1: HEADER -->
                <div class="bento-card" style="display: flex; justify-content: space-between; flex-direction: row; align-items: center; flex-shrink: 0; padding: 1rem 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        ${(() => {
                            let lFolder = 'ohl';
                            if (typeof qmjhlTeams !== 'undefined' && qmjhlTeams.some(t => t.id === gameState.team?.id)) lFolder = 'qmjhl';
                            else if (typeof whlTeams !== 'undefined' && whlTeams.some(t => t.id === gameState.team?.id)) lFolder = 'whl';
                            else if (typeof fphlTeams !== 'undefined' && fphlTeams.some(t => t.id === gameState.team?.id)) lFolder = 'fphl';
                            const myLogo = gameState.team?.name ? gameState.team.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-') : '';
                            return myLogo ? `<img src="assets/logos/${lFolder}/${myLogo}.png" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">` : '';
                        })()}
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                            <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Lineup</span>
                            <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">ACTIVE ROSTER</h2>
                        </div>
                    </div>
                    
                    <div style="background-color: rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 0.6rem;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">TEAM OVR</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff; line-height: 1;">${teamOvr}</span>
                    </div>
                </div>

                <!-- BENTO 2: LINE TABS -->
                <div class="bento-card" style="padding: 0.6rem 1.5rem; align-self: center; display: flex; justify-content: center; align-items: center; flex-direction: row; flex-shrink: 0;">
                    <div class="standings-tabs" style="display: flex; gap: 0.5rem;">
                        <button onclick="window.setRosterLineTab(1)" class="tab-btn ${window.rosterLineTab === 1 ? 'active' : ''}">Line 1</button>
                        <button onclick="window.setRosterLineTab(2)" class="tab-btn ${window.rosterLineTab === 2 ? 'active' : ''}">Line 2</button>
                        <button onclick="window.setRosterLineTab(3)" class="tab-btn ${window.rosterLineTab === 3 ? 'active' : ''}">Line 3</button>
                        <button onclick="window.setRosterLineTab(4)" class="tab-btn ${window.rosterLineTab === 4 ? 'active' : ''}">Line 4</button>
                    </div>
                </div>

                <!-- BENTO 3: ICE RINK -->
                <div class="bento-card" style="padding: 1.5rem; overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0;">
                    ${rinkContentHTML}
                </div>
            </div>

            <!-- RIGHT COLUMN: BENCH + ACTION ZONES -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%; min-height: 0;">
                
                <!-- BENTO 4: BENCH -->
                <div class="bento-card" style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1; min-height: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 0.5rem;">
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin: 0;">BENCH</h2>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button onclick="window.autoAssignRoster()" class="btn" style="background: var(--team-primary); padding: 0.4rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 0.4rem; height: fit-content; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; color: #fff; cursor: pointer;">
                            <i data-lucide="zap" style="width: 14px; height: 14px;"></i> AUTO-ASSIGN
                        </button>
                        <div style="background: var(--team-primary); padding: 0.4rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; height: fit-content; min-width: 45px;">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff; line-height: 1;">${benchPlayers.length}</span>
                        </div>
                    </div>
                </div>
                
                <!-- BENCH HEADER ROW -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.6rem; color: var(--text-muted); font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                        <span class="bench-sort" data-sort="position" style="width: 24px; cursor: pointer; user-select: none;">P</span>
                        <span class="bench-sort" data-sort="originalTeamId" style="width: 18px; cursor: pointer; user-select: none;">T</span>
                        <span class="bench-sort" data-sort="name" style="cursor: pointer; user-select: none; margin-left: 0.5rem;">NAME</span>
                    </div>
                    <span class="bench-sort" data-sort="overall" style="cursor: pointer; user-select: none; padding-right: 0.5rem;">OVR</span>
                </div>
                
                <div class="drop-zone" data-slot-id="bench" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem; background-color: rgba(0,0,0,0.05); border-radius: 8px; min-height: 200px;">
                    ${benchHTML}
                    ${benchPlayers.length === 0 ? '<p style="color: var(--text-muted); text-align: center; font-size: 1rem; margin-top: 2rem;">Bench is empty. Roster is fully active.</p>' : ''}
                </div>
                </div>

                <!-- ACTION ZONES (SELL / COLLECTION) -->
                <div style="display: flex; gap: 1.5rem; height: 100px; flex-shrink: 0;">
                    <div class="bento-card action-zone drop-zone" data-slot-id="sell" style="flex: 1; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%); border: 1px solid rgba(239, 68, 68, 0.2); border-top: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 8px 32px rgba(239, 68, 68, 0.15); cursor: pointer; transition: all 0.3s ease;">
                        <i data-lucide="coins" style="color: #fca5a5; width: 32px; height: 32px; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fca5a5; margin-top: 0.3rem; text-align: center; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">SELL</span>
                    </div>
                    <div class="bento-card action-zone drop-zone" data-slot-id="collection" style="flex: 1; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.2); border-top: 1px solid rgba(59, 130, 246, 0.4); box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15); cursor: pointer; transition: all 0.3s ease;">
                        <i data-lucide="archive" style="color: #93c5fd; width: 32px; height: 32px; filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #93c5fd; margin-top: 0.3rem; text-align: center; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">COLLECTION</span>
                    </div>
                </div>

            </div>
        </div>
    `;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }

    bindDragAndDropEvents(gameState);
    
    // Bind Bench Sort Events
    container.querySelectorAll('.bench-sort').forEach(th => {
        th.addEventListener('click', (e) => {
            const metric = e.target.getAttribute('data-sort');
            if (benchSortMetric === metric) {
                benchSortDesc = !benchSortDesc;
            } else {
                benchSortMetric = metric;
                benchSortDesc = true;
            }
            renderRoster(container, gameState);
        });
    });
    
}

let draggedPlayerId = null;

function bindDragAndDropEvents(gameState) {
    const cards = document.querySelectorAll('.player-card');
    const dropZones = document.querySelectorAll('.drop-zone');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedPlayerId = card.getAttribute('data-player-id');
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => {
                card.style.opacity = '0.5';
            }, 0);
        });

        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
            dropZones.forEach(z => z.classList.remove('drag-over'));
            draggedPlayerId = null;
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
            if (draggedPlayerId) {
                zone.classList.add('drag-over');
            }
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const targetSlotId = zone.getAttribute('data-slot-id');
            if (!targetSlotId || !draggedPlayerId) return;

            const draggedPlayer = gameState.players.find(p => p.id === draggedPlayerId);
            const originalLocation = draggedPlayer.location;
            
            if (originalLocation === targetSlotId) return; // Dropped in same place
            
            // Handle Drop on Action Zones (Sell / Collection)
            if (targetSlotId === 'sell' || targetSlotId === 'collection') {
                const userActiveCount = gameState.players.filter(p => p.location && !p.location.startsWith('cpu_')).length;
                if (userActiveCount <= 20 && (gameState.coins || 0) < 200) {
                    if (window.openRosterErrorModal) window.openRosterErrorModal();
                    return;
                }
            }
            
            if (targetSlotId === 'sell') {
                if (window.openSellConfirmationModal) window.openSellConfirmationModal(draggedPlayer);
                return;
            } 
            else if (targetSlotId === 'collection') {
                if (window.openCollectionConfirmationModal) window.openCollectionConfirmationModal(draggedPlayer);
                return;
            } 
            else if (targetSlotId === 'bench') {
                draggedPlayer.location = 'bench';
            }
            else {
                if (targetSlotId !== 'bench') {
                    const occupant = gameState.players.find(p => p.location === targetSlotId);
                    if (occupant) {
                        occupant.location = originalLocation;
                    }
                }
                
                draggedPlayer.location = targetSlotId;
            }
            
            const mainContent = document.getElementById('main-content');
            renderRoster(mainContent, gameState);
            if (window.saveGameState) window.saveGameState();
        });
    });
}

export function autoFillRoster(gameState) {
    if (!gameState) return;
    let userPlayers = gameState.players.filter(p => !p.location || !p.location.startsWith('cpu_'));
    
    userPlayers.forEach(p => {
        p.location = 'bench';
    });
    
    let forwards = userPlayers.filter(p => ['C', 'LW', 'RW'].includes(p.position)).sort((a,b) => b.overall - a.overall);
    let defense = userPlayers.filter(p => ['D', 'LD', 'RD'].includes(p.position)).sort((a,b) => b.overall - a.overall);
    let goalies = userPlayers.filter(p => p.position === 'G').sort((a,b) => b.overall - a.overall);
    
    const f_slots = [
        'f_1_LW', 'f_1_C', 'f_1_RW',
        'f_2_LW', 'f_2_C', 'f_2_RW',
        'f_3_LW', 'f_3_C', 'f_3_RW',
        'f_4_LW', 'f_4_C', 'f_4_RW'
    ];
    const d_slots = [
        'd_1_LD', 'd_1_RD',
        'd_2_LD', 'd_2_RD',
        'd_3_LD', 'd_3_RD'
    ];
    const g_slots = [
        'g_1_Starter',
        'g_2_Backup'
    ];

    f_slots.forEach(slot => {
        let exactPos = slot.split('_')[2];
        let p = forwards.find(p => p.location === 'bench' && p.position === exactPos);
        if (!p) p = forwards.find(p => p.location === 'bench'); 
        if (!p) p = userPlayers.find(p => p.location === 'bench' && p.position !== 'G'); 
        if (!p) p = userPlayers.find(p => p.location === 'bench'); 
        if (p) p.location = slot;
    });
    
    d_slots.forEach(slot => {
        let exactPos = slot.split('_')[2];
        let p = defense.find(p => p.location === 'bench' && p.position === exactPos);
        if (!p) p = defense.find(p => p.location === 'bench' && p.position === 'D');
        if (!p) p = defense.find(p => p.location === 'bench');
        if (!p) p = userPlayers.find(p => p.location === 'bench' && p.position !== 'G'); 
        if (!p) p = userPlayers.find(p => p.location === 'bench'); 
        if (p) p.location = slot;
    });
    
    g_slots.forEach(slot => {
        let p = goalies.find(p => p.location === 'bench');
        if (!p) p = userPlayers.find(p => p.location === 'bench'); 
        if (p) p.location = slot;
    });
    
    if (window.saveGameState) window.saveGameState();
    renderRoster(document.getElementById('main-content'), gameState);
}

window.autoAssignRoster = function() {
    autoFillRoster(window.gameState);
};
