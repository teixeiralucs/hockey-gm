
function getTeamNameParts(fullName) {
    if (!fullName) return { city: '', mascot: '' };
    const twoWordMascots = ['Sea Dogs', 'Wheat Kings', 'Oil Kings', 'Ice Dogs', 'IceDogs', '67\'s', 'Frontenacs', 'Greyhounds', 'Steelheads', 'Firebirds', 'Battalion', 'Winterhawks', 'Silvertips', 'Americans', 'Thunderbirds', 'Cataractes', 'Saguenéens', 'Olympiques', 'Voltigeurs', 'Foreurs', 'Huskies', 'Océanic', 'Remparts', 'Drakkar', 'Tigres', 'Eagles', 'Wildcats', 'Mooseheads', 'Islanders', 'Regiment', 'Armada', 'Titan', 'Colts', 'Petes', 'Rangers', 'Spitfires', 'Knights', 'Storm', 'Spirit', 'Sting', 'Otters', 'Attack', 'Raiders', 'Tigers', 'Hitmen', 'Blades', 'Pats', 'Rebels', 'Warriors', 'Broncos', 'Hurricanes', 'Vees', 'Cougars', 'Rockets', 'Blazers', 'Chiefs', 'Royals', 'Wild', 'Giants'];
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
import { ohlTeams, whlTeams, qmjhlTeams, getTeamLogoUrl } from '../data/teams.js';
import { generateSeasonSchedule } from './schedule.js';
import { generatePlayoffs, processPlayoffMatchResult, advancePlayoffRound } from './playoffs.js';
import { processMemorialCupMatchResult, advanceMemorialCupPhase } from './memorial_cup.js';
import { initMainMenu } from './ui/setupUI.js';
import { renderDashboard as renderDashboardUI } from './ui/dashboardUI.js';
import { renderRoster, autoFillRoster } from './ui/rosterUI.js';
import { renderFreeAgencyPage } from './ui/freeAgencyUI.js';
import * as SimEngine from './engine/simulation.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Hockey GM initialized');
    
    // Attaching necessary globals for rosterUI and SetupUI
    window.getPlayerModifiers = getPlayerModifiers;
    window.getPlayerCardHTML = getPlayerCardHTML;
    window.saveGameState = saveGameState;
    window.saveGame = saveGame;
    window.loadGame = loadGame;
    window.openLoadModal = openLoadModal;
    window.openSaveModal = openSaveModal;
    window.openRosterErrorModal = openRosterErrorModal;
    window.openSellConfirmationModal = openSellConfirmationModal;
    window.openCollectionConfirmationModal = openCollectionConfirmationModal;

    Object.defineProperty(window, 'gameState', {
        get: function() { return gameState; },
        set: function(val) { gameState = val; }
    });

    // Always start at Main Menu
    initMainMenu();
});

// --- UI VIEWS ---



let currentTeam = null;
let gameState = null;

window.getActiveLeagueTeams = function(stateObj = gameState) {
    if (!stateObj) return ohlTeams;
    if (stateObj.league === 'whl') return whlTeams;
    if (stateObj.league === 'qmjhl') return qmjhlTeams;
    return ohlTeams;
};


