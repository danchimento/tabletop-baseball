// ============================================================
// sprites.js — Retro Pixel Art Characters (Frame-Based)
// ============================================================
//
// 16-bit style pixel art sprites rendered to PixiJS textures.
// Each pose is a hand-crafted pixel grid at native resolution,
// scaled up with nearest-neighbor for crisp retro look.
// ============================================================

let spriteApp = null;
let sceneReady = false;
let sceneW = 480;
let sceneH = 200;

const PITCHER_X_PCT = 0.25;
const BATTER_X_PCT = 0.75;
const GROUND_Y_PCT = 0.62;

// --- Pixel Art Palette ---
const P = {
  _: null,          // transparent
  K: 0x0d0d1a,     // black (outline)
  R: 0xc0392b,     // red (pitcher jersey)
  r: 0xe74c3c,     // light red (pitcher highlight)
  G: 0x27ae60,     // green (batter jersey)
  g: 0x2ecc71,     // light green (batter highlight)
  S: 0xf0c8a0,     // skin
  s: 0xd4a574,     // skin shadow
  W: 0xffffff,     // white
  w: 0xcccccc,     // light gray
  H: 0x8B6914,     // hat dark / wood
  h: 0xb89858,     // hat light / bat wood
  B: 0x5c3317,     // brown (glove)
  b: 0x7a4a2a,     // light brown (glove highlight)
  N: 0x2c3e50,     // navy (pants)
  n: 0x34495e,     // navy highlight
  T: 0x1a1a2e,     // dark (cleats)
  Y: 0xf0c040,     // yellow/gold accent
};

// Pixel size when rendered (each pixel in the grid = PX×PX on screen)
const PX = 3;

// --- Frame state ---
const pitcherFrames = {};
const batterFrames = {};
let ballSprite = null;
let pitcherContainer = null;
let batterContainer = null;
let currentPitcherFrame = 'idle';
let currentBatterFrame = 'stance';

// Ball spawn point for the release frame (local to pitcher container)
const PITCHER_RELEASE_HAND = { x: 24, y: -40 };

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
      antialias: false, // crisp pixels
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

  bg.rect(0, 0, sceneW, groundY).fill(0x1a1a3e);
  bg.rect(0, groundY, sceneW, sceneH - groundY).fill(0x2d5a1e);
  bg.rect(0, groundY - 2, sceneW, 4).fill(0x8B6914);
  bg.ellipse(sceneW * PITCHER_X_PCT, groundY - 6, 50, 12).fill(0x8B6914);
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
// Pixel Grid Renderer
// ============================================================

// Takes a 2D array of palette keys and renders to a PIXI.Container
// Each cell = PX×PX pixels. Origin is bottom-center of the grid.
function renderPixelGrid(grid) {
  const container = new PIXI.Container();
  const rows = grid.length;
  const cols = grid[0].length;
  const g = new PIXI.Graphics();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = grid[r][c];
      if (key === '_') continue;
      const color = P[key];
      if (color == null) continue;
      g.rect(c * PX, r * PX, PX, PX).fill(color);
    }
  }

  container.addChild(g);

  // Offset so origin = bottom-center
  container.pivot.set((cols * PX) / 2, rows * PX);

  return container;
}

// Helper: convert a compact string grid to 2D array
// Each char is a palette key, rows separated by newlines
function grid(str) {
  return str.trim().split('\n').map(row => row.trim().split(''));
}

// ============================================================
// Pitcher Pixel Art — 5 Poses (facing right)
// ============================================================
// Grid is ~16 wide × 22 tall (48×66 px at PX=3)

const PITCHER_GRIDS = {};

// --- Idle: standing relaxed on mound ---
PITCHER_GRIDS.idle = grid(`
____KKKK________
___KRrRRK_______
___KRRRRKK______
____KKKK________
____KSsK________
____KSKK________
___KKWWKK_______
__KKRrRRKK______
__KRRrRRRK______
__KRRWRRRKBb____
__KKRRRRKK_K____
___sKKKKKs______
____KNNNK_______
____KNNNK_______
____KNNKK_______
____KNnNK_______
____KNKNK_______
____KKKK________
____KTKKT_______
____KTKKT_______
____KKKK________
`);

// --- Wind-up: leg raised, hands together overhead ---
PITCHER_GRIDS.windup = grid(`
____KKKK________
___KRrRRK_______
___KRRRRKK______
____KKKK________
____KSsK________
___BbSSK________
__K_KWWKK_______
__KKRrRRKK______
___KRRrRRK______
___KRRWRRKK_____
___KKRRRRKK_____
____KKKKK_______
____KNNNK_______
____KNKK________
____KNK_________
____KKK_KNNK____
_________KNKK___
__________KKK___
____KTKK________
____KTKK________
____KKKK________
`);

// --- Stride: stepping forward, arm cocked back ---
PITCHER_GRIDS.stride = grid(`
______KKKK______
_____KRrRRK_____
_____KRRRRKK____
______KKKK______
______KSsK______
______KSKK______
__Ss_KKWWKK_____
_K_KKRrRRKK_____
_Ss_KRRrRRKKK___
_K___KRRWRR_KK__
______KRRRRK____
______KKKKK_____
_____KNNNKK_____
_____KNnNK______
____KNnNK_______
____KNKK__KNNK__
____KKK____KNKK_
____________KKK_
___KTKK___KTKK__
___KTKK___KTKK__
___KKKK___KKKK__
`);

