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
    
    const teamsHTML = selectedTeams.map(team => {
        const parts = team.name.split(' ');
        const mascot = parts.pop();
        const city = parts.join(' ');
        const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        
        return `
        <div class="team-card" data-team-id="${team.id}" style="align-items: center; display: flex; flex-direction: column; --team-primary: ${team.colors.primary}; --team-secondary: ${team.colors.secondary};">
            <img src="assets/logos/ohl/${logoFile}.png" alt="${team.name} Logo" class="team-card-logo">
            <h3 class="team-card-title" style="line-height: 1.1; margin-top: 0.5rem;">
                <span style="display: block; font-size: 0.55em; opacity: 0.7; letter-spacing: 2px;">${city}</span>
                <span style="display: block;">${mascot}</span>
            </h3>
            <p class="team-card-conf" style="margin-top: 0.5rem;">${team.conference} Conference</p>
        </div>
        `;
    }).join('');

    app.innerHTML = `
        <div style="min-height: 100vh; background: linear-gradient(135deg, rgba(4, 122, 196, 0.15) 0%, rgba(170, 170, 170, 0.25) 100%); padding: 2rem 0;">
            <div class="container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 4rem); position: relative;">
                
                <button id="btn-back-league" class="btn btn-sm" style="position: absolute; top: 0; left: 1rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="arrow-left" style="width: 18px; height: 18px;"></i> Back to Leagues
                </button>

                <div style="text-align: center; margin-bottom: 2rem;">
                    <h1 class="title-main" style="text-shadow: 0 4px 15px rgba(4, 122, 196, 0.3);">HOCKEY GM</h1>
                    <p class="subtitle">Select your franchise to start the journey</p>
                </div>
                
                <div class="team-grid">
                    ${teamsHTML}
                </div>
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    document.getElementById('btn-back-league').addEventListener('click', () => {
        initLeagueSelection();
    });
    
    // Add event listeners
    const teamCards = document.querySelectorAll('.team-card');
    teamCards.forEach(card => {
        card.addEventListener('click', () => {
            const teamId = card.getAttribute('data-team-id');
            const team = ohlTeams.find(t => t.id === teamId);
            openConfirmationModal(team);
        });
    });
}

let currentTeam = null;
let gameState = null;

async function initNewGame(teamIdOverride = null) {
    const targetTeam = teamIdOverride ? ohlTeams.find(t => t.id === teamIdOverride) : currentTeam;
    const currentYear = new Date().getFullYear();
    
    // Calcula a 3ª quinta-feira de Setembro do ano atual
    let date = new Date(currentYear, 8, 1);
    while (date.getDay() !== 4 || Math.ceil(date.getDate() / 7) !== 3) {
        date.setDate(date.getDate() + 1);
    }
    
    const otherTeams = ohlTeams.filter(t => t.id !== targetTeam.id);
    const randomOpponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];
    const isHome = Math.random() > 0.5;

    gameState = {
        seasonYear: currentYear,
        currentDate: date,
        matchIndex: 1,
        players: [],
        coins: 1000,
        collection: [],
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
            homeId: isHome ? targetTeam.id : randomOpponent.id,
            awayId: isHome ? randomOpponent.id : targetTeam.id
        }
    };
    
    // RF03: Generate initial roster
    try {
        const response = await fetch('data/rosters.json');
        const allRosters = await response.json();
        
        // Extrair todos os jogadores da liga para o "Draft Pool"
        let globalDraftPool = [];
        Object.values(allRosters).forEach(teamRoster => {
            if (teamRoster && teamRoster.length > 0) {
                globalDraftPool = globalDraftPool.concat(teamRoster);
            }
        });
        
        // Embaralhar o draft pool usando algoritmo Fisher-Yates
        for (let i = globalDraftPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [globalDraftPool[i], globalDraftPool[j]] = [globalDraftPool[j], globalDraftPool[i]];
        }
        
        // Pegar os 20 primeiros para o Roster do jogador
        const userDraftedPlayers = globalDraftPool.slice(0, 20);
        
        userDraftedPlayers.forEach(p => {
            gameState.players.push({
                ...p,
                teamId: targetTeam.id, // Pertence à sua franquia agora
                location: 'bench' // Todos começam no banco!
            });
        });
        
        // As 19 equipes controladas pela CPU mantêm os elencos reais
        ohlTeams.forEach(team => {
            if (team.id === targetTeam.id) return; // Seu time já tem os 20 randômicos
            
            const teamRoster = allRosters[team.id];
            if (teamRoster && teamRoster.length > 0) {
                teamRoster.forEach(p => {
                    gameState.players.push({
                        ...p,
                        teamId: team.id,
                        location: 'cpu_bench'
                    });
                });
            }
        });

    } catch (error) {
        console.error('Error loading complete rosters:', error);
        alert('Falha ao carregar elencos da OHL. Verifique data/rosters.json');
    }

    gameState.leagueLeaders = {
        pts: [],
        g: [],
        a: [],
        svp: []
    };
    
    // (O array de gameState.players já foi populado com sucesso via JSON acima)
}

function openConfirmationModal(team) {
    const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const modalHTML = `
        <div id="confirm-modal" class="modal-overlay">
            <div class="modal-content">
                <img src="assets/logos/ohl/${logoFile}.png" alt="${team.name} Logo" class="modal-logo">
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

