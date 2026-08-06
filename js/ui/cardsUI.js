import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams, getTeamLogoUrl } from '../../data/teams.js';

window.getPlayerModifiers = function(player) {
    if (!player) return 0;
    
    let buff = 0;
    
    // Permanent Modifiers
    if (player.ageBoosts) {
        buff += player.ageBoosts * 0.05;
    }
    
    let loc = player.location;
    if (!loc || loc === 'bench' || loc === 'sell' || loc === 'collection') {
        return buff; // Return permanent buffs even outside active roster
    }
    
    // 1. Position Check (+15% or -25%)
    let expectedPos = loc.split('_')[2];
    if (expectedPos === 'Starter' || expectedPos === 'Backup') expectedPos = 'G';
    
    let isCorrectPos = false;
    if (expectedPos === 'F1' || expectedPos === 'F2') {
        if (['LW', 'C', 'RW'].includes(player.position)) isCorrectPos = true;
    } else if (expectedPos === 'D') {
        if (['LD', 'RD'].includes(player.position)) isCorrectPos = true;
    } else {
        if (player.position === expectedPos) isCorrectPos = true;
    }
    
    if (isCorrectPos) {
        buff += 0.15;
    } else {
        buff -= 0.25;
    }
    
    // 2. Real Team Synergy (+20%)
    if (player.originalTeamId && player.originalTeamId === currentTeam.id) {
        buff += 0.20;
    }
    
    // 3. Line Chemistry (+15%)
    // Check if any other player on the same line has the same originalTeamId
    const linePrefix = loc.split('_').slice(0, 2).join('_');
    const teammatesOnLine = gameState.players.filter(p => {
        let tLoc = p.location;
        return p.id !== player.id && tLoc && tLoc.startsWith(linePrefix);
    });
    
    const hasChemistry = teammatesOnLine.some(t => t.originalTeamId && t.originalTeamId === player.originalTeamId);
    if (hasChemistry) {
        buff += 0.15;
    }
    
    return buff; // Total multiplier (e.g., +0.15, -0.10, +0.50)
}

window.getPlayerModifiersDetails = function(player) {
    if (!player) return [];
    
    let details = [];
    
    if (player.ageBoosts) {
        details.push({ name: 'Age Growth', value: `+${player.ageBoosts * 5}%`, color: '#f59e0b' });
    }
    
    let loc = player.location;
    if (!loc || loc === 'bench' || loc === 'sell' || loc === 'collection') {
        return details;
    }
    
    let expectedPos = loc.split('_')[2];
    if (expectedPos === 'Starter' || expectedPos === 'Backup') expectedPos = 'G';
    
    let isCorrectPos = false;
    if (expectedPos === 'F1' || expectedPos === 'F2') {
        if (['LW', 'C', 'RW'].includes(player.position)) isCorrectPos = true;
    } else if (expectedPos === 'D') {
        if (['LD', 'RD'].includes(player.position)) isCorrectPos = true;
    } else {
        if (player.position === expectedPos) isCorrectPos = true;
    }
    
    if (isCorrectPos) {
        details.push({ name: 'Right Position', value: '+15%', color: '#10b981' });
    } else {
        details.push({ name: 'Wrong Position', value: '-25%', color: '#ef4444' });
    }
    
    if (player.originalTeamId && typeof currentTeam !== 'undefined' && player.originalTeamId === currentTeam.id) {
        details.push({ name: 'Home Team', value: '+20%', color: '#10b981' });
    }
    
    const linePrefix = loc.split('_').slice(0, 2).join('_');
    const teammatesOnLine = gameState.players.filter(p => {
        let tLoc = p.location;
        return p.id !== player.id && tLoc && tLoc.startsWith(linePrefix);
    });
    
    const hasChemistry = teammatesOnLine.some(t => t.originalTeamId && t.originalTeamId === player.originalTeamId);
    if (hasChemistry) {
        details.push({ name: 'Line Chemistry', value: '+15%', color: '#10b981' });
    }
    
    return details;
}