// --- Release: arm extended forward, ball at hand ---
PITCHER_GRIDS.release = grid(`
_______KKKK_____
______KRrRRK____
______KRRRRKK___
_______KKKK_____
_______KSsK_____
_______KSKK_____
______KKWWKK____
_____KKRrRRKKSsW
_____KRRrRRRKK__
__Bb_KRRWRRRKK__
__K__KKRRRRKK___
______KKKKK_____
______KNNNK_____
_____KNnNK______
____KNnNK_______
____KNKK__KNNK__
____KKK____KNKK_
____________KKK_
___KTKK___KTKK__
___KTKK___KTKK__
___KKKK___KKKK__
`);

// --- Follow-through: arm across body ---
PITCHER_GRIDS.followThrough = grid(`
________KKKK____
_______KRrRRK___
_______KRRRRKK__
________KKKK____
________KSsK____
________KSKK____
_______KKWWKK___
______KKRrRRKK__
______KRRrRRRK__
___Ss_KRRWRRRKK_
__KK__KKRRRRKK__
__BbK__KKKKK____
_______KNNNK____
______KNnNK_____
_____KNnNK______
_____KNKK_KNNK__
_____KKK___KNKK_
____________KKK_
___KTKK___KTKK__
___KTKK___KTKK__
___KKKK___KKKK__
`);

// ============================================================
// Batter Pixel Art — 4 Poses (facing left)
// ============================================================

const BATTER_GRIDS = {};

// --- Stance: athletic ready position, bat on shoulder ---
BATTER_GRIDS.stance = grid(`
___________hK___
__________hHK___
_________hHK____
________KKKK____
_______KGgGGK___
_______KGGGRKK__
________KKKK____
________KSsK____
________KSKK____
_______KKWWKK___
______KKGgGGKK__
______KGGgGGGK__
______KGGWGGKK__
______KKGGGKK___
_______KKKKK____
_______KNNNK____
_______KNNNK____
_______KNNKK____
_______KNnNK____
_______KNKNK____
________KKKK____
_______KTKKT____
_______KTKKT____
________KKKK____
`);

// --- Load: weight shifted back, bat cocked ---
BATTER_GRIDS.load = grid(`
____________hK__
___________hHK__
__________hHK___
_________hHK____
________KKKK____
_______KGgGGK___
_______KGGGRKK__
________KKKK____
________KSsK____
________KSKK____
_______KKWWKK___
______KKGgGGKKs_
______KGGgGGGKK_
______KGGWGGKK__
______KKGGGKK___
_______KKKKK____
_______KNNNK____
_______KNNNK____
______KNNKK_____
______KNnNK_____
_______KNKNK____
________KKKK____
______KTKK_KTK__
______KTKK_KTK__
_______KKK_KKK__
`);

// --- Swing: bat horizontal through zone ---
BATTER_GRIDS.swing = grid(`
________KKKK____
_______KGgGGK___
_______KGGGRKK__
________KKKK____
________KSsK____
________KSKK____
_______KKWWKK___
______KKGgGGKK__
______KGGgGGGK__
_KhHhHKGGWGGKK__
_______KKGGGKK__
________KKKKK___
_______KNNNK____
_______KNNNK____
______KNNKK_____
______KNnNK_____
_______KNKNK____
________KKKK____
______KTKK_KTK__
______KTKK_KTK__
_______KKK_KKK__
`);

// --- Follow-through: bat wraps around behind ---
BATTER_GRIDS.followThrough = grid(`
___K____________
___Kh___________
___KHh__________
____KHh_________
________KKKK____
_______KGgGGK___
_______KGGGRKK__
________KKKK____
________KSsK____
_______KKSKK____
______KKWWKK____
_____KKGgGGKK___
_____KGGgGGGK___
_____KGGWGGKK___
______KKGGGKK___
_______KKKKK____
______KNNNK_____
______KNNNK_____
_____KNNKK______
_____KNnNK______
______KNKNK_____
_______KKKK_____
_____KTKK_KTK__
_____KTKK_KTK__
______KKK_KKK__
`);

// ============================================================
// Build Characters
// ============================================================

function buildPitcher() {
  pitcherContainer = new PIXI.Container();
  pitcherContainer.x = sceneW * PITCHER_X_PCT;
  pitcherContainer.y = sceneH * GROUND_Y_PCT;

  for (const [name, g] of Object.entries(PITCHER_GRIDS)) {
    const frame = renderPixelGrid(g);
    frame.visible = (name === 'idle');
    pitcherFrames[name] = frame;
    pitcherContainer.addChild(frame);
  }

  spriteApp.stage.addChild(pitcherContainer);
}

function buildBatter() {
  batterContainer = new PIXI.Container();
  batterContainer.x = sceneW * BATTER_X_PCT;
  batterContainer.y = sceneH * GROUND_Y_PCT;

  for (const [name, g] of Object.entries(BATTER_GRIDS)) {
    const frame = renderPixelGrid(g);
    frame.visible = (name === 'stance');
    batterFrames[name] = frame;
    batterContainer.addChild(frame);
  }

  spriteApp.stage.addChild(batterContainer);
}

// ============================================================
// Ball
// ============================================================

function createBall() {
  ballSprite = new PIXI.Graphics();
  // Pixel-art style ball: 3×3 pixel grid
  const bs = PX;
  ballSprite.rect(-bs, -bs, bs * 3, bs * 3).fill(0xffffff);
  ballSprite.rect(0, -bs, bs, bs).fill(0xcc0000);   // top red stitch
  ballSprite.rect(-bs, 0, bs, bs).fill(0xcc0000);   // left red stitch
  ballSprite.rect(bs, 0, bs, bs).fill(0xcc0000);    // right red stitch
  ballSprite.rect(0, bs, bs, bs).fill(0xcc0000);    // bottom red stitch
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
