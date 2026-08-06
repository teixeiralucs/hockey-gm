import { ohlTeams, whlTeams, qmjhlTeams, fphlTeams, getTeamLogoUrl } from '../../data/teams.js';

let standingsCurrentTab = 'regular'; // 'regular', 'playoffs', 'memorialcup'
let standingsGroupBy = 'division'; // 'division', 'conference', 'league'


window.switchStandingsTab = function(tab) {
    standingsCurrentTab = tab;
    const container = document.getElementById('main-content');
    if (container) renderStandingsPage(container);
};

window.renderStandingsPage = function(container) {
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

window.renderCalendarPage = function(container) {
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

window.renderFullStandings = function(container) {
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
        if (gameState.league === 'fphl') {
            s.pts = ((s.rw || 0) * 3) + ((s.otw || 0) * 2) + (s.otl * 1);
        } else {
            s.pts = (s.w * 2) + s.otl;
        }
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


