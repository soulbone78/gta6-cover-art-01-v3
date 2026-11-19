// Fixed scenes for screenshots, driven by the page's query string:
//   ?shot=cover&layout=poster&grade=sunset&caption=VICE%20CITY — the cover alone, filling the viewport
//   ?shot=editor&caption=... — the editor with the sample scenes loaded
// `layout`, `grade`, `caption`, `tagline` and `size` pick the scene; the
// canvas is sized to the viewport in cover mode. window.__shotReady is set
// once the scene is painted.
export async function runShot(shot, query, api) {
  const { state, sizePreview, redraw, loadSamples, buildPanelPicker, syncPanelControls } = api;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption') !== null) state.title = query.get('caption');
  if (query.get('tagline') !== null) state.tagline = query.get('tagline');
  if (query.get('size')) state.size = query.get('size');
  document.getElementById('title').value = state.title;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('size').value = state.size;
  await loadSamples();
  buildPanelPicker();
  syncPanelControls();
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    sizePreview();
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
