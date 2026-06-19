import { ohlTeams } from '../data/teams.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Hockey GM initialized');
    initLeagueSelection();
});

// --- UI VIEWS ---

function initLeagueSelection() {
    const app = document.getElementById('app');
    
    const hasSave = localStorage.getItem('hockeyGmSave') !== null;
    let loadHtml = '';
    if (hasSave) {
        loadHtml = `
            <div class="team-card team-card-square" id="league-load" style="--team-primary: #10b981; --team-secondary: #059669; margin-left: 2rem;">
                <i data-lucide="save" style="width: 80px; height: 80px; color: #fff; margin-bottom: 1rem;"></i>
                <h3 class="team-card-title">LOAD STATE</h3>
                <p class="team-card-conf">Resume your franchise</p>
            </div>
        `;
    }
    
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
                ${loadHtml}
            </div>
        </div>
    `;
    
    document.getElementById('league-ohl').addEventListener('click', () => {
        initFranchiseSelection();
    });
    
    if (hasSave) {
        document.getElementById('league-load').addEventListener('click', () => {
            loadGame();
        });
    }
    
    if (window.lucide) window.lucide.createIcons();
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
        coins: 200,
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
            pts: 0,
            gf: 0,
            ga: 0,
            streak: { type: 'None', count: 0 },
            clinch: ''
        })),
        playoffs: null, // Será preenchido com a árvore quando a temporada regular acabar
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
        window.globalDraftPool = globalDraftPool;
        
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
                    // Evita adicionar jogadores que já foram draftados pelo usuário
                    if (!userDraftedPlayers.some(drafted => drafted.id === p.id)) {
                        gameState.players.push({
                            ...p,
                            teamId: team.id,
                            location: 'cpu_bench'
                        });
                    }
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
    gameState.coins = 200; // Saldo inicial
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
                    <button class="nav-btn" id="nav-standings">
                        <i data-lucide="bar-chart-2" style="margin-right: 8px; width: 20px; height: 20px;"></i> Standings
                    </button>
                    <button class="nav-btn" id="nav-calendar">
                        <i data-lucide="calendar" style="margin-right: 8px; width: 20px; height: 20px;"></i> Calendar
                    </button>
                    <button class="nav-btn" id="nav-collection">
                        <i data-lucide="library" style="margin-right: 8px; width: 20px; height: 20px;"></i> Collection
                    </button>
                    <button class="nav-btn" id="nav-shop">
                        <i data-lucide="shopping-cart" style="margin-right: 8px; width: 20px; height: 20px;"></i> Shop
                    </button>
                </nav>
                
                <div class="sidebar-bottom">
                    <div class="coins-display">
                        <span class="coins-icon">🪙</span>
                        <span class="coins-amount">0</span>
                    </div>
                    <!-- Save button -->
                    <button id="btn-save-game" class="btn btn-sm" style="width: 100%; margin-bottom: 0.8rem; font-size: 0.9rem; background-color: transparent; border: 2px solid var(--team-primary); color: var(--team-primary); transition: all 0.2s ease; display: flex; justify-content: center; align-items: center; gap: 0.4rem;">
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
    document.getElementById('nav-standings').addEventListener('click', () => switchView('standings'));
    document.getElementById('nav-calendar').addEventListener('click', () => switchView('calendar'));
    document.getElementById('nav-collection').addEventListener('click', () => switchView('collection'));
    document.getElementById('nav-shop').addEventListener('click', () => switchView('shop'));
    
    // Bind Save Game
    const btnSaveGame = document.getElementById('btn-save-game');
    if (btnSaveGame) {
        btnSaveGame.addEventListener('click', () => saveGame());
    }

    // Bind Back to Selection
    document.getElementById('btn-back-selection').addEventListener('click', () => {
        openBackConfirmationModal();
    });
    
    // Renderiza a view inicial
    switchView('dashboard');
}

function switchView(viewName) {
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    const navBtn = document.getElementById(`nav-${viewName}`);
    if (navBtn) navBtn.classList.add('active');
    
    // Hide sidebar during match simulation
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (viewName === 'match') {
            sidebar.style.display = 'none';
        } else {
            sidebar.style.display = 'flex';
        }
    }
    
    // Update Sidebar Brand based on view
    const sidebarBrand = document.querySelector('.sidebar-brand');
    if (sidebarBrand && gameState) {
        if (viewName !== 'dashboard' && viewName !== 'match') {
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
    } else if (viewName === 'standings') {
        renderStandingsPage(mainContent);
    } else if (viewName === 'shop') {
        renderShopPage(mainContent);
    } else if (viewName === 'calendar') {
        mainContent.innerHTML = `<h1 class="title-main" style="text-align:left; margin-top:0;">Calendar</h1><p>Season schedule coming soon.</p>`;
    } else if (viewName === 'collection') {
        mainContent.innerHTML = `<h1 class="title-main" style="text-align:left; margin-top:0;">Collection</h1><p>Your archived player cards.</p>`;
    } else if (viewName === 'match') {
        renderMatchPage(mainContent);
    }
}

let currentStandingsConf = null;
let standingsSortMetric = 'pts';
let standingsSortDesc = true;
let currentLeaderTab = 'pts';

function updateCoinsDisplay() {
    const coinsEl = document.querySelector('.coins-amount');
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
    
    const awayOvr = getTeamOverall(awayTeam.id, awayTeam.id === currentTeam.id);
    const homeOvr = getTeamOverall(homeTeam.id, homeTeam.id === currentTeam.id);
    
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
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; text-align: center; margin-bottom: -0.3rem;">${awayTeam.name}</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: #fbbf24; text-shadow: 0 0 5px rgba(251, 191, 36, 0.4);">OVR ${awayOvr}</span>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">${awayStandings.w}-${awayStandings.l}-${awayStandings.otl}</span>
                        </div>
                        
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-muted);">VS</div>
                        
                        <!-- Home Team -->
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                            <img src="assets/logos/ohl/${homeLogo}.png" alt="Home Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; text-align: center; margin-bottom: -0.3rem;">${homeTeam.name}</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: #fbbf24; text-shadow: 0 0 5px rgba(251, 191, 36, 0.4);">OVR ${homeOvr}</span>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">${homeStandings.w}-${homeStandings.l}-${homeStandings.otl}</span>
                        </div>
                    </div>
                    
                    <button class="btn" onclick="startMatchSimulation()" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; text-shadow: 0 0 5px rgba(0,0,0,0.5); background: linear-gradient(90deg, ${awayTeam.colors.primary} 0%, ${homeTeam.colors.primary} 100%); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i data-lucide="play" style="width: 24px; height: 24px;"></i> PLAY MATCH
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
    if (window.lucide) window.lucide.createIcons();
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
function getPlayerModifiers(player) {
    if (!player || !player.location || player.location === 'bench' || player.location === 'sell' || player.location === 'collection') {
        return 0; // No buffs/debuffs outside active roster
    }
    
    let buff = 0;
    
    // 1. Position Check (+15% or -25%)
    let expectedPos = player.location.split('_')[2];
    if (expectedPos === 'Starter' || expectedPos === 'Backup') expectedPos = 'G';
    
    if (player.position === expectedPos) {
        buff += 0.15;
    } else {
        buff -= 0.25;
    }
    
    // 2. Real Team Synergy (+20%)
    if (player.originalTeamId === gameState.team.id) {
        buff += 0.20;
    }
    
    // 3. Line Chemistry (+15%)
    // Check if any other player on the same line has the same originalTeamId
    const linePrefix = player.location.split('_').slice(0, 2).join('_');
    const teammatesOnLine = gameState.players.filter(p => 
        p.id !== player.id && 
        p.location && 
        p.location.startsWith(linePrefix)
    );
    
    const hasChemistry = teammatesOnLine.some(t => t.originalTeamId === player.originalTeamId);
    if (hasChemistry) {
        buff += 0.15;
    }
    
    return buff; // Total multiplier (e.g., +0.15, -0.10, +0.50)
}

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
                ${logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" style="height: 18px; object-fit: contain;">` : ''}
                <span style="font-weight: 500; color: var(--text-color); font-size: 0.95rem;">${player.name}</span>
            </div>
            <div style="display: flex; align-items: center;">
                ${triangle}
                <span style="font-family: 'Blockletter', sans-serif; color: ${tierColorHex}; font-size: 1.2rem;">${ovrDisplay}</span>
            </div>
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

    // Modifiers Math
    const mod = getPlayerModifiers(player);
    const finalOVR = Math.round(player.overall * (1 + mod));
    let modString = '';
    
    if (mod > 0) {
        modString = `<span style="color: #10b981; font-family: 'Roboto', sans-serif; font-size: 0.85rem; font-weight: bold; margin: 2px 0;">+${Math.round(mod*100)}%</span>`;
    } else if (mod < 0) {
        modString = `<span style="color: #ef4444; font-family: 'Roboto', sans-serif; font-size: 0.85rem; font-weight: bold; margin: 2px 0;">${Math.round(mod*100)}%</span>`;
    }

    const modalHTML = `
        <div id="player-modal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div class="player-premium-card" style="position: relative; width: 340px; border-radius: 16px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid ${tierColor}; overflow: hidden; padding-bottom: 1.5rem; text-align: center; cursor: default;" onclick="event.stopPropagation()">
                
                <!-- TOP HEADER -->
                <div style="background-color: ${posColor}; height: 80px; width: 100%; position: absolute; top: 0; left: 0; z-index: 0; clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);"></div>
                
                <!-- OVERALL BADGE -->
                <div style="position: absolute; top: 1rem; left: 1rem; z-index: 2; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: ${tierColor}; line-height: 1;">${finalOVR}</span>
                    ${modString}
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
                    
                    ${player.attributes ? `
                    <div style="background-color: rgba(255,255,255,0.03); border-radius: 8px; padding: 1.2rem; border: 1px solid rgba(255,255,255,0.05); margin-top: 1rem; width: 100%;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; text-align: left;">
                            
                            <!-- SKATING -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Skating</span>
                                    <span style="font-size: 0.85rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.skating.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 0.4rem;">
                                    <div style="width: ${(player.attributes.skating.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 5px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                    <span>SPD: <span style="color: #cbd5e1;">${player.attributes.skating.speed}</span></span>
                                    <span>AGI: <span style="color: #cbd5e1;">${player.attributes.skating.agility}</span></span>
                                </div>
                            </div>

                            <!-- CREATIVITY -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Creativity</span>
                                    <span style="font-size: 0.85rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.creativity.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 0.4rem;">
                                    <div style="width: ${(player.attributes.creativity.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 5px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                    <span>VIS: <span style="color: #cbd5e1;">${player.attributes.creativity.vision}</span></span>
                                    <span>INT: <span style="color: #cbd5e1;">${player.attributes.creativity.intelligence}</span></span>
                                </div>
                            </div>

                            <!-- SHOOTING -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Shooting</span>
                                    <span style="font-size: 0.85rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.shooting.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 0.4rem;">
                                    <div style="width: ${(player.attributes.shooting.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 5px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                    <span>POW: <span style="color: #cbd5e1;">${player.attributes.shooting.power}</span></span>
                                    <span>ACC: <span style="color: #cbd5e1;">${player.attributes.shooting.accuracy}</span></span>
                                </div>
                            </div>

                            <!-- DEFENSE -->
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
                                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Defense</span>
                                    <span style="font-size: 0.85rem; color: #fff; font-weight: bold; font-family: 'Blockletter', sans-serif;">${player.attributes.defense.total}</span>
                                </div>
                                <div style="width: 100%; background: rgba(0,0,0,0.4); height: 4px; border-radius: 2px; overflow: hidden; margin-bottom: 0.4rem;">
                                    <div style="width: ${(player.attributes.defense.total / 35) * 100}%; background: ${tierColor}; height: 100%; box-shadow: 0 0 5px ${tierColor};"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
                                    <span>CON: <span style="color: #cbd5e1;">${player.attributes.defense.contact}</span></span>
                                    <span>POS: <span style="color: #cbd5e1;">${player.attributes.defense.positioning}</span></span>
                                </div>
                            </div>

                        </div>
                    </div>
                    ` : `
                    <div style="background-color: rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem; border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 0.85rem;">
                        <i data-lucide="bar-chart-2" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i> Game Stats Will Appear Here During Sim
                    </div>
                    `}
                </div>
                
                <button class="btn btn-sm" onclick="document.getElementById('player-modal').remove()" style="margin-top: 1.5rem; border: 1px solid rgba(255,255,255,0.2); background: transparent;">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
}

window.openPackRevealModal = function(playerIdsArray) {
    if (!playerIdsArray || playerIdsArray.length === 0) return;
    
    let cardsHTML = '';
    
    playerIdsArray.forEach(playerId => {
        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;
        
        const posColors = { 'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#10b981', 'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899' };
        const posColor = posColors[player.position] || 'var(--team-primary)';
        
        let tierColor = '#8b5cf6'; // default bronze fallback
        if (player.tier === 'gold') { tierColor = '#fbbf24'; }
        else if (player.tier === 'silver') { tierColor = '#94a3b8'; }
        else if (player.tier === 'bronze') { tierColor = '#b45309'; }

        const teamInfo = player.originalTeamId ? ohlTeams.find(t => t.id === player.originalTeamId) : null;
        const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-') : '';

        const fullPositions = {
            'LW': 'Left Wing', 'C': 'Center', 'RW': 'Right Wing',
            'LD': 'Left Defense', 'RD': 'Right Defense', 'G': 'Goalie'
        };
        const posFullName = fullPositions[player.position] || player.position;

        const finalOVR = Math.round(player.overall); // Base overall sem modifiers ainda (tá no banco recem comprado)

        cardsHTML += `
            <div class="player-premium-card" style="position: relative; width: 300px; height: 420px; border-radius: 16px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid ${tierColor}; overflow: hidden; padding-bottom: 1.5rem; text-align: center; cursor: default; transform: scale(0.9); transition: transform 0.3s ease; display: flex; flex-direction: column;" onclick="event.stopPropagation()" onmouseenter="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(0.9)'">
                
                <!-- TOP HEADER -->
                <div style="background-color: ${posColor}; height: 80px; width: 100%; position: absolute; top: 0; left: 0; z-index: 0; clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);"></div>
                
                <!-- OVERALL BADGE -->
                <div style="position: absolute; top: 1rem; left: 1rem; z-index: 2; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: ${tierColor}; line-height: 1;">${finalOVR}</span>
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff; opacity: 0.9;">OVR</span>
                </div>
                
                <!-- LOGO BADGE -->
                ${logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" style="position: absolute; top: 1rem; right: 1rem; z-index: 2; height: 50px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` : ''}

                <!-- PHOTO -->
                <div style="position: relative; z-index: 1; margin-top: 3rem;">
                    <img src="https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg" alt="${player.name}" onerror="this.src='https://images.chl.ca/images/chl/player-missing-photo.png'" style="width: 140px; height: 140px; object-fit: cover; border-radius: 50%; border: 4px solid ${tierColor}; background-color: #0f172a;">
                    <div style="position: absolute; bottom: 0; right: 70px; transform: translateX(50%); background-color: #0f172a; border: 2px solid ${tierColor}; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff;">
                        #${player.number}
                    </div>
                </div>
                
                <!-- INFO -->
                <div style="position: relative; z-index: 1; margin-top: 1rem; padding: 0 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${player.name}</h2>
                    <p style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: ${tierColor}; margin: 0.2rem 0 0 0; text-transform: uppercase;">${posFullName}</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0.5rem 0 0 0;"><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${player.birthplace} • ${player.age} y/o</p>
                </div>
            </div>
        `;
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
            if (targetSlotId === 'sell' || targetSlotId === 'collection') {
                const userActiveCount = gameState.players.filter(p => p.location && !p.location.startsWith('cpu_')).length;
                if (userActiveCount <= 20 && (gameState.coins || 0) < 200) {
                    openRosterErrorModal();
                    return;
                }
            }
            
            if (targetSlotId === 'sell') {
                openSellConfirmationModal(draggedPlayer);
                return; // Async flow takes over, prevent synchronous renderRoster
            } 
            else if (targetSlotId === 'collection') {
                openCollectionConfirmationModal(draggedPlayer);
                return; // Async flow takes over, prevent synchronous renderRoster
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
// --- SHOP ENGINE ---
function renderShopPage(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2rem; height: 100%; padding: 1rem 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem 2rem;">
                <div>
                    <h1 class="title-main" style="text-align:left; margin: 0; font-size: 2.5rem;">HOCKEY SHOP</h1>
                    <p style="color: var(--text-muted); margin: 0.5rem 0 0 0; font-size: 1.1rem;">Use your coins to buy packs and recruit new players to your franchise.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; background-color: rgba(0,0,0,0.4); padding: 1rem 2rem; border-radius: 12px; border: 2px solid #fbbf24;">
                    <span style="font-size: 2rem;">🪙</span>
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);">${gameState.coins || 0}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; color: #94a3b8; margin: 0;">D-TIER PACKS</h3>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem;">
                
                <!-- STANDARD PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(255,255,255,0.1); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(148, 163, 184, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="package" style="width: 50px; height: 50px; color: #94a3b8; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">D-LIST PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 3 random players.</p>
                    <button class="btn" onclick="buyPack('standard')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.2);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">200</span>
                    </button>
                </div>

                <!-- JUMBO PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(148, 163, 184, 0.5); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(148, 163, 184, 0.5) 0%, transparent 70%);"></div>
                    <i data-lucide="layers" style="width: 50px; height: 50px; color: #94a3b8; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">JUMBO D-LIST</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">6 players. 15% chance for a C-Tier!</p>
                    <button class="btn" onclick="buyPack('jumbo')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.2);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">600</span>
                    </button>
                </div>

                <!-- FORWARDS PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="swords" style="width: 50px; height: 50px; color: #ef4444; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">FORWARDS PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Forwards.</p>
                    <button class="btn" onclick="buyPack('forwards')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">400</span>
                    </button>
                </div>

                <!-- DEFENSE PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="shield-half" style="width: 50px; height: 50px; color: #3b82f6; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">DEFENSE PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Defensemen.</p>
                    <button class="btn" onclick="buyPack('defense')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(59, 130, 246, 0.2);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">400</span>
                    </button>
                </div>

                <!-- GOALIE PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="hand-metal" style="width: 50px; height: 50px; color: #f59e0b; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">GOALIE PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Goalies.</p>
                    <button class="btn" onclick="buyPack('goalies')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(245, 158, 11, 0.2);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">400</span>
                    </button>
                </div>

            </div>
        </div>
    `;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.buyPack = function(packType) {
    const packConfigs = {
        'standard': { cost: 200, count: 3, filters: null, cTierChance: 0 },
        'jumbo':    { cost: 600, count: 6, filters: null, cTierChance: 0.15 },
        'forwards': { cost: 400, count: 2, filters: ['LW', 'C', 'RW'], cTierChance: 0 },
        'defense':  { cost: 400, count: 2, filters: ['LD', 'RD'], cTierChance: 0 },
        'goalies':  { cost: 400, count: 2, filters: ['G'], cTierChance: 0 }
    };
    
    const config = packConfigs[packType];
    if (!config) return;

    if ((gameState.coins || 0) < config.cost) {
        openInsufficientCoinsModal(config.cost);
        return;
    }
    
    // Determine available players
    const activePlayerIds = new Set(gameState.players.map(p => p.id));
    const collectionPlayerIds = new Set((gameState.collection || []).map(p => p.id));
    
    let availablePlayers = window.globalDraftPool.filter(p => !activePlayerIds.has(p.id) && !collectionPlayerIds.has(p.id));
    
    if (config.filters) {
        availablePlayers = availablePlayers.filter(p => config.filters.includes(p.position));
    }
    
    if (availablePlayers.length < config.count) {
        openEmptyPoolModal();
        return;
    }
    
    // Deduct coins
    gameState.coins -= config.cost;
    updateCoinsDisplay();
    
    // Pick random players
    let drawnIds = [];
    for(let i=0; i<config.count; i++) {
        if(availablePlayers.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const selectedData = availablePlayers[randomIndex];
        availablePlayers.splice(randomIndex, 1); // remove from available
        
        let newPlayer = {
            id: selectedData.id,
            name: selectedData.name,
            position: selectedData.position,
            number: selectedData.number,
            photo: selectedData.photo,
            birthplace: selectedData.birthplace,
            age: selectedData.age,
            overall: selectedData.overall,
            tier: selectedData.tier,
            originalTeamId: selectedData.originalTeamId,
            stats: selectedData.stats,
            attributes: JSON.parse(JSON.stringify(selectedData.attributes)), // Deep copy attributes
            location: 'bench' // Start on bench
        };
        
        // Upgrade to C-Tier Logic
        if (Math.random() < config.cTierChance) {
            newPlayer.tier = 'silver'; // Silver visual treatment for C-Tier
            newPlayer.overall = Math.round(newPlayer.overall * 1.5);
            newPlayer.name = newPlayer.name + " (C-TIER)";
            
            Object.values(newPlayer.attributes).forEach(category => {
                for (let key in category) {
                    if (key !== 'total') {
                        category[key] = parseFloat((category[key] * 1.5).toFixed(1));
                    }
                }
            });
        }
        
        gameState.players.push(newPlayer);
        drawnIds.push(newPlayer.id);
    }
    
    // Re-render Shop
    const mainContent = document.getElementById('main-content');
    renderShopPage(mainContent);
    
    // Show Premium Modal for all players to celebrate
    if (drawnIds.length > 0) {
        openPackRevealModal(drawnIds);
    }
};

// --- MATCH SIMULATION ---

window.getTeamOverall = function(teamId, isUser) {
    if (isUser) {
        let activePlayers = gameState.players.filter(p => p.teamId === teamId && p.location && p.location !== 'bench' && p.location !== 'sell' && p.location !== 'collection');
        
        let sum = 0;
        activePlayers.forEach(p => {
            let mod = getPlayerModifiers(p);
            let finalOvr = Math.round(p.overall * (1 + mod/100));
            sum += finalOvr;
        });
        return (sum / 20).toFixed(1);
    } else {
        let cpuPlayers = window.globalDraftPool.filter(p => p.originalTeamId === teamId);
        
        // Take top 20 players to evaluate fairly
        cpuPlayers.sort((a,b) => b.overall - a.overall);
        let top20 = cpuPlayers.slice(0, 20);
        
        let sum = 0;
        top20.forEach(p => {
            sum += p.overall;
        });
        return (sum / 20).toFixed(1);
    }
}

window.startMatchSimulation = function() {
    switchView('match');
}

function renderMatchPage(container) {
    if (gameState.matchIndex > gameState.totalMatches) {
        container.innerHTML = `<h1 class="title-main" style="text-align:center; padding: 5rem 0;">Season Completed!</h1>`;
        return;
    }
    
    if (!gameState.nextMatch) {
        container.innerHTML = `<h1 class="title-main" style="text-align:center; padding: 5rem 0;">No scheduled matches found!</h1>`;
        return;
    }
    
    const isHome = gameState.nextMatch.homeId === gameState.team.id;
    const opponentId = isHome ? gameState.nextMatch.awayId : gameState.nextMatch.homeId;
    
    const myTeamInfo = currentTeam;
    const oppTeamInfo = ohlTeams.find(t => t.id === opponentId);
    
    // Mocking currentMatch for the simulation loop logic
    const currentMatch = {
        homeTeam: gameState.nextMatch.homeId,
        awayTeam: gameState.nextMatch.awayId,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled'
    };
    
    const myLogo = myTeamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const oppLogo = oppTeamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    
    const myOvr = getTeamOverall(myTeamInfo.id, true);
    const oppOvr = getTeamOverall(oppTeamInfo.id, false);

    const homeColor = isHome ? myTeamInfo.colors.primary : oppTeamInfo.colors.primary;
    const awayColor = !isHome ? myTeamInfo.colors.primary : oppTeamInfo.colors.primary;

    // Build the scoreboard HTML
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; width: 100%; box-sizing: border-box; padding: 2rem 0; position: relative;">
            
            <h1 class="title-main" style="text-align: center; font-size: 2.5rem; letter-spacing: 2px; flex-shrink: 0; margin-bottom: 1rem;">MATCH SIMULATION</h1>
            
            <div style="display: flex; flex-direction: column; width: 100%; max-width: 1000px; flex: 1; min-height: 0; gap: 2rem;">
                
                <!-- MAIN SCOREBOARD CONTAINER (70%) -->
                <div style="position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; width: 100%; flex: 7; min-height: 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 2rem 4rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
                    
                    <!-- DYNAMIC GRADIENT BACKGROUND -->
                    <div style="position: absolute; inset: 0; background: linear-gradient(135deg, color-mix(in srgb, ${homeColor} 40%, #0f172a 60%) 0%, color-mix(in srgb, ${awayColor} 40%, #0f172a 60%) 100%); z-index: -2;"></div>
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%); z-index: -1;"></div>
                    
                    <!-- DIAGONAL SLASH SEPARATOR -->
                    <div style="position: absolute; top: -50%; bottom: -50%; left: 50%; width: 2px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent); transform: rotate(15deg); z-index: -1;"></div>
                    
                    <!-- HOME TEAM -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; flex: 1; z-index: 1;">
                        <img src="assets/logos/ohl/${isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${homeColor});">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${isHome ? myTeamInfo.name : oppTeamInfo.name}</h2>
                        <div style="background-color: rgba(0,0,0,0.4); padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                            OVR: <span style="color: ${homeColor}; text-shadow: 0 0 10px ${homeColor};">${isHome ? myOvr : oppOvr}</span>
                        </div>
                    </div>
                    
                    <!-- SCOREBOARD CENTER -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 0 2rem; z-index: 1;">
                        <div id="match-period" style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; color: #fff; letter-spacing: 3px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">1ST PERIOD</div>
                        
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div id="home-score" style="font-family: 'Blockletter', sans-serif; font-size: 6rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                            <div style="font-family: 'Roboto', sans-serif; font-size: 2.5rem; color: rgba(255,255,255,0.3); font-weight: 700;">-</div>
                            <div id="away-score" style="font-family: 'Blockletter', sans-serif; font-size: 6rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                        </div>
                        
                        <div id="match-clock" style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fff; background-color: rgba(0,0,0,0.6); padding: 0.5rem 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); letter-spacing: 2px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">20:00</div>
                    </div>
                    
                    <!-- AWAY TEAM -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; flex: 1; z-index: 1;">
                        <img src="assets/logos/ohl/${!isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${awayColor});">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${!isHome ? myTeamInfo.name : oppTeamInfo.name}</h2>
                        <div style="background-color: rgba(0,0,0,0.4); padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                            OVR: <span style="color: ${awayColor}; text-shadow: 0 0 10px ${awayColor};">${!isHome ? myOvr : oppOvr}</span>
                        </div>
                    </div>
                    
                </div>
                
                <!-- EVENT LOG (30%) -->
                <div id="event-log" style="width: 100%; flex: 3; min-height: 0; background: transparent; border-top: 2px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05); overflow-y: auto; padding: 1.5rem 1rem; font-family: 'Blockletter', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: #fff; display: flex; flex-direction: column; gap: 1rem; scroll-behavior: smooth;">
                    <div style="text-align: center; color: var(--text-muted); font-family: 'Roboto', sans-serif; font-style: italic; font-size: 1rem;">Puck drop! The match is underway...</div>
                </div>
                
            </div>
            
            <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <button id="btn-finish-match" class="btn" style="display: none; padding: 1rem 3rem; font-size: 1.5rem; letter-spacing: 2px; background: linear-gradient(180deg, #10b981 0%, #059669 100%);">
                    CONTINUE
                </button>
                
                <button id="btn-debug-skip" class="btn btn-secondary" style="padding: 0.5rem 2rem; font-size: 1rem; letter-spacing: 1px; border-color: rgba(255,255,255,0.2); color: var(--text-muted);">
                    <i data-lucide="fast-forward" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;"></i> SKIP SIM
                </button>
            </div>
            
            <!-- GOAL ANIMATION OVERLAY -->
            <div id="goal-animation" style="opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; transform: translate(-50%, -50%) scale(0.5); position: absolute; top: 50%; left: 50%; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.95); border: 4px solid #ef4444; border-radius: 20px; padding: 3rem 6rem; box-shadow: 0 0 50px rgba(239, 68, 68, 0.8);">
                <h1 style="font-family: 'Blockletter', sans-serif; font-size: 8rem; color: #ef4444; margin: 0; text-shadow: 0 0 30px rgba(239,68,68,0.8); letter-spacing: 10px;">GOAL!</h1>
                <h2 id="goal-team-name" style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fff; margin: 0; margin-top: 1rem;">TEAM NAME</h2>
            </div>
            
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Set up Match Data
    currentMatch.homeScore = 0;
    currentMatch.awayScore = 0;
    
    // 1. Generate the timeline of events
    const timeline = generateMatchTimeline(myOvr, oppOvr, isHome, myTeamInfo, oppTeamInfo);
    
    // 2. Play back the events
    playMatchEvents(timeline, isHome, myTeamInfo, oppTeamInfo, currentMatch);
}

function generateMatchTimeline(myOvr, oppOvr, isHome, myTeam, oppTeam) {
    const timeline = [];
    const homeOvr = isHome ? myOvr : oppOvr;
    const awayOvr = !isHome ? myOvr : oppOvr;
    
    // Base probability of a goal per minute is roughly 5% (~3 goals per 60 mins)
    // We adjust this base probability using the ratio of Team OVRs.
    const ovrRatio = parseFloat(homeOvr) / (parseFloat(awayOvr) || 1);
    
    let homeChance = 0.05 * (ovrRatio > 1 ? ovrRatio : 1);
    let awayChance = 0.05 * (ovrRatio < 1 ? (1 / ovrRatio) : 1);
    
    // Cap chances so it doesn't get ridiculous
    homeChance = Math.min(homeChance, 0.15);
    awayChance = Math.min(awayChance, 0.15);

    for (let period = 1; period <= 3; period++) {
        for (let minute = 19; minute >= 0; minute--) {
            let r = Math.random();
            if (r < homeChance) {
                timeline.push({
                    period: period,
                    minute: minute,
                    second: Math.floor(Math.random() * 60),
                    type: 'goal',
                    team: 'home',
                    teamName: isHome ? myTeam.name : oppTeam.name,
                    color: isHome ? myTeam.colors.primary : oppTeam.colors.primary,
                    text: `GOAL! The ${isHome ? myTeam.name : oppTeam.name} find the back of the net!`
                });
            } else if (r < homeChance + awayChance) {
                timeline.push({
                    period: period,
                    minute: minute,
                    second: Math.floor(Math.random() * 60),
                    type: 'goal',
                    team: 'away',
                    teamName: !isHome ? myTeam.name : oppTeam.name,
                    color: !isHome ? myTeam.colors.primary : oppTeam.colors.primary,
                    text: `GOAL! The ${!isHome ? myTeam.name : oppTeam.name} score a beautiful goal!`
                });
            }
        }
        
        // Add end of period event
        timeline.push({
            period: period,
            minute: 0,
            second: 0,
            type: 'end_period'
        });
    }
    
    // Sort timeline so events happen in chronological order
    timeline.sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        if (a.minute !== b.minute) return b.minute - a.minute; // Descending (19 -> 0)
        return b.second - a.second; // Descending (59 -> 0)
    });
    
    return timeline;
}

async function playMatchEvents(timeline, isHome, myTeam, oppTeam, currentMatch) {
    const clockEl = document.getElementById('match-clock');
    const periodEl = document.getElementById('match-period');
    const homeScoreEl = document.getElementById('home-score');
    const awayScoreEl = document.getElementById('away-score');
    const logEl = document.getElementById('event-log');
    const goalAnim = document.getElementById('goal-animation');
    const goalTeamName = document.getElementById('goal-team-name');
    const btnFinish = document.getElementById('btn-finish-match');
    const btnSkip = document.getElementById('btn-debug-skip');
    
    let isSkipped = false;
    
    btnSkip.addEventListener('click', () => {
        isSkipped = true;
        btnSkip.style.display = 'none';
    });
    
    function logEvent(text, color = '#cbd5e1') {
        const div = document.createElement('div');
        div.style.color = color;
        div.innerText = text;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }
    
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    let currentPeriod = 1;
    let currentSecond = 1200; // 20:00
    
    // Process event by event
    for (let event of timeline) {
        if (isSkipped) break; // If skipped, jump out of visual playback
        
        let eventTotalSeconds = event.minute * 60 + event.second;
        
        // Jump directly to the event time
        currentPeriod = event.period;
        currentSecond = eventTotalSeconds;
        
        let m = Math.floor(currentSecond / 60);
        let s = currentSecond % 60;
        clockEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        // Brief pause to create suspense before showing the event
        await wait(1000);
        
        if (isSkipped) break;
        
        if (event.type === 'end_period') {
            if (currentPeriod < 3) {
                logEvent(`--- End of ${periodEl.innerText} ---`);
                await wait(1500);
                currentPeriod++;
                currentSecond = 1200;
                periodEl.innerText = currentPeriod === 2 ? "2ND PERIOD" : "3RD PERIOD";
                clockEl.innerText = "20:00";
                logEvent(`--- Start of ${periodEl.innerText} ---`);
                await wait(1500);
            }
            continue; // Skip the rest of the loop for end_period
        }
        
        // Trigger Goal Event
        logEvent(`${clockEl.innerText} - ${event.text}`, event.color);
        
        if (event.type === 'goal') {
            if (event.team === 'home') {
                currentMatch.homeScore++;
                homeScoreEl.innerText = currentMatch.homeScore;
            } else {
                currentMatch.awayScore++;
                awayScoreEl.innerText = currentMatch.awayScore;
            }
            
            // Show Animation
            goalTeamName.innerText = event.teamName;
            goalTeamName.style.color = event.color;
            goalAnim.style.opacity = '1';
            goalAnim.style.transform = 'translate(-50%, -50%) scale(1)';
            
            await wait(2500); // Pause for celebration
            
            // Hide Animation
            goalAnim.style.opacity = '0';
            goalAnim.style.transform = 'translate(-50%, -50%) scale(0.5)';
            await wait(500);
        }
    }
    
    // Fast forward to end of game if skipped or no more events
    if (isSkipped) {
        // Process remaining goals mathematically without UI delays
        for (let event of timeline) {
            let isFuture = event.period > currentPeriod || (event.period === currentPeriod && (event.minute * 60 + event.second) <= currentSecond);
            if (isFuture && event.type === 'goal') {
                if (event.team === 'home') currentMatch.homeScore++;
                else currentMatch.awayScore++;
            }
        }
    }
    
    // Set UI to final state
    clockEl.innerText = "00:00";
    periodEl.innerText = "FINAL";
    periodEl.style.color = "#ef4444";
    homeScoreEl.innerText = currentMatch.homeScore;
    awayScoreEl.innerText = currentMatch.awayScore;
    btnSkip.style.display = "none";
    btnFinish.style.display = "block";
    
    logEvent(`--- MATCH FINISHED ---`);
    logEvent(`Final Score: ${isHome ? myTeam.name : oppTeam.name} ${currentMatch.homeScore} - ${!isHome ? myTeam.name : oppTeam.name} ${currentMatch.awayScore}`);
    
    btnFinish.onclick = () => {
        currentMatch.status = 'completed';
        gameState.matchIndex++;
        // TODO: Update Standings and calendar here in the future
        switchView('dashboard');
    };
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
        
        document.body.style.removeProperty('--bg-color');
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-attachment');
        document.documentElement.style.removeProperty('--team-primary');
        gameState = null;
        currentTeam = null;
        
        initLeagueSelection();
    });
}

// --- SAVE & LOAD SYSTEM ---
window.saveGame = function() {
    if (!gameState || !currentTeam) return;
    const saveData = {
        gameState: gameState,
        currentTeam: currentTeam
    };
    localStorage.setItem('hockeyGmSave', JSON.stringify(saveData));
    
    // Toast notification
    const toast = document.createElement('div');
    toast.style.cssText = "position: fixed; bottom: 2rem; right: 2rem; background: #10b981; color: #fff; padding: 1rem 2rem; border-radius: 8px; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; z-index: 9999; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: opacity 0.5s ease;";
    toast.innerHTML = '<i data-lucide="save" style="margin-right: 0.5rem; vertical-align: middle;"></i> GAME SAVED';
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}

window.loadGame = async function() {
    const saved = localStorage.getItem('hockeyGmSave');
    if (!saved) return;
    
    const loadBtn = document.getElementById('league-load');
    if(loadBtn) loadBtn.innerHTML = '<h3 class="team-card-title">LOADING...</h3>';
    
    try {
        const response = await fetch('data/rosters.json');
        const allRosters = await response.json();
        let globalDraftPool = [];
        Object.values(allRosters).forEach(teamRoster => {
            if (teamRoster && teamRoster.length > 0) {
                globalDraftPool = globalDraftPool.concat(teamRoster);
            }
        });
        window.globalDraftPool = globalDraftPool;
    } catch(e) {
        console.error("Failed to load rosters", e);
        if(loadBtn) loadBtn.innerHTML = '<h3 class="team-card-title" style="color: #ef4444;">ERROR</h3>';
        return;
    }
    
    const data = JSON.parse(saved);
    gameState = data.gameState;
    
    // Revive Date objects
    if (gameState.currentDate) {
        gameState.currentDate = new Date(gameState.currentDate);
    }
    
    currentTeam = data.currentTeam;
    
    document.body.style.removeProperty('--bg-color');
    document.body.style.background = `linear-gradient(135deg, color-mix(in srgb, ${currentTeam.colors.primary} 60%, #0b1121) 0%, color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #0b1121) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    document.documentElement.style.setProperty('--team-primary', currentTeam.colors.primary);
    
    const app = document.getElementById('app');
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
                    <button class="nav-btn" id="nav-standings">
                        <i data-lucide="bar-chart-2" style="margin-right: 8px; width: 20px; height: 20px;"></i> Standings
                    </button>
                    <button class="nav-btn" id="nav-calendar">
                        <i data-lucide="calendar" style="margin-right: 8px; width: 20px; height: 20px;"></i> Calendar
                    </button>
                    <button class="nav-btn" id="nav-collection">
                        <i data-lucide="library" style="margin-right: 8px; width: 20px; height: 20px;"></i> Collection
                    </button>
                    <button class="nav-btn" id="nav-shop">
                        <i data-lucide="shopping-cart" style="margin-right: 8px; width: 20px; height: 20px;"></i> Shop
                    </button>
                </nav>
                
                <div class="sidebar-bottom">
                    <div class="coins-display">
                        <span class="coins-icon">🪙</span>
                        <span class="coins-amount">0</span>
                    </div>
                    <!-- Save button -->
                    <button id="btn-save-game" class="btn btn-sm" style="width: 100%; margin-bottom: 0.8rem; font-size: 0.9rem; background-color: transparent; border: 2px solid var(--team-primary); color: var(--team-primary); transition: all 0.2s ease; display: flex; justify-content: center; align-items: center; gap: 0.4rem;">
                        <i data-lucide="save" style="width: 18px; height: 18px;"></i> Save Game
                    </button>
                    <button class="btn btn-danger btn-sm" id="btn-back-selection" style="width: 100%; font-size: 0.9rem; background-color: #ef4444; color: #fff; border: none; display: flex; justify-content: center; align-items: center; gap: 0.4rem;">
                        <i data-lucide="log-out" style="width: 18px; height: 18px;"></i> Leave Game
                    </button>
                </div>
            </aside>
            
            <main class="main-content" id="main-content">
            </main>
        </div>
    `;
    
    // Bind Sidebar Navigation
    document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard'));
    document.getElementById('nav-roster').addEventListener('click', () => switchView('roster'));
    document.getElementById('nav-standings').addEventListener('click', () => switchView('standings'));
    document.getElementById('nav-calendar').addEventListener('click', () => switchView('calendar'));
    document.getElementById('nav-collection').addEventListener('click', () => switchView('collection'));
    document.getElementById('nav-shop').addEventListener('click', () => switchView('shop'));
    
    // Bind Save Game
    const btnSaveGame = document.getElementById('btn-save-game');
    if (btnSaveGame) {
        btnSaveGame.addEventListener('click', () => saveGame());
    }

    // Bind Back to Selection
    document.getElementById('btn-back-selection').addEventListener('click', () => {
        openBackConfirmationModal();
    });
    
    updateCoinsDisplay();
    if (window.lucide) window.lucide.createIcons();
    switchView('dashboard');
}

function openSellConfirmationModal(player) {
    const salePrice = Math.floor(200 * (player.overall / 100));
    const modalHTML = `
        <div id="sell-confirm-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="coins" style="color: #ef4444; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Sell Player?</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">Are you sure you want to sell <strong style="color: #fff;">${player.name}</strong>? You will receive <strong style="color: #fbbf24;">${salePrice} coins</strong>.</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="btn-cancel-sell">Cancel</button>
                    <button class="btn btn-danger" id="btn-confirm-sell" style="background-color: #ef4444; color: #fff;">Sell Player</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-cancel-sell').addEventListener('click', () => {
        document.getElementById('sell-confirm-modal').remove();
    });
    
    document.getElementById('btn-confirm-sell').addEventListener('click', () => {
        document.getElementById('sell-confirm-modal').remove();
        
        // Execute sale logic
        gameState.coins = (gameState.coins || 0) + salePrice;
        
        let indexToRemove = gameState.players.findIndex(p => p.id === player.id);
        while (indexToRemove > -1) {
            gameState.players.splice(indexToRemove, 1);
            indexToRemove = gameState.players.findIndex(p => p.id === player.id);
        }
        
        updateCoinsDisplay();
        
        // Update UI explicitly AFTER drag lifecycle is over
        const mainContent = document.getElementById('main-content');
        if (mainContent) renderRoster(mainContent);
    });
}

function openCollectionConfirmationModal(player) {
    const modalHTML = `
        <div id="collection-confirm-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #3b82f6; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(59, 130, 246, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="archive" style="color: #3b82f6; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Send to Collection?</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">Send <strong style="color: #fff;">${player.name}</strong> to your Collection? He will be permanently removed from your active roster.</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="btn-cancel-collection">Cancel</button>
                    <button class="btn btn-danger" id="btn-confirm-collection" style="background-color: #3b82f6; color: #fff;">Send to Collection</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-cancel-collection').addEventListener('click', () => {
        document.getElementById('collection-confirm-modal').remove();
    });
    
    document.getElementById('btn-confirm-collection').addEventListener('click', () => {
        document.getElementById('collection-confirm-modal').remove();
        
        // Execute collection logic
        gameState.collection = gameState.collection || [];
        gameState.collection.push(player);
        
        let indexToRemove = gameState.players.findIndex(p => p.id === player.id);
        while (indexToRemove > -1) {
            gameState.players.splice(indexToRemove, 1);
            indexToRemove = gameState.players.findIndex(p => p.id === player.id);
        }
        
        // Update UI explicitly AFTER drag lifecycle is over
        const mainContent = document.getElementById('main-content');
        if (mainContent) renderRoster(mainContent);
    });
}

let standingsCurrentTab = 'regular'; // 'regular' or 'playoffs'
let standingsGroupBy = 'division'; // 'division', 'conference', 'league'

function updateClinchStatuses() {
    if (!gameState || !gameState.standings) return;
    
    gameState.standings.forEach(s => {
        s.pts = (s.w * 2) + s.otl;
        s.maxPts = s.pts + ((68 - s.gp) * 2);
        const info = ohlTeams.find(t => t.id === s.teamId);
        s.conf = info.conference;
        s.div = info.division;
        s.clinch = ''; // reset
    });

    const checkClinch = (team, opponents, targetRank) => {
        const sortedOpp = [...opponents].sort((a,b) => {
            if (a.maxPts !== b.maxPts) return b.maxPts - a.maxPts;
            const maxW_a = a.w + (68 - a.gp);
            const maxW_b = b.w + (68 - b.gp);
            return maxW_b - maxW_a;
        });
        const targetOpp = sortedOpp[targetRank];
        if (!targetOpp) return true;
        
        if (team.pts > targetOpp.maxPts) return true;
        if (team.pts === targetOpp.maxPts) {
            const targetMaxW = targetOpp.w + (68 - targetOpp.gp);
            if (team.w > targetMaxW) return true;
        }
        return false;
    };

    gameState.standings.forEach(s => {
        const othersLeague = gameState.standings.filter(o => o.teamId !== s.teamId);
        const othersConf = othersLeague.filter(o => o.conf === s.conf);
        const othersDiv = othersLeague.filter(o => o.div === s.div);

        if (checkClinch(s, othersLeague, 0)) {
            s.clinch = 'z';
        } else if (checkClinch(s, othersDiv, 0)) {
            s.clinch = 'y';
        } else if (checkClinch(s, othersConf, 7)) { // 8th team in opponents = 9th best overall
            s.clinch = 'x';
        }
    });
}

function renderStandingsPage(container) {
    if (!gameState) return;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h1 class="title-main" style="margin: 0; text-align: left;">League Standings</h1>
            
            <div style="display: flex; gap: 1rem; align-items: center;">
                <button class="btn btn-sm" style="background-color: #8b5cf6; border: none; color: white;" onclick="simulatePlayoffDebug()">🎲 Simulate Playoff Debug</button>
                
                <div class="tabs" style="display: flex; background-color: rgba(0,0,0,0.2); padding: 0.2rem; border-radius: 8px;">
                    <button class="tab-btn ${standingsCurrentTab === 'regular' ? 'active' : ''}" onclick="switchStandingsTab('regular')" style="padding: 0.5rem 1.5rem; border-radius: 6px; border: none; background: ${standingsCurrentTab === 'regular' ? 'var(--team-primary)' : 'transparent'}; color: white; cursor: pointer;">Regular Season</button>
                    <button class="tab-btn ${standingsCurrentTab === 'playoffs' ? 'active' : ''}" onclick="switchStandingsTab('playoffs')" style="padding: 0.5rem 1.5rem; border-radius: 6px; border: none; background: ${standingsCurrentTab === 'playoffs' ? 'var(--team-primary)' : 'transparent'}; color: white; cursor: pointer;">Playoffs</button>
                </div>
            </div>
        </div>
        
        <div id="standings-page-content">
            <!-- Content will be injected here -->
        </div>
    `;
    
    container.innerHTML = html;
    
    const content = document.getElementById('standings-page-content');
    if (standingsCurrentTab === 'regular') {
        renderFullStandings(content);
    } else {
        renderPlayoffBracket(content);
    }
}

window.switchStandingsTab = function(tab) {
    standingsCurrentTab = tab;
    switchView('standings');
};

window.switchStandingsGroup = function(group) {
    standingsGroupBy = group;
    const content = document.getElementById('standings-page-content');
    if (content) {
        renderFullStandings(content);
    }
};

function renderFullStandings(container) {
    let html = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
            <div class="tabs" style="display: flex; background-color: rgba(0,0,0,0.2); padding: 0.2rem; border-radius: 8px;">
                <button class="tab-btn ${standingsGroupBy === 'division' ? 'active' : ''}" onclick="switchStandingsGroup('division')" style="padding: 0.4rem 1.2rem; border-radius: 6px; border: none; background: ${standingsGroupBy === 'division' ? 'rgba(255,255,255,0.1)' : 'transparent'}; color: white; cursor: pointer;">By Division</button>
                <button class="tab-btn ${standingsGroupBy === 'conference' ? 'active' : ''}" onclick="switchStandingsGroup('conference')" style="padding: 0.4rem 1.2rem; border-radius: 6px; border: none; background: ${standingsGroupBy === 'conference' ? 'rgba(255,255,255,0.1)' : 'transparent'}; color: white; cursor: pointer;">By Conference</button>
                <button class="tab-btn ${standingsGroupBy === 'league' ? 'active' : ''}" onclick="switchStandingsGroup('league')" style="padding: 0.4rem 1.2rem; border-radius: 6px; border: none; background: ${standingsGroupBy === 'league' ? 'rgba(255,255,255,0.1)' : 'transparent'}; color: white; cursor: pointer;">Entire League</button>
            </div>
        </div>
    `;
    
    // Preparar dados
    let allStandings = [...gameState.standings];
    allStandings.forEach(s => {
        s.pts = (s.w * 2) + s.otl;
        const info = ohlTeams.find(t => t.id === s.teamId);
        s.teamName = info.name;
        s.conference = info.conference;
        s.division = info.division;
    });
    
    // Ordenação global base (Pts -> W -> OTL)
    allStandings.sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        if (a.w !== b.w) return b.w - a.w;
        if (a.otl !== b.otl) return b.otl - a.otl;
        return 0;
    });

    const renderTable = (standingsArr) => {
        let tableHtml = `
            <div class="standings-card" style="background-color: color-mix(in srgb, var(--team-secondary, var(--primary-color)) 60%, var(--card-bg)); border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); margin-bottom: 2rem; padding: 1.5rem; overflow: hidden; position: relative;">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">#</th>
                            <th style="text-align: left;">Team</th>
                            <th style="text-align: center;">GP</th>
                            <th style="text-align: center;">W</th>
                            <th style="text-align: center;">L</th>
                            <th style="text-align: center;">OTL</th>
                            <th style="text-align: center; color: #fff;">PTS</th>
                            <th style="text-align: center;">GF</th>
                            <th style="text-align: center;">GA</th>
                            <th style="text-align: center;">Streak</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        standingsArr.forEach((s, idx) => {
            const teamInfo = ohlTeams.find(t => t.id === s.teamId);
            const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
            const isActiveTeam = teamInfo.id === currentTeam.id;
            
            // Seed Calculation based on Clinch algorithm
            const seedLabel = s.clinch ? s.clinch : '';
            
            // Reutilizando a classe team-row-active e td team-cell do Dashboard para consistência
            tableHtml += `
                <tr class="${isActiveTeam ? 'team-row-active' : ''}">
                    <td>${idx + 1}</td>
                    <td class="team-cell">
                        <img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 32px; height: 32px;">
                        <span>${seedLabel ? `<span style="color: var(--text-muted); font-family: monospace; font-size: 0.8rem; margin-right: 0.3rem;">${seedLabel} -</span>` : ''}${teamInfo.name.toUpperCase()}</span>
                    </td>
                    <td>${s.gp}</td>
                    <td>${s.w}</td>
                    <td>${s.l}</td>
                    <td>${s.otl}</td>
                    <td><strong>${s.pts}</strong></td>
                    <td style="color: rgba(255,255,255,0.7);">${s.gf}</td>
                    <td style="color: rgba(255,255,255,0.7);">${s.ga}</td>
                    <td style="color: rgba(255,255,255,0.7);">${(!s.streak || s.streak.count === 0 || s.streak.type === 'None') ? '-' : s.streak.type + s.streak.count}</td>
                </tr>
            `;
        });
        
        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;
        return tableHtml;
    };

    if (standingsGroupBy === 'division') {
        const conferences = [
            { name: 'Eastern Conference', key: 'East', divisions: ['East', 'Central'] },
            { name: 'Western Conference', key: 'West', divisions: ['Midwest', 'West'] }
        ];
        conferences.forEach(conf => {
            html += `<h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">${conf.name}</h2>`;
            conf.divisions.forEach(div => {
                html += `<h3 style="font-family: 'Roboto', sans-serif; font-size: 1.2rem; color: var(--text-color); margin-top: 1rem; margin-bottom: 0.5rem; padding-left: 0.5rem; border-left: 3px solid var(--team-primary);">${div} Division</h3>`;
                html += renderTable(allStandings.filter(s => s.division === div));
            });
        });
    } else if (standingsGroupBy === 'conference') {
        const conferences = ['East', 'West'];
        conferences.forEach(conf => {
            html += `<h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">${conf}ern Conference</h2>`;
            html += renderTable(allStandings.filter(s => s.conference === conf));
        });
    } else if (standingsGroupBy === 'league') {
        html += `<h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Overall League</h2>`;
        html += renderTable(allStandings);
    }
    
    container.innerHTML = html;
}

