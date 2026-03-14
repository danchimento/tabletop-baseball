// ============================================================
// game.js — Game Engine (State, Pitch, Battle, Contact, Scoring)
// ============================================================

// ============================================================
// State
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
  const bDice = Array.from($('batter-dice').children);
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
  } else if (pitchResult === 'strike' || pitchResult === 'foul') {
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
  const bDice = Array.from($('batter-dice').children);

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

    if (state.count.strikes >= 3) {
      await delay(250);
      await resolveAtBatEnd('strikeout');
      return;
    }
  } else if (result === 'foul') {
    state.count.strikes = Math.min(state.count.strikes + 1, 2);
    addLog('Foul Ball');
    updateCount();
    showPitchResultLabel('Foul Ball', 'result-foul');
  } else if (result === 'ball') {
    state.count.balls++;
    addLog('Ball');
    updateCount();
    showPitchResultLabel('Ball', 'result-ball');

    if (state.count.balls >= 4) {
      await delay(250);
      await resolveAtBatEnd('walk');
      return;
    }
  } else if (result === 'contact') {
    addLog('Contact!');
    showPitchResultLabel('Contact!', 'result-contact');
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
  resetSpriteScene();
  startPitchClock();
}

// ============================================================
// Contact Modal
// ============================================================

async function openContactModal() {
  state.phase = 'CONTACT';
  updateButton();

  const modal = $('contact-modal');
  modal.classList.remove('hidden');

  $('field-overlay').innerHTML = '';
  $('contact-outcome').textContent = '';
  $('contact-outcome').className = '';

  // Reset the permanent dice row to show tap prompt
  const diceRow = $('contact-dice-row');
  diceRow.innerHTML = '';
  diceRow.style.opacity = '1';
  const tapPrompt = document.createElement('div');
  tapPrompt.id = 'contact-tap-prompt';
  tapPrompt.className = 'roll-placeholder';
  tapPrompt.textContent = 'Tap to Roll';
  diceRow.appendChild(tapPrompt);

  // Make field tappable
  const fieldView = $('field-view');

  return new Promise(resolve => {
    const onClick = () => {
      fieldView.removeEventListener('click', onClick);
      diceRow.removeEventListener('click', onClick);
      rollContactDice().then(resolve);
    };
    fieldView.addEventListener('click', onClick);
    diceRow.addEventListener('click', onClick);
  });
}

async function rollContactDice() {
  const d1 = rollD6(), d2 = rollD6();
  const sum = d1 + d2;
  const result = CONTACT_MAP[sum];
  const pos = FIELD_POSITIONS[sum];

  const overlay = $('field-overlay');
  const isOut = result.outcome === 'ground_out';
  const isOutfield = sum >= 5 && sum <= 7 || sum >= 10;
  const isHomeRun = result.outcome === 'home_run';

  // Replace tap prompt with dice in the permanent row
  const diceRow = $('contact-dice-row');
  diceRow.innerHTML = '';
  diceRow.style.opacity = '1';

  const die1 = createDieElement('die-green');
  die1.classList.add('field-die');
  diceRow.appendChild(die1);

  const die2 = createDieElement('die-green');
  die2.classList.add('field-die');
  diceRow.appendChild(die2);

  // Spin
  await Promise.all([spinDie(die1, d1), spinDie(die2, d2)]);

  // Show dice result briefly
  await delay(600);

  // Fade out dice
  diceRow.style.transition = 'opacity 0.3s';
  diceRow.style.opacity = '0';
  await delay(300);

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
    const midX = (48 + pos.x) / 2;
    const midY = (90 + pos.y) / 2 - 10;
    ball.style.left = midX + '%';
    ball.style.top = midY + '%';
    ball.style.transition = 'left 0.6s ease-out, top 0.6s ease-out, transform 0.6s ease-out';
    ball.style.transform = 'scale(2.5)';
    await delay(600);

    ball.style.transition = 'left 0.7s ease-in, top 0.7s ease-in, transform 0.7s ease-in';
    ball.style.left = pos.x + '%';
    ball.style.top = pos.y + '%';
    ball.style.transform = 'scale(0.8)';
    await delay(700);
  } else {
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

  // Show outcome text briefly in modal
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
  await delay(600);

  // Close modal
  $('contact-modal').classList.add('hidden');
  overlay.innerHTML = '';
  outcomeEl.textContent = '';
  outcomeEl.className = '';

  // Show unified result overlay on game board
  await resolveAtBatEnd(result.outcome);
}

// ============================================================
// Base Running & Scoring
// ============================================================

async function resolveAtBatEnd(outcome) {
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
  updateDiamond();
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
