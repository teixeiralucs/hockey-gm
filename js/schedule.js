export function generateSeasonSchedule(teams, startDate, numRounds = 68) {
    let N = teams.length;
    let teamIds = teams.map(t => t.id);
    
    // Fix for odd number of teams (e.g. custom teams added)
    if (N % 2 !== 0) {
        teamIds.push('BYE');
        N++;
    }
    
    // 1. Generate EXACTLY numRounds Round-Robin Rounds
    let rounds = [];
    
    while (rounds.length < numRounds) {
        let cycleTeams = [...teamIds];
        cycleTeams.sort(() => Math.random() - 0.5); // Shuffle for each new cycle
        
        for (let r = 0; r < N - 1; r++) {
            if (rounds.length >= numRounds) break;
            
            let roundMatches = [];
            for (let i = 0; i < N / 2; i++) {
                let homeId = cycleTeams[i];
                let awayId = cycleTeams[N - 1 - i];
                
                if (homeId === 'BYE' || awayId === 'BYE') continue; // Skip byes
                
                if (Math.random() > 0.5) {
                    let temp = homeId; homeId = awayId; awayId = temp;
                }
                
                roundMatches.push({
                    id: `m_${Date.now()}_${Math.floor(Math.random() * 10000)}_${r}_${i}`,
                    homeId,
                    awayId,
                    played: false
                });
            }
            rounds.push(roundMatches);
            
            // Rotate the array (keeping index 0 fixed)
            let last = cycleTeams.pop();
            cycleTeams.splice(1, 0, last);
        }
    }
    
    // 2. Prepare 26 Weeks of Quotas
    let totalWeeks = 26;
    let weekQuotas = Array(totalWeeks).fill(Math.floor(numRounds / totalWeeks));
    let extraRounds = numRounds % totalWeeks;
    
    let indices = Array.from({length: totalWeeks}, (_, i) => i);
    indices.sort(() => Math.random() - 0.5);
    for(let i = 0; i < extraRounds; i++) {
        weekQuotas[indices[i]]++;
    }
    
    let schedule = [];
    let currentDate = new Date(startDate);
    
    // Align to Monday of that week
    while(currentDate.getDay() !== 1) {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // 3. Distribute Matches across weeks
    for (let w = 0; w < totalWeeks; w++) {
        let weekMatches = [];
        for(let k = 0; k < weekQuotas[w]; k++) {
            if (rounds.length > 0) {
                weekMatches.push(...rounds.shift());
            }
        }
        
        // 4. Distribute into days of the week realistically (Wed, Thu, Fri, Sat, Sun)
        let dailySchedule = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
        let teamDays = {};
        
        let success = false;
        for (let attempt = 0; attempt < 50; attempt++) {
            dailySchedule = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
            teamDays = {};
            teams.forEach(t => teamDays[t.id] = new Set());
            success = true;
            
            weekMatches.sort(() => Math.random() - 0.5);
            
            for (let match of weekMatches) {
                let availableDays = [3, 4, 5, 6, 0].filter(d => 
                    !teamDays[match.homeId].has(d) && !teamDays[match.awayId].has(d)
                );
                
                if (availableDays.length === 0) {
                    availableDays = [1, 2].filter(d => !teamDays[match.homeId].has(d) && !teamDays[match.awayId].has(d));
                }
                
                if (availableDays.length === 0) {
                    success = false;
                    break; // Restart attempt
                }
                
                let preferences = {5: 100, 6: 80, 0: 40, 4: 20, 3: 20, 1: 5, 2: 5};
                availableDays.sort((a,b) => (preferences[b] * Math.random()) - (preferences[a] * Math.random()));
                
                let selectedDay = availableDays[0];
                dailySchedule[selectedDay].push(match);
                teamDays[match.homeId].add(selectedDay);
                teamDays[match.awayId].add(selectedDay);
            }
            
            if (success) break;
        }
        
        // If it still failed after 50 attempts (mathematically near impossible), just discard the week
        // to avoid duplicating matches on the same day. This will never hit in normal scenarios.
        if (!success) {
            console.warn("Schedule generation fallback: Week generation failed completely, skipping to next week.");
        }
        
        // 5. Build Schedule array mapping to actual Dates
        for (let d = 0; d < 7; d++) {
            let currentDayOfWeek = currentDate.getDay();
            
            if (dailySchedule[currentDayOfWeek] && dailySchedule[currentDayOfWeek].length > 0) {
                let matchDate = new Date(currentDate);
                
                // Merge if day already exists (e.g. from fallback)
                let existingDay = schedule.find(s => s.date === matchDate.toISOString());
                if (existingDay) {
                    existingDay.matches.push(...dailySchedule[currentDayOfWeek]);
                } else {
                    schedule.push({
                        date: matchDate.toISOString(),
                        matches: dailySchedule[currentDayOfWeek]
                    });
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    return schedule;
}
