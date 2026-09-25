'use strict';

function createWorkQueue(items, canServe) {
  const pending = [...items];

  return {
    take(workerIndex) {
      const index = pending.findIndex((item) => canServe(workerIndex, item));
      return index === -1 ? null : pending.splice(index, 1)[0];
    },
    hasPending() {
      return pending.length > 0;
    },
  };
}

function createHelperBroker(clients, workerIndexes) {
  const idle = new Set();

  return {
    markIdle(slot) {
      idle.add(slot);
    },
    borrow(excludeSlot) {
      for (const slot of idle) {
        if (slot === excludeSlot) continue;
        idle.delete(slot);
        return {
          ui: slot,
          request: clients[workerIndexes[slot]].request,
          release: () => idle.add(slot),
        };
      }
      return null;
    },
  };
}

module.exports = { createWorkQueue, createHelperBroker };
