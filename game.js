// ============================================================
// SECTION A: Constants and Data
// ============================================================

const BATTERS = [
  { name: 'Speedy',  profile: 'Contact', baseDice: 3, powerDice: 2, totalBonus: 0 },
  { name: 'Steady',  profile: 'Average', baseDice: 2, powerDice: 2, totalBonus: 0 },
  { name: 'Slugger', profile: 'Star',    baseDice: 4, powerDice: 3, totalBonus: 0 },
  { name: 'Crusher', profile: 'Power',   baseDice: 2, powerDice: 4, totalBonus: 2 },
  { name: 'Rookie',  profile: 'Weak',    baseDice: 2, powerDice: 2, totalBonus: 0 },
];

const PITCHER_BASE_DICE = 2;

const CARD_ARCHETYPES = [
  {
    type: 'STAT_BOOST',
    batterName: 'Power Swing',
    pitcherName: 'Heat',
    batterDesc: '+1 die to your pool',
    pitcherDesc: '+1 die to pitcher pool',
    effect: { extraDice: 1, opponentDiceRemove: 0, totalBonus: 0, floorValue: null, rerollOpponentHighest: false, highRisk: false },
  },
  {
    type: 'STAT_DEBUFF',
    batterName: 'Crowd the Plate',
    pitcherName: 'Changeup',
    batterDesc: '-1 die from pitcher pool',
    pitcherDesc: '-1 die from batter pool',
    effect: { extraDice: 0, opponentDiceRemove: 1, totalBonus: 0, floorValue: null, rerollOpponentHighest: false, highRisk: false },
  },
  {
    type: 'MANIPULATION',
    batterName: 'Check Swing',
    pitcherName: 'Quick Pitch',
    batterDesc: 'Force pitcher to reroll highest die',
    pitcherDesc: 'Force batter to reroll highest die',
    effect: { extraDice: 0, opponentDiceRemove: 0, totalBonus: 0, floorValue: null, rerollOpponentHighest: true, highRisk: false },
  },
  {
    type: 'HIGH_RISK',
    batterName: 'Swing for the Fences',
    pitcherName: 'Gas',
    batterDesc: '+2 to all dice, but losses count double',
    pitcherDesc: '+2 to all dice, but losses count double',
    effect: { extraDice: 0, opponentDiceRemove: 0, totalBonus: 0, floorValue: null, rerollOpponentHighest: false, highRisk: true },
  },
  {
    type: 'DEFENSIVE',
    batterName: 'Shorten Up',
    pitcherName: 'Nibble',
    batterDesc: 'Set your lowest die to 3',
    pitcherDesc: 'Set your lowest die to 3',
    effect: { extraDice: 0, opponentDiceRemove: 0, totalBonus: 0, floorValue: 3, rerollOpponentHighest: false, highRisk: false },
  },
];

const CONTACT_THRESHOLDS = [
  { min: 12, outcome: 'home_run', label: 'HOME RUN!' },
  { min: 9,  outcome: 'double',   label: 'Double!' },
  { min: 6,  outcome: 'single',   label: 'Single!' },
  { min: 0,  outcome: 'ground_out', label: 'Ground Out' },
];

const OUTS_PER_INNING = 3;

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
    phase: 'SELECT_CARD', // SELECT_CARD | ROLLING | CONTACT | AT_BAT_RESULT | INNING_OVER
    batterCard: null,
    pitcherCard: null,
    hand: [],
    lastRoll: null,
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

function applyCardEffects(dice, card, isOwner) {
  let modified = [...dice];

  if (!card) return modified;

  const eff = card.effect;

  if (isOwner) {
    // Add extra dice
    for (let i = 0; i < eff.extraDice; i++) {
      modified.push(Math.floor(Math.random() * 6) + 1);
    }
    // Floor value: set lowest die to at least floorValue
    if (eff.floorValue !== null) {
      const minIdx = modified.indexOf(Math.min(...modified));
      if (modified[minIdx] < eff.floorValue) {
        modified[minIdx] = eff.floorValue;
      }
    }
    // High risk: +2 to all dice
    if (eff.highRisk) {
      modified = modified.map(d => d + 2);
    }
  } else {
    // Opponent removes dice from your pool
    for (let i = 0; i < eff.opponentDiceRemove && modified.length > 1; i++) {
      modified.splice(modified.indexOf(Math.min(...modified)), 1);
    }
  }

  return modified;
}

