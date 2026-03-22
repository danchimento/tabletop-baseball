# War Card Game — Handoff Document

## Concept

A mobile-first, browser-based implementation of the classic card game **War** with an upgrade/power-up system. The game should feel like a native mobile app — snappy animations, no scroll, full-screen layout, tap-driven interaction. No build tools; vanilla JS + GSAP from CDN, matching the existing project's tech stack.

This is a **standalone page** (`war.html` + `war.css` + `war.js`) separate from the existing baseball game.

---

## Game Flow

### Core Loop

1. **Opponent plays first** — the AI automatically places a card face-down in the battle zone (center of screen)
2. **Player taps their deck** — this places their card face-down next to the opponent's
3. **Flip phase** — after a short delay (~0.3s), both cards flip face-up simultaneously with a flip animation
4. **Evaluation phase** — apply any active upgrades/modifiers to both card values, then determine the winner
5. **Resolution animation** — winning card and losing card animate into the winner's deck. They animate **in sequence** (not simultaneously) to clearly show them being placed at the bottom of the deck. Both cards flip face-down during this animation
6. **XP bar fills** — the winner gains XP. When the bar fills, an upgrade choice appears
7. **Next round** — return to step 1

### War (Tie Resolution)

When both cards have equal value after evaluation:

1. **"WAR!" text** flashes on screen
2. Each player places **3 cards face-down**, one at a time with a dramatic slam/impact animation and slight delay between each
3. Each player places **1 card face-up** (the reveal card)
4. Flip and evaluate the reveal cards (upgrades apply)
5. Winner takes **all 10 cards** (animated into their deck sequentially)
6. If the reveal cards also tie, repeat the war (recursive)
7. If a player doesn't have enough cards for war, they lose the game

### Win Condition

- A player wins when the opponent has **0 cards**
- Game over screen shows winner, final card counts, and a "Play Again" button

---

## Screen Layout (Mobile-First, Portrait)

```
┌─────────────────────────┐
│   OPPONENT AREA (top)   │
│  [Name]        [26]     │
│      ┌─────────┐        │
│      │ ░░░░░░░ │ ← deck │
│      │ ░░░░░░░ │        │
│      └─────────┘        │
├─────────────────────────┤
│                         │
│    BATTLE ZONE (mid)    │
│                         │
│  ┌───────┐  ┌───────┐   │
│  │  OPP  │  │ PLAYER│   │
│  │ CARD  │VS│ CARD  │   │
│  └───────┘  └───────┘   │
│                         │
├─────────────────────────┤
│   PLAYER AREA (bottom)  │
│      ┌─────────┐        │
│      │ ░░░░░░░ │ ← deck │
│      │ ░░░░░░░ │        │
│      └─────────┘        │
│  "Tap to Play"          │
│  [You]          [26]    │
├─────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  │ ← XP / Upgrade Bar
│  "Win rounds to charge" │
└─────────────────────────┘
```

- **Max width**: ~480px (phone-sized), centered on larger screens
- **Full viewport height**: use `100dvh` (dynamic viewport height for mobile browsers)
- **No scrolling**: `overflow: hidden` on body
- **Dark theme**: match existing palette (`--bg: #0a0a1a`, surfaces slightly lighter, accent colors for suits)

### Active Upgrades Display

- Small icons/badges floating above the upgrade bar (or in a thin strip)
- Each active upgrade shows its icon and remaining duration (number of rounds left)

---

## Component Architecture

### Card

A card is the fundamental visual + data unit.

**Data model:**
```js
{ suit: 'hearts', rank: 'K', value: 13 }
```

- **Suits**: hearts, diamonds, clubs, spades
- **Ranks**: 2–10, J(11), Q(12), K(13), A(14)
- **Visual states**: face-up (shows suit + rank), face-down (card back pattern)
- **CSS class**: `.card` with `.card-back` or `.card-face` states
- **Flip animation**: CSS 3D transform (`rotateY`) or GSAP flip, ~0.3s

**Card face rendering**: Pure CSS/HTML — large rank in center, suit symbol in corners. Color-coded: red for hearts/diamonds, dark for clubs/spades. Keep it clean and readable at small sizes.

### Deck

A visual stack of cards with a count badge.

- **Visual**: Shows the top card (always face-down) with a slight offset/shadow to indicate depth
- **Count badge**: Number overlay showing how many cards remain
- **Tap interaction**: Player deck is tappable; opponent deck is not
- **Pulse/glow hint**: Player deck pulses when it's their turn to play (similar to existing `pulse-glow` keyframe)
- **Empty state**: When deck is empty, show an empty outline/ghost

