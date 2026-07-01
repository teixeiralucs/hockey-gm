import { ohlTeams } from '../../data/teams.js';

let currentStandingsTab = 'division';
let standingsGroupSortStates = {}; // Stores { metric, desc } per group ID
let currentLeaderTab = 'pts';
let currentTeamStarTab = 'pts';

let localGameState = null;
let localCurrentTeam = null;


export function renderDashboard(container, gameState, currentTeam) {
    localGameState = gameState;
    localCurrentTeam = currentTeam;

    // No need to default currentStandingsConf here anymore

    const logoFile = currentTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    
    // Find Next Match
    let nextMatchObj = null;
    let nextMatchDateStr = '';
    let daysToSimulate = 0;
    
    if (gameState.schedule && gameState.schedule.length > 0) {
        for (let i = gameState.currentScheduleDayIndex; i < gameState.schedule.length; i++) {
            let day = gameState.schedule[i];
            let match = day.matches.find(m => m.homeId === currentTeam.id || m.awayId === currentTeam.id);
            if (match && !match.played) {
                nextMatchObj = match;
                
                let mDate = new Date(day.date);
                const d = mDate.getDate();
                let suffix = 'th';
                if (d % 10 === 1 && d !== 11) suffix = 'st';
                else if (d % 10 === 2 && d !== 12) suffix = 'nd';
                else if (d % 10 === 3 && d !== 13) suffix = 'rd';
                
                const dayName = mDate.toLocaleDateString('en-US', { weekday: 'long' });
                const monthName = mDate.toLocaleDateString('en-US', { month: 'short' });
                nextMatchDateStr = `${dayName}, ${monthName} ${d}${suffix}`;
                
                daysToSimulate = i - gameState.currentScheduleDayIndex;
                break;
            }
        }
    } else if (gameState.nextMatch) {
        // Fallback for old saves
        nextMatchObj = gameState.nextMatch;
        nextMatchDateStr = 'TODAY';
    }

    // Formatar a data atual do jogo
    const d = gameState.currentDate.getDate();
    let suffix = 'th';
    if (d % 10 === 1 && d !== 11) suffix = 'st';
    else if (d % 10 === 2 && d !== 12) suffix = 'nd';
    else if (d % 10 === 3 && d !== 13) suffix = 'rd';
    
    const dayName = gameState.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = gameState.currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = gameState.currentDate.getFullYear();
    const dateStr = `${dayName}. ${monthName} ${d}${suffix}, ${year}`;
    
    let matchHTML = '';
    
    if (nextMatchObj) {
        const awayTeam = ohlTeams.find(t => t.id === nextMatchObj.awayId);
        const homeTeam = ohlTeams.find(t => t.id === nextMatchObj.homeId);
        const awayLogo = awayTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        const homeLogo = homeTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        const awayStandings = gameState.standings.find(s => s.teamId === awayTeam.id) || {w:0, l:0, otl:0};
        const homeStandings = gameState.standings.find(s => s.teamId === homeTeam.id) || {w:0, l:0, otl:0};
        
        const awayOvr = window.getTeamOverall ? window.getTeamOverall(awayTeam.id, awayTeam.id === currentTeam.id) : 60;
        const homeOvr = window.getTeamOverall ? window.getTeamOverall(homeTeam.id, homeTeam.id === currentTeam.id) : 60;
        
        let buttonHTML = '';
        if (daysToSimulate > 0) {
            buttonHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center; width: 100%;">
                    <button class="btn" onclick="simulateBackgroundDays(${daysToSimulate})" style="width: 60%; border: none; font-size: 1.1rem; letter-spacing: 1px; background: var(--team-primary); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff; padding: 0.8rem; border-radius: 12px;">
                        <i data-lucide="fast-forward" style="width: 20px; height: 20px;"></i> SIMULATE WEEK
                    </button>
                    <button class="btn" onclick="simulateToPlayoffs()" style="width: 60%; border: 1px solid rgba(255,255,255,0.1); background: transparent; font-size: 0.8rem; color: var(--text-muted); padding: 0.4rem; border-radius: 12px;">
                        DEBUG: SKIP TO PLAYOFFS
                    </button>
                </div>
            `;
        } else {
            buttonHTML = `
                <div style="display: flex; justify-content: center; width: 100%;">
                    <button class="btn" onclick="startMatchSimulation()" style="width: 70%; border: none; font-size: 1.3rem; letter-spacing: 2px; background: linear-gradient(90deg, ${awayTeam.colors.primary} 0%, ${homeTeam.colors.primary} 100%); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff; padding: 1rem; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                        <i data-lucide="play-circle" style="width: 24px; height: 24px;"></i> PLAY MATCH
                    </button>
                </div>
            `;
        }

        let matchTitle = 'Next Match';
        if (nextMatchObj.isPlayoff && gameState.playoffs) {
            let series = gameState.playoffs.series.find(s => s.id === nextMatchObj.seriesId);
            if (series) {
                let highTeamStr = series.highSeedId === homeTeam.id ? homeTeam.name.split(' ').slice(-1) : (series.highSeedId === awayTeam.id ? awayTeam.name.split(' ').slice(-1) : 'HIGH');
                let lowTeamStr = series.lowSeedId === homeTeam.id ? homeTeam.name.split(' ').slice(-1) : (series.lowSeedId === awayTeam.id ? awayTeam.name.split(' ').slice(-1) : 'LOW');
                
                let scoreText = '';
                if (series.highSeedWins === series.lowSeedWins) {
                    scoreText = `Tied ${series.highSeedWins}-${series.lowSeedWins}`;
                } else if (series.highSeedWins > series.lowSeedWins) {
                    scoreText = `${highTeamStr} ${series.highSeedWins}-${series.lowSeedWins}`;
                } else {
                    scoreText = `${lowTeamStr} ${series.lowSeedWins}-${series.highSeedWins}`;
                }
                matchTitle = `Game ${nextMatchObj.gameNum} <br><span style="font-size: 1rem; color: var(--text-muted);">${scoreText}</span>`;
            }
        }

        matchHTML = `
            <div style="display: flex; justify-content: space-around; align-items: center; flex: 1; margin-bottom: 2rem; margin-top: 1rem;">
                <!-- Away Team -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 35%;">
                    <img src="assets/logos/ohl/${awayLogo}.png" alt="Away Logo" style="width: 110px; height: 110px; object-fit: contain; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.4));">
                    <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                        <span style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${awayTeam.name.split(' ').slice(0, -1).join(' ')}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-color); text-align: center;">${awayTeam.name.split(' ').slice(-1).join(' ')}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; align-items: center; margin-top: 0.2rem;">
                        <span style="color: rgba(255,255,255,0.95); font-size: 1rem; font-weight: 700;">${awayStandings.w}-${awayStandings.l}-${awayStandings.otl}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff; background: var(--team-primary); padding: 0.2rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3);">OVR ${awayOvr}</span>
                    </div>
                </div>
                
                <!-- Center Info -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 30%;">
                    <h3 style="margin: 0 0 0.3rem 0; font-family: 'Blockletter', sans-serif; font-size: 1.8rem; color: var(--team-primary); letter-spacing: 1px; text-transform: uppercase; text-align: center;">${matchTitle}</h3>
                    <span style="color: #fff; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; margin-bottom: 1.2rem; opacity: 0.9;">${nextMatchDateStr}</span>
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: rgba(255,255,255,0.15);">VS</div>
                </div>
                
                <!-- Home Team -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 35%;">
                    <img src="assets/logos/ohl/${homeLogo}.png" alt="Home Logo" style="width: 110px; height: 110px; object-fit: contain; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.4));">
                    <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                        <span style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${homeTeam.name.split(' ').slice(0, -1).join(' ')}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-color); text-align: center;">${homeTeam.name.split(' ').slice(-1).join(' ')}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; align-items: center; margin-top: 0.2rem;">
                        <span style="color: rgba(255,255,255,0.95); font-size: 1rem; font-weight: 700;">${homeStandings.w}-${homeStandings.l}-${homeStandings.otl}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff; background: var(--team-primary); padding: 0.2rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3);">OVR ${homeOvr}</span>
                    </div>
                </div>
            </div>
            
            ${buttonHTML}
        `;
    } else {
        if (!gameState.playoffs) {
            matchHTML = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <i data-lucide="calendar-check" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24;">REGULAR SEASON COMPLETED</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5; max-width: 60%;">You have completed all 68 games of the regular season.</p>
                    <button class="btn" onclick="startPlayoffs()" style="width: 80%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        START PLAYOFFS
                    </button>
                </div>
            `;
        } else if (gameState.playoffs.isActive) {
            matchHTML = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <i data-lucide="trophy" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24;">PLAYOFFS IN PROGRESS</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5; max-width: 60%;">You are waiting for the next round or have been eliminated. Simulate the remaining matches.</p>
                    <button class="btn" onclick="simulateBackgroundDays(7)" style="width: 80%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        SIMULATE WEEK
                    </button>
                </div>
            `;
        } else {
            matchHTML = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center; justify-content: center; text-align: center; height: 100%;">
                    <i data-lucide="award" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24;">CHAMPION CROWNED</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5; max-width: 60%;">The playoffs have concluded.</p>
                    <button class="btn" onclick="advanceSeason()" style="width: 80%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        ENTER OFFSEASON
                    </button>
                </div>
            `;
        }
    }
    
    // Calcula quantos jogos faltam
    let playedGames = (gameState.record.wins || 0) + (gameState.record.losses || 0) + (gameState.record.otl || 0);
    
    container.innerHTML = `
        <div class="dashboard-bento-grid" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5rem; padding-bottom: 3rem;">
            
            <!-- Left Column (8 cols) -->
            <div style="grid-column: span 8; display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Context Header -->
                <div class="bento-card bento-header" style="justify-content: space-between; flex-direction: row; align-items: center; padding: 1rem 2rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                        <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Match ${playedGames + 1} of ${gameState.totalMatches || 68}</span>
                        <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">${dateStr}</h2>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; display: flex; align-items: center; gap: 0.6rem; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fbbf24;">
                            <i data-lucide="coins" style="width: 20px; height: 20px;"></i>
                            <span id="user-coins" class="coins-amount">${localGameState.coins || 0}</span>
                        </div>
                        <div id="notification-bell" style="position: relative; cursor: pointer; color: #fff; transition: all 0.2s ease; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 12px;">
                            <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
                            <span id="notification-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.8rem; font-weight: bold; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">0</span>
                        </div>
                    </div>
                </div>

                <!-- Next Match Hero -->
                <div class="bento-card bento-match">
                    ${matchHTML}
                </div>
                
                <!-- Standings Table -->
                <div class="bento-card bento-standings" id="standings-container">
                    <!-- Generated by renderStandings() -->
                </div>
            </div>

            <!-- Right Column (4 cols) -->
            <div style="grid-column: span 4; display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Team Identity -->
                <div class="bento-card bento-identity" style="flex-direction: row; align-items: center; justify-content: center; text-align: left; gap: 1.2rem; padding: 1rem;">
                    <img src="assets/logos/ohl/${logoFile}.png" alt="${currentTeam.name} Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));">
                    <div style="display: flex; flex-direction: column; justify-content: center;">
                        <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.4rem; line-height: 1.1;">${currentTeam.name}</h3>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem;">
                            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Record:</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: var(--text-color);">${gameState.record.wins}-${gameState.record.losses}-${gameState.record.otl}</span>
                        </div>
                    </div>
                </div>

                <!-- Team Stars -->
                <div class="bento-card bento-team-stars" id="team-stars-container">
                    <!-- Generated by renderTeamStars() -->
                </div>
                
                <!-- League Leaders -->
                <div class="bento-card bento-leaders" id="league-leaders-container">
                    <!-- Generated by renderLeagueLeaders() -->
                </div>
            </div>

        </div>
    `;
    
    // Inject components
    renderStandings();
    renderLeagueLeaders();
    renderTeamStars();
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function sortStandingsArray(arr, metric, desc) {
    return arr.sort((a, b) => {
        let valA = a[metric];
        let valB = b[metric];
        
        // Handle ties
        if (valA === valB) {
            if (a.w !== b.w) return b.w - a.w; // Tiebreaker 1: Wins
            if (a.otl !== b.otl) return b.otl - a.otl; // Tiebreaker 2: OTL > L
            if (a.pts !== b.pts) return b.pts - a.pts; // Fallback
        }
        
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
    });
}

