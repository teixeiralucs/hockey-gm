import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams } from '../../data/teams.js';
import { renderFreeAgencyPage } from './freeAgencyUI.js';

window.renderShopPage = function(container) {
    window.currentShopTab = window.currentShopTab || 'packs';

    container.innerHTML = `
        <div class="dashboard-bento-grid" style="display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem;">
            
            <!-- HEADER -->
            <div class="bento-card" style="display: flex; justify-content: space-between; flex-direction: row; align-items: center; padding: 1rem 2rem;">
                <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Store</span>
                    <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">HOCKEY SHOP</h2>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    ${window.currentShopTab === 'freeagency' ? `
                    <div style="display: flex; align-items: center; gap: 0.8rem; background-color: rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);" title="Market Refreshes In ${gameState.freeAgencyMarket ? gameState.freeAgencyMarket.nextRefreshGames : 10} Games">
                        <i data-lucide="refresh-cw" style="color: var(--text-muted); width: 18px; height: 18px;"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: var(--text-muted); line-height: 1; letter-spacing: 1px;">REFRESHES IN: <span style="color: #fbbf24;">${gameState.freeAgencyMarket ? gameState.freeAgencyMarket.nextRefreshGames : 10} GAMES</span></span>
                    </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 0.8rem; background-color: rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <i data-lucide="coins" style="color: #fbbf24; width: 20px; height: 20px;"></i>
                        <span id="shop-coins-header-display" style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fbbf24; line-height: 1;">${gameState.coins || 0}</span>
                    </div>
                </div>
            </div>

            <!-- TABS -->
            <div style="display: flex; justify-content: center; width: 100%; margin-bottom: 0.5rem;">
                <div class="bento-card" style="padding: 0.6rem 1.5rem; align-self: center; display: flex; justify-content: center; align-items: center; flex-direction: row; flex-shrink: 0;">
                    <div class="standings-tabs" style="display: flex; gap: 0.5rem;">
                        <button onclick="window.currentShopTab='packs'; renderShopPage(document.getElementById('main-content'))" class="tab-btn ${window.currentShopTab === 'packs' ? 'active' : ''}" style="text-transform: uppercase;">
                            PACKS
                        </button>
                        <button onclick="window.currentShopTab='freeagency'; renderShopPage(document.getElementById('main-content'))" class="tab-btn ${window.currentShopTab === 'freeagency' ? 'active' : ''}" style="text-transform: uppercase;">
                            FREE AGENCY
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="shop-content-area" style="display: flex; flex-direction: column; width: 100%;"></div>
        </div>
    `;

    const contentArea = container.querySelector('#shop-content-area');
    
    if (window.currentShopTab === 'freeagency') {
        if (typeof renderFreeAgencyPage === 'function') {
            renderFreeAgencyPage(contentArea);
        } else {
            contentArea.innerHTML = `<h2 style="color:white; text-align:center; margin-top:2rem;">Free Agency module not loaded.</h2>`;
        }
    } else {
        contentArea.innerHTML = `
            <style>
                .booster-pack {
                    position: relative;
                    width: 100%;
                    min-height: 350px;
                    border-radius: 16px;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    padding: 2rem 1.5rem;
                    overflow: hidden;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    cursor: pointer;
                }
                .booster-pack:hover {
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 20px 30px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.4);
                }
                .booster-pack::before,
                .booster-pack::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 15px;
                    background: repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);
                    z-index: 10;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
                }
                .booster-pack::before { top: 0; border-bottom: 2px solid rgba(0,0,0,0.6); }
                .booster-pack::after { bottom: 0; border-top: 2px solid rgba(0,0,0,0.6); }
                
                .foil-overlay {
                    position: absolute;
                    top: -50%; left: -50%;
                    width: 200%; height: 200%;
                    background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.1) 30%, rgba(255, 255, 255, 0.4) 40%, transparent 50%);
                    transform: rotate(45deg) translateY(-100%);
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    z-index: 5;
                }
                .booster-pack:hover .foil-overlay {
                    transform: rotate(45deg) translateY(100%);
                }
                
                .pack-title { font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.8); letter-spacing: 2px; text-transform: uppercase; margin: 0; text-align: center; line-height: 1.1; z-index: 2; }
                .pack-desc { color: rgba(255,255,255,0.8); font-size: 1.2rem; text-align: center; margin: 0.5rem 0; z-index: 2; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
                .pack-icon { width: 70px; height: 70px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.8)); z-index: 2; margin: auto 0; }
                
                .pack-btn { margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1.5rem; padding: 0.8rem; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 8px; z-index: 2; transition: background 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.4); }
                .booster-pack:hover .pack-btn { background: rgba(0,0,0,0.8); border-color: rgba(255,255,255,0.5); }
                
                /* Gradients with blur behind */
                .pack-standard { background: radial-gradient(circle at 50% 30%, rgba(71,85,105,0.9) 0%, rgba(30,41,59,0.9) 100%); backdrop-filter: blur(10px); border: 2px solid #64748b; }
                .pack-jumbo { background: radial-gradient(circle at 50% 30%, rgba(139,92,246,0.9) 0%, rgba(76,29,149,0.9) 100%); backdrop-filter: blur(10px); border: 2px solid #a78bfa; }
                .pack-forwards { background: radial-gradient(circle at 50% 30%, rgba(239,68,68,0.9) 0%, rgba(127,29,29,0.9) 100%); backdrop-filter: blur(10px); border: 2px solid #f87171; }
                .pack-defense { background: radial-gradient(circle at 50% 30%, rgba(59,130,246,0.9) 0%, rgba(30,58,138,0.9) 100%); backdrop-filter: blur(10px); border: 2px solid #60a5fa; }
                .pack-goalies { background: radial-gradient(circle at 50% 30%, rgba(245,158,11,0.9) 0%, rgba(120,53,15,0.9) 100%); backdrop-filter: blur(10px); border: 2px solid #fbbf24; }
            </style>
            
            <!-- PACKS CONTAINER -->
            <div id="packs-container" style="display: flex; flex-direction: column; gap: 3rem;">
                ${gameState.league === 'fphl' ? `
                    <div>
                        <div style="display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                            <img src="assets/logos/leagues/fphl-logo.png" style="height: 40px; object-fit: contain;">
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; margin: 0; color: #fff;">FPHL Players</h2>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; align-items: stretch;">
                            ${renderPackRow('fphl')}
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                            <img src="assets/logos/leagues/chl-logo.png" style="height: 40px; object-fit: contain;">
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; margin: 0; color: #fff;">CHL Players</h2>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; align-items: stretch;">
                            ${renderPackRow('chl')}
                        </div>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; align-items: stretch;">
                        ${renderPackRow('chl')}
                    </div>
                `}
            </div>
        `;
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function renderPackRow(targetLeague) {
    const isCHL = targetLeague === 'chl';
    const sCost = isCHL ? 150 : 350;
    const jCost = isCHL ? 450 : 850;
    const pCost = isCHL ? 250 : 500;
    
    return `
        <!-- STANDARD PACK -->
        <div class="booster-pack pack-standard" ${((gameState.coins||0) < sCost) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('standard', '${targetLeague}')"`}>
            <div class="foil-overlay"></div>
            <div style="z-index: 2; text-align: center;">
                <h2 class="pack-title">Standard<br>Pack</h2>
                <p class="pack-desc">3 Random Players</p>
            </div>
            <i data-lucide="package" class="pack-icon" style="color: #cbd5e1;"></i>
            <button class="pack-btn">
                <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">${sCost}</span>
            </button>
        </div>

        <!-- JUMBO PACK -->
        <div class="booster-pack pack-jumbo" ${((gameState.coins||0) < jCost) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('jumbo', '${targetLeague}')"`}>
            <div class="foil-overlay"></div>
            <div style="z-index: 2; text-align: center;">
                <h2 class="pack-title">Jumbo<br>Pack</h2>
                <p class="pack-desc" style="color: #ddd6fe;">6 Players (10% ${isCHL ? 'FPHL' : 'ECHL'} Player Chance)</p>
            </div>
            <i data-lucide="layers" class="pack-icon" style="color: #ddd6fe;"></i>
            <button class="pack-btn">
                <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">${jCost}</span>
            </button>
        </div>

        <!-- FORWARDS PACK -->
        <div class="booster-pack pack-forwards" ${((gameState.coins||0) < pCost) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('forwards', '${targetLeague}')"`}>
            <div class="foil-overlay"></div>
            <div style="z-index: 2; text-align: center;">
                <h2 class="pack-title">Forwards<br>Pack</h2>
                <p class="pack-desc" style="color: #fca5a5;">2 Forwards</p>
            </div>
            <i data-lucide="swords" class="pack-icon" style="color: #fca5a5;"></i>
            <button class="pack-btn">
                <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">${pCost}</span>
            </button>
        </div>

        <!-- DEFENSE PACK -->
        <div class="booster-pack pack-defense" ${((gameState.coins||0) < pCost) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('defense', '${targetLeague}')"`}>
            <div class="foil-overlay"></div>
            <div style="z-index: 2; text-align: center;">
                <h2 class="pack-title">Defense<br>Pack</h2>
                <p class="pack-desc" style="color: #93c5fd;">2 Defensemen</p>
            </div>
            <i data-lucide="shield-half" class="pack-icon" style="color: #93c5fd;"></i>
            <button class="pack-btn">
                <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">${pCost}</span>
            </button>
        </div>

        <!-- GOALIE PACK -->
        <div class="booster-pack pack-goalies" ${((gameState.coins||0) < pCost) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('goalies', '${targetLeague}')"`}>
            <div class="foil-overlay"></div>
            <div style="z-index: 2; text-align: center;">
                <h2 class="pack-title">Goalies<br>Pack</h2>
                <p class="pack-desc" style="color: #fcd34d;">2 Goalies</p>
            </div>
            <i data-lucide="hand-grab" class="pack-icon" style="color: #fcd34d;"></i>
            <button class="pack-btn">
                <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">${pCost}</span>
            </button>
        </div>
    `;
}

window.buyPack = function(packType, targetLeague = 'fphl') {
    const isCHL = targetLeague === 'chl';
    const packConfigs = {
        'standard': { cost: isCHL ? 150 : 350, count: 3, filters: null, cTierChance: 0 },
        'jumbo':    { cost: isCHL ? 450 : 850, count: 6, filters: null, cTierChance: 0.10 },
        'forwards': { cost: isCHL ? 250 : 500, count: 2, filters: ['LW', 'C', 'RW'], cTierChance: 0 },
        'defense':  { cost: isCHL ? 250 : 500, count: 2, filters: ['LD', 'RD'], cTierChance: 0 },
        'goalies':  { cost: isCHL ? 250 : 500, count: 2, filters: ['G'], cTierChance: 0 }
    };
    
    const config = packConfigs[packType];
    if (!config) return;

    if ((gameState.coins || 0) < config.cost) {
        if (window.openInsufficientCoinsModal) window.openInsufficientCoinsModal(config.cost);
        else alert("Not enough coins!");
        return;
    }
    
    // Determine available players
    const userPlayers = gameState.players.filter(p => p.teamId === currentTeam.id);
    const activePlayerIds = new Set(userPlayers.map(p => p.id));
    
    let pool = window.globalDraftPool;
    let upgradedPool = [];
    if (window.allPlayersDatabase) {
        if (targetLeague === 'chl') {
            pool = [];
            const chlTeams = [...ohlTeams, ...whlTeams, ...qmjhlTeams].map(t => t.id);
            Object.keys(window.allPlayersDatabase).forEach(teamId => {
                if (chlTeams.includes(teamId)) {
                    pool = pool.concat(window.allPlayersDatabase[teamId]);
                }
            });
            // Upgraded pool for CHL is FPHL
            const fphlTeamsIds = fphlTeams.map(t => t.id);
            Object.keys(window.allPlayersDatabase).forEach(teamId => {
                if (fphlTeamsIds.includes(teamId)) {
                    upgradedPool = upgradedPool.concat(window.allPlayersDatabase[teamId]);
                }
            });
        } else {
            // Upgraded pool for FPHL is ECHL
            const echlTeamsIds = (typeof echlTeams !== 'undefined') ? echlTeams.map(t=>t.id) : [];
            Object.keys(window.allPlayersDatabase).forEach(teamId => {
                if (echlTeamsIds.includes(teamId)) {
                    upgradedPool = upgradedPool.concat(window.allPlayersDatabase[teamId]);
                }
            });
        }
    }
    
    let availablePlayers = pool.filter(p => !activePlayerIds.has(p.id));
    let availableUpgradedPlayers = upgradedPool.filter(p => !activePlayerIds.has(p.id));
    
    if (config.filters) {
        availablePlayers = availablePlayers.filter(p => config.filters.includes(p.position));
    }
    
    if (availablePlayers.length < config.count) {
        openEmptyPoolModal();
        return;
    }
    
    // Deduct coins
    gameState.coins -= config.cost;
    if (window.updateCoinsDisplay) window.updateCoinsDisplay();
    
    // Pick random players
    let drawnIds = [];
    for(let i=0; i<config.count; i++) {
        let isFakeUpgrade = false;
        let isUpgrade = false;
        if (availableUpgradedPlayers.length > 0) {
            isUpgrade = Math.random() < config.cTierChance;
        } else if (targetLeague === 'fphl' && config.cTierChance > 0) {
            isUpgrade = Math.random() < config.cTierChance;
            isFakeUpgrade = isUpgrade;
        }
        
        let sourcePool = (isUpgrade && !isFakeUpgrade) ? availableUpgradedPlayers : availablePlayers;
        
        if(sourcePool.length === 0) {
            sourcePool = availablePlayers;
            if(sourcePool.length === 0) break;
        }
        
        const randomIndex = Math.floor(Math.random() * sourcePool.length);
        const selectedData = sourcePool[randomIndex];
        sourcePool.splice(randomIndex, 1); 
        
        let checkId = isFakeUpgrade ? selectedData.id + "_btier" : selectedData.id;
        let existingPlayer = gameState.players.find(p => p.id === checkId);
        
        if (existingPlayer) {
            existingPlayer.teamId = currentTeam.id;
            existingPlayer.location = 'bench';
            existingPlayer.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }; 
            drawnIds.push(existingPlayer.id);
        } else {
            let newPlayer = {
                id: checkId,
                name: isFakeUpgrade ? selectedData.name + " (B-Tier)" : selectedData.name,
                position: selectedData.position,
                number: selectedData.number,
                photo: selectedData.photo,
                birthplace: selectedData.birthplace,
                age: selectedData.age,
                overall: isFakeUpgrade ? Math.round(selectedData.overall * 1.5) : selectedData.overall,
                tier: isFakeUpgrade ? 'B-Tier' : selectedData.tier,
                originalTeamId: selectedData.originalTeamId,
                teamId: currentTeam.id,
                stats: { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 },
                attributes: JSON.parse(JSON.stringify(selectedData.attributes)),
                location: 'bench'
            };
            
            if (isFakeUpgrade) {
                Object.values(newPlayer.attributes).forEach(category => {
                    for (let key in category) {
                        if (key !== 'total') category[key] = parseFloat((category[key] * 1.5).toFixed(1));
                    }
                });
            }
            
            gameState.players.push(newPlayer);
            drawnIds.push(newPlayer.id);
        }
    }
    
    // Re-render Shop
    const mainContent = document.getElementById('main-content');
    renderShopPage(mainContent);
    
    // Show Premium Modal for all players to celebrate
    if (drawnIds.length > 0) {
        openPackRevealModal(drawnIds);
    }
};

