// ============================================================
// sprites.js — Stylized Silhouette Characters (Frame-Based)
// ============================================================
//
// Professional silhouette art style with team color accents.
// Each character has pre-drawn pose frames that swap instantly
// (sprite-sheet approach) during animation.
// ============================================================

let spriteApp = null;
let sceneReady = false;
let sceneW = 480;
let sceneH = 200;

const PITCHER_X_PCT = 0.25;
const BATTER_X_PCT = 0.75;
const GROUND_Y_PCT = 0.62;

// --- Silhouette Palette ---
const SIL = 0x0d0d1a;              // Near-black body
const PITCHER_ACCENT = 0xc0392b;    // Red team
const BATTER_ACCENT = 0x27ae60;     // Green team
const BAT_WOOD = 0xb89858;          // Visible wood color

// --- Frame state ---
const pitcherFrames = {};
const batterFrames = {};
let ballSprite = null;
let pitcherContainer = null;
let batterContainer = null;
let currentPitcherFrame = 'idle';
let currentBatterFrame = 'stance';

// Ball spawn point for the release frame (local to pitcher container)
const PITCHER_RELEASE_HAND = { x: 22, y: -42 };

// ============================================================
// Init
// ============================================================

async function initSpriteScene() {
  const container = $('sprite-scene');
  if (!container) return;

  try {
    spriteApp = new PIXI.Application();
    await spriteApp.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
    });
    container.appendChild(spriteApp.canvas);

    sceneW = spriteApp.screen.width;
    sceneH = spriteApp.screen.height;

    drawBackground();
    buildPitcher();
    buildBatter();
    createBall();

    sceneReady = true;
  } catch (e) {
    console.warn('PixiJS init failed:', e);
    sceneReady = false;
  }
}

// ============================================================
// Background
// ============================================================

function drawBackground() {
  const bg = new PIXI.Graphics();
  const groundY = sceneH * GROUND_Y_PCT;

  // Sky
  bg.rect(0, 0, sceneW, groundY).fill(0x1a1a3e);
  // Ground
  bg.rect(0, groundY, sceneW, sceneH - groundY).fill(0x2d5a1e);
  // Dirt line
  bg.rect(0, groundY - 2, sceneW, 4).fill(0x8B6914);
  // Mound
  bg.ellipse(sceneW * PITCHER_X_PCT, groundY - 6, 50, 12).fill(0x8B6914);
  // Home plate
  const px = sceneW * BATTER_X_PCT;
  bg.rect(px - 4, groundY - 2, 8, 4).fill(0xffffff);

  spriteApp.stage.addChild(bg);
}

// ============================================================
// Frame Switching
// ============================================================

function showPitcherFrame(name) {
  if (!sceneReady || !pitcherFrames[name]) return;
  if (pitcherFrames[currentPitcherFrame]) {
    pitcherFrames[currentPitcherFrame].visible = false;
  }
  pitcherFrames[name].visible = true;
  currentPitcherFrame = name;
}

function showBatterFrame(name) {
  if (!sceneReady || !batterFrames[name]) return;
  if (batterFrames[currentBatterFrame]) {
    batterFrames[currentBatterFrame].visible = false;
  }
  batterFrames[name].visible = true;
  currentBatterFrame = name;
}

// ============================================================
// Drawing helpers
// ============================================================

// Draw a limb segment between two points as a thick round-cap stroke.
// Overlapping strokes in the same color merge into a unified silhouette.
function limb(g, x1, y1, x2, y2, w) {
  g.moveTo(x1, y1).lineTo(x2, y2)
    .stroke({ width: w, color: SIL, cap: 'round' });
}

// ============================================================
// Pitcher — 5 pose frames
// ============================================================
// Local coords: (0,0) = feet at ground level, y-negative = up
// Facing RIGHT toward the batter

function buildPitcher() {
  pitcherContainer = new PIXI.Container();
  pitcherContainer.x = sceneW * PITCHER_X_PCT;
  pitcherContainer.y = sceneH * GROUND_Y_PCT;

  // Subtle team-color backlight
  const glow = new PIXI.Graphics();
  glow.circle(0, -32, 40).fill({ color: PITCHER_ACCENT, alpha: 0.06 });
  pitcherContainer.addChild(glow);

  const poses = {
    idle: drawPitcherIdle,
    windup: drawPitcherWindup,
    stride: drawPitcherStride,
    release: drawPitcherRelease,
    followThrough: drawPitcherFollowThrough,
  };

  for (const [name, drawFn] of Object.entries(poses)) {
    const frame = new PIXI.Container();
    const g = new PIXI.Graphics();
    const headPos = drawFn(g);
    frame.addChild(g);

    // Team-color cap
    const cap = new PIXI.Graphics();
    drawCap(cap, headPos.x, headPos.y);
    frame.addChild(cap);

    frame.visible = (name === 'idle');
    pitcherFrames[name] = frame;
    pitcherContainer.addChild(frame);
  }

  spriteApp.stage.addChild(pitcherContainer);
}