function renderStandings() {
    const container = document.getElementById('standings-container');
    if (!container) return;
    try {
        const renderTable = (teamsData, isCompact = false, groupId = 'league') => {
            let rowsHTML = '';
            teamsData.forEach((s) => {
                const teamInfo = ohlTeams.find(t => t.id === s.teamId);
                const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
                const isActiveTeam = teamInfo.id === localCurrentTeam.id;
                
                let streakText = '-';
                if (typeof s.streak === 'string') {
                    streakText = s.streak;
                } else if (typeof s.streak === 'object' && s.streak !== null) {
                    streakText = (s.streak.type === 'W' || s.streak.type === 'L') ? s.streak.type + s.streak.count : '-';
                } else if (typeof s.streak === 'number') {
                    streakText = s.streak > 0 ? 'W' + s.streak : (s.streak < 0 ? 'L' + Math.abs(s.streak) : '-');
                }
                
                rowsHTML += `
                    <tr class="${isActiveTeam ? 'team-row-active' : ''}">
                        <td style="color: rgba(255,255,255,0.6); font-family: 'Blockletter', sans-serif;">${s.rank}</td>
                        <td class="team-cell" style="text-align: left;">
                            <img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 20px; height: 20px;">
                            <span style="font-weight: 500; font-size: 0.95rem;">${teamInfo.name}</span>
                        </td>
                        <td>${s.gp || 0}</td>
                        <td style="font-weight: bold; color: #fff;">${s.pts || 0}</td>
                        ${isCompact ? '' : `<td>${s.w || 0}</td><td>${s.l || 0}</td><td>${s.otl || 0}</td><td>${s.gf || 0}</td><td>${s.ga || 0}</td>`}
                        <td style="color: ${((s.gf || 0) - (s.ga || 0)) > 0 ? '#10b981' : ((s.gf || 0) - (s.ga || 0)) < 0 ? '#ef4444' : 'var(--text-muted)'}">${((s.gf || 0) - (s.ga || 0)) > 0 ? '+' : ''}${((s.gf || 0) - (s.ga || 0))}</td>
                        <td><span style="font-size: 0.85rem; padding: 2px 6px; border-radius: 4px; background: ${streakText.startsWith('W') ? 'rgba(16,185,129,0.2)' : streakText.startsWith('L') ? 'rgba(239,68,68,0.2)' : 'transparent'}; color: ${streakText.startsWith('W') ? '#10b981' : streakText.startsWith('L') ? '#ef4444' : '#a1a1aa'}">${streakText}</span></td>
                    </tr>
                `;
            });
            
            return `
                <table class="standings-table" data-group="${groupId}">
                    <thead>
                        <tr>
                            <th style="width: 30px; cursor: pointer;" data-sort="rank" title="Sort by Rank">#</th>
                            <th style="text-align: left; cursor: pointer;" data-sort="teamName">Team</th>
                            <th data-sort="gp" style="cursor: pointer;">P</th>
                            <th data-sort="pts" style="cursor: pointer;">Pts</th>
                            ${isCompact ? '' : `<th data-sort="w" style="cursor: pointer;">W</th><th data-sort="l" style="cursor: pointer;">L</th><th data-sort="otl" style="cursor: pointer;">OTL</th><th data-sort="gf" style="cursor: pointer;">GF</th><th data-sort="ga" style="cursor: pointer;">GA</th>`}
                            <th data-sort="gd" style="cursor: pointer;">GD</th>
                            <th style="cursor: default;">STRK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            `;
        };

        let contentHTML = '';
        
        const sortAndRankGroup = (teamsData, groupId) => {
            teamsData.forEach(s => {
                s.pts = ((s.w || 0) * 2) + (s.otl || 0);
                s.gd = (s.gf || 0) - (s.ga || 0);
                let tInfo = ohlTeams.find(t => t.id === s.teamId);
                s.teamName = tInfo ? tInfo.name : 'Unknown';
            });
            
            const trueRankArray = [...teamsData].sort((a, b) => {
                if (a.pts !== b.pts) return b.pts - a.pts;
                if (a.w !== b.w) return b.w - a.w;
                if (a.otl !== b.otl) return b.otl - a.otl;
                if (a.gd !== b.gd) return b.gd - a.gd;
                return 0;
            });
            trueRankArray.forEach((s, idx) => s.rank = idx + 1);
            
            let sortState = standingsGroupSortStates[groupId] || { metric: 'pts', desc: true };
            let sorted = sortStandingsArray(teamsData, sortState.metric, sortState.desc);
            
            if (sortState.metric === 'rank') {
                sorted = [...teamsData].sort((a, b) => sortState.desc ? b.rank - a.rank : a.rank - b.rank);
            }
            return sorted;
        };

        if (currentStandingsTab === 'league') {
            let sorted = sortAndRankGroup(localGameState.standings, 'league');
            contentHTML = `
                <div class="standings-grid-1">
                    <div class="standings-group-card">
                        <div class="standings-group-header">League Standings</div>
                        ${renderTable(sorted, false, 'league')}
                    </div>
                </div>
            `;
        } else if (currentStandingsTab === 'conference') {
            let eastTeams = localGameState.standings.filter(s => { let t = ohlTeams.find(x => x.id === s.teamId); return t && t.conference === 'East'; });
            let westTeams = localGameState.standings.filter(s => { let t = ohlTeams.find(x => x.id === s.teamId); return t && t.conference === 'West'; });
            
            contentHTML = `
                <div class="standings-grid-2">
                    <div class="standings-group-card">
                        <div class="standings-group-header">East Conference</div>
                        ${renderTable(sortAndRankGroup(eastTeams, 'conf_east'), true, 'conf_east')}
                    </div>
                    <div class="standings-group-card">
                        <div class="standings-group-header">West Conference</div>
                        ${renderTable(sortAndRankGroup(westTeams, 'conf_west'), true, 'conf_west')}
                    </div>
                </div>
            `;
        } else {
            let divisions = ['East', 'Central', 'Midwest', 'West'];
            let gridCards = divisions.map(div => {
                let divTeams = localGameState.standings.filter(s => { let t = ohlTeams.find(x => x.id === s.teamId); return t && t.division === div; });
                let groupId = `div_${div.toLowerCase()}`;
                return `
                    <div class="standings-group-card">
                        <div class="standings-group-header">${div} Division</div>
                        ${renderTable(sortAndRankGroup(divTeams, groupId), true, groupId)}
                    </div>
                `;
            }).join('');
            contentHTML = `<div class="standings-grid-4">${gridCards}</div>`;
        }
        
        container.innerHTML = `
            <div class="standings-header" style="padding-left: 1.5rem; padding-right: 1.5rem;">
                <h2 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Standings</h2>
                <div class="standings-tabs">
                    <button class="tab-btn ${currentStandingsTab === 'division' ? 'active' : ''}" data-tab="division">Division</button>
                    <button class="tab-btn ${currentStandingsTab === 'conference' ? 'active' : ''}" data-tab="conference">Conference</button>
                    <button class="tab-btn ${currentStandingsTab === 'league' ? 'active' : ''}" data-tab="league">League</button>
                </div>
            </div>
            ${contentHTML}
        `;
        
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentStandingsTab = e.target.getAttribute('data-tab');
                renderStandings();
            });
        });
        
        container.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                const metric = e.target.getAttribute('data-sort');
                const groupId = e.target.closest('table').getAttribute('data-group');
                if (!standingsGroupSortStates[groupId]) standingsGroupSortStates[groupId] = { metric: 'pts', desc: true };
                let currentState = standingsGroupSortStates[groupId];
                if (currentState.metric === metric) currentState.desc = !currentState.desc;
                else { currentState.metric = metric; currentState.desc = true; }
                renderStandings();
            });
        });
    } catch (e) {
        container.innerHTML = `<div style="color:red; padding:1rem;">Error rendering standings: ${e.message}</div>`;
    }
}

