import { ohlTeams } from '../data/teams.js';

export function generatePlayoffs(gameState) {
    if (!gameState.standings) return;

    let eastTeams = [];
    let westTeams = [];

    // Group teams by conference and compute points
    gameState.standings.forEach(record => {
        let team = ohlTeams.find(t => t.id === record.teamId);
        if (team) {
            let pts = (record.w * 2) + record.otl;
            if (team.conference === 'East') {
                eastTeams.push({ id: record.teamId, pts: pts, wins: record.w });
            } else if (team.conference === 'West') {
                westTeams.push({ id: record.teamId, pts: pts, wins: record.w });
            }
        }
    });

    // Sort by points (tie-breaker: wins)
    const sortFn = (a, b) => b.pts - a.pts || b.wins - a.wins;
    eastTeams.sort(sortFn);
    westTeams.sort(sortFn);

    // Extract top 8
    let eastTop8 = eastTeams.slice(0, 8);
    let westTop8 = westTeams.slice(0, 8);

    // Create Round 1 matchups
    // 1v8, 2v7, 3v6, 4v5
    let series = [];
    let seriesIdCounter = 1;

    const createSeries = (high, low, conf) => {
        return {
            id: `series_${seriesIdCounter++}`,
            conference: conf,
            highSeedId: high.id,
            lowSeedId: low.id,
            highSeedWins: 0,
            lowSeedWins: 0,
            winner: null
        };
    };

    // East Quarterfinals
    if (eastTop8.length === 8) {
        series.push(createSeries(eastTop8[0], eastTop8[7], 'East'));
        series.push(createSeries(eastTop8[1], eastTop8[6], 'East'));
        series.push(createSeries(eastTop8[2], eastTop8[5], 'East'));
        series.push(createSeries(eastTop8[3], eastTop8[4], 'East'));
    }

    // West Quarterfinals
    if (westTop8.length === 8) {
        series.push(createSeries(westTop8[0], westTop8[7], 'West'));
        series.push(createSeries(westTop8[1], westTop8[6], 'West'));
        series.push(createSeries(westTop8[2], westTop8[5], 'West'));
        series.push(createSeries(westTop8[3], westTop8[4], 'West'));
    }

    gameState.playoffs = {
        isActive: true,
        round: 1, // 1: Conf Quarterfinals, 2: Conf Semifinals, 3: Conf Finals, 4: Championship
        series: series,
        champion: null
    };

    schedulePlayoffRound(gameState);
}

export function schedulePlayoffRound(gameState) {
    if (!gameState.playoffs || !gameState.playoffs.isActive) return;

    let roundSeries = gameState.playoffs.series;
    if (roundSeries.length === 0) return;

    let currentDate = new Date(gameState.currentDate);
    currentDate.setDate(currentDate.getDate() + 2); // Start playoffs 2 days after regular season / previous round ends

    // Format: 2-2-1-1-1 (Home games for High Seed: 1, 2, 5, 7. Low Seed: 3, 4, 6)
    const hostPattern = ['high', 'high', 'low', 'low', 'high', 'low', 'high'];

    for (let gameNum = 1; gameNum <= 7; gameNum++) {
        let dayMatches = [];
        let isHighSeedHome = hostPattern[gameNum - 1] === 'high';

        roundSeries.forEach(s => {
            dayMatches.push({
                isPlayoff: true,
                seriesId: s.id,
                gameNum: gameNum,
                homeId: isHighSeedHome ? s.highSeedId : s.lowSeedId,
                awayId: isHighSeedHome ? s.lowSeedId : s.highSeedId,
                played: false,
                homeScore: 0,
                awayScore: 0,
                isOT: false
            });
        });

        // Add to schedule
        gameState.schedule.push({
            date: new Date(currentDate).toISOString(),
            matches: dayMatches
        });

        // Add a rest day between games
        currentDate.setDate(currentDate.getDate() + 2);
    }
}

export function processPlayoffMatchResult(match, gameState) {
    if (!match.isPlayoff || !gameState.playoffs) return;

    let series = gameState.playoffs.series.find(s => s.id === match.seriesId);
    if (!series || series.winner) return;

    let matchWinner = match.homeScore > match.awayScore ? match.homeId : match.awayId;

    if (matchWinner === series.highSeedId) {
        series.highSeedWins++;
    } else if (matchWinner === series.lowSeedId) {
        series.lowSeedWins++;
    }

    // Check if series is over
    if (series.highSeedWins === 4) {
        series.winner = series.highSeedId;
    } else if (series.lowSeedWins === 4) {
        series.winner = series.lowSeedId;
    }

    // If series is over, scrub remaining scheduled matches for this series
    if (series.winner) {
        scrubCompletedSeriesMatches(series.id, gameState);
    }
}

