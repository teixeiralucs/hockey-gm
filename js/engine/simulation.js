import { ohlTeams, whlTeams } from '../../data/teams.js';
import { processPlayoffMatchResult, advancePlayoffRound } from '../playoffs.js';

function getActiveTeams(gameState) {
    return (gameState && gameState.league === 'whl') ? whlTeams : ohlTeams;
}


export function simulateBackgroundDays(gameState, daysCount, callbacks = {}) {
    if (!gameState.schedule) return;
    
    let daysSimulated = 0;
    
    for (let i = 0; i < daysCount; i++) {
        let day = gameState.schedule[gameState.currentScheduleDayIndex];
        if (!day) break;
        
        // Yield control back to player if they have a match today
        if (gameState.team && gameState.team.id) {
            let playerMatch = day.matches.find(m => m.homeId === gameState.team.id || m.awayId === gameState.team.id);
            if (playerMatch && !playerMatch.played) {
                break;
            }
        }
        
        // Simulate all matches for this day
        day.matches.forEach(match => {
            if (!match.played) {
                simulateBackgroundMatch(gameState, match);
            }
        });
        
        // Advance Date
        let nextDay = gameState.schedule[gameState.currentScheduleDayIndex + 1];
        if (nextDay) {
            gameState.currentDate = new Date(nextDay.date);
        } else {
            // End of season
            gameState.currentDate.setDate(new Date(gameState.currentDate).getDate() + 1);
        }
        gameState.currentScheduleDayIndex++;
        daysSimulated++;
        
        let advancedPlayoffs = false;
        if (gameState.playoffs && gameState.playoffs.isActive) {
            advancePlayoffRound(gameState);
        }
    }
    
    if (daysSimulated > 0) {
        updateClinchStatuses(gameState);
        if (callbacks.onComplete) callbacks.onComplete();
    }
}

export function simulateToPlayoffs(gameState, callbacks = {}) {
    if (gameState.playoffs) return;
    
    // Simulate all remaining regular season matches
    while (gameState.currentScheduleDayIndex < gameState.schedule.length && !gameState.playoffs) {
        let day = gameState.schedule[gameState.currentScheduleDayIndex];
        if (!day) break;
        
        day.matches.forEach(match => {
            if (!match.played) simulateBackgroundMatch(gameState, match);
        });
        
        let nextDay = gameState.schedule[gameState.currentScheduleDayIndex + 1];
        if (nextDay) {
            gameState.currentDate = new Date(nextDay.date);
        } else {
            gameState.currentDate.setDate(new Date(gameState.currentDate).getDate() + 1);
        }
        gameState.currentScheduleDayIndex++;
    }
    
    updateClinchStatuses(gameState);
    if (callbacks.onComplete) callbacks.onComplete();
}

