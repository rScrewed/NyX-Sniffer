import { query, queryAll } from './dom.js';
import { currentParams, navigate } from './urlState.js';

const FALLBACK_BADGE_COLOUR = '#aaa';
const DEVICE_CATEGORY = 'device';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termPattern(term) {
  const start = /^\w/.test(term) ? '\\b' : '';
  const end = /\w$/.test(term) ? '\\b' : '';
  return start + escapeRegExp(term) + end;
}

const tagsOf = (card) => (card.dataset.intel || '').split(' ').filter(Boolean);

export function initIntelTags({ wordlists, badgeColours, intelCounts, onRescan }) {
  const disabledTerms = new Set();
  const regexCache = new Map();
  let regexVersion = 0;
  let latestCountRequest = 0;

  const activeTerms = (category) => (wordlists[category] || []).filter((term) => !disabledTerms.has(category + ':' + term));

  function combinedRegex(categories, flags) {
    const key = categories.join(',') + '|' + flags + '|' + regexVersion;
    if (regexCache.has(key)) return regexCache.get(key);

    const terms = [...new Set(categories.flatMap(activeTerms))].sort((a, b) => b.length - a.length);
    const regex = terms.length ? new RegExp('(' + terms.map(termPattern).join('|') + ')', flags) : null;
    regexCache.set(key, regex);
    return regex;
  }

  function showCounts(counts) {
    for (const category of [...Object.keys(wordlists), DEVICE_CATEGORY]) {
      const button = query('.fbtn[data-intel="' + category + '"]');
      if (!button) continue;
      const count = counts[category] || 0;
      const label = button.querySelector('.cnt');
      if (label) label.textContent = count ? ' ' + count : '';
      button.classList.toggle('fbtn-zero', count === 0);
    }
  }

  function toggleIntelFilter(category, decorate = (params) => params) {
    const params = currentParams();
    if (params.get('intel') === category) {
      params.delete('intel');
    } else {
      params.set('intel', category);
      params.delete('page');
    }
    navigate(decorate(params));
  }

  function renderBadges() {
    queryAll('.msg').forEach((card) => {
      const existing = card.querySelector('.intel-badges');
      if (existing) existing.remove();

      const categories = tagsOf(card);
      const head = card.querySelector('.msg-head');
      if (!categories.length || !head) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'intel-badges';
      for (const category of categories) {
        const badge = document.createElement('span');
        const colour = badgeColours[category] || FALLBACK_BADGE_COLOUR;
        badge.className = 'ibadge';
        badge.textContent = category;
        badge.style.borderColor = colour;
        badge.style.color = colour;
        badge.title = 'filter by ' + category;
        badge.addEventListener('click', (event) => {
          event.stopPropagation();
          toggleIntelFilter(category);
        });
        wrapper.appendChild(badge);
      }
      head.appendChild(wrapper);
    });
  }

  function highlight(category) {
    queryAll('.msg').forEach((card) => {
      const body = card.querySelector('.body');
      if (!body) return;
      if (body.dataset.orig === undefined) body.dataset.orig = body.textContent;
      const original = body.dataset.orig;

      const present = tagsOf(card);
      const categories = category ? (present.includes(category) ? [category] : []) : present;
      const regex = categories.length ? combinedRegex(categories, 'gi') : null;

      if (!regex) {
        body.textContent = original;
        return;
      }
      const escaped = original.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      body.innerHTML = escaped.replace(regex, '<mark class="hl">$1</mark>');
    });
  }

  function refreshCounts() {
    if (disabledTerms.size === 0) {
      showCounts(intelCounts);
      return;
    }
    const request = ++latestCountRequest;
    fetch('/api/intel-counts?off=' + encodeURIComponent(JSON.stringify(Array.from(disabledTerms))))
      .then((response) => response.json())
      .then((counts) => {
        if (request === latestCountRequest) showCounts(counts);
      })
      .catch(() => {});
  }

  function retagCards() {
    const patterns = {};
    for (const category of Object.keys(wordlists)) {
      patterns[category] = activeTerms(category).length ? combinedRegex([category], 'i') : null;
    }

    queryAll('.msg').forEach((card) => {
      const body = card.querySelector('.body');
      const text = body ? (body.dataset.orig !== undefined ? body.dataset.orig : body.textContent) : '';
      const matched = Object.keys(patterns).filter((category) => patterns[category] && patterns[category].test(text));
      if (card.dataset.device) matched.push(DEVICE_CATEGORY);
      card.dataset.intel = matched.join(' ');
    });
  }

  function rescan() {
    regexVersion++;
    retagCards();
    refreshCounts();
    renderBadges();
    highlight(currentParams().get('intel') || null);
    onRescan();
  }

  function toggleTerm(key) {
    const nowDisabled = !disabledTerms.has(key);
    if (nowDisabled) disabledTerms.add(key);
    else disabledTerms.delete(key);
    rescan();
    return nowDisabled;
  }

  function bindFilterButtons(decorate) {
    queryAll('.fbtn[data-intel]').forEach((button) => {
      button.addEventListener('click', () => toggleIntelFilter(button.dataset.intel, decorate));
    });
  }

  function initialise() {
    showCounts(intelCounts);
    renderBadges();

    const active = currentParams().get('intel');
    if (active) {
      const button = query('.fbtn[data-intel="' + active + '"]');
      if (button) button.classList.add('active');
    }
    highlight(active || null);
  }

  return { initialise, toggleTerm, bindFilterButtons };
}
