// War Card Game Simulation
// Usage: node war-simulation.js [--shuffle] [--no-shuffle] [--games N]
// Default: no-shuffle (traditional), 100 games

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

// Built-in upgrade effects
const upgradeEffects = {
  // +1 per upgrade level to face-up comparison card
  plusOne: (level) => level,
};

// Built-in upgrade triggers
// Each trigger function receives { p1HandWins, p2HandWins, turns, winner }
// and returns { p1Upgrade: bool, p2Upgrade: bool }
const upgradeTriggers = {
  // Upgrade every N wins for the winning player
  everyNWins: (n = 1) => ({ winner }) => ({
    p1Upgrade: winner === 1 && (n === 1 || false),
    p2Upgrade: winner === 2 && (n === 1 || false),
  }),
  // More general: upgrade player 1 every N of their wins
  p1EveryNWins: (n = 1) => {
    let count = 0;
    return ({ winner }) => {
      if (winner === 1) count++;
      return { p1Upgrade: winner === 1 && count % n === 0, p2Upgrade: false };
    };
  },
  // Upgrade every N turns (regardless of who won)
  everyNTurns: (n) => ({ turns }) => ({
    p1Upgrade: turns % n === 0,
    p2Upgrade: false,
  }),
};

// ============================================================
// UPGRADE CARD SYSTEM
// ============================================================

const RARITY_WEIGHTS = {
  common: 0.60,
  rare: 0.30,
  epic: 0.10,
};

const UPGRADE_CATALOG = [
  // Common: temporary bonuses, shuffles, rank boosts
  { id: 'temp1',           name: '+1 Next Round',    rarity: 'common', type: 'temp',   value: 1 },
  { id: 'temp2',           name: '+2 Next Round',    rarity: 'common', type: 'temp',   value: 2 },
  { id: 'temp3',           name: '+3 Next Round',    rarity: 'common', type: 'temp',   value: 3 },
  { id: 'shuffleSelf',     name: 'Shuffle Deck',     rarity: 'common', type: 'action' },
  { id: 'shuffleOpponent', name: 'Shuffle Enemy',    rarity: 'common', type: 'action' },
  { id: 'rankBoost',       name: 'Rank Boost',       rarity: 'common', type: 'rankBoost' },
  // Rare: steal, best-to-top, double play
  { id: 'stealCard',       name: 'Steal Card',       rarity: 'rare',   type: 'action' },
  { id: 'bestToTop',       name: 'Best to Top',      rarity: 'rare',   type: 'action' },
  { id: 'doublePlay',      name: 'Double Play',      rarity: 'rare',   type: 'doublePlay' },
  // Epic: permanent +1, faster upgrades, extra option
  { id: 'plus1perm',       name: '+1 Permanent',     rarity: 'epic',   type: 'bonus',  value: 1 },
  { id: 'reduceReq',       name: 'Faster Upgrades',  rarity: 'epic',   type: 'meta' },
  { id: 'extraOption',     name: 'Extra Option',     rarity: 'epic',   type: 'meta' },
];