function drawCap(g, hx, hy) {
  g.roundRect(hx - 9, hy - 10, 18, 7, 2).fill(PITCHER_ACCENT);
  g.rect(hx + 3, hy - 5, 9, 3).fill(PITCHER_ACCENT); // brim toward batter
}

// --- Idle: relaxed standing, glove at side ---
function drawPitcherIdle(g) {
  // Legs
  limb(g, -7, -22, -8, -10, 6);
  limb(g, -8, -10, -10, 2, 5.5);
  limb(g, 7, -22, 8, -10, 6);
  limb(g, 8, -10, 10, 2, 5.5);

  // Glove arm (left)
  limb(g, -9, -44, -15, -33, 4.5);
  limb(g, -15, -33, -12, -24, 4.5);
  g.circle(-12, -24, 4).fill(SIL);

  // Throwing arm (right)
  limb(g, 9, -44, 14, -33, 4.5);
  limb(g, 14, -33, 12, -26, 4.5);

  // Torso
  g.roundRect(-9, -46, 18, 26, 3).fill(SIL);
  g.rect(-9, -40, 18, 2).fill({ color: PITCHER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(0, -54, 8).fill(SIL);

  return { x: 0, y: -54 };
}

// --- Wind-up: lead leg raised, hands together overhead ---
function drawPitcherWindup(g) {
  // Planted back leg (left)
  limb(g, -6, -22, -8, -10, 6);
  limb(g, -8, -10, -9, 2, 5.5);

  // Raised lead leg (right) — knee up, shin hanging
  limb(g, 6, -22, 10, -34, 6);
  limb(g, 10, -34, 7, -26, 5.5);

  // Arms together overhead
  limb(g, -8, -46, -3, -56, 4.5);
  limb(g, -3, -56, 0, -64, 4.5);
  limb(g, 8, -46, 3, -56, 4.5);
  limb(g, 3, -56, 0, -64, 4.5);
  g.circle(0, -64, 4).fill(SIL); // glove + ball

  // Torso
  g.roundRect(-9, -48, 18, 26, 3).fill(SIL);
  g.rect(-9, -42, 18, 2).fill({ color: PITCHER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(1, -56, 8).fill(SIL);

  return { x: 1, y: -56 };
}

// --- Stride: stepping forward, arm cocked behind ---
function drawPitcherStride(g) {
  // Back leg (pushing off)
  limb(g, -6, -22, -10, -10, 6);
  limb(g, -10, -10, -14, 2, 5.5);

  // Lead leg (striding forward)
  limb(g, 6, -22, 14, -10, 6);
  limb(g, 14, -10, 18, 2, 5.5);

  // Glove arm (extending forward)
  limb(g, -6, -42, 4, -38, 4.5);
  limb(g, 4, -38, 12, -36, 4.5);
  g.circle(12, -36, 4).fill(SIL);

  // Throwing arm (cocked behind head)
  limb(g, 4, -42, -2, -50, 4.5);
  limb(g, -2, -50, -8, -56, 4.5);

  // Torso (leaning forward)
  g.roundRect(-7, -44, 16, 24, 3).fill(SIL);
  g.rect(-7, -38, 16, 2).fill({ color: PITCHER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(5, -52, 8).fill(SIL);

  return { x: 5, y: -52 };
}

// --- Release: arm extended forward, ball releasing ---
function drawPitcherRelease(g) {
  // Back leg
  limb(g, -6, -20, -10, -8, 6);
  limb(g, -10, -8, -14, 2, 5.5);

  // Front leg (planted)
  limb(g, 6, -22, 16, -10, 6);
  limb(g, 16, -10, 20, 2, 5.5);

  // Glove arm (pulling in)
  limb(g, -4, -40, -2, -32, 4.5);
  limb(g, -2, -32, -6, -26, 4.5);
  g.circle(-6, -26, 4).fill(SIL);

  // Throwing arm (extended forward — release point!)
  limb(g, 8, -40, 16, -44, 4.5);
  limb(g, 16, -44, 22, -42, 4.5);

  // Torso (rotated forward)
  g.roundRect(-5, -42, 16, 22, 3).fill(SIL);
  g.rect(-5, -36, 16, 2).fill({ color: PITCHER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(8, -50, 8).fill(SIL);

  return { x: 8, y: -50 };
}

// --- Follow-through: arm across body ---
function drawPitcherFollowThrough(g) {
  // Back leg (trailing)
  limb(g, -4, -20, -2, -8, 6);
  limb(g, -2, -8, -6, 2, 5.5);

  // Front leg (bearing weight)
  limb(g, 6, -22, 16, -10, 6);
  limb(g, 16, -10, 20, 2, 5.5);

  // Glove arm (tucked)
  limb(g, -2, -38, 4, -30, 4.5);
  limb(g, 4, -30, 2, -24, 4.5);
  g.circle(2, -24, 4).fill(SIL);

  // Throwing arm (across body)
  limb(g, 6, -40, 0, -32, 4.5);
  limb(g, 0, -32, -10, -28, 4.5);

  // Torso
  g.roundRect(-3, -40, 14, 22, 3).fill(SIL);
  g.rect(-3, -34, 14, 2).fill({ color: PITCHER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(8, -48, 8).fill(SIL);

  return { x: 8, y: -48 };
}

// ============================================================
// Batter — 4 pose frames
// ============================================================
// Local coords: (0,0) = feet at ground level, y-negative = up
// Facing LEFT toward the pitcher

function buildBatter() {
  batterContainer = new PIXI.Container();
  batterContainer.x = sceneW * BATTER_X_PCT;
  batterContainer.y = sceneH * GROUND_Y_PCT;

  // Subtle team-color backlight
  const glow = new PIXI.Graphics();
  glow.circle(0, -32, 40).fill({ color: BATTER_ACCENT, alpha: 0.06 });
  batterContainer.addChild(glow);

  const poses = {
    stance: drawBatterStance,
    load: drawBatterLoad,
    swing: drawBatterSwing,
    followThrough: drawBatterFollowThrough,
  };

  for (const [name, drawFn] of Object.entries(poses)) {
    const frame = new PIXI.Container();
    const g = new PIXI.Graphics();
    const headPos = drawFn(g);
    frame.addChild(g);

    // Team-color helmet
    const helmet = new PIXI.Graphics();
    drawHelmet(helmet, headPos.x, headPos.y);
    frame.addChild(helmet);

    frame.visible = (name === 'stance');
    batterFrames[name] = frame;
    batterContainer.addChild(frame);
  }

  spriteApp.stage.addChild(batterContainer);
}

function drawHelmet(g, hx, hy) {
  // Helmet covering top of head
  g.arc(hx, hy, 9.5, -Math.PI, 0).fill(BATTER_ACCENT);
  // Ear flap (back/right side)
  g.roundRect(hx + 4, hy - 4, 5, 10, 2).fill(BATTER_ACCENT);
  // Brim toward pitcher (left)
  g.rect(hx - 13, hy - 3, 11, 3).fill(BATTER_ACCENT);
}

// --- Stance: athletic batting stance, bat on shoulder ---
function drawBatterStance(g) {
  // Legs (athletic crouch)
  limb(g, -6, -22, -10, -10, 6);
  limb(g, -10, -10, -12, 2, 5.5);
  limb(g, 6, -22, 9, -10, 6);
  limb(g, 9, -10, 10, 2, 5.5);

  // Arms (hands together holding bat at right shoulder)
  limb(g, -7, -44, -1, -37, 4.5);  // left arm bottom hand
  limb(g, -1, -37, 5, -38, 4.5);
  limb(g, 7, -44, 7, -39, 4.5);    // right arm top hand
  limb(g, 7, -39, 5, -38, 4.5);

  // Torso
  g.roundRect(-9, -46, 18, 26, 3).fill(SIL);
  g.rect(-9, -40, 18, 2).fill({ color: BATTER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(-1, -54, 8).fill(SIL);

  // BAT (wood color — handle from hands, barrel extends up and back)
  g.moveTo(5, -38).lineTo(10, -50)
    .stroke({ width: 3, color: BAT_WOOD, cap: 'round' });
  g.moveTo(10, -50).lineTo(12, -62)
    .stroke({ width: 4.5, color: BAT_WOOD, cap: 'round' }); // barrel

  return { x: -1, y: -54 };
}

// --- Load: weight shifted back, bat cocked further ---
function drawBatterLoad(g) {
  // Legs (weight back)
  limb(g, -6, -22, -8, -10, 6);
  limb(g, -8, -10, -10, 0, 5.5);
  limb(g, 6, -22, 10, -10, 6);
  limb(g, 10, -10, 11, 2, 5.5);

  // Arms (hands shifted back)
  limb(g, -6, -44, 2, -38, 4.5);
  limb(g, 2, -38, 8, -40, 4.5);
  limb(g, 7, -44, 8, -40, 4.5);

  // Torso
  g.roundRect(-8, -46, 18, 26, 3).fill(SIL);
  g.rect(-8, -40, 18, 2).fill({ color: BATTER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(0, -54, 8).fill(SIL);

  // BAT (cocked further back)
  g.moveTo(8, -40).lineTo(14, -52)
    .stroke({ width: 3, color: BAT_WOOD, cap: 'round' });
  g.moveTo(14, -52).lineTo(18, -62)
    .stroke({ width: 4.5, color: BAT_WOOD, cap: 'round' });

  return { x: 0, y: -54 };
}

// --- Swing: full extension, bat horizontal through zone ---
function drawBatterSwing(g) {
  // Legs (weight shifting forward)
  limb(g, -6, -22, -12, -10, 6);
  limb(g, -12, -10, -14, 2, 5.5);
  limb(g, 6, -22, 5, -10, 6);
  limb(g, 5, -10, 3, 2, 5.5);

  // Arms (extended through contact zone)
  limb(g, -7, -42, -9, -36, 4.5);
  limb(g, -9, -36, -12, -34, 4.5);
  limb(g, 7, -44, -2, -38, 4.5);
  limb(g, -2, -38, -12, -34, 4.5);

  // Torso (rotated)
  g.roundRect(-8, -46, 16, 26, 3).fill(SIL);
  g.rect(-8, -40, 16, 2).fill({ color: BATTER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(-3, -52, 8).fill(SIL);

  // BAT (horizontal through zone, extending toward pitcher)
  g.moveTo(-12, -34).lineTo(-24, -36)
    .stroke({ width: 3, color: BAT_WOOD, cap: 'round' });
  g.moveTo(-24, -36).lineTo(-38, -37)
    .stroke({ width: 5, color: BAT_WOOD, cap: 'round' }); // barrel

  return { x: -3, y: -52 };
}

// --- Follow-through: bat wraps around to left shoulder ---
function drawBatterFollowThrough(g) {
  // Legs (weight on front foot)
  limb(g, -6, -22, -14, -10, 6);
  limb(g, -14, -10, -16, 2, 5.5);
  limb(g, 6, -22, 4, -10, 6);
  limb(g, 4, -10, 2, 2, 5.5);

  // Arms (wrapping around)
  limb(g, -6, -42, -10, -46, 4.5);
  limb(g, -10, -46, -8, -50, 4.5);
  limb(g, 6, -42, -2, -44, 4.5);
  limb(g, -2, -44, -8, -50, 4.5);

  // Torso
  g.roundRect(-7, -44, 14, 24, 3).fill(SIL);
  g.rect(-7, -38, 14, 2).fill({ color: BATTER_ACCENT, alpha: 0.35 });

  // Head
  g.circle(-4, -52, 8).fill(SIL);

  // BAT (wrapped around behind left shoulder)
  g.moveTo(-8, -50).lineTo(-6, -58)
    .stroke({ width: 3, color: BAT_WOOD, cap: 'round' });
  g.moveTo(-6, -58).lineTo(-2, -68)
    .stroke({ width: 4.5, color: BAT_WOOD, cap: 'round' });

  return { x: -4, y: -52 };
}

// ============================================================
// Ball
// ============================================================

function createBall() {
  ballSprite = new PIXI.Graphics();
  ballSprite.circle(0, 0, 5).fill(0xffffff);
  ballSprite.circle(0, 0, 5).stroke({ width: 1, color: 0xcc0000 });
  ballSprite.visible = false;
  spriteApp.stage.addChild(ballSprite);
}

// ============================================================
// Reset
// ============================================================

function resetSpriteScene() {
  if (!sceneReady) return;
  showPitcherFrame('idle');
  showBatterFrame('stance');
  if (ballSprite) {
    ballSprite.visible = false;
    ballSprite.alpha = 1;
  }
}
