import './core/saveManager.js';

function getTeamNameParts(fullName) {
    if (!fullName) return { city: '', mascot: '' };
    const twoWordMascots = ['Sea Dogs', 'Wheat Kings', 'Oil Kings', 'Ice Dogs', 'IceDogs', '67\'s', 'Frontenacs', 'Greyhounds', 'Steelheads', 'Firebirds', 'Battalion', 'Winterhawks', 'Silvertips', 'Americans', 'Thunderbirds', 'Cataractes', 'Saguenéens', 'Olympiques', 'Voltigeurs', 'Foreurs', 'Huskies', 'Océanic', 'Remparts', 'Drakkar', 'Tigres', 'Eagles', 'Wildcats', 'Mooseheads', 'Islanders', 'Regiment', 'Armada', 'Titan', 'Colts', 'Petes', 'Rangers', 'Spitfires', 'Knights', 'Storm', 'Spirit', 'Sting', 'Otters', 'Attack', 'Raiders', 'Tigers', 'Hitmen', 'Blades', 'Pats', 'Rebels', 'Warriors', 'Broncos', 'Hurricanes', 'Vees', 'Cougars', 'Rockets', 'Blazers', 'Chiefs', 'Royals', 'Wild', 'Giants', 'Black Bears', 'River Dragons', 'Northern Lights', 'Hat Tricks'];
    for (let m of twoWordMascots) {
        if (fullName.endsWith(m)) {
            return { city: fullName.substring(0, fullName.length - m.length).trim(), mascot: m };
        }
    }
    const parts = fullName.split(' ');
    const mascot = parts.pop();
    const city = parts.join(' ');
    return { city, mascot };
}
import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams, getTeamLogoUrl } from '../data/teams.js';
import { generateSeasonSchedule } from './schedule.js';
import { generatePlayoffs, processPlayoffMatchResult, advancePlayoffRound } from './playoffs.js';
import { processMemorialCupMatchResult, advanceMemorialCupPhase } from './memorial_cup.js';
import { initMainMenu } from './ui/setupUI.js';
import { renderDashboard as renderDashboardUI } from './ui/dashboardUI.js';
import { renderRoster, autoFillRoster } from './ui/rosterUI.js';
import { renderFreeAgencyPage } from './ui/freeAgencyUI.js';
import * as SimEngine from './engine/simulation.js';
import './ui/cardsUI.js';
import './ui/shopUI.js';
import './ui/standingsUI.js';
import './ui/modalsUI.js';
import './engine/season.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Hockey GM initialized');
    

    Object.defineProperty(window, 'gameState', {
        get: function() { return gameState; },
        set: function(val) { gameState = val; }
    });

    Object.defineProperty(window, 'currentTeam', {
        get: function() { return currentTeam; },
        set: function(val) { currentTeam = val; }
    });

    // Always start at Main Menu
    initMainMenu();

    // Load full player database for Collection and other global needs
    window.allPlayersDatabase = {};
    Promise.all([
        fetch('data/rosters.json').then(r => r.json()).catch(() => ({})),
        fetch('data/fphl_rosters.json').then(r => r.json()).catch(() => ({}))
    ]).then(([chl, fphl]) => {
        window.allPlayersDatabase = { ...chl, ...fphl };
    });
});

// --- UI VIEWS ---



let currentTeam = null;
let gameState = null;

window.getActiveLeagueTeams = function(stateObj = gameState) {
    if (!stateObj) return ohlTeams;
    if (stateObj.league === 'whl') return whlTeams;
    if (stateObj.league === 'qmjhl') return qmjhlTeams;
    if (stateObj.league === 'fphl') return fphlTeams;
    return ohlTeams;
};


