import { ohlTeams, whlTeams } from '../../data/teams.js';

export function transitionTo(nextFunc) {
    const container = document.querySelector('#app > div');
    if (container) {
        container.classList.add('page-exit');
        setTimeout(() => {
            nextFunc();
        }, 300); // 300ms matches pageFadeOut animation
    } else {
        nextFunc();
    }
}

export function initMainMenu() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="page-enter" style="min-height: 100vh; background: linear-gradient(135deg, rgba(11, 17, 33, 0.95) 0%, rgba(21, 30, 50, 0.95) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
            
            <!-- Estilização de Fundo -->
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 60%); pointer-events: none;"></div>
            
            <!-- Title Section -->
            <div style="text-align: center; margin-bottom: 4rem; z-index: 10;">
                <h1 class="title-main" style="font-size: 5rem; letter-spacing: 4px; text-shadow: 0 10px 30px rgba(0,0,0,0.5);">HOCKEY GM</h1>
                <p class="subtitle" style="font-size: 1.2rem; color: var(--text-muted);">Lead your franchise to glory.</p>
            </div>
            
            <!-- Main Buttons (Row) -->
            <div style="display: flex; gap: 2rem; margin-bottom: 5rem; z-index: 10;">
                
                <!-- Start Game -->
                <div class="linear-card" id="btn-start-game" style="--card-color-light: #60a5fa; --card-color-dark: #3b82f6; width: 240px; height: 320px;">
                    <div class="linear-card-glow"></div>
                    <i data-lucide="play" class="linear-card-icon" style="width: 48px; height: 48px;"></i>
                    <h3 class="linear-card-title">START</h3>
                    <p class="linear-card-subtitle">New Franchise</p>
                </div>
                
                <!-- Load Game -->
                <div class="linear-card" id="btn-load-game" style="--card-color-light: #34d399; --card-color-dark: #10b981; width: 240px; height: 320px;">
                    <div class="linear-card-glow"></div>
                    <i data-lucide="save" class="linear-card-icon" style="width: 48px; height: 48px;"></i>
                    <h3 class="linear-card-title">LOAD</h3>
                    <p class="linear-card-subtitle">Resume Career</p>
                </div>
                
            </div>
            
            <!-- Footer Buttons -->
            <div style="display: flex; gap: 1.5rem; z-index: 10; position: absolute; bottom: 2rem;">
                <button class="btn btn-sm" id="btn-how-to-play" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
                    <i data-lucide="help-circle" style="width: 16px; height: 16px;"></i> How To Play
                </button>
                <button class="btn btn-sm" id="btn-report-bug" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
                    <i data-lucide="bug" style="width: 16px; height: 16px;"></i> Report a Bug
                </button>
                <button class="btn btn-sm" id="btn-settings" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
                    <i data-lucide="settings" style="width: 16px; height: 16px;"></i> Settings
                </button>
                <button class="btn btn-sm" id="btn-credits" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
                    <i data-lucide="info" style="width: 16px; height: 16px;"></i> Credits
                </button>
            </div>
        </div>
    `;

    document.getElementById('btn-start-game').addEventListener('click', () => {
        transitionTo(initLeagueSelection);
    });

    document.getElementById('btn-load-game').addEventListener('click', () => {
        if (typeof window.openLoadModal === 'function') {
            window.openLoadModal();
        } else {
            console.error("openLoadModal is not available.");
        }
    });

    // Sub-buttons placeholders
    ['btn-how-to-play', 'btn-report-bug', 'btn-settings', 'btn-credits'].forEach(btnId => {
        document.getElementById(btnId).addEventListener('click', () => {
            alert("This feature will be available in the upcoming Alpha 0.2 iterations!");
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

export function initLeagueSelection() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="page-enter" style="min-height: 100vh; background: linear-gradient(135deg, rgba(11, 17, 33, 0.95) 0%, rgba(21, 30, 50, 0.95) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
            
            <button id="btn-back-main" class="btn btn-sm" style="position: absolute; top: 2rem; left: 2rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; z-index: 50;">
                <i data-lucide="arrow-left" style="width: 18px; height: 18px;"></i> Back
            </button>

            <div style="text-align: center; margin-bottom: 3rem; z-index: 10;">
                <h2 style="font-size: 2.5rem; letter-spacing: 2px; color: #fff; font-family: 'Blockletter', sans-serif;">CHOOSE A LEAGUE</h2>
                <p style="color: var(--primary-color); font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Hockey Associations</p>
            </div>
            
            <div style="display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; z-index: 10; max-width: 1000px;">
                
                <!-- WHL (Playable) -->
                <div class="linear-card" id="league-whl" style="--card-color-light: #e2373f; --card-color-dark: #000000; width: 260px; height: 360px;">
                    <div class="linear-card-glow"></div>
                    <img src="assets/whl-logo.svg" alt="WHL Logo" style="width: 100px; height: 100px; margin-bottom: 1.5rem; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
                    <h3 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #fff; position: relative; z-index: 2; font-family: 'Blockletter', sans-serif; letter-spacing: 2px;">WHL</h3>
                    <p style="color: var(--text-muted); position: relative; z-index: 2;">Western Hockey League</p>
                </div>
                
                <!-- OHL (Playable) -->
                <div class="linear-card" id="league-ohl" style="--card-color-light: #60a5fa; --card-color-dark: #3b82f6; width: 260px; height: 360px;">
                    <div class="linear-card-glow"></div>
                    <img src="assets/ohl-logo.svg" alt="OHL Logo" style="width: 100px; height: 100px; margin-bottom: 1.5rem; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
                    <h3 style="font-size: 2.5rem; color: #fff; font-family: 'Blockletter', sans-serif; letter-spacing: 2px; position: relative; z-index: 2;">OHL</h3>
                    <p style="color: var(--text-muted); position: relative; z-index: 2;">Ontario Hockey League</p>
                </div>
                
                <!-- QMJHL (Locked) -->
                <div class="linear-card" style="--card-color-light: #f87171; --card-color-dark: #dc2626; width: 260px; height: 360px; opacity: 0.7; cursor: not-allowed;">
                    <i data-lucide="lock" style="position: absolute; top: 1rem; right: 1rem; width: 20px; height: 20px; color: rgba(255,255,255,0.5);"></i>
                    <div class="linear-card-glow"></div>
                    <h3 style="font-size: 2.5rem; margin-bottom: 0.5rem; color: #fff; position: relative; z-index: 2; font-family: 'Blockletter', sans-serif; letter-spacing: 2px;">QMJHL</h3>
                    <p style="color: var(--text-muted); position: relative; z-index: 2;">Coming Soon</p>
                </div>
                
            </div>
        </div>
    `;
    
    document.getElementById('btn-back-main').addEventListener('click', () => {
        transitionTo(initMainMenu);
    });
    
    document.getElementById('league-ohl').addEventListener('click', () => {
        transitionTo(() => initFranchiseSelection('ohl'));
    });
    
    document.getElementById('league-whl').addEventListener('click', () => {
        transitionTo(() => initFranchiseSelection('whl'));
    });
    
    if (window.lucide) window.lucide.createIcons();
}

