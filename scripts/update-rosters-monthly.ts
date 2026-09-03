import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const OHL_TEAMS = [
  { id: 2, name: 'Kingston Frontenacs', abbr: 'KGN' },
  { id: 4, name: 'Oshawa Generals', abbr: 'OSH' },
  { id: 5, name: 'Ottawa 67\'s', abbr: 'OTT' },
  { id: 6, name: 'Peterborough Petes', abbr: 'PBO' },
  { id: 7, name: 'Barrie Colts', abbr: 'BAR' },
  { id: 9, name: 'Guelph Storm', abbr: 'GUE' },
  { id: 10, name: 'Kitchener Rangers', abbr: 'KIT' },
  { id: 11, name: 'London Knights', abbr: 'LDN' },
  { id: 12, name: 'Sudbury Wolves', abbr: 'SBY' },
  { id: 13, name: 'Owen Sound Attack', abbr: 'OS' },
  { id: 14, name: 'Windsor Spitfires', abbr: 'WSR' },
  { id: 15, name: 'Sarnia Sting', abbr: 'SAR' },
  { id: 16, name: 'Soo Greyhounds', abbr: 'SOO' },
  { id: 18, name: 'Brampton Steelheads', abbr: 'BRAM' },
  { id: 19, name: 'Niagara IceDogs', abbr: 'NIA' },
  { id: 20, name: 'Erie Otters', abbr: 'ER' },
  { id: 43, name: 'Saginaw Spirit', abbr: 'SAG' },
  { id: 60, name: 'Flint Firebirds', abbr: 'FLNT' },
  { id: 68, name: 'Brantford Bulldogs', abbr: 'BFD' },
  { id: 77, name: 'North Bay Battalion', abbr: 'NB' }
];

const SEASON_ID = 83; // Current Season ID

async function updateRosters() {
  const jsonPath = path.join(process.cwd(), 'public', 'data', 'ohl_players.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('ohl_players.json not found!');
    return;
  }

  let localPlayers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${localPlayers.length} existing players from local JSON.`);

  console.log('Launching browser to bypass Cloudflare...');
  const browser = await puppeteer.launch({
    headless: true, // Use new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const dataRegex = /data:\s*(\[\[.*?\]\])\s*\}\);/g;

  // Track players found live to remove players who are no longer in the league
  const livePlayerIds = new Set<string>();

  for (const team of OHL_TEAMS) {
    const url = `https://chl.ca/ohl/roster/${team.id}/${SEASON_ID}/`;
    console.log(`\nFetching ${team.name}...`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      // Wait a bit to ensure JS runs and any CF challenges pass
      await new Promise(r => setTimeout(r, 2000)); 

      const html = await page.content();
      
      let match;
      let count = 0;
      let newCount = 0;
      let updatedCount = 0;
      
      while ((match = dataRegex.exec(html)) !== null) {
        try {
          const tableData = JSON.parse(match[1]);
          
          for (const row of tableData) {
            const num = row[0];
            const nameArr = row[2]; // ["img_url", "player_url", "Name, First"]
            const photoUrl = nameArr[0] && nameArr[0].includes('assets') ? nameArr[0] : null;
            const nameSplit = nameArr[2] ? nameArr[2].split(', ') : ['Unknown', 'Unknown'];
            const lastName = nameSplit[0].trim();
            const firstName = nameSplit[1] ? nameSplit[1].trim() : '';
            const fullName = `${firstName} ${lastName}`.trim();
            const pos = row[3];
            const shoots = row[4] || 'L';
            const height = row[5] || '6.00';
            const weight = row[6] || '180';
            const dob = row[7] || '2005-01-01';
            const hometown = row[8] || 'Unknown';
            
            // Stats from Roster might be empty or missing. 
            // Often rosters page doesn't have deep stats, just roster info.
            // If we have stats in the roster table, we can extract them.
            // Usually: row[9] is draft, stats might be on another endpoint?
            // Actually, we'll just extract the basic info from the roster. If there are stats on this page, great, otherwise we just update roster presence.
            
            // Generate a unique key for the player
            const playerKey = `${firstName}-${lastName}-${dob}`.toLowerCase();
            
            // Try to find if this player already exists in our local JSON
            let existingPlayerIndex = localPlayers.findIndex((p: any) => 
              (p.firstName.toLowerCase() === firstName.toLowerCase() && p.lastName.toLowerCase() === lastName.toLowerCase())
            );

            if (existingPlayerIndex >= 0) {
              // Update existing player team
              localPlayers[existingPlayerIndex].teamAbbr = team.abbr;
              localPlayers[existingPlayerIndex].teamId = team.id;
              livePlayerIds.add(localPlayers[existingPlayerIndex].id);
              updatedCount++;
            } else {
              // New Player
              const newId = `new_${Math.random().toString(36).substr(2, 9)}`;
              livePlayerIds.add(newId);
              localPlayers.push({
                id: newId,
                firstName,
                lastName,
                fullName,
                position: pos,
                shootsCatches: shoots,
                height,
                weight,
                dateOfBirth: dob,
                hometown,
                photo: photoUrl,
                teamAbbr: team.abbr,
                teamId: team.id,
                stats: {
                  points: 0,
                  goals: 0,
                  assists: 0,
                  wins: 0,
                  gaa: 0,
                  svPct: 0
                },
                attributes: {} // Base attributes empty, engine can generate them
              });
              newCount++;
            }
            count++;
          }
        } catch (e) {
          console.error(`Error parsing JSON array for ${team.name}`);
        }
      }
      
      console.log(` -> Found ${count} total. Added ${newCount} new, Updated ${updatedCount} existing.`);
      
    } catch (err: any) {
      console.error(`Failed to fetch ${url}:`, err.message);
    }
  }

  // Handle players not found in the live roster (cut/traded out of league)
  let removedCount = 0;
  for (const p of localPlayers) {
    if (!livePlayerIds.has(p.id) && p.teamId !== null) {
      // Mark as free agent / removed
      p.teamId = null;
      p.teamAbbr = 'FA';
      removedCount++;
    }
  }

  await browser.close();

  fs.writeFileSync(jsonPath, JSON.stringify(localPlayers, null, 2));
  console.log(`\nSuccess! Updated ${jsonPath}.`);
  console.log(`Total active players: ${livePlayerIds.size}`);
  console.log(`Players moved to Free Agency: ${removedCount}`);
}

updateRosters().catch(console.error);