**Data model:**
```js
class Deck {
  cards = []       // Array of card objects
  push(card)       // Add to bottom
  draw()           // Remove from top
  shuffle()        // Fisher-Yates shuffle
  get count()      // cards.length
  get isEmpty()    // cards.length === 0
}
```

### Upgrade System

The upgrade/power-up system adds strategic depth to War.

**XP Bar:**
- Fills the entire bottom of the screen (full width)
- Visually similar to an XP bar in an RPG — a track with a colored fill
- Fills incrementally: each round won adds XP (amount can vary based on card value difference)
- When full (100%), the bar flashes/pulses and an upgrade selection panel slides up

**Upgrade Selection:**
- Panel overlays the bottom portion of the screen
- Shows 2-3 random upgrade choices as tappable cards/buttons
- Player must pick one before the next round continues (game pauses)
- After selection, the panel slides away and the upgrade becomes active

**Upgrade Catalog** (matches `UPGRADE_CATALOG` in `war-simulation.js`):

Rarity weights: Common 60%, Rare 30%, Epic 10%.

| Rarity | ID | Name | Type | Effect |
|--------|----|------|------|--------|
| Common | `temp1` | +1 Next Round | temp | Temporary +1 to your card's value for the next comparison |
| Common | `temp2` | +2 Next Round | temp | Temporary +2 to your card's value for the next comparison |
| Common | `temp3` | +3 Next Round | temp | Temporary +3 to your card's value for the next comparison |
| Common | `shuffleSelf` | Shuffle Deck | action | Shuffle your own deck (randomize card order) |
| Common | `shuffleOpponent` | Shuffle Enemy | action | Shuffle the opponent's deck |
| Common | `rankBoost` | Rank Boost | rankBoost | Permanently +1 to all cards of a random rank (2–14) |
| Rare | `stealCard` | Steal Card | action | Steal a random card from opponent's deck and add it to yours |
| Rare | `bestToTop` | Best to Top | action | Move your highest-value card to the top of your deck |
| Rare | `doublePlay` | Double Play | doublePlay | Next round you win, take double the cards |
| Epic | `plus1perm` | +1 Permanent | bonus | Permanent +1 to all your card values for the rest of the game |
| Epic | `reduceReq` | Faster Upgrades | meta | Reduce wins required to earn next upgrade by 1 |
| Epic | `extraOption` | Extra Option | meta | Get one additional upgrade choice next time you earn an upgrade |

**AI strategy**: Opponent picks upgrades by prioritizing highest rarity tier, then highest value within bonus/temp types. See `defaultUpgradeStrategy()` in `war-simulation.js`.

**Active upgrade display**: Small badges/icons shown in a strip above the XP bar. Each badge shows the upgrade icon and its type. Temp bonuses show their +N value; permanent effects show a star/crown. When a temp bonus is consumed, the badge fades out.

**Evaluation with upgrades**: During the evaluation phase, compute effective card value via `baseRank + permanentBonus + rankBonus[rank] + tempBonus`, then compare. Show the modified value briefly on the card (e.g., "K → 15" if a +2 temp bonus is active). Temp bonuses reset to 0 after each comparison.

---

## Animation Specs

All animations use **GSAP** for sequencing and CSS for simple transitions.

### Card Flip
- **Technique**: GSAP timeline — scale X to 0 (0.15s), swap content, scale X back to 1 (0.15s)
- **Alternative**: CSS `transform: rotateY(180deg)` with `backface-visibility: hidden` on two child elements
- **Duration**: ~0.3s total

### Card Played (Deck → Battle Zone)
- Card element moves from deck position to the battle zone slot
- Uses GSAP `fromTo` with the deck's bounding rect as the start position
- Duration: ~0.25s with `ease: "power2.out"`
- Lands face-down initially

### Cards to Winner's Deck
- After winner is determined, both cards flip face-down
- First card animates from battle zone to winner's deck position (~0.3s)
- **Then** second card follows the same path (~0.3s) — sequential, not parallel
- Each card shrinks slightly as it reaches the deck (scale 1 → 0.8) to simulate going under the pile
- Winner's deck count badge updates after each card lands

### War Card Slam
- Each of the 3 face-down war cards slams onto the table
- GSAP: `from({ y: -100, scale: 1.2, opacity: 0 })` with `ease: "back.out(1.7)"`
- Slight screen shake or impact flash on each slam
- ~0.2s per card, ~0.15s gap between them

### XP Bar Fill
- Smooth width transition on the fill element: `transition: width 0.5s ease-out`
- When reaching 100%: pulse glow animation (box-shadow pulse)
- Upgrade panel slides up: `GSAP.fromTo(panel, { y: '100%' }, { y: 0, duration: 0.3 })`

