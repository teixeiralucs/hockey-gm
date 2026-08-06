import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams, getTeamLogoUrl } from '../../data/teams.js';

window.computeSeasonAwards = function() {
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
                <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${logo}.png" onerror="this.src='assets/logos/hockey_gm_logo.png'" style="width: 200px; height: 200px; object-fit: contain;">
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

window.advanceSeasonLogic = function(precomputedAwards) {
    
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
        
        let retirementAge = gameState.league === 'fphl' ? 45 : 21;
        
        if (p.teamId === currentTeam.id && p.age > retirementAge) {
            retiredPlayers.push(p);
        } else {
            if (gameState.league === 'fphl') {
                if (p.age % 5 === 0) {
                    p.ageBoosts = (p.ageBoosts || 0) + 1;
                }
            } else {
                p.ageBoosts = (p.ageBoosts || 0) + 1;
            }
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
        const retAge = gameState.league === 'fphl' ? 45 : 21;
        const message = `The season has ended. ${retiredPlayers.length} player(s) reached the age limit of ${retAge} and were moved to your Collection: ${namesStr}. You can draft them again from the Shop with their original age!`;
        
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
    let newDate;
    if (gameState.league === 'fphl') {
        newDate = new Date(gameState.seasonYear, 9, 1); // October
        let fridaysCount = 0;
        while(fridaysCount < 2) {
            if (newDate.getDay() === 5) fridaysCount++;
            if (fridaysCount < 2) newDate.setDate(newDate.getDate() + 1);
        }
    } else {
        newDate = new Date(gameState.seasonYear, 8, 1); // September
        while (newDate.getDay() !== 3 || Math.ceil(newDate.getDate() / 7) !== 3) {
            newDate.setDate(newDate.getDate() + 1);
        }
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
    
    const currentLeagueTeams = gameState.league === 'whl' ? whlTeams : (gameState.league === 'qmjhl' ? qmjhlTeams : (gameState.league === 'fphl' ? fphlTeams : ohlTeams));
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
    if (window.allPlayersDatabase) {
        Object.values(window.allPlayersDatabase).forEach(teamRoster => {
            teamRoster.forEach(p => {
                if (!gameState.collection.some(c => c.id === p.id)) {
                    gameState.collection.push(p);
                }
            });
        });
    }
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
        { id: 'ohl', name: 'OHL', logo: 'assets/logos/leagues/ohl-logo.svg', color: '#047ac4', teams: ohlTeams },
        { id: 'whl', name: 'WHL', logo: 'assets/logos/leagues/whl-logo.svg', color: '#e2373f', teams: whlTeams },
        { id: 'qmjhl', name: 'QMJHL', logo: 'assets/logos/leagues/qmjhl-logo.svg', color: '#f87171', teams: qmjhlTeams },
        { id: 'fphl', name: 'FPHL', logo: 'assets/logos/leagues/fphl-logo.png', color: '#c52634', teams: fphlTeams }
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
        const allTeamsForRight = [...ohlTeams, ...whlTeams, ...qmjhlTeams, ...fphlTeams];
        const selectedTeam = allTeamsForRight.find(t => t.id === window.currentCollectionTeamId);
        let originalRoster = window.allPlayersDatabase ? (window.allPlayersDatabase[selectedTeam.id] || []) : [];
        
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
                                <img src="assets/logos/${fphlTeams.some(t => t.id === selectedTeam.id) ? 'fphl' : (qmjhlTeams.some(t => t.id === selectedTeam.id) ? 'qmjhl' : (whlTeams.some(t => t.id === selectedTeam.id) ? 'whl' : 'ohl'))}/${selectedTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-')}.png" style="height: 40px; object-fit: contain;">
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
    const originalRoster = window.allPlayersDatabase ? (window.allPlayersDatabase[teamId] || []) : [];
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
                <img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${champTeam.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[']/g, '').replace(/\s+/g, '-')}.png" style="width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(0 0 20px #fbbf24); margin-bottom: 1.5rem;">
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
                        ${t1.id !== 'tbd' ? `<img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${logo1}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
                        <span>${getTeamNameParts(t1.name).mascot}</span>
                    </div>
                    <span>${s.highSeedWins}</span>
                </div>
                <div class="matchup-row ${winner === t2.id ? 'winner' : ''}">
                    <div class="matchup-team">
                        ${t2.id !== 'tbd' ? `<img src="assets/logos/${(typeof gameState !== 'undefined' && gameState ? (gameState.league === 'whl' ? 'whl' : (gameState.league === 'qmjhl' ? 'qmjhl' : (gameState.league === 'fphl' ? 'fphl' : 'ohl'))) : 'ohl')}/${logo2}.png" style="width: 16px; height: 16px; object-fit: contain;">` : ''}
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
