import { byId, queryAll, markVisibleAncestors, applyContainerVisibility } from './dom.js';
import { currentParams, navigate } from './urlState.js';
import { isVisibleInCurrentView } from './feedFilters.js';

const SEARCH_DEBOUNCE_MS = 180;

function filterCurrentPage(term) {
  const cards = queryAll('.msg');
  cards.forEach((card) => {
    card.classList.toggle('search-hide', Boolean(term) && !card.textContent.toLowerCase().includes(term));
  });
  applyContainerVisibility(document, markVisibleAncestors(cards, isVisibleInCurrentView));
}

function searchWholeExport(value) {
  const params = currentParams();
  if (value) params.set('q', value);
  else params.delete('q');
  params.delete('page');
  navigate(params);
}

export function initSearch() {
  const box = byId('msg-search');
  if (!box) return;

  let timer = null;

  box.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchWholeExport(box.value.trim());
  });

  box.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => filterCurrentPage(box.value.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
  });
}
