'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const { renderWorkerLine } = require('../../src/terminal/workerLine');
const { renderDisplay } = require('../../src/terminal/workerDisplay');
const { visibleWidth } = require('../../src/terminal/textFit');
const workerWindow = require('../../src/terminal/workerWindow');

const worker = (overrides = {}) => ({
  mode: 'All', name: 'Alpha Server', count: 40, displayCount: 40, unit: 'msgs',
  done: false, sub: '', status: 'getting files...', mood: 'hunting', frame: 0, target: 100, ...overrides,
});

test('a worker line fits any window width', () => {
  for (const columns of [30, 60, 80, 120, 200]) {
    assert.ok(visibleWidth(renderWorkerLine(worker({ status: 'x'.repeat(200) }), 0, columns)) <= columns);
  }
});

test('a worker line shows its number, progress and completion', () => {
  const running = renderWorkerLine(worker(), 2, 120);
  assert.match(running, /W3/);
  assert.match(running, /40%/);
  const done = renderWorkerLine(worker({ done: true }), 0, 120);
  assert.match(done, /✓/);
  assert.match(done, /100%/);
});

test('the worker window lists every worker that fits and counts the rest', () => {
  const workers = Array.from({ length: 30 }, (_, index) => worker({ name: 'Server ' + index }));
  const frame = renderDisplay({ workers, summary: '  600 messages  /  30 workers', progress: '120 msgs' }, 100, 12);
  assert.match(frame, /NyX-Sniffer/);
  assert.match(frame, /600 messages/);
  assert.match(frame, /\+\d+ more workers/);
  assert.equal(frame.includes('Server 29'), false);

  const roomy = renderDisplay({ workers: workers.slice(0, 5), summary: null, progress: null }, 100, 40);
  assert.equal(roomy.includes('more workers'), false);
  assert.match(roomy, /Server 4/);
});

test('state is streamed to the worker window and the window is told to exit', async () => {
  const received = [];
  const opened = await workerWindow.open({
    launch: (address) => {
      const client = net.createConnection({ path: address });
      let buffer = '';
      client.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) if (line) received.push(JSON.parse(line));
      });
      return true;
    },
  });
  assert.equal(opened, true);
  assert.equal(workerWindow.isOpen(), true);

  workerWindow.send({ type: 'state', workers: [worker()], summary: 's', progress: 'p' });
  await new Promise((resolve) => setTimeout(resolve, 100));
  workerWindow.close();
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(received[0].type, 'state');
  assert.equal(received[0].workers[0].name, 'Alpha Server');
  assert.ok(received.some((message) => message.type === 'exit'));
  assert.equal(workerWindow.isOpen(), false);
});

test('opening the worker window reports failure when no window can be launched', async () => {
  assert.equal(await workerWindow.open({ launch: () => false }), false);
  assert.equal(workerWindow.isOpen(), false);
});
