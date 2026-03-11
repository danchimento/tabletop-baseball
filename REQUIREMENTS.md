# Tabletop Dice Baseball — Requirements

## Overview
A mobile-first, single-player dice baseball game. The player controls the batting team for one inning, trying to score as many runs as possible against an AI pitcher.

## Core Mechanic: Dice Battle
Each pitch is a 2v2 dice battle between pitcher and batter.

### Pitch Flow
1. **Pitch Clock** — visual countdown timer on the pitcher's side
2. **Pitcher Roll** — 2 red dice appear, spin, slow to a stop, pause, then auto-sort highest to lowest
3. **Batter Roll** — "Swing!" button appears; player clicks; 2 green dice do the same spin/sort animation
4. **Battle** — starting from the top pair, dice slide into each other in the center; the winning die remains:
   - Batter die wins → green die stays
   - Pitcher die wins → red die stays
   - Tie → gray die stays
5. **Outcome Bar** — 4-segment bar: `Strike | Foul | Ball | Contact`. Indicator starts at **Foul** each pitch. Surviving dice animate upward into the bar one at a time:
   - Green die → indicator shifts **right** (+1)
   - Red die → indicator shifts **left** (-1, capped at Strike)
   - Gray die → indicator **shakes**, no movement
6. **Result** — wherever the indicator lands determines the pitch outcome

### Outcome Results
| Position | Result | Effect |
|----------|--------|--------|
| Strike | Strike | +1 strike (3 strikes = strikeout) |
| Foul | Foul Ball | +1 strike (capped at 2; can't strike out on foul) |
| Ball | Ball | +1 ball (4 balls = walk) |
| Contact | Contact! | Opens contact modal |

## Contact Modal
Full-screen overlay showing a baseball diamond with outfield.

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
2. Both dice animate upward to the numbered position on the field matching their sum
3. Outcome text appears
4. Modal auto-closes after brief pause

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
- **Pitcher** on the left side of the screen
- **Batter** on the right side of the screen
- Player names shown; profile labels hidden for now
- Dice appear below each player on their side
- Actual die faces (dot patterns) instead of numbers

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
