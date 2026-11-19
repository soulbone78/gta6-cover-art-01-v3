// OUTRUN VICE — the multi-panel cover renderer.
//
// A cover is a procedural OUTRUN scene (see scene.js) with the person's photos
// in framed panels, finished with a chrome title and a letter-spaced tagline.
// Everything draws on one 2D canvas at the canvas's own size, so the same code
// renders the editor preview and the exported PNG.

import { drawOutrunScene, SCENE_GRADES } from './scene.js';

/** Panel layouts: each returns an array of [x, y, w, h] rects (pixels). */
export const LAYOUTS = {
  // The poster: the OUTRUN scene fills the canvas, three photo panels along
  // the bottom, the chrome title across the top.
  poster(w, h) {
    const gap = 0.014 * Math.min(w, h);
    const stripY = h * 0.735;
    const stripH = h - stripY;
    const colW = (w - gap * 2) / 3;
    return [
      [0, stripY, colW, stripH],
      [colW + gap, stripY, colW, stripH],
      [colW * 2 + gap * 2, stripY, colW, stripH],
    ];
  },
  // Four equal photo panels in a 2x2 grid, the scene showing in the gaps.
  grid4(w, h) {
    const gap = 0.016 * Math.min(w, h);
    const m = 0.016 * Math.min(w, h);
    const cw = (w - m * 2 - gap) / 2;
    const ch = (h - m * 2 - gap) / 2;
    return [
      [m, m, cw, ch],
      [m + cw + gap, m, cw, ch],
      [m, m + ch + gap, cw, ch],
      [m + cw + gap, m + ch + gap, cw, ch],
    ];
  },
  // The scene on the left, two photo panels stacked on the right.
  duo(w, h) {
    const gap = 0.014 * Math.min(w, h);
    const colX = w * 0.615;
    const colW = w - colX;
    const ch = (h - gap) / 2;
    return [
      [colX, 0, colW, ch],
      [colX, ch + gap, colW, ch],
    ];
  },
};

/** Scene options per layout, so the sun, duo and title never collide. */
const SCENE_OPTS = {
  poster: { sunX: 0.5, sunY: 0.44, sunR: 0.27, horizon: 0.56, seed: 7 },
  grid4: { sunX: 0.5, sunY: 0.40, sunR: 0.30, horizon: 0.55, seed: 7 },
  duo: { sunX: 0.5, sunY: 0.40, sunR: 0.30, horizon: 0.55, seed: 7 },
};

/** Draws one photo into a panel rect, cover-fit, with zoom and pan (-1..1). */
function drawPanelPhoto(ctx, rect, panel, gradeName, index) {
  const [x, y, w, h] = rect;
  const img = panel && panel.img;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const zoom = 1 + (panel.zoom || 0) * 1.5;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = (panel.ox || 0) * Math.max(0, (pw - w) / 2);
    const oy = (panel.oy || 0) * Math.max(0, (ph - h) / 2);
    ctx.drawImage(img, x + (w - pw) / 2 + ox, y + (h - ph) / 2 + oy, pw, ph);
  } else {
    // No photo yet: fill the panel with a slice of the OUTRUN scene, so the
    // cover always looks finished.
    ctx.save();
    ctx.translate(x, y);
    drawOutrunScene(ctx, w, h, gradeName, {
      sunX: 0.5,
      sunY: 0.42,
      sunR: 0.34,
      horizon: 0.58,
      duo: false,
      palms: index % 2 === 0,
      seed: 11 + index * 5,
    });
    ctx.restore();
  }
  // A light grade tint unifies photos with the scene.
  const grade = SCENE_GRADES[gradeName] || SCENE_GRADES.sunset;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.22;
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, grade.sky[1]);
  wash.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.restore();
  // Neon frame around the panel.
  ctx.save();
  ctx.strokeStyle = grade.grid;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.008);
  ctx.shadowColor = grade.gridGlow;
  ctx.shadowBlur = Math.max(3, Math.min(w, h) * 0.02);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** A soft dark vignette over the whole canvas, for cohesion. */