function scrubCompletedSeriesMatches(seriesId, gameState) {
    for (let i = gameState.currentScheduleDayIndex; i < gameState.schedule.length; i++) {
        let day = gameState.schedule[i];
        day.matches = day.matches.filter(m => !(m.isPlayoff && m.seriesId === seriesId && !m.played));
    }
}

export function advancePlayoffRound(gameState) {
    if (!gameState.playoffs || !gameState.playoffs.isActive) return false;

    // Check if ALL series in the current round are completed
    let allCompleted = gameState.playoffs.series.every(s => s.winner !== null);
    if (!allCompleted) return false;

    let p = gameState.playoffs;
    let oldSeries = p.series;

    // If Championship is completed
    if (p.round === 4) {
        p.champion = oldSeries[0].winner;
        p.isActive = false;
        return true; // Reached end
    }

    p.round++;
    let newSeries = [];
    let seriesIdCounter = p.round * 100;

    const createSeries = (highId, lowId, conf) => {
        return {
            id: `series_${seriesIdCounter++}`,
            conference: conf,
            highSeedId: highId,
            lowSeedId: lowId,
            highSeedWins: 0,
            lowSeedWins: 0,
            winner: null
        };
    };

    if (p.round === 2) {
        // Conf Semifinals (Highest vs Lowest remaining, 2nd Highest vs 2nd Lowest)
        let eastWinners = oldSeries.filter(s => s.conference === 'East').map(s => s.winner);
        let westWinners = oldSeries.filter(s => s.conference === 'West').map(s => s.winner);

        const sortByPoints = (aId, bId) => {
            let stA = gameState.standings.find(s => s.teamId === aId);
            let stB = gameState.standings.find(s => s.teamId === bId);
            let ptsA = stA ? (stA.w * 2) + stA.otl : 0;
            let ptsB = stB ? (stB.w * 2) + stB.otl : 0;
            return ptsB - ptsA;
        };

        eastWinners.sort(sortByPoints);
        westWinners.sort(sortByPoints);

        if (eastWinners.length === 4) {
            newSeries.push(createSeries(eastWinners[0], eastWinners[3], 'East'));
            newSeries.push(createSeries(eastWinners[1], eastWinners[2], 'East'));
        }
        if (westWinners.length === 4) {
            newSeries.push(createSeries(westWinners[0], westWinners[3], 'West'));
            newSeries.push(createSeries(westWinners[1], westWinners[2], 'West'));
        }
    } else if (p.round === 3) {
        // Conf Finals
        let eastWinners = oldSeries.filter(s => s.conference === 'East').map(s => s.winner);
        let westWinners = oldSeries.filter(s => s.conference === 'West').map(s => s.winner);
        
        const sortByPoints = (aId, bId) => {
            let stA = gameState.standings.find(s => s.teamId === aId);
            let stB = gameState.standings.find(s => s.teamId === bId);
            let ptsA = stA ? (stA.w * 2) + stA.otl : 0;
            let ptsB = stB ? (stB.w * 2) + stB.otl : 0;
            return ptsB - ptsA;
        };

        eastWinners.sort(sortByPoints);
        westWinners.sort(sortByPoints);

        if (eastWinners.length === 2) {
            newSeries.push(createSeries(eastWinners[0], eastWinners[1], 'East'));
        }
        if (westWinners.length === 2) {
            newSeries.push(createSeries(westWinners[0], westWinners[1], 'West'));
        }
    } else if (p.round === 4) {
        // Championship
        let eastWinner = oldSeries.find(s => s.conference === 'East')?.winner;
        let westWinner = oldSeries.find(s => s.conference === 'West')?.winner;

        if (eastWinner && westWinner) {
            let stEast = gameState.standings.find(s => s.teamId === eastWinner);
            let stWest = gameState.standings.find(s => s.teamId === westWinner);
            let ptsEast = stEast ? (stEast.w * 2) + stEast.otl : 0;
            let ptsWest = stWest ? (stWest.w * 2) + stWest.otl : 0;
            
            if (ptsEast >= ptsWest) {
                newSeries.push(createSeries(eastWinner, westWinner, 'OHL'));
            } else {
                newSeries.push(createSeries(westWinner, eastWinner, 'OHL'));
            }
        }
    }

    p.series = newSeries;
    schedulePlayoffRound(gameState);
    return true;
}