function updateLeagueLeadersData() {
    if (!localGameState) return;
    try {
        let playerMap = new Map();
        if (window.globalDraftPool) window.globalDraftPool.forEach(p => playerMap.set(p.id, p));
        if (localGameState.players) localGameState.players.forEach(p => playerMap.set(p.id, p));
        
        let allPlayers = Array.from(playerMap.values()).filter(p => p.stats && p.stats.games > 0);
        
        let topPts = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => (b.stats.points||0) - (a.stats.points||0)).slice(0, 15).map((p, i) => ({
            rank: i + 1, name: p.name, teamId: p.teamId || p.originalTeamId, stat: p.stats.points||0
        }));
        
        let topG = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => (b.stats.goals||0) - (a.stats.goals||0)).slice(0, 15).map((p, i) => ({
            rank: i + 1, name: p.name, teamId: p.teamId || p.originalTeamId, stat: p.stats.goals||0
        }));
        
        let topA = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => (b.stats.assists||0) - (a.stats.assists||0)).slice(0, 15).map((p, i) => ({
            rank: i + 1, name: p.name, teamId: p.teamId || p.originalTeamId, stat: p.stats.assists||0
        }));
        
        let goalies = [...allPlayers].filter(p => p.position === 'G' && (p.stats.shotsAgainst||0) > 0);
        let topSvp = goalies.sort((a, b) => {
            let svpA = (a.stats.saves||0) / (a.stats.shotsAgainst||1);
            let svpB = (b.stats.saves||0) / (b.stats.shotsAgainst||1);
            return svpB - svpA;
        }).slice(0, 15).map((p, i) => {
            let svp = ((p.stats.saves||0) / (p.stats.shotsAgainst||1)).toFixed(3).replace('0.', '.');
            return { rank: i + 1, name: p.name, teamId: p.teamId || p.originalTeamId, stat: svp };
        });
        
        localGameState.leagueLeaders = { pts: topPts, g: topG, a: topA, svp: topSvp };
    } catch(e) {
        console.error(e);
        localGameState.leagueLeaders = { pts: [], g: [], a: [], svp: [] };
    }
}

