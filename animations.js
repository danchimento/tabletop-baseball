// ============================================================
// animations.js — GSAP Animation Timelines for Sprite Scene
// ============================================================

// Pitch throw: wind-up, release, ball travels, bullet-time pause
async function animatePitchThrow() {
  if (!sceneReady) return;

  const s = CHAR_SCALE;
  const pitcherX = sceneW * PITCHER_X_PCT;
  const batterX = sceneW * BATTER_X_PCT;
  const groundY = sceneH * GROUND_Y_PCT;
  const midX = (pitcherX + batterX) / 2;
  const ballY = groundY - 38 * s;

  // Position ball at pitcher's hand
  ballSprite.x = pitcherX + 22 * s;
  ballSprite.y = ballY;
  ballSprite.alpha = 1;
  ballSprite.visible = false;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // 1. Wind-up: arm swings back
    tl.to(pitcherArm, { rotation: -1.0, duration: 0.3, ease: 'power2.in' });

    // 2. Arm swings forward, ball appears
    tl.to(pitcherArm, { rotation: 0.5, duration: 0.15, ease: 'power3.out' });
    tl.call(() => { ballSprite.visible = true; }, null, '-=0.05');

    // 3. Ball travels at full speed toward midpoint
    tl.to(ballSprite, { x: midX, duration: 0.25, ease: 'power1.in' });

    // 4. Bullet-time: ball slows dramatically and pauses near midpoint
    tl.to(ballSprite, { x: midX + 30, duration: 0.6, ease: 'power4.out' });

    // 5. Arm settles back
    tl.to(pitcherArm, { rotation: 0, duration: 0.3, ease: 'power1.out' }, '-=0.5');
  });
}

// Batter resolves: ball continues, batter reacts
async function animateBatterResolve(didMakeContact) {
  if (!sceneReady) return;

  const s = CHAR_SCALE;
  const batterX = sceneW * BATTER_X_PCT;
  const pitcherX = sceneW * PITCHER_X_PCT;
  const midX = (pitcherX + batterX) / 2;
  const groundY = sceneH * GROUND_Y_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // 1. Ball resumes toward batter at full speed
    tl.to(ballSprite, { x: batterX - 15, duration: 0.2, ease: 'power2.in' });

    if (didMakeContact) {
      // 2a. Bat swings through
      tl.to(batterBat, { rotation: -1.5, duration: 0.12, ease: 'power3.in' }, '-=0.12');

      // 3a. Ball reverses upward (hit!)
      tl.to(ballSprite, {
        x: midX - 40,
        y: groundY - 100 * s,
        duration: 0.5,
        ease: 'power2.out'
      });
      tl.to(ballSprite, { alpha: 0, duration: 0.2 }, '-=0.2');
    } else {
      // 2b. Ball passes by — check if it's a take or a swing-and-miss
      // For strikes/fouls, batter swings and misses
      // For balls, batter takes (no swing)
      tl.to(ballSprite, { x: batterX + 30, duration: 0.1, ease: 'none' });
      tl.to(ballSprite, { alpha: 0, duration: 0.15 });
    }

    // 4. Bat returns to ready position
    tl.to(batterBat, { rotation: 0.7, duration: 0.3, ease: 'power1.out' }, '-=0.2');
  });
}

// Swing and miss animation (for strikes)
async function animateSwingMiss() {
  if (!sceneReady) return;

  const batterX = sceneW * BATTER_X_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // Ball continues toward batter
    tl.to(ballSprite, { x: batterX - 15, duration: 0.2, ease: 'power2.in' });

    // Bat swings and misses
    tl.to(batterBat, { rotation: -1.5, duration: 0.12, ease: 'power3.in' }, '-=0.12');

    // Ball passes through
    tl.to(ballSprite, { x: batterX + 30, duration: 0.1, ease: 'none' });
    tl.to(ballSprite, { alpha: 0, duration: 0.15 });

    // Bat returns
    tl.to(batterBat, { rotation: 0.7, duration: 0.3, ease: 'power1.out' });
  });
}

// Ball taken (walks/balls) — batter doesn't swing
async function animateBallTaken() {
  if (!sceneReady) return;

  const batterX = sceneW * BATTER_X_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // Ball continues past batter (no swing)
    tl.to(ballSprite, { x: batterX + 30, duration: 0.25, ease: 'power1.in' });
    tl.to(ballSprite, { alpha: 0, duration: 0.15 });
  });
}
