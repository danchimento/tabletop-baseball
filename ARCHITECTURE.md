# Tabletop Dice Baseball — Architecture

## File Structure
```
tabletop-baseball/
├── index.html          # Single-page app structure
├── style.css           # All styling (dark theme, mobile-first)
├── game.js             # Game logic, animations, rendering
├── REQUIREMENTS.md     # Game design and rules
├── ARCHITECTURE.md     # This file
└── HANDOFF.md          # Original design handoff
```

## Game Phases (State Machine)
```
PRE_PITCH ──(pitch clock hits 0)──► ANIMATING (pitcher roll)
                                        │
                                        ▼
                                   BATTER_READY ──(auto)──► ANIMATING (batter roll → battle → outcome)
                                                                │
                                   ┌────────────────────────────┤
                                   │                            │
                             strike/ball/foul               contact
                                   │                            │
                                   ▼                            ▼
                             PRE_PITCH                     CONTACT (modal)
                             + pitch clock                      │
                             (or AT_BAT_RESULT                  ▼
                              if K/BB)                    AT_BAT_RESULT
                                   │                            │
                                   ▼                            ▼
                             ┌─────┴─────┐                ┌─────┴─────┐
                             │           │                │           │
                        next batter  INNING_OVER     next batter  INNING_OVER
```

Note: There is no manual "Start Pitch" or "Swing!" button. The pitch clock auto-triggers pitches, and batter swing follows automatically.

## Animation System
All animations use **async/await** with CSS transitions and JS-driven frame updates. All timings are ~50% faster than original.

### Key Animation Functions
| Function | Description |
|----------|-------------|
| `spinDie(element, finalValue)` | Rapidly cycles die face, slowing to final value (~1s) |
| `sortDice(side, values)` | Swaps dice vertically if needed (CSS transform + DOM swap, 200ms) |
| `animateBattlePair(index, pVal, bVal, winner)` | Slides two dice from sides to center, resolves winner |
| `flyDieToBar(laneIndex, color, value)` | Animates surviving die upward into outcome bar |
| `moveIndicator(newValue)` | Slides outcome bar indicator to target position (value-based) |
| `shakeIndicator()` | Shakes indicator for ties |

### Animation Timing
```
Pitch sequence (~3-4 seconds per pitch, fully automatic):
  Pitcher spin:               ~1.0s
  Pitcher sort:               ~0.25s
  Batter spin:                ~1.0s
  Batter sort:                ~0.25s
  Battle pair 1:              ~0.5s
  Battle pair 2:              ~0.5s
  Outcome die 1 → bar:        ~0.4s
  Outcome die 2 → bar:        ~0.4s
  Result display:              ~0.2s
```

### Contact Animation
```
Contact modal (~3s total):
  Dice spin at home plate:    ~1.0s
  Dice fade out:              ~0.15s
  Baseball appears:           instant
  Ball flies to position:     ~0.5-0.7s (infield: direct, outfield: arc with scale)
  Catch marker (if out):      ~0.2s pop-in
  Outcome text:               ~0.2s pop
  Display pause:              ~1.2s
```

## Layout Architecture

### Top section
```
┌─────────────────────────────────────┐
│  Score: 0    Top 1st      Outs: ○○○ │  ← scoreboard
│        ◇ diamond    B ○○○○  S ○○○   │  ← status row
├─────────────────────────────────────┤
│  PITCHER                    BATTER  │  ← player names row
├─────────────────────────────────────┤
│  K    Foul      ●      Ball   Hit!  │  ← outcome bar (full width, 0 centered)
├──────────┬──────────────┬───────────┤
│ [Die]    │ [Battle Zone]│  [Die]    │  ← 3-col battlefield
│ [Die]    │  Lane 0      │  [Die]    │
│          │  Lane 1      │           │
└──────────┴──────────────┴───────────┘
│ [Next Batter / View Summary]        │  ← action button
│ [Test Hit] [Sliders...]             │  ← debug controls
└─────────────────────────────────────┘

Fixed overlay (bottom-left):
┌──────┐
│  8   │  ← pitch clock (MLB-style, orange segment display)
└──────┘
```