async function handleTeamSelection(team) {
    currentTeam = team;
    await initNewGame();
    initHomeScreen();
}

function initHomeScreen() {
    const app = document.getElementById('app');
    
    // Remove as propriedades anteriores se existirem e define o background gradient globalmente
    document.body.style.removeProperty('--bg-color');
    document.body.style.background = `linear-gradient(135deg, color-mix(in srgb, ${currentTeam.colors.primary} 60%, #0b1121) 0%, color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #0b1121) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Configuração inicial de franquia e cores
    gameState.team = currentTeam;
    gameState.coins = 1000; // Saldo inicial
    gameState.collection = []; // Coleção vazia
    document.documentElement.style.setProperty('--team-primary', currentTeam.colors.primary);
    
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
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${viewName}`).classList.add('active');
    
    // Update Sidebar Brand based on view
    const sidebarBrand = document.querySelector('.sidebar-brand');
    if (sidebarBrand && gameState) {
        if (viewName === 'roster') {
            const teamInfo = currentTeam;
            const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
            sidebarBrand.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 60px; height: 60px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: var(--text-color);">${teamInfo.name}</div>
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: var(--text-muted);">${gameState.record.wins}-${gameState.record.losses}-${gameState.record.otl}</div>
                </div>
            `;
        } else {
            sidebarBrand.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <i data-lucide="shield" style="width: 50px; height: 50px; color: var(--text-color); filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));"></i>
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; letter-spacing: 2px; line-height: 1;">HOCKEY<br>GM</div>
                </div>
            `;
        }
    }
    
    // Create icons immediately after injecting HTML
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    const mainContent = document.getElementById('main-content');
    
    if (viewName === 'dashboard') {
        renderDashboard(mainContent);
    } else if (viewName === 'roster') {
        renderRoster(mainContent);
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

function updateCoinsDisplay() {
    const coinsEl = document.getElementById('coins-amount');
    if (coinsEl && gameState) {
        coinsEl.textContent = gameState.coins || 0;
    }
}

function renderDashboard(container) {
    updateCoinsDisplay();
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
            <img src="assets/logos/ohl/${logoFile}.png" alt="${currentTeam.name} Logo" style="width: 80px; height: 80px; object-fit: contain; filter: drop-shadow(0 0 15px color-mix(in srgb, var(--team-primary) 40%, transparent));">
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
                            <img src="assets/logos/ohl/${awayLogo}.png" alt="Away Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; text-align: center;">${awayTeam.name}</span>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">${awayStandings.w}-${awayStandings.l}-${awayStandings.otl}</span>
                        </div>
                        
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-muted);">VS</div>
                        
                        <!-- Home Team -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                            <img src="assets/logos/ohl/${homeLogo}.png" alt="Home Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
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
                    <img src="assets/logos/ohl/${logoFile}.png" alt="logo">
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
    
    if (leaders.length === 0) {
        listHTML += `<p style="text-align: center; color: var(--text-muted); padding: 1rem 0; font-size: 0.95rem;">No stats available yet. Play matches to see leaders.</p>`;
    } else {
        leaders.forEach(l => {
            const teamInfo = ohlTeams.find(t => t.id === l.teamId);
            const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
            
            listHTML += `
                <div class="leader-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background-color: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${teamInfo.colors.primary}; cursor: pointer; transition: background-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: var(--text-muted); width: 20px;">#${l.rank}</span>
                        <img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 24px; height: 24px; object-fit: contain;">
                        <span style="font-weight: 500; color: var(--text-color);">${l.name}</span>
                    </div>
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: var(--text-color);">${l.stat}</span>
                </div>
            `;
        });
    }
    
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

// --- ROSTER ENGINE ---
function getPlayerCardHTML(player) {
    if (!player) return '';
    const posColors = {
        'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#10b981',
        'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899'
    };
    const teamInfo = player.originalTeamId ? ohlTeams.find(t => t.id === player.originalTeamId) : null;
    const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-') : '';
    
    // Determine overall color based on tier
    let tierColorHex = '#8b5cf6'; // bronze fallback (orangeish bronze)
    if (player.tier === 'gold') tierColorHex = '#fbbf24';
    else if (player.tier === 'silver') tierColorHex = '#94a3b8';
    else if (player.tier === 'bronze') tierColorHex = '#b45309';

    return `
        <div class="player-card" draggable="true" data-player-id="${player.id}" onclick="openPlayerCardModal('${player.id}')"
             style="background-color: var(--card-bg, rgba(255,255,255,0.05)); padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid ${posColors[player.position] || 'var(--team-primary)'}; user-select: none; border-top: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-family: 'Blockletter', sans-serif; color: ${posColors[player.position]}; font-size: 1.1rem; width: 24px;">${player.position}</span>
                ${logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" style="height: 18px; object-fit: contain;">` : ''}
                <span style="font-weight: 500; color: var(--text-color); font-size: 0.95rem;">${player.name}</span>
            </div>
            <span style="font-family: 'Blockletter', sans-serif; color: ${tierColorHex}; font-size: 1.2rem;">${player.overall}</span>
        </div>
    `;
}

window.openPlayerCardModal = function(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const posColors = { 'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#10b981', 'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899' };
    const posColor = posColors[player.position] || 'var(--team-primary)';
    
    let tierColor = '#8b5cf6'; // default bronze fallback
    let tierShadow = 'rgba(139, 92, 246, 0.5)';
    if (player.tier === 'gold') { tierColor = '#fbbf24'; tierShadow = 'rgba(251, 191, 36, 0.7)'; }
    else if (player.tier === 'silver') { tierColor = '#94a3b8'; tierShadow = 'rgba(148, 163, 184, 0.6)'; }
    else if (player.tier === 'bronze') { tierColor = '#b45309'; tierShadow = 'rgba(180, 83, 9, 0.5)'; }

    const teamInfo = player.originalTeamId ? ohlTeams.find(t => t.id === player.originalTeamId) : null;
    const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-') : '';

    const fullPositions = {
        'LW': 'Left Wing', 'C': 'Center', 'RW': 'Right Wing',
        'LD': 'Left Defense', 'RD': 'Right Defense', 'G': 'Goalie'
    };
    const posFullName = fullPositions[player.position] || player.position;

    const modalHTML = `
        <div id="player-modal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div class="player-premium-card" style="position: relative; width: 340px; border-radius: 16px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid ${tierColor}; overflow: hidden; padding-bottom: 1.5rem; text-align: center; cursor: default;" onclick="event.stopPropagation()">
                
                <!-- TOP HEADER -->
                <div style="background-color: ${posColor}; height: 80px; width: 100%; position: absolute; top: 0; left: 0; z-index: 0; clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);"></div>
                
                <!-- OVERALL BADGE -->
                <div style="position: absolute; top: 1rem; left: 1rem; z-index: 2; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: ${tierColor}; line-height: 1;">${player.overall}</span>
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff; opacity: 0.9;">OVR</span>
                </div>
                
                <!-- LOGO BADGE -->
                ${logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" style="position: absolute; top: 1rem; right: 1rem; z-index: 2; height: 50px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` : ''}

                <!-- PHOTO -->
                <div style="position: relative; z-index: 1; margin-top: 2rem;">
                    <img src="https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg" alt="${player.name}" onerror="this.src='https://images.chl.ca/images/chl/player-missing-photo.png'" style="width: 160px; height: 160px; object-fit: cover; border-radius: 50%; border: 4px solid ${tierColor}; background-color: #0f172a;">
                    <div style="position: absolute; bottom: 0; right: 80px; transform: translateX(50%); background-color: #0f172a; border: 2px solid ${tierColor}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff;">
                        #${player.number}
                    </div>
                </div>
                
                <!-- INFO -->
                <div style="position: relative; z-index: 1; margin-top: 1rem; padding: 0 1.5rem;">
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${player.name}</h2>
                    <p style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: ${tierColor}; margin: 0.2rem 0 0 0; text-transform: uppercase;">${posFullName}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0.5rem 0 1rem 0;"><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${player.birthplace} • ${player.age} y/o</p>
                    
                    <div style="background-color: rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 0.85rem;">
                        <i data-lucide="bar-chart-2" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i> Game Stats Will Appear Here During Sim
                    </div>
                </div>
                
                <button class="btn btn-sm" onclick="document.getElementById('player-modal').remove()" style="margin-top: 1.5rem; border: 1px solid rgba(255,255,255,0.2); background: transparent;">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lucide.createIcons();
}

function renderRosterSlot(slotId, label) {
    const player = gameState.players.find(p => p.location === slotId);
    return `
        <div class="roster-slot drop-zone" data-slot-id="${slotId}" style="background-color: rgba(0,0,0,0.2); border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px; min-height: 48px; padding: 0.2rem; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem; flex: 1;">
            ${!player ? `<div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; text-align: center; margin: auto;">${label}</div>` : ''}
            ${getPlayerCardHTML(player)}
        </div>
    `;
}

let benchSortMetric = 'overall';
let benchSortDesc = true;

function renderRoster(container) {
    const benchPlayers = gameState.players.filter(p => p.location === 'bench');
    
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
        benchHTML += getPlayerCardHTML(p);
    });

    // Generate Forwards HTML
    let forwardsHTML = '';
    for(let i=1; i<=4; i++) {
        forwardsHTML += `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
                <div style="width: 30px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; color: var(--text-muted); font-size: 1rem;">L${i}</div>
                ${renderRosterSlot(`f_${i}_LW`, 'LW')}
                ${renderRosterSlot(`f_${i}_C`, 'C')}
                ${renderRosterSlot(`f_${i}_RW`, 'RW')}
            </div>
        `;
    }

    // Generate Defense HTML
    let defenseHTML = '';
    for(let i=1; i<=3; i++) {
        defenseHTML += `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
                <div style="width: 30px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; color: var(--text-muted); font-size: 1rem;">P${i}</div>
                ${renderRosterSlot(`d_${i}_LD`, 'LD')}
                ${renderRosterSlot(`d_${i}_RD`, 'RD')}
            </div>
        `;
    }

    // Goalies HTML
    let goaliesHTML = `
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
            <div style="width: 30px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; color: var(--text-muted); font-size: 1rem;">G</div>
            ${renderRosterSlot(`g_1_Starter`, 'Starter')}
            ${renderRosterSlot(`g_2_Backup`, 'Backup')}
        </div>
    `;
    
    // Validate if Roster is complete (RF04)
    const isRosterComplete = gameState.players.filter(p => p.location !== 'bench').length === 20;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; height: 100%; overflow: visible; padding-bottom: 2rem;">
            <!-- LEFT COLUMN: ICE + ACTION ZONES -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
                <!-- ICE CONTAINER -->
                <div class="dashboard-card" style="padding: 1rem 1.5rem; overflow-y: auto; background-color: color-mix(in srgb, var(--team-secondary) 40%, var(--card-bg)); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem; margin-bottom: 1rem;">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin: 0; text-shadow: 0 0 10px rgba(255,255,255,0.2);">ACTIVE ROSTER</h2>
                        <button id="btn-save-roster" class="btn btn-sm" ${!isRosterComplete ? 'disabled' : ''} style="background-color: ${isRosterComplete ? 'var(--team-primary)' : 'rgba(255,255,255,0.1)'}; color: ${isRosterComplete ? '#fff' : 'var(--text-muted)'}; border: none; font-size: 1rem; padding: 0.5rem 1.2rem;">
                            <i data-lucide="${isRosterComplete ? 'check-circle' : 'lock'}" style="width: 18px; height: 18px; margin-right: 4px; display: inline-block; vertical-align: middle;"></i> Save Lineup
                        </button>
                    </div>
                    
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0;">Forwards</h3>
                    ${forwardsHTML}
                    
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.5rem 0;">Defense</h3>
                    ${defenseHTML}
                    
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.5rem 0;">Goalies</h3>
                    ${goaliesHTML}
                </div>

                <!-- ACTION ZONES (SELL / COLLECTION) -->
                <div style="display: flex; gap: 1.5rem; height: 100px; flex-shrink: 0;">
                    <div class="dashboard-card action-zone drop-zone" data-slot-id="sell" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(239, 68, 68, 0.1); border: 2px dashed rgba(239, 68, 68, 0.4); border-radius: 12px; cursor: pointer;">
                        <i data-lucide="coins" style="color: #ef4444; width: 36px; height: 36px;"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: #ef4444; margin-top: 0.5rem;">SELL PLAYER</span>
                    </div>
                    <div class="dashboard-card action-zone drop-zone" data-slot-id="collection" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(59, 130, 246, 0.1); border: 2px dashed rgba(59, 130, 246, 0.4); border-radius: 12px; cursor: pointer;">
                        <i data-lucide="archive" style="color: #3b82f6; width: 36px; height: 36px;"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: #3b82f6; margin-top: 0.5rem;">SEND TO COLLECTION</span>
                    </div>
                </div>
            </div>

            <!-- BENCH CONTAINER -->
            <div class="dashboard-card" style="padding: 1.5rem; display: flex; flex-direction: column; background-color: var(--card-bg); border-radius: 12px; max-height: calc(100vh - 4rem);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 0.5rem;">
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin: 0;">BENCH</h2>
                    <span style="background-color: var(--team-primary); padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 1rem; font-weight: bold; color: #fff;">${benchPlayers.length}</span>
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
                
                <div class="drop-zone" data-slot-id="bench" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem; background-color: rgba(0,0,0,0.2); border-radius: 8px; min-height: 200px;">
                    ${benchHTML}
                    ${benchPlayers.length === 0 ? '<p style="color: var(--text-muted); text-align: center; font-size: 1rem; margin-top: 2rem;">Bench is empty. Roster is fully active.</p>' : ''}
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }

    bindDragAndDropEvents();
    
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
            // re-render the bench (which re-renders the roster)
            renderRoster(container);
        });
    });
    
    // Bind Save Action
    const saveBtn = document.getElementById('btn-save-roster');
    if (saveBtn && isRosterComplete) {
        saveBtn.addEventListener('click', () => {
            alert('Roster Validated and Saved Successfully! (RF04)');
        });
    }
}

let draggedPlayerId = null;

function bindDragAndDropEvents() {
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
            e.preventDefault(); // Necessary to allow dropping
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
            if (targetSlotId === 'sell') {
                if (confirm(`Sell ${draggedPlayer.name} for ${Math.floor(200 * (draggedPlayer.overall / 100))} coins?`)) {
                    gameState.coins = (gameState.coins || 0) + Math.floor(200 * (draggedPlayer.overall / 100));
                    gameState.players = gameState.players.filter(p => p.id !== draggedPlayerId);
                    updateCoinsDisplay();
                } else {
                    return; // Cancelled
                }
            } 
            else if (targetSlotId === 'collection') {
                if (confirm(`Send ${draggedPlayer.name} to Collection? He will be removed from your active roster.`)) {
                    gameState.collection = gameState.collection || [];
                    gameState.collection.push(draggedPlayer);
                    gameState.players = gameState.players.filter(p => p.id !== draggedPlayerId);
                } else {
                    return; // Cancelled
                }
            } 
            else {
                // If target is NOT bench, check if it's occupied to perform swap
                if (targetSlotId !== 'bench') {
                    const occupant = gameState.players.find(p => p.location === targetSlotId);
                    if (occupant) {
                        occupant.location = originalLocation; // Swap occupant to where draggedPlayer came from
                    }
                }
                
                draggedPlayer.location = targetSlotId;
            }
            
            // Re-render the whole roster UI to reflect state changes cleanly
            const mainContent = document.getElementById('main-content');
            renderRoster(mainContent);
        });
    });
}

function openBackConfirmationModal() {
    const modalHTML = `
        <div id="back-confirm-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444;">
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem;">Go Back?</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem;">Are you sure you want to return to League Selection? <strong style="color: #ef4444;">All unsaved progress will be lost.</strong></p>
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
        
        // Remove as propriedades de fundo para voltar ao tema base original do style.css
        document.body.style.removeProperty('--bg-color');
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-attachment');
        currentTeam = null;
        
        initLeagueSelection();
    });
}