function renderLeagueLeaders() {
    const container = document.getElementById('league-leaders-container');
    if (!container) return;
    try {
        updateLeagueLeadersData();
        const leaders = localGameState.leagueLeaders[currentLeaderTab] || [];
        let listHTML = `<div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">`;
        if (leaders.length === 0) {
            listHTML += `<p style="text-align: center; color: var(--text-muted); padding: 1rem 0; font-size: 0.95rem;">No stats available yet. Play matches to see leaders.</p>`;
        } else {
            leaders.forEach(l => {
                const teamInfo = ohlTeams.find(t => t.id === l.teamId);
                const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : '';
                const logoHtml = logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 28px; height: 28px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` : '';
                const tColor = teamInfo ? teamInfo.colors.primary : '#3b82f6';
                listHTML += `
                    <div class="leader-row" style="display: flex; align-items: center; justify-content: space-between; padding: 1.1rem; background: linear-gradient(135deg, color-mix(in srgb, ${tColor} 25%, transparent) 0%, rgba(255,255,255,0.03) 100%); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; backdrop-filter: blur(8px);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: rgba(255,255,255,0.7); width: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">#${l.rank}</span>
                            ${logoHtml}
                            <span style="font-weight: 600; color: #fff; letter-spacing: 0.5px; font-size: 1.1rem;">${l.name}</span>
                        </div>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.4);">${l.stat}</span>
                    </div>
                `;
            });
        }
        listHTML += `</div>`;
        container.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; color: var(--text-color);">League Leaders</h3>
            <div class="standings-tabs" style="justify-content: flex-start; gap: 0.5rem;">
                <button class="tab-btn ${currentLeaderTab === 'pts' ? 'active' : ''}" data-leadertab="pts" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">PTS</button>
                <button class="tab-btn ${currentLeaderTab === 'g' ? 'active' : ''}" data-leadertab="g" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">G</button>
                <button class="tab-btn ${currentLeaderTab === 'a' ? 'active' : ''}" data-leadertab="a" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">A</button>
                <button class="tab-btn ${currentLeaderTab === 'svp' ? 'active' : ''}" data-leadertab="svp" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">SV%</button>
            </div>
            ${listHTML}
        `;
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { currentLeaderTab = e.target.getAttribute('data-leadertab'); renderLeagueLeaders(); });
        });
    } catch(e) {
        container.innerHTML = `<div style="color:red; padding:1rem;">Error rendering leaders: ${e.message}</div>`;
    }
}

