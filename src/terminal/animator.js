'use strict';

const TICK_MS = 25;

const steps = new Set();
let timer = null;

function registerCountAnimation(step) {
  steps.add(step);
}

function requestCountAnimation() {
  if (timer) return;
  timer = setInterval(() => {
    let active = false;
    for (const step of steps) {
      if (step()) active = true;
    }
    if (!active) {
      clearInterval(timer);
      timer = null;
    }
  }, TICK_MS);
}

function stepTowards(current, target) {
  const increment = Math.max(1, Math.ceil((target - current) / 25));
  return Math.min(current + increment, target);
}

module.exports = { registerCountAnimation, requestCountAnimation, stepTowards };
