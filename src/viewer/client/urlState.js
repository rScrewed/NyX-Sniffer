export const currentParams = () => new URLSearchParams(window.location.search);

export function navigate(params) {
  window.location.search = params.toString();
}

export function initialViewState() {
  const params = currentParams();
  return { main: params.get('main') || 'all', sub: params.get('sub') || 'all' };
}

export function withViewState(params, viewState) {
  if (viewState.main && viewState.main !== 'all') params.set('main', viewState.main);
  if (viewState.sub && viewState.sub !== 'all') params.set('sub', viewState.sub);
  return params;
}
