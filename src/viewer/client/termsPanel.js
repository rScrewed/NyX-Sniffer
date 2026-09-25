import { byId, query, queryAll, setHidden } from './dom.js';

export function initTermsPanel({ toggleTerm }) {
  const panel = byId('terms-panel');
  const overlay = byId('terms-overlay');
  const setOpen = (open) => {
    setHidden(panel, !open);
    setHidden(overlay, !open);
  };

  const opener = byId('terms-toggle');
  if (opener) opener.addEventListener('click', () => setOpen(true));
  if (overlay) overlay.addEventListener('click', () => setOpen(false));
  const closer = query('.terms-cls');
  if (closer) closer.addEventListener('click', () => setOpen(false));

  queryAll('.tchip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const disabled = toggleTerm(chip.dataset.cat + ':' + chip.dataset.term);
      chip.classList.toggle('off', disabled);
    });
  });
}
