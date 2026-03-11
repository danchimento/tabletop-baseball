# Tabletop Dice Baseball — Architecture

## File Structure
```
tabletop-baseball/
├── index.html          # Single-page app structure
├── style.css           # All styling (dark theme, mobile-first)
├── game.js             # Game logic, animations, rendering
├── REQUIREMENTS.md     # Game design and rules
└── ARCHITECTURE.md     # This file
```

## Game Phases (State Machine)
```
PRE_PITCH ──(click "Start Pitch")──► ANIMATING (pitcher roll)
                                         │
                                         ▼
                                    BATTER_READY ──(click "Swing!")──► ANIMATING (batter roll → battle → outcome)
                                                                          │
                                    ┌─────────────────────────────────────┤
                                    │                                     │
                              strike/ball/foul                        contact
                                    │                                     │
                                    ▼                                     ▼
                              PRE_PITCH                              CONTACT (modal)
                              (or AT_BAT_RESULT                          │
                               if K/BB)                                  ▼
                                    │                              AT_BAT_RESULT
                                    ▼                                     │
                              ┌─────┴─────┐                              ▼
                              │           │                        ┌─────┴─────┐
                         next batter  INNING_OVER                next batter  INNING_OVER
```

## Animation System
All animations use **async/await** with CSS transitions and JS-driven frame updates.

### Key Animation Functions
| Function | Description |
|----------|-------------|
| `spinDie(element, finalValue)` | Rapidly cycles die face, slowing to final value (~1.5s) |
| `sortDice(side, values)` | Swaps dice vertically if needed (CSS transform + DOM swap) |
| `animateBattlePair(index, pVal, bVal, winner)` | Slides two dice from sides to center, resolves winner |
| `flyDieToBar(laneIndex, color, value)` | Animates surviving die upward into outcome bar |
| `moveIndicator(position)` | Slides outcome bar indicator to target segment |
| `shakeIndicator()` | Shakes indicator for ties |

### Animation Timing
```
Pitch sequence (~6-8 seconds per pitch):
  Pitch clock + pitcher spin:  ~2.0s
  Pitcher sort:                ~0.5s
  [Player clicks Swing!]
  Batter spin:                 ~1.5s
  Batter sort:                 ~0.5s
  Battle pair 1:               ~1.0s
  Battle pair 2:               ~1.0s
  Outcome die 1 → bar:        ~0.8s
  Outcome die 2 → bar:        ~0.8s
  Result display:              ~0.5s
```

## Layout Architecture
Three-column CSS grid battlefield:
```
┌──────────┬────────────────┬──────────┐
│ PITCHER  │    CENTER      │  BATTER  │
│          │                │          │
│  Name    │ [Outcome Bar]  │   Name   │
│  Clock   │                │          │
│  [Die]   │ [Battle Zone]  │  [Die]   │
│  [Die]   │  Lane 0        │  [Die]   │
│          │  Lane 1        │          │
└──────────┴────────────────┴──────────┘
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

## Outcome Bar Logic
4 segments: `[Strike][Foul][Ball][Contact]` (indices 0-3)

Indicator starts at index 1 (Foul) each pitch.
- Green die: `position = min(position + 1, 3)`
- Red die: `position = max(position - 1, 0)`
- Gray die: no change (shake effect)

### Possible Outcomes (2 dice)
| Dice Results | Movement | Final Position |
|-------------|----------|----------------|
| Green + Green | →→ | Contact (3) |
| Green + Gray | →· | Ball (2) |
| Gray + Green | ·→ | Ball (2) |
| Green + Red | →← | Foul (1) |
| Red + Green | ←→ | Foul (1) |
| Gray + Gray | ·· | Foul (1) |
| Red + Gray | ←· | Strike (0) |
| Gray + Red | ·← | Strike (0) |
| Red + Red | ←← | Strike (0) |

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

## State Shape
```javascript
{
  outs, score, runners: [1st, 2nd, 3rd],
  currentBatterIndex, count: { balls, strikes },
  phase,          // PRE_PITCH | ANIMATING | BATTER_READY | CONTACT | AT_BAT_RESULT | INNING_OVER
  pitcherDice,    // [high, low] after sort
  batterDice,     // [high, low] after sort
  battleResults,  // [{pVal, bVal, winner, color}, ...]
  pitchCount,     // pitches thrown this AB
  atBatResult,    // strikeout | walk | ground_out | single | double | home_run
  gameLog,        // [{text, highlight}]
}
```
