import { ohlTeams, whlTeams, qmjhlTeams } from '../data/teams.js';

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function startMemorialCup(gameState) {
    // 1. Identify Champions
    let playerLeagueChampion = gameState.playoffs.champion;
    if (!playerLeagueChampion) {
        console.error("No champion found for the active league.");
        return;
    }

    let champions = {
        ohl: null,
        whl: null,
        qmjhl: null
    };

    champions[gameState.league] = playerLeagueChampion;

    // Pick random champions for the other leagues
    if (gameState.league !== 'ohl') champions.ohl = getRandomElement(ohlTeams).id;
    if (gameState.league !== 'whl') champions.whl = getRandomElement(whlTeams).id;
    if (gameState.league !== 'qmjhl') champions.qmjhl = getRandomElement(qmjhlTeams).id;

    // Pick Host Team (Randomly from any league)
    let allTeams = [...ohlTeams, ...whlTeams, ...qmjhlTeams];
    let hostTeamObj = getRandomElement(allTeams);

    // Determine the 4th spot (usually the host)
    let fourthTeamId = hostTeamObj.id;

    // If the host team happens to be the champion of its league, the runner-up goes!
    if (fourthTeamId === champions.ohl) {
        fourthTeamId = (gameState.league === 'ohl') ? gameState.playoffs.runnerUp : getRandomElement(ohlTeams.filter(t => t.id !== champions.ohl)).id;
    } else if (fourthTeamId === champions.whl) {
        fourthTeamId = (gameState.league === 'whl') ? gameState.playoffs.runnerUp : getRandomElement(whlTeams.filter(t => t.id !== champions.whl)).id;
    } else if (fourthTeamId === champions.qmjhl) {
        fourthTeamId = (gameState.league === 'qmjhl') ? gameState.playoffs.runnerUp : getRandomElement(qmjhlTeams.filter(t => t.id !== champions.qmjhl)).id;
    }

    let participants = [champions.ohl, champions.whl, champions.qmjhl, fourthTeamId];

    // 2. Initialize State
    gameState.memorialCup = {
        isActive: true,
        participants: participants,
        hostTeam: hostTeamObj.id,
        standings: participants.map(teamId => ({
            teamId: teamId,
            gp: 0, w: 0, l: 0, pts: 0, gf: 0, ga: 0
        })),
        roundRobin: [],       // Array of Matches
        currentRoundRobinDay: 0,
        tiebreaker: null,     // Tiebreaker match if 3rd and 4th tie
        semifinal: null,      // Semifinal Match
        final: null,          // Final Match
        champion: null,
        phase: 'round-robin'  // 'round-robin', 'tiebreaker', 'semifinal', 'final', 'completed'
    };

    // 3. Generate Round Robin Schedule
    // 4 teams play each other exactly once -> 6 matches total. (3 days, 2 matches per day)
    // Day 1: 0v1, 2v3
    // Day 2: 0v2, 1v3
    // Day 3: 0v3, 1v2
    let rrDays = [
        [{ home: participants[0], away: participants[1] }, { home: participants[2], away: participants[3] }],
        [{ home: participants[0], away: participants[2] }, { home: participants[1], away: participants[3] }],
        [{ home: participants[0], away: participants[3] }, { home: participants[1], away: participants[2] }]
    ];

    let matchIdCounter = 0;
    rrDays.forEach(day => {
        let dayMatches = [];
        day.forEach(pair => {
            dayMatches.push({
                id: `mc_rr_${matchIdCounter++}`,
                homeId: pair.home,
                awayId: pair.away,
                played: false,
                homeScore: 0,
                awayScore: 0,
                isOT: false,
                stage: 'Round-Robin'
            });
        });
        gameState.memorialCup.roundRobin.push(dayMatches);
    });

    scheduleMemorialCupMatches(gameState);
}

export function scheduleMemorialCupMatches(gameState) {
    let mc = gameState.memorialCup;
    if (!mc || !mc.isActive) return;

    let currentDate = new Date(gameState.currentDate);
    currentDate.setDate(currentDate.getDate() + 1); // Play tomorrow

    let dayMatches = [];

    if (mc.phase === 'round-robin') {
        let rrDayIndex = mc.currentRoundRobinDay;
        if (rrDayIndex < mc.roundRobin.length) {
            let dayArray = mc.roundRobin[rrDayIndex];
            dayArray.forEach(m => {
                let mCopy = { ...m, isMemorialCup: true, date: currentDate.toISOString() };
                dayMatches.push(mCopy);
            });
        }
    } else if (mc.phase === 'tiebreaker' && mc.tiebreaker) {
        dayMatches.push({ ...mc.tiebreaker, isMemorialCup: true, date: currentDate.toISOString() });
    } else if (mc.phase === 'semifinal' && mc.semifinal) {
        dayMatches.push({ ...mc.semifinal, isMemorialCup: true, date: currentDate.toISOString() });
    } else if (mc.phase === 'final' && mc.final) {
        dayMatches.push({ ...mc.final, isMemorialCup: true, date: currentDate.toISOString() });
    }

    if (dayMatches.length > 0) {
        gameState.schedule.push({
            date: currentDate.toISOString(),
            matches: dayMatches
        });
    }
}

