import { readViewerData } from './viewerData.js';
import { currentParams, withViewState } from './urlState.js';
import { viewState } from './viewState.js';
import { applyFilter, precomputeViews } from './feedFilters.js';
import { initIntelTags } from './intelTags.js';
import { initMentionerRanking } from './mentioners.js';
import { initBackToTop, initIntelPanelToggle, initPagination, initSidebar } from './pageChrome.js';
import { initSearch } from './search.js';
import { initTermsPanel } from './termsPanel.js';
import { initTimeline } from './timelineChart.js';
import { initViewTabs, restoreViewFromUrl } from './views.js';
import { initWordWall } from './wordWall.js';

const data = readViewerData();

const timeline = initTimeline({ buckets: data.timelineBuckets, dailyCounts: data.timelineDaily });
const intelTags = initIntelTags({
  wordlists: data.wordlists,
  badgeColours: data.badgeColours,
  intelCounts: data.intelCounts,
  onRescan: applyFilter,
});

initViewTabs({ drawTimeline: timeline.draw });
intelTags.bindFilterButtons((params) => withViewState(params, viewState));
precomputeViews();
restoreViewFromUrl({ drawTimeline: timeline.draw });
initPagination();
intelTags.initialise();
initTermsPanel({ toggleTerm: intelTags.toggleTerm });
initMentionerRanking();
initSearch();
initWordWall();
initBackToTop();
initIntelPanelToggle(Boolean(currentParams().get('intel')));
initSidebar();