window.getPlayerCardHTML = function(player) {
    if (!player) return '';
    const posColors = {
        'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#06b6d4',
        'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899'
    };
    const logoPath = getTeamLogoUrl(player.originalTeamId);

    // Determine overall color based on tier
    let tierColorHex = '#8b5cf6'; // bronze fallback (orangeish bronze)
    if (player.tier === 'gold') tierColorHex = '#fbbf24';
    else if (player.tier === 'silver') tierColorHex = '#94a3b8';
    else if (player.tier === 'bronze') tierColorHex = '#b45309';

    // Modifiers Math
    const mod = getPlayerModifiers(player);
    const finalOVR = Math.round(player.overall * (1 + mod));
    let ovrDisplay = `${finalOVR}`;
    let triangle = '';
    
    if (mod > 0) {
        triangle = `<span style="color: #10b981; font-size: 0.8rem; margin-right: 0.2rem;" title="Buffed (+${Math.round(mod*100)}%)">▲</span>`;
    } else if (mod < 0) {
        triangle = `<span style="color: #ef4444; font-size: 0.8rem; margin-right: 0.2rem;" title="Debuffed (${Math.round(mod*100)}%)">▼</span>`;
    }

    return `
        <div class="player-card" draggable="true" data-player-id="${player.id}" onclick="openPlayerCardModal('${player.id}')"
             style="background-color: var(--card-bg, rgba(255,255,255,0.05)); padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid ${posColors[player.position] || 'var(--team-primary)'}; user-select: none; border-top: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-family: 'Blockletter', sans-serif; color: ${posColors[player.position]}; font-size: 1.1rem; width: 24px;">${player.position}</span>
                ${logoPath ? `<img src="${logoPath}" style="height: 18px; object-fit: contain;">` : ''}
                <span style="font-weight: 500; color: var(--text-color); font-size: 0.95rem;">${player.name}</span>
            </div>
            <div style="display: flex; align-items: center;">
                ${triangle}
                <span style="font-family: 'Blockletter', sans-serif; color: ${tierColorHex}; font-size: 1.2rem;">${ovrDisplay}</span>
            </div>
        </div>
    `;
}

