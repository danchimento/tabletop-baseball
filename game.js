// ============================================================
// game.js — Game Engine (State, Pitch, Battle, Power, Scoring)
// ============================================================

// ============================================================
// State
// ============================================================

let state = {};

function freshState() {
  return {
    outs: 0,
    score: 0,
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
// Pitch Flow
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

  // Run dice spin and sprite pitch animation in parallel
  await Promise.all([
    (async () => {
      await Promise.all(pDice.map((d, i) => spinDie(d, pVals[i])));
      await delay(250);
      state.pitcherDice = await sortDice('pitcher', pVals);
      await delay(150);
    })(),
    animatePitchThrow()
  ]);

  // Wait for player to tap batter area
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

  // Run battle using actual dice on the board
  await runBattle();
  await delay(500);

  // Run outcome — this determines what pitch result we get
  await runOutcome();
}

// ============================================================
// Battle
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
  const pDice = Array.from($('pitcher-dice').children);
  const bDice = Array.from($('batter-dice').querySelectorAll('.die-face'));
  const pDie = pDice[index];
  const bDie = bDice[index];
  if (!pDie || !bDie) return;

  // Calculate how far each die needs to move to reach center collision point
  const pRect = pDie.getBoundingClientRect();
  const bRect = bDie.getBoundingClientRect();
  const centerX = (pRect.right + bRect.left) / 2;

  // Slide dice toward each other (leave a 4px gap between them)
  const pOffset = centerX - pRect.right + 2;
  const bOffset = centerX - bRect.left - 2;

  pDie.style.transition = 'transform 0.275s ease-in-out';
  bDie.style.transition = 'transform 0.275s ease-in-out';
  pDie.style.transform = `translateX(${pOffset}px)`;
  bDie.style.transform = `translateX(${bOffset}px)`;
  pDie.style.opacity = '1';
  bDie.style.opacity = '1';

  await delay(275);

  // Impact flash
  pDie.style.boxShadow = '0 0 12px rgba(255,255,255,0.6)';
  bDie.style.boxShadow = '0 0 12px rgba(255,255,255,0.6)';
  await delay(100);
  pDie.style.boxShadow = '';
  bDie.style.boxShadow = '';

  // Resolve: loser fades, winner moves to center
  const winCenterX = centerX - 24; // center a 48px die

  if (winner === 'batter') {
    pDie.style.transition = 'transform 0.2s, opacity 0.2s';
    pDie.classList.add('die-loser');
    await delay(100);
    const bCenter = winCenterX - bRect.left;
    bDie.style.transition = 'transform 0.2s ease-in-out';
    bDie.style.transform = `translateX(${bCenter}px)`;
    bDie.classList.add('winner-die');
    await delay(200);
  } else if (winner === 'pitcher') {
    bDie.style.transition = 'transform 0.2s, opacity 0.2s';
    bDie.classList.add('die-loser');
    await delay(100);
    const pCenter = winCenterX - pRect.left;
    pDie.style.transition = 'transform 0.2s ease-in-out';
    pDie.style.transform = `translateX(${pCenter}px)`;
    pDie.classList.add('winner-die');
    await delay(200);
  } else {
    // Tie: both fade out, gray die appears in center lane
    pDie.style.transition = 'transform 0.2s, opacity 0.2s';
    bDie.style.transition = 'transform 0.2s, opacity 0.2s';
    pDie.classList.add('die-loser');
    bDie.classList.add('die-loser');
    await delay(150);

    // Put gray die in the battle lane for fly-to-bar
    const lane = $(`lane-${index}`);
    if (lane) {
      const grayDie = createDieElement('die-gray');
      grayDie.classList.add('battle-die', 'winner-die');
      grayDie.innerHTML = dieFaceHTML(pVal);
      const laneCenter = lane.offsetWidth / 2 - 24;
      grayDie.style.left = `${laneCenter}px`;
      grayDie.dataset.value = pVal;
      lane.appendChild(grayDie);
    }
    await delay(150);
  }
}

// ============================================================
// Outcome Resolution
// ============================================================

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

  // Animate batter sprite reaction based on pitch result
  if (pitchResult === 'contact') {
    await animateBatterResolve(true);
  } else if (pitchResult === 'strike') {
    await animateSwingMiss();
  } else {
    await animateBallTaken();
  }

  await processPitchResult(pitchResult);
}

