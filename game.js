// ============================================================
// SECTION A: Constants
// ============================================================

const BATTERS = [
  { name: 'Speedy',  profile: 'Contact', baseDice: 3, powerDice: 2 },
  { name: 'Steady',  profile: 'Average', baseDice: 2, powerDice: 2 },
  { name: 'Slugger', profile: 'Star',    baseDice: 4, powerDice: 3 },
  { name: 'Crusher', profile: 'Power',   baseDice: 2, powerDice: 4 },
  { name: 'Rookie',  profile: 'Weak',    baseDice: 2, powerDice: 2 },
];

const PITCHER_BASE_DICE = 2; // 2v2 for now

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

// Field positions as percentages of the field-view container
// Matches the SVG viewBox (300x280) number marker positions
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

const SPIN_INTERVALS = [50,50,50,60,60,70,80,90,110,140,180,240,320];

const OUTS_PER_INNING = 3;

// ============================================================
// SECTION B: State
// ============================================================

let state = {};

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
  if (sorted[0] === values[0]) return sorted;

  const container = $(`${side}-dice`);
  const dice = Array.from(container.children);
  if (dice.length < 2) return sorted;

  const h = dice[0].offsetHeight + 8;

  dice[0].style.transition = 'transform 0.4s ease-in-out';
  dice[1].style.transition = 'transform 0.4s ease-in-out';
  dice[0].style.transform = `translateY(${h}px)`;
  dice[1].style.transform = `translateY(-${h}px)`;

  await delay(420);

  container.insertBefore(dice[1], dice[0]);
  dice[0].style.transition = 'none';
  dice[1].style.transition = 'none';
  dice[0].style.transform = '';
  dice[1].style.transform = '';

  return sorted;
}

// ============================================================
// SECTION E: Pitch Flow
// ============================================================

async function startPitch() {
  state.phase = 'ANIMATING';
  updateButton();
  clearBattlefield();
  resetOutcomeBar();

  state.pitchCount++;

  // Pitch clock animation
  startPitchClock();

  // Create and spin pitcher dice
  const pContainer = $('pitcher-dice');
  const pDie0 = createDieElement('die-red');
  const pDie1 = createDieElement('die-red');
  pContainer.appendChild(pDie0);
  pContainer.appendChild(pDie1);

  const p0 = rollD6(), p1 = rollD6();
  await Promise.all([spinDie(pDie0, p0), spinDie(pDie1, p1)]);
  await delay(500);

  // Sort pitcher dice (highest first)
  state.pitcherDice = await sortDice('pitcher', [p0, p1]);
  await delay(300);

  // Show swing button
  state.phase = 'BATTER_READY';
  updateButton();
}

async function swingBat() {
  state.phase = 'ANIMATING';
  updateButton();

  // Create and spin batter dice
  const bContainer = $('batter-dice');
  const bDie0 = createDieElement('die-green');
  const bDie1 = createDieElement('die-green');
  bContainer.appendChild(bDie0);
  bContainer.appendChild(bDie1);

  const b0 = rollD6(), b1 = rollD6();
  await Promise.all([spinDie(bDie0, b0), spinDie(bDie1, b1)]);
  await delay(500);

  // Sort batter dice (highest first)
  state.batterDice = await sortDice('batter', [b0, b1]);
  await delay(400);

  // Fade out side dice
  Array.from($('pitcher-dice').children).forEach(d => {
    d.style.transition = 'opacity 0.3s';
    d.style.opacity = '0.3';
  });
  Array.from($('batter-dice').children).forEach(d => {
    d.style.transition = 'opacity 0.3s';
    d.style.opacity = '0.3';
  });
  await delay(300);

  // Run battle
  await runBattle();
  await delay(400);

  // Run outcome bar
  await runOutcome();
}

// ============================================================
// SECTION F: Battle
// ============================================================