// Roll a random upgrade based on rarity weights
function rollUpgrade() {
  const roll = Math.random();
  let targetRarity;
  if (roll < RARITY_WEIGHTS.epic) {
    targetRarity = 'epic';
  } else if (roll < RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) {
    targetRarity = 'rare';
  } else {
    targetRarity = 'common';
  }
  const pool = UPGRADE_CATALOG.filter(u => u.rarity === targetRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Roll N distinct upgrade options (re-rolls duplicates)
function rollUpgradeOptions(count) {
  const options = [];
  const seenIds = new Set();
  let attempts = 0;
  while (options.length < count && attempts < 50) {
    const u = rollUpgrade();
    if (!seenIds.has(u.id)) {
      options.push(u);
      seenIds.add(u.id);
    }
    attempts++;
  }
  return options;
}

// Default AI strategy: prioritize by rarity tier, then by value for bonus types
const RARITY_RANK = { epic: 3, rare: 2, common: 1 };

function defaultUpgradeStrategy(options, _state) {
  return options.reduce((best, opt) => {
    const bestRank = RARITY_RANK[best.rarity];
    const optRank = RARITY_RANK[opt.rarity];
    if (optRank > bestRank) return opt;
    if (optRank === bestRank && opt.type === 'bonus' && best.type === 'bonus' && opt.value > best.value) return opt;
    if (optRank === bestRank && opt.type === 'temp' && best.type === 'temp' && opt.value > best.value) return opt;
    return best;
  });
}

// Compute the effective value of a card given the player's state
function cardValue(baseRank, state) {
  const rankBonus = state.rankBonuses[baseRank] || 0;
  const tempBonus = state.tempBonus || 0;
  return baseRank + state.p1Bonus + rankBonus + tempBonus;
}

// Apply a chosen upgrade to the game state
function applyUpgrade(upgrade, state) {
  switch (upgrade.id) {
    case 'plus1perm':
      state.p1Bonus += 1;
      break;
    case 'temp1':
    case 'temp2':
    case 'temp3':
      state.tempBonus += upgrade.value;
      break;
    case 'shuffleSelf':
      shuffle(state.p1);
      break;
    case 'shuffleOpponent':
      shuffle(state.p2);
      break;
    case 'stealCard':
      if (state.p2.length > 1) {
        const idx = Math.floor(Math.random() * state.p2.length);
        const stolen = state.p2.splice(idx, 1)[0];
        state.p1.push(stolen);
      }
      break;
    case 'bestToTop': {
      let bestIdx = 0;
      for (let i = 1; i < state.p1.length; i++) {
        if (state.p1[i] > state.p1[bestIdx]) bestIdx = i;
      }
      if (bestIdx > 0) {
        const best = state.p1.splice(bestIdx, 1)[0];
        state.p1.unshift(best);
      }
      break;
    }
    case 'rankBoost': {
      // Pick a random rank (2-14) and permanently boost it by 1
      const rank = state.rankBoostTarget != null
        ? state.rankBoostTarget  // allow tests to override
        : Math.floor(Math.random() * 13) + 2;
      state.rankBonuses[rank] = (state.rankBonuses[rank] || 0) + 1;
      // Store for result tracking
      upgrade = { ...upgrade, boostedRank: rank };
      break;
    }
    case 'doublePlay':
      state.doublePlayNext = true;
      break;
    case 'reduceReq':
      state.winsRequired = Math.max(1, state.winsRequired - 1);
      break;
    case 'extraOption':
      state.upgradeOptionCount++;
      break;
  }
  return upgrade;
}

function playWarGame(options = {}) {
  const {
    p1Hand,
    p2Hand,
    shufflePot = false,
    maxTurns = 50000,
    upgrade = null, // Legacy: { trigger: fn, effect: fn }
    // New upgrade card system
    upgradeCards = null, // { winsRequired, optionCount, strategy, upgradeRoller } or true for defaults
  } = options;

  let p1, p2;
  if (p1Hand && p2Hand) {
    p1 = [...p1Hand];
    p2 = [...p2Hand];
  } else {
    const deck = shuffle(createDeck());
    p1 = deck.slice(0, 26);
    p2 = deck.slice(26);
  }

  let turns = 0, wars = 0, doubleWars = 0, tripleWars = 0;
  let p1Streak = 0, p2Streak = 0, p1MaxStreak = 0, p2MaxStreak = 0;
  let p1MaxLead = 0, p2MaxLead = 0, leadChanges = 0, lastLeader = 0;
  let warEndedGame = false;
  let p1HandWins = 0, p2HandWins = 0;
  let p1UpgradeLevel = 0, p2UpgradeLevel = 0;
  let p1TotalUpgrades = 0, p2TotalUpgrades = 0;

  // Upgrade card system state
  const useUpgradeCards = upgradeCards !== null;
  const ucConfig = useUpgradeCards
    ? (upgradeCards === true ? {} : upgradeCards)
    : {};
  const ucState = {
    p1: p1,
    p2: p2,
    p1Bonus: 0,
    rankBonuses: {},      // { rank: bonus } e.g. { 5: 1, 9: 2 }
    tempBonus: 0,         // bonus that applies to next round only, then resets
    doublePlayNext: false, // if true, next turn is a double-play turn
    winsRequired: (ucConfig.winsRequired != null) ? ucConfig.winsRequired : 5,
    upgradeOptionCount: (ucConfig.optionCount != null) ? ucConfig.optionCount : 2,
    winsSinceLastUpgrade: 0,
    upgradesChosen: [],
  };
  const ucStrategy = ucConfig.strategy || defaultUpgradeStrategy;
  const ucRoller = ucConfig.upgradeRoller || rollUpgradeOptions;

  // Helper: compute p1's effective card value using all bonuses
  function p1CardValue(baseRank) {
    if (!useUpgradeCards) return baseRank;
    return baseRank + ucState.p1Bonus + (ucState.rankBonuses[baseRank] || 0) + ucState.tempBonus;
  }

  while (p1.length > 0 && p2.length > 0 && turns < maxTurns) {
    turns++;

    // ── DOUBLE PLAY TURN ──
    // Player plays 2 cards, opponent plays 1. Opponent must beat BOTH to win.
    if (useUpgradeCards && ucState.doublePlayNext) {
      ucState.doublePlayNext = false;
      if (p1.length >= 2) {
        const p1a_raw = p1.shift();
        const p1b_raw = p1.shift();
        const p2c_raw = p2.shift();
        const p1a = p1CardValue(p1a_raw);
        const p1b = p1CardValue(p1b_raw);
        const p2c = p2c_raw; // opponent gets no bonuses

        let turnWinner;
        if (p2c > p1a && p2c > p1b) {
          // Opponent beats both — opponent takes all 3
          p2.push(p2c_raw, p1a_raw, p1b_raw);
          p2HandWins++;
          p2Streak++; p1Streak = 0;
          turnWinner = 2;
        } else {
          // Player wins (at least one card wasn't beaten)
          p1.push(p1a_raw, p1b_raw, p2c_raw);
          p1HandWins++;
          p1Streak++; p2Streak = 0;
          turnWinner = 1;
        }

        // Clear temp bonus after double-play turn
        ucState.tempBonus = 0;

        // Check upgrade trigger
        if (turnWinner === 1) {
          ucState.winsSinceLastUpgrade++;
          if (ucState.winsSinceLastUpgrade >= ucState.winsRequired) {
            ucState.winsSinceLastUpgrade = 0;
            const opts = ucRoller(ucState.upgradeOptionCount);
            if (opts.length > 0) {
              const chosen = ucStrategy(opts, ucState);
              const applied = applyUpgrade(chosen, ucState);
              ucState.upgradesChosen.push(applied);
              p1TotalUpgrades++;
            }
          }
        }

        if (p1Streak > p1MaxStreak) p1MaxStreak = p1Streak;
        if (p2Streak > p2MaxStreak) p2MaxStreak = p2Streak;
        const diff = p1.length - p2.length;
        if (diff > p1MaxLead) p1MaxLead = diff;
        if (-diff > p2MaxLead) p2MaxLead = -diff;
        const currentLeader = diff > 0 ? 1 : diff < 0 ? 2 : 0;
        if (currentLeader !== 0 && lastLeader !== 0 && currentLeader !== lastLeader) leadChanges++;
        if (currentLeader !== 0) lastLeader = currentLeader;
        continue;
      }
      // If p1 doesn't have 2 cards, fall through to normal turn
    }

    // ── NORMAL TURN ──
    const p1Cards = [];
    const p2Cards = [];

    let c1raw = p1.shift();
    let c2raw = p2.shift();
    p1Cards.push(c1raw);
    p2Cards.push(c2raw);

    // Apply upgrade bonus to face-up comparison cards only
    let c1, c2;
    if (useUpgradeCards) {
      c1 = p1CardValue(c1raw);
      c2 = c2raw;
    } else {
      const p1Bonus = upgrade ? upgrade.effect(p1UpgradeLevel) : 0;
      const p2Bonus = upgrade ? upgrade.effect(p2UpgradeLevel) : 0;
      c1 = c1raw + p1Bonus;
      c2 = c2raw + p2Bonus;
    }

    // Clear temp bonus after it's been applied this turn
    if (useUpgradeCards) {
      ucState.tempBonus = 0;
    }

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
      c1raw = p1.shift();
      c2raw = p2.shift();
      p1Cards.push(c1raw);
      p2Cards.push(c2raw);
      if (useUpgradeCards) {
        // temp bonus already cleared; rank+permanent bonuses still apply in war
        c1 = c1raw + ucState.p1Bonus + (ucState.rankBonuses[c1raw] || 0);
        c2 = c2raw;
      } else {
        const p1Bonus = upgrade ? upgrade.effect(p1UpgradeLevel) : 0;
        const p2Bonus = upgrade ? upgrade.effect(p2UpgradeLevel) : 0;
        c1 = c1raw + p1Bonus;
        c2 = c2raw + p2Bonus;
      }
    }

    if (warEndedGame) break;

    let turnWinner;
    if (shufflePot) {
      const pot = [...p1Cards, ...p2Cards];
      shuffle(pot);
      if (c1 > c2) {
        p1.push(...pot);
        p1HandWins++;
        p1Streak++; p2Streak = 0;
        turnWinner = 1;
      } else {
        p2.push(...pot);
        p2HandWins++;
        p2Streak++; p1Streak = 0;
        turnWinner = 2;
      }
    } else {
      if (c1 > c2) {
        p1.push(...p1Cards, ...p2Cards);
        p1HandWins++;
        p1Streak++; p2Streak = 0;
        turnWinner = 1;
      } else {
        p2.push(...p2Cards, ...p1Cards);
        p2HandWins++;
        p2Streak++; p1Streak = 0;
        turnWinner = 2;
      }
    }

    // Upgrade card system: check if player earned an upgrade
    if (useUpgradeCards && turnWinner === 1) {
      ucState.winsSinceLastUpgrade++;
      if (ucState.winsSinceLastUpgrade >= ucState.winsRequired) {
        ucState.winsSinceLastUpgrade = 0;
        const opts = ucRoller(ucState.upgradeOptionCount);
        if (opts.length > 0) {
          const chosen = ucStrategy(opts, ucState);
          const applied = applyUpgrade(chosen, ucState);
          ucState.upgradesChosen.push(applied);
          p1TotalUpgrades++;
        }
      }
    }

    // Legacy upgrade trigger
    if (upgrade) {
      const result = upgrade.trigger({ p1HandWins, p2HandWins, turns, winner: turnWinner });
      if (result.p1Upgrade) { p1UpgradeLevel++; p1TotalUpgrades++; }
      if (result.p2Upgrade) { p2UpgradeLevel++; p2TotalUpgrades++; }
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
  const capped = turns >= maxTurns;

  return {
    turns, wars, doubleWars, tripleWars,
    p1MaxStreak, p2MaxStreak,
    p1MaxLead, p2MaxLead,
    leadChanges, winner, capped, warEndedGame,
    p1HandWins, p2HandWins,
    p1Remaining: p1.length,
    p2Remaining: p2.length,
    p1UpgradeLevel: useUpgradeCards ? ucState.p1Bonus : p1UpgradeLevel,
    p2UpgradeLevel, p1TotalUpgrades, p2TotalUpgrades,
    // New upgrade card stats
    ...(useUpgradeCards ? {
      upgradesChosen: ucState.upgradesChosen,
      finalWinsRequired: ucState.winsRequired,
      finalOptionCount: ucState.upgradeOptionCount,
      rankBonuses: { ...ucState.rankBonuses },
    } : {}),
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

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDeck, shuffle, playWarGame, percentile, stddev,
    upgradeEffects, upgradeTriggers,
    UPGRADE_CATALOG, RARITY_WEIGHTS, RARITY_RANK,
    rollUpgrade, rollUpgradeOptions,
    defaultUpgradeStrategy, applyUpgrade, cardValue,
  };
}

// Only run simulation when executed directly (not when required by tests)
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  const NUM_GAMES = (() => {
    const idx = args.indexOf('--games');
    return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1]) : 100;
  })();
  const SHUFFLE_POT = args.includes('--shuffle');
  const MAX_TURNS = 50000;

  const results = [];
  for (let i = 0; i < NUM_GAMES; i++) results.push(playWarGame({ shufflePot: SHUFFLE_POT, maxTurns: MAX_TURNS }));

  const turns = results.map(r => r.turns);
  const warCounts = results.map(r => r.wars);
  const avgTurns = turns.reduce((a, b) => a + b, 0) / NUM_GAMES;
  const avgWars = warCounts.reduce((a, b) => a + b, 0) / NUM_GAMES;
  const allP1Streaks = results.map(r => r.p1MaxStreak);
  const allP2Streaks = results.map(r => r.p2MaxStreak);
  const allMaxStreaks = results.map(r => Math.max(r.p1MaxStreak, r.p2MaxStreak));
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
}
