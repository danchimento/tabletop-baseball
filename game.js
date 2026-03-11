// ============================================================
// SECTION A: Constants and Data
// ============================================================

const BATTERS = [
  { name: 'Speedy',  profile: 'Contact', baseDice: 3, powerDice: 2 },
  { name: 'Steady',  profile: 'Average', baseDice: 2, powerDice: 2 },
  { name: 'Slugger', profile: 'Star',    baseDice: 4, powerDice: 3 },
  { name: 'Crusher', profile: 'Power',   baseDice: 2, powerDice: 4 },
  { name: 'Rookie',  profile: 'Weak',    baseDice: 2, powerDice: 2 },
];

const PITCHER_BASE_DICE = 3;

// Passives: pick 1 per at-bat, visible, triggers automatically
const PASSIVES = [
  { id: 'two_strike', name: 'Two-Strike Approach', desc: '+1 die at 2 strikes' },
  { id: 'patient',    name: 'Patient Hitter',      desc: '+1 die at 3 balls' },
  { id: 'aggressive', name: 'Aggressive',           desc: '+1 die pitch 1, -1 after pitch 3' },
  { id: 'clutch',     name: 'Clutch',               desc: '+1 die with RISP' },
];

// Burn cards: hand of 3 per AB, play 0-1 per pitch, consumed on use
const BURN_CARDS = [
  {
    id: 'power_swing',
    name: 'Power Swing',
    desc: '+1 die, pitcher floors at 3',
    batterEffect: { extraDice: 1 },
    penalty: { pitcherFloor: 3 },
  },
  {
    id: 'intimidate',
    name: 'Intimidate',
    desc: '-1 pitcher die, your cap at 4',
    batterEffect: { removePitcherDice: 1 },
    penalty: { batterCap: 4 },
  },
  {
    id: 'swing_fences',
    name: 'Swing for Fences',
    desc: '+2 all dice, double strikes',
    batterEffect: { diceBonus: 2 },
    penalty: { doubleStrikes: true },
  },
  {
    id: 'shorten_up',
    name: 'Shorten Up',
    desc: 'Floor lowest at 3, -1 power roll',
    batterEffect: { floorValue: 3 },
    penalty: { powerPenalty: 1 },
  },
];

const CONTACT_THRESHOLDS = [
  { min: 12, outcome: 'home_run', label: 'HOME RUN!' },
  { min: 9,  outcome: 'double',   label: 'Double!' },
  { min: 6,  outcome: 'single',   label: 'Single!' },
  { min: 0,  outcome: 'ground_out', label: 'Ground Out' },
];

// Pair thresholds: how many pairs batter must win for ball/contact
const PAIR_THRESHOLDS = {
  2: { ball: 1, contact: 2 },
  3: { ball: 1, contact: 2 },
  4: { ball: 2, contact: 3 },
  5: { ball: 2, contact: 3 },
  6: { ball: 3, contact: 4 },
};

const OUTS_PER_INNING = 3;

const REVEAL_PAIR_DELAY = 700;
const REVEAL_RESULT_DELAY = 600;

// ============================================================
// SECTION B: Game State
// ============================================================

let state = {};

function freshState() {
  return {
    outs: 0,
    score: 0,
    runners: [false, false, false], // [1st, 2nd, 3rd]
    currentBatterIndex: 0,
    count: { balls: 0, strikes: 0 },
    phase: 'SELECT_PASSIVE', // SELECT_PASSIVE | ROLLING | REVEALING | CONTACT | AT_BAT_RESULT | INNING_OVER
    passive: null,
    burnHand: [],
    selectedBurn: null,   // highlighted burn card (not yet consumed)
    lastBurnUsed: null,   // burn used on the last pitch (for penalty tracking)
    pitchCount: 0,
    lastRoll: null,
    pairData: null,
    contactResult: null,
    atBatResult: null,
    gameLog: [],
  };
}

// ============================================================
// SECTION C: Dice Engine
// ============================================================

