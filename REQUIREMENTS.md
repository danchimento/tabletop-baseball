# Tabletop Dice Baseball — Requirements

## Overview
A mobile-first, single-player dice baseball game. The player controls the batting team for one inning, trying to score as many runs as possible against an AI pitcher.

## Core Mechanic: Dice Battle
Each pitch is a dice battle between pitcher and batter. The number of dice per side is configurable (default 2v2).

### Pitch Flow
1. **Pitch Clock** — MLB-style countdown overlay in the bottom-left corner (orange segment display, 8s default). When it hits zero, the pitch auto-fires. No manual "Start Pitch" button.
2. **Pitcher Roll** — Red dice appear, spin (~1s), slow to a stop, pause, then auto-sort highest to lowest
3. **Batter Roll** — Automatically proceeds; green dice do the same spin/sort animation
4. **Battle** — Starting from the top pair, dice slide into each other in the center; the winning die remains:
   - Batter die wins → green die stays
   - Pitcher die wins → red die stays
   - Tie → gray die stays
5. **Outcome Bar** — Full-width horizontal bar below player names with zero centered. The **value** of the winning die moves the indicator by that amount:
   - Green die (batter win) → indicator moves **right** by the die's value
   - Red die (pitcher win) → indicator moves **left** by the die's value
   - Gray die (tie) → indicator **shakes**, no movement
   - Range: -12 to +12, mapped to thresholds
6. **Result** — The indicator's final value determines the pitch outcome via configurable thresholds

### Outcome Thresholds (default, adjustable via sliders)
| Value Range | Result |
|-------------|--------|
| >= 7 | Hit (Contact) |
| 5 to 6 | Ball |
| -2 to 4 | Foul |
| <= -3 | Strike |

### Outcome Results
| Result | Effect |
|--------|--------|
| Strike | +1 strike (3 strikes = strikeout) |
| Foul Ball | +1 strike (capped at 2; can't strike out on foul) |
| Ball | +1 ball (4 balls = walk) |
| Contact | Opens contact modal |

## Contact Modal
Full-screen overlay showing a baseball diamond with outfield. Roll button is positioned **below** the field view so it doesn't obscure the diamond.

### Field Zones (semi-transparent overlays)
- **Infield** — red (outs)
- **Gap** (between infield and outfield) — green (singles)
- **Deep outfield** (where outfielders stand) — red (outs)
- **Outfield edge** — green (extra-base hits)
- **Beyond the fence** — green (home runs)

### Contact Roll (2d6)
Player rolls 2d6. Sum determines where the ball goes:

| Sum | Field Position | Outcome |
|-----|---------------|---------|
| 2 | Left infield | Ground Out |
| 3 | Center infield | Ground Out |
| 4 | Right infield | Ground Out |
| 5 | Left field | Fly Out |
| 6 | Center field | Fly Out |
| 7 | Right field | Fly Out |
| 8 | Left-center gap | Single |
| 9 | Right-center gap | Single |
| 10 | Deep left | Double |
| 11 | Deep right | Double |
| 12 | Over the fence | HOME RUN |

### Contact Animation
1. Two green dice appear near home plate, spin, stop
2. Dice fade out, replaced by a baseball at home plate
3. **Baseball flies** to the target field position:
   - **Infield hits**: Direct ground-ball path
   - **Outfield/deep hits**: Ball "flies" — grows larger (ascending) then shrinks (descending)
   - **Home runs**: Same fly animation to deep center
4. If it's an **out**, the ball is replaced by a red **X** marker (caught)
5. Outcome text appears with pop animation
6. Modal auto-closes after brief pause

## Card System (Hidden for Now)
Cards are designed but hidden until core dice mechanics are dialed in.

### Passives (1 per at-bat, visible, auto-trigger)
- **Two-Strike Approach** — +1 die at 2 strikes
- **Patient Hitter** — +1 die at 3 balls
- **Aggressive** — +1 die on pitch 1, -1 die after pitch 3
- **Clutch** — +1 die with RISP

### Burn Cards (hand of 3 per AB, play 0-1 per pitch, consumed)
- **Power Swing** — +1 die, but pitcher's lowest die floors at 3
- **Intimidate** — -1 pitcher die, but your dice capped at 4
- **Swing for Fences** — +2 all dice, but strikes count double
- **Shorten Up** — floor your lowest at 3, but -1 power roll on contact

## Layout
- **Player names** shown in a row above the outcome bar (Pitcher left, Batter right)
- **Outcome bar** stretches full width below player names
- **Pitcher dice** on the left, **Batter dice** on the right, **battle zone** in the center
- **Pitch clock** is a fixed overlay in the bottom-left corner (MLB-style orange segment display)
- Actual die faces (dot patterns) instead of numbers
- No event log — game flows automatically

## Debug Controls
Below the action button:
- **Test Hit** button — opens contact modal directly
- **Pitcher/Batter dice count sliders** (1-4 each)
- **Threshold sliders** — adjust ball, hit, foul, and strike values in real time

## Batter Lineup
Five batters cycle in order. Stats are hidden while card system is disabled — all batters play identically (2 dice each) for now.

| Name | Profile | Base Dice | Power Dice |
|------|---------|-----------|------------|
| Speedy | Contact | 3 | 2 |
| Steady | Average | 2 | 2 |
| Slugger | Star | 4 | 3 |
| Crusher | Power | 2 | 4 |
| Rookie | Weak | 2 | 2 |

## Base Running
- Walk: batter to 1st, force runners forward
- Single: runners advance 1 base
- Double: runners advance 2 bases
- Home Run: all runners + batter score
- Runners past 3rd base score a run

## Inning Structure
- 3 outs per inning
- After 3 outs, summary overlay shows final score and key plays
- "Play Again" button resets the inning
