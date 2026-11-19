// OUTRUN VICE — wires the editor: pick photos per panel, crop and position
// each, choose a layout and a colour grade, write the caption, export the PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS } from './cover.js';
import { loadSampleImages, SAMPLE_NAMES } from './samples.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

const state = {
  layout: 'poster',
  grade: 'sunset',
  title: 'VICE CITY',
  tagline: 'ONE LAST RIDE INTO THE SUNSET',
  size: '1920x1080',
  panels: [{}, {}, {}, {}],
};
let selectedPanel = 0;

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const taglineInput = document.getElementById('tagline');
const status = document.getElementById('status');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Sizes the preview canvas to the chosen export aspect (max 960px on a side). */
function sizePreview() {
  const [w, h] = SIZES[state.size];
  const scale = Math.min(960 / w, 960 / h, 1);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
}

function redraw() {
  drawCover(canvas, state);
}

/** Rebuilds the panel picker buttons (one per panel of the current layout). */
function buildPanelPicker() {
  const picker = document.getElementById('panels');
  picker.innerHTML = '';
  const count = (LAYOUTS[state.layout] || LAYOUTS.poster)(1, 1).length;
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.className = i === selectedPanel ? 'picked' : '';
    b.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelControls();
      buildPanelPicker();
    });
    picker.appendChild(b);
  }
}

/** Syncs the zoom / pan sliders with the selected panel. */
function syncPanelControls() {
  const p = state.panels[selectedPanel] || {};
  document.getElementById('zoom').value = p.zoom ?? 0;
  document.getElementById('panx').value = p.ox ?? 0;
  document.getElementById('pany').value = p.oy ?? 0;
  document.getElementById('panel-label').textContent = `Panel ${selectedPanel + 1}`;
}

async function setPanelPhoto(img) {
  state.panels[selectedPanel] = { img, zoom: 0, ox: 0, oy: 0 };
  syncPanelControls();
  redraw();
}

/** Fills the panels with the procedural sample scenes. */
export async function loadSamples() {
  const [grid, palms, car] = await loadSampleImages();
  state.panels = [
    { img: grid, zoom: 0, ox: 0, oy: 0 },
    { img: car, zoom: 0, ox: 0, oy: -0.2 },
    { img: palms, zoom: 0, ox: 0, oy: 0 },
    { img: grid, zoom: 0.35, ox: -0.3, oy: 0.15 },
  ];
  return { grid, palms, car };
}

/** Renders the cover at the chosen export size and downloads it as a PNG. */
async function exportPng() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `outrun-vice-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  status.textContent = `Saved outrun-vice-${w}x${h}.png`;
}

// --- controls ---------------------------------------------------------------
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    selectedPanel = 0;
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('picked', x === b));
    buildPanelPicker();
    syncPanelControls();
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('picked', x === b));
    redraw();
  });
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    const samples = await loadSampleImages();
    await setPanelPhoto(samples[SAMPLE_NAMES.indexOf(b.dataset.sample)]);
  });
});
document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await setPanelPhoto(await loadImage(URL.createObjectURL(file)));
  e.target.value = '';
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('panx').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('pany').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  sizePreview();
  redraw();
});
document.getElementById('export').addEventListener('click', exportPng);

// --- boot -------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, { state, sizePreview, redraw, loadSamples, loadImage, buildPanelPicker, syncPanelControls });
} else {
  sizePreview();
  buildPanelPicker();
  syncPanelControls();
  loadSamples().then(redraw).catch(() => redraw());
  redraw();
}