async function initNewGame(teamIdOverride = null, leagueOverride = 'ohl') {
    const activeTeams = leagueOverride === 'whl' ? whlTeams : (leagueOverride === 'qmjhl' ? qmjhlTeams : (leagueOverride === 'fphl' ? fphlTeams : ohlTeams));
    const targetTeam = teamIdOverride ? activeTeams.find(t => t.id === teamIdOverride) : currentTeam;
    const currentYear = new Date().getFullYear();
    
    let date;
    let totalMatches = 68;
    
    if (leagueOverride === 'fphl') {
        totalMatches = 56;
        date = new Date(currentYear, 9, 1); // October
        let fridaysCount = 0;
        while(fridaysCount < 2) {
            if (date.getDay() === 5) {
                fridaysCount++;
            }
            if (fridaysCount < 2) {
                date.setDate(date.getDate() + 1);
            }
        }
    } else {
        totalMatches = 68;
        // Calcula a 3ª quarta-feira de Setembro do ano atual
        date = new Date(currentYear, 8, 1);
        while (date.getDay() !== 3 || Math.ceil(date.getDate() / 7) !== 3) {
            date.setDate(date.getDate() + 1);
        }
    }
    
    const otherTeams = activeTeams.filter(t => t.id !== targetTeam.id);
    const randomOpponent = otherTeams[Math.floor(Math.random() * otherTeams.length)];
    const isHome = Math.random() > 0.5;

    gameState = {
        league: leagueOverride,
        seasonYear: currentYear,
        currentDate: date,
        currentScheduleDayIndex: 0,
        players: [],
        coins: 99999,
        collection: [],
        notifications: [],
        totalMatches: totalMatches,
        record: {
            wins: 0,
            losses: 0,
            otl: 0
        },
        standings: activeTeams.map(team => ({
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
        playoffs: null,
        memorialCup: null,
        freeAgencyMarket: {
            players: [],
            nextRefreshGames: 5,
            soldSlots: []
        }
    };
    
    const activeTeamsRef = getActiveLeagueTeams(gameState);
    gameState.schedule = generateSeasonSchedule(activeTeamsRef, gameState.currentDate, gameState.totalMatches || 68);
    
    // RF03: Generate initial roster
    try {
        const rosterFile = leagueOverride === 'fphl' ? 'data/fphl_rosters.json' : 'data/rosters.json';
        const response = await fetch(rosterFile);
        const allRosters = await response.json();
        
        let globalDraftPool = [];
        let activeTeamIds = activeTeamsRef.map(t => t.id);
        Object.keys(allRosters).forEach(teamId => {
            if (activeTeamIds.includes(teamId)) {
                let teamRoster = allRosters[teamId];
                if (teamRoster && teamRoster.length > 0) {
                    teamRoster.forEach(p => {
                        p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                    });
                    globalDraftPool = globalDraftPool.concat(teamRoster);
                }
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
                location: 'bench', // Todos começam no banco!
                stats: JSON.parse(JSON.stringify(p.stats)) // DEEP COPY
            });
        });
        
        // As 19/21 equipes controladas pela CPU mantêm os elencos reais
        activeTeams.forEach(team => {
            if (team.id === targetTeam.id) return; // Seu time já tem os 20 randômicos
            
            const teamRoster = allRosters[team.id];
            if (teamRoster && teamRoster.length > 0) {
                // Remove players already drafted by user
                let availablePlayers = teamRoster.filter(p => !userDraftedPlayers.some(drafted => drafted.id === p.id));
                
                // Shuffle available players
                for (let i = availablePlayers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availablePlayers[i], availablePlayers[j]] = [availablePlayers[j], availablePlayers[i]];
                }
                
                // Take all available players up to 30 as requested
                let cpuDrafted = availablePlayers;
                
                // Pad with generic fillers to ensure minimum 20 players for overall calculations
                if (cpuDrafted.length < 20) {
                    const fillersNeeded = 20 - cpuDrafted.length;
                    for (let f = 0; f < fillersNeeded; f++) {
                        cpuDrafted.push({
                            id: team.id + '_filler_' + f,
                            name: 'Local Prospect ' + (f+1),
                            number: '0',
                            position: 'C',
                            age: 18,
                            birthplace: 'Unknown',
                            photo: 'assets/default-player.svg',
                            overall: 48,
                            tier: 'bronze',
                            originalTeamId: team.id,
                            isFiller: true,
                            stats: { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }
                        });
                    }
                }
                
                cpuDrafted.forEach(p => {
                    gameState.players.push({
                        ...p,
                        teamId: team.id,
                        location: 'cpu_bench',
                        stats: JSON.parse(JSON.stringify(p.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }))
                    });
                });
            }
        });

    } catch (error) {
        console.error('Error loading complete rosters:', error);
        alert('Falha ao carregar elencos. Verifique data/rosters.json');
    }

    gameState.leagueLeaders = {
        pts: [],
        g: [],
        a: [],
        svp: []
    };
    
    // (O array de gameState.players já foi populado com sucesso via JSON acima)
}