## Die Face Rendering
Dice use CSS grid (3x3) with dots, not numbers:
```javascript
const DIE_DOTS = {
  1: [0,0,0, 0,1,0, 0,0,0],  // center dot
  2: [0,0,1, 0,0,0, 1,0,0],  // diagonal
  3: [0,0,1, 0,1,0, 1,0,0],  // diagonal + center
  4: [1,0,1, 0,0,0, 1,0,1],  // four corners
  5: [1,0,1, 0,1,0, 1,0,1],  // corners + center
  6: [1,0,1, 1,0,1, 1,0,1],  // three columns
};
```
Colors: Pitcher = red, Batter = green, Tie = gray

## Outcome Bar Logic (Value-Based)
Full-width bar with 0 centered. Range: -12 to +12.

Indicator starts at 0 each pitch. The **value** of the winning die moves it:
- Green die (value V): `indicatorValue += V`
- Red die (value V): `indicatorValue -= V`
- Gray die: no change (shake effect)

### Threshold Mapping (configurable via debug sliders)
```
value >= 7   → Contact (hit)
value >= 5   → Ball
value >= -2  → Foul
value < -2   → Strike
```

### Value-to-Position Mapping
```javascript
function valueToPercent(val) {
  const clamped = Math.max(-12, Math.min(12, val));
  return ((clamped - (-12)) / (12 - (-12))) * 100; // 0-100%
}
```

## Contact Modal Field
SVG baseball diamond with concentric arc zones:
```
Zone radii from home plate (150, 260):
  Infield:    r = 0-60    (RED - outs)
  Gap:        r = 60-95   (GREEN - singles)
  Outfield:   r = 95-135  (RED - outs)
  Deep edge:  r = 135-165 (GREEN - extra-base)
  HR zone:    r = 165-190 (GREEN - home runs)
  Fence arc at r = 165
```

### Hit Animation
- Baseball element flies from home plate to target position
- Infield: direct ground-ball path (0.5s)
- Outfield: ball scales up (ascending) then down (descending) to simulate fly ball (0.7s)
- Outs: ball replaced with red X catch marker (pop-in animation)

## Pitch Clock
- Fixed overlay, bottom-left corner
- Orange segment display font (Courier New monospace)
- Counts down from 8 seconds
- At 3s remaining: turns red with glow (urgent state)
- At 0: auto-fires `startPitch()`
- Stops during animations, contact modal, at-bat results

## Debug Controls
- **Test Hit** button: directly opens contact modal
- **Dice count sliders**: Pitcher (1-4), Batter (1-4)
- **Threshold sliders**: Ball (2-8), Hit (3-12), Foul min (-6 to 0), Strike (-8 to -1)
- All adjustable in real-time, affect next pitch

## State Shape
```javascript
{
  outs, score, runners: [1st, 2nd, 3rd],
  currentBatterIndex, count: { balls, strikes },
  phase,          // PRE_PITCH | ANIMATING | BATTER_READY | CONTACT | AT_BAT_RESULT | INNING_OVER
  pitcherDice,    // [high, low, ...] after sort (variable length)
  batterDice,     // [high, low, ...] after sort (variable length)
  battleResults,  // [{pVal, bVal, winner, color, winValue}, ...]
  pitchCount,     // pitches thrown this AB
  atBatResult,    // strikeout | walk | ground_out | single | double | home_run
  gameLog,        // [{text, highlight}]
}
```

## Configurable Globals
```javascript
let PITCHER_DICE_COUNT = 2;   // adjustable via slider
let BATTER_DICE_COUNT = 2;    // adjustable via slider
let THRESHOLDS = {
  hit: 7,       // >= this is a hit
  ball: 5,      // >= this and < hit is ball
  foulMin: -2,  // >= this and < ball is foul
  strike: -3,   // < foulMin is strike
};
```
