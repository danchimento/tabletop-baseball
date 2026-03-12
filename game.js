// ============================================================
// SECTION A: Constants & Config
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
  ball: 5,      // >= this and < hit is ball
  foulMin: -2,  // >= this and < ball is foul
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
  2:  { x: 42.7, y: 82.9 },
  3:  { x: 51.0, y: 79.3 },
  4:  { x: 58.3, y: 83.9 },
  5:  { x: 27.3, y: 61.4 },
  6:  { x: 50.0, y: 53.6 },
  7:  { x: 72.7, y: 61.4 },
  8:  { x: 36.0, y: 70.7 },
  9:  { x: 64.0, y: 70.7 },
  10: { x: 17.3, y: 52.9 },
  11: { x: 82.7, y: 52.9 },
  12: { x: 50.0, y: 30.4 },
};

// ~50% faster spin
const SPIN_INTERVALS = [25,25,25,30,30,35,40,45,55,70,90,120,160];

const OUTS_PER_INNING = 3;
const PITCH_CLOCK_SECONDS = 3;

// ============================================================
// SECTION B: State
// ============================================================

let state = {};
let pitchClockTimer = null;

function freshState() {
  return {
    outs: 0,
    score: 0,
    runners: [false, false, false],
    currentBatterIndex: 0,
    count: { balls: 0, strikes: 0 },
    phase: 'PRE_PITCH',
    pitcherDice: [],
    batterDice: [],
    battleResults: [],
    pitchCount: 0,
    atBatResult: null,
    gameLog: [],
  };
}

// ============================================================
// SECTION C: Utility
// ============================================================

const $ = (id) => document.getElementById(id);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function dieFaceHTML(value) {
  const dots = DIE_DOTS[value] || DIE_DOTS[1];
  return dots.map(d => d ? '<span class="dot"></span>' : '<span></span>').join('');
}

function createDieElement(colorClass) {
  const die = document.createElement('div');
  die.className = `die-face ${colorClass}`;
  die.innerHTML = dieFaceHTML(1);
  return die;
}

// ============================================================
// SECTION D: Dice Animation
// ============================================================

function spinDie(element, finalValue) {
  return new Promise(resolve => {
    let i = 0;
    function tick() {
      if (i >= SPIN_INTERVALS.length) {
        element.innerHTML = dieFaceHTML(finalValue);
        element.dataset.value = finalValue;
        resolve();
        return;
      }
      element.innerHTML = dieFaceHTML(Math.floor(Math.random() * 6) + 1);
      setTimeout(tick, SPIN_INTERVALS[i]);
      i++;
    }
    tick();
  });
}

async function sortDice(side, values) {
  const sorted = [...values].sort((a, b) => b - a);

  // Check if already sorted
  const alreadySorted = values.every((v, i) => v === sorted[i]);
  if (alreadySorted) return sorted;

  const container = $(`${side}-dice`);
  const dice = Array.from(container.children);
  if (dice.length < 2) return sorted;

  // Build a map: for each target position, find which current die goes there
  // Match by value, handling duplicates
  const usedIndices = new Set();
  const targetOrder = sorted.map(targetVal => {
    for (let i = 0; i < values.length; i++) {
      if (!usedIndices.has(i) && values[i] === targetVal) {
        usedIndices.add(i);
        return i;
      }
    }
    return 0;
  });

  // If order hasn't changed, skip
  const needsSwap = targetOrder.some((fromIdx, toIdx) => fromIdx !== toIdx);
  if (!needsSwap) return sorted;

  const h = dice[0].offsetHeight + 8;

  // Animate each die to its target position
  targetOrder.forEach((fromIdx, toIdx) => {
    const offset = (toIdx - fromIdx) * h;
    dice[fromIdx].style.transition = 'transform 0.3s ease-in-out';
    dice[fromIdx].style.transform = `translateY(${offset}px)`;
  });

  await delay(320);

  // Reorder DOM to match sorted order
  targetOrder.forEach(fromIdx => {
    container.appendChild(dice[fromIdx]);
  });

  // Clear transforms
  dice.forEach(d => {
    d.style.transition = 'none';
    d.style.transform = '';
  });

  return sorted;
}

// ============================================================
// SECTION E: Pitch Flow
// ============================================================

