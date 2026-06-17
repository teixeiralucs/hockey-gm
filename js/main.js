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
                <div class="team-card team-card-square" id="league-ohl">
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
                    
                    return `
                    <div class="team-card" data-team-id="${team.id}">
                        <h3 class="team-card-title" style="line-height: 1.1;">
                            <span style="display: block; font-size: 0.55em; opacity: 0.7; letter-spacing: 2px;">${city}</span>
                            <span style="display: block;">${mascot}</span>
                        </h3>
                        <p class="team-card-conf" style="margin-top: 0.5rem;">${team.conference} Conference</p>
                    </div>
                    `;
                }).join('')}
            </div>
            
            <div style="text-align: center; display: flex; gap: 1rem; justify-content: center; margin-bottom: 2rem;">
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
            handleTeamSelection(team);
        });
    });
    
    document.getElementById('btn-back-league').addEventListener('click', initLeagueSelection);
    document.getElementById('btn-re-roll').addEventListener('click', initFranchiseSelection);
}

function handleTeamSelection(team) {
    // This will be expanded later
    alert(`You selected: ${team.name}!\nSimulation will start soon.`);
}

