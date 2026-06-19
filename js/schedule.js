export function generateSeasonSchedule(teams, startDate) {
    let matchups = [];
    let teamGamesCount = {};
    teams.forEach(t => teamGamesCount[t.id] = 0);
    
    // Pass 1: Every team plays every other team 3 times (57 games each)
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            for(let k = 0; k < 3; k++) {
                matchups.push({
                    id: `m_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    homeId: k % 2 === 0 ? teams[i].id : teams[j].id,
                    awayId: k % 2 === 0 ? teams[j].id : teams[i].id,
                    played: false
                });
                teamGamesCount[teams[i].id]++;
                teamGamesCount[teams[j].id]++;
            }
        }
    }
    
    // Pass 2: The remaining 11 games per team
    // Total 110 games needed.
    let needyTeams = teams.map(t => t.id).filter(id => teamGamesCount[id] < 68);
    while (needyTeams.length >= 2) {
        needyTeams.sort(() => Math.random() - 0.5);
        let t1 = needyTeams[0];
        let t2 = needyTeams[1];
        matchups.push({ 
            id: `m_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            homeId: t1, 
            awayId: t2,
            played: false
        });
        teamGamesCount[t1]++;
        teamGamesCount[t2]++;
        needyTeams = teams.map(t => t.id).filter(id => teamGamesCount[id] < 68);
    }
    
    // If 1 team is left needing 1 game, just add a random team to play against them.
    if (needyTeams.length === 1) {
        let t1 = needyTeams[0];
        let t2 = teams.find(t => t.id !== t1).id;
        matchups.push({ 
            id: `m_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            homeId: t1, 
            awayId: t2,
            played: false
        });
        teamGamesCount[t1]++;
        teamGamesCount[t2]++;
    }
    
    // Shuffle all matchups randomly
    matchups.sort(() => Math.random() - 0.5);
    
    // Distribute across days
    let schedule = []; 
    let currentDate = new Date(startDate);
    
    let currentWeekNumber = 0;
    let teamWeeklyData = {};
    teams.forEach(t => teamWeeklyData[t.id] = { count: 0, limit: 3 });
    
    while(matchups.length > 0) {
        let dayOfWeek = currentDate.getDay(); // 0 = Sun, 4 = Thu, 5 = Fri, 6 = Sat
        
        // Reset weekly counters on Monday (day 1)
        if (dayOfWeek === 1) {
            currentWeekNumber++;
            // Teams get up to 3 games per week
            teams.forEach(t => teamWeeklyData[t.id] = { count: 0, limit: 3 });
        }
        
        if ([0, 4, 5, 6].includes(dayOfWeek)) {
            let dayMatches = [];
            let teamsPlayingToday = new Set();
            
            // Limit matches per day to spread them out and guarantee Sunday games!
            let maxMatchesToday = 6;
            if (dayOfWeek === 4) maxMatchesToday = 4; // Thursday: fewer games
            if (dayOfWeek === 5) maxMatchesToday = 8; // Friday: lots of games
            if (dayOfWeek === 6) maxMatchesToday = 8; // Saturday: lots of games
            if (dayOfWeek === 0) maxMatchesToday = 6; // Sunday: remaining games
            
            let i = 0;
            while(i < matchups.length && dayMatches.length < maxMatchesToday) {
                let match = matchups[i];
                let homeData = teamWeeklyData[match.homeId];
                let awayData = teamWeeklyData[match.awayId];
                
                if (!teamsPlayingToday.has(match.homeId) && 
                    !teamsPlayingToday.has(match.awayId) && 
                    homeData.count < homeData.limit && 
                    awayData.count < awayData.limit) {
                    
                    dayMatches.push(match);
                    teamsPlayingToday.add(match.homeId);
                    teamsPlayingToday.add(match.awayId);
                    
                    homeData.count++;
                    awayData.count++;
                    
                    matchups.splice(i, 1);
                } else {
                    i++;
                }
            }
            
            if (dayMatches.length > 0 || matchups.length === 0) {
                schedule.push({
                    date: new Date(currentDate).toISOString(),
                    matches: dayMatches
                });
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return schedule;
}
