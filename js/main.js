import { ohlTeams } from '../data/teams.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Hockey GM initialized');
    initLeagueSelection();
});

// --- UI VIEWS ---

function initLeagueSelection() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="container">
            <h1 class="title-main">Hockey GM</h1>
            <h2 class="subtitle">Select a League to start your journey</h2>
            
            <div class="team-grid" style="display: flex; justify-content: center;">
                <div class="team-card team-card-square" id="league-ohl" style="--team-primary: #047ac4; --team-secondary: #aaaaaa;">
                    <img src="assets/ohl-logo.svg" alt="OHL Logo" class="league-logo">
                    <h3 class="team-card-title">OHL</h3>
                    <p class="team-card-conf">Ontario Hockey League</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('league-ohl').addEventListener('click', () => {
        initFranchiseSelection();
    });
}

function getRandomTeams(teams, count) {
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function initFranchiseSelection() {
    const app = document.getElementById('app');
    
    // Select 6 random teams
    const selectedTeams = getRandomTeams(ohlTeams, 6);
    
    app.innerHTML = `
        <div class="container">
            <h1 class="title-main">OHL</h1>
            <h2 class="subtitle">Select your franchise to start your career</h2>
            
            <div class="team-grid">
                ${selectedTeams.map(team => {
                    const parts = team.name.split(' ');
                    const mascot = parts.pop();
                    const city = parts.join(' ');
                    const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
                    
                    return `
                    <div class="team-card" data-team-id="${team.id}" style="align-items: center; display: flex; flex-direction: column; --team-primary: ${team.colors.primary}; --team-secondary: ${team.colors.secondary};">
                        <img src="assets/logos/ohl/${logoFile}.svg" alt="${team.name} Logo" class="team-card-logo">
                        <h3 class="team-card-title" style="line-height: 1.1; margin-top: 0.5rem;">
                            <span style="display: block; font-size: 0.55em; opacity: 0.7; letter-spacing: 2px;">${city}</span>
                            <span style="display: block;">${mascot}</span>
                        </h3>
                        <p class="team-card-conf" style="margin-top: 0.5rem;">${team.conference} Conference</p>
                    </div>
                    `;
                }).join('')}
            </div>
            
            <div style="text-align: center; display: flex; gap: 1rem; justify-content: center; margin-top: 3rem; margin-bottom: 2rem;">
                <button class="btn btn-secondary" id="btn-back-league">Back to Leagues</button>
                <button class="btn" id="btn-re-roll">Reroll Teams</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const teamCards = document.querySelectorAll('.team-card');
    teamCards.forEach(card => {
        card.addEventListener('click', () => {
            const teamId = card.getAttribute('data-team-id');
            const team = ohlTeams.find(t => t.id === teamId);
            openConfirmationModal(team);
        });
    });
    
    document.getElementById('btn-back-league').addEventListener('click', initLeagueSelection);
    document.getElementById('btn-re-roll').addEventListener('click', initFranchiseSelection);
}

let currentTeam = null;
let gameState = null;

function initNewGame() {
    const currentYear = new Date().getFullYear();
    
    // Calcula a 3ª quinta-feira de Setembro do ano atual
    let date = new Date(currentYear, 8, 1); // Mês 8 é Setembro (0-indexado)
    let thursdaysCount = 0;
    while (thursdaysCount < 3) {
        if (date.getDay() === 4) { // 4 = Quinta-feira
            thursdaysCount++;
            if (thursdaysCount === 3) break;
        }
        date.setDate(date.getDate() + 1);
    }
    
    const otherTeams = ohlTeams.filter(t => t.id !== currentTeam.id);
    const randomOpponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];
    const isHome = Math.random() > 0.5;

    gameState = {
        seasonYear: currentYear,
        currentDate: date,
        matchIndex: 1,
        totalMatches: 68,
        record: {
            wins: 0,
            losses: 0,
            otl: 0
        },
        standings: ohlTeams.map(team => ({
            teamId: team.id,
            gp: 0,
            w: 0,
            l: 0,
            otl: 0,
            pts: 0
        })),
        nextMatch: {
            homeId: isHome ? currentTeam.id : randomOpponent.id,
            awayId: isHome ? randomOpponent.id : currentTeam.id
        }
    };
    
    // Generate dummy league leaders for UI testing
    const firstNames = ['J.', 'M.', 'A.', 'T.', 'C.', 'S.', 'D.', 'L.', 'P.', 'R.'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'];
    
    function generateDummyLeaderList(type, maxStat) {
        const list = [];
        for (let i = 0; i < 3; i++) {
            const team = ohlTeams[Math.floor(Math.random() * ohlTeams.length)];
            const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
            let stat;
            if (type === 'svp') {
                stat = (Math.random() * (0.930 - 0.890) + 0.890).toFixed(3);
            } else {
                stat = maxStat - i * Math.floor(Math.random() * 3 + 1);
            }
            list.push({ rank: i + 1, name, teamId: team.id, stat });
        }
        return list;
    }

    gameState.leagueLeaders = {
        pts: generateDummyLeaderList('pts', 105),
        g: generateDummyLeaderList('g', 45),
        a: generateDummyLeaderList('a', 60),
        svp: generateDummyLeaderList('svp', null)
    };
}

function openConfirmationModal(team) {
    const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const modalHTML = `
        <div id="confirm-modal" class="modal-overlay">
            <div class="modal-content">
                <img src="assets/logos/ohl/${logoFile}.svg" alt="${team.name} Logo" class="modal-logo">
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem;">Are you sure?</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem;">Do you want to select the <strong style="color: ${team.colors.primary}; text-shadow: 0 0 10px ${team.colors.primary}40;">${team.name}</strong> as your franchise? You won't be able to change this later.</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="btn-cancel-select">Cancel</button>
                    <button class="btn" id="btn-confirm-select" style="background-color: ${team.colors.primary}; border-color: ${team.colors.primary};">Confirm Selection</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('btn-cancel-select').addEventListener('click', () => {
        document.getElementById('confirm-modal').remove();
    });
    
    document.getElementById('btn-confirm-select').addEventListener('click', () => {
        document.getElementById('confirm-modal').remove();
        handleTeamSelection(team);
    });
}

function handleTeamSelection(team) {
    currentTeam = team;
    initNewGame();
    initHomeScreen();
}

function initHomeScreen() {
    const app = document.getElementById('app');
    
    // Remove as propriedades anteriores se existirem e define o background gradient globalmente
    document.body.style.removeProperty('--bg-color');
    document.body.style.background = `linear-gradient(135deg, color-mix(in srgb, ${currentTeam.colors.primary} 60%, #0b1121) 0%, color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #0b1121) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Define a cor primária globalmente para os botões e outros elementos
    document.body.style.setProperty('--team-primary', currentTeam.colors.primary);
    
    app.innerHTML = `
        <div class="app-layout" style="--team-primary: ${currentTeam.colors.primary}; --team-secondary: ${currentTeam.colors.secondary};">
            <aside class="sidebar" style="background-color: color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #151e32);">
                <div class="sidebar-brand">
                    <h2>HOCKEY GM</h2>
                </div>
                
                <nav class="sidebar-nav">
                    <button class="nav-btn active" id="nav-dashboard">
                        <i data-lucide="layout-dashboard" style="margin-right: 8px; width: 20px; height: 20px;"></i> Dashboard
                    </button>
                    <button class="nav-btn" id="nav-roster">
                        <i data-lucide="users" style="margin-right: 8px; width: 20px; height: 20px;"></i> Roster
                    </button>
                    <button class="nav-btn" id="nav-calendar">
                        <i data-lucide="calendar" style="margin-right: 8px; width: 20px; height: 20px;"></i> Calendar
                    </button>
                    <button class="nav-btn" id="nav-collection">
                        <i data-lucide="library" style="margin-right: 8px; width: 20px; height: 20px;"></i> Collection
                    </button>
                </nav>
                
                <div class="sidebar-bottom">
                    <div class="coins-display">
                        <span class="coins-icon">🪙</span>
                        <span class="coins-amount">0</span>
                    </div>
                    <!-- Placeholder buttons for future logic -->
                    <button class="btn btn-sm" style="width: 100%; margin-bottom: 0.8rem; font-size: 0.9rem; background-color: transparent; border: 2px solid var(--team-primary); color: var(--team-primary); transition: all 0.2s ease; display: flex; justify-content: center; align-items: center; gap: 0.4rem;">
                        <i data-lucide="save" style="width: 18px; height: 18px;"></i> Save Game
                    </button>
                    <button class="btn btn-danger btn-sm" id="btn-back-selection" style="width: 100%; font-size: 0.9rem; background-color: #ef4444; color: #fff; border: none; display: flex; justify-content: center; align-items: center; gap: 0.4rem;">
                        <i data-lucide="log-out" style="width: 18px; height: 18px;"></i> Leave Game
                    </button>
                </div>
            </aside>
            
            <main class="main-content" id="main-content">
                <!-- Content injected via switchView -->
            </main>
        </div>
    `;
    
    // Bind Sidebar Navigation
    document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard'));
    document.getElementById('nav-roster').addEventListener('click', () => switchView('roster'));
    document.getElementById('nav-calendar').addEventListener('click', () => switchView('calendar'));
    document.getElementById('nav-collection').addEventListener('click', () => switchView('collection'));
    
    // Bind Back to Selection
    document.getElementById('btn-back-selection').addEventListener('click', () => {
        openBackConfirmationModal();
    });
    
    // Renderiza a view inicial
    switchView('dashboard');
}

function switchView(viewName) {
    // Atualiza a classe ativa
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${viewName}`).classList.add('active');
    
    // Create icons immediately after injecting HTML
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    const mainContent = document.getElementById('main-content');
    
    if (viewName === 'dashboard') {
        renderDashboard(mainContent);
    } else if (viewName === 'roster') {
        mainContent.innerHTML = `<h1 class="title-main" style="text-align:left; margin-top:0;">Roster</h1><p>Manage your 4 lines here.</p>`;
    } else if (viewName === 'calendar') {
        mainContent.innerHTML = `<h1 class="title-main" style="text-align:left; margin-top:0;">Calendar</h1><p>Season schedule coming soon.</p>`;
    } else if (viewName === 'collection') {
        mainContent.innerHTML = `<h1 class="title-main" style="text-align:left; margin-top:0;">Collection</h1><p>Your archived player cards.</p>`;
    }
}