async function startPitch() {
  state.phase = 'ANIMATING';
  updateButton();
  clearBattlefield();

  state.pitchCount++;
  stopPitchClock();

  // Create and spin pitcher dice
  const pContainer = $('pitcher-dice');
  const pDice = [];
  const pVals = [];
  for (let i = 0; i < PITCHER_DICE_COUNT; i++) {
    const die = createDieElement('die-red');
    pContainer.appendChild(die);
    pDice.push(die);
    pVals.push(rollD6());
  }

  await Promise.all(pDice.map((d, i) => spinDie(d, pVals[i])));
  await delay(250);

  // Sort pitcher dice (highest first)
  state.pitcherDice = await sortDice('pitcher', pVals);
  await delay(150);

  // Wait for player to press Roll for batter dice
  state.phase = 'BATTER_READY';
  updateButton();
}

async function swingBat() {
  state.phase = 'ANIMATING';
  updateButton();

  // Create and spin batter dice
  const bContainer = $('batter-dice');
  const bDice = [];
  const bVals = [];
  for (let i = 0; i < BATTER_DICE_COUNT; i++) {
    const die = createDieElement('die-green');
    bContainer.appendChild(die);
    bDice.push(die);
    bVals.push(rollD6());
  }

  await Promise.all(bDice.map((d, i) => spinDie(d, bVals[i])));
  await delay(250);

  // Sort batter dice (highest first)
  state.batterDice = await sortDice('batter', bVals);
  await delay(200);

  // Fade out side dice
  Array.from($('pitcher-dice').children).forEach(d => {
    d.style.transition = 'opacity 0.15s';
    d.style.opacity = '0.3';
  });
  Array.from($('batter-dice').children).forEach(d => {
    d.style.transition = 'opacity 0.15s';
    d.style.opacity = '0.3';
  });
  await delay(150);

  // Run battle
  await runBattle();
  await delay(500);

  // Run outcome
  await runOutcome();
}

// ============================================================
// SECTION F: Battle
// ============================================================

async function runBattle() {
  state.battleResults = [];
  const pairs = Math.min(state.pitcherDice.length, state.batterDice.length);

  for (let i = 0; i < pairs; i++) {
    const pVal = state.pitcherDice[i];
    const bVal = state.batterDice[i];
    let winner, color;
    if (bVal > pVal) { winner = 'batter'; color = 'green'; }
    else if (pVal > bVal) { winner = 'pitcher'; color = 'red'; }
    else { winner = 'tie'; color = 'gray'; }

    const winValue = winner === 'batter' ? bVal : winner === 'pitcher' ? pVal : 0;
    state.battleResults.push({ pVal, bVal, winner, color, winValue });

    await animateBattlePair(i, pVal, bVal, winner);
    await delay(400);
  }
}

async function animateBattlePair(index, pVal, bVal, winner) {
  const lane = $(`lane-${index}`);
  if (!lane) return;
  lane.innerHTML = '';

  const pDie = createDieElement('die-red');
  pDie.classList.add('battle-die');
  pDie.innerHTML = dieFaceHTML(pVal);
  pDie.style.left = '-60px';

  const bDie = createDieElement('die-green');
  bDie.classList.add('battle-die');
  bDie.innerHTML = dieFaceHTML(bVal);
  bDie.style.left = `${lane.offsetWidth + 12}px`;

  lane.appendChild(pDie);
  lane.appendChild(bDie);

  await delay(30);

  const center = lane.offsetWidth / 2;
  pDie.style.left = `${center - 52}px`;
  bDie.style.left = `${center + 4}px`;

  await delay(275);

  lane.classList.add('impact-flash');
  await delay(150);
  lane.classList.remove('impact-flash');

  if (winner === 'batter') {
    pDie.classList.add('die-loser');
    await delay(200);
    bDie.style.left = `${center - 24}px`;
    bDie.classList.add('winner-die');
    await delay(150);
  } else if (winner === 'pitcher') {
    bDie.classList.add('die-loser');
    await delay(200);
    pDie.style.left = `${center - 24}px`;
    pDie.classList.add('winner-die');
    await delay(150);
  } else {
    pDie.classList.add('die-loser');
    bDie.classList.add('die-loser');
    await delay(100);

    const grayDie = createDieElement('die-gray');
    grayDie.classList.add('battle-die', 'winner-die');
    grayDie.innerHTML = dieFaceHTML(pVal);
    grayDie.style.left = `${center - 24}px`;
    grayDie.dataset.value = pVal;
    lane.appendChild(grayDie);
    await delay(150);
  }
}