function renderTeamStars() {
    const container = document.getElementById('team-stars-container');
    if (!container) return;
    try {
        let allPlayersMap = new Map();
        if (window.globalDraftPool) window.globalDraftPool.forEach(p => allPlayersMap.set(p.id, p));
        if (localGameState.players) localGameState.players.forEach(p => allPlayersMap.set(p.id, p));
        let myPlayers = Array.from(allPlayersMap.values()).filter(p => p.teamId === localCurrentTeam.id && p.stats && p.stats.games > 0);
        let starPlayer = null, statValue = '', statLabel = '';
        if (myPlayers.length > 0) {
            if (currentTeamStarTab === 'pts') {
                let skaters = myPlayers.filter(p => p.position !== 'G').sort((a, b) => (b.stats.points||0) - (a.stats.points||0));
                if (skaters.length > 0) { starPlayer = skaters[0]; statValue = starPlayer.stats.points||0; statLabel = 'Points'; }
            } else if (currentTeamStarTab === 'g') {
                let skaters = myPlayers.filter(p => p.position !== 'G').sort((a, b) => (b.stats.goals||0) - (a.stats.goals||0));
                if (skaters.length > 0) { starPlayer = skaters[0]; statValue = starPlayer.stats.goals||0; statLabel = 'Goals'; }
            } else if (currentTeamStarTab === 'a') {
                let skaters = myPlayers.filter(p => p.position !== 'G').sort((a, b) => (b.stats.assists||0) - (a.stats.assists||0));
                if (skaters.length > 0) { starPlayer = skaters[0]; statValue = starPlayer.stats.assists||0; statLabel = 'Assists'; }
            } else if (currentTeamStarTab === 'svp') {
                let goalies = myPlayers.filter(p => p.position === 'G' && (p.stats.shotsAgainst||0) > 0).sort((a, b) => ((b.stats.saves||0)/(b.stats.shotsAgainst||1)) - ((a.stats.saves||0)/(a.stats.shotsAgainst||1)));
                if (goalies.length > 0) { starPlayer = goalies[0]; statValue = ((starPlayer.stats.saves||0)/(starPlayer.stats.shotsAgainst||1)).toFixed(3).replace('0.', '.'); statLabel = 'SV%'; }
            }
        }
        
        let contentHTML = '';
        let logoFile = localCurrentTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        if (starPlayer) {
            let numericStat = parseFloat(statValue);
            if (numericStat === 0 || isNaN(numericStat)) starPlayer = null;
        }
        if (starPlayer) {
            let pId = starPlayer.id.includes('_') ? starPlayer.id.split('_')[1] : starPlayer.id;
            let firstName = starPlayer.name.split(' ')[0] || '';
            let lastName = starPlayer.name.split(' ').slice(1).join(' ') || '';
            let fullPos = starPlayer.position === 'C' ? 'center' : (starPlayer.position === 'LW' ? 'left wing' : (starPlayer.position === 'RW' ? 'right wing' : (starPlayer.position === 'G' ? 'goalie' : 'defense')));
            container.style.background = 'linear-gradient(135deg, var(--team-primary) 0%, color-mix(in srgb, var(--team-secondary) 80%, black) 100%)';
            container.style.border = '1px solid rgba(255,255,255,0.2)';
            container.style.position = 'relative';
            container.style.overflow = 'hidden';
            container.style.height = '260px';
            contentHTML = `
                <div style="position: absolute; inset: 0; opacity: 0.15; background-image: repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 4px); z-index: 1; pointer-events: none;"></div>
                <div style="position: absolute; right: 1.5rem; top: 50%; transform: translateY(-40%); width: 140px; height: 140px; z-index: 2; border-radius: 50%; border: 4px solid var(--team-primary); box-shadow: 0 10px 20px rgba(0,0,0,0.5), 0 0 15px var(--team-primary); overflow: hidden; background: #fff;">
                    <img src="https://assets.leaguestat.com/ohl/240x240/${pId}.jpg" onerror="this.src='assets/default-player.svg'" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
                </div>
                <div style="position: relative; z-index: 3; display: flex; flex-direction: column; justify-content: flex-end; flex: 1; margin-top: auto; padding-top: 1rem;">
                    <div style="display: flex; flex-direction: column; line-height: 0.9;">
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; color: rgba(255,255,255,0.8); text-transform: uppercase; font-style: italic; letter-spacing: 1px;">${firstName}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fff; text-transform: uppercase; font-style: italic; letter-spacing: 1px; text-shadow: 0 4px 15px rgba(0,0,0,0.5);">${lastName}</span>
                    </div>
                    <div style="margin-top: 1rem; font-family: 'Roboto', sans-serif; font-size: 0.95rem; color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 0.6rem;">
                        <span style="text-transform: lowercase;">${fullPos}</span>
                        <span style="width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.5);"></span>
                        <span style="font-weight: 900; color: #fbbf24; font-size: 1.3rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${statValue} <span style="font-size: 0.8rem; color: rgba(255,255,255,0.8); font-weight: normal;">${statLabel.toUpperCase()}</span></span>
                    </div>
                </div>
            `;
        } else {
            container.style.background = '';
            container.style.border = '';
            container.style.position = 'relative';
            contentHTML = `<p style="position: relative; z-index: 3; text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.95rem;">No stats available yet. Play matches to see highlights.</p>`;
        }
        container.innerHTML = `
            <div style="position: relative; z-index: 3; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.3rem; letter-spacing: 1px; display: flex; align-items: center; gap: 0.6rem; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    <img src="assets/logos/ohl/${logoFile}.png" style="width: 20px; height: 20px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    ${localCurrentTeam.name.substring(0,3).toUpperCase()} HIGHLIGHTS
                </h3>
            </div>
            <div class="standings-tabs" style="position: relative; z-index: 3; justify-content: flex-start; gap: 0.4rem; margin-top: 0.8rem;">
                <button class="tab-btn ${currentTeamStarTab === 'pts' ? 'active' : ''}" data-startab="pts" style="padding: 0.2rem 0.5rem; font-size: 0.9rem; border-radius: 6px;">PTS</button>
                <button class="tab-btn ${currentTeamStarTab === 'g' ? 'active' : ''}" data-startab="g" style="padding: 0.2rem 0.5rem; font-size: 0.9rem; border-radius: 6px;">G</button>
                <button class="tab-btn ${currentTeamStarTab === 'a' ? 'active' : ''}" data-startab="a" style="padding: 0.2rem 0.5rem; font-size: 0.9rem; border-radius: 6px;">A</button>
                <button class="tab-btn ${currentTeamStarTab === 'svp' ? 'active' : ''}" data-startab="svp" style="padding: 0.2rem 0.5rem; font-size: 0.9rem; border-radius: 6px;">SV%</button>
            </div>
            ${contentHTML}
        `;
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { currentTeamStarTab = e.target.getAttribute('data-startab'); renderTeamStars(); });
        });
        if (window.lucide) window.lucide.createIcons();
    } catch(e) {
        container.innerHTML = `<div style="color:red; padding:1rem;">Error rendering stars: ${e.message}</div>`;
    }
}