export function getRandomTeams(teams, count) {
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export function initFranchiseSelection(league = 'ohl') {
    const app = document.getElementById('app');
    
    // Select 6 random teams from the chosen league
    const leagueTeams = league === 'whl' ? whlTeams : ohlTeams;
    const selectedTeams = getRandomTeams(leagueTeams, 6);
    
    const bgGradient = league === 'whl' 
        ? 'linear-gradient(135deg, rgba(226, 55, 63, 0.15) 0%, rgba(0, 0, 0, 0.25) 100%)'
        : 'linear-gradient(135deg, rgba(4, 122, 196, 0.15) 0%, rgba(170, 170, 170, 0.25) 100%)';
    
    const teamsHTML = selectedTeams.map(team => {
        const parts = team.name.split(' ');
        const mascot = parts.pop();
        const city = parts.join(' ');
        const logoFile = team.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
        const logoPath = league === 'whl' ? `assets/logos/whl/${logoFile}.png` : `assets/logos/ohl/${logoFile}.png`;
        
        return `
        <div class="linear-card" data-team-id="${team.id}" style="--card-color-light: ${team.colors.secondary}; --card-color-dark: ${team.colors.primary}; width: 220px; height: 280px; padding: 1.5rem;">
            <div class="linear-card-glow"></div>
            <img src="${logoPath}" alt="${team.name} Logo" style="width: 90px; height: 90px; margin-bottom: 1rem; position: relative; z-index: 2; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
            <h3 class="linear-card-title" style="line-height: 1.1; margin-top: 0.5rem; text-align: center;">
                <span style="display: block; font-size: 0.55em; opacity: 0.7; letter-spacing: 2px;">${city}</span>
                <span style="display: block;">${mascot}</span>
            </h3>
            <p class="linear-card-subtitle" style="margin-top: 0.5rem;">${team.conference} Conference</p>
        </div>
        `;
    }).join('');

    app.innerHTML = `
        <div class="page-enter" style="min-height: 100vh; background: ${bgGradient}; padding: 2rem 0; position: relative; display: flex;">
            
            <button id="btn-back-league" class="btn btn-sm" style="position: absolute; top: 2rem; left: 2rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; z-index: 50;">
                <i data-lucide="arrow-left" style="width: 18px; height: 18px;"></i> Back
            </button>

            <div class="container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 4rem);">
                
                <div style="text-align: center; margin-bottom: 3rem;">
                    <h1 class="title-main" style="font-size: 3.5rem; margin-bottom: 0.5rem;">HOCKEY GM</h1>
                    <p class="subtitle" style="color: #3b82f6; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Select your franchise to start the journey</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5rem; max-width: 900px; justify-items: center; margin-bottom: 2rem;">
                    ${teamsHTML}
                </div>
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    document.getElementById('btn-back-league').addEventListener('click', () => {
        transitionTo(initLeagueSelection);
    });
    
    // Add event listeners
    const teamCards = document.querySelectorAll('.linear-card');
    teamCards.forEach(card => {
        card.addEventListener('click', () => {
            const teamId = card.getAttribute('data-team-id');
            const team = leagueTeams.find(t => t.id === teamId);
            window.openConfirmationModal(team, league);
        });
    });
}