function applyManipulation(dice, opponentCard) {
  if (!opponentCard || !opponentCard.effect.rerollOpponentHighest) return dice;
  const modified = [...dice];
  const maxIdx = modified.indexOf(Math.max(...modified));
  modified[maxIdx] = Math.floor(Math.random() * 6) + 1;
  return modified;
}

function compareTotals(batterTotal, pitcherTotal) {
  const diff = batterTotal - pitcherTotal;
  if (diff >= 4) return 'contact';
  if (diff > 0) return 'ball';
  return 'strike'; // tie goes to pitcher
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

function generateHand() {
  // For MVP: shuffle all 5 archetypes and deal them all
  const shuffled = [...CARD_ARCHETYPES].sort(() => Math.random() - 0.5);
  return shuffled;
}

function aiSelectCard() {
  // Draw 3 at random, pick 1
  const shuffled = [...CARD_ARCHETYPES].sort(() => Math.random() - 0.5);
  const drawn = shuffled.slice(0, 3);
  return drawn[Math.floor(Math.random() * drawn.length)];
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
  state.batterCard = null;
  state.pitcherCard = aiSelectCard();
  state.hand = generateHand();
  state.lastRoll = null;
  state.contactResult = null;
  state.atBatResult = null;
  state.phase = 'SELECT_CARD';
  const batter = BATTERS[state.currentBatterIndex];
  addLog(`${batter.name} steps up to bat.`);
  render();
}

function selectCard(index) {
  if (state.phase !== 'SELECT_CARD') return;
  state.batterCard = state.hand[index];
  state.phase = 'ROLLING';
  addLog(`${currentBatter().name} plays ${state.batterCard.batterName}. Pitcher plays ${state.pitcherCard.pitcherName}.`);
  render();
}

function rollPitch() {
  if (state.phase !== 'ROLLING') return;

  const batter = currentBatter();

  // Roll base dice
  let batterDice = rollDice(batter.baseDice);
  let pitcherDice = rollDice(PITCHER_BASE_DICE);

  // Apply own card effects
  batterDice = applyCardEffects(batterDice, state.batterCard, true);
  pitcherDice = applyCardEffects(pitcherDice, state.pitcherCard, true);

  // Apply opponent's card effects (debuffs)
  batterDice = applyCardEffects(batterDice, state.pitcherCard, false);
  pitcherDice = applyCardEffects(pitcherDice, state.batterCard, false);

  // Apply manipulation (reroll opponent's highest)
  batterDice = applyManipulation(batterDice, state.pitcherCard);
  pitcherDice = applyManipulation(pitcherDice, state.batterCard);

  const batterTotal = sumDice(batterDice) + batter.totalBonus;
  const pitcherTotal = sumDice(pitcherDice);

  const result = compareTotals(batterTotal, pitcherTotal);

  state.lastRoll = { batterDice, pitcherDice, batterTotal, pitcherTotal, result };

  // Update count
  const multiplier_batter = (state.pitcherCard && state.pitcherCard.effect.highRisk && result === 'ball') ? 2 : 1;
  const multiplier_pitcher = (state.batterCard && state.batterCard.effect.highRisk && result === 'strike') ? 2 : 1;

  if (result === 'strike') {
    state.count.strikes += (1 * multiplier_pitcher);
    addLog(`Pitch: ${batterTotal} vs ${pitcherTotal} — Strike!${multiplier_pitcher > 1 ? ' (Double!)' : ''}`);
  } else if (result === 'ball') {
    state.count.balls += (1 * multiplier_batter);
    addLog(`Pitch: ${batterTotal} vs ${pitcherTotal} — Ball.${multiplier_batter > 1 ? ' (Double!)' : ''}`);
  } else {
    addLog(`Pitch: ${batterTotal} vs ${pitcherTotal} — Contact!`);
  }

  // Check terminal states
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

  render();
}

function resolveContact() {
  if (state.phase !== 'CONTACT') return;

  const batter = currentBatter();
  const powerDice = rollDice(batter.powerDice);
  const powerTotal = sumDice(powerDice);
  const outcome = resolveContactOutcome(powerTotal);

  state.contactResult = { powerDice, powerTotal, outcome };
  addLog(`Power roll: ${powerTotal} — ${outcome.label}`);

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
      let runs = 1; // batter scores
      for (let i = 0; i < 3; i++) {
        if (state.runners[i]) runs++;
      }
      state.score += runs;
      state.runners = [false, false, false];
      addLog(`${batter.name} hits a HOME RUN! ${runs} run${runs > 1 ? 's' : ''} score!`, true);
      break;
    }
  }

  // Check if inning is over
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
  // Move runners forward by 'bases' positions
  // Runners that go past 3rd score
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

  // For walks: only force runners (push occupied bases forward)
  if (!batterOnBase) {
    // Walk logic: only force runners when base is occupied
    // Reset and re-do with forced advancement
    const occupied = [state.runners[0], state.runners[1], state.runners[2]];
    const result = [false, false, false];
    // Batter goes to 1st, force chain
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

function endInning() {
  state.phase = 'INNING_OVER';
  render();
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
  renderCardHand();
  renderPitcherCard();
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
  $('batter-profile').textContent = `(${b.profile}) — ${b.baseDice}D6${b.totalBonus ? ' +' + b.totalBonus : ''}`;
}

function renderDiceArea() {
  const area = $('dice-area');
  if (!state.lastRoll || state.phase === 'SELECT_CARD') {
    area.classList.add('hidden');
    return;
  }
  area.classList.remove('hidden');

  const roll = state.lastRoll;
  $('batter-dice').innerHTML = roll.batterDice.map(d => `<span class="die die-animate">${d}</span>`).join('');
  $('pitcher-dice').innerHTML = roll.pitcherDice.map(d => `<span class="die die-animate">${d}</span>`).join('');
  $('batter-total').textContent = `= ${roll.batterTotal}`;
  $('pitcher-total').textContent = `= ${roll.pitcherTotal}`;
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
  if (!state.lastRoll || state.phase === 'SELECT_CARD') {
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
  } else if (r === 'ball') {
    resultEl.textContent = 'Ball';
    resultEl.className = 'result-ball';
  } else if (r === 'contact') {
    resultEl.textContent = 'Contact!';
    resultEl.className = 'result-contact';
  }
}

function renderCardHand() {
  const hand = $('card-hand');
  if (state.phase !== 'SELECT_CARD') {
    hand.classList.add('hidden');
    return;
  }
  hand.classList.remove('hidden');

  const container = $('cards-container');
  container.innerHTML = state.hand.map((card, i) => `
    <div class="card" data-card-index="${i}">
      <div class="card-name">${card.batterName}</div>
      <div class="card-type">${card.type.replace('_', ' ')}</div>
      <div class="card-desc">${card.batterDesc}</div>
    </div>
  `).join('');

  container.onclick = (e) => {
    const cardEl = e.target.closest('.card');
    if (cardEl) {
      selectCard(parseInt(cardEl.dataset.cardIndex));
    }
  };
}

function renderPitcherCard() {
  const el = $('pitcher-card-display');
  if (state.phase === 'SELECT_CARD' || !state.pitcherCard) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  $('pitcher-card-name').textContent = `${state.pitcherCard.pitcherName} (${state.pitcherCard.pitcherDesc})`;
}

function renderActionButton() {
  const btn = $('action-btn');

  switch (state.phase) {
    case 'SELECT_CARD':
      btn.textContent = 'Select a Card';
      btn.disabled = true;
      btn.onclick = null;
      break;
    case 'ROLLING':
      btn.textContent = 'Roll Dice';
      btn.disabled = false;
      btn.onclick = rollPitch;
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
