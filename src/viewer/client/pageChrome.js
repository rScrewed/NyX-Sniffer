import { byId, queryAll } from './dom.js';
import { viewState } from './viewState.js';

const BACK_TO_TOP_THRESHOLD_PX = 500;
const SIDEBAR_STORAGE_KEY = 'sb-collapsed';

function readStoredFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function storeFlag(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {}
}

export function initBackToTop() {
  const button = document.createElement('button');
  button.className = 'back-top';
  button.textContent = '↑ top';
  document.body.appendChild(button);

  window.addEventListener('scroll', () => {
    button.classList.toggle('visible', window.scrollY > BACK_TO_TOP_THRESHOLD_PX);
  }, { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

export function initIntelPanelToggle(hasActiveFilter) {
  const toggle = byId('intel-toggle');
  const panel = byId('intel-panel');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const closed = panel.classList.toggle('intel-hidden');
    toggle.classList.toggle('active', !closed);
  });

  if (hasActiveFilter) {
    panel.classList.remove('intel-hidden');
    toggle.classList.add('active');
  }
}

export function initSidebar() {
  const sidebar = byId('sidebar');
  const body = byId('app-body');
  const collapseButton = byId('sb-collapse');
  let collapsed = readStoredFlag(SIDEBAR_STORAGE_KEY);

  const apply = () => {
    if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
    if (body) body.classList.toggle('sb-collapsed', collapsed);
    if (collapseButton) collapseButton.textContent = collapsed ? '›' : '‹';
  };
  apply();

  if (collapseButton) {
    collapseButton.addEventListener('click', () => {
      collapsed = !collapsed;
      storeFlag(SIDEBAR_STORAGE_KEY, collapsed);
      apply();
    });
  }

  if (!window.IntersectionObserver) return;

  const links = queryAll('.sb-ch');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
    }
  }, { threshold: 0, rootMargin: '-5% 0px -85% 0px' });
  queryAll('[id*="-ch-"]').forEach((element) => observer.observe(element));
}

export function initPagination() {
  queryAll('a.pbtn').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const url = new URL(link.href, window.location.href);
      for (const key of ['main', 'sub']) {
        if (viewState[key] && viewState[key] !== 'all') url.searchParams.set(key, viewState[key]);
        else url.searchParams.delete(key);
      }
      window.location.href = url.toString();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const direction = event.key === 'ArrowLeft' ? 'prev' : 'next';
    queryAll('a.pbtn').forEach((link) => {
      if (link.textContent.includes(direction)) link.click();
    });
  });
}