async function runBattle() {
  state.battleResults = [];

  for (let i = 0; i < 2; i++) {
    const pVal = state.pitcherDice[i];
    const bVal = state.batterDice[i];
    let winner, color;
    if (bVal > pVal) { winner = 'batter'; color = 'green'; }
    else if (pVal > bVal) { winner = 'pitcher'; color = 'red'; }
    else { winner = 'tie'; color = 'gray'; }

    const winValue = winner === 'batter' ? bVal : pVal;
    state.battleResults.push({ pVal, bVal, winner, color, winValue });

    await animateBattlePair(i, pVal, bVal, winner);
    await delay(300);
  }
}

async function animateBattlePair(index, pVal, bVal, winner) {
  const lane = $(`lane-${index}`);
  lane.innerHTML = '';

  // Create the two dice at the edges
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

  await delay(50);

  // Slide toward center
  const center = lane.offsetWidth / 2;
  pDie.style.left = `${center - 52}px`;
  bDie.style.left = `${center + 4}px`;

  await delay(550);

  // Impact flash
  lane.classList.add('impact-flash');
  await delay(300);
  lane.classList.remove('impact-flash');

  // Resolve winner
  if (winner === 'batter') {
    pDie.classList.add('die-loser');
    await delay(400);
    bDie.style.left = `${center - 24}px`;
    bDie.classList.add('winner-die');
    await delay(300);
  } else if (winner === 'pitcher') {
    bDie.classList.add('die-loser');
    await delay(400);
    pDie.style.left = `${center - 24}px`;
    pDie.classList.add('winner-die');
    await delay(300);
  } else {
    // Tie: both fade, gray die appears
    pDie.classList.add('die-loser');
    bDie.classList.add('die-loser');
    await delay(200);

    const grayDie = createDieElement('die-gray');
    grayDie.classList.add('battle-die', 'winner-die');
    grayDie.innerHTML = dieFaceHTML(pVal);
    grayDie.style.left = `${center - 24}px`;
    grayDie.dataset.value = pVal;
    lane.appendChild(grayDie);
    await delay(300);
  }
}

// ============================================================
// SECTION G: Outcome Bar
// ============================================================

let indicatorPosition = 1; // 0=Strike, 1=Foul, 2=Ball, 3=Contact

function resetOutcomeBar() {
  indicatorPosition = 1;
  const indicator = $('ob-indicator');
  indicator.style.transition = 'none';
  indicator.style.left = '25%';
  indicator.classList.remove('ob-shake');
  // Force reflow
  indicator.offsetWidth;
  indicator.style.transition = 'left 0.4s ease-in-out';
}

function setIndicator(pos) {
  indicatorPosition = pos;
  $('ob-indicator').style.left = `${pos * 25}%`;
}

async function moveIndicator(pos) {
  indicatorPosition = pos;
  $('ob-indicator').style.left = `${pos * 25}%`;
  await delay(450);
}

async function shakeIndicator() {
  const ind = $('ob-indicator');
  ind.classList.add('ob-shake');
  await delay(400);
  ind.classList.remove('ob-shake');
}

async function runOutcome() {
  for (let i = 0; i < state.battleResults.length; i++) {
    const result = state.battleResults[i];

    // Animate the winning die from battle lane upward
    await flyDieToBar(i, result.color, result.winValue);

    // Move indicator
    if (result.color === 'green') {
      const newPos = Math.min(indicatorPosition + 1, 3);
      await moveIndicator(newPos);
    } else if (result.color === 'red') {
      const newPos = Math.max(indicatorPosition - 1, 0);
      await moveIndicator(newPos);
    } else {
      await shakeIndicator();
    }
    await delay(200);
  }

  // Determine result
  const outcomes = ['strike', 'foul', 'ball', 'contact'];
  const pitchResult = outcomes[indicatorPosition];

  await delay(400);
  await processPitchResult(pitchResult);
}

