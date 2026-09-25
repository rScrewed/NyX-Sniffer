import { byId, queryAll, markVisibleAncestors, applyContainerVisibility } from './dom.js';
import { viewState } from './viewState.js';

const PRECOMPUTED_VIEWS = [
  ['all', 'all'], ['messages', 'all'],
  ['files', 'all'], ['files', 'image'], ['files', 'video'], ['files', 'audio'], ['files', 'other'],
];

const precomputed = new Map();

function matchesView(card, main, sub) {
  if (card.classList.contains('search-hide')) return false;
  if (main === 'all') return true;
  if (main === 'messages') return card.classList.contains('has-text');
  if (main === 'files') return card.classList.contains(sub === 'all' ? 'has-files' : 'has-' + sub);
  return true;
}

export const isVisibleInCurrentView = (card) => matchesView(card, viewState.main, viewState.sub);

export function precomputeViews() {
  const cards = queryAll('#msg-layout .msg');
  for (const [main, sub] of PRECOMPUTED_VIEWS) {
    const isVisible = (card) => main === 'all' ||
      (main === 'messages' && card.classList.contains('has-text')) ||
      (main === 'files' && card.classList.contains(sub === 'all' ? 'has-files' : 'has-' + sub));
    precomputed.set(main + ':' + sub, markVisibleAncestors(cards, isVisible));
  }
}

export function applyFilter() {
  const layout = byId('msg-layout');
  if (layout) {
    layout.dataset.filter = viewState.main;
    layout.dataset.sub = viewState.sub;
  }

  const searchBox = byId('msg-search');
  const searching = Boolean(searchBox && searchBox.value.trim());
  const cached = !searching && precomputed.get((viewState.main || 'all') + ':' + (viewState.sub || 'all'));

  const visibility = cached || markVisibleAncestors(queryAll('#msg-layout .msg'), isVisibleInCurrentView);
  applyContainerVisibility(layout || document, visibility);
}