// ============================================================
// SECTION G: Outcome Bar (value-based movement)
// ============================================================

// The bar range: roughly -12 to +12, 0 in the middle
// Position is a pixel percentage on the bar
const BAR_MIN = -12;
const BAR_MAX = 12;
let indicatorValue = 0;

function resetOutcomeBar() {
  indicatorValue = 0;
  updateIndicatorPosition(false);
}

function updateOutcomeBarZones() {
  // Convert threshold values to percentages on the bar
  const toP = v => valueToPercent(v);
  const strikeEnd = toP(THRESHOLDS.foulMin);
  const foulEnd = toP(THRESHOLDS.ball);
  const ballEnd = toP(THRESHOLDS.hit);

  $('ob-track').style.background = `linear-gradient(to right,
    rgba(233,69,96,0.35) 0%,
    rgba(233,69,96,0.2) ${strikeEnd}%,
    rgba(192,160,64,0.2) ${strikeEnd}%,
    rgba(192,160,64,0.15) ${foulEnd}%,
    rgba(76,175,80,0.2) ${foulEnd}%,
    rgba(76,175,80,0.2) ${ballEnd}%,
    rgba(240,192,64,0.25) ${ballEnd}%,
    rgba(240,192,64,0.3) 100%
  )`;

  // Position labels at the center of each zone
  const labels = $('ob-labels');
  const strikeLabel = labels.querySelector('.ob-label-strike');
  const foulLabel = labels.querySelector('.ob-label-foul');
  const ballLabel = labels.querySelector('.ob-label-ball');
  const hitLabel = labels.querySelector('.ob-label-hit');

  labels.style.position = 'relative';
  labels.style.display = 'block';

  [strikeLabel, foulLabel, ballLabel, hitLabel].forEach(l => {
    l.style.position = 'absolute';
    l.style.transform = 'translateX(-50%)';
  });

  strikeLabel.style.left = (strikeEnd / 2) + '%';
  foulLabel.style.left = ((strikeEnd + foulEnd) / 2) + '%';
  ballLabel.style.left = ((foulEnd + ballEnd) / 2) + '%';
  hitLabel.style.left = ((ballEnd + 100) / 2) + '%';
}

