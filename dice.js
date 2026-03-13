// ============================================================
// dice.js — Utility & Dice Animation
// ============================================================

const $ = (id) => document.getElementById(id);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function dieFaceHTML(value) {
  const dots = DIE_DOTS[value] || DIE_DOTS[1];
  return dots.map(d => d ? '<span class="dot"></span>' : '<span></span>').join('');
}

function createDieElement(colorClass) {
  const die = document.createElement('div');
  die.className = `die-face ${colorClass}`;
  die.innerHTML = dieFaceHTML(1);
  return die;
}

// ============================================================
// Dice Animation
// ============================================================

function spinDie(element, finalValue) {
  return new Promise(resolve => {
    let i = 0;
    function tick() {
      if (i >= SPIN_INTERVALS.length) {
        element.innerHTML = dieFaceHTML(finalValue);
        element.dataset.value = finalValue;
        resolve();
        return;
      }
      element.innerHTML = dieFaceHTML(Math.floor(Math.random() * 6) + 1);
      setTimeout(tick, SPIN_INTERVALS[i]);
      i++;
    }
    tick();
  });
}

async function sortDice(side, values) {
  const sorted = [...values].sort((a, b) => b - a);

  // Check if already sorted
  const alreadySorted = values.every((v, i) => v === sorted[i]);
  if (alreadySorted) return sorted;

  const container = $(`${side}-dice`);
  const dice = Array.from(container.children);
  if (dice.length < 2) return sorted;

  // Build a map: for each target position, find which current die goes there
  // Match by value, handling duplicates
  const usedIndices = new Set();
  const targetOrder = sorted.map(targetVal => {
    for (let i = 0; i < values.length; i++) {
      if (!usedIndices.has(i) && values[i] === targetVal) {
        usedIndices.add(i);
        return i;
      }
    }
    return 0;
  });

  // If order hasn't changed, skip
  const needsSwap = targetOrder.some((fromIdx, toIdx) => fromIdx !== toIdx);
  if (!needsSwap) return sorted;

  const h = dice[0].offsetHeight + 8;

  // Animate each die to its target position
  targetOrder.forEach((fromIdx, toIdx) => {
    const offset = (toIdx - fromIdx) * h;
    dice[fromIdx].style.transition = 'transform 0.3s ease-in-out';
    dice[fromIdx].style.transform = `translateY(${offset}px)`;
  });

  await delay(320);

  // Reorder DOM to match sorted order
  targetOrder.forEach(fromIdx => {
    container.appendChild(dice[fromIdx]);
  });

  // Clear transforms
  dice.forEach(d => {
    d.style.transition = 'none';
    d.style.transform = '';
  });

  return sorted;
}
