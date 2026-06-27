import { ohlTeams } from '../data/teams.js';
import { generateSeasonSchedule } from './schedule.js';
import { generatePlayoffs, processPlayoffMatchResult, advancePlayoffRound } from './playoffs.js';

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
                <i data-lucide="save" style="width: 80px; height: 80px; color: var(--team-primary); margin-bottom: 1rem;"></i>
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
                    <h1 class="title-main">HOCKEY GM</h1>
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
        currentScheduleDayIndex: 0,
        players: [],
        coins: 200,
        collection: [],
        notifications: [],
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
        playoffs: null
    };
    
    // Generate Schedule
    gameState.schedule = generateSeasonSchedule(ohlTeams, date);
    
    // RF03: Generate initial roster
    try {
        const response = await fetch('data/rosters.json');
        const allRosters = await response.json();
        
        // Extrair todos os jogadores da liga para o "Draft Pool"
        let globalDraftPool = [];
        Object.values(allRosters).forEach(teamRoster => {
            if (teamRoster && teamRoster.length > 0) {
                teamRoster.forEach(p => {
                    p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                });
                globalDraftPool = globalDraftPool.concat(teamRoster);
            }
        });
        window.globalDraftPool = globalDraftPool;
        gameState.globalDraftPool = globalDraftPool;
        
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
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem;">Do you want to select the <strong style="color: ${team.colors.primary};">${team.name}</strong> as your franchise? You won't be able to change this later.</p>
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
    document.body.style.background = `linear-gradient(135deg, color-mix(in srgb, ${currentTeam.colors.primary} 15%, var(--bg-color)) 0%, color-mix(in srgb, ${currentTeam.colors.secondary} 15%, var(--bg-color)) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Configuração inicial de franquia e cores
    gameState.team = currentTeam;
    gameState.coins = 200; // Saldo inicial
    gameState.collection = []; // Coleção vazia
    document.documentElement.style.setProperty('--team-primary', currentTeam.colors.primary);
    document.documentElement.style.setProperty('--team-secondary', currentTeam.colors.secondary);
    
    app.innerHTML = `
        <div class="app-layout" style="--team-primary: ${currentTeam.colors.primary}; --team-secondary: ${currentTeam.colors.secondary};">
            <aside class="sidebar" style="background-color: color-mix(in srgb, ${currentTeam.colors.secondary} 15%, var(--surface-color));">
                <div class="sidebar-brand" style="display: flex; justify-content: space-between; align-items: center; padding-right: 1.5rem;">
                    <h2>HOCKEY GM</h2>
                    <div id="notification-bell" style="position: relative; cursor: pointer; color: var(--text-color); transition: color 0.2s ease;">
                        <i data-lucide="bell" style="width: 24px; height: 24px;"></i>
                        <span id="notification-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.7rem; font-weight: bold; border-radius: 50%; width: 16px; height: 16px; text-align: center; line-height: 16px;">0</span>
                    </div>
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
                    <button class="nav-btn" id="nav-halloffame">
                        <i data-lucide="star" style="margin-right: 8px; width: 20px; height: 20px;"></i> Hall of Fame
                    </button>
                    <button class="nav-btn" id="nav-playoffs" style="display: none; background: linear-gradient(90deg, #d97706 0%, #b45309 100%); color: white;">
                        <i data-lucide="trophy" style="margin-right: 8px; width: 20px; height: 20px;"></i> Playoffs
                    </button>
                    <button class="nav-btn" onclick="simulateToPlayoffs()" style="margin-top: 1rem; border: 1px dashed rgba(255,255,255,0.2); color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem; justify-content: center;">
                        <i data-lucide="fast-forward" style="margin-right: 8px; width: 16px; height: 16px;"></i> Skip to Playoffs
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
    document.getElementById('nav-halloffame').addEventListener('click', () => switchView('halloffame'));
    document.getElementById('nav-playoffs').addEventListener('click', () => switchView('playoffs'));
    
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
    
    // Toggle Playoffs Nav visibility
    const playoffsBtn = document.getElementById('nav-playoffs');
    if (playoffsBtn) {
        if (gameState.playoffs) {
            playoffsBtn.style.display = 'flex';
        } else {
            playoffsBtn.style.display = 'none';
        }
    }
    
    // Update Sidebar Brand based on view
    const sidebarBrand = document.querySelector('.sidebar-brand');
    if (sidebarBrand && gameState) {
        if (viewName !== 'dashboard' && viewName !== 'match') {
            const teamInfo = currentTeam;
            const logoFile = teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
            sidebarBrand.innerHTML = `
                <div style="display: flex; width: 100%; justify-content: space-between; align-items: flex-start; padding-right: 0.5rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                        <img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 60px; height: 60px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: var(--text-color);">${teamInfo.name}</div>
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: var(--text-muted);">${gameState.record.wins}-${gameState.record.losses}-${gameState.record.otl}</div>
                    </div>
                </div>
            `;
        } else {
            sidebarBrand.innerHTML = `
                <div style="display: flex; width: 100%; justify-content: space-between; align-items: flex-start; padding-right: 0.5rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                        <i data-lucide="shield" style="width: 50px; height: 50px; color: var(--text-color); filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));"></i>
                        <div style="font-family: 'Blockletter', sans-serif; font-size: 1.6rem; letter-spacing: 2px; line-height: 1; text-align: center;">HOCKEY<br>GM</div>
                    </div>
                </div>
            `;
        }
    }
    
    // Create icons immediately after injecting HTML
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Restore notification badge state
    if (window.updateNotificationBadge) {
        window.updateNotificationBadge();
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
    } else if (viewName === 'playoffs') {
        renderPlayoffsPage(mainContent);
    } else if (viewName === 'calendar') {
        renderCalendarPage(mainContent);
    } else if (viewName === 'collection') {
        renderCollectionPage(mainContent);
    } else if (viewName === 'halloffame') {
        renderHallOfFame(mainContent);
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
        
        const awayOvr = getTeamOverall(awayTeam.id, awayTeam.id === currentTeam.id);
        const homeOvr = getTeamOverall(homeTeam.id, homeTeam.id === currentTeam.id);
        
        let buttonHTML = '';
        if (daysToSimulate > 0) {
            buttonHTML = `
                <button class="btn" onclick="simulateBackgroundDays(${daysToSimulate})" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: var(--team-primary); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff;">
                    <i data-lucide="fast-forward" style="width: 20px; height: 20px;"></i> SIMULATE WEEK
                </button>
                <button class="btn" onclick="simulateToPlayoffs()" style="width: 100%; border: 1px solid rgba(255,255,255,0.1); background: transparent; font-size: 0.9rem; margin-top: -0.5rem; color: var(--text-muted); padding: 0.5rem;">
                    DEBUG: SKIP TO PLAYOFFS
                </button>
            `;
        } else {
            buttonHTML = `
                <button class="btn" onclick="startMatchSimulation()" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, ${awayTeam.colors.primary} 0%, ${homeTeam.colors.primary} 100%); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #fff;">
                    <i data-lucide="play-circle" style="width: 24px; height: 24px;"></i> PLAY MATCH
                </button>
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
                    scoreText = `Series Tied ${series.highSeedWins}-${series.lowSeedWins}`;
                } else if (series.highSeedWins > series.lowSeedWins) {
                    scoreText = `${highTeamStr} leads ${series.highSeedWins}-${series.lowSeedWins}`;
                } else {
                    scoreText = `${lowTeamStr} leads ${series.lowSeedWins}-${series.highSeedWins}`;
                }
                matchTitle = `Game ${nextMatchObj.gameNum} <span style="font-size: 0.9rem; color: var(--text-muted); margin-left: 0.5rem;">(${scoreText})</span>`;
            }
        }

        matchHTML = `
            <div class="dashboard-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: var(--text-color);">${matchTitle}</h3>
                    <span style="color: var(--team-primary); font-family: 'Blockletter', sans-serif; font-size: 1.2rem;">${nextMatchDateStr}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <!-- Away Team -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                        <img src="assets/logos/ohl/${awayLogo}.png" alt="Away Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: -0.3rem;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">${awayTeam.name.split(' ').slice(0, -1).join(' ')}</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem;">${awayTeam.name.split(' ').slice(-1).join(' ')}</span>
                        </div>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: var(--team-primary);">OVR ${awayOvr}</span>
                        <span style="color: var(--text-muted); font-size: 0.9rem;">${awayStandings.w}-${awayStandings.l}-${awayStandings.otl}</span>
                    </div>
                    
                    <div style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-muted);">VS</div>
                    
                    <!-- Home Team -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
                        <img src="assets/logos/ohl/${homeLogo}.png" alt="Home Logo" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: -0.3rem;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">${homeTeam.name.split(' ').slice(0, -1).join(' ')}</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem;">${homeTeam.name.split(' ').slice(-1).join(' ')}</span>
                        </div>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1rem; color: var(--team-primary);">OVR ${homeOvr}</span>
                        <span style="color: var(--text-muted); font-size: 0.9rem;">${homeStandings.w}-${homeStandings.l}-${homeStandings.otl}</span>
                    </div>
                </div>
                
                ${buttonHTML}
                
            </div>
        `;
    } else {
        if (!gameState.playoffs) {
            matchHTML = `
                <div class="dashboard-card" style="padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; border-color: #fbbf24;">
                    <i data-lucide="calendar-check" style="width: 60px; height: 60px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fbbf24;">REGULAR SEASON COMPLETED</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5;">You have completed all 68 games of the regular season.</p>
                    <button class="btn" onclick="startPlayoffs()" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        START PLAYOFFS
                    </button>
                </div>
            `;
        } else if (gameState.playoffs.isActive) {
            matchHTML = `
                <div class="dashboard-card" style="padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; border-color: #fbbf24;">
                    <i data-lucide="trophy" style="width: 60px; height: 60px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fbbf24;">PLAYOFFS IN PROGRESS</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5;">You are waiting for the next round or have been eliminated. Simulate the remaining matches.</p>
                    <button class="btn" onclick="simulateBackgroundDays(7)" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        SIMULATE WEEK
                    </button>
                </div>
            `;
        } else {
            matchHTML = `
                <div class="dashboard-card" style="padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; align-items: center; text-align: center; border-color: #fbbf24;">
                    <i data-lucide="award" style="width: 60px; height: 60px; color: #fbbf24; margin-bottom: -1rem;"></i>
                    <h3 style="margin: 0; font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fbbf24;">CHAMPION CROWNED</h3>
                    <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.5;">The playoffs have concluded.</p>
                    <button class="btn" onclick="advanceSeason()" style="width: 100%; border: none; font-size: 1.2rem; letter-spacing: 2px; background: linear-gradient(90deg, #d97706 0%, #b45309 100%);">
                        ENTER OFFSEASON
                    </button>
                </div>
            `;
        }
    }
    
    // Calcula quantos jogos faltam
    let playedGames = (gameState.record.wins || 0) + (gameState.record.losses || 0) + (gameState.record.otl || 0);
    
    container.innerHTML = `
        <div class="dashboard-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; background: linear-gradient(90deg, color-mix(in srgb, var(--team-primary) 20%, transparent) 0%, transparent 100%); padding: 1rem 1.5rem; border-radius: 12px; border-left: 4px solid var(--team-primary);">
            <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;">
                <img src="assets/logos/ohl/${logoFile}.png" alt="${currentTeam.name} Logo" style="width: 80px; height: 80px; object-fit: contain; filter: drop-shadow(0 0 15px color-mix(in srgb, var(--team-primary) 40%, transparent));">
                <div>
                    <h1 class="title-main" style="text-align: left; margin: 0 0 0.3rem 0; font-size: 2rem; line-height: 1;">${currentTeam.name}</h1>
                    <div style="font-size: 1rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.3rem; font-family: 'Roboto', sans-serif;">
                        <div style="color: var(--text-color); font-weight: 700; letter-spacing: 1px;">${dateStr}</div>
                        <div style="display: flex; gap: 0.8rem; align-items: center;">
                            <span style="background-color: color-mix(in srgb, var(--team-secondary) 20%, transparent); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid color-mix(in srgb, var(--team-secondary) 40%, transparent); font-size: 0.85rem;">Match ${playedGames + 1} of ${gameState.totalMatches || 68}</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: var(--text-color); letter-spacing: 2px;">${gameState.record.wins}-${gameState.record.losses}-${gameState.record.otl}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; align-items: center; padding-right: 0.5rem;">
                <div id="notification-bell" style="position: relative; cursor: pointer; color: #fff; transition: color 0.2s ease; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1);">
                    <i data-lucide="bell" style="width: 28px; height: 28px;"></i>
                    <span id="notification-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.8rem; font-weight: bold; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">0</span>
                </div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="dashboard-card standings-card" id="standings-container" style="padding: 1.5rem;">
                <!-- Generated by renderStandings() -->
            </div>
            
            <div class="dashboard-sidebar-column" style="display: flex; flex-direction: column; gap: 2rem;">
                ${matchHTML}
                
                <div class="dashboard-card" id="league-leaders-container" style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1;">
                    <!-- Generated by renderLeagueLeaders() -->
                </div>
            </div>
        </div>
    `;
    
    // Inject components
    renderStandings(document.getElementById('standings-container'));
    renderLeagueLeaders(document.getElementById('league-leaders-container'));
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.startPlayoffs = function() {
    generatePlayoffs(gameState);
    if (window.saveGame) window.saveGame();
    switchView('dashboard');
};

window.simulateBackgroundDays = function(daysCount) {
    if (!gameState.schedule) return;
    
    let daysSimulated = 0;
    
    for (let i = 0; i < daysCount; i++) {
        let day = gameState.schedule[gameState.currentScheduleDayIndex];
        if (!day) break;
        
        // Simulate all matches for this day
        day.matches.forEach(match => {
            if (!match.played) {
                simulateBackgroundMatch(match);
            }
        });
        
        // After all matches for the day are played, check if a playoff round should advance
        let advancedPlayoffs = false;
        if (gameState.playoffs && gameState.playoffs.isActive) {
            advancedPlayoffs = advancePlayoffRound(gameState);
        }
        
        // Advance Date
        let nextDay = gameState.schedule[gameState.currentScheduleDayIndex + 1];
        if (nextDay) {
            gameState.currentDate = new Date(nextDay.date);
        } else {
            // End of season
            gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
        }
        gameState.currentScheduleDayIndex++;
        daysSimulated++;
        
        if (advancedPlayoffs) {
            break; // Stop simulating so the user can see the next round matchups
        }
    }
    
    if (daysSimulated > 0) {
        if (window.saveGame) window.saveGame();
        
        let container = document.getElementById('main-content');
        if (container) {
            // Check if we are still on the dashboard before re-rendering
            const activeNav = document.querySelector('.sidebar-nav .nav-btn.active');
            if (activeNav && activeNav.id === 'nav-dashboard') {
                renderDashboard(container);
            }
        }
    }
}

window.simulateToPlayoffs = function() {
    if (gameState.playoffs) return;
    
    // Simulate all remaining regular season matches
    while (gameState.currentScheduleDayIndex < gameState.schedule.length && !gameState.playoffs) {
        let day = gameState.schedule[gameState.currentScheduleDayIndex];
        if (!day) break;
        
        day.matches.forEach(match => {
            if (!match.played) simulateBackgroundMatch(match);
        });
        
        let nextDay = gameState.schedule[gameState.currentScheduleDayIndex + 1];
        if (nextDay) {
            gameState.currentDate = new Date(nextDay.date);
        } else {
            gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
        }
        gameState.currentScheduleDayIndex++;
    }
    
    if (window.saveGame) window.saveGame();
    
    let container = document.getElementById('main-content');
    if (container) {
        const activeNav = document.querySelector('.sidebar-nav .nav-btn.active');
        if (activeNav && activeNav.id === 'nav-dashboard') {
            renderDashboard(container);
        }
    }
}

function simulateBackgroundMatch(match) {
    let homeTeam = ohlTeams.find(t => t.id === match.homeId);
    let awayTeam = ohlTeams.find(t => t.id === match.awayId);
    
    let homeOvr = window.getTeamOverall ? window.getTeamOverall(homeTeam.id, false) : 60;
    let awayOvr = window.getTeamOverall ? window.getTeamOverall(awayTeam.id, false) : 60;
    
    let homeScore = Math.floor(Math.random() * 4) + (homeOvr > awayOvr ? 2 : 0);
    let awayScore = Math.floor(Math.random() * 4) + (awayOvr > homeOvr ? 2 : 0);
    
    let isOT = false;
    if (homeScore === awayScore) {
        isOT = true;
        if (Math.random() > 0.5) homeScore++;
        else awayScore++;
    }
    
    match.played = true;
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.isOT = isOT;
    
    if (match.isPlayoff) {
        processPlayoffMatchResult(match, gameState);
    } else {
        updateStandings(match.homeId, match.awayId, homeScore, awayScore, isOT);
    }
    
    // Simulate player stats for CPU teams
    if (window.globalDraftPool) {
        let homePlayers = window.globalDraftPool.filter(p => p.originalTeamId === homeTeam.id);
        let awayPlayers = window.globalDraftPool.filter(p => p.originalTeamId === awayTeam.id);
        
        let homeShots = homeScore + Math.floor(Math.random() * 20) + 15;
        let awayShots = awayScore + Math.floor(Math.random() * 20) + 15;
        
        assignRandomStats(homePlayers, homeScore, awayScore, awayShots);
        assignRandomStats(awayPlayers, awayScore, homeScore, homeShots);
    }
}

function assignRandomStats(players, goalsScored, goalsAllowed, shotsAgainst) {
    if (!players || players.length === 0) return;
    
    let skaters = players.filter(p => p.position !== 'G');
    let goalies = players.filter(p => p.position === 'G');
    
    skaters.sort((a, b) => b.overall - a.overall);
    
    for (let i = 0; i < goalsScored; i++) {
        let scorerIndex = Math.floor(Math.abs(Math.random() - Math.random()) * skaters.length);
        let scorer = skaters[scorerIndex] || skaters[0];
        if (!scorer) continue;
        
        scorer.stats = scorer.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        scorer.stats.goals++;
        scorer.stats.points++;
        
        if (Math.random() > 0.3) {
            let assistIndex = Math.floor(Math.abs(Math.random() - Math.random()) * skaters.length);
            let assist = skaters[assistIndex] || skaters[1] || skaters[0];
            if (assist && assist.id !== scorer.id) {
                assist.stats = assist.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                assist.stats.assists++;
                assist.stats.points++;
            }
        }
    }
    
    if (goalies.length > 0 && shotsAgainst) {
        let startingGoalie = goalies.sort((a, b) => b.overall - a.overall)[0];
        startingGoalie.stats = startingGoalie.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        startingGoalie.stats.shotsAgainst = (startingGoalie.stats.shotsAgainst || 0) + shotsAgainst;
        startingGoalie.stats.goalsAgainst = (startingGoalie.stats.goalsAgainst || 0) + goalsAllowed;
        startingGoalie.stats.saves = (startingGoalie.stats.saves || 0) + (shotsAgainst - goalsAllowed);
        startingGoalie.stats.games++;
    }
    
    skaters.forEach(p => {
        p.stats = p.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        p.stats.games++;
    });
}

// Function already replaced above

function updateStandings(homeId, awayId, homeScore, awayScore, isOT) {
    let homeStanding = gameState.standings.find(s => s.teamId === homeId);
    let awayStanding = gameState.standings.find(s => s.teamId === awayId);
    
    if (homeStanding) {
        homeStanding.gp++;
        homeStanding.gf += homeScore;
        homeStanding.ga += awayScore;
    }
    if (awayStanding) {
        awayStanding.gp++;
        awayStanding.gf += awayScore;
        awayStanding.ga += homeScore;
    }
    
    if (homeScore > awayScore) {
        if (homeStanding) { homeStanding.w++; homeStanding.pts += 2; }
        if (awayStanding) {
            if (isOT) { awayStanding.otl++; awayStanding.pts += 1; }
            else { awayStanding.l++; }
        }
    } else {
        if (awayStanding) { awayStanding.w++; awayStanding.pts += 2; }
        if (homeStanding) {
            if (isOT) { homeStanding.otl++; homeStanding.pts += 1; }
            else { homeStanding.l++; }
        }
    }
    
    // Update player record if it's the user's team
    if (homeId === currentTeam.id) {
        if (homeScore > awayScore) gameState.record.wins++;
        else if (isOT) gameState.record.otl++;
        else gameState.record.losses++;
    } else if (awayId === currentTeam.id) {
        if (awayScore > homeScore) gameState.record.wins++;
        else if (isOT) gameState.record.otl++;
        else gameState.record.losses++;
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

function updateLeagueLeadersData() {
    if (!gameState) return;
    
    let playerMap = new Map();
    if (window.globalDraftPool) {
        window.globalDraftPool.forEach(p => playerMap.set(p.id, p));
    }
    if (gameState.players) {
        gameState.players.forEach(p => playerMap.set(p.id, p));
    }
    
    let allPlayers = Array.from(playerMap.values()).filter(p => p.stats && p.stats.games > 0);
    
    // Calculate Pts
    let topPts = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => b.stats.points - a.stats.points).slice(0, 10).map((p, i) => ({
        rank: i + 1, name: p.name, teamId: p.originalTeamId || p.teamId, stat: p.stats.points
    }));
    
    // Calculate Goals
    let topG = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10).map((p, i) => ({
        rank: i + 1, name: p.name, teamId: p.originalTeamId || p.teamId, stat: p.stats.goals
    }));
    
    // Calculate Assists
    let topA = [...allPlayers].filter(p => p.position !== 'G').sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10).map((p, i) => ({
        rank: i + 1, name: p.name, teamId: p.originalTeamId || p.teamId, stat: p.stats.assists
    }));
    
    // Calculate Save Percentage
    let goalies = [...allPlayers].filter(p => p.position === 'G' && p.stats.shotsAgainst > 0);
    let topSvp = goalies.sort((a, b) => {
        let svpA = a.stats.saves / a.stats.shotsAgainst;
        let svpB = b.stats.saves / b.stats.shotsAgainst;
        return svpB - svpA;
    }).slice(0, 10).map((p, i) => {
        let svp = (p.stats.saves / p.stats.shotsAgainst).toFixed(3).replace('0.', '.');
        return {
            rank: i + 1, name: p.name, teamId: p.originalTeamId || p.teamId, stat: svp
        };
    });
    
    gameState.leagueLeaders = {
        pts: topPts,
        g: topG,
        a: topA,
        svp: topSvp
    };
}

function renderLeagueLeaders() {
    const container = document.getElementById('league-leaders-container');
    if (!container) return;
    
    updateLeagueLeadersData();
    
    const leaders = gameState.leagueLeaders[currentLeaderTab] || [];
    
    let listHTML = `<div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem;">`;
    
    if (leaders.length === 0) {
        listHTML += `<p style="text-align: center; color: var(--text-muted); padding: 1rem 0; font-size: 0.95rem;">No stats available yet. Play matches to see leaders.</p>`;
    } else {
        leaders.forEach(l => {
            const teamInfo = ohlTeams.find(t => t.id === l.teamId);
            const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : '';
            const logoHtml = logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" alt="logo" style="width: 24px; height: 24px; object-fit: contain;">` : '';
            
            listHTML += `
                <div class="leader-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem; background-color: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${teamInfo ? teamInfo.colors.primary : '#3b82f6'}; cursor: pointer; transition: background-color 0.2s;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: var(--text-muted); width: 20px;">#${l.rank}</span>
                        ${logoHtml}
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
    if (!player) return 0;
    
    let loc = window.rosterTab === '3v3' ? player.ot_location : player.location;
    
    if (!loc || loc === 'bench' || loc === 'sell' || loc === 'collection') {
        return 0; // No buffs/debuffs outside active roster
    }
    
    let buff = 0;
    
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
        let tLoc = window.rosterTab === '3v3' ? p.ot_location : p.location;
        return p.id !== player.id && tLoc && tLoc.startsWith(linePrefix);
    });
    
    const hasChemistry = teammatesOnLine.some(t => t.originalTeamId && t.originalTeamId === player.originalTeamId);
    if (hasChemistry) {
        buff += 0.15;
    }
    
    return buff; // Total multiplier (e.g., +0.15, -0.10, +0.50)
}

function getPlayerCardHTML(player) {
    if (!player) return '';
    const posColors = {
        'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#06b6d4',
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
    let player = gameState.players.find(p => p.id === playerId);
    if (!player && gameState.collection) {
        player = gameState.collection.find(p => p.id === playerId);
    }
    if (!player) return;
    
    const posColors = { 'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#06b6d4', 'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899' };
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
                    <img src="https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg" alt="${player.name}" onerror="this.src='assets/default-player.svg'" style="width: 160px; height: 160px; object-fit: cover; border-radius: 50%; border: 4px solid ${tierColor}; background-color: #0f172a;">
                    <div style="position: absolute; bottom: 0; right: 80px; transform: translateX(50%); background-color: #0f172a; border: 2px solid ${tierColor}; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff;">
                        #${player.number}
                    </div>
                </div>
                
                <!-- INFO -->
                <div style="position: relative; z-index: 1; margin-top: 1rem; padding: 0 1.5rem;">
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${player.name}</h2>
                    <p style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: ${tierColor}; margin: 0.2rem 0 0 0; text-transform: uppercase;">${posFullName}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0.5rem 0 1rem 0;"><i data-lucide="map-pin" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${player.birthplace} • ${player.age} y/o</p>
                    
                    <!-- STATS -->
                    ${player.stats ? `
                    <div style="background-color: rgba(255,255,255,0.03); border-radius: 8px; padding: 1rem; border: 1px solid rgba(255,255,255,0.05); margin-top: 1rem; width: 100%;">
                        <h4 style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff; margin: 0 0 0.8rem 0; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3rem;">SEASON STATS</h4>
                        ${player.position === 'G' ? `
                        <div style="display: flex; justify-content: space-between; text-align: center; padding: 0 0.5rem;">
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">GP</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.games || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Saves</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.saves || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">SV%</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.shotsAgainst > 0 ? (player.stats.saves / player.stats.shotsAgainst).toFixed(3).replace('0.', '.') : '.000'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">GAA</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.games > 0 ? ((player.stats.goalsAgainst || 0) / player.stats.games).toFixed(2) : '0.00'}</div>
                            </div>
                        </div>
                        ` : `
                        <div style="display: flex; justify-content: space-between; text-align: center; padding: 0 0.5rem;">
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">GP</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.games || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">G</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.goals || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">A</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.assists || 0}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">PTS</div>
                                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; color: #fff;">${player.stats.points || 0}</div>
                            </div>
                        </div>
                        `}
                    </div>
                    ` : ''}

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
        
        const posColors = { 'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#06b6d4', 'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899' };
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
                    <img src="https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg" alt="${player.name}" onerror="this.src='assets/default-player.svg'" style="width: 140px; height: 140px; object-fit: cover; border-radius: 50%; border: 4px solid ${tierColor}; background-color: #0f172a;">
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
    const isOT = slotId.startsWith('ot_');
    const player = gameState.players.find(p => isOT ? p.ot_location === slotId : p.location === slotId);
    return `
        <div class="roster-slot drop-zone" data-slot-id="${slotId}" style="background-color: rgba(0,0,0,0.2); border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px; min-height: 48px; padding: 0.2rem; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem; flex: 1;">
            ${!player ? `<div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; text-align: center; margin: auto;">${label}</div>` : ''}
            ${player ? getPlayerCardHTML(player) : ''}
        </div>
    `;
}

let benchSortMetric = 'overall';
let benchSortDesc = true;

window.rosterTab = window.rosterTab || '5v5';
window.setRosterTab = function(tab) {
    window.rosterTab = tab;
    renderRoster(document.getElementById('main-content'));
};

function renderRoster(container) {
    // Determine which players show up on the "bench".
    // For 5v5, bench is anyone with location === 'bench'
    // For 3v3, bench is anyone with location !== 'bench' (i.e. active players) who do NOT have an ot_location, plus actual bench players
    const benchPlayers = gameState.players.filter(p => {
        // Exclude all CPU players from the user's bench
        if (p.location && p.location.startsWith('cpu_')) return false;
        
        if (window.rosterTab === '5v5') return p.location === 'bench';
        return !p.ot_location; // In 3v3 tab, ANYONE without an ot_location is on the bench to be dragged!
    });
    
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
    
    // Generate OT HTML
    let otHTML = '';
    for(let i=1; i<=3; i++) {
        otHTML += `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem;">
                <div style="width: 30px; display: flex; align-items: center; justify-content: center; font-family: 'Blockletter', sans-serif; color: var(--text-muted); font-size: 1rem;">OT${i}</div>
                ${renderRosterSlot(`ot_${i}_F1`, 'F')}
                ${renderRosterSlot(`ot_${i}_F2`, 'F')}
                ${renderRosterSlot(`ot_${i}_D`, 'D')}
            </div>
        `;
    }
    
    // Validate if Roster is complete (RF04)
    const activeRosterCount = gameState.players.filter(p => p.location && p.location !== 'bench' && !p.location.startsWith('cpu_')).length;
    const otRosterCount = gameState.players.filter(p => p.ot_location && p.ot_location.startsWith('ot_')).length;
    const isRosterComplete = activeRosterCount === 20 && otRosterCount === 9;

    const tab5v5Style = window.rosterTab === '5v5' ? `background: var(--team-primary); color: #fff;` : `background: rgba(255,255,255,0.05); color: var(--text-muted);`;
    const tab3v3Style = window.rosterTab === '3v3' ? `background: var(--team-primary); color: #fff;` : `background: rgba(255,255,255,0.05); color: var(--text-muted);`;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; height: 100%; overflow: visible; padding-bottom: 2rem;">
            <!-- LEFT COLUMN: ICE + ACTION ZONES -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
                <!-- ICE CONTAINER -->
                <div class="dashboard-card" style="padding: 1rem 1.5rem; overflow-y: auto; background-color: color-mix(in srgb, var(--team-secondary) 40%, var(--card-bg)); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem; margin-bottom: 1rem;">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin: 0;">ACTIVE ROSTER</h2>
                        <div style="display: flex; gap: 0.5rem; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                            <button onclick="setRosterTab('5v5')" style="padding: 0.5rem 1rem; border: none; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; cursor: pointer; ${tab5v5Style}">5v5 LINES</button>
                            <button onclick="setRosterTab('3v3')" style="padding: 0.5rem 1rem; border: none; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; cursor: pointer; ${tab3v3Style}">3v3 OVERTIME</button>
                        </div>
                    </div>
                    
                    ${window.rosterTab === '5v5' ? `
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0;">Forwards</h3>
                    ${forwardsHTML}
                    
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.5rem 0;">Defense</h3>
                    ${defenseHTML}
                    ` : `
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 0.5rem 0;">Overtime Lines (3v3)</h3>
                    ${otHTML}
                    `}
                    
                    ${window.rosterTab === '5v5' ? `
                    <h3 style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; margin: 0.8rem 0 0.5rem 0;">Goalies</h3>
                    ${goaliesHTML}
                    ` : ''}
                </div>
                
                ${window.rosterTab === '5v5' ? `
                <!-- ACTION ZONES (SELL / COLLECTION) -->
                <div style="display: flex; gap: 1.5rem; height: 100px; flex-shrink: 0;">
                    <div class="dashboard-card action-zone drop-zone" data-slot-id="sell" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(239, 68, 68, 0.1); border: 2px dashed rgba(239, 68, 68, 0.4); border-radius: 12px; cursor: pointer;">
                        <i data-lucide="coins" style="color: #ef4444; width: 36px; height: 36px;"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: #ef4444; margin-top: 0.5rem;">DRAG TO SELL PLAYER</span>
                    </div>
                    <div class="dashboard-card action-zone drop-zone" data-slot-id="collection" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: rgba(59, 130, 246, 0.1); border: 2px dashed rgba(59, 130, 246, 0.4); border-radius: 12px; cursor: pointer;">
                        <i data-lucide="archive" style="color: #3b82f6; width: 36px; height: 36px;"></i>
                        <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; color: #3b82f6; margin-top: 0.5rem;">DRAG TO SEND TO COLLECTION</span>
                    </div>
                </div>` : ''}
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
                
                <div class="drop-zone" data-slot-id="bench" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem; background-color: rgba(0,0,0,0.05); border-radius: 8px; min-height: 200px;">
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
            else if (targetSlotId.startsWith('ot_')) {
                // Dragging to an OT slot
                const occupant = gameState.players.find(p => p.ot_location === targetSlotId);
                if (occupant) {
                    occupant.ot_location = draggedPlayer.ot_location || null;
                }
                draggedPlayer.ot_location = targetSlotId;
            }
            else if (targetSlotId === 'bench') {
                if (window.rosterTab === '3v3') {
                    // Removing a player from OT
                    draggedPlayer.ot_location = null;
                } else {
                    // Removing a player from 5v5 line (and implicitly OT)
                    draggedPlayer.location = 'bench';
                    draggedPlayer.ot_location = null;
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
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24;">${gameState.coins || 0}</span>
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
                    <button class="btn" onclick="buyPack('standard')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: var(--surface-color); border: 1px solid rgba(0,0,0,0.2); color: var(--text-color);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">200</span>
                    </button>
                </div>

                <!-- JUMBO PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(148, 163, 184, 0.5); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(148, 163, 184, 0.5) 0%, transparent 70%);"></div>
                    <i data-lucide="layers" style="width: 50px; height: 50px; color: #94a3b8; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">JUMBO D-LIST</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">6 players. 5% chance for a C-Tier!</p>
                    <button class="btn" onclick="buyPack('jumbo')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: var(--surface-color); border: 1px solid rgba(0,0,0,0.2); color: var(--text-color);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">850</span>
                    </button>
                </div>

                <!-- FORWARDS PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="swords" style="width: 50px; height: 50px; color: #ef4444; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">FORWARDS PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Forwards.</p>
                    <button class="btn" onclick="buyPack('forwards')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: var(--surface-color); border: 1px solid rgba(239, 68, 68, 0.5); color: var(--text-color);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">400</span>
                    </button>
                </div>

                <!-- DEFENSE PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="shield-half" style="width: 50px; height: 50px; color: #3b82f6; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">DEFENSE PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Defensemen.</p>
                    <button class="btn" onclick="buyPack('defense')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: var(--surface-color); border: 1px solid rgba(59, 130, 246, 0.5); color: var(--text-color);">
                        <span style="font-size: 1rem;">🪙</span> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">400</span>
                    </button>
                </div>

                <!-- GOALIE PACK -->
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; padding: 1.5rem; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 16px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -30px; left: -30px; width: 100px; height: 100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%);"></div>
                    <i data-lucide="hand-metal" style="width: 50px; height: 50px; color: #f59e0b; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin: 0 0 0.5rem 0; letter-spacing: 1px;">GOALIE PACK</h2>
                    <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 1rem 0; line-height: 1.2;">Includes 2 random Goalies.</p>
                    <button class="btn" onclick="buyPack('goalies')" style="margin-top: auto; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1rem; padding: 0.6rem; background: var(--surface-color); border: 1px solid rgba(245, 158, 11, 0.5); color: var(--text-color);">
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
        'jumbo':    { cost: 850, count: 6, filters: null, cTierChance: 0.05 },
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
    const userPlayers = gameState.players.filter(p => p.teamId === currentTeam.id);
    const activePlayerIds = new Set(userPlayers.map(p => p.id));
    const collectionPlayerIds = new Set((gameState.collection || []).map(p => p.id));
    
    let availablePlayers = window.globalDraftPool.filter(p => !activePlayerIds.has(p.id));
    
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
        
        let existingPlayer = gameState.players.find(p => p.id === selectedData.id);
        
        if (existingPlayer) {
            existingPlayer.teamId = currentTeam.id;
            existingPlayer.location = 'bench';
            
            if (Math.random() < config.cTierChance) {
                existingPlayer.tier = 'silver';
                existingPlayer.overall = Math.round(existingPlayer.overall * 1.5);
                existingPlayer.name = existingPlayer.name + " (C-TIER)";
                Object.values(existingPlayer.attributes).forEach(category => {
                    for (let key in category) {
                        if (key !== 'total') category[key] = parseFloat((category[key] * 1.5).toFixed(1));
                    }
                });
            }
            drawnIds.push(existingPlayer.id);
        } else {
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
                teamId: currentTeam.id,
                stats: selectedData.stats,
                attributes: JSON.parse(JSON.stringify(selectedData.attributes)),
                location: 'bench'
            };
            
            if (Math.random() < config.cTierChance) {
                newPlayer.tier = 'silver';
                newPlayer.overall = Math.round(newPlayer.overall * 1.5);
                newPlayer.name = newPlayer.name + " (C-TIER)";
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

// --- MATCH SIMULATION ---

window.getTeamOverall = function(teamId, isUser) {
    if (isUser) {
        let activePlayers = gameState.players.filter(p => p.location && (p.location.startsWith('f_') || p.location.startsWith('d_') || p.location.startsWith('g_')));
        
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
    let activePlayers = gameState.players.filter(p => p.location && (p.location.startsWith('f_') || p.location.startsWith('d_') || p.location.startsWith('g_')));
    let otPlayers = gameState.players.filter(p => p.ot_location && p.ot_location.startsWith('ot_'));
    
    if (activePlayers.length < 20 || otPlayers.length < 9) {
        openIncompleteMatchModal();
        return;
    }
    switchView('match');
}

function renderMatchPage(container) {
    let nextMatchObj = null;
    let daysToSimulate = 0;
    
    if (gameState.schedule) {
        for (let i = gameState.currentScheduleDayIndex; i < gameState.schedule.length; i++) {
            let day = gameState.schedule[i];
            let match = day.matches.find(m => m.homeId === currentTeam.id || m.awayId === currentTeam.id);
            if (match && !match.played) {
                nextMatchObj = match;
                daysToSimulate = i - gameState.currentScheduleDayIndex;
                break;
            }
        }
    } else if (gameState.nextMatch) {
        nextMatchObj = gameState.nextMatch;
    }
    
    if (!nextMatchObj) {
        container.innerHTML = `<h1 class="title-main" style="text-align:center; padding: 5rem 0;">No scheduled matches found!</h1>`;
        return;
    }
    
    // Auto-simulate background matches up to today if needed before jumping in
    if (daysToSimulate > 0) {
        simulateBackgroundDays(daysToSimulate);
    }
    
    const isHome = nextMatchObj.homeId === currentTeam.id;
    const opponentId = isHome ? nextMatchObj.awayId : nextMatchObj.homeId;
    
    const myTeamInfo = currentTeam;
    const oppTeamInfo = ohlTeams.find(t => t.id === opponentId);
    
    // Mocking currentMatch for the simulation loop logic
    const currentMatch = nextMatchObj;
    currentMatch.status = 'scheduled';
    currentMatch.homeScore = 0;
    currentMatch.awayScore = 0;
    
    const myLogo = myTeamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    const oppLogo = oppTeamInfo.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    
    const myOvr = getTeamOverall(myTeamInfo.id, true);
    const oppOvr = getTeamOverall(oppTeamInfo.id, false);

    const homeColor = isHome ? myTeamInfo.colors.primary : oppTeamInfo.colors.primary;
    const awayColor = !isHome ? myTeamInfo.colors.primary : oppTeamInfo.colors.primary;

    const homeTeamNameStr = isHome ? myTeamInfo.name : oppTeamInfo.name;
    const homeNameArr = homeTeamNameStr.split(' ');
    const homeMascot = homeNameArr.pop();
    const homeCity = homeNameArr.join(' ');

    const awayTeamNameStr = !isHome ? myTeamInfo.name : oppTeamInfo.name;
    const awayNameArr = awayTeamNameStr.split(' ');
    const awayMascot = awayNameArr.pop();
    const awayCity = awayNameArr.join(' ');

    // Build the scoreboard HTML
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; width: 100%; box-sizing: border-box; padding: 2rem 0; position: relative;">
            
            <h1 class="title-main" style="text-align: center; font-size: 2.5rem; letter-spacing: 2px; flex-shrink: 0; margin-bottom: 1rem;">MATCH SIMULATION</h1>
            
            <div style="display: flex; flex-direction: row; width: 100%; max-width: 1400px; flex: 1; min-height: 0; gap: 2rem;">
                
                <!-- MAIN SCOREBOARD CONTAINER (70%) -->
                <div style="position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; width: 100%; flex: 7; min-height: 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 2rem 4rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
                    
                    <!-- ICE RINK BACKGROUND -->
                    <div style="position: absolute; inset: 0; background-color: #0f172a; z-index: -3; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                        <!-- Center Red Line -->
                        <div style="position: absolute; width: 4px; height: 100%; background-color: rgba(239, 68, 68, 0.3);"></div>
                        <!-- Center Circle -->
                        <div style="position: absolute; width: 150px; height: 150px; border: 4px solid rgba(59, 130, 246, 0.3); border-radius: 50%;"></div>
                        
                        <!-- Blue Lines -->
                        <div style="position: absolute; width: 4px; height: 100%; left: 35%; background-color: rgba(59, 130, 246, 0.3);"></div>
                        <div style="position: absolute; width: 4px; height: 100%; right: 35%; background-color: rgba(59, 130, 246, 0.3);"></div>
                        
                        <!-- Goal Lines (Red) -->
                        <div style="position: absolute; width: 2px; height: 100%; left: 8%; background-color: rgba(239, 68, 68, 0.3);"></div>
                        <div style="position: absolute; width: 2px; height: 100%; right: 8%; background-color: rgba(239, 68, 68, 0.3);"></div>
                        
                        <!-- Goal Creases -->
                        <div style="position: absolute; width: 40px; height: 80px; left: 8%; border-radius: 0 40px 40px 0; background-color: rgba(56, 189, 248, 0.15); border: 2px solid rgba(239, 68, 68, 0.3); border-left: none;"></div>
                        <div style="position: absolute; width: 40px; height: 80px; right: 8%; border-radius: 40px 0 0 40px; background-color: rgba(56, 189, 248, 0.15); border: 2px solid rgba(239, 68, 68, 0.3); border-right: none;"></div>
                        
                        <!-- Left Zone Faceoff Circles -->
                        <div style="position: absolute; width: 100px; height: 100px; left: 16%; top: 15%; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%;"></div>
                        <div style="position: absolute; width: 100px; height: 100px; left: 16%; bottom: 15%; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%;"></div>
                        
                        <!-- Right Zone Faceoff Circles -->
                        <div style="position: absolute; width: 100px; height: 100px; right: 16%; top: 15%; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%;"></div>
                        <div style="position: absolute; width: 100px; height: 100px; right: 16%; bottom: 15%; border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 50%;"></div>
                    </div>
                    
                    <!-- TEAM COLOR GLOW OVERLAYS -->
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at 15% center, ${homeColor}55 0%, transparent 60%), radial-gradient(circle at 85% center, ${awayColor}55 0%, transparent 60%); z-index: -2;"></div>
                    
                    <!-- VIGNETTE TO IMPROVE TEXT READABILITY -->
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%); z-index: -1;"></div>
                    
                    <!-- HOME TEAM -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; flex: 1; z-index: 1;">
                        <img src="assets/logos/ohl/${isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${homeColor}); margin-bottom: 0.5rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                            <span style="font-family: 'Roboto', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 3px; margin-bottom: -4px;">${homeCity}</span>
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 3.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${homeMascot}</h2>
                        </div>
                        <div style="background-color: rgba(0,0,0,0.4); padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); margin-top: 0.5rem;">
                            OVR: <span style="color: ${homeColor}; text-shadow: 0 0 10px ${homeColor};">${isHome ? myOvr : oppOvr}</span>
                        </div>
                    </div>
                    
                    <!-- SCOREBOARD CENTER -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 0 2rem; z-index: 1;">
                        
                        <!-- NEW INDICATORS CONTAINER -->
                        <div style="display: flex; flex-direction: column; gap: 0.6rem; height: 80px; align-items: center; justify-content: flex-end;">
                            <div id="match-pp-indicator" style="opacity: 0; transition: opacity 0.3s; background-color: #f97316; color: #fff; font-family: 'Blockletter', sans-serif; font-size: 1.8rem; padding: 0.4rem 1.2rem; border-radius: 8px; letter-spacing: 2px; box-shadow: 0 0 15px rgba(249, 115, 22, 0.6);">
                                <span id="pp-home-num">5</span> <span style="font-size: 1.2rem; opacity: 0.8; margin: 0 0.5rem;">PP</span> <span id="pp-away-num">4</span>
                            </div>
                            <div id="match-en-indicator" style="opacity: 0; transition: opacity 0.3s; background-color: #ef4444; color: #fff; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; padding: 0.4rem 1.2rem; border-radius: 8px; letter-spacing: 2px; display: flex; align-items: center; gap: 0.8rem; box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);">
                                <img id="en-logo" src="" style="width: 24px; height: 24px; object-fit: contain;"> EMPTY NET
                            </div>
                        </div>
                        
                        <div id="match-period" style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; color: #fff; letter-spacing: 3px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">1ST PERIOD</div>
                        
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div id="home-score" style="font-family: 'Blockletter', sans-serif; font-size: 6rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                            <div style="font-family: 'Roboto', sans-serif; font-size: 2.5rem; color: rgba(255,255,255,0.3); font-weight: 700;">-</div>
                            <div id="away-score" style="font-family: 'Blockletter', sans-serif; font-size: 6rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                        </div>
                        
                        <div id="match-clock" style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fff; background-color: rgba(0,0,0,0.6); padding: 0.5rem 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); letter-spacing: 2px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">20:00</div>
                    </div>
                    
                    <!-- AWAY TEAM -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; flex: 1; z-index: 1;">
                        <img src="assets/logos/ohl/${!isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${awayColor}); margin-bottom: 0.5rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                            <span style="font-family: 'Roboto', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 3px; margin-bottom: -4px;">${awayCity}</span>
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 3.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${awayMascot}</h2>
                        </div>
                        <div style="background-color: rgba(0,0,0,0.4); padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); margin-top: 0.5rem;">
                            OVR: <span style="color: ${awayColor}; text-shadow: 0 0 10px ${awayColor};">${!isHome ? myOvr : oppOvr}</span>
                        </div>
                    </div>
                    
                </div>
                
                <!-- RIGHT COLUMN (30%) -->
                <div style="flex: 3; min-width: 0; display: flex; flex-direction: column; gap: 1rem;">
                    
                    <!-- EVENT LOG -->
                    <div id="event-log" style="width: 100%; flex: 1; min-height: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow-y: auto; padding: 1.5rem; font-family: 'Blockletter', sans-serif; font-size: 1.3rem; letter-spacing: 1px; color: #fff; display: flex; flex-direction: column; gap: 1rem; scroll-behavior: smooth;">
                        <div style="text-align: center; color: var(--text-muted); font-family: 'Roboto', sans-serif; font-style: italic; font-size: 1rem;">20:00 - Puck drop! The match is underway...</div>
                    </div>
                    
                    <!-- CONTROLS -->
                    <div style="flex-shrink: 0; display: flex; flex-direction: row; gap: 1rem; width: 100%;">
                        <button id="btn-match-control" class="btn" style="flex: 2; padding: 1rem; font-size: 1.5rem; letter-spacing: 2px; background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%); display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 16px;">
                            <i data-lucide="pause"></i> PAUSE
                        </button>
                        
                        <button id="btn-debug-skip" class="btn btn-secondary" style="flex: 1; padding: 1rem; font-size: 1.2rem; letter-spacing: 1px; border-color: rgba(255,255,255,0.2); color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 16px;">
                            <i data-lucide="fast-forward"></i> SKIP
                        </button>
                    </div>
                </div>
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
    const homeTeam = isHome ? myTeam : oppTeam;
    const awayTeam = !isHome ? myTeam : oppTeam;
    
    // 1. Gather Players
    function extractLines(isUser, teamId) {
        let lines = { f: [[], [], [], []], d: [[], [], []], g: [], ot: [[], [], []] };
        if (isUser) {
            let active = gameState.players.filter(p => p.location && (p.location.startsWith('f_') || p.location.startsWith('d_') || p.location.startsWith('g_')));
            active.forEach(p => {
                let parts = p.location.split('_');
                let type = parts[0]; // f, d, g
                let lineNum = parseInt(parts[1]) - 1;
                if (type === 'f' || type === 'd') lines[type][lineNum].push(p);
                if (type === 'g') lines[type].push(p);
            });
            // Sort goalies
            lines.g.sort((a, b) => a.location.includes('Starter') ? -1 : 1);
            
            // OT Lines
            let otActive = gameState.players.filter(p => p.ot_location && p.ot_location.startsWith('ot_'));
            otActive.forEach(p => {
                let parts = p.ot_location.split('_');
                let lineNum = parseInt(parts[1]) - 1;
                lines.ot[lineNum].push(p);
            });
        } else {
            let cpu = window.globalDraftPool.filter(p => p.originalTeamId === teamId);
            let f = cpu.filter(p => ['LW', 'C', 'RW'].includes(p.position)).sort((a,b) => b.overall - a.overall);
            let d = cpu.filter(p => ['LD', 'RD'].includes(p.position)).sort((a,b) => b.overall - a.overall);
            let g = cpu.filter(p => p.position === 'G').sort((a,b) => b.overall - a.overall);
            
            for(let i=0; i<4; i++) lines.f[i] = f.slice(i*3, i*3+3);
            for(let i=0; i<3; i++) lines.d[i] = d.slice(i*2, i*2+2);
            lines.g = g.slice(0, 2);
            
            // CPU OT Lines
            for(let i=0; i<3; i++) {
                lines.ot[i] = [];
                if (f[i*2]) lines.ot[i].push(f[i*2]);
                if (f[i*2+1]) lines.ot[i].push(f[i*2+1]);
                if (d[i]) lines.ot[i].push(d[i]);
            }
        }
        return lines;
    }
    
    const homeLines = extractLines(isHome, homeTeam.id);
    const awayLines = extractLines(!isHome, awayTeam.id);
    
    // 2. Sim State
    let state = {
        period: 1,
        clock: 1200,
        possession: 'home',
        zone: 'neutral',
        homeLineF: 0,
        homeLineD: 0,
        awayLineF: 0,
        awayLineD: 0,
        homeFatigue: 1.0,
        awayFatigue: 1.0,
        penalties: { home: [], away: [] },
        score: { home: 0, away: 0 },
        emptyNet: false
    };
    
    function getOnIcePlayers(team) {
        let lines = team === 'home' ? homeLines : awayLines;
        let lineF = team === 'home' ? state.homeLineF : state.awayLineF;
        let lineD = team === 'home' ? state.homeLineD : state.awayLineD;
        let g = lines.g[0] || null;
        
        if (state.period > 3) {
            // Use OT lines
            let otLineNum = lineF % 3; // Keep rotation synced
            let otPlayers = lines.ot[otLineNum] || [];
            let f = otPlayers.filter(p => ['LW', 'C', 'RW'].includes(p.position));
            let d = otPlayers.filter(p => ['LD', 'RD'].includes(p.position));
            return { f, d, g, all: otPlayers };
        } else {
            let f = lines.f[lineF] || [];
            let d = lines.d[lineD] || [];
            return { f, d, g, all: [...f, ...d] };
        }
    }
    
    function getOnIceOvr(team) {
        let players = getOnIcePlayers(team).all;
        if(players.length === 0) return 70;
        let sum = players.reduce((acc, p) => acc + parseFloat(p.overall), 0);
        
        let fatigue = team === 'home' ? state.homeFatigue : state.awayFatigue;
        let myPenalties = state.penalties[team].length;
        let oppPenalties = state.penalties[team === 'home' ? 'away' : 'home'].length;
        let diff = oppPenalties - myPenalties; 
        let ppMod = 1.0 + (diff * 0.15); // +15% per man advantage
        
        return (sum / players.length) * fatigue * ppMod;
    }
    
    function addEvent(timeSecs, type, team, text, highlight = false) {
        let period = state.period;
        let min = Math.floor(timeSecs / 60);
        let sec = timeSecs % 60;
        
        let isImportant = ['goal', 'penalty', 'fight', 'faceoff', 'end_period'].includes(type);
        if (isImportant || Math.random() < 0.12) {
            let t = team === 'home' ? homeTeam : team === 'away' ? awayTeam : null;
            timeline.push({
                period: period,
                minute: min,
                second: sec,
                type: type,
                team: team,
                teamName: t ? t.name : '',
                color: t ? t.colors.primary : '#a1a1aa', // Muted default
                text: text,
                highlight: isImportant || highlight,
                homePenalties: state.penalties.home.length,
                awayPenalties: state.penalties.away.length,
                emptyNetTeam: state.emptyNet ? (state.score.home < state.score.away ? 'home' : 'away') : null
            });
        }
    }
    
    function getPlayer(team, posPriority) {
        let players = getOnIcePlayers(team).all;
        if(players.length === 0) return { name: 'Player', id: 'unknown', overall: 70 };
        
        if (posPriority) {
            let posPlayers = players.filter(p => posPriority.includes(p.position));
            if (posPlayers.length > 0) players = posPlayers;
        }
        
        let total = players.reduce((sum, p) => sum + parseFloat(p.overall), 0);
        let r = Math.random() * total;
        for (let p of players) {
            r -= parseFloat(p.overall);
            if (r <= 0) return p;
        }
        return players[0];
    }
    
    // TICK LOOP
    let maxPeriods = 3;
    for (state.period = 1; state.period <= maxPeriods; state.period++) {
        state.clock = state.period > 3 ? 300 : 1200; // 5 min OT, 20 min regular
        state.zone = 'neutral';
        state.emptyNet = false;
        
        let homeC = getPlayer('home', ['C']);
        let awayC = getPlayer('away', ['C']);
        let hFace = parseFloat(homeC.overall);
        let aFace = parseFloat(awayC.overall);
        state.possession = Math.random() * (hFace + aFace) < hFace ? 'home' : 'away';
        let periodName = state.period > 3 ? 'OVERTIME' : `Period ${state.period}`;
        addEvent(state.clock, 'faceoff', null, `Puck Drop! ${periodName} Faceoff won by ${state.possession === 'home' ? homeTeam.name : awayTeam.name}.`);
        
        let otWinner = false;
        
        while (state.clock > 0) {
            let tickTime = Math.floor(Math.random() * 11) + 10; // 10-20 seconds per tick
            state.clock -= tickTime;
            if (state.clock < 0) state.clock = 0;
            
            // Penalties countdown
            ['home', 'away'].forEach(t => {
                state.penalties[t] = state.penalties[t].filter(p => {
                    p.time -= tickTime;
                    if (p.time <= 0) {
                        addEvent(state.clock, 'penalty_over', t, `${p.player.name}'s penalty is over.`);
                        return false;
                    }
                    return true;
                });
            });
            
            // Fatigue & Line Changes
            state.homeFatigue -= 0.05;
            state.awayFatigue -= 0.05;
            if (state.homeFatigue < 0.75) {
                state.homeLineF = (state.homeLineF + 1) % 4;
                state.homeLineD = (state.homeLineD + 1) % 3;
                state.homeFatigue = 1.0;
                addEvent(state.clock, 'line_change', 'home', `${homeTeam.name} changes lines.`);
            }
            if (state.awayFatigue < 0.75) {
                state.awayLineF = (state.awayLineF + 1) % 4;
                state.awayLineD = (state.awayLineD + 1) % 3;
                state.awayFatigue = 1.0;
                addEvent(state.clock, 'line_change', 'away', `${awayTeam.name} changes lines.`);
            }
            
            // Simulation Logic
            let atk = state.possession;
            let def = atk === 'home' ? 'away' : 'home';
            let atkOvr = getOnIceOvr(atk);
            let defOvr = getOnIceOvr(def);
            
            let atkTeam = atk === 'home' ? homeTeam : awayTeam;
            let defTeam = def === 'home' ? homeTeam : awayTeam;
            
            if (state.zone === 'neutral') {
                let successRate = (atkOvr / (atkOvr + defOvr)) * 0.7; 
                if (Math.random() < successRate) {
                    state.zone = 'offensive';
                    addEvent(state.clock, 'zone_entry', atk, `${atkTeam.name} carries the puck into the offensive zone.`);
                } else {
                    if (Math.random() < 0.5) {
                        state.possession = def;
                        addEvent(state.clock, 'takeaway', def, `${defTeam.name} intercepts the pass in the neutral zone.`);
                    } else {
                        addEvent(state.clock, 'dump', atk, `${atkTeam.name} dumps the puck deep.`);
                        state.zone = 'offensive';
                        state.possession = Math.random() < 0.5 ? atk : def;
                    }
                }
            } else if (state.zone === 'offensive') {
                let r = Math.random();
                if (r < 0.35) { // Shoot
                    let shooter = getPlayer(atk, ['LW', 'C', 'RW', 'LD', 'RD']);
                    let goalie = getOnIcePlayers(def).g || { name: 'Empty Net', overall: 10 };
                    
                    let shotQuality = (atkOvr / 100) * Math.random();
                    let saveQuality = (parseFloat(goalie.overall) / 100) * Math.random();
                    
                    // Empty Net Logic
                    if (state.period === 3 && state.clock <= 120 && Math.abs(state.score.home - state.score.away) > 0 && Math.abs(state.score.home - state.score.away) <= 2) {
                        let losingTeam = state.score.home < state.score.away ? 'home' : 'away';
                        if (def === losingTeam && !state.emptyNet) {
                            state.emptyNet = true;
                            addEvent(state.clock, 'empty_net', def, `${defTeam.name} pulls their goalie for an extra attacker!`);
                        }
                    }
                    if (def === (state.score.home < state.score.away ? 'home' : 'away') && state.emptyNet) {
                        saveQuality = 0; // No goalie
                    }
                    
                    if (shotQuality > saveQuality + 0.1) {
                        state.score[atk]++;
                        addEvent(state.clock, 'goal', atk, `GOAL! ${shooter.name} snipes it past the goalie!`, true);
                        
                        if (!gameState.matchStats) gameState.matchStats = {};
                        if (!gameState.matchStats[shooter.id]) gameState.matchStats[shooter.id] = { goals: 0, assists: 0 };
                        gameState.matchStats[shooter.id].goals++;
                        
                        let assister1 = getPlayer(atk, null);
                        if (assister1.id !== shooter.id && Math.random() > 0.4) {
                            if (!gameState.matchStats[assister1.id]) gameState.matchStats[assister1.id] = { goals: 0, assists: 0 };
                            gameState.matchStats[assister1.id].assists++;
                            addEvent(state.clock, 'assist', atk, `Assist credited to ${assister1.name}.`);
                        }
                        
                        state.zone = 'neutral';
                        state.possession = Math.random() > 0.5 ? 'home' : 'away';
                        addEvent(state.clock, 'faceoff', null, `Faceoff at center ice.`);
                        if (state.period > 3) {
                            otWinner = true;
                            break; // Sudden death
                        }
                    } else if (Math.random() < 0.4) {
                        addEvent(state.clock, 'save', def, `Kick save by ${goalie.name}!`);
                        if (Math.random() < 0.5) {
                            state.zone = 'neutral';
                            state.possession = def;
                        }
                    } else {
                        let blocker = getPlayer(def, ['LD', 'RD']);
                        addEvent(state.clock, 'block', def, `Huge blocked shot by ${blocker.name}!`);
                        state.possession = def;
                    }
                } else if (r < 0.6) {
                    addEvent(state.clock, 'cycle', atk, `${atkTeam.name} cycling the puck.`);
                } else {
                    state.possession = def;
                    state.zone = 'defensive'; 
                    addEvent(state.clock, 'giveaway', def, `${atkTeam.name} turns the puck over in the zone.`);
                }
            } else if (state.zone === 'defensive') {
                if (Math.random() > 0.3) {
                    state.zone = 'neutral';
                    addEvent(state.clock, 'breakout', atk, `${atkTeam.name} clears the puck out of the zone.`);
                } else {
                    state.possession = def;
                    state.zone = 'offensive';
                    addEvent(state.clock, 'dangerous_turnover', def, `Dangerous turnover by ${atkTeam.name} in their own end!`);
                }
            }
            
            // Physical & Rules
            if (Math.random() < 0.08) {
                if (Math.random() < 0.25) { // Penalty
                    let offender = getPlayer(atk, null);
                    let duration = Math.random() < 0.1 ? 300 : 120; // Major vs Minor
                    state.penalties[atk].push({ player: offender, time: duration });
                    addEvent(state.clock, 'penalty', atk, `PENALTY: ${offender.name} (${atkTeam.name}) gets ${duration/60} minutes.`, true);
                    state.possession = def;
                    state.zone = 'offensive';
                    addEvent(state.clock, 'faceoff', null, `Faceoff in the ${atkTeam.name} zone.`);
                } else { // Hit
                    let hitter = getPlayer(def, ['LD', 'RD', 'LW', 'RW']);
                    let hittee = getPlayer(atk, ['LW', 'C', 'RW']);
                    addEvent(state.clock, 'hit', def, `Crushing hit by ${hitter.name} on ${hittee.name}!`);
                    if (Math.random() > 0.6) state.possession = def;
                }
            }
            
            if (otWinner) break;
        }
        
        if (otWinner) {
            addEvent(state.clock, 'end_period', null, `GAME OVER!`);
            break; // Stop simulating periods
        } else {
            let pName = state.period > 3 ? 'Overtime' : `Period ${state.period}`;
            addEvent(0, 'end_period', null, `End of ${pName}.`);
            
            if (state.period === 3 && state.score.home === state.score.away) {
                maxPeriods = 4; // Force Overtime
            }
            if (state.period === 4 && state.score.home === state.score.away) {
                simulateShootout();
                break;
            }
        }
    }
    
    function simulateShootout() {
        addEvent(0, 'shootout', null, `--- SHOOTOUT ---`);
        let hGoalie = homeLines.g[0] || { name: 'Goalie', overall: 70 };
        let aGoalie = awayLines.g[0] || { name: 'Goalie', overall: 70 };
        let hForwards = homeLines.f.flat().filter(p => p).sort((a,b) => b.overall - a.overall);
        let aForwards = awayLines.f.flat().filter(p => p).sort((a,b) => b.overall - a.overall);
        
        let soHomeScore = 0;
        let soAwayScore = 0;
        let round = 0;
        let winner = null;
        
        while (!winner) {
            let hShooter = hForwards[round % hForwards.length];
            let aShooter = aForwards[round % aForwards.length];
            
            // Home shoots
            let hShotOvr = parseFloat(hShooter.overall) + Math.random() * 20;
            let aSaveOvr = parseFloat(aGoalie.overall) + Math.random() * 20;
            if (hShotOvr > aSaveOvr) {
                soHomeScore++;
                addEvent(0, 'shootout_goal', 'home', `Round ${round+1}: ${hShooter.name} scores on ${aGoalie.name}!`, true);
            } else {
                addEvent(0, 'shootout_save', 'home', `Round ${round+1}: ${hShooter.name} is stopped by ${aGoalie.name}.`);
            }
            
            // Check early win after home shoots
            if (round < 3) {
                let remainingAway = 3 - round;
                if (soHomeScore > soAwayScore + remainingAway) {
                    winner = 'home';
                    break;
                }
            }
            
            // Away shoots
            let aShotOvr = parseFloat(aShooter.overall) + Math.random() * 20;
            let hSaveOvr = parseFloat(hGoalie.overall) + Math.random() * 20;
            if (aShotOvr > hSaveOvr) {
                soAwayScore++;
                addEvent(0, 'shootout_goal', 'away', `Round ${round+1}: ${aShooter.name} scores on ${hGoalie.name}!`, true);
            } else {
                addEvent(0, 'shootout_save', 'away', `Round ${round+1}: ${aShooter.name} is stopped by ${hGoalie.name}.`);
            }
            
            // Check winner
            if (round < 2) {
                let remainingHome = 2 - round;
                let remainingAway = 2 - round;
                if (soHomeScore > soAwayScore + remainingAway) {
                    winner = 'home';
                } else if (soAwayScore > soHomeScore + remainingHome) {
                    winner = 'away';
                }
            } else {
                // Sudden death shootout check
                if (soHomeScore > soAwayScore) {
                    winner = 'home';
                } else if (soAwayScore > soHomeScore) {
                    winner = 'away';
                }
            }
            round++;
        }
        
        state.score[winner]++;
        addEvent(0, 'shootout_winner', winner, `${winner === 'home' ? homeTeam.name : awayTeam.name} is awarded the shootout win!`, true);
        addEvent(0, 'end_period', null, `GAME OVER! ${winner === 'home' ? homeTeam.name : awayTeam.name} wins in Shootout!`);
    }

    timeline.sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        if (a.minute !== b.minute) return b.minute - a.minute; 
        return b.second - a.second;
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
    const btnControl = document.getElementById('btn-match-control');
    const btnSkip = document.getElementById('btn-debug-skip');
    
    const ppIndicator = document.getElementById('match-pp-indicator');
    const ppHomeNum = document.getElementById('pp-home-num');
    const ppAwayNum = document.getElementById('pp-away-num');
    const enIndicator = document.getElementById('match-en-indicator');
    const enLogo = document.getElementById('en-logo');
    
    let isSkipped = false;
    let isPaused = false;
    let isFinished = false;
    
    btnSkip.addEventListener('click', () => {
        isSkipped = true;
        isPaused = false; // Force unpause if they click skip
        btnSkip.style.display = 'none';
    });
    
    btnControl.addEventListener('click', () => {
        if (isFinished) {
            currentMatch.status = 'completed';
            gameState.matchIndex++;
            // TODO: Update Standings and calendar here in the future
            switchView('dashboard');
            return;
        }
        
        isPaused = !isPaused;
        if (isPaused) {
            btnControl.style.background = 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)';
            btnControl.innerHTML = '<i data-lucide="play"></i> PLAY';
        } else {
            btnControl.style.background = 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)';
            btnControl.innerHTML = '<i data-lucide="pause"></i> PAUSE';
        }
        if (window.lucide) window.lucide.createIcons();
    });
    
    function logEvent(text, color = '#a1a1aa', highlight = false) {
        const p = document.createElement('div');
        p.innerText = text;
        p.style.color = color;
        p.style.marginBottom = '5px';
        p.style.padding = '4px 8px';
        p.style.borderRadius = '4px';
        p.style.fontSize = highlight ? '1rem' : '0.9rem';
        if (highlight) {
            p.style.fontWeight = 'bold';
            p.style.backgroundColor = 'rgba(255,255,255,0.1)';
            p.style.borderLeft = `3px solid ${color}`;
        }
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }
    
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    let currentPeriod = 1;
    let currentSecond = 1200; // 20:00
    
    // Initial wait before match actually starts
    for (let i = 0; i < 25; i++) { // 2.5 seconds total wait
        if (isSkipped) break;
        while (isPaused && !isSkipped) {
            await wait(100);
        }
        await wait(100);
    }
    
    // Process event by event
    for (let event of timeline) {
        if (isSkipped) break; // If skipped, jump out of visual playback
        
        while (isPaused && !isSkipped) {
            await wait(100);
        }
        
        let eventTotalSeconds = event.minute * 60 + event.second;
        
        // Jump directly to the event time
        currentPeriod = event.period;
        currentSecond = eventTotalSeconds;
        
        let m = Math.floor(currentSecond / 60);
        let s = currentSecond % 60;
        clockEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        // Handle PP Indicator
        let homeSkaters = 5 - (event.homePenalties || 0);
        let awaySkaters = 5 - (event.awayPenalties || 0);
        if (homeSkaters < 5 || awaySkaters < 5) {
            ppHomeNum.innerText = Math.max(3, homeSkaters);
            ppAwayNum.innerText = Math.max(3, awaySkaters);
            ppIndicator.style.opacity = '1';
        } else {
            ppIndicator.style.opacity = '0';
        }
        
        // Handle EN Indicator
        if (event.emptyNetTeam) {
            let isHomeNet = event.emptyNetTeam === 'home';
            let teamData = isHomeNet ? (isHome ? myTeam : oppTeam) : (!isHome ? myTeam : oppTeam);
            let logoFile = teamData.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
            
            enLogo.src = `assets/logos/ohl/${logoFile}.png`;
            enIndicator.style.backgroundColor = teamData.colors.primary;
            enIndicator.style.boxShadow = `0 0 10px ${teamData.colors.primary}`;
            enIndicator.style.opacity = '1';
        } else {
            enIndicator.style.opacity = '0';
        }
        
        // Brief pause to create suspense before showing the event
        await wait(1000);
        
        if (isSkipped) break;
        
        if (event.type === 'end_period') {
            if (currentPeriod < 4 && !event.text.includes('GAME OVER')) {
                logEvent(`--- End of ${periodEl.innerText} ---`);
                await wait(1500);
                
                // If the next event exists and is period 4, we are going to OT
                let nextEvent = timeline.find(e => e.period > currentPeriod);
                if (nextEvent) {
                    currentPeriod = nextEvent.period;
                    currentSecond = currentPeriod > 3 ? 300 : 1200;
                    periodEl.innerText = currentPeriod === 2 ? "2ND PERIOD" : currentPeriod === 3 ? "3RD PERIOD" : "OVERTIME";
                    clockEl.innerText = currentPeriod > 3 ? "05:00" : "20:00";
                    logEvent(`--- Start of ${periodEl.innerText} ---`);
                    await wait(1500);
                }
            }
            continue;
        }
        
        // Trigger Goal Event
        logEvent(`${clockEl.innerText} - ${event.text}`, event.color, event.highlight);
        
        if (event.type === 'goal' || event.type === 'shootout_winner') {
            if (event.team === 'home') {
                currentMatch.homeScore++;
                homeScoreEl.innerText = currentMatch.homeScore;
            } else {
                currentMatch.awayScore++;
                awayScoreEl.innerText = currentMatch.awayScore;
            }
            
            // Show Goal Animation only for regular goals
            if (event.type === 'goal') {
                goalTeamName.innerText = event.teamName.toUpperCase();
                goalTeamName.style.color = event.color;
                goalAnim.style.borderColor = event.color;
                goalAnim.style.boxShadow = `0 0 50px ${event.color}`;
                goalAnim.querySelector('h1').style.color = event.color;
                goalAnim.querySelector('h1').style.textShadow = `0 0 30px ${event.color}`;
                
                // Show Animation
                goalAnim.style.opacity = '1';
                goalAnim.style.transform = 'translate(-50%, -50%) scale(1)';
                
                await wait(2500); // Pause for celebration
                
                // Hide Animation
                goalAnim.style.opacity = '0';
                goalAnim.style.transform = 'translate(-50%, -50%) scale(0.5)';
                await wait(500);
            } else {
                await wait(2000); // Just wait a bit for shootout winner
            }
        }
    }
    
    // Fast forward to end of game if skipped or no more events
    if (isSkipped) {
        // Process remaining goals mathematically without UI delays
        for (let event of timeline) {
            let isFuture = event.period > currentPeriod || (event.period === currentPeriod && (event.minute * 60 + event.second) <= currentSecond);
            if (isFuture && (event.type === 'goal' || event.type === 'shootout_winner')) {
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
    
    isFinished = true;
    btnControl.style.background = 'linear-gradient(180deg, #10b981 0%, #059669 100%)';
    btnControl.innerHTML = '<i data-lucide="step-forward"></i> CONTINUE';
    if (window.lucide) window.lucide.createIcons();
    
    logEvent(`--- MATCH FINISHED ---`);
    logEvent(`Final Score: ${isHome ? myTeam.name : oppTeam.name} ${currentMatch.homeScore} - ${!isHome ? myTeam.name : oppTeam.name} ${currentMatch.awayScore}`);
    
    // Economy Injection
    let myScore = isHome ? currentMatch.homeScore : currentMatch.awayScore;
    let oppScore = !isHome ? currentMatch.homeScore : currentMatch.awayScore;
    
    let baseReward = Math.floor(Math.random() * (45 - 30 + 1)) + 30; // 30 to 45 base (Average Win ~ 66 coins)
    let finalReward = 0;
    let rewardType = '';
    
    if (myScore > oppScore) {
        finalReward = Math.floor(baseReward * 1.75);
        rewardType = 'WIN';
    } else if (myScore < oppScore) {
        // Check if the game went to OT (period > 3)
        let wentToOT = timeline.some(e => e.period > 3);
        if (wentToOT) {
            finalReward = Math.floor(baseReward * 1.5);
            rewardType = 'OT LOSS';
        } else {
            finalReward = baseReward;
            rewardType = 'LOSS';
        }
    } else {
        // Fallback for ties if they somehow happen
        finalReward = Math.floor(baseReward * 1.5);
        rewardType = 'OT LOSS';
    }
    
    let isOT = timeline.some(e => e.period > 3);
    currentMatch.played = true;
    
    if (currentMatch.isPlayoff) {
        processPlayoffMatchResult(currentMatch, gameState);
    } else {
        updateStandings(currentMatch.homeId, currentMatch.awayId, currentMatch.homeScore, currentMatch.awayScore, isOT);
    }
    
    gameState.matchIndex++; // Advance index just for display purposes
    
    // Simulate remaining matches for today
    if (gameState.schedule) {
        let today = gameState.schedule[gameState.currentScheduleDayIndex];
        if (today) {
            today.matches.forEach(m => {
                if (!m.played) {
                    simulateBackgroundMatch(m);
                }
            });
        }
        
        // After all matches for the day are played, check if a playoff round should advance
        if (gameState.playoffs && gameState.playoffs.isActive) {
            advancePlayoffRound(gameState);
        }
        
        let nextDay = gameState.schedule[gameState.currentScheduleDayIndex + 1];
        if (nextDay) {
            gameState.currentDate = new Date(nextDay.date);
        } else {
            gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
        }
        gameState.currentScheduleDayIndex++;
    }
    
    gameState.coins = (gameState.coins || 0) + finalReward;
    if (window.saveGame) window.saveGame();
    
    logEvent(`Match Reward: +${finalReward} 🪙 (${rewardType})`, '#fbbf24');
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
    document.body.style.removeProperty('--bg-color');
    document.body.style.background = `linear-gradient(135deg, color-mix(in srgb, ${currentTeam.colors.primary} 60%, #0b1121) 0%, color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #0b1121) 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    document.documentElement.style.setProperty('--team-primary', currentTeam.colors.primary);
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="app-layout" style="--team-primary: ${currentTeam.colors.primary}; --team-secondary: ${currentTeam.colors.secondary};">
            <aside class="sidebar" style="background-color: color-mix(in srgb, ${currentTeam.colors.secondary} 60%, #151e32);">
                <div class="sidebar-brand" style="display: flex; justify-content: space-between; align-items: center; padding-right: 1.5rem;">
                    <h2>HOCKEY GM</h2>
                    <div id="notification-bell" style="position: relative; cursor: pointer; color: #fff; transition: color 0.2s ease;">
                        <i data-lucide="bell" style="width: 24px; height: 24px;"></i>
                        <span id="notification-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.7rem; font-weight: bold; border-radius: 50%; width: 16px; height: 16px; text-align: center; line-height: 16px;">0</span>
                    </div>
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
                    <button class="nav-btn" id="nav-playoffs" style="display: none; background: linear-gradient(90deg, #d97706 0%, #b45309 100%); color: white;">
                        <i data-lucide="trophy" style="margin-right: 8px; width: 20px; height: 20px;"></i> Playoffs
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
    document.getElementById('nav-playoffs').addEventListener('click', () => switchView('playoffs'));
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
        
        checkTeamCompletion(player.originalTeamId);
        
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
        </div>
        
        <div id="standings-page-content">
            <!-- Content will be injected here -->
        </div>
    `;
    
    container.innerHTML = html;
    
    const content = document.getElementById('standings-page-content');
    renderFullStandings(content);
}

window.calendarSelectedDateStr = window.calendarSelectedDateStr || null;

window.selectCalendarDate = function(dateStr) {
    window.calendarSelectedDateStr = dateStr;
    const content = document.getElementById('main-content');
    if (content) renderCalendarPage(content);
}

function renderCalendarPage(container) {
    if (!gameState.schedule) {
        container.innerHTML = `<h1 class="title-main" style="text-align:center; padding: 5rem 0;">No schedule available.</h1>`;
        return;
    }
    
    const formatDateObj = (d) => {
        let date = new Date(d);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };
    
    // Auto-select current date if none is selected
    if (!window.calendarSelectedDateStr) {
        window.calendarSelectedDateStr = formatDateObj(gameState.currentDate);
    }
    
    // Group schedule by month for the left pane navigation
    let months = {};
    gameState.schedule.forEach(day => {
        let dateObj = new Date(day.date);
        let monthKey = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(day);
    });
    
    let leftPaneHtml = `<div style="display: flex; flex-direction: column; gap: 2rem; overflow-y: auto; padding-right: 1rem; max-height: 75vh;" class="custom-scrollbar">`;
    
    Object.keys(months).forEach(monthKey => {
        leftPaneHtml += `
            <div>
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: var(--team-secondary); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${monthKey}</h3>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; margin-bottom: 0.5rem;">
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Sun</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Mon</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Tue</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Wed</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Thu</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Fri</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold;">Sat</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center;">
        `;
        
        let firstDay = new Date(months[monthKey][0].date);
        firstDay.setDate(1);
        let emptyDays = firstDay.getDay();
        for (let i = 0; i < emptyDays; i++) {
            leftPaneHtml += `<div></div>`;
        }
        
        // Array of all days in the month
        let lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            let loopDate = new Date(firstDay.getFullYear(), firstDay.getMonth(), i);
            let loopDateStr = formatDateObj(loopDate);
            
            // Check if there are matches this day
            let dayObj = gameState.schedule.find(d => formatDateObj(d.date) === loopDateStr);
            let hasMatches = dayObj && dayObj.matches.length > 0;
            
            let bg = 'transparent';
            let color = 'var(--text-muted)';
            let cursor = 'default';
            let border = '1px solid transparent';
            let onclick = '';
            
            if (hasMatches) {
                color = 'var(--text-color)';
                cursor = 'pointer';
                bg = 'rgba(255,255,255,0.05)';
                onclick = `onclick="selectCalendarDate('${loopDateStr}')"`;
                border = '1px solid rgba(255,255,255,0.1)';
            }
            
            if (loopDateStr === window.calendarSelectedDateStr) {
                bg = 'var(--team-primary)';
                color = '#fff';
                border = '1px solid var(--team-primary)';
            }
            
            // Highlight current simulation date
            let currentSimDateStr = formatDateObj(gameState.currentDate);
            if (loopDateStr === currentSimDateStr) {
                border = '1px dashed #fbbf24';
            }
            
            leftPaneHtml += `
                <div ${onclick} style="padding: 0.5rem; border-radius: 6px; background: ${bg}; color: ${color}; border: ${border}; cursor: ${cursor}; font-size: 0.9rem; transition: all 0.2s ease;" onmouseover="if('${cursor}' === 'pointer') this.style.filter='brightness(1.2)';" onmouseout="this.style.filter='none';">
                    ${i}
                </div>
            `;
        }
        
        leftPaneHtml += `</div></div>`;
    });
    
    leftPaneHtml += `</div>`;
    
    // Right pane: Matches for the selected date
    let rightPaneHtml = `<div style="display: flex; flex-direction: column; gap: 1rem; padding-bottom: 2rem;">`;
    
    let selectedDayObj = gameState.schedule.find(d => formatDateObj(d.date) === window.calendarSelectedDateStr);
    
    if (!selectedDayObj || selectedDayObj.matches.length === 0) {
        rightPaneHtml += `<div style="text-align: center; color: var(--text-muted); padding: 5rem 0; font-size: 1.2rem;">No games scheduled for this date.</div>`;
    } else {
        let displayDate = new Date(selectedDayObj.date);
        displayDate.setMinutes(displayDate.getMinutes() + displayDate.getTimezoneOffset()); // Fix timezone offset for display
        
        rightPaneHtml += `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin: 0; color: var(--text-color);">${displayDate.toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</h2>
                <span style="color: var(--text-muted); font-size: 1rem; font-family: monospace;">${selectedDayObj.matches.length} MATCHES</span>
            </div>
        `;
        
        selectedDayObj.matches.forEach(match => {
            const homeTeam = ohlTeams.find(t => t.id === match.homeId);
            const awayTeam = ohlTeams.find(t => t.id === match.awayId);
            const homeLogo = homeTeam.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
            const awayLogo = awayTeam.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
            
            let statusHtml = `<span style="color: var(--text-muted); font-size: 0.9rem; letter-spacing: 1px;">SCHEDULED</span>`;
            
            if (match.played) {
                let isOT = match.isOT ? '<div style="font-size: 1rem; color: #fbbf24; margin-top: -0.2rem;">(OT)</div>' : '';
                statusHtml = `<div style="display: flex; flex-direction: column; align-items: center;"><span style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; letter-spacing: 2px; line-height: 1;">${match.homeScore} - ${match.awayScore}</span>${isOT}</div>`;
            }
            
            let isUserMatch = match.homeId === currentTeam.id || match.awayId === currentTeam.id;
            let cardBg = isUserMatch ? 'linear-gradient(90deg, color-mix(in srgb, var(--team-primary) 20%, transparent) 0%, var(--card-bg) 100%)' : 'var(--card-bg)';
            let borderStyle = isUserMatch ? 'border: 3px solid var(--team-primary);' : 'border: 1px solid rgba(255,255,255,0.05);';
            let glow = isUserMatch ? 'box-shadow: 0 0 20px color-mix(in srgb, var(--team-primary) 20%, transparent);' : '';
            
            rightPaneHtml += `
                <div style="background: ${cardBg}; ${borderStyle} ${glow} border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; transition: transform 0.2s ease;">
                    
                    <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;">
                        <img src="assets/logos/ohl/${homeLogo}.png" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Home</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; ${match.played && match.homeScore > match.awayScore ? 'color: #fff;' : (match.played ? 'color: var(--text-muted);' : 'color: var(--text-color);')}">${homeTeam.name}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 120px; text-align: center; gap: 0.5rem;">
                        ${statusHtml}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; justify-content: flex-end;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Away</span>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.4rem; ${match.played && match.awayScore > match.homeScore ? 'color: #fff;' : (match.played ? 'color: var(--text-muted);' : 'color: var(--text-color);')}">${awayTeam.name}</span>
                        </div>
                        <img src="assets/logos/ohl/${awayLogo}.png" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                    </div>
                </div>
            `;
        });
    }
    
    rightPaneHtml += `</div>`;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h1 class="title-main" style="margin: 0; font-size: 2.5rem; letter-spacing: 1px;">League Calendar</h1>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 16px; height: 16px; background: var(--team-primary); border-radius: 4px;"></div>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">Selected</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 16px; height: 16px; border: 1px dashed #fbbf24; border-radius: 4px; background: transparent;"></div>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">Today</span>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 2rem; height: calc(100vh - 200px);">
            <!-- Left Pane: Mini Calendars -->
            <div style="flex: 0 0 350px; background: var(--card-bg); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                ${leftPaneHtml}
            </div>
            
            <!-- Right Pane: Match List -->
            <div style="flex: 1; overflow-y: auto; padding-right: 1rem;" class="custom-scrollbar">
                ${rightPaneHtml}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
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

function openIncompleteMatchModal() {
    const modalHTML = `
        <div id="incomplete-match-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="shield-alert" style="color: #ef4444; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Incomplete Roster</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You cannot start a match! Your roster is missing players. Ensure all <strong style="color: #fff;">20 regular positions</strong> and <strong style="color: #fff;">9 Overtime positions</strong> are filled before the puck drops.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-incomplete" style="background-color: #ef4444; border-color: #ef4444; color: #fff; width: 100%;">Fix Roster</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-incomplete').addEventListener('click', () => {
        document.getElementById('incomplete-match-modal').remove();
        switchView('roster');
    });
}

// --- NOTIFICATION & AGE MANAGEMENT ---

function computeSeasonAwards() {
    let awards = {};
    let playerMap = new Map();
    if (window.globalDraftPool) {
        window.globalDraftPool.forEach(p => playerMap.set(p.id, p));
    }
    if (gameState.players) {
        gameState.players.forEach(p => playerMap.set(p.id, p));
    }
    
    let allPlayers = Array.from(playerMap.values()).filter(p => p.stats && p.stats.games > 0);
    
    awards.playoffsWinnerId = gameState.playoffs ? gameState.playoffs.champion : null;
    let bestTeam = [...gameState.standings].sort((a, b) => b.pts - a.pts || b.w - a.w)[0];
    awards.regularSeasonWinnerId = bestTeam ? bestTeam.teamId : null;
    
    let lowestGaTeam = [...gameState.standings].sort((a, b) => a.ga - b.ga)[0];
    awards.lowestGaTeamId = lowestGaTeam ? lowestGaTeam.teamId : null;
    
    let topScorer = [...allPlayers].sort((a, b) => (b.stats.points) - (a.stats.points))[0];
    awards.topScorerId = topScorer ? topScorer.id : null;
    
    let mop = [...allPlayers].sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    awards.mopId = mop ? mop.id : null;
    
    let topRw = [...allPlayers].filter(p => p.position === 'RW').sort((a, b) => (b.stats.points) - (a.stats.points))[0];
    awards.topRwId = topRw ? topRw.id : null;
    
    let topD = [...allPlayers].filter(p => p.position === 'LD' || p.position === 'RD').sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    awards.topDefencemanId = topD ? topD.id : null;
    
    let topG = [...allPlayers].filter(p => p.position === 'G').sort((a, b) => b.overall - a.overall)[0];
    awards.topGoalieId = topG ? topG.id : null;
    
    let rookieG = [...allPlayers].filter(p => p.position === 'G' && p.age <= 17).sort((a, b) => b.overall - a.overall)[0];
    awards.rookieGoalieId = rookieG ? rookieG.id : null;
    
    let topRookie = [...allPlayers].filter(p => p.age <= 17).sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    awards.rookieId = topRookie ? topRookie.id : null;
    
    let topOverage = [...allPlayers].filter(p => p.age >= 20).sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    awards.overageId = topOverage ? topOverage.id : null;
    
    let playoffMvp = null;
    if (awards.playoffsWinnerId) {
        let champPlayers = [...allPlayers].filter(p => p.originalTeamId === awards.playoffsWinnerId || p.teamId === awards.playoffsWinnerId);
        playoffMvp = champPlayers.sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    }
    awards.playoffMvpId = playoffMvp ? playoffMvp.id : null;
    
    return awards;
}

window.advanceSeason = function() {
    if (!gameState) return;
    
    // Compute Awards and save history
    let awards = computeSeasonAwards();
    gameState.history = gameState.history || [];
    gameState.history.push({
        year: gameState.seasonYear || new Date().getFullYear(),
        awards: awards
    });
    
    let retiredPlayers = [];
    
    // Increase age of all active players
    gameState.players.forEach(p => {
        p.age = (p.age || 18) + 1;
        if (p.teamId === currentTeam.id && p.age >= 22) {
            retiredPlayers.push(p);
        }
    });
    
    // Process retirements (move to collection)
    retiredPlayers.forEach(p => {
        // Find index and remove from active roster
        let index = gameState.players.findIndex(active => active.id === p.id);
        if (index > -1) {
            gameState.players.splice(index, 1);
        }
        
        // Add to collection
        gameState.collection = gameState.collection || [];
        // Ensure no duplicates in collection just in case
        if (!gameState.collection.find(c => c.id === p.id)) {
            gameState.collection.push(p);
        }
        
        checkTeamCompletion(p.originalTeamId);
    });
    
    // Also increase age of players already in collection (just for lore)
    if (gameState.collection) {
        gameState.collection.forEach(p => {
            if (!retiredPlayers.find(r => r.id === p.id)) {
                p.age = (p.age || 22) + 1;
            }
        });
    }
    
    // Create Notification
    if (retiredPlayers.length > 0) {
        gameState.notifications = gameState.notifications || [];
        const namesStr = retiredPlayers.map(p => p.name).join(', ');
        const message = `The season has ended. ${retiredPlayers.length} player(s) reached the age limit of 22 and were moved to your Collection: ${namesStr}. You can draft them again from the Shop with their original age!`;
        
        gameState.notifications.push({
            id: Date.now().toString(),
            message: message,
            read: false,
            date: new Date().toLocaleDateString()
        });
        
        updateNotificationBadge();
    } else {
        alert("Season advanced! Everyone is 1 year older.");
    }
    
    // Reset Season and Generate New Schedule
    gameState.seasonYear = (gameState.seasonYear || new Date().getFullYear()) + 1;
    let newDate = new Date(gameState.seasonYear, 8, 1);
    while (newDate.getDay() !== 4 || Math.ceil(newDate.getDate() / 7) !== 3) {
        newDate.setDate(newDate.getDate() + 1);
    }
    
    gameState.currentDate = newDate;
    gameState.currentScheduleDayIndex = 0;
    gameState.matchIndex = 1;
    gameState.record = { wins: 0, losses: 0, otl: 0 };
    
    gameState.standings = ohlTeams.map(team => ({
        teamId: team.id,
        gp: 0, w: 0, l: 0, otl: 0, pts: 0, gf: 0, ga: 0,
        streak: { type: 'None', count: 0 },
        clinch: ''
    }));
    
    gameState.playoffs = null; // Reset playoffs for the new season
    
    // Reset all player stats
    if (window.globalDraftPool) {
        window.globalDraftPool.forEach(p => {
            p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        });
    }
    if (gameState.players) {
        gameState.players.forEach(p => {
            p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        });
    }
    if (gameState.collection) {
        gameState.collection.forEach(p => {
            p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        });
    }
    
    gameState.schedule = generateSeasonSchedule(ohlTeams, newDate);
    
    if (window.saveGame) window.saveGame();
    
    // Refresh current view if necessary
    const currentActiveBtn = document.querySelector('.sidebar-nav .nav-btn.active');
    if (currentActiveBtn) {
        const viewId = currentActiveBtn.id.replace('nav-', '');
        switchView(viewId);
    }
}

window.updateNotificationBadge = function() {
    if (!gameState) return;
    gameState.notifications = gameState.notifications || [];
    const unreadCount = gameState.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'block';
            badge.innerText = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

window.openNotificationsModal = function() {
    if (!gameState) return;
    gameState.notifications = gameState.notifications || [];
    
    let notificationsHtml = '';
    if (gameState.notifications.length === 0) {
        notificationsHtml = `<p style="color: var(--text-muted); text-align: center; padding: 2rem 0;">You have no new notifications.</p>`;
    } else {
        notificationsHtml = gameState.notifications.slice().reverse().map(n => `
            <div style="background: rgba(255,255,255,0.05); border-left: 4px solid ${n.read ? '#a1a1aa' : '#3b82f6'}; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">${n.date}</div>
                <div style="color: var(--text-color); line-height: 1.5;">${n.message}</div>
            </div>
        `).join('');
    }
    
    // Mark all as read
    gameState.notifications.forEach(n => n.read = true);
    updateNotificationBadge();

    const modalHTML = `
        <div id="notifications-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #3b82f6; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
                    <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2rem; letter-spacing: 1px; margin: 0;">Notifications</h2>
                    <button id="btn-close-notifications" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s ease;">
                        <i data-lucide="x" style="width: 24px; height: 24px;"></i>
                    </button>
                </div>
                
                <div style="overflow-y: auto; flex: 1; padding-right: 0.5rem;">
                    ${notificationsHtml}
                </div>
                
                ${gameState.notifications.length > 0 ? `
                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                    <button class="btn btn-secondary" id="btn-clear-notifications" style="width: 100%;">Clear All</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-close-notifications').addEventListener('click', () => {
        document.getElementById('notifications-modal').remove();
    });
    
    const btnClear = document.getElementById('btn-clear-notifications');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            gameState.notifications = [];
            document.getElementById('notifications-modal').remove();
            updateNotificationBadge();
        });
    }
}

// Global click delegation for dynamically injected elements
document.addEventListener('click', (e) => {
    const bellBtn = e.target.closest('#notification-bell');
    if (bellBtn) {
        openNotificationsModal();
    }
});

// --- COLLECTION (STICKER ALBUM) ---

window.unlockAllCollection = function() {
    if (!gameState.collection) gameState.collection = [];
    window.globalDraftPool.forEach(p => {
        if (!gameState.collection.some(c => c.id === p.id)) {
            gameState.collection.push(p);
        }
    });
    if (window.saveGame) window.saveGame();
    renderCollectionPage(document.getElementById('main-content'));
    alert("All players unlocked in the collection!");
};

window.renderCollectionPage = function(container) {
    if (!gameState) return;
    
    // Header
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h1 class="title-main" style="text-align:left; margin: 0; font-size: 2.5rem;">Sticker Album</h1>
                <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 1.1rem;">Complete a full OHL team to unlock special FPHL (C-Tier) rewards.</p>
            </div>
            <div style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: var(--team-primary);">
                TOTAL COLLECTED: <span style="color: #fff;">${gameState.collection ? gameState.collection.length : 0}</span>
            </div>
        </div>
    `;

    // Team Selector (Horizontal Scroll)
    html += `
        <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
    `;
    
    ohlTeams.forEach(team => {
        const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        const isSelected = window.currentCollectionTeamId === team.id || (!window.currentCollectionTeamId && team.id === currentTeam.id);
        if (isSelected) window.currentCollectionTeamId = team.id;
        
        const isCompleted = (gameState.completedCollections || []).includes(team.id);
        const borderStyle = isSelected ? `2px solid ${team.colors.primary}` : '2px solid transparent';
        const bgStyle = isSelected ? `rgba(255,255,255,0.1)` : 'transparent';
        const opacityStyle = isSelected ? '1' : '0.6';
        
        html += `
            <div onclick="window.currentCollectionTeamId='${team.id}'; renderCollectionPage(document.getElementById('main-content'))" 
                 style="position: relative; min-width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; border: ${borderStyle}; background: ${bgStyle}; opacity: ${opacityStyle};"
                 onmouseover="this.style.opacity='1'" onmouseout="if(window.currentCollectionTeamId!=='${team.id}') this.style.opacity='0.6'">
                <img src="assets/logos/ohl/${logoFile}.png" alt="${team.name}" style="width: 60px; height: 60px; object-fit: contain;">
                ${isCompleted ? `<div style="position: absolute; top: -5px; right: -5px; background: #fbbf24; color: #000; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"><i data-lucide="check" style="width: 16px; height: 16px;"></i></div>` : ''}
            </div>
        `;
    });
    html += `</div>`;
    
    html += `
        <div style="display: flex; justify-content: center; margin-bottom: 2rem;">
            <button class="btn" onclick="unlockAllCollection()" style="background: var(--team-primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-family: 'Blockletter', sans-serif; cursor: pointer; font-size: 1.2rem; letter-spacing: 1px;">
                <i data-lucide="unlock" style="margin-right: 8px; width: 20px; height: 20px;"></i> DEBUG: UNLOCK ALL PLAYERS
            </button>
        </div>
    `;

    // Players Grid
    const selectedTeam = ohlTeams.find(t => t.id === window.currentCollectionTeamId);
    const originalRoster = window.globalDraftPool.filter(p => p.originalTeamId === selectedTeam.id);
    
    let collectedCount = 0;
    const cardsHtml = originalRoster.map(player => {
        const isCollected = (gameState.collection || []).some(c => c.id === player.id);
        if (isCollected) collectedCount++;
        
        const posColors = { 'LW': '#3b82f6', 'C': '#ef4444', 'RW': '#06b6d4', 'LD': '#f59e0b', 'RD': '#8b5cf6', 'G': '#ec4899' };
        const posColor = posColors[player.position] || '#94a3b8';
        
        const filterStyle = isCollected ? '' : 'filter: grayscale(100%) opacity(0.3);';
        const bgGradient = isCollected ? `linear-gradient(180deg, #1e293b 0%, #0f172a 100%)` : '#0f172a';
        const cursorStyle = isCollected ? 'cursor: pointer;' : 'cursor: default;';
        const clickHandler = isCollected ? `onclick="openPlayerCardModal('${player.id}')"` : '';
        
        return `
            <div ${clickHandler} style="position: relative; border-radius: 12px; background: ${bgGradient}; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; padding-bottom: 1rem; text-align: center; transition: transform 0.2s; ${filterStyle} ${cursorStyle}" ${isCollected ? 'onmouseover="this.style.transform=\\\'scale(1.05)\\\'" onmouseout="this.style.transform=\\\'scale(1)\\\'"' : ''}>
                <div style="background-color: ${posColor}; height: 40px; width: 100%; position: absolute; top: 0; left: 0; z-index: 0; clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);"></div>
                
                <div style="position: absolute; top: 0.5rem; left: 0.5rem; z-index: 2; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff;">
                    ${Math.round(player.overall)}
                </div>
                
                <div style="position: relative; z-index: 1; margin-top: 1.5rem;">
                    <img src="https://assets.leaguestat.com/ohl/240x240/${player.id.split('_')[1]}.jpg" onerror="this.src='assets/default-player.svg'" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%; border: 3px solid #334155; background-color: #000;">
                </div>
                
                <div style="position: relative; z-index: 1; margin-top: 0.5rem; padding: 0 0.5rem;">
                    <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${player.name}</h3>
                    <p style="color: ${posColor}; font-family: 'Blockletter', sans-serif; font-size: 1rem; margin: 0;">${player.position}</p>
                </div>
                
                ${!isCollected ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 3;">
                        <i data-lucide="lock" style="width: 40px; height: 40px; color: #fff; opacity: 0.5;"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; margin: 0; color: ${selectedTeam.colors.primary};">${selectedTeam.name}</h2>
            <div style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold;">
                ${collectedCount} / ${originalRoster.length} Collected
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.5rem;">
            ${cardsHtml}
        </div>
    `;

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

window.checkTeamCompletion = function(teamId) {
    if (!gameState) return;
    gameState.completedCollections = gameState.completedCollections || [];
    if (gameState.completedCollections.includes(teamId)) return; // Already completed

    // Get all original players for this team
    const originalRoster = window.globalDraftPool.filter(p => p.originalTeamId === teamId);
    if (!originalRoster || originalRoster.length === 0) return;

    // Check if user has all of them in collection
    const hasAll = originalRoster.every(orig => (gameState.collection || []).some(c => c.id === orig.id));

    if (hasAll) {
        gameState.completedCollections.push(teamId);
        awardCompletionPacks(teamId);
    }
}

window.awardCompletionPacks = function(teamId) {
    const team = ohlTeams.find(t => t.id === teamId);
    
    // Simulate FPHL (C-Tier) rewards using random OHL players buffed to Silver
    let availablePlayers = window.globalDraftPool.filter(p => {
        const activePlayerIds = new Set(gameState.players.map(active => active.id));
        return !activePlayerIds.has(p.id);
    });
    
    let rewardPlayers = [];
    // Grant 2 players
    for (let i = 0; i < 2; i++) {
        if (availablePlayers.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const selectedData = availablePlayers[randomIndex];
        availablePlayers.splice(randomIndex, 1);
        
        let newPlayer = {
            id: selectedData.id,
            name: selectedData.name + " (FPHL)",
            position: selectedData.position,
            number: selectedData.number,
            photo: selectedData.photo,
            birthplace: selectedData.birthplace,
            age: selectedData.age,
            teamId: currentTeam.id,
            originalTeamId: selectedData.originalTeamId,
            location: 'bench',
            tier: 'silver',
            overall: Math.round(selectedData.overall * 1.5),
            attributes: JSON.parse(JSON.stringify(selectedData.attributes))
        };
        
        // Multiply sub-attributes
        Object.values(newPlayer.attributes).forEach(category => {
            for (let key in category) {
                if (key !== 'total') category[key] = parseFloat((category[key] * 1.5).toFixed(1));
            }
        });
        
        gameState.players.push(newPlayer);
        rewardPlayers.push(newPlayer.id);
    }
    
    // Notification
    gameState.notifications = gameState.notifications || [];
    gameState.notifications.push({
        id: Date.now().toString(),
        message: `CONGRATULATIONS! You completed the ${team ? team.name : 'Team'} sticker album! You have been awarded 2 FPHL (C-Tier) player cards as a reward!`,
        read: false,
        date: new Date().toLocaleDateString()
    });
    updateNotificationBadge();
    
    // Open Reveal Modal
    setTimeout(() => {
        alert(`You completed the ${team ? team.name : 'team'} album! Opening your 2 Special Packs...`);

        openPackRevealModal(rewardPlayers);
    }, 500);
}

window.renderPlayoffsPage = function(container) {
    if (!gameState.playoffs) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: var(--text-muted);">
                <i data-lucide="git-merge" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; margin: 0;">Playoffs Not Started</h3>
                <p>The playoff bracket will be generated at the end of the regular season.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    let p = gameState.playoffs;
    let roundName = p.round === 1 ? 'Quarterfinals' : (p.round === 2 ? 'Semifinals' : (p.round === 3 ? 'Conference Finals' : 'Championship'));
    
    let html = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 class="title-main" style="margin: 0;">Playoff Tree</h1>
                <span style="background: linear-gradient(90deg, #d97706 0%, #b45309 100%); color: white; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">
                    ${p.champion ? 'CHAMPION CROWNED' : 'ROUND ' + p.round + ' - ' + roundName.toUpperCase()}
                </span>
            </div>
    `;

    if (p.champion) {
        let champTeam = ohlTeams.find(t => t.id === p.champion);
        html += `
            <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; border-color: #fbbf24; text-align: center;">
                <i data-lucide="award" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: 1rem;"></i>
                <img src="assets/logos/ohl/${champTeam.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-')}.png" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(0 0 20px #fbbf24); margin-bottom: 1.5rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fbbf24; margin: 0;">${champTeam.name.toUpperCase()}</h2>
                <h3 style="color: var(--text-color); margin: 0; font-size: 1.5rem; opacity: 0.8;">OHL CHAMPIONS</h3>
            </div>
        `;
    }

    const wR1 = p.series.filter(s => s.round === 1 && s.conference === 'West');
    const wR2 = p.series.filter(s => s.round === 2 && s.conference === 'West');
    const wR3 = p.series.filter(s => s.round === 3 && s.conference === 'West');
    
    const eR1 = p.series.filter(s => s.round === 1 && s.conference === 'East');
    const eR2 = p.series.filter(s => s.round === 2 && s.conference === 'East');
    const eR3 = p.series.filter(s => s.round === 3 && s.conference === 'East');
    
    const fR = p.series.filter(s => s.round === 4);

    function renderMatchup(s) {
        if (!s) return `<div class="matchup-card empty">TBD</div>`;
        const t1 = ohlTeams.find(t => t.id === s.highSeedId) || { name: 'TBD', id: 'tbd' };
        const t2 = ohlTeams.find(t => t.id === s.lowSeedId) || { name: 'TBD', id: 'tbd' };
        
        const logo1 = t1.id !== 'tbd' ? t1.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        const logo2 = t2.id !== 'tbd' ? t2.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        
        const winner = s.winner;
        
        return `
            <div class="matchup-card" onclick="openSeriesModal('${s.id}')" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div class="matchup-row ${winner === t1.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t1.id !== 'tbd' ? `<img src="assets/logos/ohl/${logo1}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${t1.name.split(' ').pop()}</span>
                    </div>
                    <span>${s.highSeedWins}</span>
                </div>
                <div class="matchup-row ${winner === t2.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t2.id !== 'tbd' ? `<img src="assets/logos/ohl/${logo2}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${t2.name.split(' ').pop()}</span>
                    </div>
                    <span>${s.lowSeedWins}</span>
                </div>
            </div>
        `;
    }

    html += `
            <div class="playoff-bracket" style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="bracket-wrapper">
                    <div class="bracket-container">
                        <!-- WEST -->
                        <div class="bracket-col col-left-1">
                            ${renderMatchup(wR1[0])}
                            ${renderMatchup(wR1[3])}
                            ${renderMatchup(wR1[1])}
                            ${renderMatchup(wR1[2])}
                        </div>
                        <div class="bracket-col col-left-2">
                            ${renderMatchup(wR2[0])}
                            ${renderMatchup(wR2[1])}
                        </div>
                        <div class="bracket-col col-left-3">
                            ${renderMatchup(wR3[0])}
                        </div>
                        
                        <!-- FINAL -->
                        <div class="bracket-col" style="padding: 0 1rem;">
                            <h3 style="text-align: center; font-family: 'Blockletter', sans-serif; margin-bottom: 1rem; color: #fcc82d; text-shadow: 0 0 10px rgba(252, 200, 45, 0.4);">J. Ross Robertson Cup</h3>
                            ${renderMatchup(fR[0])}
                        </div>
                        
                        <!-- EAST -->
                        <div class="bracket-col col-right-3">
                            ${renderMatchup(eR3[0])}
                        </div>
                        <div class="bracket-col col-right-2">
                            ${renderMatchup(eR2[0])}
                            ${renderMatchup(eR2[1])}
                        </div>
                        <div class="bracket-col col-right-1">
                            ${renderMatchup(eR1[0])}
                            ${renderMatchup(eR1[3])}
                            ${renderMatchup(eR1[1])}
                            ${renderMatchup(eR1[2])}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
};

window.openSeriesModal = function(seriesId) {
    let series = gameState.playoffs.series.find(s => s.id === seriesId);
    if (!series) return;
    
    let matches = gameState.schedule.flatMap(day => day.matches).filter(m => m.seriesId === seriesId);
    
    let matchesHtml = matches.map((m, idx) => {
        let home = ohlTeams.find(t => t.id === m.homeId) || { name: 'TBD' };
        let away = ohlTeams.find(t => t.id === m.awayId) || { name: 'TBD' };
        
        let scoreText = m.played ? `${m.homeScore} - ${m.awayScore}${m.isOT ? ' (OT)' : ''}` : 'Scheduled';
        let colorText = m.played ? 'color: var(--text-color); font-weight: bold;' : 'color: var(--text-muted);';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.1));">
                <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; width: 60px;">Game ${m.gameNum || (idx + 1)}</span>
                <span style="flex: 1; text-align: right; ${colorText}">${away.name}</span>
                <span style="margin: 0 1rem; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; ${colorText}">${scoreText}</span>
                <span style="flex: 1; text-align: left; ${colorText}">${home.name}</span>
            </div>
        `;
    }).join('');
    
    if (matches.length === 0) {
        matchesHtml = `<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No games scheduled yet.</p>`;
    }
    
    const high = ohlTeams.find(t => t.id === series.highSeedId) || { name: 'TBD' };
    const low = ohlTeams.find(t => t.id === series.lowSeedId) || { name: 'TBD' };

    let modalHTML = `
        <div id="series-modal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center;" onclick="this.remove()">
            <div class="dashboard-card" style="width: 500px; max-width: 90vw; background-color: var(--surface-color); border-radius: 12px; border: 1px solid var(--border-color, rgba(0,0,0,0.1)); padding: 2rem; position: relative;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('series-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer;"><i data-lucide="x"></i></button>
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; margin-top: 0; margin-bottom: 0.5rem; text-align: center;">Series Matchups</h2>
                <h3 style="text-align: center; color: var(--text-muted); font-size: 1.1rem; margin-bottom: 2rem;">${high.name} vs ${low.name}</h3>
                <div style="display: flex; flex-direction: column; max-height: 400px; overflow-y: auto;">
                    ${matchesHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
};

window.renderHallOfFame = function(container) {
    if (!gameState) return;
    
    let html = `
        <div style="padding: 2rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; background: linear-gradient(90deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%); padding: 1rem 1.5rem; border-radius: 12px; border-left: 4px solid #fbbf24;">
                <i data-lucide="star" style="width: 48px; height: 48px; color: #fbbf24;"></i>
                <div>
                    <h1 class="title-main" style="text-align: left; margin: 0 0 0.2rem 0; font-size: 2.5rem; line-height: 1; text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);">HALL OF FAME</h1>
                    <div style="color: var(--text-muted); font-size: 1.1rem;">Official History & OHL Awards</div>
                </div>
            </div>
    `;
    
    if (!gameState.history || gameState.history.length === 0) {
        html += `<div style="text-align: center; color: var(--text-muted); font-size: 1.2rem; padding: 4rem;">No seasons have been completed yet. Win championships to fill the Hall of Fame!</div></div>`;
        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    const getPlayer = (id) => {
        if (!id) return null;
        let p = window.globalDraftPool ? window.globalDraftPool.find(x => x.id === id) : null;
        if (!p && gameState.players) p = gameState.players.find(x => x.id === id);
        if (!p && gameState.collection) p = gameState.collection.find(x => x.id === id);
        return p;
    };
    
    const renderAward = (title, subtitle, playerId) => {
        const p = getPlayer(playerId);
        if (!p) return '';
        const teamInfo = p.originalTeamId ? ohlTeams.find(t => t.id === p.originalTeamId) : null;
        const logoFile = teamInfo ? teamInfo.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-') : '';
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.2); display: flex; align-items: center; gap: 1rem;">
                <img src="https://assets.leaguestat.com/ohl/240x240/${p.id.split('_')[1]}.jpg" onerror="this.src='assets/default-player.svg'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid #fbbf24; background-color: #000;">
                <div>
                    <div style="color: #fbbf24; font-family: 'Blockletter', sans-serif; font-size: 1.1rem; margin-bottom: 0.2rem;">${title}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.2rem;">${subtitle}</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${logoFile ? `<img src="assets/logos/ohl/${logoFile}.png" style="height: 16px; object-fit: contain;">` : ''}
                        <span style="color: #fff; font-weight: bold; font-size: 1rem;">${p.name}</span>
                    </div>
                </div>
            </div>
        `;
    };
    
    const renderTeamAward = (title, subtitle, teamId) => {
        const t = ohlTeams.find(x => x.id === teamId);
        if (!t) return '';
        const logoFile = t.name.toLowerCase().replace(/[']/g, '').replace(/ /g, '-');
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.5); display: flex; align-items: center; gap: 1rem; flex: 1;">
                <img src="assets/logos/ohl/${logoFile}.png" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));">
                <div>
                    <div style="color: #fbbf24; font-family: 'Blockletter', sans-serif; font-size: 1.2rem; margin-bottom: 0.2rem;">${title}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.2rem;">${subtitle}</div>
                    <div style="color: #fff; font-weight: bold; font-size: 1.2rem;">${t.name}</div>
                </div>
            </div>
        `;
    };

    let reversedHistory = [...gameState.history].reverse();
    
    reversedHistory.forEach(h => {
        html += `
            <div style="margin-bottom: 4rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: #fff; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">SEASON ${h.year}</h2>
                
                <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem;">
                    ${renderTeamAward('J. Ross Robertson Cup', 'OHL Playoffs Champion', h.awards.playoffsWinnerId)}
                    ${renderTeamAward('Hamilton Spectator Trophy', 'Regular Season Winner', h.awards.regularSeasonWinnerId)}
                    ${renderTeamAward('Dave Pinkney Trophy', 'Lowest Team Goals-Against', h.awards.lowestGaTeamId)}
                </div>
                
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: var(--text-muted); margin-bottom: 1rem;">Individual Awards</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                    ${renderAward('Red Tilson Trophy', 'Most Outstanding Player', h.awards.mopId)}
                    ${renderAward('Wayne Gretzky ’99’ Award', 'OHL Playoff MVP', h.awards.playoffMvpId)}
                    ${renderAward('Eddie Powers Trophy', 'Top Scorer', h.awards.topScorerId)}
                    ${renderAward('Jim Mahon Trophy', 'Top Scoring Right Winger', h.awards.topRwId)}
                    ${renderAward('Max Kaminsky Trophy', 'Defenceman of the Year', h.awards.topDefencemanId)}
                    ${renderAward('Jim Rutherford Trophy', 'Goaltender of the Year', h.awards.topGoalieId)}
                    ${renderAward('FW "Dinty" Moore Trophy', 'Best Rookie Goaltender', h.awards.rookieGoalieId)}
                    ${renderAward('Emms Family Award', 'Rookie of the Year', h.awards.rookieId)}
                    ${renderAward('Leo Lalonde Trophy', 'Overage Player of the Year', h.awards.overageId)}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