async function flyDieToBar(laneIndex, color, value) {
  const lane = $(`lane-${laneIndex}`);
  const centerCol = $('center-col');
  const bar = $('outcome-bar');

  const winnerDie = lane.querySelector('.winner-die');
  if (!winnerDie) return;

  const colRect = centerCol.getBoundingClientRect();
  const dieRect = winnerDie.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();

  // Create flying die
  const flyDie = createDieElement(`die-${color}`);
  flyDie.classList.add('flying-die');
  flyDie.innerHTML = dieFaceHTML(value);
  flyDie.style.left = (dieRect.left - colRect.left) + 'px';
  flyDie.style.top = (dieRect.top - colRect.top) + 'px';
  flyDie.style.width = '48px';
  flyDie.style.height = '48px';
  centerCol.appendChild(flyDie);

  // Hide original
  winnerDie.style.visibility = 'hidden';

  await delay(50);

  // Fly to bar center
  flyDie.style.left = (barRect.left - colRect.left + barRect.width / 2 - 24) + 'px';
  flyDie.style.top = (barRect.top - colRect.top) + 'px';
  flyDie.style.transform = 'scale(0.3)';
  flyDie.style.opacity = '0';

  await delay(650);
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
      await delay(500);
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
      await delay(500);
      resolveAtBatEnd('walk');
      return;
    }
  } else if (result === 'contact') {
    addLog('Contact!');
    await delay(600);
    await openContactModal();
    return;
  }

  // Continue at-bat
  await delay(800);
  clearBattlefield();
  resetPitchClock();
  state.phase = 'PRE_PITCH';
  updateButton();
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

  // Create dice near home plate
  const die1 = createDieElement('die-green');
  die1.classList.add('field-die');
  die1.style.left = 'calc(46% - 24px)';
  die1.style.top = '85%';
  overlay.appendChild(die1);

  const die2 = createDieElement('die-green');
  die2.classList.add('field-die');
  die2.style.left = 'calc(54%)';
  die2.style.top = '85%';
  overlay.appendChild(die2);

  // Spin
  await Promise.all([spinDie(die1, d1), spinDie(die2, d2)]);
  await delay(600);

  // Animate to field position
  die1.style.left = `calc(${pos.x}% - 28px)`;
  die1.style.top = `calc(${pos.y}% - 12px)`;
  die2.style.left = `calc(${pos.x}%)`;
  die2.style.top = `calc(${pos.y}% - 12px)`;

  await delay(900);

  // Show outcome
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
  await delay(1800);

  // Close modal
  $('contact-modal').classList.add('hidden');
  overlay.innerHTML = '';
  outcomeEl.textContent = '';
  outcomeEl.className = '';

  // Process at-bat result
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
    renderLog();
    updateButton();
    return;
  }

  state.phase = 'AT_BAT_RESULT';
  renderLog();
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
      btn.textContent = 'Start Pitch';
      btn.disabled = false;
      btn.onclick = startPitch;
      break;
    case 'ANIMATING':
      btn.textContent = '...';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'BATTER_READY':
      btn.textContent = 'Swing!';
      btn.disabled = false;
      btn.onclick = swingBat;
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
  renderLog();
}

function renderLog() {
  const entries = $('log-entries');
  entries.innerHTML = state.gameLog.map(e =>
    `<div class="log-entry${e.highlight ? ' log-highlight' : ''}">${e.text}</div>`
  ).join('');
  entries.parentElement.scrollTop = entries.parentElement.scrollHeight;
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
  $('lane-0').innerHTML = '';
  $('lane-1').innerHTML = '';
  // Remove any flying dice
  document.querySelectorAll('.flying-die').forEach(el => el.remove());
}

function startPitchClock() {
  const ring = $('clock-ring');
  ring.style.transition = 'none';
  ring.style.strokeDashoffset = '0';
  ring.offsetWidth; // force reflow
  ring.style.transition = 'stroke-dashoffset 2s linear';
  ring.style.strokeDashoffset = '119.38';
}

function resetPitchClock() {
  const ring = $('clock-ring');
  ring.style.transition = 'none';
  ring.style.strokeDashoffset = '0';
}

// ============================================================
// SECTION L: Game Flow
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
  resetPitchClock();
  updateBatterName();
  updateCount();
  updateScoreboard();
  updateDiamond();
  updateButton();

  addLog(`${currentBatter().name} steps up to bat.`);
}

// ============================================================
// SECTION M: Init
// ============================================================

function init() {
  $('replay-btn').addEventListener('click', () => {
    $('inning-summary').classList.add('hidden');
    startInning();
  });

  startInning();
}

document.addEventListener('DOMContentLoaded', init);