window.openConfirmationModal = function(team, league = 'ohl') {
    const logoPath = getTeamLogoUrl(team.id);
    const modalHTML = `
        <div id="confirm-modal" class="modal-overlay">
            <div class="modal-content">
                <img src="${logoPath}" alt="${team.name} Logo" class="modal-logo">
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
        handleTeamSelection(team, league);
    });
}

async function handleTeamSelection(team, league) {
    currentTeam = team;
    await initNewGame(null, league);
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
    if (gameState.coins === undefined) gameState.coins = 200; // Saldo inicial apenas se não existir
    if (gameState.collection === undefined) gameState.collection = []; // Coleção apenas se não existir
    
    document.documentElement.style.setProperty('--team-primary', currentTeam.colors.primary);
    document.documentElement.style.setProperty('--team-secondary', currentTeam.colors.secondary);
    
    app.innerHTML = `
        <div class="app-layout" style="--team-primary: ${currentTeam.colors.primary}; --team-secondary: ${currentTeam.colors.secondary};">
            <aside class="sidebar">
                <div class="sidebar-brand" style="position: relative; display: flex; justify-content: center; align-items: center;">
                    <img src="assets/logos/hockey_gm_logo.png" alt="Hockey GM Logo" style="height: 180px; width: auto; object-fit: contain; filter: drop-shadow(0 0 15px rgba(0,0,0,0.6)); margin-top: -10px;">
                    <div id="notification-bell" style="position: absolute; top: -10px; right: -10px; cursor: pointer; color: var(--text-color); transition: color 0.2s ease;">
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

                </nav>
                
                <div class="sidebar-bottom">

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
    document.getElementById('nav-calendar').addEventListener('click', () => switchView('calendar'));
    document.getElementById('nav-collection').addEventListener('click', () => switchView('collection'));
    document.getElementById('nav-shop').addEventListener('click', () => switchView('shop'));

    document.getElementById('nav-halloffame').addEventListener('click', () => switchView('halloffame'));
    
    // Bind Save Game
    const btnSaveGame = document.getElementById('btn-save-game');
    if (btnSaveGame) {
        btnSaveGame.addEventListener('click', () => openSaveModal());
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
        sidebarBrand.innerHTML = `
            <div style="position: relative; display: flex; width: 100%; justify-content: center; align-items: center;">
                <img src="assets/logos/hockey_gm_logo.png" alt="Hockey GM Logo" style="height: 180px; width: auto; object-fit: contain; filter: drop-shadow(0 0 15px rgba(0,0,0,0.6)); margin-top: -10px;">
            </div>
        `;
    }
    
    // Create icons immediately after injecting HTML
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    const mainContent = document.getElementById('main-content');
    
    if (viewName === 'dashboard') {
        renderDashboard(mainContent);
    } else if (viewName === 'roster') {
        renderRoster(mainContent, gameState);
    } else if (viewName === 'standings') {
        renderStandingsPage(mainContent);
    } else if (viewName === 'shop') {
        renderShopPage(mainContent);
    } else if (viewName === 'freeagency') {
        if (typeof renderFreeAgencyPage === 'function') {
            renderFreeAgencyPage(mainContent);
        } else {
            mainContent.innerHTML = `<h2 style="color:white; text-align:center; margin-top:2rem;">Free Agency module not loaded.</h2>`;
        }
    } else if (viewName === 'calendar') {
        renderCalendarPage(mainContent);
    } else if (viewName === 'collection') {
        renderCollectionPage(mainContent);
    } else if (viewName === 'halloffame') {
        renderHallOfFame(mainContent);
    } else if (viewName === 'match') {
        renderMatchPage(mainContent);
    }
    
    // Restore notification badge state after the new view is generated
    if (window.updateNotificationBadge) {
        window.updateNotificationBadge();
    }
}

