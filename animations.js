// ============================================================
// animations.js — Frame-Based Sprite Animation
// ============================================================
//
// Swaps pre-drawn pixel art pose frames on a GSAP timeline.
// No rotation tweening — each frame is a complete character pose
// rendered from a pixel grid, giving crisp retro sprite-sheet motion.
// ============================================================

// Pitch throw: wind-up → stride → release → follow-through
// Ball travels from release point to midpoint, then bullet-time pause
async function animatePitchThrow() {
  if (!sceneReady) return;

  const pitcherX = sceneW * PITCHER_X_PCT;
  const batterX = sceneW * BATTER_X_PCT;
  const groundY = sceneH * GROUND_Y_PCT;
  const midX = (pitcherX + batterX) / 2;

  // Ball starts at pitcher's release hand position
  const ballX = pitcherX + PITCHER_RELEASE_HAND.x;
  const ballY = groundY + PITCHER_RELEASE_HAND.y;

  ballSprite.x = ballX;
  ballSprite.y = ballY;
  ballSprite.alpha = 1;
  ballSprite.visible = false;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // 1. Wind-up (t=0.00)
    tl.call(() => showPitcherFrame('windup'), null, 0);

    // 2. Stride (t=0.30)
    tl.call(() => showPitcherFrame('stride'), null, 0.30);

    // 3. Release — ball appears (t=0.45)
    tl.call(() => {
      showPitcherFrame('release');
      ballSprite.visible = true;
    }, null, 0.45);

    // 4. Ball travels at full speed toward midpoint (0.25s)
    tl.to(ballSprite, { x: midX, duration: 0.25, ease: 'power1.in' }, 0.48);

    // 5. Follow-through (t=0.55)
    tl.call(() => showPitcherFrame('followThrough'), null, 0.55);

    // 6. Bullet-time: ball slows dramatically near midpoint (0.6s)
    tl.to(ballSprite, { x: midX + 30, duration: 0.6, ease: 'power4.out' }, 0.73);

    // 7. Pitcher returns to idle (t=1.20)
    tl.call(() => showPitcherFrame('idle'), null, 1.20);
  });
}

// Batter resolves: ball continues, batter reacts based on contact
async function animateBatterResolve(didMakeContact) {
  if (!sceneReady) return;

  const batterX = sceneW * BATTER_X_PCT;
  const pitcherX = sceneW * PITCHER_X_PCT;
  const midX = (pitcherX + batterX) / 2;
  const groundY = sceneH * GROUND_Y_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    if (didMakeContact) {
      // Load stance — weight shifts back
      tl.call(() => showBatterFrame('load'), null, 0);

      // Ball resumes toward batter
      tl.to(ballSprite, { x: batterX - 15, duration: 0.2, ease: 'power2.in' }, 0);

      // Swing through contact
      tl.call(() => showBatterFrame('swing'), null, 0.16);

      // Ball reverses upward (hit!)
      tl.to(ballSprite, {
        x: midX - 40,
        y: groundY - 100,
        duration: 0.5,
        ease: 'power2.out'
      }, 0.22);
      tl.to(ballSprite, { alpha: 0, duration: 0.2 }, 0.52);

      // Follow-through
      tl.call(() => showBatterFrame('followThrough'), null, 0.30);

      // Return to stance
      tl.call(() => showBatterFrame('stance'), null, 0.75);
    } else {
      // Ball passes by (no contact)
      tl.to(ballSprite, { x: batterX - 15, duration: 0.2, ease: 'power2.in' });
      tl.to(ballSprite, { x: batterX + 30, duration: 0.1, ease: 'none' });
      tl.to(ballSprite, { alpha: 0, duration: 0.15 });

      // Return to stance
      tl.call(() => showBatterFrame('stance'), null, '+=0.15');
    }
  });
}

// Swing and miss (for strikes/fouls)
async function animateSwingMiss() {
  if (!sceneReady) return;

  const batterX = sceneW * BATTER_X_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // Load
    tl.call(() => showBatterFrame('load'), null, 0);

    // Ball continues toward batter
    tl.to(ballSprite, { x: batterX - 15, duration: 0.2, ease: 'power2.in' }, 0);

    // Swing and miss
    tl.call(() => showBatterFrame('swing'), null, 0.14);

    // Ball passes through
    tl.to(ballSprite, { x: batterX + 30, duration: 0.1, ease: 'none' }, 0.22);
    tl.to(ballSprite, { alpha: 0, duration: 0.15 }, 0.32);

    // Follow-through
    tl.call(() => showBatterFrame('followThrough'), null, 0.28);

    // Return to stance
    tl.call(() => showBatterFrame('stance'), null, 0.55);
  });
}

// Ball taken (walks/balls) — batter doesn't swing
async function animateBallTaken() {
  if (!sceneReady) return;

  const batterX = sceneW * BATTER_X_PCT;

  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve });

    // Ball continues past batter (no swing — stays in stance)
    tl.to(ballSprite, { x: batterX + 30, duration: 0.25, ease: 'power1.in' });
    tl.to(ballSprite, { alpha: 0, duration: 0.15 });
  });
}
