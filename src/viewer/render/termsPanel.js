'use strict';

const { escapeHtml } = require('../html');
const { wordlists } = require('../intel/tagging');

const TERM_PANEL_COLOURS = {
  location: '#7dd3fc',
  economics: '#4ade80',
  identity: '#f87171',
  social: '#c084fc',
  activities: '#fb923c',
  technical: '#facc15',
  criminal: '#ff4d4d',
  physical: '#a3e635',
  credentials: '#f43f5e',
  places: '#38bdf8',
  bannable: '#ef4444',
};
const FALLBACK_COLOUR = '#aaa';

function renderCategory(category, terms) {
  const colour = TERM_PANEL_COLOURS[category] || FALLBACK_COLOUR;
  const chips = terms.map((term) =>
    '<span class="tchip" data-cat="' + escapeHtml(category) + '" data-term="' + escapeHtml(term) +
    '" style="border-color:' + colour + ';color:' + colour + '">' + escapeHtml(term) + '</span>').join('');

  return '<div class="tcat"><div class="tcat-lbl" style="color:' + colour + '">' +
    escapeHtml(category.toUpperCase()) + '<span class="tcnt">' + terms.length + '</span></div>' +
    '<div class="tchips">' + chips + '</div></div>';
}

function renderTermsPanel() {
  return '<div id="terms-overlay" class="terms-overlay hidden"></div>' +
    '<div id="terms-panel" class="terms-panel hidden">' +
    '<div class="terms-hd"><span>WORDLIST</span><button class="terms-cls">✕</button></div>' +
    '<div class="terms-bd">' +
    Object.entries(wordlists).map(([category, terms]) => renderCategory(category, terms)).join('') +
    '</div></div>';
}

module.exports = { renderTermsPanel };
