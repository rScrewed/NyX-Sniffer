import { byId, queryAll } from './dom.js';
import { currentParams, navigate } from './urlState.js';

export function initWordWall() {
  const tooltip = byId('ww-tip');

  queryAll('.ww-word').forEach((word) => {
    word.addEventListener('mousemove', (event) => {
      if (!tooltip) return;
      const count = word.dataset.count;
      tooltip.innerHTML = '<b>' + word.dataset.word + '</b>&nbsp;&nbsp;used ' + count + ' time' + (count !== '1' ? 's' : '');
      tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 200) + 'px';
      tooltip.style.top = (event.clientY - 40) + 'px';
      tooltip.classList.remove('hidden');
    });

    word.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.add('hidden');
    });

    word.addEventListener('click', () => {
      if (tooltip) tooltip.classList.add('hidden');
      const params = currentParams();
      params.set('q', word.dataset.word);
      params.set('main', 'messages');
      params.delete('page');
      navigate(params);
    });
  });
}