window.getTradingCardHTML = function(player, options = {}) {
    if (!player) return '';

    let tierColor = '#8b5cf6'; // default fallback
    let metallicGradient = 'var(--metallic-bronze, linear-gradient(135deg, #cd7f32, #f5deb3, #8b4513, #ffdab9, #a0522d))';
    if (player.tier === 'gold') { 
        tierColor = '#fbbf24'; 
        metallicGradient = 'var(--metallic-gold, linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c))';
    } else if (player.tier === 'silver') { 
        tierColor = '#94a3b8'; 
        metallicGradient = 'var(--metallic-silver, linear-gradient(135deg, #8e9eab, #eef2f3, #757f9a, #d7dde8, #606b80))';
    } else if (player.tier === 'bronze') { 
        tierColor = '#b45309'; 
        metallicGradient = 'var(--metallic-bronze, linear-gradient(135deg, #cd7f32, #f5deb3, #8b4513, #ffdab9, #a0522d))';
    } else if (player.tier === 'c-tier') {
        tierColor = '#94a3b8';
        metallicGradient = 'var(--metallic-silver, linear-gradient(135deg, #8e9eab, #eef2f3, #757f9a, #d7dde8, #606b80))';
    }

    const logoPath = getTeamLogoUrl(player.originalTeamId);

    const fullPositions = {
        'LW': 'Left Wing', 'C': 'Center', 'RW': 'Right Wing',
        'LD': 'Left Defense', 'RD': 'Right Defense', 'G': 'Goalie'
    };
    const posFullName = fullPositions[player.position] || player.position;

    const mod = getPlayerModifiers(player);
    const finalOVR = Math.round(player.overall * (1 + mod));

    const photoUrl = player.photo || 'assets/default-player.svg';
    const playerLeague = qmjhlTeams.some(t => t.id === player.originalTeamId) ? 'lhjmq' : (whlTeams.some(t => t.id === player.originalTeamId) ? 'whl' : 'ohl');

    const scale = options.scale || 1.0;
    const transformStyle = scale !== 1.0 ? `transform: scale(${scale}); transform-origin: center;` : '';
    const heightStyle = options.modal ? 'height: auto; align-self: stretch; width: 100% !important; flex: 1;' : '';
    const hoverClass = options.modal ? 'no-hover' : '';

    return `
        <div class="trading-card-container ${hoverClass}" style="background: ${metallicGradient}; ${transformStyle}; ${heightStyle}" onclick="event.stopPropagation()">
            <div class="trading-card-inner">
                <div class="trading-card-photo-wrap">
                    <img src="${photoUrl}" alt="${player.name}" onerror="this.src='assets/default-player.svg'" class="trading-card-photo">
                    <div class="trading-card-overlay">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.7rem; color: #fff; margin: 0; line-height: 0.9; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">${player.name}</h2>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                            ${logoPath ? `<img src="${logoPath}" style="height: 28px; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8));">` : ''}
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: ${tierColor}; text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${posFullName}</span>
                        </div>
                    </div>
                </div>
                
                <div class="trading-card-stripe" style="background: ${metallicGradient};">
                    <div style="display: flex; flex-direction: column; align-items: center; margin-top: 1rem;">
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 3.0rem; color: #fff; line-height: 0.8; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">${finalOVR}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.0rem; color: rgba(255,255,255,0.8); text-shadow: 0 1px 2px rgba(0,0,0,0.6); margin-top: 5px;">OVR</span>
                    </div>
                    
                    <div style="margin-top: auto; margin-bottom: 1rem; width: 36px; height: 36px; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff;">#${player.number || '00'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.openPlayerCardModal = function(playerId) {
    let player = gameState.players.find(p => p.id === playerId);
    if (!player && window.globalDraftPool) {
        player = window.globalDraftPool.find(p => p.id === playerId);
    }
    if (!player && gameState.collection) {
        player = gameState.collection.find(p => p.id === playerId);
    }
    if (!player) return;
    
    let tierColor = '#8b5cf6'; // default bronze fallback
    if (player.tier === 'gold') { tierColor = '#fbbf24'; }
    else if (player.tier === 'silver') { tierColor = '#94a3b8'; }
    else if (player.tier === 'bronze') { tierColor = '#b45309'; }

    const tradingCardHTML = getTradingCardHTML(player, { modal: true });

    const mod = getPlayerModifiers(player);
    const finalOVR = Math.round(player.overall * (1 + mod));
    const modDetails = getPlayerModifiersDetails(player);
    
    let equationHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.8rem; width: 100%;">
            <div style="text-align: center;">
                <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Base OVR</div>
                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.overall}</div>
            </div>
    `;

    if (modDetails.length > 0) {
        modDetails.forEach(d => {
            equationHTML += `
                <div style="font-size: 1.2rem; color: var(--text-muted); font-family: 'Blockletter', sans-serif;">+</div>
                <div style="text-align: center;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">${d.name}</div>
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: ${d.color};">${d.value}</div>
                </div>
            `;
        });
    } else {
        equationHTML += `
            <div style="font-size: 1.2rem; color: var(--text-muted); font-family: 'Blockletter', sans-serif;">+</div>
            <div style="text-align: center;">
                <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Buffs</div>
                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">0%</div>
            </div>
        `;
    }

    equationHTML += `
        </div>
        <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.05); margin: 1rem 0;"></div>
        <div style="text-align: center; width: 100%;">
            <div style="font-size: 0.75rem; color: ${tierColor}; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Current OVR</div>
            <div style="font-family: 'Blockletter', sans-serif; font-size: 3.2rem; color: ${tierColor}; text-shadow: 0 0 15px ${tierColor}60; line-height: 1;">${finalOVR}</div>
        </div>
    `;

    let teamInfoModal = null;
    if (player.originalTeamId) {
        teamInfoModal = ohlTeams.find(t => t.id === player.originalTeamId);
        if (!teamInfoModal) teamInfoModal = (whlTeams.find(t => t.id === player.originalTeamId) || qmjhlTeams.find(t => t.id === player.originalTeamId) || fphlTeams.find(t => t.id === player.originalTeamId));
    }
    const teamName = teamInfoModal ? teamInfoModal.name : 'Unknown Team';
    const teamColor = teamInfoModal ? teamInfoModal.primaryColor : '#0f172a';

    const modalHTML = `
        <div id="player-modal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div style="display: flex; gap: 2rem; max-width: 1100px; width: 100%; padding: 2rem; align-items: stretch; justify-content: center;" onclick="event.stopPropagation()">
                
                <!-- LEFT COLUMN: CARD + SEASON STATS -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 450px;">
                    <!-- TRADING CARD -->
                    ${tradingCardHTML}
                    
                    <!-- STATS -->
                    ${player.stats ? `
                    <div style="background-color: rgba(15, 23, 42, 0.65); backdrop-filter: blur(12px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <h4 style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: ${tierColor}; margin: 0 0 1rem 0; text-align: center; text-transform: uppercase;">Season Stats</h4>
                        ${player.position === 'G' ? `
                        <div style="display: flex; justify-content: space-between; text-align: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">GP</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.games || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Saves</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.saves || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">SV%</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.shotsAgainst > 0 ? (player.stats.saves / player.stats.shotsAgainst).toFixed(3).replace('0.', '.') : '.000'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">GAA</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.games > 0 ? ((player.stats.goalsAgainst || 0) / player.stats.games).toFixed(2) : '0.00'}</div>
                            </div>
                        </div>
                        ` : `
                        <div style="display: flex; justify-content: space-between; text-align: center;">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">GP</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.games || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">G</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.goals || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">A</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.assists || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">PTS</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff;">${player.stats.points || 0}</div>
                            </div>
                        </div>
                        `}
                    </div>
                    ` : ''}
                </div>
                
                <!-- BENTO STATS -->
                <div class="bento-card" style="display: flex; flex-direction: column; flex: 1; min-width: 500px; background: color-mix(in srgb, ${teamColor} 15%, rgba(15, 23, 42, 0.75)); backdrop-filter: blur(16px); padding: 2rem; border-radius: 16px; border: 1px solid color-mix(in srgb, ${teamColor} 40%, rgba(255,255,255,0.1)); box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 0 60px color-mix(in srgb, ${teamColor} 10%, transparent);" onclick="event.stopPropagation()">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
                        <div>
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">PLAYER INFO</h2>
                            <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0.2rem 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${player.birthplace} • ${player.age} years old • ${teamName}</p>
                        </div>
                        <button class="btn btn-sm" onclick="document.getElementById('player-modal').remove()" style="border: 1px solid rgba(255,255,255,0.2); background: transparent;">Close</button>
                    </div>
                    
                    <!-- OVERALL CALCULATION -->
                    <div style="background-color: rgba(0,0,0,0.3); border-radius: 12px; padding: 1.5rem 1.2rem; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center;">
                        <h4 style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: ${tierColor}; margin: 0 0 1rem 0; text-align: center; text-transform: uppercase; width: 100%;">Overall Rating</h4>
                        ${equationHTML}
                    </div>

                    <!-- ATTRIBUTES -->
                    ${player.attributes ? `
                    <div style="background-color: rgba(0,0,0,0.3); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05); flex: 1;">
                        <h4 style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: ${tierColor}; margin: 0 0 1rem 0; text-align: center; text-transform: uppercase;">Attributes</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; text-align: left;">
                            
                            <!-- SKATING -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Skating</span>
                                    <span style="font-size: 0.95rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.skating.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
                                    <div style="width: ${(player.attributes.skating.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 8px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                                    <span>SPD: <span style="color: #cbd5e1;">${player.attributes.skating.speed}</span></span>
                                    <span>AGI: <span style="color: #cbd5e1;">${player.attributes.skating.agility}</span></span>
                                </div>
                            </div>

                            <!-- CREATIVITY -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Creativity</span>
                                    <span style="font-size: 0.95rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.creativity.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
                                    <div style="width: ${(player.attributes.creativity.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 8px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                                    <span>VIS: <span style="color: #cbd5e1;">${player.attributes.creativity.vision}</span></span>
                                    <span>INT: <span style="color: #cbd5e1;">${player.attributes.creativity.intelligence}</span></span>
                                </div>
                            </div>

                            <!-- SHOOTING -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Shooting</span>
                                    <span style="font-size: 0.95rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.shooting.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
                                    <div style="width: ${(player.attributes.shooting.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 8px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                                    <span>POW: <span style="color: #cbd5e1;">${player.attributes.shooting.power}</span></span>
                                    <span>ACC: <span style="color: #cbd5e1;">${player.attributes.shooting.accuracy}</span></span>
                                </div>
                            </div>

                            <!-- DEFENSE -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Defense</span>
                                    <span style="font-size: 0.95rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.defense.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem;">
                                    <div style="width: ${(player.attributes.defense.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 8px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                                    <span>CON: <span style="color: #cbd5e1;">${player.attributes.defense.contact}</span></span>
                                    <span>POS: <span style="color: #cbd5e1;">${player.attributes.defense.positioning}</span></span>
                                </div>
                            </div>

                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
};

window.openPackRevealModal = function(playerIdsArray) {
    if (!playerIdsArray || playerIdsArray.length === 0) return;
    
    let cardsHTML = '';
    
    playerIdsArray.forEach(playerId => {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Shop cards don't have active modifiers yet, so we disable them and scale them down slightly.
        cardsHTML += getTradingCardHTML(player, { scale: 0.9, showModifiers: false });
    });

    const modalHTML = `
        <div id="pack-modal" class="modal-overlay" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; background-color: rgba(0,0,0,0.85);" onclick="this.remove()">
            <h1 style="font-family: 'Blockletter', sans-serif; font-size: 4rem; color: #fff; margin: 0; text-shadow: 0 0 20px rgba(255,255,255,0.5); letter-spacing: 2px;">PACK OPENED!</h1>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; max-width: 1200px;">
                ${cardsHTML}
            </div>
            <p style="color: var(--text-muted); font-size: 1rem; margin-top: 1rem; opacity: 0.7;">Click anywhere to close</p>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
}


// --- SHOP ENGINE ---