function rollDice(count) {
  const dice = [];
  for (let i = 0; i < Math.max(count, 1); i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

function sumDice(dice) {
  return dice.reduce((a, b) => a + b, 0);
}

function getPassiveDiceMod() {
  if (!state.passive) return 0;
  switch (state.passive.id) {
    case 'two_strike': return state.count.strikes >= 2 ? 1 : 0;
    case 'patient':    return state.count.balls >= 3 ? 1 : 0;
    case 'aggressive':
      // pitchCount is already incremented when this runs inside rollPitch
      if (state.pitchCount <= 1) return 1;
      if (state.pitchCount > 3) return -1;
      return 0;
    case 'clutch': return (state.runners[1] || state.runners[2]) ? 1 : 0;
    default: return 0;
  }
}

function applyPassive(batterDice) {
  const mod = getPassiveDiceMod();
  let modified = [...batterDice];
  if (mod > 0) {
    for (let i = 0; i < mod; i++) {
      modified.push(Math.floor(Math.random() * 6) + 1);
    }
  } else if (mod < 0) {
    for (let i = 0; i < Math.abs(mod) && modified.length > 1; i++) {
      modified.splice(modified.indexOf(Math.min(...modified)), 1);
    }
  }
  return modified;
}

function applyBurnEffects(batterDice, pitcherDice, burn) {
  if (!burn) return { batterDice: [...batterDice], pitcherDice: [...pitcherDice] };

  let bMod = [...batterDice];
  let pMod = [...pitcherDice];
  const be = burn.batterEffect;
  const pen = burn.penalty;

  // Batter benefits
  if (be.extraDice) {
    for (let i = 0; i < be.extraDice; i++) {
      bMod.push(Math.floor(Math.random() * 6) + 1);
    }
  }
  if (be.removePitcherDice) {
    for (let i = 0; i < be.removePitcherDice && pMod.length > 1; i++) {
      pMod.splice(pMod.indexOf(Math.min(...pMod)), 1);
    }
  }
  if (be.diceBonus) {
    bMod = bMod.map(d => d + be.diceBonus);
  }
  if (be.floorValue) {
    const minIdx = bMod.indexOf(Math.min(...bMod));
    if (bMod[minIdx] < be.floorValue) {
      bMod[minIdx] = be.floorValue;
    }
  }

  // Penalties
  if (pen.pitcherFloor) {
    const minIdx = pMod.indexOf(Math.min(...pMod));
    if (pMod[minIdx] < pen.pitcherFloor) {
      pMod[minIdx] = pen.pitcherFloor;
    }
  }
  if (pen.batterCap) {
    bMod = bMod.map(d => Math.min(d, pen.batterCap));
  }

  return { batterDice: bMod, pitcherDice: pMod };
}

function comparePairs(batterDice, pitcherDice) {
  const bSorted = [...batterDice].sort((a, b) => b - a);
  const pSorted = [...pitcherDice].sort((a, b) => b - a);
  const numPairs = Math.min(bSorted.length, pSorted.length);

  const pairs = [];
  let wins = 0, losses = 0, ties = 0;

  for (let i = 0; i < numPairs; i++) {
    const bDie = bSorted[i];
    const pDie = pSorted[i];
    let outcome;
    if (bDie > pDie) { outcome = 'win'; wins++; }
    else if (pDie > bDie) { outcome = 'loss'; losses++; }
    else { outcome = 'tie'; ties++; }
    pairs.push({ batterDie: bDie, pitcherDie: pDie, outcome });
  }

  const thresholds = PAIR_THRESHOLDS[numPairs] || PAIR_THRESHOLDS[2];

  let result;
  if (wins >= thresholds.contact) result = 'contact';
  else if (wins >= thresholds.ball) result = 'ball';
  else if (wins === losses) result = 'foul';
  else result = 'strike';

  return { pairs, wins, losses, ties, result, thresholds, numPairs };
}

function resolveContactOutcome(powerDiceTotal) {
  for (const t of CONTACT_THRESHOLDS) {
    if (powerDiceTotal >= t.min) return t;
  }
  return CONTACT_THRESHOLDS[CONTACT_THRESHOLDS.length - 1];
}

// ============================================================
// SECTION D: Card System
// ============================================================

function generateBurnHand() {
  const shuffled = [...BURN_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ============================================================
// SECTION E: Game Flow
// ============================================================

function startInning() {
  state = freshState();
  addLog('--- Top of the 1st ---');
  startAtBat();
}

function startAtBat() {
  state.count = { balls: 0, strikes: 0 };
  state.passive = null;
  state.burnHand = generateBurnHand();
  state.selectedBurn = null;
  state.lastBurnUsed = null;
  state.pitchCount = 0;
  state.lastRoll = null;
  state.pairData = null;
  state.contactResult = null;
  state.atBatResult = null;
  state.phase = 'SELECT_PASSIVE';
  const batter = BATTERS[state.currentBatterIndex];
  addLog(`${batter.name} steps up to bat.`);
  render();
}

function selectPassive(index) {
  if (state.phase !== 'SELECT_PASSIVE') return;
  state.passive = PASSIVES[index];
  state.phase = 'ROLLING';
  addLog(`${currentBatter().name} takes a ${state.passive.name} approach.`);
  render();
}

function toggleBurn(index) {
  if (state.phase !== 'ROLLING') return;
  const card = state.burnHand[index];
  if (state.selectedBurn && state.selectedBurn.id === card.id) {
    state.selectedBurn = null;
  } else {
    state.selectedBurn = card;
  }
  render();
}

function rollPitch() {
  if (state.phase !== 'ROLLING') return;

  state.pitchCount++;
  const batter = currentBatter();
  const burn = state.selectedBurn;
  state.lastBurnUsed = burn;

  // Consume burn card from hand
  if (burn) {
    state.burnHand = state.burnHand.filter(c => c.id !== burn.id);
    state.selectedBurn = null;
  }

  // Roll base dice
  let batterDice = rollDice(batter.baseDice);
  let pitcherDice = rollDice(PITCHER_BASE_DICE);

  // Apply passive
  batterDice = applyPassive(batterDice);

  // Apply burn effects + penalties
  const burnResult = applyBurnEffects(batterDice, pitcherDice, burn);
  batterDice = burnResult.batterDice;
  pitcherDice = burnResult.pitcherDice;

  // Log what was used
  const passiveMod = getPassiveDiceMod();
  let usedParts = [];
  if (burn) usedParts.push(burn.name);
  if (passiveMod !== 0) usedParts.push(`${state.passive.name} ${passiveMod > 0 ? '+1' : '-1'}`);
  if (usedParts.length) addLog(`Pitch ${state.pitchCount}: ${usedParts.join(', ')}`);

  // Compare using paired dice
  const comparison = comparePairs(batterDice, pitcherDice);

  state.pairData = {
    ...comparison,
    revealedCount: 0,
    batterDice,
    pitcherDice,
  };
  state.lastRoll = { batterDice, pitcherDice, result: comparison.result };

  state.phase = 'REVEALING';
  render();

  setTimeout(revealNextPair, 400);
}

function revealNextPair() {
  if (!state.pairData || state.phase !== 'REVEALING') return;

  state.pairData.revealedCount++;
  render();

  if (state.pairData.revealedCount < state.pairData.pairs.length) {
    setTimeout(revealNextPair, REVEAL_PAIR_DELAY);
  } else {
    setTimeout(finishReveal, REVEAL_RESULT_DELAY);
  }
}

function finishReveal() {
  if (state.phase !== 'REVEALING') return;

  const pd = state.pairData;
  const result = pd.result;
  const burn = state.lastBurnUsed;
  const doubleStrikes = burn && burn.penalty && burn.penalty.doubleStrikes;

  if (result === 'strike') {
    const mult = doubleStrikes ? 2 : 1;
    state.count.strikes += mult;
    addLog(`${pd.wins}/${pd.numPairs} pairs won — Strike!${mult > 1 ? ' (Double!)' : ''}`);
  } else if (result === 'foul') {
    const mult = doubleStrikes ? 2 : 1;
    state.count.strikes = Math.min(state.count.strikes + mult, 2);
    addLog(`${pd.wins}/${pd.numPairs} pairs won (tied ${pd.wins}-${pd.losses}) — Foul Ball`);
  } else if (result === 'ball') {
    state.count.balls++;
    addLog(`${pd.wins}/${pd.numPairs} pairs won — Ball`);
  } else {
    addLog(`${pd.wins}/${pd.numPairs} pairs won — Contact!`);
  }

  if (result === 'contact') {
    state.phase = 'CONTACT';
    render();
    return;
  }

  if (state.count.strikes >= 3) {
    resolveAtBatEnd('strikeout');
    return;
  }

  if (state.count.balls >= 4) {
    resolveAtBatEnd('walk');
    return;
  }

  state.phase = 'ROLLING';
  render();
}

function resolveContact() {
  if (state.phase !== 'CONTACT') return;

  const batter = currentBatter();
  const powerDice = rollDice(batter.powerDice);
  let powerTotal = sumDice(powerDice);

  // Apply Shorten Up penalty if used on the contact pitch
  const burn = state.lastBurnUsed;
  if (burn && burn.penalty && burn.penalty.powerPenalty) {
    powerTotal = Math.max(0, powerTotal - burn.penalty.powerPenalty);
  }

  const outcome = resolveContactOutcome(powerTotal);

  state.contactResult = { powerDice, powerTotal, outcome };
  addLog(`Power roll: ${powerTotal}${burn && burn.penalty.powerPenalty ? ` (-${burn.penalty.powerPenalty} ${burn.name})` : ''} — ${outcome.label}`);

  if (outcome.outcome === 'ground_out') {
    resolveAtBatEnd('ground_out');
  } else {
    resolveAtBatEnd(outcome.outcome);
  }
}

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

  if (state.outs >= OUTS_PER_INNING) {
    state.phase = 'INNING_OVER';
    addLog(`--- Inning over. Final score: ${state.score} ---`, true);
    render();
    return;
  }

  state.phase = 'AT_BAT_RESULT';
  render();
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
// SECTION F: Game Log
// ============================================================

function addLog(text, highlight) {
  state.gameLog.push({ text, highlight: !!highlight });
}

// ============================================================
// SECTION G: UI Rendering
// ============================================================

const $ = (id) => document.getElementById(id);

function render() {
  renderScoreboard();
  renderDiamond();
  renderCount();
  renderBatterInfo();
  renderDiceArea();
  renderContactArea();
  renderPitchResult();
  renderPassiveSelection();
  renderPassiveDisplay();
  renderBurnHand();
  renderActionButton();
  renderLog();
  renderSummary();
}

function renderScoreboard() {
  $('score-display').textContent = `Score: ${state.score}`;
  const dots = Array.from({ length: 3 }, (_, i) => i < state.outs ? '\u25CF' : '\u25CB').join('');
  $('outs-display').innerHTML = `Outs: <span class="out-dots">${dots}</span>`;
  $('inning-display').textContent = 'Top 1st';
}

function renderDiamond() {
  for (let i = 0; i < 3; i++) {
    const base = $(`base-${i + 1}`);
    if (state.runners[i]) {
      base.classList.add('runner-on');
    } else {
      base.classList.remove('runner-on');
    }
  }
}

function renderCount() {
  const balls = Array.from({ length: 4 }, (_, i) =>
    `<span class="${i < state.count.balls ? 'ball-on' : ''}">${i < state.count.balls ? '\u25CF' : '\u25CB'}</span>`
  ).join('');
  const strikes = Array.from({ length: 3 }, (_, i) =>
    `<span class="${i < state.count.strikes ? 'strike-on' : ''}">${i < state.count.strikes ? '\u25CF' : '\u25CB'}</span>`
  ).join('');
  $('balls-dots').innerHTML = balls;
  $('strikes-dots').innerHTML = strikes;
}

function renderBatterInfo() {
  const b = currentBatter();
  $('batter-name').textContent = b.name;
  $('batter-profile').textContent = `(${b.profile}) — ${b.baseDice}D6`;
}

function renderDiceArea() {
  const area = $('dice-area');
  if (!state.pairData || state.phase === 'SELECT_PASSIVE') {
    area.classList.add('hidden');
    return;
  }
  area.classList.remove('hidden');

  const pd = state.pairData;
  const revealed = pd.revealedCount;

  let pairsHtml = '';
  for (let i = 0; i < pd.pairs.length; i++) {
    const pair = pd.pairs[i];
    const isRevealed = i < revealed;
    const outcomeClass = isRevealed ? `pair-${pair.outcome}` : 'pair-pending';

    pairsHtml += `
      <div class="pair-row ${outcomeClass}">
        <span class="pair-num">${i + 1}</span>
        <span class="die ${isRevealed ? 'die-animate pair-die-batter' : 'die-hidden'}">${isRevealed ? pair.batterDie : '?'}</span>
        <span class="pair-vs">${isRevealed ? 'vs' : ''}</span>
        <span class="die ${isRevealed ? 'die-animate pair-die-pitcher' : 'die-hidden'}">${isRevealed ? pair.pitcherDie : '?'}</span>
        <span class="pair-icon">${isRevealed ? (pair.outcome === 'win' ? '✓' : pair.outcome === 'loss' ? '✗' : '—') : ''}</span>
      </div>`;
  }

  $('pairs-container').innerHTML = pairsHtml;

  const thDisplay = $('threshold-display');
  if (revealed > 0) {
    thDisplay.classList.remove('hidden');

    let currentWins = 0;
    for (let i = 0; i < revealed; i++) {
      if (pd.pairs[i].outcome === 'win') currentWins++;
    }

    const th = pd.thresholds;
    const allRevealed = revealed >= pd.pairs.length;
    const ballMet = currentWins >= th.ball;
    const contactMet = currentWins >= th.contact;

    thDisplay.innerHTML = `
      <div class="threshold-wins">Wins: ${currentWins}</div>
      <div class="threshold-checks">
        <span class="th-check ${ballMet ? 'th-met' : 'th-unmet'}">
          Ball (${th.ball}) ${ballMet ? '✓' : '○'}
        </span>
        <span class="th-check ${contactMet ? 'th-met' : 'th-unmet'}">
          Contact (${th.contact}) ${contactMet ? '✓' : '○'}
        </span>
      </div>
      ${allRevealed ? `<div class="threshold-result threshold-result-${pd.result}">${
        pd.result === 'contact' ? 'CONTACT!' :
        pd.result === 'ball' ? 'Ball' :
        pd.result === 'foul' ? 'Foul Ball' :
        'Strike!'
      }</div>` : ''}`;
  } else {
    thDisplay.classList.add('hidden');
  }
}

function renderContactArea() {
  const area = $('contact-area');
  if (!state.contactResult) {
    area.classList.add('hidden');
    return;
  }
  area.classList.remove('hidden');

  const cr = state.contactResult;
  $('power-dice').innerHTML = cr.powerDice.map(d => `<span class="die die-animate">${d}</span>`).join('');
  $('power-total').textContent = `= ${cr.powerTotal}`;
  $('contact-result').textContent = cr.outcome.label;
}

function renderPitchResult() {
  const el = $('pitch-result');
  if (!state.lastRoll || state.phase === 'SELECT_PASSIVE' || state.phase === 'REVEALING') {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  const r = state.lastRoll.result;
  const resultEl = $('result-text');

  if (state.phase === 'AT_BAT_RESULT' && state.atBatResult) {
    const labels = {
      strikeout: 'Strikeout!',
      walk: 'Walk!',
      ground_out: 'Ground Out',
      single: 'Single!',
      double: 'Double!',
      home_run: 'HOME RUN!',
    };
    resultEl.textContent = labels[state.atBatResult] || state.atBatResult;
    resultEl.className = state.atBatResult === 'strikeout' || state.atBatResult === 'ground_out'
      ? 'result-strike' : 'result-contact';
  } else if (r === 'strike') {
    resultEl.textContent = 'Strike!';
    resultEl.className = 'result-strike';
  } else if (r === 'foul') {
    resultEl.textContent = 'Foul Ball';
    resultEl.className = 'result-foul';
  } else if (r === 'ball') {
    resultEl.textContent = 'Ball';
    resultEl.className = 'result-ball';
  } else if (r === 'contact') {
    resultEl.textContent = 'Contact!';
    resultEl.className = 'result-contact';
  }
}

function renderPassiveSelection() {
  const el = $('card-hand');
  if (state.phase !== 'SELECT_PASSIVE') {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  $('card-hand-label').textContent = 'Choose your approach:';
  const container = $('cards-container');
  container.innerHTML = PASSIVES.map((p, i) => `
    <div class="card" data-passive-index="${i}">
      <div class="card-name">${p.name}</div>
      <div class="card-desc">${p.desc}</div>
    </div>
  `).join('');

  container.onclick = (e) => {
    const cardEl = e.target.closest('.card');
    if (cardEl && cardEl.dataset.passiveIndex !== undefined) {
      selectPassive(parseInt(cardEl.dataset.passiveIndex));
    }
  };
}

function renderPassiveDisplay() {
  const el = $('passive-display');
  if (!state.passive || state.phase === 'SELECT_PASSIVE') {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  // Preview passive status for next pitch
  let status = '';
  if (state.phase === 'ROLLING') {
    const nextPitch = state.pitchCount + 1;
    let active = false;
    switch (state.passive.id) {
      case 'two_strike': active = state.count.strikes >= 2; break;
      case 'patient':    active = state.count.balls >= 3; break;
      case 'aggressive': active = nextPitch <= 1 ? true : nextPitch > 3 ? 'penalty' : false; break;
      case 'clutch':     active = state.runners[1] || state.runners[2]; break;
    }
    if (active === 'penalty') status = ' (active: -1 die)';
    else if (active) status = ' (active: +1 die)';
  }

  $('passive-name').textContent = `${state.passive.name}${status}`;
}

function renderBurnHand() {
  const el = $('burn-hand');
  if (state.phase !== 'ROLLING' || state.burnHand.length === 0) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  const container = $('burn-cards-container');
  container.innerHTML = state.burnHand.map((card, i) => {
    const selected = state.selectedBurn && state.selectedBurn.id === card.id;
    return `
      <div class="card burn-card ${selected ? 'card-selected' : ''}" data-burn-index="${i}">
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>
      </div>
    `;
  }).join('');

  container.onclick = (e) => {
    const cardEl = e.target.closest('.burn-card');
    if (cardEl && cardEl.dataset.burnIndex !== undefined) {
      toggleBurn(parseInt(cardEl.dataset.burnIndex));
    }
  };
}

function renderActionButton() {
  const btn = $('action-btn');

  switch (state.phase) {
    case 'SELECT_PASSIVE':
      btn.textContent = 'Choose an Approach';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'ROLLING':
      if (state.selectedBurn) {
        btn.textContent = `Roll Dice (${state.selectedBurn.name})`;
      } else {
        btn.textContent = 'Roll Dice';
      }
      btn.disabled = false;
      btn.onclick = rollPitch;
      break;
    case 'REVEALING':
      btn.textContent = 'Matching pairs...';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'CONTACT':
      btn.textContent = 'Roll Power Dice';
      btn.disabled = false;
      btn.onclick = resolveContact;
      break;
    case 'AT_BAT_RESULT':
      btn.textContent = 'Next Batter';
      btn.disabled = false;
      btn.onclick = nextBatter;
      break;
    case 'INNING_OVER':
      btn.textContent = 'View Summary';
      btn.disabled = false;
      btn.onclick = () => $('inning-summary').classList.remove('hidden');
      break;
  }
}

function renderLog() {
  const entries = $('log-entries');
  entries.innerHTML = state.gameLog.map(e =>
    `<div class="log-entry${e.highlight ? ' log-highlight' : ''}">${e.text}</div>`
  ).join('');
  entries.parentElement.scrollTop = entries.parentElement.scrollHeight;
}

function renderSummary() {
  if (state.phase !== 'INNING_OVER') {
    $('inning-summary').classList.add('hidden');
    return;
  }

  $('final-score').textContent = `${state.score} Run${state.score !== 1 ? 's' : ''}`;
  $('summary-log').innerHTML = state.gameLog
    .filter(e => e.highlight)
    .map(e => `<div>${e.text}</div>`)
    .join('');
}

// ============================================================
// SECTION H: Init
// ============================================================

function init() {
  $('replay-btn').addEventListener('click', () => {
    $('inning-summary').classList.add('hidden');
    startInning();
  });

  startInning();
}

document.addEventListener('DOMContentLoaded', init);
