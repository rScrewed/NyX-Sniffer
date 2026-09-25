import { byId, queryAll, query, setHidden } from './dom.js';
import { viewState } from './viewState.js';
import { applyFilter } from './feedFilters.js';

const STANDALONE_PANELS = {
  heatmap: 'heatmap-section',
  timeline: 'timeline-section',
  words: 'words-section',
};

export function showMainView(main, { drawTimeline }) {
  const standalone = Object.hasOwn(STANDALONE_PANELS, main);
  const showingMentions = main === 'mentions';

  for (const [name, id] of Object.entries(STANDALONE_PANELS)) setHidden(byId(id), name !== main);
  setHidden(byId('msg-layout'), standalone || showingMentions);
  setHidden(byId('mention-layout'), standalone || !showingMentions);

  const subRow = byId('sub-row');
  if (subRow) subRow.classList.toggle('visible', main === 'files');

  if (standalone) {
    const intelPanel = byId('intel-panel');
    if (intelPanel) intelPanel.classList.add('intel-hidden');
  }
  if (main === 'timeline') drawTimeline();
  if (!standalone && !showingMentions) applyFilter();
}

function swapSidebarNavigation(main) {
  const messageNavigation = byId('sb-nav-main');
  const mentionNavigation = byId('sb-nav-mentions');
  setHidden(messageNavigation, main === 'mentions');
  setHidden(mentionNavigation, main !== 'mentions');
}

function markActive(selector, attribute, value) {
  queryAll(selector).forEach((button) => button.classList.toggle('active', button.dataset[attribute] === value));
}

export function initViewTabs({ drawTimeline }) {
  queryAll('.fbtn[data-main]').forEach((button) => {
    button.addEventListener('click', () => {
      viewState.main = button.dataset.main;
      markActive('.fbtn[data-main]', 'main', viewState.main);
      showMainView(viewState.main, { drawTimeline });
      swapSidebarNavigation(viewState.main);
    });
  });

  queryAll('.fbtn[data-sub]').forEach((button) => {
    button.addEventListener('click', () => {
      viewState.sub = button.dataset.sub;
      markActive('.fbtn[data-sub]', 'sub', viewState.sub);
      applyFilter();
    });
  });
}

export function restoreViewFromUrl({ drawTimeline }) {
  if (viewState.main !== 'all') {
    markActive('.fbtn[data-main]', 'main', viewState.main);
    if (query('.fbtn[data-main="' + viewState.main + '"]')) {
      showMainView(viewState.main, { drawTimeline });
      swapSidebarNavigation(viewState.main);
    }
  }
  if (viewState.sub !== 'all') markActive('.fbtn[data-sub]', 'sub', viewState.sub);
}