function updateCoinsDisplay() {
    const coinsEl = document.querySelector('.coins-amount');
    if (coinsEl && gameState) {
        coinsEl.textContent = gameState.coins || 0;
    }
}
window.updateCoinsDisplay = updateCoinsDisplay;

function renderDashboard(container) {
    updateCoinsDisplay();
    if (container) {
        renderDashboardUI(container, gameState, currentTeam);
    }
}

window.startPlayoffs = function() {
    // 0. Auto-simulate any remaining regular season games for CPU teams to close out the calendar properly
    if (gameState.schedule) {
        gameState.schedule.forEach(day => {
            if (day.matches) {
                day.matches.forEach(m => {
                    if (!m.played) {
                        SimEngine.simulateBackgroundMatch(gameState, m);
                    }
                });
            }
        });
    }

    // 1. Generate playoffs FIRST so the engine can use regular season standings for seeding
    generatePlayoffs(gameState);
    
    // 2. Snapshot the season history (Regular Season Stats)
    gameState.seasonHistory = {
        standings: JSON.parse(JSON.stringify(gameState.standings)),
        players: JSON.parse(JSON.stringify(gameState.players || [])),
        leagueLeaders: JSON.parse(JSON.stringify(gameState.leagueLeaders || {}))
    };
    
    // 3. Wipe current standings for the Playoffs
    if (gameState.standings) {
        gameState.standings.forEach(s => {
            s.w = 0;
            s.l = 0;
            s.otl = 0;
            s.pts = 0;
            s.gf = 0;
            s.ga = 0;
            s.gp = 0;
            s.streak = 0;
        });
    }
    
    // 4. Wipe current player stats for the Playoffs
    if (gameState.players) {
        gameState.players.forEach(p => {
            if (p.stats) {
                p.stats.goals = 0;
                p.stats.assists = 0;
                p.stats.points = 0;
                p.stats.games = 0;
                p.stats.shotsAgainst = 0;
                p.stats.saves = 0;
                p.stats.goalsAgainst = 0;
            }
        });
    }

    if (window.saveGame) window.saveGame();
    switchView('dashboard');
};

window.refreshFreeAgencyMarket = function() {
    if (!gameState || !window.globalDraftPool || !gameState.freeAgencyMarket) return;
    
    const userPlayers = gameState.players.filter(p => p.teamId === gameState.team.id);
    const activePlayerIds = new Set(userPlayers.map(p => p.id));
    const available = window.globalDraftPool.filter(p => !activePlayerIds.has(p.id));
    
    const bronze = available.filter(p => p.tier === 'bronze');
    const silver = available.filter(p => p.tier === 'silver');
    const gold = available.filter(p => p.tier === 'gold');
    
    const shuffle = (array) => array.sort(() => Math.random() - 0.5);
    shuffle(bronze);
    shuffle(silver);
    shuffle(gold);
    
    let marketPlayers = [];
    marketPlayers = marketPlayers.concat(bronze.splice(0, 3));
    marketPlayers = marketPlayers.concat(silver.splice(0, 2));
    marketPlayers = marketPlayers.concat(gold.splice(0, 1));
    
    let remaining = shuffle([...bronze, ...silver, ...gold]);
    while (marketPlayers.length < 6 && remaining.length > 0) {
        marketPlayers.push(remaining.shift());
    }
    
    gameState.freeAgencyMarket.players = marketPlayers.map(p => p.id);
    gameState.freeAgencyMarket.soldSlots = [];
    
    if (window.logEvent) {
        window.logEvent("New Free Agents available in the Free Shopping market!", "#10b981");
    }
    
    gameState.notifications = gameState.notifications || [];
    gameState.notifications.push({
        id: Date.now(),
        message: 'New Free Agents are available in the Free Agency Market!',
        color: '#10b981',
        read: false
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();
};

window.simulateBackgroundDays = function(daysCount) {
    const btn = event && event.target ? event.target.closest('button') : null;
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader-2" class="lucide-spin" style="width: 20px; height: 20px;"></i> SIMULATING...`;
        btn.disabled = true;
        if (window.lucide) window.lucide.createIcons();
    }
    
    // Use setTimeout to allow the browser to paint the loading state
    setTimeout(() => {
        try {
            SimEngine.simulateBackgroundDays(gameState, daysCount, {
                onComplete: () => {
                    if (window.saveGame) window.saveGame();
                    switchView('dashboard');
                }
            });
        } catch(e) {
            console.error("Simulation error:", e);
            if (btn) {
                btn.innerHTML = `ERR: ${e.message}`;
                btn.style.background = 'red';
            }
            if (window.saveGame) window.saveGame();
        }
    }, 50);
}

window.simulateToPlayoffs = function() {
    const btn = event && event.target ? event.target.closest('button') : null;
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader-2" class="lucide-spin" style="width: 20px; height: 20px;"></i> SIMULATING...`;
        btn.disabled = true;
        if (window.lucide) window.lucide.createIcons();
    }
    
    setTimeout(() => {
        try {
            SimEngine.simulateToPlayoffs(gameState, {
                onComplete: () => {
                    if (window.saveGame) window.saveGame();
                    switchView('dashboard');
                }
            });
        } catch (e) {
            console.error("Playoffs simulation error:", e);
            if (window.saveGame) window.saveGame();
            switchView('dashboard');
        }
    }, 50);
}