let currentStandingsConf = null;
let standingsSortMetric = 'pts';
let standingsSortDesc = true;
let currentLeaderTab = 'pts';

function renderDashboard(container) {
    if (!currentStandingsConf) currentStandingsConf = currentTeam.conference;

    const logoFile = currentTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    
    // Formatar a data (ex: Thursday. September 17th, 2026)
    const d = gameState.currentDate.getDate();
    let suffix = 'th';
    if (d % 10 === 1 && d !== 11) suffix = 'st';
    else if (d % 10 === 2 && d !== 12) suffix = 'nd';
    else if (d % 10 === 3 && d !== 13) suffix = 'rd';
    
    const dayName = gameState.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = gameState.currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = gameState.currentDate.getFullYear();
    
    const dateStr = `${dayName}. ${monthName} ${d}${suffix}, ${year}`;
    
    const awayTeam = ohlTeams.find(t => t.id === gameState.nextMatch.awayId);
    const homeTeam = ohlTeams.find(t => t.id === gameState.nextMatch.homeId);
    const awayLogo = awayTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const homeLogo = homeTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const awayStandings = gameState.standings.find(s => s.teamId === awayTeam.id);
    const homeStandings = gameState.standings.find(s => s.teamId === homeTeam.id);
    
    container.innerHTML = `
        <div class="dashboard-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; background: linear-gradient(90deg, color-mix(in srgb, var(--team-primary) 20%, transparent) 0%, transparent 100%); padding: 1rem 1.5rem; border-radius: 12px; border-left: 4px solid var(--team-primary);">
            <img src="assets/logos/ohl/${logoFile}.svg" alt="${currentTeam.name} Logo" style="width: 80px; height: 80px; object-fit: contain; filter: drop-shadow(0 0 15px color-mix(in srgb, var(--team-primary) 40%, transparent));">
            <div>
                <h1 class="title-main" style="text-align: left; margin: 0 0 0.3rem 0; font-size: 2rem; text-shadow: 0 0 10px color-mix(in srgb, var(--team-primary) 50%, transparent); line-height: 1;">${currentTeam.name}</h1>
                <div style="font-size: 1rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.3rem; font-family: 'Roboto', sans-serif;">
                    <div style="color: var(--text-color); font-weight: 700; letter-spacing: 1px;">${dateStr}</div>
                    <div style="display: flex; gap: 0.8rem; align-items: center;">
                        <span style="background-color: color-mix(in srgb, var(--team-secondary) 20%, transparent); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid color-mix(in srgb, var(--team-secondary) 40%, transparent); font-size: 0.85rem;">Match ${gameState.matchIndex} of ${gameState.totalMatches}</span>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: var(--text-color); letter-spacing: 2px;">${gameState.record.wins}-${gameState.record.losses}-${gameState.record.otl}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="dashboard-card standings-card" id="standings-container" style="padding: 1.5rem;">
                <!-- Generated by renderStandings() -->
            </div>
            
            <div class="dashboard-sidebar-column" style="display: flex; flex-direction: column; gap: 2rem;">
                <!-- Next Match Card -->
                <div class="dashboard-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; color: var(--text-color);">Next Match</h3>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <!-- Away Team -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                            <img src="assets/logos/ohl/${awayLogo}.svg" alt="Away Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; text-align: center;">${awayTeam.name}</span>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">${awayStandings.w}-${awayStandings.l}-${awayStandings.otl}</span>
                        </div>
                        
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-muted);">VS</div>
                        
                        <!-- Home Team -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                            <img src="assets/logos/ohl/${homeLogo}.svg" alt="Home Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; text-align: center;">${homeTeam.name}</span>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">${homeStandings.w}-${homeStandings.l}-${homeStandings.otl}</span>
                        </div>
                    </div>
                    
                    <button class="btn" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; text-shadow: 0 0 5px rgba(0,0,0,0.5); background: linear-gradient(90deg, ${awayTeam.colors.primary} 0%, ${homeTeam.colors.primary} 100%); transition: transform 0.2s ease;">
                        PLAY MATCH
                    </button>
                </div>
                
                <div class="dashboard-card" id="league-leaders-container" style="padding: 1.5rem; display: flex; flex-direction: column;">
                    <!-- Generated by renderLeagueLeaders() -->
                </div>
            </div>
        </div>
    `;
    
    renderStandings();
    renderLeagueLeaders();
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
    
    // Filter teams by conference
    const confTeamsData = ohlTeams.filter(t => t.conference === currentStandingsConf);
    const confTeamIds = confTeamsData.map(t => t.id);
    
    let tableData = gameState.standings.filter(s => confTeamIds.includes(s.teamId));
    
    // Populate derived state (Pts and Team Name) for sorting
    tableData.forEach(s => {
        s.pts = (s.w * 2) + s.otl;
        const info = ohlTeams.find(t => t.id === s.teamId);
        s.teamName = info.name;
    });
    
    // Calculate absolute rank by sorting a copy of tableData by PTS -> W -> OTL
    const rankArray = [...tableData].sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        if (a.w !== b.w) return b.w - a.w;
        if (a.otl !== b.otl) return b.otl - a.otl;
        return 0;
    });
    
    // Assign absolute rank
    tableData.forEach(s => {
        s.rank = rankArray.findIndex(r => r.teamId === s.teamId) + 1;
    });
    
    // Apply user's sort
    tableData = sortStandingsArray(tableData, standingsSortMetric, standingsSortDesc);
    
    let rowsHTML = '';
    tableData.forEach((s) => {
        const teamInfo = ohlTeams.find(t => t.id === s.teamId);
        const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        const isActiveTeam = teamInfo.id === currentTeam.id;
        
        rowsHTML += `
            <tr class="${isActiveTeam ? 'team-row-active' : ''}">
                <td>${s.rank}</td>
                <td class="team-cell">
                    <img src="assets/logos/ohl/${logoFile}.svg" alt="logo">
                    <span>${teamInfo.name}</span>
                </td>
                <td>${s.gp}</td>
                <td><strong>${s.pts}</strong></td>
                <td>${s.w}</td>
                <td>${s.l}</td>
                <td>${s.otl}</td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="standings-header">
            <h2 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px;">Standings</h2>
            <div class="standings-tabs">
                <button class="tab-btn ${currentStandingsConf === 'East' ? 'active' : ''}" data-conf="East">East</button>
                <button class="tab-btn ${currentStandingsConf === 'West' ? 'active' : ''}" data-conf="West">West</button>
            </div>
        </div>
        <table class="standings-table">
            <thead>
                <tr>
                    <th style="width: 40px; cursor: pointer;" data-sort="pts" title="Sort by Rank/Points">#</th>
                    <th style="text-align: left;" data-sort="teamName">Team</th>
                    <th data-sort="gp" title="Games Played">GP</th>
                    <th data-sort="pts" title="Points">PTS</th>
                    <th data-sort="w" title="Wins">W</th>
                    <th data-sort="l" title="Losses">L</th>
                    <th data-sort="otl" title="Overtime Losses">OTL</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            </tbody>
        </table>
    `;
    
    // Bind Tab Events
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentStandingsConf = e.target.getAttribute('data-conf');
            renderStandings();
        });
    });
    
    // Bind Sort Events
    container.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', (e) => {
            const metric = e.target.getAttribute('data-sort');
            if (standingsSortMetric === metric) {
                standingsSortDesc = !standingsSortDesc;
            } else {
                standingsSortMetric = metric;
                standingsSortDesc = true;
            }
            renderStandings();
        });
    });
}

