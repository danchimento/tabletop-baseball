# Dice Baseball — Game Design Handoff

**Status:** MVP Playable → Iterating on Core Mechanics
**Date:** March 11, 2026

---

## Concept

A baseball-themed dice and card game playable in a mobile browser. One inning = one session (~3-5 minutes). Single-player vs AI. Built as a web app (HTML/CSS/JS), mobile-first, PWA-capable.

---

## Core Loop

1. **Batter steps up** — pitch clock starts counting down
2. **Pitch auto-fires** when clock hits zero (no manual button)
3. **Dice battle** — pitcher and batter dice roll, sort, and clash automatically
4. **Value-based outcome** — winning die values move an indicator on a bar; final position determines strike/foul/ball/contact
5. **Repeat** until 3 outs → inning over

---

## Dice System

- **All D6.** No other dice.
- **Configurable pool:** Pitcher and batter dice count adjustable (1-4 each, default 2v2)
- **Paired battle:** Dice sorted highest-first, compared pair-by-pair
- **Value-based outcome bar:** Winning die's face value moves the indicator by that amount (not just +1/-1)
  - Batter wins → indicator moves right by die value
  - Pitcher wins → indicator moves left by die value
  - Tie → indicator shakes, no movement
- **Configurable thresholds** determine outcome:
  - Hit: >= 7 (default)
  - Ball: >= 5
  - Foul: >= -2
  - Strike: < -2
- **Counts:** 3 strikes = strikeout (out). 4 balls = walk (runner on base).
- **Contact outcome:** 2d6 roll on baseball field, sum maps to field position and outcome

---

## Card System

### Structure
- **10 cards per deck**, draw **5** per hand
- **One card chosen per at-bat** (not per pitch)
- **Symmetric archetypes** — both pitcher and batter have the same 5 types, different names

### Card Archetypes

| #  | Type               | Pitcher Example          | Batter Example           | Effect Example                     |
|----|--------------------|--------------------------|--------------------------|------------------------------------|
| 1  | **Stat Boost**     | Heat                     | Power Swing              | +1 die to your pool                |
| 2  | **Stat Debuff**    | Changeup                 | Crowd the Plate          | -1 die from opponent's pool        |
| 3  | **Manipulation**   | Quick Pitch              | Check Swing              | Force opponent to reroll highest   |
| 4  | **High Risk**      | Gas                      | Swing for the Fences     | +2 to ALL dice, but lose by double if you lose a pair |
| 5  | **Defensive**      | Nibble                   | Shorten Up               | Set your lowest die to 3 (floor)   |

### Cost Asymmetry

- **Pitcher pays with Energy** — depletable pool (e.g., 10 per game). Better cards cost more. Pitcher degrades over time, mirroring real baseball.
- **Batter pays with Contact/Power tradeoff** — no resource pool. Aggressive cards = higher ceiling, lower floor. Conservative cards = reliable but limited upside. Batter is fresh every AB.

---

## Batter/Pitcher Stats

- **Pitcher:** Base pool can be modified by pitcher card (e.g., a good pitcher's card gives +1 die baseline = 3D6)
- **Batters have profiles:**
  - Weak: 2D6, no modifiers
  - Average: 3D6 (or 2D6 +1 die from card)
  - Star: 4D6 (or base + modifiers)
  - Cleanup: 3D6 + modifier to total

---

## Session Pacing

| Metric             | Target         |
|---------------------|---------------|
| Session length      | 3-5 min        |
| Rolls per inning    | ~17            |
| Time per roll       | ~2-3 sec       |
| Card decisions/inning | ~4-5        |
| Time per card decision | 3-5 sec    |
| Half-inning         | ~60 sec        |
| Full inning (pitch + bat) | ~2 min  |

Animations are ~50% faster than original design to keep pace snappy.

---

## MVP Scope

### In
- Single-player: **you bat** against an AI pitcher
- **One inning** = one game session
- D6 dice pool system with value-based outcome bar
- **Configurable dice counts and thresholds** via debug sliders
- Mobile-first touch UI — pitch clock auto-drives gameplay
- Score, outs, runners, and count tracked on screen
- Baseball hit animation (fly balls, ground balls, catch markers)
- Web app (HTML/CSS/JS) — runs in mobile browser, no install
- Debug controls for rapid testing

### Out (Future)
- Card system (designed, hidden until mechanics finalized)
- Pitching mode (you pitch, AI bats)
- Full game (multiple innings)
- Deck-building / roguelike progression
- Multiplayer
- Energy system for pitcher
- Card unlocks / progression
- Sound effects

---

## Tech Stack

- **Platform:** Mobile web (PWA-capable)
- **Stack:** HTML + CSS + vanilla JS (no framework for MVP)
- **Touch-first UI:** Large tap targets, automatic pitch progression
- **No backend needed** for MVP — all client-side

---

## Reference Games

- **Slay the Spire** — deck-builder roguelike, card archetypes
- **Risk** — dice resolution (higher total wins)
- **Dominion** — hand management
- **Magic: The Gathering** — card variety and cost systems

---

## Open Design Questions (to resolve during iteration)

1. **Threshold tuning** — optimal values for strike/foul/ball/hit with value-based system
2. **AI pitcher logic** — random card selection? Weighted by game state?
3. **Dice count balance** — how many dice per side feels right?
4. **Card integration** — when to bring back the card system
5. **Multi-inning** — session length for full games

---

## Bucket List / Long-Term Success Criteria

- Published publicly
- 1,000+ downloads
- 4+ star rating
