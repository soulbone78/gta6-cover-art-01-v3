// OUTRUN VICE — the procedural 80s OUTRUN scene renderer.
//
// Everything is flat vector art drawn on a 2D canvas: a striped chrome sun
// setting over a neon perspective grid, a Vice City skyline, palm silhouettes
// and two back-to-back figures, all silhouettes and gradients, never a face.
// The same renderer draws the cover's backdrop and the sample scenes, so every
// panel looks on-brand even before the user loads a photo.

/** Deterministic pseudo-random generator (mulberry32) so scenes are stable. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The three colour grades: sky, sun, grid and silhouette colours. */
export const SCENE_GRADES = {
  sunset: {
    sky: ['#150329', '#5c1660', '#c22a72', '#ff7a3d'],
    sun: ['#fff7ae', '#ffd23d', '#ff7a18', '#ff2e88'],
    grid: '#2de2ff',
    gridGlow: '#22d3ee',
    ground: ['#2a0a2e', '#07010f'],
    silhouette: '#0a0114',
    glow: '#ff2fd6',
    chrome: ['#ffffff', '#cffafe', '#f0abfc', '#a855f7', '#fdf4ff'],
  },
  ultraviolet: {
    sky: ['#05021f', '#1e0a4e', '#6b21a8', '#d946ef'],
    sun: ['#fdf4ff', '#f0abfc', '#c026d3', '#701a75'],
    grid: '#ff5ce1',
    gridGlow: '#e879f9',
    ground: ['#1c0533', '#05010f'],
    silhouette: '#070213',
    glow: '#e879f9',
    chrome: ['#ffffff', '#f5d0fe', '#e879f9', '#7c3aed', '#fdf4ff'],
  },
  teal: {
    sky: ['#01141c', '#083344', '#0e7490', '#f59e0b'],
    sun: ['#fefce8', '#fde047', '#facc15', '#f97316'],
    grid: '#5eead4',
    gridGlow: '#2dd4bf',
    ground: ['#062a2e', '#01090d'],
    silhouette: '#02141a',
    glow: '#5eead4',
    chrome: ['#ffffff', '#ccfbf1', '#fde68a', '#0d9488', '#f0fdfa'],
  },
};

/** Fills the sky with the grade's vertical gradient. */
function drawSky(ctx, w, h, grade, horizonY) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizonY + 1);
}

/** Scatters a few small stars in the upper sky (deterministic per seed). */
function drawStars(ctx, w, h, rand) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 42; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.34;
    const r = 0.5 + rand() * 1.1;
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the striped chrome sun: a circle clipped to horizontal bands whose
 * gaps grow toward the bottom, the classic outrun sun. Bands are painted with
 * the sun gradient, so the gaps show the sky through.
 */
function drawSun(ctx, cx, cy, r, grade) {
  // A soft halo around the sun, painted first so it sits behind the bands.
  // A radial gradient, so it fades out with no visible edge.
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.45);
  halo.addColorStop(0, grade.sun[2]);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The chrome gradient keeps its bright top short, so the sun reads coloured
  // rather than washed white.
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, grade.sun[0]);
  g.addColorStop(0.16, grade.sun[1]);
  g.addColorStop(0.55, grade.sun[2]);
  g.addColorStop(1, grade.sun[3]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  let y = cy - r;
  while (y < cy + r) {
    const t = (y - (cy - r)) / (2 * r);
    const bandH = Math.max(2, r * 0.17 * (1 - t * 0.72));
    ctx.fillRect(cx - r, y, r * 2, bandH);
    y += bandH + r * 0.02 + t * t * r * 0.17;
  }
  ctx.restore();
}

/** Draws the neon perspective grid floor below the horizon. */
function drawGrid(ctx, w, h, horizonY, vpX, grade) {
  const ground = ctx.createLinearGradient(0, horizonY, 0, h);
  ground.addColorStop(0, grade.ground[0]);
  ground.addColorStop(1, grade.ground[1]);
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  ctx.save();
  ctx.strokeStyle = grade.grid;
  ctx.shadowColor = grade.gridGlow;
  ctx.shadowBlur = Math.max(4, w * 0.006);
  // Horizontal lines, exponentially spaced away from the horizon.
  const rows = 9;
  for (let i = 1; i <= rows; i++) {
    const t = Math.pow(i / rows, 2.1);
    const y = horizonY + (h - horizonY) * t;
    ctx.globalAlpha = 0.25 + 0.65 * t;
    ctx.lineWidth = Math.max(1, 1 + t * w * 0.0016);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Vertical lines converging on the vanishing point.
  const spread = w * 0.085;
  for (let k = -12; k <= 12; k++) {
    if (k === 0) continue;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, w * 0.0011);
    ctx.beginPath();
    ctx.moveTo(vpX + k * spread * 0.055, horizonY);
    ctx.lineTo(vpX + k * spread, h);
    ctx.stroke();
  }
  ctx.restore();
}