export function simulateBackgroundMatch(gameState, match) {
    const activeTeams = getActiveTeams(gameState);
    let homeTeam = activeTeams.find(t => t.id === match.homeId);
    let awayTeam = activeTeams.find(t => t.id === match.awayId);
    
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
        updateStandings(gameState, match.homeId, match.awayId, homeScore, awayScore, isOT);
    }
    // Free Agency Refresh Hook
    if (gameState.team && (match.homeId === gameState.team.id || match.awayId === gameState.team.id)) {
        if (gameState.freeAgencyMarket) {
            gameState.freeAgencyMarket.nextRefreshGames--;
            if (gameState.freeAgencyMarket.nextRefreshGames <= 0) {
                if (window.refreshFreeAgencyMarket) {
                    window.refreshFreeAgencyMarket();
                }
                gameState.freeAgencyMarket.nextRefreshGames = 10;
            }
        }
    }
    
    // Simulate player stats for CPU teams
    if (gameState.players) {
        let homePlayers = gameState.players.filter(p => p.teamId === homeTeam.id);
        let awayPlayers = gameState.players.filter(p => p.teamId === awayTeam.id);
        
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
        
        let otherSkaters = skaters.filter(p => p.id !== scorer.id);
        if (otherSkaters.length > 0) {
            let assistIndex = Math.floor(Math.abs(Math.random() - Math.random()) * otherSkaters.length);
            let assist1 = otherSkaters[assistIndex] || otherSkaters[0];
            assist1.stats = assist1.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
            assist1.stats.assists++;
            assist1.stats.points++;
            
            if (Math.random() > 0.5 && otherSkaters.length > 1) {
                let otherSkaters2 = otherSkaters.filter(p => p.id !== assist1.id);
                let assistIndex2 = Math.floor(Math.abs(Math.random() - Math.random()) * otherSkaters2.length);
                let assist2 = otherSkaters2[assistIndex2] || otherSkaters2[0];
                assist2.stats = assist2.stats || { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                assist2.stats.assists++;
                assist2.stats.points++;
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

function updateStreak(standing, isWin) {
    let currentStreak = standing.streak;
    // Handle old object format from previous saves
    if (typeof currentStreak === 'object' && currentStreak !== null) {
        if (currentStreak.type === 'W' || currentStreak.type === 'L') {
            currentStreak = currentStreak.type + currentStreak.count;
        } else {
            currentStreak = '';
        }
    }
    currentStreak = currentStreak || '';
    
    if (isWin) {
        if (currentStreak.startsWith('W')) {
            standing.streak = 'W' + (parseInt(currentStreak.substring(1)) + 1);
        } else {
            standing.streak = 'W1';
        }
    } else {
        if (currentStreak.startsWith('L')) {
            standing.streak = 'L' + (parseInt(currentStreak.substring(1)) + 1);
        } else {
            standing.streak = 'L1';
        }
    }
}

export function updateStandings(gameState, homeId, awayId, homeScore, awayScore, isOT) {
    let homeStanding = gameState.standings.find(s => s.teamId === homeId);
    let awayStanding = gameState.standings.find(s => s.teamId === awayId);
    
    if (homeStanding) {
        homeStanding.gp++;
        homeStanding.gf = (homeStanding.gf || 0) + homeScore;
        homeStanding.ga = (homeStanding.ga || 0) + awayScore;
    }
    if (awayStanding) {
        awayStanding.gp++;
        awayStanding.gf = (awayStanding.gf || 0) + awayScore;
        awayStanding.ga = (awayStanding.ga || 0) + homeScore;
    }
    
    if (homeScore > awayScore) {
        if (homeStanding) { 
            homeStanding.w++; 
            homeStanding.pts += 2; 
            updateStreak(homeStanding, true);
        }
        if (awayStanding) {
            if (isOT) { 
                awayStanding.otl++; 
                awayStanding.pts += 1; 
                updateStreak(awayStanding, false);
            } else { 
                awayStanding.l++; 
                updateStreak(awayStanding, false);
            }
        }
    } else if (awayScore > homeScore) {
        if (awayStanding) { 
            awayStanding.w++; 
            awayStanding.pts += 2; 
            updateStreak(awayStanding, true);
        }
        if (homeStanding) {
            if (isOT) { 
                homeStanding.otl++; 
                homeStanding.pts += 1; 
                updateStreak(homeStanding, false);
            } else { 
                homeStanding.l++; 
                updateStreak(homeStanding, false);
            }
        }
    } else {
        // Fallback for ties (shouldn't happen)
        if (homeStanding) { homeStanding.otl++; homeStanding.pts += 1; updateStreak(homeStanding, false); }
        if (awayStanding) { awayStanding.otl++; awayStanding.pts += 1; updateStreak(awayStanding, false); }
    }
    
    const currentTeamId = gameState.team ? gameState.team.id : null;
    if (currentTeamId) {
        if (homeId === currentTeamId) {
            if (homeScore > awayScore) gameState.record.wins++;
            else if (homeScore < awayScore && isOT) gameState.record.otl++;
            else if (homeScore < awayScore) gameState.record.losses++;
            else gameState.record.otl++; // tie
        } else if (awayId === currentTeamId) {
            if (awayScore > homeScore) gameState.record.wins++;
            else if (awayScore < homeScore && isOT) gameState.record.otl++;
            else if (awayScore < homeScore) gameState.record.losses++;
            else gameState.record.otl++; // tie
        }
    }
}

export function generateMatchTimeline(gameState, myOvr, oppOvr, isHome, myTeam, oppTeam) {
    const timeline = [];
    const homeTeam = isHome ? myTeam : oppTeam;
    const awayTeam = !isHome ? myTeam : oppTeam;
    
    // 1. Gather Players
    function extractLines(isUser, teamId) {
        let lines = { f: [[], [], [], []], d: [[], [], []], g: [] };
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
            
        } else {
            let cpu = gameState.players.filter(p => p.teamId === teamId);
            let f = cpu.filter(p => ['LW', 'C', 'RW'].includes(p.position)).sort((a,b) => b.overall - a.overall);
            let d = cpu.filter(p => ['LD', 'RD'].includes(p.position)).sort((a,b) => b.overall - a.overall);
            let g = cpu.filter(p => p.position === 'G').sort((a,b) => b.overall - a.overall);
            
            for(let i=0; i<4; i++) lines.f[i] = f.slice(i*3, i*3+3);
            for(let i=0; i<3; i++) lines.d[i] = d.slice(i*2, i*2+2);
            lines.g = g.slice(0, 2);
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
        
        let f = lines.f[lineF] || [];
        let d = lines.d[lineD] || [];
        return { f, d, g, all: [...f, ...d] };
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
        
        let isImportant = ['goal', 'penalty', 'fight', 'faceoff', 'end_period', 'shootout', 'shootout_goal', 'shootout_save', 'shootout_winner'].includes(type);
        if (isImportant || Math.random() < 0.12) {
            let t = team === 'home' ? homeTeam : team === 'away' ? awayTeam : null;
            timeline.push({
                period: period,
                minute: min,
                second: sec,
                type: type,
                team: team,
                teamName: t ? t.name : '',
                color: t ? t.colors.primary : '#a1a1aa',
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
    
    let maxPeriods = 3;
    for (state.period = 1; state.period <= maxPeriods; state.period++) {
        state.clock = 1200; // 20 min regular and OT
        state.zone = 'neutral';
        state.emptyNet = false;
        
        let homeC = getPlayer('home', ['C']);
        let awayC = getPlayer('away', ['C']);
        let hFace = parseFloat(homeC.overall);
        let aFace = parseFloat(awayC.overall);
        state.possession = Math.random() * (hFace + aFace) < hFace ? 'home' : 'away';
        let periodName = state.period > 4 ? `OVERTIME ${state.period - 3}` : (state.period === 4 ? 'OVERTIME 1' : `Period ${state.period}`);
        addEvent(state.clock, 'faceoff', null, `Puck Drop! ${periodName} Faceoff won by ${state.possession === 'home' ? homeTeam.name : awayTeam.name}.`);
        
        let otWinner = false;
        
        while (state.clock > 0) {
            let tickTime = Math.floor(Math.random() * 11) + 10; 
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
                        
                        if (goalie.id) {
                            if (!gameState.matchStats[goalie.id]) gameState.matchStats[goalie.id] = { shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                            gameState.matchStats[goalie.id].shotsAgainst = (gameState.matchStats[goalie.id].shotsAgainst || 0) + 1;
                            gameState.matchStats[goalie.id].goalsAgainst = (gameState.matchStats[goalie.id].goalsAgainst || 0) + 1;
                        }
                        
                        let possibleAssisters = getOnIcePlayers(atk).all.filter(p => p.id !== shooter.id);
                        if (possibleAssisters.length > 0) {
                            let total = possibleAssisters.reduce((sum, p) => sum + parseFloat(p.overall), 0);
                            let r = Math.random() * total;
                            let assister1 = possibleAssisters[0];
                            for (let p of possibleAssisters) {
                                r -= parseFloat(p.overall);
                                if (r <= 0) { assister1 = p; break; }
                            }
                            if (!gameState.matchStats[assister1.id]) gameState.matchStats[assister1.id] = { goals: 0, assists: 0 };
                            gameState.matchStats[assister1.id].assists++;
                            addEvent(state.clock, 'assist', atk, `Assist credited to ${assister1.name}.`);
                            
                            if (Math.random() > 0.5 && possibleAssisters.length > 1) {
                                let possibleAssisters2 = possibleAssisters.filter(p => p.id !== assister1.id);
                                let total2 = possibleAssisters2.reduce((sum, p) => sum + parseFloat(p.overall), 0);
                                let r2 = Math.random() * total2;
                                let assister2 = possibleAssisters2[0];
                                for (let p of possibleAssisters2) {
                                    r2 -= parseFloat(p.overall);
                                    if (r2 <= 0) { assister2 = p; break; }
                                }
                                if (!gameState.matchStats[assister2.id]) gameState.matchStats[assister2.id] = { goals: 0, assists: 0 };
                                gameState.matchStats[assister2.id].assists++;
                                addEvent(state.clock, 'assist', atk, `Secondary assist credited to ${assister2.name}.`);
                            }
                        }
                        
                        // Power Play Goal Logic
                        if (state.penalties[def].length > state.penalties[atk].length) {
                            let minorIndex = state.penalties[def].findIndex(p => p.minor === true || (p.minor === undefined && p.time <= 120));
                            if (minorIndex !== -1) {
                                let endedPenalty = state.penalties[def].splice(minorIndex, 1)[0];
                                addEvent(state.clock, 'penalty_over', def, `PP GOAL! ${endedPenalty.player.name} returns to the ice.`);
                            }
                        }
                        
                        // Empty Net Reset
                        if (state.emptyNet) {
                            state.emptyNet = false;
                            addEvent(state.clock, 'goalie_returns', null, `The goalie returns to the net after the goal.`);
                        }
                        
                        if (state.period > 3) {
                            otWinner = true;
                            break; // Sudden death
                        }
                        
                        state.zone = 'neutral';
                        state.possession = Math.random() > 0.5 ? 'home' : 'away';
                        addEvent(state.clock, 'faceoff', null, `Faceoff at center ice.`);
                    } else if (Math.random() < 0.4) {
                        if (goalie.id) {
                            if (!gameState.matchStats) gameState.matchStats = {};
                            if (!gameState.matchStats[goalie.id]) gameState.matchStats[goalie.id] = { shotsAgainst: 0, saves: 0, goalsAgainst: 0 };
                            gameState.matchStats[goalie.id].shotsAgainst = (gameState.matchStats[goalie.id].shotsAgainst || 0) + 1;
                            gameState.matchStats[goalie.id].saves = (gameState.matchStats[goalie.id].saves || 0) + 1;
                        }
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
                    addEvent(state.clock, 'giveaway', atk, `${atkTeam.name} turns the puck over in the zone.`);
                }
            } else if (state.zone === 'defensive') {
                if (Math.random() > 0.3) {
                    state.zone = 'neutral';
                    addEvent(state.clock, 'breakout', atk, `${atkTeam.name} clears the puck out of the zone.`);
                } else {
                    state.possession = def;
                    state.zone = 'offensive';
                    addEvent(state.clock, 'dangerous_turnover', atk, `Dangerous turnover by ${atkTeam.name} in their own end!`);
                }
            }
            
            // Physical & Rules
            if (Math.random() < 0.08) {
                if (Math.random() < 0.25) { // Penalty
                    let offender = getPlayer(atk, null);
                    let duration = Math.random() < 0.1 ? 300 : 120; // Major vs Minor
                    state.penalties[atk].push({ player: offender, time: duration, minor: duration === 120 });
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
            let pName = state.period > 4 ? `Overtime ${state.period - 3}` : (state.period === 4 ? 'Overtime 1' : `Period ${state.period}`);
            addEvent(0, 'end_period', null, `End of ${pName}.`);
            
            if (state.period >= 3 && state.period < 5 && state.score.home === state.score.away) {
                maxPeriods = state.period + 1; // Force Overtime up to period 5
            } else if (state.period === 5 && state.score.home === state.score.away) {
                simulateShootout();
                break;
            }
        }
    }
    
    function simulateShootout() {
        let soPeriod = 6;
        let soTime = 1200;
        state.period = soPeriod; // Set period to 6 BEFORE adding the first shootout event
        addEvent(soTime--, 'shootout', null, `--- SHOOTOUT ---`);
        let hGoalie = homeLines.g[0] || { name: 'Goalie', overall: 70 };
        let aGoalie = awayLines.g[0] || { name: 'Goalie', overall: 70 };
        let hForwards = homeLines.f.flat().filter(p => p).sort((a,b) => b.overall - a.overall);
        let aForwards = awayLines.f.flat().filter(p => p).sort((a,b) => b.overall - a.overall);
        
        // Failsafe if a CPU team has no forwards in gameState.players
        if (hForwards.length === 0) hForwards = [{ name: 'Shooter', overall: 70 }];
        if (aForwards.length === 0) aForwards = [{ name: 'Shooter', overall: 70 }];
        
        let soHomeScore = 0;
        let soAwayScore = 0;
        let round = 0;
        let winner = null;
        
        while (!winner) {
            let hShooter = hForwards[round % hForwards.length];
            let aShooter = aForwards[round % aForwards.length];
            
            // Add pressure after round 10 to force a conclusion
            let pressure = round > 10 ? (round - 10) * 5 : 0;
            
            // Home shoots
            let hShotOvr = parseFloat(hShooter.overall) + pressure + Math.random() * 40;
            let aSaveOvr = parseFloat(aGoalie.overall) + Math.random() * 30;
            state.period = soPeriod;
            if (hShotOvr > aSaveOvr) {
                soHomeScore++;
                addEvent(soTime--, 'shootout_goal', 'home', `Round ${round+1}: ${hShooter.name} scores on ${aGoalie.name}!`, true);
            } else {
                addEvent(soTime--, 'shootout_save', 'home', `Round ${round+1}: ${hShooter.name} is stopped by ${aGoalie.name}.`);
            }
            
            // Away shoots
            let aShotOvr = parseFloat(aShooter.overall) + pressure + Math.random() * 40;
            let hSaveOvr = parseFloat(hGoalie.overall) + Math.random() * 30;
            state.period = soPeriod;
            if (aShotOvr > hSaveOvr) {
                soAwayScore++;
                addEvent(soTime--, 'shootout_goal', 'away', `Round ${round+1}: ${aShooter.name} scores on ${hGoalie.name}!`, true);
            } else {
                addEvent(soTime--, 'shootout_save', 'away', `Round ${round+1}: ${aShooter.name} is stopped by ${hGoalie.name}.`);
            }
            
            // Check win after Away shoots (ensures both teams had equal shots in the round)
            // User requested: "depois do 6º chute ser realizado que o jogo processa os valores"
            // So we only check for a winner starting from round 2 (which is the 3rd round, i.e., 6 shots total)
            if (round >= 2) {
                // If it's round 3 or later, ANY difference in score means someone won
                // because they have taken an equal number of shots.
                if (soHomeScore !== soAwayScore) {
                    // Check if mathematically impossible to tie (if we want early exit).
                    // But user specifically wants 6 shots, so we don't exit early before round 2.
                    // For rounds >= 2, if scores are different after Away shoots, the match is over!
                    winner = soHomeScore > soAwayScore ? 'home' : 'away';
                    break;
                }
            }
            
            round++;
            
            // Extreme failsafe to prevent infinite loops, but still allowing a proper log ending
            if (round > 50) {
                if (soHomeScore === soAwayScore) {
                    soHomeScore++;
                    addEvent(soTime--, 'shootout_goal', 'home', `Round ${round+1}: ${hForwards[0].name} finally ends the marathon shootout!`, true);
                }
                winner = soHomeScore > soAwayScore ? 'home' : 'away';
                break;
            }
        }
        
        state.period = soPeriod;
        addEvent(soTime--, 'shootout_winner', winner, `${winner === 'home' ? homeTeam.name : awayTeam.name} is awarded the shootout win!`, true);
        addEvent(0, 'end_period', null, `GAME OVER! ${winner === 'home' ? homeTeam.name : awayTeam.name} wins in Shootout!`);
    }

    timeline.sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        if (a.minute !== b.minute) return b.minute - a.minute; 
        return b.second - a.second;
    });
    
    return timeline;
}

export function updateClinchStatuses(gameState) {
    if (!gameState || !gameState.standings) return;
    
    try {
        const activeTeams = getActiveTeams(gameState);
        gameState.standings.forEach(s => {
        s.pts = (s.w * 2) + s.otl;
        s.maxPts = s.pts + ((68 - s.gp) * 2);
        const info = activeTeams.find(t => t.id === s.teamId);
        s.conf = info ? info.conference : 'Unknown';
        s.div = info ? info.division : 'Unknown';
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
    } catch(e) {
        console.error("Error in updateClinchStatuses:", e);
    }
}