function renderLeagueLeaders() {
    const container = document.getElementById('league-leaders-container');
    if (!container) return;
    
    const leaders = gameState.leagueLeaders[currentLeaderTab];
    
    let listHTML = `<div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem;">`;
    
    leaders.forEach(l => {
        const teamInfo = ohlTeams.find(t => t.id === l.teamId);
        const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        
        listHTML += `
            <div class="leader-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background-color: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${teamInfo.colors.primary}; cursor: pointer; transition: background-color 0.2s;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: var(--text-muted); width: 20px;">#${l.rank}</span>
                    <img src="assets/logos/ohl/${logoFile}.svg" alt="logo" style="width: 24px; height: 24px; object-fit: contain;">
                    <span style="font-weight: 500; color: var(--text-color);">${l.name}</span>
                </div>
                <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: var(--text-color);">${l.stat}</span>
            </div>
        `;
    });
    
    listHTML += `</div>`;
    
    container.innerHTML = `
        <h3 style="margin: 0 0 1rem 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; color: var(--text-color);">League Leaders</h3>
        
        <div class="standings-tabs" style="justify-content: flex-start; gap: 0.5rem;">
            <button class="tab-btn ${currentLeaderTab === 'pts' ? 'active' : ''}" data-leadertab="pts" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">PTS</button>
            <button class="tab-btn ${currentLeaderTab === 'g' ? 'active' : ''}" data-leadertab="g" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">G</button>
            <button class="tab-btn ${currentLeaderTab === 'a' ? 'active' : ''}" data-leadertab="a" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">A</button>
            <button class="tab-btn ${currentLeaderTab === 'svp' ? 'active' : ''}" data-leadertab="svp" style="padding: 0.3rem 0.6rem; font-size: 0.9rem;">SV%</button>
        </div>
        
        ${listHTML}
    `;
    
    // Bind Tab Events
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentLeaderTab = e.target.getAttribute('data-leadertab');
            renderLeagueLeaders();
        });
    });
}

function openBackConfirmationModal() {
    const modalHTML = `
        <div id="back-confirm-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444;">
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem;">Go Back?</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem;">Are you sure you want to return to Franchise Selection? <strong style="color: #ef4444;">All unsaved progress will be lost.</strong></p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="btn-cancel-back">Cancel</button>
                    <button class="btn btn-danger" id="btn-confirm-back" style="background-color: #ef4444; color: #fff;">Yes, Go Back</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('btn-cancel-back').addEventListener('click', () => {
        document.getElementById('back-confirm-modal').remove();
    });
    
    document.getElementById('btn-confirm-back').addEventListener('click', () => {
        document.getElementById('back-confirm-modal').remove();
        
        // Remove a cor de fundo primária para voltar ao tema base
        document.body.style.removeProperty('--bg-color');
        currentTeam = null;
        
        initFranchiseSelection();
    });
}