/** A dark road trapezoid down the middle of the grid, edged in neon. */
function drawRoad(ctx, w, h, horizonY, vpX, grade) {
  const topW = w * 0.012;
  const botW = w * 0.30;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(vpX - topW, horizonY);
  ctx.lineTo(vpX + topW, horizonY);
  ctx.lineTo(vpX + botW, h);
  ctx.lineTo(vpX - botW, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = grade.grid;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1.5, w * 0.002);
  ctx.shadowColor = grade.gridGlow;
  ctx.shadowBlur = Math.max(4, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(vpX - topW, horizonY);
  ctx.lineTo(vpX - botW, h);
  ctx.moveTo(vpX + topW, horizonY);
  ctx.lineTo(vpX + botW, h);
  ctx.stroke();
  ctx.restore();
}

/** Flat skyline silhouettes along the horizon, kept clear of the sun. */
function drawSkyline(ctx, w, horizonY, sunCx, sunR, grade, rand) {
  const sill = grade.silhouette;
  ctx.fillStyle = sill;
  const clearL = sunCx - sunR * 1.25;
  const clearR = sunCx + sunR * 1.25;
  let x = -w * 0.01;
  while (x < w * 1.01) {
    const bw = w * (0.028 + rand() * 0.05);
    const bh = horizonY * (0.10 + rand() * 0.30);
    const mid = x + bw / 2;
    if (mid < clearL || mid > clearR) {
      ctx.fillRect(x, horizonY - bh, bw, bh);
      if (rand() < 0.35) {
        ctx.fillRect(x + bw * 0.42, horizonY - bh - bh * 0.22, bw * 0.16, bh * 0.22);
      }
      // A few lit windows.
      ctx.save();
      ctx.fillStyle = rand() < 0.5 ? '#ffd166' : grade.grid;
      const cols = Math.max(1, Math.floor(bw / (w * 0.012)));
      const rows = Math.max(1, Math.floor(bh / (horizonY * 0.055)));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < 0.28) {
            ctx.globalAlpha = 0.5 + rand() * 0.5;
            ctx.fillRect(x + bw * 0.14 + c * bw * 0.72 / Math.max(1, cols), horizonY - bh * 0.88 + r * bh * 0.8 / Math.max(1, rows), w * 0.005, horizonY * 0.02);
          }
        }
      }
      ctx.restore();
      ctx.fillStyle = sill;
    }
    x += bw + w * (0.004 + rand() * 0.012);
  }
}

