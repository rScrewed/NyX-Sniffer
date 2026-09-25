'use strict';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatElapsed(milliseconds) {
  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 60) return totalSeconds.toFixed(1) + 's';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(0).padStart(2, '0');
  return minutes + 'm ' + seconds + 's';
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function countdown(durationMs, onTick, intervalMs = 100) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      onTick(Math.max(0, durationMs - elapsed));
      if (elapsed >= durationMs) {
        clearInterval(timer);
        resolve();
      }
    }, Math.max(1, Math.min(intervalMs, durationMs)));
  });
}

module.exports = { delay, formatElapsed, randomBetween, countdown };