function valueToPercent(val) {
  // Clamp value to range
  const clamped = Math.max(BAR_MIN, Math.min(BAR_MAX, val));
  // Map to 0-100%
  return ((clamped - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100;
}

function updateIndicatorPosition(animate) {
  const indicator = $('ob-indicator');
  if (!animate) {
    indicator.style.transition = 'none';
    indicator.offsetWidth;
  } else {
    indicator.style.transition = 'left 0.35s ease-in-out';
  }
  indicator.style.left = valueToPercent(indicatorValue) + '%';
  indicator.classList.remove('ob-shake');
}

async function moveIndicator(newValue) {
  indicatorValue = Math.max(BAR_MIN, Math.min(BAR_MAX, newValue));
  updateIndicatorPosition(true);
  await delay(400);
}

async function shakeIndicator() {
  const ind = $('ob-indicator');
  ind.classList.add('ob-shake');
  await delay(200);
  ind.classList.remove('ob-shake');
}

function determineOutcome(value) {
  if (value >= THRESHOLDS.hit) return 'contact';
  if (value >= THRESHOLDS.ball) return 'ball';
  if (value >= THRESHOLDS.foulMin) return 'foul';
  return 'strike';
}

async function runOutcome() {
  resetOutcomeBar();
  await delay(100);

  for (let i = 0; i < state.battleResults.length; i++) {
    const result = state.battleResults[i];

    await flyDieToBar(i, result.color, result.winValue);

    if (result.color === 'green') {
      await moveIndicator(indicatorValue + result.winValue);
    } else if (result.color === 'red') {
      await moveIndicator(indicatorValue - result.winValue);
    } else {
      await shakeIndicator();
    }
    await delay(300);
  }

  const pitchResult = determineOutcome(indicatorValue);
  await delay(200);
  await processPitchResult(pitchResult);
}

async function flyDieToBar(laneIndex, color, value) {
  const lane = $(`lane-${laneIndex}`);
  if (!lane) return;
  const centerCol = $('center-col');
  const bar = $('ob-track');

  const winnerDie = lane.querySelector('.winner-die');
  if (!winnerDie) return;

  const colRect = centerCol.getBoundingClientRect();
  const dieRect = winnerDie.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();

  const flyDie = createDieElement(`die-${color}`);
  flyDie.classList.add('flying-die');
  flyDie.innerHTML = dieFaceHTML(value);
  flyDie.style.left = (dieRect.left - colRect.left) + 'px';
  flyDie.style.top = (dieRect.top - colRect.top) + 'px';
  flyDie.style.width = '48px';
  flyDie.style.height = '48px';
  centerCol.appendChild(flyDie);

  winnerDie.style.visibility = 'hidden';

  await delay(30);

  flyDie.style.left = (barRect.left - colRect.left + barRect.width / 2 - 24) + 'px';
  flyDie.style.top = (barRect.top - colRect.top) + 'px';
  flyDie.style.transform = 'scale(0.3)';
  flyDie.style.opacity = '0';

  await delay(500);
  flyDie.remove();
}

// ============================================================
// SECTION H: Pitch Result
// ============================================================

async function processPitchResult(result) {
  if (result === 'strike') {
    state.count.strikes++;
    addLog('Strike!');
    updateCount();

    if (state.count.strikes >= 3) {
      await delay(250);
      resolveAtBatEnd('strikeout');
      return;
    }
  } else if (result === 'foul') {
    state.count.strikes = Math.min(state.count.strikes + 1, 2);
    addLog('Foul Ball');
    updateCount();
  } else if (result === 'ball') {
    state.count.balls++;
    addLog('Ball');
    updateCount();

    if (state.count.balls >= 4) {
      await delay(250);
      resolveAtBatEnd('walk');
      return;
    }
  } else if (result === 'contact') {
    addLog('Contact!');
    await delay(300);
    await openContactModal();
    return;
  }

  // Continue at-bat: reset bar and start pitch clock for auto-pitch
  await delay(400);
  resetOutcomeBar();
  clearBattlefield();
  state.phase = 'PRE_PITCH';
  updateButton();
  startPitchClock();
}

// ============================================================
// SECTION I: Contact Modal
// ============================================================

async function openContactModal() {
  state.phase = 'CONTACT';
  updateButton();

  const modal = $('contact-modal');
  modal.classList.remove('hidden');

  $('field-overlay').innerHTML = '';
  $('contact-outcome').textContent = '';
  $('contact-outcome').className = '';
  // Clean up any leftover dice rows from previous contact
  $('contact-wrapper').querySelectorAll('.contact-dice-row').forEach(r => r.remove());

  const rollBtn = $('contact-roll-btn');
  rollBtn.classList.remove('hidden');
  rollBtn.onclick = rollContactDice;
}

async function rollContactDice() {
  $('contact-roll-btn').classList.add('hidden');

  const d1 = rollD6(), d2 = rollD6();
  const sum = d1 + d2;
  const result = CONTACT_MAP[sum];
  const pos = FIELD_POSITIONS[sum];

  const overlay = $('field-overlay');
  const isOut = result.outcome === 'ground_out';
  const isOutfield = sum >= 5 && sum <= 7 || sum >= 10;
  const isHomeRun = result.outcome === 'home_run';

  // Create dice below the field (in contact-wrapper, not field-overlay)
  const wrapper = $('contact-wrapper');
  const diceRow = document.createElement('div');
  diceRow.className = 'contact-dice-row';

  const die1 = createDieElement('die-green');
  die1.classList.add('field-die');
  diceRow.appendChild(die1);

  const die2 = createDieElement('die-green');
  die2.classList.add('field-die');
  diceRow.appendChild(die2);

  // Insert dice row between field and roll button
  wrapper.insertBefore(diceRow, $('contact-roll-btn'));

  // Spin
  await Promise.all([spinDie(die1, d1), spinDie(die2, d2)]);

  // Show dice result for 1 second before ball animation
  await delay(1000);

  // Fade out dice (keep space reserved to prevent layout shift)
  diceRow.style.transition = 'opacity 0.3s';
  diceRow.style.opacity = '0';
  await delay(300);
  diceRow.style.visibility = 'hidden';

  // Create baseball at home plate
  const ball = document.createElement('div');
  ball.className = 'baseball';
  ball.style.left = '48%';
  ball.style.top = '90%';
  ball.style.transform = 'scale(1)';
  overlay.appendChild(ball);

  await delay(50);

  // Fly baseball to target position
  if (isOutfield || isHomeRun) {
    // Outfield: ball "flies" - gets bigger then smaller
    // First half: ball goes up and grows
    const midX = (48 + pos.x) / 2;
    const midY = (90 + pos.y) / 2 - 10;
    ball.style.left = midX + '%';
    ball.style.top = midY + '%';
    ball.style.transition = 'left 0.6s ease-out, top 0.6s ease-out, transform 0.6s ease-out';
    ball.style.transform = 'scale(2.5)';
    await delay(600);

    // Second half: ball descends and shrinks
    ball.style.transition = 'left 0.7s ease-in, top 0.7s ease-in, transform 0.7s ease-in';
    ball.style.left = pos.x + '%';
    ball.style.top = pos.y + '%';
    ball.style.transform = 'scale(0.8)';
    await delay(700);
  } else {
    // Infield: ground ball, direct path
    ball.style.transition = 'left 0.8s ease-out, top 0.8s ease-out, transform 0.8s ease-out';
    ball.style.left = pos.x + '%';
    ball.style.top = pos.y + '%';
    ball.style.transform = 'scale(0.9)';
    await delay(800);
  }

  // If out, replace with X
  if (isOut) {
    ball.remove();
    const marker = document.createElement('div');
    marker.className = 'catch-marker';
    marker.textContent = 'X';
    marker.style.left = pos.x + '%';
    marker.style.top = pos.y + '%';
    overlay.appendChild(marker);
  }

  await delay(200);

  // Show outcome text
  const outcomeEl = $('contact-outcome');
  outcomeEl.textContent = result.label;
  if (result.outcome === 'home_run') {
    outcomeEl.className = 'show outcome-hr result-pop';
  } else if (result.outcome === 'ground_out') {
    outcomeEl.className = 'show outcome-out result-pop';
  } else {
    outcomeEl.className = 'show outcome-hit result-pop';
  }

  addLog(`Contact: ${d1}+${d2}=${sum} — ${result.label}`);
  await delay(1200);

  // Close modal
  $('contact-modal').classList.add('hidden');
  overlay.innerHTML = '';
  outcomeEl.textContent = '';
  outcomeEl.className = '';

  resolveAtBatEnd(result.outcome);
}

// ============================================================
// SECTION J: Base Running & Scoring
// ============================================================

function resolveAtBatEnd(outcome) {
  state.atBatResult = outcome;
  const batter = currentBatter();

  switch (outcome) {
    case 'strikeout':
      state.outs++;
      addLog(`${batter.name} strikes out.`, true);
      break;
    case 'ground_out':
      state.outs++;
      addLog(`${batter.name} grounds out.`, true);
      break;
    case 'walk':
      advanceRunners(1, false);
      state.runners[0] = true;
      addLog(`${batter.name} walks.`, true);
      break;
    case 'single':
      advanceRunners(1, true);
      state.runners[0] = true;
      addLog(`${batter.name} singles!`, true);
      break;
    case 'double':
      advanceRunners(2, true);
      state.runners[1] = true;
      addLog(`${batter.name} doubles!`, true);
      break;
    case 'home_run': {
      let runs = 1;
      for (let i = 0; i < 3; i++) {
        if (state.runners[i]) runs++;
      }
      state.score += runs;
      state.runners = [false, false, false];
      addLog(`${batter.name} hits a HOME RUN! ${runs} run${runs > 1 ? 's' : ''} score!`, true);
      break;
    }
  }

  updateScoreboard();
  updateDiamond();

  if (state.outs >= OUTS_PER_INNING) {
    state.phase = 'INNING_OVER';
    addLog(`--- Inning over. Final score: ${state.score} ---`, true);
    updateButton();
    stopPitchClock();
    return;
  }

  state.phase = 'AT_BAT_RESULT';
  updateButton();
}

function advanceRunners(bases, batterOnBase) {
  const newRunners = [false, false, false];

  for (let i = 2; i >= 0; i--) {
    if (state.runners[i]) {
      const newPos = i + bases;
      if (newPos >= 3) {
        state.score++;
      } else {
        newRunners[newPos] = true;
      }
    }
  }

  if (!batterOnBase) {
    const occupied = [state.runners[0], state.runners[1], state.runners[2]];
    const result = [false, false, false];
    let pushing = true;
    for (let i = 0; i < 3; i++) {
      if (pushing && occupied[i]) {
        if (i + 1 >= 3) {
          state.score++;
        } else {
          result[i + 1] = true;
        }
      } else {
        pushing = false;
        result[i] = occupied[i];
      }
    }
    state.runners = result;
  } else {
    state.runners = newRunners;
  }
}

function nextBatter() {
  state.currentBatterIndex = (state.currentBatterIndex + 1) % BATTERS.length;
  startAtBat();
}

function currentBatter() {
  return BATTERS[state.currentBatterIndex];
}

// ============================================================
// SECTION K: UI Updates
// ============================================================

function updateScoreboard() {
  $('score-display').textContent = `Score: ${state.score}`;
  const dots = Array.from({ length: 3 }, (_, i) => i < state.outs ? '\u25CF' : '\u25CB').join('');
  $('outs-display').innerHTML = `Outs: <span class="out-dots">${dots}</span>`;
  $('inning-display').textContent = 'Top 1st';
}

function updateDiamond() {
  for (let i = 0; i < 3; i++) {
    const base = $(`base-${i + 1}`);
    if (state.runners[i]) {
      base.classList.add('runner-on');
    } else {
      base.classList.remove('runner-on');
    }
  }
}

function updateCount() {
  const balls = Array.from({ length: 4 }, (_, i) =>
    `<span class="${i < state.count.balls ? 'ball-on' : ''}">${i < state.count.balls ? '\u25CF' : '\u25CB'}</span>`
  ).join('');
  const strikes = Array.from({ length: 3 }, (_, i) =>
    `<span class="${i < state.count.strikes ? 'strike-on' : ''}">${i < state.count.strikes ? '\u25CF' : '\u25CB'}</span>`
  ).join('');
  $('balls-dots').innerHTML = balls;
  $('strikes-dots').innerHTML = strikes;
}

function updateBatterName() {
  $('batter-name').textContent = currentBatter().name;
}

function updateButton() {
  const btn = $('action-btn');
  switch (state.phase) {
    case 'PRE_PITCH':
      btn.textContent = 'Pitching...';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'ANIMATING':
      btn.textContent = '...';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'BATTER_READY':
      btn.textContent = 'Roll!';
      btn.disabled = false;
      btn.onclick = () => {
        if (state.phase === 'BATTER_READY') {
          swingBat();
        }
      };
      break;
    case 'CONTACT':
      btn.textContent = '...';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'AT_BAT_RESULT':
      btn.textContent = 'Next Batter';
      btn.disabled = false;
      btn.onclick = nextBatter;
      break;
    case 'INNING_OVER':
      btn.textContent = 'View Summary';
      btn.disabled = false;
      btn.onclick = () => {
        renderSummary();
        $('inning-summary').classList.remove('hidden');
      };
      break;
  }
}

function addLog(text, highlight) {
  state.gameLog.push({ text, highlight: !!highlight });
}

function renderSummary() {
  $('final-score').textContent = `${state.score} Run${state.score !== 1 ? 's' : ''}`;
  $('summary-log').innerHTML = state.gameLog
    .filter(e => e.highlight)
    .map(e => `<div>${e.text}</div>`)
    .join('');
}

function clearBattlefield() {
  $('pitcher-dice').innerHTML = '';
  $('batter-dice').innerHTML = '';
  const lane0 = $('lane-0');
  const lane1 = $('lane-1');
  if (lane0) lane0.innerHTML = '';
  if (lane1) lane1.innerHTML = '';
  document.querySelectorAll('.flying-die').forEach(el => el.remove());
}

// ============================================================
// SECTION L: Pitch Clock
// ============================================================

function startPitchClock() {
  stopPitchClock();
  let secondsLeft = PITCH_CLOCK_SECONDS;
  const timeEl = $('pitch-clock-time');
  const display = $('pitch-clock-display');

  timeEl.textContent = secondsLeft;
  timeEl.classList.remove('urgent');
  display.classList.remove('urgent');

  pitchClockTimer = setInterval(() => {
    secondsLeft--;
    timeEl.textContent = secondsLeft;

    if (secondsLeft <= 3) {
      timeEl.classList.add('urgent');
      display.classList.add('urgent');
    }

    if (secondsLeft <= 0) {
      stopPitchClock();
      // Auto-trigger pitch
      if (state.phase === 'PRE_PITCH') {
        startPitch();
      }
    }
  }, 1000);
}

function stopPitchClock() {
  if (pitchClockTimer) {
    clearInterval(pitchClockTimer);
    pitchClockTimer = null;
  }
  const timeEl = $('pitch-clock-time');
  const display = $('pitch-clock-display');
  if (timeEl) {
    timeEl.classList.remove('urgent');
  }
  if (display) {
    display.classList.remove('urgent');
  }
}

// ============================================================
// SECTION M: Game Flow
// ============================================================

function startInning() {
  state = freshState();
  addLog('--- Top of the 1st ---');
  startAtBat();
}

function startAtBat() {
  state.count = { balls: 0, strikes: 0 };
  state.pitcherDice = [];
  state.batterDice = [];
  state.battleResults = [];
  state.pitchCount = 0;
  state.atBatResult = null;
  state.phase = 'PRE_PITCH';

  clearBattlefield();
  resetOutcomeBar();
  updateBatterName();
  updateCount();
  updateScoreboard();
  updateDiamond();
  updateButton();

  addLog(`${currentBatter().name} steps up to bat.`);

  // Start pitch clock
  startPitchClock();
}

// ============================================================
// SECTION N: Debug Overlay
// ============================================================

function showError(msg) {
  let box = document.getElementById('error-overlay');
  if (!box) {
    box = document.createElement('div');
    box.id = 'error-overlay';
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;' +
      'background:rgba(200,0,0,0.95);color:#fff;font:12px monospace;padding:8px;z-index:9999;';
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
  line.style.padding = '4px 0';
  line.textContent = msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

window.onerror = function(msg, src, line, col, err) {
  showError(`${msg} (${src}:${line}:${col})`);
};

window.addEventListener('unhandledrejection', function(e) {
  showError('Unhandled promise: ' + (e.reason?.message || e.reason));
});

// ============================================================
// SECTION O: Debug Controls
// ============================================================

function setupDebugControls() {
  // Test hit button
  $('test-hit-btn').addEventListener('click', () => {
    openContactModal();
  });

  // Pitcher dice slider
  const pSlider = $('pitcher-dice-slider');
  pSlider.addEventListener('input', () => {
    PITCHER_DICE_COUNT = parseInt(pSlider.value);
    $('pitcher-dice-count').textContent = pSlider.value;
  });

  // Batter dice slider
  const bSlider = $('batter-dice-slider');
  bSlider.addEventListener('input', () => {
    BATTER_DICE_COUNT = parseInt(bSlider.value);
    $('batter-dice-count').textContent = bSlider.value;
  });

  // Ball threshold
  const ballSlider = $('ball-thresh');
  ballSlider.addEventListener('input', () => {
    THRESHOLDS.ball = parseInt(ballSlider.value);
    $('ball-thresh-val').textContent = ballSlider.value;
    updateOutcomeBarZones();
  });

  // Hit threshold
  const hitSlider = $('hit-thresh');
  hitSlider.addEventListener('input', () => {
    THRESHOLDS.hit = parseInt(hitSlider.value);
    $('hit-thresh-val').textContent = hitSlider.value;
    updateOutcomeBarZones();
  });

  // Foul min
  const foulSlider = $('foul-min');
  foulSlider.addEventListener('input', () => {
    THRESHOLDS.foulMin = parseInt(foulSlider.value);
    $('foul-min-val').textContent = foulSlider.value;
    updateOutcomeBarZones();
  });

  // Strike threshold
  const strikeSlider = $('strike-thresh');
  strikeSlider.addEventListener('input', () => {
    THRESHOLDS.strike = parseInt(strikeSlider.value);
    $('strike-thresh-val').textContent = strikeSlider.value;
    updateOutcomeBarZones();
  });
}

// ============================================================
// SECTION P: Init
// ============================================================

function init() {
  try {
    $('replay-btn').addEventListener('click', () => {
      $('inning-summary').classList.add('hidden');
      startInning();
    });

    setupDebugControls();
    updateOutcomeBarZones();
    startInning();
  } catch (e) {
    showError('init: ' + e.message + ' @ ' + e.stack?.split('\n')[1]);
  }
}

document.addEventListener('DOMContentLoaded', init);
