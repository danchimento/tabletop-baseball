// ============================================================
// sprites.js — PixiJS Sprite Scene (Pitcher & Batter)
// ============================================================

let spriteApp = null;
let pitcherContainer = null;
let batterContainer = null;
let pitcherArm = null;
let batterBat = null;
let ballSprite = null;
let sceneReady = false;

// Scene dimensions (will be set on init)
let sceneW = 480;
let sceneH = 200;

// Key positions (percentages of scene width/height)
const PITCHER_X_PCT = 0.25;
const BATTER_X_PCT = 0.75;
const GROUND_Y_PCT = 0.62;
const CHAR_SCALE = 1.0;

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
    createPitcher();
    createBatter();
    createBall();

    sceneReady = true;
  } catch (e) {
    console.warn('PixiJS init failed:', e);
    sceneReady = false;
  }
}

function drawBackground() {
  const bg = new PIXI.Graphics();
  const groundY = sceneH * GROUND_Y_PCT;

  // Sky gradient (dark blue)
  bg.rect(0, 0, sceneW, groundY).fill(0x1a1a3e);

  // Ground
  bg.rect(0, groundY, sceneW, sceneH - groundY).fill(0x2d5a1e);

  // Dirt line
  bg.rect(0, groundY - 2, sceneW, 4).fill(0x8B6914);

  // Pitcher mound
  const moundX = sceneW * PITCHER_X_PCT;
  const moundW = 50;
  const moundH = 12;
  bg.ellipse(moundX, groundY - moundH / 2, moundW, moundH).fill(0x8B6914);

  // Home plate area
  const plateX = sceneW * BATTER_X_PCT;
  bg.rect(plateX - 3, groundY - 3, 6, 6).fill(0xffffff);

  spriteApp.stage.addChild(bg);
}

function createPitcher() {
  pitcherContainer = new PIXI.Container();
  const px = sceneW * PITCHER_X_PCT;
  const groundY = sceneH * GROUND_Y_PCT;
  pitcherContainer.x = px;
  pitcherContainer.y = groundY;

  const s = CHAR_SCALE;

  // Body
  const body = new PIXI.Graphics();
  body.roundRect(-10 * s, -45 * s, 20 * s, 35 * s, 3).fill(0xc0392b);
  pitcherContainer.addChild(body);

  // Head
  const head = new PIXI.Graphics();
  head.circle(0, -55 * s, 10 * s).fill(0xf0d0a0);
  pitcherContainer.addChild(head);

  // Cap
  const cap = new PIXI.Graphics();
  cap.rect(-12 * s, -66 * s, 24 * s, 7 * s).fill(0xc0392b);
  cap.rect(-14 * s, -61 * s, 10 * s, 3 * s).fill(0xc0392b); // brim
  pitcherContainer.addChild(cap);

  // Left leg (static)
  const legL = new PIXI.Graphics();
  legL.moveTo(-6 * s, -10 * s).lineTo(-10 * s, 12 * s)
    .stroke({ width: 3, color: 0x222222 });
  pitcherContainer.addChild(legL);

  // Right leg (static)
  const legR = new PIXI.Graphics();
  legR.moveTo(6 * s, -10 * s).lineTo(10 * s, 12 * s)
    .stroke({ width: 3, color: 0x222222 });
  pitcherContainer.addChild(legR);

  // Throwing arm (separate for animation)
  pitcherArm = new PIXI.Graphics();
  pitcherArm.moveTo(0, 0).lineTo(20 * s, -5 * s)
    .stroke({ width: 4, color: 0xf0d0a0 });
  // Glove at end of arm
  pitcherArm.circle(20 * s, -5 * s, 5 * s).fill(0x5c3317);
  pitcherArm.x = 8 * s;
  pitcherArm.y = -38 * s;
  pitcherArm.pivot.set(0, 0);
  pitcherContainer.addChild(pitcherArm);

  spriteApp.stage.addChild(pitcherContainer);
}

function createBatter() {
  batterContainer = new PIXI.Container();
  const bx = sceneW * BATTER_X_PCT;
  const groundY = sceneH * GROUND_Y_PCT;
  batterContainer.x = bx;
  batterContainer.y = groundY;

  const s = CHAR_SCALE;

  // Body
  const body = new PIXI.Graphics();
  body.roundRect(-10 * s, -45 * s, 20 * s, 35 * s, 3).fill(0x27ae60);
  batterContainer.addChild(body);

  // Head
  const head = new PIXI.Graphics();
  head.circle(0, -55 * s, 10 * s).fill(0xf0d0a0);
  batterContainer.addChild(head);

  // Helmet
  const helmet = new PIXI.Graphics();
  helmet.arc(0, -55 * s, 11 * s, -Math.PI, 0).fill(0x27ae60);
  helmet.rect(-12 * s, -56 * s, 6 * s, 3 * s).fill(0x27ae60); // brim
  batterContainer.addChild(helmet);

  // Legs
  const legL = new PIXI.Graphics();
  legL.moveTo(-6 * s, -10 * s).lineTo(-10 * s, 12 * s)
    .stroke({ width: 3, color: 0x222222 });
  batterContainer.addChild(legL);

  const legR = new PIXI.Graphics();
  legR.moveTo(6 * s, -10 * s).lineTo(8 * s, 12 * s)
    .stroke({ width: 3, color: 0x222222 });
  batterContainer.addChild(legR);

  // Bat (separate for animation)
  batterBat = new PIXI.Graphics();
  batterBat.moveTo(0, 0).lineTo(-5 * s, -30 * s)
    .stroke({ width: 4, color: 0xc8a040 });
  // Bat tip (thicker)
  batterBat.moveTo(-5 * s, -30 * s).lineTo(-7 * s, -38 * s)
    .stroke({ width: 6, color: 0xc8a040 });
  batterBat.x = -10 * s;
  batterBat.y = -35 * s;
  batterBat.pivot.set(0, 0);
  batterBat.rotation = 0.7; // Bat held up and back (~40 degrees)
  batterContainer.addChild(batterBat);

  spriteApp.stage.addChild(batterContainer);
}

function createBall() {
  ballSprite = new PIXI.Graphics();
  ballSprite.circle(0, 0, 5).fill(0xffffff);
  ballSprite.circle(0, 0, 5).stroke({ width: 1, color: 0xcc0000 });
  ballSprite.visible = false;
  spriteApp.stage.addChild(ballSprite);
}

function resetSpriteScene() {
  if (!sceneReady) return;

  // Reset pitcher arm
  if (pitcherArm) {
    gsap.set(pitcherArm, { rotation: 0 });
  }

  // Reset batter bat
  if (batterBat) {
    gsap.set(batterBat, { rotation: 0.7 });
  }

  // Hide ball
  if (ballSprite) {
    ballSprite.visible = false;
    ballSprite.alpha = 1;
  }
}
