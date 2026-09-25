export const byId = (id) => document.getElementById(id);
export const query = (selector, root = document) => root.querySelector(selector);
export const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function setHidden(element, hidden) {
  if (element) element.classList.toggle('hidden', hidden);
}

export function onEach(selector, event, handler) {
  queryAll(selector).forEach((element) => element.addEventListener(event, (domEvent) => handler(element, domEvent)));
}

export function markVisibleAncestors(cards, isVisible) {
  const visibleChannels = new Set();
  const visibleServers = new Set();
  for (const card of cards) {
    if (!isVisible(card)) continue;
    visibleChannels.add(card.parentElement);
    visibleServers.add(card.parentElement.parentElement);
  }
  return { visibleChannels, visibleServers };
}

export function applyContainerVisibility(scope, { visibleChannels, visibleServers }) {
  queryAll('.chan', scope).forEach((channel) => channel.classList.toggle('hidden', !visibleChannels.has(channel)));
  queryAll('.srv', scope).forEach((server) => server.classList.toggle('hidden', !visibleServers.has(server)));
}
