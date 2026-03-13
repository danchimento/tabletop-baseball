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
// Positive = batter side, negative = pitcher side
let THRESHOLDS = {
  hit: 7,       // >= this is a hit
  ball: 3,      // >= this and < hit is ball
  foulMin: -3,  // >= this and < ball is foul
  strike: -3,   // < foulMin is strike (i.e. <= strike threshold)
};

const DIE_DOTS = {
  1: [0,0,0, 0,1,0, 0,0,0],
  2: [0,0,1, 0,0,0, 1,0,0],
  3: [0,0,1, 0,1,0, 1,0,0],
  4: [1,0,1, 0,0,0, 1,0,1],
  5: [1,0,1, 0,1,0, 1,0,1],
  6: [1,0,1, 1,0,1, 1,0,1],
};

const CONTACT_MAP = {
  2:  { outcome: 'ground_out', label: 'Ground Out' },
  3:  { outcome: 'ground_out', label: 'Ground Out' },
  4:  { outcome: 'ground_out', label: 'Ground Out' },
  5:  { outcome: 'ground_out', label: 'Fly Out' },
  6:  { outcome: 'ground_out', label: 'Fly Out' },
  7:  { outcome: 'ground_out', label: 'Fly Out' },
  8:  { outcome: 'single',     label: 'Single!' },
  9:  { outcome: 'single',     label: 'Single!' },
  10: { outcome: 'double',     label: 'Double!' },
  11: { outcome: 'double',     label: 'Double!' },
  12: { outcome: 'home_run',   label: 'HOME RUN!' },
};

const FIELD_POSITIONS = {
  2:  { x: 43.3, y: 82.1 },
  3:  { x: 50.0, y: 77.9 },
  4:  { x: 56.7, y: 82.1 },
  5:  { x: 28.3, y: 63.6 },
  6:  { x: 50.0, y: 56.4 },
  7:  { x: 71.7, y: 63.6 },
  8:  { x: 36.7, y: 71.4 },
  9:  { x: 63.3, y: 71.4 },
  10: { x: 19.3, y: 55.4 },
  11: { x: 80.7, y: 55.4 },
  12: { x: 50.0, y: 33.9 },
};

// ~50% faster spin
const SPIN_INTERVALS = [25,25,25,30,30,35,40,45,55,70,90,120,160];

const OUTS_PER_INNING = 3;
const PITCH_CLOCK_SECONDS = 3;