export function processMemorialCupMatchResult(gameState, match) {
    let mc = gameState.memorialCup;
    if (!mc || !mc.isActive || !match.isMemorialCup) return;

    let homeScore = match.homeScore;
    let awayScore = match.awayScore;
    let winnerId = homeScore > awayScore ? match.homeId : match.awayId;
    let loserId = homeScore > awayScore ? match.awayId : match.homeId;

    if (mc.phase === 'round-robin') {
        let stHome = mc.standings.find(s => s.teamId === match.homeId);
        let stAway = mc.standings.find(s => s.teamId === match.awayId);
        
        stHome.gp++;
        stAway.gp++;
        stHome.gf += homeScore;
        stHome.ga += awayScore;
        stAway.gf += awayScore;
        stAway.ga += homeScore;

        if (winnerId === match.homeId) {
            stHome.w++;
            stHome.pts += 2;
            stAway.l++;
        } else {
            stAway.w++;
            stAway.pts += 2;
            stHome.l++;
        }

        let refMatch = mc.roundRobin[mc.currentRoundRobinDay].find(m => m.id === match.id);
        if (refMatch) {
            refMatch.played = true;
            refMatch.homeScore = homeScore;
            refMatch.awayScore = awayScore;
        }

    } else if (mc.phase === 'tiebreaker') {
        mc.tiebreaker.played = true;
        mc.tiebreaker.homeScore = homeScore;
        mc.tiebreaker.awayScore = awayScore;
        mc.tiebreaker.winnerId = winnerId;
    } else if (mc.phase === 'semifinal') {
        mc.semifinal.played = true;
        mc.semifinal.homeScore = homeScore;
        mc.semifinal.awayScore = awayScore;
        mc.semifinal.winnerId = winnerId;
    } else if (mc.phase === 'final') {
        mc.final.played = true;
        mc.final.homeScore = homeScore;
        mc.final.awayScore = awayScore;
        mc.final.winnerId = winnerId;
        mc.champion = winnerId;
    }
}

export function advanceMemorialCupPhase(gameState) {
    let mc = gameState.memorialCup;
    if (!mc || !mc.isActive) return false;

    if (mc.phase === 'round-robin') {
        let allPlayed = mc.roundRobin[mc.currentRoundRobinDay].every(m => m.played);
        if (allPlayed) {
            mc.currentRoundRobinDay++;
            if (mc.currentRoundRobinDay >= mc.roundRobin.length) {
                // Round Robin is over. Decide next phase.
                mc.standings.sort((a, b) => {
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    if (b.w !== a.w) return b.w - a.w;
                    return (b.gf - b.ga) - (a.gf - a.ga);
                });

                let third = mc.standings[2];
                let fourth = mc.standings[3];
                if (third.pts === fourth.pts && third.w === fourth.w) {
                    // Tiebreaker needed
                    mc.phase = 'tiebreaker';
                    mc.tiebreaker = {
                        id: 'mc_tie', homeId: third.teamId, awayId: fourth.teamId, played: false, homeScore: 0, awayScore: 0, stage: 'Tiebreaker'
                    };
                } else {
                    // Direct to Semifinal
                    mc.phase = 'semifinal';
                    mc.semifinal = {
                        id: 'mc_semi', homeId: mc.standings[1].teamId, awayId: mc.standings[2].teamId, played: false, homeScore: 0, awayScore: 0, stage: 'Semifinal'
                    };
                }
            }
            scheduleMemorialCupMatches(gameState);
            return true;
        }
    } else if (mc.phase === 'tiebreaker') {
        if (mc.tiebreaker && mc.tiebreaker.played) {
            mc.phase = 'semifinal';
            mc.semifinal = {
                id: 'mc_semi', homeId: mc.standings[1].teamId, awayId: mc.tiebreaker.winnerId, played: false, homeScore: 0, awayScore: 0, stage: 'Semifinal'
            };
            scheduleMemorialCupMatches(gameState);
            return true;
        }
    } else if (mc.phase === 'semifinal') {
        if (mc.semifinal && mc.semifinal.played) {
            mc.phase = 'final';
            mc.final = {
                id: 'mc_final', homeId: mc.standings[0].teamId, awayId: mc.semifinal.winnerId, played: false, homeScore: 0, awayScore: 0, stage: 'Final'
            };
            scheduleMemorialCupMatches(gameState);
            return true;
        }
    } else if (mc.phase === 'final') {
        if (mc.final && mc.final.played) {
            mc.phase = 'completed';
            mc.isActive = false;
            return true;
        }
    }

    return false;
}