function applyVignette(ctx, w, h) {
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,0,16,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Fits the title into one line, shrinking the font until it fits. */
function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

/**
 * Draws chrome lettering: a vertical chrome gradient fill, a dark outline and
 * a neon glow, sheared slightly for speed. `box` is [x, y, w, h] for the text.
 */
function drawChromeText(ctx, text, box, grade, size) {
  const [x, y, w, h] = box;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.10, 1, 0, 0);
  // The chrome gradient is built in local coordinates, after the transform,
  // so it runs top to bottom across the letters themselves.
  const chrome = ctx.createLinearGradient(0, 0, 0, h);
  grade.chrome.forEach((c, i) => chrome.addColorStop(i / (grade.chrome.length - 1), c));
  ctx.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.11);
  ctx.strokeStyle = 'rgba(8,0,24,0.95)';
  ctx.strokeText(text, 0, h * 0.82);
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = size * 0.30;
  ctx.fillStyle = chrome;
  ctx.fillText(text, 0, h * 0.82);
  ctx.restore();
  return w;
}

/** Draws the letter-spaced tagline. */
function drawTagline(ctx, tag, x, y, w, color, size) {
  const t = (tag || '').trim().toUpperCase();
  if (!t) return;
  ctx.save();
  ctx.font = `700 ${size}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = `${Math.round(size * 0.42)}px`;
  } catch {
    /* older canvas: no letterSpacing */
  }
  ctx.fillText(t, x, y);
  ctx.restore();
}

/** The poster masthead: chrome title across the top, tagline beneath it. */
function drawMasthead(ctx, w, h, title, tagline, grade) {
  const text = (title || '').trim().toUpperCase();
  const pad = w * 0.045;
  const boxH = h * 0.115;
  if (text) {
    const size = fitFont(ctx, text, w - pad * 2, Math.round(Math.min(w * 0.105, h * 0.115)));
    drawChromeText(ctx, text, [pad, h * 0.018, w - pad * 2, boxH], grade, size);
  }
  const tagY = h * 0.018 + boxH + h * 0.028;
  drawTagline(ctx, tagline, pad + w * 0.004, tagY, w, '#ffe9fb', Math.max(10, Math.round(w * 0.019)));
}

/** The bottom caption: dark scrim, chrome title, tagline under it. */
function drawBottomCaption(ctx, w, h, title, tagline, grade) {
  const text = (title || '').trim().toUpperCase();
  const tag = (tagline || '').trim();
  if (!text && !tag) return;
  const scrimH = h * 0.26;
  const scrim = ctx.createLinearGradient(0, h - scrimH, 0, h);
  scrim.addColorStop(0, 'rgba(3,0,14,0)');
  scrim.addColorStop(1, 'rgba(3,0,14,0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - scrimH, w, scrimH);
  const pad = w * 0.045;
  const boxH = h * 0.115;
  if (text) {
    const size = fitFont(ctx, text, w - pad * 2, Math.round(Math.min(w * 0.105, h * 0.115)));
    const boxY = h - h * 0.055 - boxH - (tag ? h * 0.045 : 0);
    drawChromeText(ctx, text, [pad, boxY, w - pad * 2, boxH], grade, size);
  }
  drawTagline(ctx, tagline, pad + w * 0.004, h - h * 0.038, w, '#ffe9fb', Math.max(10, Math.round(w * 0.019)));
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * state: { layout, grade, title, tagline, panels: [{img, zoom, ox, oy}] }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = state.layout || 'poster';
  const gradeName = state.grade || 'sunset';
  const grade = SCENE_GRADES[gradeName] || SCENE_GRADES.sunset;
  const layoutFn = LAYOUTS[layout] || LAYOUTS.poster;
  const rects = layoutFn(w, h);

  ctx.fillStyle = '#05010f';
  ctx.fillRect(0, 0, w, h);
  if (layout === 'duo') {
    // The scene lives in the left region only; panels take the right column.
    const regionW = w * 0.615;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, regionW, h);
    ctx.clip();
    drawOutrunScene(ctx, regionW, h, gradeName, SCENE_OPTS.duo);
    ctx.restore();
  } else {
    drawOutrunScene(ctx, w, h, gradeName, SCENE_OPTS[layout] || SCENE_OPTS.poster);
    if (layout === 'grid4') {
      // In the grid the scene only shows in the gaps: dim it, so the gaps read
      // as dark seams and the bright sun never glares through them.
      ctx.fillStyle = 'rgba(5,1,15,0.55)';
      ctx.fillRect(0, 0, w, h);
    }
  }
  rects.forEach((rect, i) => drawPanelPhoto(ctx, rect, state.panels[i] || null, gradeName, i));
  applyVignette(ctx, w, h);
  if (layout === 'poster') {
    drawMasthead(ctx, w, h, state.title, state.tagline, grade);
  } else {
    drawBottomCaption(ctx, w, h, state.title, state.tagline, grade);
  }
}