// Render Standings and League Leaders moved to dashboardUI.js

// --- ROSTER ENGINE ---
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
        let cpuPlayers = gameState.players.filter(p => p.teamId === teamId);
        
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
    
    if (activePlayers.length < 20) {
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
        window.simulateBackgroundDays(daysToSimulate);
    }
    
    const isHome = nextMatchObj.homeId === currentTeam.id;
    const opponentId = isHome ? nextMatchObj.awayId : nextMatchObj.homeId;
    
    const myTeamInfo = currentTeam;
    const activeLeagueTeams = getActiveLeagueTeams();
    const oppTeamInfo = activeLeagueTeams.find(t => t.id === opponentId);
    
    // Mocking currentMatch for the simulation loop logic
    const currentMatch = nextMatchObj;
    currentMatch.status = 'scheduled';
    currentMatch.homeScore = 0;
    currentMatch.awayScore = 0;
    
    const myLogo = myTeamInfo.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-');
    const oppLogo = oppTeamInfo.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-');
    
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
            
            <div style="display: flex; flex-direction: row; width: 100%; max-width: 1600px; flex: 1; min-height: 0; gap: 2rem;">
                
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
                        <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${homeColor}); margin-bottom: 0.5rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                            <span style="font-family: 'Roboto', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 3px; margin-bottom: -4px;">${homeCity}</span>
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 4.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${homeMascot}</h2>
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
                            <div id="home-score" style="font-family: 'Blockletter', sans-serif; font-size: 8rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                            <div style="font-family: 'Roboto', sans-serif; font-size: 3rem; color: rgba(255,255,255,0.3); font-weight: 700;">-</div>
                            <div id="away-score" style="font-family: 'Blockletter', sans-serif; font-size: 8rem; color: #fff; line-height: 1; text-shadow: 0 5px 15px rgba(0,0,0,0.5);">0</div>
                        </div>
                        
                        <div id="match-clock" style="font-family: 'Blockletter', sans-serif; font-size: 4.5rem; color: #fff; background-color: rgba(0,0,0,0.6); padding: 0.5rem 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); letter-spacing: 2px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">20:00</div>
                        
                        <!-- SHOOTOUT TRACKER -->
                        <div id="shootout-tracker" style="display: none; flex-direction: column; gap: 0.5rem; margin-top: 1rem; width: 100%;">
                            <div style="font-family: 'Blockletter', sans-serif; color: #fff; text-align: center; font-size: 1.2rem; letter-spacing: 2px; text-shadow: 0 0 5px rgba(255,255,255,0.5);">SHOOTOUT</div>
                            <div style="display: flex; justify-content: space-between; width: 100%; gap: 2rem;">
                                <div id="so-home-tracker" style="display: flex; gap: 0.5rem; justify-content: center; flex: 1;"></div>
                                <div id="so-away-tracker" style="display: flex; gap: 0.5rem; justify-content: center; flex: 1;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- AWAY TEAM -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; flex: 1; z-index: 1;">
                        <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${!isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${awayColor}); margin-bottom: 0.5rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                            <span style="font-family: 'Roboto', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 3px; margin-bottom: -4px;">${awayCity}</span>
                            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 4.5rem; color: #fff; margin: 0; text-align: center; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${awayMascot}</h2>
                        </div>
                        <div style="background-color: rgba(0,0,0,0.4); padding: 0.5rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); margin-top: 0.5rem;">
                            OVR: <span style="color: ${awayColor}; text-shadow: 0 0 10px ${awayColor};">${!isHome ? myOvr : oppOvr}</span>
                        </div>
                    </div>
                    
                </div>
                
                <!-- RIGHT COLUMN (30%) -->
                <div style="flex: 3; min-width: 0; display: flex; flex-direction: column; gap: 1rem;">
                    
                    <!-- EVENT LOG -->
                    <div id="event-log" style="width: 100%; flex: 1; min-height: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; overflow-y: auto; padding: 1.5rem; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; letter-spacing: 1px; color: #fff; display: flex; flex-direction: column; gap: 1rem; scroll-behavior: smooth;">
                        <div style="text-align: center; color: var(--text-muted); font-family: 'Roboto', sans-serif; font-style: italic; font-size: 1.2rem;">20:00 - Puck drop! The match is underway...</div>
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
    const timeline = SimEngine.generateMatchTimeline(gameState, myOvr, oppOvr, isHome, myTeamInfo, oppTeamInfo);
    
    // 2. Play back the events
    playMatchEvents(timeline, isHome, myTeamInfo, oppTeamInfo, currentMatch);
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
        p.innerHTML = text;
        p.style.color = color;
        p.style.marginBottom = '8px';
        p.style.padding = '8px 12px';
        p.style.borderRadius = '4px';
        p.style.fontSize = highlight ? '1.25rem' : '1.15rem';
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
    let timelineIndex = 0;
    for (let i = 0; i < timeline.length; i++) {
        let event = timeline[i];
        if (isSkipped) {
            timelineIndex = i;
            break; // If skipped, jump out of visual playback
        }
        
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
            
            enLogo.src = getTeamLogoUrl(teamData.id);
            enIndicator.style.backgroundColor = teamData.colors.primary;
            enIndicator.style.boxShadow = `0 0 10px ${teamData.colors.primary}`;
            enIndicator.style.opacity = '1';
        } else {
            enIndicator.style.opacity = '0';
        }
        
        // Brief pause to create suspense before showing the event
        await wait(1000);
        
        if (isSkipped) {
            timelineIndex = i;
            break;
        }
        
        if (event.type === 'end_period') {
            if (!event.text.includes('GAME OVER')) {
                logEvent(`--- End of ${periodEl.innerText} ---`);
                await wait(1500);
                
                let nextEvent = timeline.find(e => e.period > currentPeriod);
                if (nextEvent) {
                    currentPeriod = nextEvent.period;
                    currentSecond = currentPeriod === 6 ? 0 : 1200;
                    
                    let pName = "";
                    if (currentPeriod === 2) pName = "2ND PERIOD";
                    else if (currentPeriod === 3) pName = "3RD PERIOD";
                    else if (currentPeriod === 4) pName = "OVERTIME 1";
                    else if (currentPeriod === 5) pName = "OVERTIME 2";
                    else if (currentPeriod === 6) pName = "SHOOTOUT";
                    
                    periodEl.innerText = pName;
                    
                    if (currentPeriod === 6) {
                        document.getElementById('match-clock').style.display = 'none';
                        document.getElementById('shootout-tracker').style.display = 'flex';
                        clockEl.innerText = "SO";
                    } else {
                        clockEl.innerText = "20:00";
                    }
                    
                    logEvent(`--- Start of ${pName} ---`);
                    await wait(1500);
                }
            }
            continue;
        }
        
        // Trigger Goal Event
        logEvent(`${clockEl.innerText} - ${event.text}`, event.color, event.highlight);
        
        if (event.type === 'goal' || event.type === 'shootout_goal') {
            if (event.type === 'goal') {
                if (event.team === 'home') {
                    currentMatch.homeScore++;
                    homeScoreEl.innerText = currentMatch.homeScore;
                } else {
                    currentMatch.awayScore++;
                    awayScoreEl.innerText = currentMatch.awayScore;
                }
            }
            
            // Show Goal Animation
            let teamData = event.team === 'home' ? (isHome ? myTeam : oppTeam) : (!isHome ? myTeam : oppTeam);
            let teamNameStr = event.teamName || teamData.name;
            let teamColor = event.color || teamData.colors.primary;
            
            goalTeamName.innerText = teamNameStr.toUpperCase();
            goalTeamName.style.color = teamColor;
            goalAnim.style.borderColor = teamColor;
            goalAnim.style.boxShadow = `0 0 50px ${teamColor}`;
            goalAnim.querySelector('h1').style.color = teamColor;
            goalAnim.querySelector('h1').style.textShadow = `0 0 30px ${teamColor}`;
            
            // Show Animation
            goalAnim.style.opacity = '1';
            goalAnim.style.transform = 'translate(-50%, -50%) scale(1)';
            
            if (event.type === 'shootout_goal') {
                let trackerId = event.team === 'home' ? 'so-home-tracker' : 'so-away-tracker';
                let tracker = document.getElementById(trackerId);
                if (tracker) {
                    let mark = document.createElement('div');
                    mark.style = `width: 24px; height: 24px; border-radius: 50%; background-color: ${teamColor}; box-shadow: 0 0 10px ${teamColor}; transition: all 0.3s;`;
                    tracker.appendChild(mark);
                }
            }
            
            await wait(event.type === 'shootout_goal' ? 1500 : 2500); // Shorter pause for shootout
            
            // Hide Animation
            goalAnim.style.opacity = '0';
            goalAnim.style.transform = 'translate(-50%, -50%) scale(0.5)';
            await wait(500);
        }
        
        if (event.type === 'shootout_save') {
            let trackerId = event.team === 'home' ? 'so-home-tracker' : 'so-away-tracker';
            let tracker = document.getElementById(trackerId);
            if (tracker) {
                let mark = document.createElement('div');
                mark.style = `width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 14px; color: rgba(255,255,255,0.5); font-weight: bold;`;
                mark.innerHTML = "X";
                tracker.appendChild(mark);
            }
            await wait(1000); // Wait for suspense on save
        }
        
        if (event.type === 'shootout_winner') {
            if (event.team === 'home') {
                currentMatch.homeScore++;
                homeScoreEl.innerText = currentMatch.homeScore;
            } else {
                currentMatch.awayScore++;
                awayScoreEl.innerText = currentMatch.awayScore;
            }
            await wait(2000);
        }
    }
    
    // Fast forward to end of game if skipped or no more events
    if (isSkipped) {
        // Process remaining goals mathematically without UI delays
        for (let i = timelineIndex; i < timeline.length; i++) {
            let event = timeline[i];
            if (event.type === 'goal' || event.type === 'shootout_winner') {
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
    
    let baseReward = Math.floor(Math.random() * (70 - 60 + 1)) + 60; // 60 to 70 base
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
    
    // Playoff Economic Boosts
    if (currentMatch.isPlayoff && gameState.playoffs) {
        let series = gameState.playoffs.series.find(s => s.id === currentMatch.seriesId);
        if (series) {
            let round = series.round;
            let playoffMultiplier = 1.0;
            let isClinchingWin = (series.winner === myTeam.id);
            
            if (round === 1) {
                playoffMultiplier = isClinchingWin ? 1.5 : 1.3;
            } else if (round === 2) {
                playoffMultiplier = isClinchingWin ? 2.0 : 1.7;
            } else if (round === 3) {
                playoffMultiplier = isClinchingWin ? 2.6 : 2.3;
            } else if (round === 4) {
                playoffMultiplier = isClinchingWin ? 5.0 : 3.0;
            }
            
            finalReward = Math.floor(finalReward * playoffMultiplier);
            
            if (isClinchingWin) {
                if (round === 4) rewardType += ' - CHAMPIONSHIP BOOST!';
                else rewardType += ' - SERIES WIN BOOST!';
            } else {
                rewardType += ` - R${round} BOOST`;
            }
        }
    }
    
    let isOT = timeline.some(e => e.period > 3);
    currentMatch.played = true;
    
    // Free Agency Refresh Hook (User matches are played here)
    if (gameState.freeAgencyMarket) {
        gameState.freeAgencyMarket.nextRefreshGames--;
        if (gameState.freeAgencyMarket.nextRefreshGames <= 0) {
            if (window.refreshFreeAgencyMarket) {
                window.refreshFreeAgencyMarket();
            }
            gameState.freeAgencyMarket.nextRefreshGames = 10;
        }
    }
    
    if (currentMatch.isPlayoff) {
        processPlayoffMatchResult(currentMatch, gameState);
    } else if (currentMatch.isMemorialCup) {
        processMemorialCupMatchResult(gameState, currentMatch);
    } else {
        SimEngine.updateStandings(gameState, currentMatch.homeId, currentMatch.awayId, currentMatch.homeScore, currentMatch.awayScore, isOT);
    }
    
    // Merge match stats into permanent player stats
    if (gameState.matchStats) {
        Object.keys(gameState.matchStats).forEach(pid => {
            let pStats = gameState.matchStats[pid];
            let player = gameState.players.find(p => p.id === pid) || window.globalDraftPool.find(p => p.id === pid);
            if (player) {
                if (!player.stats) player.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                player.stats.goals = (player.stats.goals || 0) + (pStats.goals || 0);
                player.stats.assists = (player.stats.assists || 0) + (pStats.assists || 0);
                player.stats.points = (player.stats.points || 0) + (pStats.goals || 0) + (pStats.assists || 0);
                player.stats.shotsAgainst = (player.stats.shotsAgainst || 0) + (pStats.shotsAgainst || 0);
                player.stats.saves = (player.stats.saves || 0) + (pStats.saves || 0);
                player.stats.goalsAgainst = (player.stats.goalsAgainst || 0) + (pStats.goalsAgainst || 0);
            }
        });
        gameState.matchStats = {}; // clear for next match
    }
    
    // Add games played to active roster
    let activeUserPlayers = gameState.players.filter(p => p.location && (p.location.startsWith('f_') || p.location.startsWith('d_') || p.location.startsWith('g_')));
    activeUserPlayers.forEach(p => {
        if (!p.stats) p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
        p.stats.games = (p.stats.games || 0) + 1;
    });
    
    if (gameState.players) {
        let oppTeamId = isHome ? currentMatch.awayId : currentMatch.homeId;
        let cpu = gameState.players.filter(p => p.teamId === oppTeamId);
        let activeCpu = [
            ...cpu.filter(p => ['LW', 'C', 'RW'].includes(p.position)).sort((a,b) => b.overall - a.overall).slice(0, 12),
            ...cpu.filter(p => ['LD', 'RD'].includes(p.position)).sort((a,b) => b.overall - a.overall).slice(0, 6),
            ...cpu.filter(p => p.position === 'G').sort((a,b) => b.overall - a.overall).slice(0, 2)
        ];
        activeCpu.forEach(p => {
            if (!p.stats) p.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
            p.stats.games = (p.stats.games || 0) + 1;
        });
    }

    gameState.matchIndex++; // Advance index just for display purposes
    
    // Simulate remaining matches for today
    if (gameState.schedule) {
        let today = gameState.schedule[gameState.currentScheduleDayIndex];
        if (today) {
            today.matches.forEach(m => {
                if (!m.played) {
                    SimEngine.simulateBackgroundMatch(gameState, m);
                }
            });
        }
        
        // After all matches for the day are played, check if a playoff round should advance
        if (gameState.playoffs && gameState.playoffs.isActive) {
            advancePlayoffRound(gameState);
        }
        if (gameState.memorialCup && gameState.memorialCup.isActive) {
            advanceMemorialCupPhase(gameState);
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
    
    logEvent(`Match Reward: +${finalReward} <i data-lucide="coins" style="width: 16px; height: 16px; vertical-align: middle;"></i> (${rewardType})`, '#fbbf24');
    if (window.lucide) window.lucide.createIcons();
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
        
        initMainMenu();
    });
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
        if (mainContent) renderRoster(mainContent, gameState);
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
        if (mainContent) renderRoster(mainContent, gameState);
    });
}
