import { query, queryAll } from './dom.js';

function filterFeeds(senderId) {
  for (const selector of ['#main-feed', '#mention-feed']) {
    const feed = query(selector);
    if (!feed) continue;

    const visibleChannels = new Set();
    const visibleServers = new Set();

    queryAll('.msg', feed).forEach((card) => {
      const show = senderId === null || card.dataset.sender === senderId;
      card.classList.toggle('hidden', !show);
      if (!show) return;
      visibleChannels.add(card.parentElement);
      visibleServers.add(card.parentElement.parentElement);
    });
    queryAll('.chan', feed).forEach((channel) => channel.classList.toggle('hidden', !visibleChannels.has(channel)));
    queryAll('.srv', feed).forEach((server) => server.classList.toggle('hidden', !visibleServers.has(server)));
  }
}

export function initMentionerRanking() {
  queryAll('.rank li[data-id]').forEach((item) => {
    item.addEventListener('click', () => {
      const wasSelected = item.classList.contains('sel');
      queryAll('.rank li[data-id]').forEach((other) => other.classList.remove('sel'));
      if (!wasSelected) item.classList.add('sel');
      filterFeeds(wasSelected ? null : item.dataset.id);
    });
  });
}