### Result Flash
- "WIN" / "LOSE" / "WAR!" text appears center screen
- GSAP: scale from 0.5 → 1.2 → 1.0, opacity 0 → 1, duration ~0.4s
- Holds for ~0.5s then fades out

### Tap Prompt Pulse
- Player deck glows/pulses when it's their turn
- CSS keyframe animation: `box-shadow` oscillates between transparent and accent color
- Text "Tap to Play" fades in/out subtly

---

## State Machine

```
IDLE
  → OPPONENT_PLAYS (auto, ~0.5s delay)

OPPONENT_PLAYS
  → WAITING_FOR_PLAYER (opponent card placed face-down)

WAITING_FOR_PLAYER
  → FLIP_PHASE (player taps deck)

FLIP_PHASE
  → EVALUATE (both cards flip, ~0.3s delay)

EVALUATE
  → RESOLVE_WIN (one card is higher after upgrades)
  → RESOLVE_WAR (cards are equal)

RESOLVE_WIN
  → CHECK_UPGRADE (cards animate to winner)

RESOLVE_WAR
  → WAR_DEAL (slam 3 face-down each)
  → WAR_REVEAL (play + flip reveal cards)
  → EVALUATE (re-evaluate reveal cards)

CHECK_UPGRADE
  → UPGRADE_CHOICE (XP bar full → show choices, game pauses)
  → IDLE (XP bar not full → next round)

UPGRADE_CHOICE
  → IDLE (player picks upgrade)

GAME_OVER
  → IDLE (play again)
```

---

## Mobile-Native Feel Checklist

- [ ] `user-scalable=no` + `maximum-scale=1.0` to prevent zoom
- [ ] `apple-mobile-web-app-capable` + `mobile-web-app-capable` for fullscreen
- [ ] `theme-color` meta tag matching background
- [ ] `-webkit-tap-highlight-color: transparent` on interactive elements
- [ ] `touch-action: manipulation` to prevent double-tap zoom
- [ ] `overscroll-behavior: none` to prevent pull-to-refresh
- [ ] No hover-dependent interactions (everything is tap)
- [ ] `100dvh` for full viewport height (accounts for mobile browser chrome)
- [ ] Haptic-feeling animations (slight overshoot on card plays, impact on slams)
- [ ] Prevent context menu on long press: `oncontextmenu="return false"`
- [ ] Safe area insets for notched phones: `env(safe-area-inset-bottom)` on upgrade bar

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Markup | Vanilla HTML | Matches existing project, no build step |
| Styling | Vanilla CSS + CSS custom properties | Dark theme, responsive, no preprocessor needed |
| Logic | Vanilla JS (ES6+) | No framework needed for this scope |
| Animation | GSAP 3 (CDN) | Already used in the project, excellent for sequenced animations |
| Build | None | Direct file serving, cache-bust with `?v=` query params |

---

## File Structure

```
war.html    — Page markup and structure
war.css     — All styling, animations, responsive layout
war.js      — Game engine, state machine, AI, upgrades, DOM manipulation
```

Keep it to 3 files. All game logic, card rendering, deck management, upgrade system, and animations live in `war.js`. If the file gets too large (>1500 lines), consider splitting into `war-upgrades.js` and `war-animations.js`.

---

## Design Notes

- **Card back design**: Simple geometric pattern using CSS gradients (no images needed). Crosshatch or diamond pattern in a deep blue/purple
- **Color palette**: Inherit from existing project — dark navy background, red/green/gold accents. Red for hearts/diamonds, near-black for clubs/spades
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) for native feel. Bold, large rank numbers on cards
- **Card size**: ~80px wide × 112px tall on mobile (standard 5:7 ratio), scale down if needed for war piles
- **Deck depth effect**: 3-4 stacked card-backs with 1-2px offset each to create visual depth
- **Sound**: Out of scope for v1, but structure code so sound hooks can be added later (e.g., call a `playSound('flip')` stub)

---

## Open Questions / Future Considerations

1. **Upgrade balance**: The starter upgrade set is a guess. Playtest and adjust values/durations
2. **AI upgrades**: Should the opponent also earn and use upgrades? (Recommend: yes, in v2)
3. **Difficulty**: Could vary opponent upgrade quality or XP rate
4. **Persistence**: LocalStorage for win/loss record, unlocked upgrades
5. **Multiplayer**: Two-player on same device (rotate phone) could work with this layout
6. **Card art**: v1 is text-based card faces. Could add illustrated face cards later