function renderPlayoffBracket(container) {
    if (!gameState.playoffs) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: var(--text-muted);">
                <i data-lucide="git-merge" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; margin: 0;">Playoffs Not Started</h3>
                <p>The playoff bracket will be generated at the end of the regular season.</p>
                <p>Use the "Simulate Playoff Debug" button above to test the view.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    // We will render a flexbox bracket tree
    const p = gameState.playoffs;
    
    function renderMatchup(m) {
        if (!m) return `<div class="matchup-card empty">TBD</div>`;
        const t1 = ohlTeams.find(t => t.id === m.team1) || { name: 'TBD' };
        const t2 = ohlTeams.find(t => t.id === m.team2) || { name: 'TBD' };
        
        const logo1 = t1.name !== 'TBD' ? t1.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        const logo2 = t2.name !== 'TBD' ? t2.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        
        const winner = m.winner;
        
        return `
            <div class="matchup-card">
                <div class="matchup-row ${winner === t1.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t1.name !== 'TBD' ? `<img src="assets/logos/ohl/${logo1}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${t1.name.split(' ').pop()}</span>
                    </div>
                    <span>${m.score1 !== undefined ? m.score1 : '-'}</span>
                </div>
                <div class="matchup-row ${winner === t2.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t2.name !== 'TBD' ? `<img src="assets/logos/ohl/${logo2}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${t2.name.split(' ').pop()}</span>
                    </div>
                    <span>${m.score2 !== undefined ? m.score2 : '-'}</span>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div class="bracket-wrapper">
            <div class="bracket-container">
                <!-- WEST -->
                <div class="bracket-col col-left-1">
                    ${renderMatchup(p.r1.w1)}
                    ${renderMatchup(p.r1.w8)}
                    ${renderMatchup(p.r1.w2)}
                    ${renderMatchup(p.r1.w7)}
                </div>
                <div class="bracket-col col-left-2">
                    ${renderMatchup(p.r2.w1)}
                    ${renderMatchup(p.r2.w2)}
                </div>
                <div class="bracket-col col-left-3">
                    ${renderMatchup(p.r3.w)}
                </div>
                
                <!-- FINAL -->
                <div class="bracket-col" style="padding: 0 1rem;">
                    <h3 style="text-align: center; font-family: 'Blockletter', sans-serif; margin-bottom: 1rem; color: #fcc82d; text-shadow: 0 0 10px rgba(252, 200, 45, 0.4);">J. Ross Robertson Cup</h3>
                    ${renderMatchup(p.final)}
                </div>
                
                <!-- EAST -->
                <div class="bracket-col col-right-3">
                    ${renderMatchup(p.r3.e)}
                </div>
                <div class="bracket-col col-right-2">
                    ${renderMatchup(p.r2.e1)}
                    ${renderMatchup(p.r2.e2)}
                </div>
                <div class="bracket-col col-right-1">
                    ${renderMatchup(p.r1.e1)}
                    ${renderMatchup(p.r1.e8)}
                    ${renderMatchup(p.r1.e2)}
                    ${renderMatchup(p.r1.e7)}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

window.simulatePlayoffDebug = function() {
    // 1. Randomize regular season standings
    gameState.standings.forEach(s => {
        s.w = Math.floor(Math.random() * 40) + 10;
        s.l = Math.floor(Math.random() * 30) + 5;
        s.otl = 68 - s.w - s.l;
        if (s.otl < 0) { s.l += s.otl; s.otl = 0; }
        s.gf = Math.floor(Math.random() * 150) + 150;
        s.ga = Math.floor(Math.random() * 150) + 150;
        s.pts = (s.w * 2) + s.otl;
        s.gp = 68; // Forçando a rodada 68
        
        const streaks = ['W', 'L'];
        s.streak = { type: streaks[Math.floor(Math.random()*2)], count: Math.floor(Math.random()*5)+1 };
    });
    
    // Atualiza matematicamente os Seeds baseados nos 68 jogos
    updateClinchStatuses();
    
    // Sort
    let all = [...gameState.standings];
    all.forEach(s => {
        s.conf = ohlTeams.find(t=>t.id===s.teamId).conference;
    });
    
    all.sort((a,b) => b.pts - a.pts);
    
    let east = all.filter(s => s.conf === 'East');
    let west = all.filter(s => s.conf === 'West');
    
    // Top 8 advance
    let eSeeds = east.slice(0, 8).map(s => s.teamId);
    let wSeeds = west.slice(0, 8).map(s => s.teamId);
    
    function simSeries(t1, t2) {
        let w1 = 0, w2 = 0;
        while(w1 < 4 && w2 < 4) {
            Math.random() > 0.5 ? w1++ : w2++;
        }
        return {
            team1: t1, team2: t2,
            score1: w1, score2: w2,
            winner: w1 === 4 ? t1 : t2
        };
    }
    
    let p = { r1: {}, r2: {}, r3: {}, final: {} };
    
    // Round 1
    p.r1.e1 = simSeries(eSeeds[0], eSeeds[7]);
    p.r1.e8 = simSeries(eSeeds[3], eSeeds[4]);
    p.r1.e2 = simSeries(eSeeds[1], eSeeds[6]);
    p.r1.e7 = simSeries(eSeeds[2], eSeeds[5]);
    
    p.r1.w1 = simSeries(wSeeds[0], wSeeds[7]);
    p.r1.w8 = simSeries(wSeeds[3], wSeeds[4]);
    p.r1.w2 = simSeries(wSeeds[1], wSeeds[6]);
    p.r1.w7 = simSeries(wSeeds[2], wSeeds[5]);
    
    // Round 2
    p.r2.e1 = simSeries(p.r1.e1.winner, p.r1.e8.winner);
    p.r2.e2 = simSeries(p.r1.e2.winner, p.r1.e7.winner);
    
    p.r2.w1 = simSeries(p.r1.w1.winner, p.r1.w8.winner);
    p.r2.w2 = simSeries(p.r1.w2.winner, p.r1.w7.winner);
    
    // Round 3
    p.r3.e = simSeries(p.r2.e1.winner, p.r2.e2.winner);
    p.r3.w = simSeries(p.r2.w1.winner, p.r2.w2.winner);
    
    // Final
    p.final = simSeries(p.r3.e.winner, p.r3.w.winner);
    
    gameState.playoffs = p;
    
    switchStandingsTab('playoffs');
};

function openRosterErrorModal() {
    const modalHTML = `
        <div id="roster-error-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #f59e0b; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(245, 158, 11, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="alert-triangle" style="color: #f59e0b; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Minimum Roster Limit</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You cannot remove this player! You must keep at least <strong style="color: #fff;">20 active players</strong> in your franchise, or have at least <strong style="color: #fbbf24;">200 coins</strong> to buy a replacement.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-roster" style="background-color: #f59e0b; border-color: #f59e0b; color: #fff; width: 100%;">Understood</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-roster').addEventListener('click', () => {
        document.getElementById('roster-error-modal').remove();
    });
}

function openInsufficientCoinsModal(cost) {
    const modalHTML = `
        <div id="coins-error-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="x-circle" style="color: #ef4444; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Insufficient Funds</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You don't have enough coins! You need <strong style="color: #fbbf24;">${cost} coins</strong> to purchase this pack.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-danger" id="btn-ok-coins" style="background-color: #ef4444; border-color: #ef4444; color: #fff; width: 100%;">Understood</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-coins').addEventListener('click', () => {
        document.getElementById('coins-error-modal').remove();
    });
}

function openEmptyPoolModal() {
    const modalHTML = `
        <div id="empty-pool-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #8b5cf6; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(139, 92, 246, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="award" style="color: #8b5cf6; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Pool Exhausted!</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">Unbelievable! You have successfully scouted and collected <strong style="color: #fff;">every single player</strong> available in the OHL.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-pool" style="background-color: #8b5cf6; border-color: #8b5cf6; color: #fff; width: 100%;">Wow!</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-pool').addEventListener('click', () => {
        document.getElementById('empty-pool-modal').remove();
    });
}
