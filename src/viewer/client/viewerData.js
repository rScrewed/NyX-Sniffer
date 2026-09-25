import { byId } from './dom.js';

export function readViewerData() {
  const element = byId('viewer-data');
  return element ? JSON.parse(element.textContent) : {
    wordlists: {},
    badgeColours: {},
    intelCounts: {},
    timelineBuckets: [],
    timelineDaily: {},
  };
}
