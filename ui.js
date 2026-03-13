// ============================================================
// ui.js — Outcome Bar, UI Updates, Pitch Clock, Debug
// ============================================================

// ============================================================
// Outcome Bar (value-based movement)
// ============================================================

// The bar range: roughly -12 to +12, 0 in the middle
// Position is a pixel percentage on the bar
const BAR_MIN = -12;
const BAR_MAX = 12;
let indicatorValue = 0;

function resetOutcomeBar() {
  indicatorValue = 0;
  updateIndicatorPosition(false);
  updateObValue();
}

function updateObValue() {
  const el = $('ob-value');
  if (el) {
    const v = Math.round(indicatorValue);
    el.textContent = v > 0 ? '+' + v : v;
  }
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
  updateObValue();
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

// ============================================================
// Pitch Result Label
// ============================================================

function showPitchResultLabel(text, cssClass) {
  const label = $('pitch-result-label');
  label.textContent = text;
  label.className = 'show ' + cssClass;
  // Auto-hide after a delay
  setTimeout(() => {
    label.className = '';
    label.textContent = '';
  }, 1200);
}

// ============================================================
// Result Overlay (unified for all AB results)
// ============================================================

function getResultText(outcome) {
  const map = {
    strikeout: 'Strikeout!',
    walk: 'Walk',
    ground_out: 'Out!',
    single: 'Single!',
    double: 'Double!',
    home_run: 'HOME RUN!'
  };
  return map[outcome] || outcome;
}

function getResultClass(outcome) {
  const map = {
    strikeout: 'result-k',
    walk: 'result-walk',
    ground_out: 'result-out',
    single: 'result-hit',
    double: 'result-hit',
    home_run: 'result-hr'
  };
  return map[outcome] || '';
}

async function showResultOverlay(text, cssClass, durationMs) {
  durationMs = durationMs || 1500;
  const overlay = $('result-overlay');
  const textEl = $('result-overlay-text');
  textEl.textContent = text;
  textEl.className = cssClass;
  overlay.classList.remove('hidden');
  await delay(durationMs);
  overlay.classList.add('hidden');
}

// ============================================================
// UI Updates (TV Bar)
// ============================================================

function updateScoreboard() {
  const scoreEl = $('tv-score');
  if (scoreEl) scoreEl.textContent = state.score;

  const outsEl = $('tv-outs');
  if (outsEl) {
    outsEl.textContent = state.outs === 1 ? '1 Out' : `${state.outs} Outs`;
  }

  const inningEl = $('tv-inning');
  if (inningEl) inningEl.textContent = 'Top 1';
}

function updateDiamond() {
  for (let i = 0; i < 3; i++) {
    const base = $(`tv-base-${i + 1}`);
    if (base) {
      if (state.runners[i]) {
        base.classList.add('runner-on');
      } else {
        base.classList.remove('runner-on');
      }
    }
  }
}

function updateCount() {
  const ballsEl = $('tv-balls');
  if (ballsEl) ballsEl.textContent = `B: ${state.count.balls}`;

  const strikesEl = $('tv-strikes');
  if (strikesEl) strikesEl.textContent = `S: ${state.count.strikes}`;
}

function updateBatterName() {
  $('batter-name').textContent = currentBatter().name;
}

// ============================================================
// Tappable Batter Area (replaces action button)
// ============================================================

function updateButton() {
  const batterSide = $('batter-side');
  const tapPrompt = $('tap-prompt');

  // Clear interactive state
  batterSide.classList.remove('tappable');
  batterSide.onclick = null;
  if (tapPrompt) tapPrompt.classList.add('hidden');

  switch (state.phase) {
    case 'BATTER_READY':
      batterSide.classList.add('tappable');
      if (tapPrompt) tapPrompt.classList.remove('hidden');
      batterSide.onclick = () => {
        if (state.phase === 'BATTER_READY') {
          swingBat();
        }
      };
      break;
    case 'INNING_OVER':
      setTimeout(() => {
        renderSummary();
        $('inning-summary').classList.remove('hidden');
      }, 500);
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
// Pitch Clock
// ============================================================

let pitchClockTimer = null;

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
// Debug Overlay & Controls
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

function setupDebugControls() {
  // FAB toggle
  $('debug-fab').addEventListener('click', () => {
    $('debug-panel').classList.toggle('hidden');
  });

  // Close button
  $('debug-close').addEventListener('click', () => {
    $('debug-panel').classList.add('hidden');
  });

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
