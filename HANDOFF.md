# Dice Baseball — Game Design Handoff

**Status:** Design Complete → Ready for MVP Build
**Date:** March 11, 2026

---

## Concept

A baseball-themed dice and card game playable in a mobile browser. One inning = one session (~5-7 minutes). Single-player vs AI. Built as a web app (HTML/CSS/JS), mobile-first, PWA-capable.

---

## Core Loop

1. **Batter steps up** — you see your hand of cards
2. **Pick a card** for the at-bat (one card per AB, stays for all pitches)
3. **Pitch-by-pitch dice rolls** — pitcher total vs batter total each pitch
4. **Resolve count** — strikes, balls, contact, or outcome
5. **Repeat** until 3 outs → inning over

---

## Dice System

- **All D6.** No other dice.
- **Base pool:** Both pitcher and batter roll **2D6**
- **Cards modify pools:** Add/remove dice from either side, or add/subtract from totals
- **Compare totals each pitch:**
  - Pitcher total > Batter total → **Strike**
  - Batter total > Pitcher total → **Ball**
  - Batter total beats Pitcher by **4+** → **Contact** → roll outcome dice
- **Counts:** 3 strikes = strikeout (out). 4 balls = walk (runner on base).
- **Contact outcome:** Batter rolls power dice (number varies by batter strength). Higher total = better hit result (ground out, single, double, HR — exact thresholds TBD).

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
| Session length      | 5-7 min        |
| Rolls per inning    | ~17            |
| Time per roll       | ~4-5 sec       |
| Card decisions/inning | ~4-5        |
| Time per card decision | 3-5 sec    |
| Half-inning         | ~90 sec        |
| Full inning (pitch + bat) | ~3 min  |

Leaves ~3-4 min of headroom for animations, transitions, and flair within the 7-min budget.

---

## MVP Scope

### In
- Single-player: **you bat** against an AI pitcher
- **One inning** = one game session
- D6 dice pool system with automatic total comparison
- **3-5 pitch cards** to choose from per at-bat
- Mobile-first touch UI — big buttons, tap to roll
- Score, outs, runners, and count tracked on screen
- Web app (HTML/CSS/JS) — runs in mobile browser, no install

### Out (Future)
- Pitching mode (you pitch, AI bats)
- Full game (multiple innings)
- Deck-building / roguelike progression
- Multiplayer
- Energy system for pitcher
- Card unlocks / progression
- Combo/synergy and conditional card archetypes
- Art, animations, sound

---

## Tech Stack

- **Platform:** Mobile web (PWA-capable)
- **Stack:** HTML + CSS + vanilla JS (no framework for MVP)
- **Touch-first UI:** Large tap targets, swipe/tap to roll dice
- **No backend needed** for MVP — all client-side

---

## Reference Games

- **Slay the Spire** — deck-builder roguelike, card archetypes
- **Risk** — dice resolution (higher total wins)
- **Dominion** — hand management
- **Magic: The Gathering** — card variety and cost systems

---

## Open Design Questions (to resolve during build or next session)

1. **Contact outcome thresholds** — exact power dice totals for ground out / single / double / HR
2. **AI pitcher logic** — random card selection? Weighted by game state?
3. **Lineup** — fixed 5-batter lineup for MVP, or random?
4. **Runner advancement** — simplified (single = 1 base, double = 2, etc.) or situational?
5. **High-risk card penalty** — "lose by double" or something simpler?
6. **Manipulation cards (rerolls)** — when exactly do they trigger if card is chosen per-AB?

---

## Bucket List / Long-Term Success Criteria

- Published publicly
- 1,000+ downloads
- 4+ star rating
