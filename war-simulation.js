// War Card Game Simulation
// Usage: node war-simulation.js [--shuffle] [--no-shuffle] [--games N]
// Default: no-shuffle (traditional), 100 games

const args = process.argv.slice(2);
const NUM_GAMES = (() => {
  const idx = args.indexOf('--games');
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1]) : 100;
})();
const SHUFFLE_POT = args.includes('--shuffle');
const MAX_TURNS = 50000;

function createDeck() {
  const deck = [];
  for (let rank = 2; rank <= 14; rank++) {
    for (let s = 0; s < 4; s++) deck.push(rank);
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playWarGame() {
  const deck = shuffle(createDeck());
  const p1 = deck.slice(0, 26);
  const p2 = deck.slice(26);

  let turns = 0, wars = 0, doubleWars = 0, tripleWars = 0;
  let p1Streak = 0, p2Streak = 0, p1MaxStreak = 0, p2MaxStreak = 0;
  let p1MaxLead = 0, p2MaxLead = 0, leadChanges = 0, lastLeader = 0;
  let warEndedGame = false;
  let p1HandWins = 0, p2HandWins = 0;

  while (p1.length > 0 && p2.length > 0 && turns < MAX_TURNS) {
    turns++;
    const p1Cards = [];
    const p2Cards = [];

    let c1 = p1.shift();
    let c2 = p2.shift();
    p1Cards.push(c1);
    p2Cards.push(c2);

    let consecutiveWars = 0;

    while (c1 === c2) {
      wars++;
      consecutiveWars++;
      if (consecutiveWars === 2) doubleWars++;
      if (consecutiveWars === 3) tripleWars++;

      if (p1.length < 4 || p2.length < 4) {
        warEndedGame = true;
        if (p1.length < p2.length) {
          p2.push(...p1Cards, ...p2Cards, ...p1.splice(0));
        } else {
          p1.push(...p1Cards, ...p2Cards, ...p2.splice(0));
        }
        break;
      }

      for (let i = 0; i < 3; i++) {
        p1Cards.push(p1.shift());
        p2Cards.push(p2.shift());
      }
      c1 = p1.shift();
      c2 = p2.shift();
      p1Cards.push(c1);
      p2Cards.push(c2);
    }

    if (warEndedGame) break;

    if (SHUFFLE_POT) {
      const pot = [...p1Cards, ...p2Cards];
      shuffle(pot);
      if (c1 > c2) {
        p1.push(...pot);
        p1HandWins++;
        p1Streak++; p2Streak = 0;
      } else {
        p2.push(...pot);
        p2HandWins++;
        p2Streak++; p1Streak = 0;
      }
    } else {
      if (c1 > c2) {
        p1.push(...p1Cards, ...p2Cards);
        p1HandWins++;
        p1Streak++; p2Streak = 0;
      } else {
        p2.push(...p2Cards, ...p1Cards);
        p2HandWins++;
        p2Streak++; p1Streak = 0;
      }
    }

    if (p1Streak > p1MaxStreak) p1MaxStreak = p1Streak;
    if (p2Streak > p2MaxStreak) p2MaxStreak = p2Streak;

    const diff = p1.length - p2.length;
    if (diff > p1MaxLead) p1MaxLead = diff;
    if (-diff > p2MaxLead) p2MaxLead = -diff;

    const currentLeader = diff > 0 ? 1 : diff < 0 ? 2 : 0;
    if (currentLeader !== 0 && lastLeader !== 0 && currentLeader !== lastLeader) {
      leadChanges++;
    }
    if (currentLeader !== 0) lastLeader = currentLeader;
  }

  const winner = p1.length > p2.length ? 1 : 2;
  const capped = turns >= MAX_TURNS;

  return {
    turns, wars, doubleWars, tripleWars,
    p1MaxStreak, p2MaxStreak,
    p1MaxLead, p2MaxLead,
    leadChanges, winner, capped, warEndedGame,
    p1HandWins, p2HandWins
  };
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stddev(arr, mean) {
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
}

// Run simulation
const results = [];
for (let i = 0; i < NUM_GAMES; i++) results.push(playWarGame());

const turns = results.map(r => r.turns);
const warCounts = results.map(r => r.wars);
const avgTurns = turns.reduce((a, b) => a + b, 0) / NUM_GAMES;
const avgWars = warCounts.reduce((a, b) => a + b, 0) / NUM_GAMES;
const allP1Streaks = results.map(r => r.p1MaxStreak);
const allP2Streaks = results.map(r => r.p2MaxStreak);
const allMaxStreaks = results.map(r => Math.max(r.p1MaxStreak, r.p2MaxStreak));
const allP1Leads = results.map(r => r.p1MaxLead);
const allP2Leads = results.map(r => r.p2MaxLead);
const allMaxLeads = results.map(r => Math.max(r.p1MaxLead, r.p2MaxLead));
const allLeadChanges = results.map(r => r.leadChanges);

const mode = SHUFFLE_POT ? 'SHUFFLE (won cards shuffled)' : 'TRADITIONAL (won cards in order)';

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          WAR CARD GAME SIMULATION RESULTS               ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  Mode:  ' + mode.padEnd(48) + '║');
console.log('║  Games: ' + NUM_GAMES.toString().padEnd(48) + '║');
console.log('║  Turn cap: ' + MAX_TURNS.toString().padEnd(45) + '║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║                                                        ║');
console.log('║  GAME LENGTH (TURNS)                                   ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
console.log('║  Average:          ' + avgTurns.toFixed(1).padStart(8) + '                              ║');
console.log('║  Median:           ' + percentile(turns, 50).toFixed(1).padStart(8) + '                              ║');
console.log('║  Std Deviation:    ' + stddev(turns, avgTurns).toFixed(1).padStart(8) + '                              ║');
console.log('║  Min:              ' + Math.min(...turns).toString().padStart(8) + '                              ║');
console.log('║  Max:              ' + Math.max(...turns).toString().padStart(8) + '                              ║');
console.log('║  25th Percentile:  ' + percentile(turns, 25).toFixed(1).padStart(8) + '                              ║');
console.log('║  75th Percentile:  ' + percentile(turns, 75).toFixed(1).padStart(8) + '                              ║');
console.log('║  90th Percentile:  ' + percentile(turns, 90).toFixed(1).padStart(8) + '                              ║');
console.log('║                                                        ║');
console.log('║  WARS (TIES)                                           ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
console.log('║  Avg wars/game:    ' + avgWars.toFixed(1).padStart(8) + '                              ║');
console.log('║  Avg wars/turn:    ' + (avgWars / avgTurns * 100).toFixed(2).padStart(7) + '%                              ║');
console.log('║  Min wars:         ' + Math.min(...warCounts).toString().padStart(8) + '                              ║');
console.log('║  Max wars:         ' + Math.max(...warCounts).toString().padStart(8) + '                              ║');
console.log('║  Double wars:      ' + results.reduce((s, r) => s + r.doubleWars, 0).toString().padStart(8) + '  (total across all games)    ║');
console.log('║  Triple+ wars:     ' + results.reduce((s, r) => s + r.tripleWars, 0).toString().padStart(8) + '  (total across all games)    ║');
console.log('║                                                        ║');
console.log('║  WINNING STREAKS                                       ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
console.log('║  Avg longest streak (either player): ' + (allMaxStreaks.reduce((a, b) => a + b, 0) / NUM_GAMES).toFixed(1).padStart(5) + '             ║');
console.log('║  Max streak seen:  ' + Math.max(...allMaxStreaks).toString().padStart(8) + '                              ║');
console.log('║  Avg P1 best streak:' + (allP1Streaks.reduce((a, b) => a + b, 0) / NUM_GAMES).toFixed(1).padStart(7) + '                              ║');
console.log('║  Avg P2 best streak:' + (allP2Streaks.reduce((a, b) => a + b, 0) / NUM_GAMES).toFixed(1).padStart(7) + '                              ║');
console.log('║                                                        ║');
console.log('║  CARD ADVANTAGE (LARGEST LEAD)                         ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
console.log('║  Avg max lead:     ' + (allMaxLeads.reduce((a, b) => a + b, 0) / NUM_GAMES).toFixed(1).padStart(8) + ' cards                        ║');
console.log('║  Biggest lead seen:' + Math.max(...allMaxLeads).toString().padStart(8) + ' cards                        ║');
console.log('║                                                        ║');
console.log('║  LEAD CHANGES                                          ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
console.log('║  Avg lead changes: ' + (allLeadChanges.reduce((a, b) => a + b, 0) / NUM_GAMES).toFixed(1).padStart(8) + '                              ║');
console.log('║  Min lead changes: ' + Math.min(...allLeadChanges).toString().padStart(8) + '                              ║');
console.log('║  Max lead changes: ' + Math.max(...allLeadChanges).toString().padStart(8) + '                              ║');
console.log('║                                                        ║');
console.log('║  GAME OUTCOMES                                         ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
const p1WinCount = results.filter(r => r.winner === 1).length;
const p2WinCount = results.filter(r => r.winner === 2).length;
console.log('║  Player 1 wins:    ' + (p1WinCount + '%').padStart(8) + '                              ║');
console.log('║  Player 2 wins:    ' + (p2WinCount + '%').padStart(8) + '                              ║');
console.log('║  Games ended by war (insufficient cards): ' + results.filter(r => r.warEndedGame).length.toString().padStart(3) + '          ║');
console.log('║  Games hitting ' + MAX_TURNS + ' turn cap:           ' + results.filter(r => r.capped).length.toString().padStart(3) + '          ║');
console.log('║                                                        ║');
console.log('║  TURN DISTRIBUTION (HAND WINS, EXCL. WARS)             ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
const avgP1HandWins = results.reduce((s, r) => s + r.p1HandWins, 0) / NUM_GAMES;
const avgP2HandWins = results.reduce((s, r) => s + r.p2HandWins, 0) / NUM_GAMES;
console.log('║  Avg hands won by P1: ' + avgP1HandWins.toFixed(1).padStart(6) + '                           ║');
console.log('║  Avg hands won by P2: ' + avgP2HandWins.toFixed(1).padStart(6) + '                           ║');
console.log('║                                                        ║');
console.log('║  GAME LENGTH DISTRIBUTION                              ║');
console.log('║  ─────────────────────────────────────────────────────  ║');
const buckets = [50, 100, 200, 300, 500, 750, 1000, 2000, 5000, 10000, 50000];
let prev = 0;
for (const b of buckets) {
  const count = turns.filter(t => t > prev && t <= b).length;
  if (count > 0) {
    const bar = '\u2588'.repeat(Math.min(count, 30));
    const label = (prev + 1 + '-' + b).padEnd(11);
    console.log('║  ' + label + ' ' + bar + ' ' + count.toString().padStart(2) + (count === 1 ? ' game ' : ' games').padEnd(33 - Math.min(count, 30)) + '║');
  }
  prev = b;
}
console.log('║                                                        ║');
console.log('╚══════════════════════════════════════════════════════════╝');
