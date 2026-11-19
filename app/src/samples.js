// OUTRUN VICE — procedural sample scenes.
//
// The three sample photos are not image files: each is a flat-vector OUTRUN
// scene drawn by the scene renderer onto an offscreen canvas and read back as
// a JPEG, so the panels start filled with on-brand art and the app ships no
// photo assets at all. The user's own photos replace them panel by panel.

import { drawCarSilhouette, drawOutrunScene } from './scene.js';

export const SAMPLE_NAMES = ['sunset-grid', 'palm-skyline', 'chrome-cruiser'];

/** Renders a scene variant onto a fresh canvas. */
function renderScene(name, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (name === 'sunset-grid') {
    drawOutrunScene(ctx, w, h, 'sunset', {
      sunX: 0.5, sunY: 0.42, sunR: 0.33, horizon: 0.58,
      duo: false, palms: true, seed: 21,
    });
  } else if (name === 'palm-skyline') {
    drawOutrunScene(ctx, w, h, 'ultraviolet', {
      sunX: 0.32, sunY: 0.44, sunR: 0.30, horizon: 0.62,
      duo: false, palms: true, seed: 33,
    });
  } else {
    // chrome-cruiser: a sports car silhouette on the grid road at sunset. The
    // car sits high and large in the frame, so it survives the panels'
    // cover-fit crops instead of being cut off at the bottom.
    drawOutrunScene(ctx, w, h, 'teal', {
      sunX: 0.5, sunY: 0.40, sunR: 0.30, horizon: 0.55,
      duo: false, palms: false, seed: 45,
    });
    drawCarSilhouette(ctx, w * 0.19, h * 0.74, w * 0.62, '#02141a', '#5eead4');
  }
  return canvas;
}

/** Turns a canvas into an Image via a JPEG data URL. */
function canvasToImage(canvas) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL('image/jpeg', 0.88);
  });
}

/** Builds the three sample images, in SAMPLE_NAMES order. */
export async function loadSampleImages() {
  const jobs = SAMPLE_NAMES.map((name) => canvasToImage(renderScene(name, 800, 600)));
  return Promise.all(jobs);
}