async function initNewGame(teamIdOverride = null, leagueOverride = 'ohl') {
    const activeTeams = leagueOverride === 'whl' ? whlTeams : (leagueOverride === 'qmjhl' ? qmjhlTeams : ohlTeams);
    const targetTeam = teamIdOverride ? activeTeams.find(t => t.id === teamIdOverride) : currentTeam;
    const currentYear = new Date().getFullYear();
    
    // Calcula a 3ª quarta-feira de Setembro do ano atual
    let date = new Date(currentYear, 8, 1);
    while (date.getDay() !== 3 || Math.ceil(date.getDate() / 7) !== 3) {
        date.setDate(date.getDate() + 1);
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
        coins: 200,
        collection: [],
        notifications: [],
        totalMatches: 68,
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
    
    // Generate Schedule
    gameState.schedule = generateSeasonSchedule(activeTeams, date);
    
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
                
                // Take up to 20 players
                const cpuDrafted = availablePlayers.slice(0, 20);
                
                cpuDrafted.forEach(p => {
                    gameState.players.push({
                        ...p,
                        teamId: team.id,
                        location: 'cpu_bench',
                        stats: JSON.parse(JSON.stringify(p.stats)) // DEEP COPY
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
    
    const activePlayerIds = new Set(gameState.players.map(p => p.id));
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
function getPlayerModifiers(player) {
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

function getPlayerModifiersDetails(player) {
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

function getPlayerCardHTML(player) {
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
        if (!teamInfoModal) teamInfoModal = (ohlTeams.find(t => t.id === player.originalTeamId) || whlTeams.find(t => t.id === player.originalTeamId) || qmjhlTeams.find(t => t.id === player.originalTeamId));
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
            
            <!-- PACKS CONTAINER (1x5 Layout) -->
            <div style="grid-column: span 12; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; align-items: stretch;">
                
                <!-- STANDARD PACK -->
                <div class="booster-pack pack-standard" ${((gameState.coins||0) < 200) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('standard')"`}>
                    <div class="foil-overlay"></div>
                    <div style="z-index: 2; text-align: center;">
                        <h2 class="pack-title">Standard<br>Pack</h2>
                        <p class="pack-desc">3 Random Players</p>
                    </div>
                    <i data-lucide="package" class="pack-icon" style="color: #cbd5e1;"></i>
                    <button class="pack-btn">
                        <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">200</span>
                    </button>
                </div>

                <!-- JUMBO PACK -->
                <div class="booster-pack pack-jumbo" ${((gameState.coins||0) < 700) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('jumbo')"`}>
                    <div class="foil-overlay"></div>
                    <div style="z-index: 2; text-align: center;">
                        <h2 class="pack-title">Jumbo<br>Junior</h2>
                        <p class="pack-desc" style="color: #ddd6fe;">6 Players (15% C-Tier)</p>
                    </div>
                    <i data-lucide="layers" class="pack-icon" style="color: #ddd6fe;"></i>
                    <button class="pack-btn">
                        <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">700</span>
                    </button>
                </div>

                <!-- FORWARDS PACK -->
                <div class="booster-pack pack-forwards" ${((gameState.coins||0) < 350) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('forwards')"`}>
                    <div class="foil-overlay"></div>
                    <div style="z-index: 2; text-align: center;">
                        <h2 class="pack-title">Forwards<br>Pack</h2>
                        <p class="pack-desc" style="color: #fca5a5;">2 Forwards</p>
                    </div>
                    <i data-lucide="swords" class="pack-icon" style="color: #fca5a5;"></i>
                    <button class="pack-btn">
                        <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">350</span>
                    </button>
                </div>

                <!-- DEFENSE PACK -->
                <div class="booster-pack pack-defense" ${((gameState.coins||0) < 350) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('defense')"`}>
                    <div class="foil-overlay"></div>
                    <div style="z-index: 2; text-align: center;">
                        <h2 class="pack-title">Defense<br>Pack</h2>
                        <p class="pack-desc" style="color: #93c5fd;">2 Defensemen</p>
                    </div>
                    <i data-lucide="shield-half" class="pack-icon" style="color: #93c5fd;"></i>
                    <button class="pack-btn">
                        <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">350</span>
                    </button>
                </div>

                <!-- GOALIE PACK -->
                <div class="booster-pack pack-goalies" ${((gameState.coins||0) < 350) ? 'style="opacity: 0.5; pointer-events: none;"' : `onclick="buyPack('goalies')"`}>
                    <div class="foil-overlay"></div>
                    <div style="z-index: 2; text-align: center;">
                        <h2 class="pack-title">Goalies<br>Pack</h2>
                        <p class="pack-desc" style="color: #fcd34d;">2 Goalies</p>
                    </div>
                    <i data-lucide="hand-grab" class="pack-icon" style="color: #fcd34d;"></i>
                    <button class="pack-btn">
                        <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.7rem; letter-spacing: 1px;">350</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.buyPack = function(packType) {
    const packConfigs = {
        'standard': { cost: 200, count: 3, filters: null, cTierChance: 0 },
        'jumbo':    { cost: 700, count: 6, filters: null, cTierChance: 0.15 },
        'forwards': { cost: 350, count: 2, filters: ['LW', 'C', 'RW'], cTierChance: 0 },
        'defense':  { cost: 350, count: 2, filters: ['LD', 'RD'], cTierChance: 0 },
        'goalies':  { cost: 350, count: 2, filters: ['G'], cTierChance: 0 }
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
            existingPlayer.stats = { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }; // RESET STATS ON TRANSFER
            
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
                stats: { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }, // RESET STATS ON TRANSFER
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
                        <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${homeColor}); margin-bottom: 0.5rem;">
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
                        <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${!isHome ? myLogo : oppLogo}.png" style="width: 140px; height: 140px; object-fit: contain; filter: drop-shadow(0 0 20px ${awayColor}); margin-bottom: 0.5rem;">
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
                    const league = (data.gameState && data.gameState.league === 'whl') ? 'whl' : 'ohl';
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

export function openLoadModal() {
    window.openLoadModal = openLoadModal;
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
                    const league = (data.gameState && data.gameState.league === 'whl') ? 'whl' : 'ohl';
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
        return false;
    }
    
    const data = JSON.parse(saved);
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
let standingsCurrentTab = 'regular'; // 'regular', 'playoffs', 'memorialcup'
let standingsGroupBy = 'division'; // 'division', 'conference', 'league'

function saveGameState() {
    if (window.saveGame) window.saveGame();
}

window.switchStandingsTab = function(tab) {
    standingsCurrentTab = tab;
    const container = document.getElementById('main-content');
    if (container) renderStandingsPage(container);
};

function renderStandingsPage(container) {
    if (!gameState) return;
    
    // Auto-switch to playoffs/memorial cup if active and we are currently on regular
    if (standingsCurrentTab === 'regular') {
        if (gameState.memorialCup && gameState.memorialCup.isActive) {
            standingsCurrentTab = 'memorialcup';
        } else if (gameState.playoffs && gameState.playoffs.isActive) {
            standingsCurrentTab = 'playoffs';
        }
    }

    let hasMemorialCup = gameState.memorialCup !== null;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h1 class="title-main" style="margin: 0; text-align: left;">League Overview</h1>
            <div class="tabs" style="display: flex; background-color: rgba(0,0,0,0.3); padding: 0.3rem; border-radius: 12px; gap: 0.5rem;">
                <button class="tab-btn ${standingsCurrentTab === 'regular' ? 'active' : ''}" onclick="switchStandingsTab('regular')" style="padding: 0.5rem 1.5rem; border-radius: 8px; border: none; background: ${standingsCurrentTab === 'regular' ? 'var(--team-primary)' : 'transparent'}; color: white; cursor: pointer; font-weight: bold;">Regular Season</button>
                <button class="tab-btn ${standingsCurrentTab === 'playoffs' ? 'active' : ''}" onclick="switchStandingsTab('playoffs')" style="padding: 0.5rem 1.5rem; border-radius: 8px; border: none; background: ${standingsCurrentTab === 'playoffs' ? 'var(--team-primary)' : 'transparent'}; color: white; cursor: pointer; font-weight: bold;">Playoffs</button>
                ${hasMemorialCup ? `<button class="tab-btn ${standingsCurrentTab === 'memorialcup' ? 'active' : ''}" onclick="switchStandingsTab('memorialcup')" style="padding: 0.5rem 1.5rem; border-radius: 8px; border: none; background: ${standingsCurrentTab === 'memorialcup' ? 'var(--team-primary)' : 'transparent'}; color: white; cursor: pointer; font-weight: bold;">Memorial Cup</button>` : ''}
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
    } else if (standingsCurrentTab === 'playoffs') {
        if (typeof window.renderPlayoffsPage === 'function') {
            window.renderPlayoffsPage(content);
        }
    } else if (standingsCurrentTab === 'memorialcup') {
        if (typeof window.renderMemorialCupPage === 'function') {
            window.renderMemorialCupPage(content);
        }
    }
}

window.renderMemorialCupPage = function(container) {
    let mc = gameState.memorialCup;
    if (!mc) return;

    // Get all teams across all leagues to find their info
    const allTeams = [];
    if (typeof ohlTeams !== 'undefined') allTeams.push(...ohlTeams);
    if (typeof whlTeams !== 'undefined') allTeams.push(...whlTeams);
    if (typeof qmjhlTeams !== 'undefined') allTeams.push(...qmjhlTeams);

    // Sort standings by PTS, then W, then GD
    let sortedStandings = [...mc.standings].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.w !== a.w) return b.w - a.w;
        let gdA = a.gf - a.ga;
        let gdB = b.gf - b.ga;
        return gdB - gdA;
    });

    let html = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 class="title-main" style="margin: 0; color: #fbbf24; text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);">Memorial Cup</h1>
                <span style="background: linear-gradient(90deg, #d97706 0%, #b45309 100%); color: white; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">
                    ${mc.champion ? 'CHAMPION CROWNED' : 'PHASE: ' + mc.phase.toUpperCase()}
                </span>
            </div>
    `;

    // Champion Banner
    if (mc.champion) {
        let champTeam = allTeams.find(t => t.id === mc.champion) || { name: 'Unknown' };
        html += `
            <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; border-color: #fbbf24; text-align: center; box-shadow: 0 0 30px rgba(251,191,36,0.2);">
                <i data-lucide="trophy" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: 1rem;"></i>
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 3rem; color: #fbbf24; margin: 0;">${champTeam.name.toUpperCase()}</h2>
                <h3 style="color: var(--text-color); margin: 0; font-size: 1.5rem; opacity: 0.8;">MEMORIAL CUP CHAMPIONS</h3>
            </div>
        `;
    }

    // Round Robin Standings Table
    html += `
        <div class="dashboard-card" style="padding: 1.5rem;">
            <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; margin: 0 0 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Round Robin Standings</h2>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="color: var(--text-muted); font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <th style="padding: 0.75rem;">TEAM</th>
                        <th style="padding: 0.75rem; text-align: center;">GP</th>
                        <th style="padding: 0.75rem; text-align: center;">W</th>
                        <th style="padding: 0.75rem; text-align: center;">L</th>
                        <th style="padding: 0.75rem; text-align: center; color: white;">PTS</th>
                    </tr>
                </thead>
                <tbody>
    `;

    sortedStandings.forEach((st, idx) => {
        let teamInfo = allTeams.find(t => t.id === st.teamId) || { name: st.teamId };
        let isHost = st.teamId === mc.hostTeam;
        let badge = isHost ? `<span style="background: rgba(255,255,255,0.1); color: #fff; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.5rem;">HOST</span>` : '';
        let rowColor = (idx === 0) ? 'rgba(251, 191, 36, 0.15)' : (idx < 3 ? 'rgba(255,255,255,0.02)' : 'transparent');
        let style = `border-bottom: 1px solid rgba(255,255,255,0.05); background: ${rowColor};`;

        html += `
            <tr style="${style}">
                <td style="padding: 0.75rem; font-weight: bold;">
                    ${idx + 1}. ${teamInfo.name} ${badge}
                </td>
                <td style="padding: 0.75rem; text-align: center;">${st.gp}</td>
                <td style="padding: 0.75rem; text-align: center;">${st.w}</td>
                <td style="padding: 0.75rem; text-align: center;">${st.l}</td>
                <td style="padding: 0.75rem; text-align: center; color: #fbbf24; font-weight: bold;">${st.pts}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                * 1st place advances directly to Final. 2nd & 3rd play in Semifinal. 4th is eliminated.
            </div>
        </div>
    `;

    // Knockout Stage Bracket
    if (mc.semifinal || mc.final || mc.tiebreaker) {
        html += `
            <div style="display: flex; gap: 2rem; margin-top: 1rem; flex-wrap: wrap;">
        `;
        
        if (mc.tiebreaker) {
            let tHome = allTeams.find(t => t.id === mc.tiebreaker.homeId) || { name: mc.tiebreaker.homeId };
            let tAway = allTeams.find(t => t.id === mc.tiebreaker.awayId) || { name: mc.tiebreaker.awayId };
            let tieColor = mc.tiebreaker.played ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.1)';
            html += `
                <div class="dashboard-card" style="flex: 1; min-width: 300px; padding: 1.5rem; background: ${tieColor}; border-color: ${mc.tiebreaker.played ? 'rgba(255,255,255,0.1)' : '#fbbf24'};">
                    <h3 style="margin: 0 0 1rem 0; font-family: 'Blockletter', sans-serif; color: #fbbf24;">Tiebreaker</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>${tHome.name}</span>
                        <span style="font-weight: bold;">${mc.tiebreaker.played ? mc.tiebreaker.homeScore : '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span>${tAway.name}</span>
                        <span style="font-weight: bold;">${mc.tiebreaker.played ? mc.tiebreaker.awayScore : '-'}</span>
                    </div>
                </div>
            `;
        }

        // Semifinal
        if (mc.semifinal) {
            let sHome = allTeams.find(t => t.id === mc.semifinal.homeId) || { name: mc.semifinal.homeId };
            let sAway = allTeams.find(t => t.id === mc.semifinal.awayId) || { name: mc.semifinal.awayId };
            let semiColor = mc.semifinal.played ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.1)';
            html += `
                <div class="dashboard-card" style="flex: 1; min-width: 300px; padding: 1.5rem; background: ${semiColor}; border-color: ${mc.semifinal.played ? 'rgba(255,255,255,0.1)' : '#fbbf24'};">
                    <h3 style="margin: 0 0 1rem 0; font-family: 'Blockletter', sans-serif; color: #fbbf24;">Semifinal</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>${sHome.name}</span>
                        <span style="font-weight: bold;">${mc.semifinal.played ? mc.semifinal.homeScore : '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span>${sAway.name}</span>
                        <span style="font-weight: bold;">${mc.semifinal.played ? mc.semifinal.awayScore : '-'}</span>
                    </div>
                </div>
            `;
        }

        // Final
        if (mc.final) {
            let fHome = allTeams.find(t => t.id === mc.final.homeId) || { name: mc.final.homeId };
            let fAway = allTeams.find(t => t.id === mc.final.awayId) || { name: mc.final.awayId };
            let finalColor = mc.final.played ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.1)';
            html += `
                <div class="dashboard-card" style="flex: 1; min-width: 300px; padding: 1.5rem; background: ${finalColor}; border-color: ${mc.final.played ? 'rgba(255,255,255,0.1)' : '#fbbf24'}; box-shadow: 0 0 15px rgba(251,191,36,0.1);">
                    <h3 style="margin: 0 0 1rem 0; font-family: 'Blockletter', sans-serif; color: #fbbf24;">Championship Final</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>${fHome.name}</span>
                        <span style="font-weight: bold;">${mc.final.played ? mc.final.homeScore : '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0;">
                        <span>${fAway.name}</span>
                        <span style="font-weight: bold;">${mc.final.played ? mc.final.awayScore : '-'}</span>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
};

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
    
    let months = {};
    gameState.schedule.forEach(day => {
        let dateObj = new Date(day.date);
        let monthKey = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(day);
    });
    
    // If we are in playoffs, filter out any months that don't contain any playoff games
    if (gameState.playoffs && gameState.playoffs.isActive) {
        let playoffMonths = {};
        Object.keys(months).forEach(monthKey => {
            let hasPlayoffGames = months[monthKey].some(day => 
                day.matches.some(m => m.seriesId !== undefined)
            );
            if (hasPlayoffGames) {
                playoffMonths[monthKey] = months[monthKey];
            }
        });
        months = playoffMonths;
    }
    
    let leftPaneHtml = `<div style="display: flex; flex-direction: column; gap: 2rem;">`;
    
    Object.keys(months).forEach(monthKey => {
        leftPaneHtml += `
            <div>
                <h3 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${monthKey}</h3>
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
            let domId = '';
            
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
                domId = 'id="selected-calendar-date"';
            }
            
            // Highlight current simulation date
            let currentSimDateStr = formatDateObj(gameState.currentDate);
            if (loopDateStr === currentSimDateStr) {
                border = '1px dashed #fbbf24';
                if (!domId) domId = 'id="current-sim-date"';
            }
            
            leftPaneHtml += `
                <div ${domId} ${onclick} style="padding: 0.5rem; border-radius: 6px; background: ${bg}; color: ${color}; border: ${border}; cursor: ${cursor}; font-size: 0.9rem; transition: all 0.2s ease;" onmouseover="if('${cursor}' === 'pointer') this.style.filter='brightness(1.2)';" onmouseout="this.style.filter='none';">
                    ${i}
                </div>
            `;
        }
        
        leftPaneHtml += `</div></div>`;
    });
    
    leftPaneHtml += `</div>`;
    
    // Right pane: Matches for the selected date
    let rightPaneHtml = `<div style="display: flex; flex-direction: column; gap: 1rem;">`;
    
    let selectedDayObj = gameState.schedule.find(d => formatDateObj(d.date) === window.calendarSelectedDateStr);
    
    if (!selectedDayObj || selectedDayObj.matches.length === 0) {
        rightPaneHtml += `<div style="text-align: center; color: var(--text-muted); padding: 5rem 0; font-size: 1.2rem;">No games scheduled for this date.</div>`;
    } else {
        let displayDate = new Date(selectedDayObj.date);
        displayDate.setMinutes(displayDate.getMinutes() + displayDate.getTimezoneOffset()); // Fix timezone offset for display
        
        rightPaneHtml += `
            <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.8rem; margin: 0; color: var(--text-color);">${displayDate.toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}).toUpperCase()}</h2>
                <span style="color: var(--team-primary); font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${selectedDayObj.matches.length} Matches Scheduled</span>
            </div>
        `;
        
        selectedDayObj.matches.forEach(match => {
            const activeLeagueTeams = getActiveLeagueTeams(typeof gameState !== 'undefined' ? gameState : null);
            const homeTeam = activeLeagueTeams.find(t => t.id === match.homeId) || { name: 'TBD', id: 'tbd' };
            const awayTeam = activeLeagueTeams.find(t => t.id === match.awayId) || { name: 'TBD', id: 'tbd' };
            const homeLogoPath = getTeamLogoUrl(homeTeam.id);
            const awayLogoPath = getTeamLogoUrl(awayTeam.id);
            
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
                        <img src="${homeLogoPath}" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
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
                        <img src="${awayLogoPath}" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
                    </div>
                </div>
            `;
        });
    }
    
    rightPaneHtml += `</div>`;
    
    let html = `
        <div class="dashboard-bento-grid" style="display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: auto 1fr; gap: 1.5rem; height: 100%; padding-bottom: 0; overflow: hidden;">
            
            <!-- Header (Span 12) -->
            <div class="bento-card" style="grid-column: span 12; display: flex; flex-direction: row; justify-content: space-between; align-items: center; padding: 1rem 2rem;">
                <div style="display: flex; flex-direction: column; gap: 0.2rem; text-align: left;">
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Schedule</span>
                    <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">LEAGUE CALENDAR</h2>
                </div>
                
                <div style="background-color: rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 14px; height: 14px; background: var(--team-primary); border-radius: 4px;"></div>
                        <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Selected</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 14px; height: 14px; border: 1px dashed #fbbf24; border-radius: 4px; background: transparent;"></div>
                        <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Today</span>
                    </div>
                </div>
            </div>
            
            <!-- Left Pane: Mini Calendars (Span 3) -->
            <div class="bento-card" style="grid-column: span 3; padding: 0; overflow: hidden; height: 100%; min-height: 0;">
                <div class="custom-scrollbar" style="overflow-y: auto; height: 100%; padding: 1.5rem;">
                    ${leftPaneHtml}
                </div>
            </div>
            
            <!-- Right Pane: Match List (Span 9) -->
            <div class="bento-card" style="grid-column: span 9; padding: 0; overflow: hidden; height: 100%; min-height: 0;">
                <div class="custom-scrollbar" style="overflow-y: auto; height: 100%; padding: 1.5rem;">
                    ${rightPaneHtml}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Auto-scroll left pane to selected date
    setTimeout(() => {
        let el = document.getElementById('selected-calendar-date');
        if (!el) el = document.getElementById('current-sim-date');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 10);
}




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
        const info = getActiveLeagueTeams().find(t => t.id === s.teamId);
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
            const activeLeagueTeams = getActiveLeagueTeams(typeof localGameState !== 'undefined' ? localGameState : null);
            const teamInfo = activeLeagueTeams.find(t => t.id === s.teamId);
            const logoFile = teamInfo.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-');
            const isActiveTeam = teamInfo.id === currentTeam.id;
            
            // Seed Calculation based on Clinch algorithm
            const seedLabel = s.clinch ? s.clinch : '';
            
            // Reutilizando a classe team-row-active e td team-cell do Dashboard para consistência
            tableHtml += `
                <tr class="${isActiveTeam ? 'team-row-active' : ''}">
                    <td>${idx + 1}</td>
                    <td class="team-cell">
                        <img src="assets/logos/${leagueFolder}/${logoFile}.png" alt="logo" style="width: 32px; height: 32px;">
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
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You cannot start a match! Your roster is missing players. Ensure all <strong style="color: #fff;">20 regular positions</strong> are filled before the puck drops.</p>
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
    
    let topScorer = [...allPlayers].sort((a, b) => (b.stats.goals) - (a.stats.goals))[0];
    awards.topScorerId = topScorer ? topScorer.id : null;
    
    let mop = [...allPlayers].sort((a, b) => (b.stats.points) - (a.stats.points) || b.overall - a.overall)[0];
    awards.mopId = mop ? mop.id : null;
    
    let topRw = [...allPlayers].filter(p => p.position === 'RW').sort((a, b) => (b.stats.goals) - (a.stats.goals))[0];
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

window.startAwardsCeremony = function() {
    if (!gameState) return;
    const awards = computeSeasonAwards();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'ceremony-overlay';
    
    // Helper for Player Cards
    const createPlayerCard = (id, title, subtitle, statLabel, statKey, color, awardKey) => {
        let p = null;
        if (gameState.players) p = gameState.players.find(x => x.id === awards[awardKey]);
        if (!p && window.globalDraftPool) p = window.globalDraftPool.find(x => x.id === awards[awardKey]);
        if (!p) return '';
        let statValue = p.stats ? p.stats[statKey] : 0;
        
        let faceUrl = 'assets/default-player.svg';
        if (p.id && p.id.includes('_')) {
            const playerLeague = qmjhlTeams.some(t => t.id === p.originalTeamId) ? 'lhjmq' : (whlTeams.some(t => t.id === p.originalTeamId) ? 'whl' : 'ohl');
            faceUrl = p.photo || `https://assets.leaguestat.com/${playerLeague}/240x240/${p.id.split('_')[1]}.jpg`;
        }
        
        return `
        <div class="award-card" id="award-${id}">
            <h2 style="color: ${color}; font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 2px;">${title}</h2>
            <p style="color: var(--text-muted); font-size: 1.2rem; margin-bottom: 2rem;">${subtitle}</p>
            <div class="player-card" style="width: 250px; margin: 0 auto; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); padding: 1.5rem; border-radius: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.5);">
                <img src="${faceUrl}" onerror="this.src='assets/default-player.svg'" style="width: 150px; height: 150px; object-fit: cover; border-radius: 50%; border: 3px solid ${color};">
                <h3 style="color: #fff; font-family: 'Blockletter', sans-serif; font-size: 1.5rem; margin-top: 1rem;">${p.name}</h3>
                <p style="color: ${color}; font-weight: bold; font-size: 1.2rem;">${statValue} ${statLabel}</p>
            </div>
        </div>`;
    };

    // Helper for Team Cards
    const createTeamCard = (id, title, subtitle, color, awardKey, isFinal) => {
        const t = getActiveLeagueTeams().find(x => x.id === awards[awardKey]);
        if (!t) return '';
        const logo = t.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/ /g, '-');
        
        let extraBtn = isFinal ? `
            <button class="btn" id="ceremony-finish-btn" style="margin-top: 3rem; padding: 1.2rem 3rem; font-size: 1.5rem; font-family: 'Blockletter', sans-serif; background: #fbbf24; color: #000; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 10px 25px rgba(251,191,36,0.5); transition: transform 0.2s ease;">
                PROCEED TO HALL OF FAME
            </button>
        ` : '';
        
        // Use a generic shadow color string by parsing the hex or just using color
        return `
        <div class="award-card ${isFinal ? 'champion-reveal' : ''}" id="award-${id}">
            <h2 style="color: ${color}; font-family: 'Blockletter', sans-serif; font-size: 3rem; letter-spacing: 3px;">${title}</h2>
            <p style="color: var(--text-muted); font-size: 1.5rem; margin-bottom: 2.5rem;">${subtitle}</p>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); padding: 3rem; border-radius: 50%; width: 300px; height: 300px; border: 4px solid ${color}; box-shadow: inset 0 0 50px ${color};">
                <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${logo}.png" onerror="this.src='assets/logos/hockey_gm_logo.png'" style="width: 200px; height: 200px; object-fit: contain;">
            </div>
            <h1 style="color: #fff; font-family: 'Blockletter', sans-serif; font-size: 3.5rem; margin-top: 2rem; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${t.name.toUpperCase()}</h1>
            ${extraBtn}
        </div>`;
    };

    let html = '';
    html += createPlayerCard('def', 'Max Kaminsky Trophy', 'Defenceman of the Year', 'PTS', 'points', '#93c5fd', 'topDefencemanId');
    html += createPlayerCard('goal', 'Jim Rutherford Trophy', 'Goaltender of the Year', 'SVs', 'saves', '#ef4444', 'topGoalieId');
    html += createPlayerCard('rw', 'Jim Mahon Trophy', 'Top Scoring Right Winger', 'Gols', 'goals', '#a855f7', 'topRwId');
    html += createPlayerCard('scorer', 'Eddie Powers Trophy', 'Top Scorer', 'Gols', 'goals', '#3b82f6', 'topScorerId');
    html += createPlayerCard('mvp', 'Red Tilson Trophy', 'Most Outstanding Player', 'PTS', 'points', '#fbbf24', 'mopId');
    html += createPlayerCard('pmvp', 'Wayne Gretzky 99 Award', 'Playoffs MVP', 'PTS', 'points', '#f59e0b', 'playoffMvpId');
    
    html += createTeamCard('ga', 'Dave Pinkney Trophy', 'Lowest Goals-Against', '#ef4444', 'lowestGaTeamId', false);
    html += createTeamCard('reg', 'Hamilton Spectator Trophy', 'Regular Season Winner', '#3b82f6', 'regularSeasonWinnerId', false);
    html += createTeamCard('champ', 'J. Ross Robertson Cup', 'OHL Champions', '#fbbf24', 'playoffsWinnerId', true);
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    // Animation Sequence
    const cards = Array.from(overlay.querySelectorAll('.award-card'));
    let currentIndex = 0;
    
    function showNextCard() {
        if (currentIndex > 0 && currentIndex <= cards.length) {
            let prevCard = cards[currentIndex - 1];
            if (prevCard) {
                prevCard.classList.remove('show');
                prevCard.classList.add('fade-out');
            }
        }
        
        if (currentIndex < cards.length) {
            let currentCard = cards[currentIndex];
            setTimeout(() => {
                currentCard.classList.add('show');
            }, 600); // Wait for previous to fade out
            
            if (currentIndex < cards.length - 1) {
                // Not the last card, auto-advance after 3.5s
                setTimeout(() => {
                    currentIndex++;
                    showNextCard();
                }, 4000);
            } else {
                // Last card (Champion). Bind click to finish button.
                setTimeout(() => {
                    let btn = document.getElementById('ceremony-finish-btn');
                    if (btn) {
                        btn.addEventListener('click', () => {
                            overlay.style.opacity = '0';
                            setTimeout(() => {
                                overlay.remove();
                                advanceSeason(awards);
                            }, 500);
                        });
                    }
                }, 1000);
            }
        }
    }
    
    // Start sequence after initial modal fade in
    setTimeout(() => {
        showNextCard();
    }, 1000);
}

window.advanceSeason = function(precomputedAwards) {
    if (!gameState) return;

    // Check Memorial Cup Winner logic for FPHL promotion
    if (gameState.memorialCup && gameState.memorialCup.champion === currentTeam.id) {
        // Clear it so it doesn't trigger again immediately if they stay
        gameState.memorialCup.champion = null;
        
        const modalHTML = `
            <div id="fphl-promo-modal" class="modal-overlay">
                <div class="modal-content" style="border-color: #fbbf24; text-align: center; max-width: 600px;">
                    <i data-lucide="crown" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: 1rem;"></i>
                    <h2 style="color: #fbbf24; font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem;">MEMORIAL CUP CHAMPIONS!</h2>
                    <p style="color: var(--text-color); margin-bottom: 1.5rem; line-height: 1.5; font-size: 1.1rem;">
                        Congratulations! Your incredible run has attracted the attention of the <strong style="color:#fbbf24;">Federal Prospects Hockey League (FPHL)</strong>.
                        <br><br>
                        You are invited to step up to the pros and take over a new C-Tier franchise. Will you accept the challenge and move up a tier?
                    </p>
                    <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                        <button class="btn" id="btn-refuse-promo" style="background: rgba(255,255,255,0.1); color: white;">Stay in CHL</button>
                        <button class="btn" id="btn-accept-promo" style="background: linear-gradient(90deg, #d97706 0%, #b45309 100%); color: white; font-weight: bold; padding: 1rem 2rem;">JOIN THE FPHL</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        if (window.lucide) window.lucide.createIcons();

        document.getElementById('btn-refuse-promo').addEventListener('click', () => {
            document.getElementById('fphl-promo-modal').remove();
            // Continue advancing season in CHL
            advanceSeasonLogic(precomputedAwards);
        });

        document.getElementById('btn-accept-promo').addEventListener('click', () => {
            document.getElementById('fphl-promo-modal').remove();
            alert("FPHL Franchise Selection Module not yet loaded. (Placeholder for next phase!)");
            // Placeholder: for now we just continue in CHL until FPHL roster/teams are built.
            advanceSeasonLogic(precomputedAwards);
        });
        return;
    }

    advanceSeasonLogic(precomputedAwards);
};

function advanceSeasonLogic(precomputedAwards) {
    
    // Compute Awards and save history
    let awards = precomputedAwards || computeSeasonAwards();
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
        } else {
            // Player stays in the league (User or CPU) -> Gets a 5% development buff stack
            p.ageBoosts = (p.ageBoosts || 0) + 1;
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
    }
    
    // Switch to Hall of Fame immediately without annoying alert
    
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
    
    gameState.standings = getActiveLeagueTeams().map(team => ({
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
    
    const currentLeagueTeams = gameState.league === 'whl' ? whlTeams : (gameState.league === 'qmjhl' ? qmjhlTeams : ohlTeams);
    gameState.schedule = generateSeasonSchedule(currentLeagueTeams, newDate);
    
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
    
    // Select all badges since we have them in the sidebar and multiple topbars
    const badges = document.querySelectorAll('#notification-badge');
    badges.forEach(badge => {
        if (unreadCount > 0) {
            badge.style.display = 'block';
            badge.innerText = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    });
}

window.openNotificationsModal = function() {
    if (!gameState) return;
    
    // Remove existing modal to prevent duplicate IDs breaking the close button
    const existingModal = document.getElementById('notifications-modal');
    if (existingModal) existingModal.remove();
    
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
        <div class="dashboard-bento-grid" style="display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: auto 1fr; gap: 1.5rem; height: 100%; padding-bottom: 0;">
            
            <!-- BENTO 1: HEADER -->
            <div class="bento-card" style="grid-column: span 12; display: flex; justify-content: space-between; flex-direction: row; align-items: center; padding: 1rem 2rem;">
                <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Sticker Album</span>
                    <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">COLLECTION</h2>
                </div>
                
                <div style="background-color: rgba(255,255,255,0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 0.6rem;">
                    <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">TOTAL COLLECTED</span>
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; line-height: 1;">${gameState.collection ? gameState.collection.length : 0}</span>
                </div>
            </div>
    `;

    // LEFT COLUMN: TEAM SELECTOR (2x10)
    html += `
            <div style="grid-column: span 3; display: flex; flex-direction: column; gap: 1.5rem; height: 100%; min-height: 0;">
                <div class="bento-card" style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1; overflow-y: auto; min-height: 0;">
    `;
    
    window.collectionState = window.collectionState || 'leagues';
    
    const leagues = [
        { id: 'ohl', name: 'OHL', logo: 'assets/ohl-logo.svg', color: '#047ac4', teams: ohlTeams },
        { id: 'whl', name: 'WHL', logo: 'assets/whl-logo.svg', color: '#e2373f', teams: whlTeams },
        { id: 'qmjhl', name: 'QMJHL', logo: 'assets/qmjhl-logo.svg', color: '#f87171', teams: qmjhlTeams }
    ];

    if (window.collectionState === 'leagues') {
        html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; margin: 0; color: #fff;">LEAGUES</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem;">
        `;
        leagues.forEach(league => {
            html += `
                        <div onclick="window.collectionState='teams'; window.collectionExpandedLeague='${league.id}'; window.currentCollectionTeamId='${league.teams[0].id}'; renderCollectionPage(document.getElementById('main-content'))" 
                             style="position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; border: 2px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); opacity: 0.8;"
                             onmouseover="this.style.opacity='1'; this.style.borderColor='${league.color}'; this.style.background='rgba(255,255,255,0.05)';" 
                             onmouseout="this.style.opacity='0.8'; this.style.borderColor='rgba(255,255,255,0.05)'; this.style.background='rgba(0,0,0,0.2)';">
                            <img src="${league.logo}" alt="${league.name}" style="width: 50%; height: 50%; object-fit: contain;">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff;">${league.name}</span>
                        </div>
            `;
        });
        html += `
                    </div>
                </div>
            </div>
        `;
    } else {
        const activeLeague = leagues.find(l => l.id === window.collectionExpandedLeague) || leagues[0];
        
        // Set default team if none selected
        if (!window.currentCollectionTeamId || !activeLeague.teams.some(t => t.id === window.currentCollectionTeamId)) {
            window.currentCollectionTeamId = activeLeague.teams[0].id;
        }

        html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1rem;">
                        <h2 style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; margin: 0; color: #fff;">${activeLeague.name} FRANCHISES</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; padding-bottom: 1rem;">
                        
                        <!-- BACK BUTTON -->
                        <div onclick="window.collectionState='leagues'; renderCollectionPage(document.getElementById('main-content'))" 
                             style="position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);"
                             onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                            <i data-lucide="arrow-left" style="color: #fff; width: 24px; height: 24px;"></i>
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #fff;">VOLTAR</span>
                        </div>
        `;
        
        activeLeague.teams.forEach(team => {
            const loopLeagueFolder = activeLeague.id;
            const logoFile = team.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-');
            const isSelected = window.currentCollectionTeamId === team.id;
            
            const isCompleted = (gameState.completedCollections || []).includes(team.id);
            const borderStyle = isSelected ? `2px solid ${team.colors.primary}` : '2px solid rgba(255,255,255,0.05)';
            const bgStyle = isSelected ? `rgba(255,255,255,0.1)` : 'rgba(0,0,0,0.2)';
            const opacityStyle = isSelected ? '1' : '0.6';
            
            html += `
                            <div onclick="window.currentCollectionTeamId='${team.id}'; renderCollectionPage(document.getElementById('main-content'))" 
                                 style="position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; border: ${borderStyle}; background: ${bgStyle}; opacity: ${opacityStyle};"
                                 onmouseover="this.style.opacity='1'" onmouseout="if(window.currentCollectionTeamId!=='${team.id}') this.style.opacity='0.6'">
                                <img src="assets/logos/${loopLeagueFolder}/${logoFile}.png" alt="${team.name}" style="width: 70%; height: 70%; object-fit: contain;">
                                ${isCompleted ? `<div style="position: absolute; top: -5px; right: -5px; background: #fbbf24; color: #000; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>` : ''}
                            </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    }

    // RIGHT COLUMN: CARDS (Span 9)
    if (window.collectionState === 'leagues') {
        html += `
            <div style="grid-column: span 9; display: flex; flex-direction: column; gap: 1.5rem; height: 100%; min-height: 0;">
                <div class="bento-card" style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1; align-items: center; justify-content: center; min-height: 0;">
                    <i data-lucide="library" style="color: var(--text-muted); width: 64px; height: 64px; opacity: 0.5; margin-bottom: 1rem;"></i>
                    <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; color: var(--text-muted); margin: 0;">SELECIONE UMA LIGA</h2>
                    <span style="color: var(--text-muted); font-size: 1rem; margin-top: 0.5rem;">Escolha uma das ligas à esquerda para explorar os elencos.</span>
                </div>
            </div>
        </div>
        `;
    } else {
        const allTeamsForRight = [...ohlTeams, ...whlTeams, ...qmjhlTeams];
        const selectedTeam = allTeamsForRight.find(t => t.id === window.currentCollectionTeamId);
        let originalRoster = window.globalDraftPool.filter(p => p.originalTeamId === selectedTeam.id);
        
        // Sort roster by overall ascending (lowest to highest)
        originalRoster.sort((a, b) => a.overall - b.overall);
        
        let collectedCount = 0;
        const cardsHtml = originalRoster.map(player => {
            const isCollected = (gameState.collection || []).some(c => c.id === player.id);
            if (isCollected) collectedCount++;
            
            let logoUrl = player.photo || 'assets/default-player.svg';
            
            const tierColors = { 'gold': '#fbbf24', 'silver': '#94a3b8', 'bronze': '#b45309', 'c-tier': '#94a3b8' };
            const bColor = tierColors[player.tier?.toLowerCase()] || '#3b82f6';
            
            const nameParts = player.name.split(' ');
            const shortName = nameParts.length > 1 ? `${nameParts[0][0]}. ${nameParts[nameParts.length - 1]}` : player.name;
            
            const filterStyle = isCollected ? '' : 'filter: grayscale(100%) opacity(0.4);';
            const clickHandler = isCollected ? `onclick="openPlayerCardModal('${player.id}')"` : '';
            const cursorStyle = isCollected ? 'cursor: pointer;' : 'cursor: default;';
            const hoverEffect = isCollected ? 'onmouseover="this.style.transform=\\\'scale(1.05)\\\'" onmouseout="this.style.transform=\\\'scale(1)\\\'"' : '';
            
            return `
                <div ${clickHandler} style="position: relative; width: 100%; aspect-ratio: 1; border: 3px solid ${bColor}; padding: 0; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; transition: transform 0.2s; ${filterStyle} ${cursorStyle}" ${hoverEffect}>
                    <img src="${logoUrl}" alt="${player.name}" onerror="this.src='assets/default-player.svg'" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; clip-path: circle(50%); display: block; margin: 0; padding: 0;">
                    <div style="position: absolute; top: 0px; right: 0px; background: ${bColor}; color: #000; font-size: 1rem; font-weight: bold; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #0f172a; font-family: 'Blockletter', sans-serif;">${Math.round(player.overall)}</div>
                    <div style="position: absolute; bottom: -5px; background: #0f172a; color: #fff; font-size: 0.9rem; padding: 2px 10px; border-radius: 6px; white-space: nowrap; border: 2px solid ${bColor}; font-weight: 600; line-height: 1; text-transform: uppercase;">${shortName}</div>
                    ${!isCollected ? `
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 3;">
                            <i data-lucide="lock" style="width: 32px; height: 32px; color: #fff; opacity: 0.8;"></i>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        html += `
                <div style="grid-column: span 9; display: flex; flex-direction: column; gap: 1.5rem; height: 100%; min-height: 0;">
                    <div class="bento-card" style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1; overflow-y: auto; min-height: 0;">
                        
                        <!-- ALBUM HEADER -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 2rem;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <img src="assets/logos/${qmjhlTeams.some(t => t.id === selectedTeam.id) ? 'qmjhl' : (whlTeams.some(t => t.id === selectedTeam.id) ? 'whl' : 'ohl')}/${selectedTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-')}.png" style="height: 40px; object-fit: contain;">
                                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2rem; margin: 0; color: ${selectedTeam.colors.primary};">${selectedTeam.name}</h2>
                            </div>
                            <div style="background-color: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); font-weight: bold; color: var(--text-color);">
                                ${collectedCount} / ${originalRoster.length} COLLECTED
                            </div>
                        </div>
                        
                        <!-- ALBUM GRID (6 cols) -->
                        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 2rem 1.5rem; padding: 1rem;">
                            ${cardsHtml}
                        </div>
                        
                    </div>
                </div>
            </div>
        `;
    }

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
    const team = getActiveLeagueTeams().find(t => t.id === teamId);
    
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
        let champTeam = getActiveLeagueTeams().find(t => t.id === p.champion);
        html += `
            <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; border-color: #fbbf24; text-align: center;">
                <i data-lucide="award" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: 1rem;"></i>
                <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${champTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-')}.png" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(0 0 20px #fbbf24); margin-bottom: 1.5rem;">
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
        const t1 = getActiveLeagueTeams().find(t => t.id === s.highSeedId) || { name: 'TBD', id: 'tbd' };
        const t2 = getActiveLeagueTeams().find(t => t.id === s.lowSeedId) || { name: 'TBD', id: 'tbd' };
        
        const logo1 = t1.id !== 'tbd' ? t1.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        const logo2 = t2.id !== 'tbd' ? t2.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-') : 'placeholder';
        
        const winner = s.winner;
        
        return `
            <div class="matchup-card" onclick="openSeriesModal('${s.id}')" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div class="matchup-row ${winner === t1.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t1.id !== 'tbd' ? `<img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${logo1}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${getTeamNameParts(t1.name).mascot}</span>
                    </div>
                    <span>${s.highSeedWins}</span>
                </div>
                <div class="matchup-row ${winner === t2.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t2.id !== 'tbd' ? `<img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : 'ohl')) : 'ohl')}/${logo2}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${getTeamNameParts(t2.name).mascot}</span>
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
    
    let matches = [];
    if (gameState.schedule) {
        gameState.schedule.forEach(day => {
            if (!day.matches) return;
            day.matches.forEach(m => {
                if (m.seriesId === seriesId) {
                    matches.push({ ...m, gameDate: day.date });
                }
            });
        });
    }
    
    let matchesHtml = matches.map((m, idx) => {
        let home = getActiveLeagueTeams().find(t => t.id === m.homeId) || { name: 'TBD', id: 'tbd' };
        let away = getActiveLeagueTeams().find(t => t.id === m.awayId) || { name: 'TBD', id: 'tbd' };
        
        let homeLogo = home.id !== 'tbd' ? home.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').split(' ').join('-') : 'placeholder';
        let awayLogo = away.id !== 'tbd' ? away.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').split(' ').join('-') : 'placeholder';
        
        let dateObj = m.gameDate ? new Date(m.gameDate) : null;
        let dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : 'TBA';
        let statusText = m.played ? (m.isOT ? 'FINAL (OT)' : 'FINAL') : dateStr;
        
        let awayOpacity = (m.played && m.awayScore < m.homeScore) ? '0.4' : '1';
        let homeOpacity = (m.played && m.homeScore < m.awayScore) ? '0.4' : '1';
        
        let awayColor = away.colors ? away.colors.primary : '#333';
        let homeColor = home.colors ? home.colors.primary : '#333';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.8rem; background: linear-gradient(90deg, ${awayColor}40 0%, rgba(40,40,45,0.7) 50%, ${homeColor}40 100%); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; backdrop-filter: blur(10px); position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                
                <span style="font-family: 'Blockletter', sans-serif; font-size: 1.3rem; width: 70px; color: #fff; padding-left: 0.5rem;">GAME ${m.gameNum || (idx + 1)}</span>
                
                <div style="flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 0.8rem; opacity: ${awayOpacity};">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff;">${getTeamNameParts(away.name).mascot}</span>
                    <img src="assets/logos/${leagueFolder}/${awayLogo}.png" style="width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin-left: 0.5rem;">${m.played ? m.awayScore : '-'}</span>
                </div>

                <div style="background: rgba(0,0,0,0.4); padding: 0.3rem 0.6rem; border-radius: 6px; margin: 0 1.5rem; min-width: 90px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 0.95rem; color: #a1a1aa; letter-spacing: 1px;">${statusText}</span>
                </div>

                <div style="flex: 1; display: flex; align-items: center; justify-content: flex-start; gap: 0.8rem; opacity: ${homeOpacity};">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; color: #fff; margin-right: 0.5rem;">${m.played ? m.homeScore : '-'}</span>
                    <img src="assets/logos/${leagueFolder}/${homeLogo}.png" style="width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    <span style="font-family: 'Blockletter', sans-serif; font-size: 1.1rem; color: #fff;">${getTeamNameParts(home.name).mascot}</span>
                </div>
                
            </div>
        `;
    }).join('');
    
    if (matches.length === 0) {
        matchesHtml = `<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No games scheduled yet.</p>`;
    }
    
    const high = getActiveLeagueTeams().find(t => t.id === series.highSeedId) || { name: 'TBD' };
    const low = getActiveLeagueTeams().find(t => t.id === series.lowSeedId) || { name: 'TBD' };

    let modalHTML = `
        <div id="series-modal" class="modal-overlay" style="display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);" onclick="this.remove()">
            <div class="dashboard-card" style="width: 650px; max-width: 95vw; background: rgba(20, 25, 35, 0.85); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 2.5rem; position: relative;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('series-modal').remove()" style="position: absolute; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; transition: all 0.2s;"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
                
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.2rem; margin-top: 0; margin-bottom: 0.2rem; text-align: center; letter-spacing: 2px;">SERIES MATCHUPS</h2>
                <h3 style="text-align: center; color: var(--text-muted); font-size: 1.2rem; font-family: 'Blockletter', sans-serif; letter-spacing: 2px; margin-bottom: 2.5rem; text-transform: uppercase;">${high.name} <span style="opacity: 0.5;">VS</span> ${low.name}</h3>
                
                <div style="display: flex; flex-direction: column; max-height: 500px; overflow-y: auto; padding-right: 10px;">
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
            <div class="bento-card bento-header" style="justify-content: space-between; flex-direction: row; align-items: center; padding: 1rem 2rem; margin-bottom: 2rem; display: flex;">
                <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Official History & OHL Awards</span>
                    <h2 style="margin: 0; font-size: 1.8rem; font-weight: 800; font-family: 'Blockletter', sans-serif; color: var(--text-color);">HALL OF FAME</h2>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div id="notification-bell" onclick="openNotificationsModal()" style="position: relative; cursor: pointer; color: #fff; transition: all 0.2s ease; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 12px;">
                        <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
                        <span id="notification-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; font-size: 0.8rem; font-weight: bold; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; box-shadow: 0 0 5px rgba(0,0,0,0.5);">0</span>
                    </div>
                </div>
            </div>
    `;
    
    if (!gameState.history || gameState.history.length === 0) {
        html += `
            <div class="bento-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6rem 2rem; text-align: center; margin-top: 1rem;">
                <i data-lucide="history" style="width: 80px; height: 80px; color: #fbbf24; margin-bottom: 1.5rem; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));"></i>
                <h2 style="font-family: 'Blockletter', sans-serif; font-size: 2.5rem; color: #fbbf24; letter-spacing: 2px; margin: 0 0 0.5rem 0; text-transform: uppercase;">AWAITING LEGENDS</h2>
                <p style="color: var(--text-muted); font-size: 1.2rem; max-width: 500px; margin: 0 0 2.5rem 0; line-height: 1.5;">No seasons have been completed yet.<br>Play through the regular season and conquer the playoffs to etch your name in the Hall of Fame!</p>
                <div style="font-family: 'Blockletter', sans-serif; font-size: 1.2rem; color: #111827; background: #fbbf24; padding: 0.8rem 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3); text-transform: uppercase; letter-spacing: 1px;">WIN CHAMPIONSHIPS TO UNLOCK</div>
            </div>
        </div>`;
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
        let teamInfo = null;
        if (p.originalTeamId) {
            teamInfo = ohlTeams.find(t => t.id === p.originalTeamId);
            if (!teamInfo) teamInfo = (ohlTeams.find(t => t.id === p.originalTeamId) || whlTeams.find(t => t.id === p.originalTeamId) || qmjhlTeams.find(t => t.id === p.originalTeamId));
        }
        const logoPath = getTeamLogoUrl(p.originalTeamId);
        const playerLeague = qmjhlTeams.some(t => t.id === p.originalTeamId) ? 'lhjmq' : (whlTeams.some(t => t.id === p.originalTeamId) ? 'whl' : 'ohl');
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.2); display: flex; align-items: center; gap: 1rem;">
                <img src="${p.photo || `https://assets.leaguestat.com/${playerLeague}/240x240/${p.id.split('_')[1]}.jpg`}" onerror="this.src='assets/default-player.svg'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; border: 2px solid #fbbf24; background-color: #000;">
                <div>
                    <div style="color: #fbbf24; font-family: 'Blockletter', sans-serif; font-size: 1.1rem; margin-bottom: 0.2rem;">${title}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.2rem;">${subtitle}</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${logoPath ? `<img src="${logoPath}" style="height: 16px; object-fit: contain;">` : ''}
                        <span style="color: #fff; font-weight: bold; font-size: 1rem;">${p.name}</span>
                    </div>
                </div>
            </div>
        `;
    };
    
    const renderTeamAward = (title, subtitle, teamId) => {
        const t = getActiveLeagueTeams().find(x => x.id === teamId);
        if (!t) return '';
        const logoPath = getTeamLogoUrl(teamId);
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.5); display: flex; align-items: center; gap: 1rem; flex: 1;">
                <img src="${logoPath}" style="width: 70px; height: 70px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));">
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
