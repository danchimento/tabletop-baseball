// ============================================================
// config.js — Constants & Configuration
// ============================================================

const BATTERS = [
  { name: 'Speedy',  profile: 'Contact', baseDice: 3, powerDice: 2 },
  { name: 'Steady',  profile: 'Average', baseDice: 2, powerDice: 2 },
  { name: 'Slugger', profile: 'Star',    baseDice: 4, powerDice: 3 },
  { name: 'Crusher', profile: 'Power',   baseDice: 2, powerDice: 4 },
  { name: 'Rookie',  profile: 'Weak',    baseDice: 2, powerDice: 2 },
];

let PITCHER_DICE_COUNT = 2;
let BATTER_DICE_COUNT = 2;

// Outcome bar thresholds (value-based, 0 in center)
// Zones: Strike (left) | Ball (middle) | Contact (far right)
// No fouls in this version
let THRESHOLDS = {
  hit: 7,       // >= this is contact
  ball: 0,      // >= this and < hit is ball
  strike: 0,    // < ball is strike
};

const DIE_DOTS = {
  1: [0,0,0, 0,1,0, 0,0,0],
  2: [0,0,1, 0,0,0, 1,0,0],
  3: [0,0,1, 0,1,0, 1,0,0],
  4: [1,0,1, 0,0,0, 1,0,1],
  5: [1,0,1, 0,1,0, 1,0,1],
  6: [1,0,1, 1,0,1, 1,0,1],
};

// Power roll mapping: die value -> points scored
const POWER_MAP = {
  1: 0,
  2: 0,
  3: 1,
  4: 1,
  5: 3,
  6: 3,
};

const MAX_BALLS = 3;
const MAX_STRIKES = 3;

// ~50% faster spin
const SPIN_INTERVALS = [25,25,25,30,30,35,40,45,55,70,90,120,160];

const OUTS_PER_INNING = 3;
const PITCH_CLOCK_SECONDS = 3;