/** One palm silhouette: a leaning trunk and drooping fronds, no detail. */
function drawPalm(ctx, baseX, baseY, height, lean, mirror, color) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(mirror ? -1 : 1, 1);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve, thick enough to read as a silhouette.
  ctx.lineWidth = Math.max(3, height * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(height * 0.06, -height * 0.55, height * 0.02, -height);
  ctx.stroke();
  // Fronds arc up from the crown and droop down: short, thick, and kept to a
  // narrower fan so the palm reads as a palm, not a spider.
  const crownX = height * 0.02;
  const crownY = -height;
  const fronds = 6;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.16 + (i / (fronds - 1)) * 0.68);
    const len = height * (0.30 + (i % 3) * 0.045);
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.30 + len * 0.42;
    const ctrlX = crownX + Math.cos(a) * len * 0.55;
    const ctrlY = crownY - len * 0.30;
    ctx.lineWidth = Math.max(2.5, height * 0.024);
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts: two dots under the crown.
  ctx.beginPath();
  ctx.arc(crownX - height * 0.015, crownY + height * 0.03, height * 0.018, 0, Math.PI * 2);
  ctx.arc(crownX + height * 0.02, crownY + height * 0.035, height * 0.015, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * One figure silhouette, built from chunky overlapping shapes: round head,
 * trapezoid torso, two legs, arms at the sides. `hair` gives the figure a
 * longer hair shape; `lean` tilts it a few degrees. Abstract on purpose.
 */
function drawFigure(ctx, cx, feetY, height, color, hair, lean) {
  ctx.save();
  ctx.translate(cx, feetY);
  ctx.rotate(lean);
  ctx.fillStyle = color;
  const u = height / 100;
  // Legs, thick enough to read at poster size.
  ctx.fillRect(-8.5 * u, -42 * u, 7.5 * u, 42 * u);
  ctx.fillRect(1 * u, -42 * u, 7.5 * u, 42 * u);
  // Torso: broad shoulders, narrower waist.
  ctx.beginPath();
  ctx.moveTo(-13 * u, -78 * u);
  ctx.lineTo(13 * u, -78 * u);
  ctx.lineTo(8 * u, -42 * u);
  ctx.lineTo(-8 * u, -42 * u);
  ctx.closePath();
  ctx.fill();
  // Arms hanging at the sides.
  ctx.save();
  ctx.rotate(0.10);
  ctx.fillRect(-17.5 * u, -78 * u, 5.5 * u, 34 * u);
  ctx.restore();
  ctx.save();
  ctx.rotate(-0.10);
  ctx.fillRect(12 * u, -78 * u, 5.5 * u, 34 * u);
  ctx.restore();
  // Head, slightly smaller than the body so the figure reads adult.
  ctx.beginPath();
  ctx.arc(0, -87 * u, 8.5 * u, 0, Math.PI * 2);
  ctx.fill();
  // Long hair for the second figure: a wide shape falling past the shoulders.
  if (hair) {
    ctx.beginPath();
    ctx.moveTo(-8.5 * u, -94 * u);
    ctx.quadraticCurveTo(-16 * u, -72 * u, -13 * u, -52 * u);
    ctx.lineTo(-4 * u, -56 * u);
    ctx.quadraticCurveTo(-6 * u, -74 * u, -4 * u, -92 * u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8.5 * u, -94 * u);
    ctx.quadraticCurveTo(16 * u, -72 * u, 13 * u, -52 * u);
    ctx.lineTo(4 * u, -56 * u);
    ctx.quadraticCurveTo(6 * u, -74 * u, 4 * u, -92 * u);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The duo: two figures standing back to back, a clear seam between them. */
function drawDuo(ctx, cx, feetY, height, color) {
  const gap = height * 0.16;
  drawFigure(ctx, cx - gap, feetY, height, color, false, -0.045);
  drawFigure(ctx, cx + gap, feetY, height, color, true, 0.045);
  // Soft contact shadow.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, feetY + height * 0.012, height * 0.46, height * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A low sports-car side silhouette, for sample scenes: one clean profile
 * (long hood, cabin hump, fastback tail) with the wheels suggested by two
 * small neon-rimmed dots, never cut out — cut-outs read as holes.
 */
export function drawCarSilhouette(ctx, x, y, w, color, rim = '#2de2ff') {
  const h = w * 0.22;
  ctx.save();
  // Neon underglow, so the car reads against the dark grid.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.06, w * 0.52, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.10);
  ctx.lineTo(x + w * 0.05, y - h * 0.30);
  ctx.lineTo(x + w * 0.34, y - h * 0.42);
  ctx.lineTo(x + w * 0.44, y - h * 0.88);
  ctx.lineTo(x + w * 0.60, y - h * 0.88);
  ctx.lineTo(x + w * 0.70, y - h * 0.44);
  ctx.lineTo(x + w * 0.94, y - h * 0.32);
  ctx.lineTo(x + w, y - h * 0.12);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  // A neon rim-light along the profile, so the dark body reads against the
  // dark grid instead of dissolving into it.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.5, w * 0.005);
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.restore();
  // Wheels: small dark discs with a thin neon rim.
  const wheelR = w * 0.052;
  for (const wx of [x + w * 0.24, x + w * 0.76]) {
    ctx.beginPath();
    ctx.arc(wx, y - wheelR * 0.4, wheelR, 0, Math.PI * 2);
    ctx.fillStyle = '#05010f';
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, w * 0.004);
    ctx.strokeStyle = rim;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the full OUTRUN scene into the context's current size.
 * opts: { sunX, sunY, sunR, horizon, duo, palms, skyline, road, seed }
 * All positions are fractions of the canvas; the scene scales to any size.
 */
export function drawOutrunScene(ctx, w, h, gradeName, opts = {}) {
  const grade = SCENE_GRADES[gradeName] || SCENE_GRADES.sunset;
  const o = {
    sunX: 0.5,
    sunY: 0.40,
    sunR: 0.30,
    horizon: 0.55,
    duo: true,
    palms: true,
    skyline: true,
    road: true,
    seed: 7,
    ...opts,
  };
  const rand = seededRandom(o.seed);
  const horizonY = h * o.horizon;
  const sunCx = w * o.sunX;
  const sunCy = h * o.sunY;
  const sunR = Math.min(w, h) * o.sunR;

  drawSky(ctx, w, h, grade, horizonY);
  drawStars(ctx, w, h, rand);
  drawSun(ctx, sunCx, sunCy, sunR, grade);
  drawGrid(ctx, w, h, horizonY, sunCx, grade);
  if (o.road) drawRoad(ctx, w, h, horizonY, sunCx, grade);
  if (o.skyline) drawSkyline(ctx, w, horizonY, sunCx, sunR, grade, rand);
  // The duo stands on the grid in front of the horizon, large enough to read
  // as the poster's figures rather than specks.
  if (o.duo) drawDuo(ctx, sunCx, horizonY + h * 0.085, h * 0.20, grade.silhouette);
  if (o.palms) {
    drawPalm(ctx, w * 0.045, horizonY + h * 0.16, h * 0.36, 0.10, false, grade.silhouette);
    drawPalm(ctx, w * 0.955, horizonY + h * 0.16, h * 0.36, -0.10, true, grade.silhouette);
    drawPalm(ctx, w * 0.155, horizonY + h * 0.05, h * 0.24, -0.06, true, grade.silhouette);
    drawPalm(ctx, w * 0.845, horizonY + h * 0.05, h * 0.24, 0.06, false, grade.silhouette);
  }
}