async function flyDieToBar(laneIndex, color, value) {
  const centerCol = $('center-col');
  const bar = $('ob-track');
  const barRect = bar.getBoundingClientRect();
  const colRect = centerCol.getBoundingClientRect();

  // Find winner die: first check side containers, then battle lanes
  let winnerDie = null;
  const pDice = Array.from($('pitcher-dice').children);
  const bDice = Array.from($('batter-dice').querySelectorAll('.die-face'));

  if (color === 'red' && pDice[laneIndex]?.classList.contains('winner-die')) {
    winnerDie = pDice[laneIndex];
  } else if (color === 'green' && bDice[laneIndex]?.classList.contains('winner-die')) {
    winnerDie = bDice[laneIndex];
  } else {
    // Tie case: gray die in lane
    const lane = $(`lane-${laneIndex}`);
    if (lane) winnerDie = lane.querySelector('.winner-die');
  }

  if (!winnerDie) return;

  const dieRect = winnerDie.getBoundingClientRect();

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
// Pitch Result
// ============================================================

async function processPitchResult(result) {
  if (result === 'strike') {
    state.count.strikes++;
    addLog('Strike!');
    updateCount();
    showPitchResultLabel('Strike!', 'result-strike');

    if (state.count.strikes >= MAX_STRIKES) {
      await delay(250);
      await resolveAtBatEnd('strikeout');
      return;
    }
  } else if (result === 'ball') {
    state.count.balls++;
    addLog('Ball');
    updateCount();
    showPitchResultLabel('Ball', 'result-ball');

    if (state.count.balls >= MAX_BALLS) {
      await delay(250);
      await resolveAtBatEnd('walk');
      return;
    }
  } else if (result === 'contact') {
    addLog('Contact!');
    showPitchResultLabel('Contact!', 'result-contact');
    await delay(300);
    await runPowerPhase();
    return;
  }

  // Continue at-bat: reset bar and start pitch clock for auto-pitch
  await delay(400);
  resetOutcomeBar();
  clearBattlefield();
  state.phase = 'PRE_PITCH';
  updateButton();
  resetSpriteScene();
  startPitchClock();
}

// ============================================================
// Power Phase (replaces contact modal)
// ============================================================

async function runPowerPhase() {
  state.phase = 'POWER';

  // Hide outcome bar and battlefield, show power bar and roll area
  $('outcome-bar').classList.add('hidden');
  $('battlefield').classList.add('hidden');
  $('power-bar').classList.remove('hidden');
  $('power-roll-area').classList.remove('hidden');

  // Reset power bar
  $('power-fill').style.transition = 'none';
  $('power-fill').style.width = '0%';
  $('power-value').textContent = '0';

  // Reset dice row with fresh tap prompt
  const rollArea = $('power-roll-area');
  const diceRow = $('power-dice-row');
  diceRow.innerHTML = '<div id="power-tap-prompt" class="roll-placeholder">Tap to Roll</div>';

  await new Promise(resolve => {
    const onClick = () => {
      rollArea.removeEventListener('click', onClick);
      resolve();
    };
    rollArea.addEventListener('click', onClick);
  });

  // Roll the power die
  diceRow.innerHTML = '';

  const die = createDieElement('die-gold');
  diceRow.appendChild(die);

  const roll = rollD6();
  await spinDie(die, roll);
  await delay(400);

  // Map roll to power
  const power = POWER_MAP[roll];

  // Animate power bar
  const fillPercent = (roll / 6) * 100;
  $('power-fill').style.transition = 'width 0.6s ease-out';
  $('power-fill').style.width = fillPercent + '%';
  $('power-value').textContent = power;

  await delay(800);

  // Show result
  let resultText, logText;
  if (power === 0) {
    resultText = 'Weak Hit!';
    logText = `Power roll: ${roll} — Weak hit (0 pts)`;
  } else if (power === 1) {
    resultText = '+1 Run!';
    logText = `Power roll: ${roll} — Solid hit (+1)`;
  } else {
    resultText = '+3 Runs!';
    logText = `Power roll: ${roll} — CRUSHED IT! (+3)`;
  }

  addLog(logText, true);
  state.score += power;
  updateScoreboard();

  await delay(300);

  // Restore normal UI
  $('power-bar').classList.add('hidden');
  $('power-roll-area').classList.add('hidden');
  $('outcome-bar').classList.remove('hidden');
  $('battlefield').classList.remove('hidden');

  // Show result overlay
  const batter = currentBatter();
  addLog(`${batter.name}: ${resultText}`, true);

  if (power === 0) {
    await showResultOverlay('Weak Hit', 'result-out');
  } else {
    await showResultOverlay(resultText, 'result-power');
  }

  // Move to next batter
  await delay(300);
  nextBatter();
}

// ============================================================
// Scoring & At-Bat End
// ============================================================

async function resolveAtBatEnd(outcome) {
  state.atBatResult = outcome;
  const batter = currentBatter();

  switch (outcome) {
    case 'strikeout':
      state.outs++;
      addLog(`${batter.name} strikes out.`, true);
      break;
    case 'walk':
      state.score += 1;
      addLog(`${batter.name} walks. +1 run!`, true);
      break;
  }

  updateScoreboard();

  // Show unified result overlay
  await showResultOverlay(getResultText(outcome), getResultClass(outcome));

  if (state.outs >= OUTS_PER_INNING) {
    state.phase = 'INNING_OVER';
    addLog(`--- Inning over. Final score: ${state.score} ---`, true);
    stopPitchClock();
    renderSummary();
    $('inning-summary').classList.remove('hidden');
    return;
  }

  // Auto-advance to next batter after a brief pause
  await delay(300);
  nextBatter();
}

function nextBatter() {
  state.currentBatterIndex = (state.currentBatterIndex + 1) % BATTERS.length;
  startAtBat();
}

function currentBatter() {
  return BATTERS[state.currentBatterIndex];
}

// ============================================================
// Game Flow
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
  updateButton();
  resetSpriteScene();

  // Clear pitch result label
  const label = $('pitch-result-label');
  label.className = '';
  label.textContent = '';

  addLog(`${currentBatter().name} steps up to bat.`);

  // Start pitch clock
  startPitchClock();
}

// ============================================================
// Init
// ============================================================

async function init() {
  try {
    // Initialize sprite scene
    await initSpriteScene();

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
