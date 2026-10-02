/* Bodhi · the pixel scroll · pixel-backdrop.js
   Claude's pixel backdrop for everything below the grove: one fixed <canvas> behind the field guide, the
   sources, the evidence and the afterword. A quiet night world in the key of the field-guide sky.

   What it draws (all at a low logical resolution, scaled by whole numbers with image-rendering: pixelated):
   - a fixed sky band: dusk, then night with sparse stars, a moon, faint aurora and slow flat clouds, then a
     faint dawn at the very end of the page;
   - three layers of rolling dark hills that pan sideways in whole pixels as you scroll;
   - a long world map below the horizon that scrolls up beneath the sky: a river that winds down the page,
     streams that branch off it, ponds with reeds and lily pads, stepping stones, two small footbridges, rocks,
     mushrooms, a few trees whose leaves move, fireflies near the water, a lantern, and the moon on the water.

   PALETTE, 23 colours (the Bodhi brand ten, then thirteen muted extras). Warm hues are only tiny accents.
     brand   soil #17231B   under #1F2C24   moss #2E3B33    lichen #8A968D  sage #B8C2BA
             bone #F2EEE4   canopy #2E6B45  sprout #8BCB8B  saffron #E8982A  clay #D9674F
     night   ink #0F1814 (deepest sky and hills)   canopyDk #255039 (dim canopy)
     water   wDeep #162D38   water #22404F   wHi #36606F
     dusk    dusk #38344A (muted violet)   glow #6E4F4C (low warm light)   dawn #8C7A6A (faint dawn)
     earth   earth #3A2E27   earthL #5B4638   reed #5A5A34
     bloom   rose #A86F85   lilac #8478A8 (a few dim flower pixels)
   Saffron is spent on two things only: the lantern flame and a few firefly flickers.

   Motion: still when the system asks for reduced motion, when the film's Stillness button is pressed
   (body.still-frames), or when the field guide's motion switch is off (#field-guide[data-motion="off"]). A still
   backdrop is one complete frame per section that only redraws when the section changes. It pauses when the
   tab is hidden, when the film is on screen, and while the field guide's own sky covers the viewport.
   No storage, no network, no globals. */
(() => {
  'use strict';

  const doc = document, win = window, root = doc.documentElement;
  const field = doc.getElementById('field-guide');
  if (!field || !win.requestAnimationFrame || !doc.body) return;

  /* ------------------------------------------------------------------ palette */
  const HEX = {
    soil: '#17231B', under: '#1F2C24', moss: '#2E3B33', lichen: '#8A968D', sage: '#B8C2BA', bone: '#F2EEE4',
    canopy: '#2E6B45', sprout: '#8BCB8B', saffron: '#E8982A', clay: '#D9674F',
    ink: '#0F1814', canopyDk: '#255039', wDeep: '#162D38', water: '#22404F', wHi: '#36606F',
    dusk: '#38344A', glow: '#6E4F4C', dawn: '#8C7A6A', earth: '#3A2E27', earthL: '#5B4638', reed: '#5A5A34',
    rose: '#A86F85', lilac: '#8478A8'
  };
  const NAMES = Object.keys(HEX);
  const N = NAMES.length; // 23
  const I = {};
  NAMES.forEach((n, i) => { I[n] = i; });
  const RGB = NAMES.map((n) => { const h = HEX[n]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
  const U32 = RGB.map(([r, g, b]) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0);
  const { soil: SOIL, under: UNDER, moss: MOSS, lichen: LICHEN, sage: SAGE, bone: BONE, canopy: CANOPY, sprout: SPROUT,
    saffron: SAFFRON, clay: CLAY, ink: INK, canopyDk: CDK, wDeep: WDEEP, water: WATER, wHi: WHI, dusk: DUSK, glow: GLOW,
    dawn: DAWN, earth: EARTH, earthL: EARTHL, reed: REED, rose: ROSE, lilac: LILAC } = I;

  /* ------------------------------------------------------------------ helpers */
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const vnoise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const mod = (a, n) => ((a % n) + n) % n;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  /* ------------------------------------------------------------------ time of day
     P runs 0 dusk · 1 twilight · 2 night · 3 deep night · 4 faint dawn. The sky is authored per phase, five bands
     from the zenith to the horizon, and the horizon leads the zenith a little, as a real sky does. */
  const bands = (a) => a.map((n) => I[n]);
  const SKY = [
    bands(['soil', 'under', 'under', 'dusk', 'glow']),
    bands(['ink', 'soil', 'under', 'under', 'dusk']),
    bands(['ink', 'soil', 'soil', 'under', 'moss']),
    bands(['ink', 'ink', 'soil', 'soil', 'under']),
    bands(['ink', 'soil', 'under', 'moss', 'dusk'])
  ];
  // The light the ground is lit by: a tint colour, how much of it, and how bright the world is.
  const GRADE = [[GLOW, 0.12, 1], [DUSK, 0.28, 0.93], [INK, 0.3, 0.88], [INK, 0.4, 0.82], [DAWN, 0.1, 0.9]];
  const STEP = Array.from({ length: N }, (_, i) => i);
  STEP[INK] = SOIL; STEP[SOIL] = UNDER; STEP[UNDER] = MOSS; STEP[MOSS] = CDK; STEP[DUSK] = GLOW; STEP[GLOW] = DAWN; STEP[DAWN] = LICHEN;

  /* ------------------------------------------------------------------ state */
  const canvas = doc.createElement('canvas');
  canvas.className = 'pb-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  let W = 0, H = 0, hy = 0, gy = 0, cssPer = 4, WH = 0, vr = 0;
  let img = null, buf = null;
  let map = null, wm = null, trees = [], reeds = [], flies = [], lantern = null, lanternB = null, pondB = null;
  let stars = [], clouds = [];
  let ready = false, rebuildT = 0;
  const LA = new Uint32Array(N), LB = new Uint32Array(N), LF = new Float32Array(N);

  /* ------------------------------------------------------------------ pixel primitives */
  let clipTop = 0;
  const put = (x, y, c) => {
    if (x < 0 || x >= W || y < clipTop || y >= H) return;
    buf[y * W + x] = BAY[((y & 3) << 2) | (x & 3)] < LF[c] ? LB[c] : LA[c];
  };
  const raw = (x, y, c) => {
    if (x < 0 || x >= W || y < clipTop || y >= H) return;
    buf[y * W + x] = U32[c];
  };
  const mput = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < WH) map[y * W + x] = c; };

  /* The day-night grade: every colour the scene is painted in is pulled toward the light of the hour and
     snapped back onto the 23 colours. Only where a colour sits midway between two does it dither. */
  const wd = (a, b) => {
    const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  };
  const buildGrade = (P) => {
    const i = clamp(Math.floor(P), 0, 3), f = smooth(0.25, 0.75, clamp(P - i, 0, 1));
    const a = GRADE[i], b = GRADE[i + 1];
    const tint = RGB[a[0]].map((v, k) => lerp(v, RGB[b[0]][k], f));
    const k = lerp(a[1], b[1], f), br = lerp(a[2], b[2], f);
    for (let c = 0; c < N; c++) {
      const t = RGB[c].map((v, j) => (v * (1 - k) + tint[j] * k) * br);
      let A = 0, da = 1e12;
      for (let j = 0; j < N; j++) { const d = wd(t, RGB[j]); if (d < da) { da = d; A = j; } }
      let B = A, bf = 0, bd = 1e12;
      const ra = RGB[A];
      const ab = [t[0] - ra[0], t[1] - ra[1], t[2] - ra[2]];
      for (let j = 0; j < N; j++) {
        if (j === A) continue;
        const v = [RGB[j][0] - ra[0], RGB[j][1] - ra[1], RGB[j][2] - ra[2]];
        const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
        const p = (ab[0] * v[0] + ab[1] * v[1] + ab[2] * v[2]) / vv;
        if (p <= 0 || p >= 1) continue;
        const e = [ab[0] - v[0] * p, ab[1] - v[1] * p, ab[2] - v[2] * p];
        const d = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
        if (d < bd) { bd = d; B = j; bf = p; }
      }
      LA[c] = U32[A]; LB[c] = U32[B]; LF[c] = smooth(0.46, 0.85, bf) * (B === A ? 0 : 1);
    }
  };

  /* ------------------------------------------------------------------ layout and the world map */
  const layout = () => {
    const vw = Math.max(320, win.innerWidth || 0), vh = Math.max(320, win.innerHeight || 0);
    const dpr = win.devicePixelRatio || 1;
    const sCss = clamp(Math.round(vw / 340), 2, 6);
    const sDev = Math.max(1, Math.round(sCss * dpr));
    cssPer = sDev / dpr;
    W = Math.ceil((vw * dpr) / sDev);
    H = Math.ceil((vh * 1.08 * dpr) / sDev);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * cssPer + 'px';
    canvas.style.height = H * cssPer + 'px';
    root.style.setProperty('--pb-px', cssPer + 'px');
    hy = Math.round(H * (H / W > 1.3 ? 0.27 : 0.33));
    gy = hy + 6;
    vr = H - gy;
    img = ctx.createImageData(W, H);
    rowSky = new Uint8Array(H);
    buf = new Uint32Array(img.data.buffer);
    stars = Array.from({ length: 110 }, (_, i) => ({ x: hash(i, 1, 7), y: Math.pow(hash(i, 2, 7), 0.8) * 0.94, th: hash(i, 3, 7), b: hash(i, 4, 7), ph: hash(i, 5, 7) * 40 }));
    clouds = Array.from({ length: 6 }, (_, i) => ({ x: hash(i, 1, 9) * (W + 90), y: 0.12 + hash(i, 2, 9) * 0.62, w: 24 + hash(i, 3, 9) * 30, v: 1.2 + hash(i, 4, 9) * 1.6 }));
    buildWorld();
  };

  const buildWorld = () => {
    const doch = Math.max(doc.documentElement.scrollHeight, win.innerHeight * 4);
    const travel = clamp(Math.round(((doch - win.innerHeight * 2) * 0.4) / cssPer), 600, 4800);
    WH = vr + travel;
    map = new Uint8Array(W * WH);
    wm = new Uint8Array(W * WH);
    trees = []; reeds = []; flies = [];
    const sc = clamp(W / 360, 0.55, 1.25);

    // ground: dark understory with moss patches, speckle and tufts
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < W; x++) {
        let c = UNDER;
        if (hash(x >> 1, y, 5) < 0.02) c = MOSS;
        const h = hash(x, y, 1);
        if (h < 0.02) c = c === UNDER ? SOIL : UNDER;
        map[y * W + x] = c;
      }
    }
    for (let y = 2; y < WH; y++) {
      for (let x = 1; x < W - 1; x++) {
        const h = hash(x, y, 2);
        if (h < 0.006) { mput(x, y, CDK); if (h < 0.0022) mput(x, y - 1, CANOPY); if (h < 0.001) mput(x + 1, y, CDK); }
      }
    }

    // the river
    const xr = (y) => W * (0.5 + 0.19 * Math.sin((y * TAU) / 330 + 0.6) + 0.07 * Math.sin((y * TAU) / 121 + 2.1) + 0.05 * Math.sin((y * TAU) / 1900 + 1.3));
    const hw = (y) => (4.3 + 1.5 * Math.sin((y * TAU) / 173 + 1)) * (0.8 + 0.4 * sc);
    for (let y = 0; y < WH; y++) {
      const xc = xr(y), s = (xr(y + 1) - xr(y - 1)) / 2, w = hw(y) * Math.sqrt(1 + s * s);
      for (let x = Math.floor(xc - w - 1); x <= Math.ceil(xc + w + 1); x++) {
        if (x >= 0 && x < W && Math.abs(x - xc) <= w) wm[y * W + x] = 1;
      }
    }
    const stamp = (cx, cy, r, v) => {
      const R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const x = Math.round(cx + dx), y = Math.round(cy + dy);
          if (x >= 0 && x < W && y >= 0 && y < WH) wm[y * W + x] = Math.max(wm[y * W + x], v);
        }
      }
    };
    const pond = (cx, cy, rx, ry, seed) => {
      for (let dy = -ry - 2; dy <= ry + 2; dy++) for (let dx = -rx - 2; dx <= rx + 2; dx++) {
        const a = Math.atan2(dy / ry, dx / rx), wob = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 5 + seed * 2);
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= wob * wob) {
          const x = Math.round(cx + dx), y = Math.round(cy + dy);
          if (x >= 0 && x < W && y >= 0 && y < WH) wm[y * W + x] = 2;
        }
      }
    };
    // a stream wanders off the river and downhill; it tapers as it goes
    const stream = (y0, dir, len, endPond) => {
      let x = xr(y0), y = y0, th = dir > 0 ? 0.55 : Math.PI - 0.55;
      const home = dir > 0 ? 0.35 : Math.PI - 0.35;
      let sx = x, sy = y;
      const pts = [];
      for (let i = 0; i < len; i++) {
        pts.push([x, y, th]);
        const r = lerp(3, 1.6, i / len) * (0.8 + 0.3 * sc);
        stamp(x, y, r, 1);
        th += (hash(i, y0, 11) - 0.5) * 0.34 + clamp((home - th) * 0.03, -0.05, 0.05);
        x += Math.cos(th); y += Math.sin(th) * 0.8 + 0.12;
        sx = x; sy = y;
        if (x < -3 || x > W + 3 || y > WH - 3) break;
      }
      if (endPond && sx > 12 && sx < W - 12) pond(sx, sy, Math.round(15 * sc), Math.round(10 * sc), y0);
      return pts;
    };
    const fy = (f) => Math.round(WH * f);
    stream(fy(0.1), -1, Math.round(W * 0.34), true);
    const stoneStream = stream(fy(0.37), 1, Math.round(W * 0.7), false);
    stream(fy(0.7), 1, Math.round(W * 0.3), true);
    stream(fy(0.86), -1, Math.round(W * 0.6), false);
    stream(fy(0.5), -1, Math.round(W * 0.16), false);
    // the larger pond, off the river, with a channel to it
    const pxB = W * 0.2, pyB = fy(0.55);
    pondB = { x: pxB, y: pyB };
    pond(pxB, pyB, Math.round(26 * sc), Math.round(16 * sc), 3);
    for (let i = 0; i < Math.abs(xr(pyB) - pxB); i++) stamp(pxB + i, pyB + 2 + Math.sin(i / 9) * 2, 1.6, 1);

    // banks, then water shading
    const wat = (x, y) => x >= 0 && x < W && y >= 0 && y < WH && wm[y * W + x] > 0;
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < W; x++) {
        if (wm[y * W + x]) continue;
        if (wat(x - 1, y) || wat(x + 1, y) || wat(x, y - 1) || wat(x, y + 1) || wat(x - 1, y - 1) || wat(x + 1, y - 1) || wat(x - 1, y + 1) || wat(x + 1, y + 1)) {
          map[y * W + x] = hash(x, y, 4) < 0.25 ? EARTHL : EARTH;
        }
      }
    }
    const bank = (x, y) => map[y * W + x] === EARTH || map[y * W + x] === EARTHL;
    for (let y = 0; y < WH; y++) {
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (!wm[k]) continue;
        map[k] = !wat(x, y - 1) ? WDEEP : WATER;
      }
    }
    // reeds and lily pads at the bank
    for (let y = 8; y < WH - 4; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (!bank(x, y) || wm[y * W + x]) continue;
        if (hash(x, y, 5) < 0.022 && (wat(x - 1, y) || wat(x + 1, y) || wat(x, y - 1))) reeds.push({ x, y, h: 4 + ((hash(x, y, 6) * 3) | 0), ph: hash(x, y, 8) * 6.28 });
      }
    }
    for (let y = 4; y < WH - 4; y++) {
      for (let x = 3; x < W - 3; x++) {
        if (wm[y * W + x] === 2 && hash(x, y, 12) < 0.012 && wm[y * W + x + 2] && wm[y * W + x - 2] && wm[(y + 1) * W + x] && wm[(y - 1) * W + x]) {
          for (let dx = -1; dx <= 1; dx++) mput(x + dx, y, CDK);
          mput(x, y - 1, CDK);
          if (hash(x, y, 13) < 0.4) mput(x + 1, y - 1, ROSE);
        }
      }
    }

    // footbridges: planks over the river, a lantern post at the first
    const bridge = (y, lit) => {
      const xc = xr(y), w = hw(y) + 4;
      for (let x = Math.max(0, Math.floor(xc - w)); x <= Math.min(W - 1, Math.ceil(xc + w)); x++) {
        for (let dy = -2; dy <= 2; dy++) {
          wm[(Math.round(y) + dy) * W + x] = 0;
          mput(x, Math.round(y) + dy, Math.abs(dy) === 2 ? EARTH : ((x + 1) % 3 === 0 ? EARTH : EARTHL));
        }
      }
      if (lit) {
        const px = Math.round(xc + w - 1);
        for (let dy = -7; dy <= -3; dy++) mput(px, Math.round(y) + dy, EARTH);
        return { x: px, y: Math.round(y) - 8 };
      }
      return null;
    };
    lantern = bridge(fy(0.24), true);
    lanternB = bridge(fy(0.8), false);

    // stepping stones across the second stream
    {
      const pt = stoneStream[Math.min(stoneStream.length - 1, Math.round(stoneStream.length * 0.5))];
      if (pt) {
        for (let i = -2; i <= 2; i++) {
          const sx0 = Math.round(pt[0] + Math.cos(pt[2] + Math.PI / 2) * i * 2.8), sy0 = Math.round(pt[1] + Math.sin(pt[2] + Math.PI / 2) * i * 2.8);
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (sx0 + dx >= 0 && sx0 + dx < W) { wm[(sy0 + dy) * W + sx0 + dx] = 0; mput(sx0 + dx, sy0 + dy, dy === 0 ? (dx === 0 ? SAGE : LICHEN) : MOSS); }
        }
      }
    }

    // rocks, mushrooms and dim flowers
    const free = (x, y, r) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= W || yy < 0 || yy >= WH) return false;
        const k = yy * W + xx;
        if (wm[k] || map[k] === EARTH || map[k] === EARTHL) return false;
      }
      return true;
    };
    for (let i = 0; i < Math.round(WH / 28); i++) {
      const x = 4 + ((hash(i, 1, 30) * (W - 8)) | 0), y = 6 + ((hash(i, 2, 30) * (WH - 12)) | 0);
      if (!free(x, y, 4)) continue;
      mput(x + 1, y + 2, SOIL); mput(x + 2, y + 2, SOIL); mput(x + 3, y + 1, SOIL);
      mput(x, y + 1, MOSS); mput(x + 1, y + 1, MOSS); mput(x + 2, y + 1, MOSS); mput(x + 3, y, MOSS);
      mput(x + 1, y, LICHEN); mput(x + 2, y, LICHEN); mput(x + 1, y - 1, SAGE);
    }
    for (let i = 0; i < Math.round(WH / 70); i++) {
      const x = 5 + ((hash(i, 1, 31) * (W - 10)) | 0), y = 8 + ((hash(i, 2, 31) * (WH - 16)) | 0);
      if (!free(x, y, 6)) continue;
      for (let j = 0; j < 3; j++) {
        const mx = x + j * 3 - 3, my = y + (j & 1);
        mput(mx, my, LICHEN); mput(mx - 1, my - 1, GLOW); mput(mx, my - 1, GLOW); mput(mx + 1, my - 1, GLOW); mput(mx, my - 2, j === 1 ? CLAY : GLOW);
      }
    }
    const blooms = [ROSE, LILAC, BONE, CLAY];
    for (let i = 0; i < Math.round(WH / 9); i++) {
      const x = 3 + ((hash(i, 1, 32) * (W - 6)) | 0), y = 4 + ((hash(i, 2, 32) * (WH - 8)) | 0);
      if (!free(x, y, 2)) continue;
      mput(x, y, CDK); mput(x, y - 1, blooms[(hash(i, 3, 32) * 4) | 0]);
    }
    // a few trees
    const tseen = [];
    for (let i = 0; i < Math.round(WH / 70) + 4; i++) {
      const r = Math.round((7 + hash(i, 3, 33) * 4) * (0.8 + 0.3 * sc)), x = 6 + ((hash(i, 1, 33) * (W - 12)) | 0), y = 24 + ((hash(i, 2, 33) * (WH - 30)) | 0);
      if (!free(x, y, r + 1) || tseen.some((t) => Math.abs(t.y - y) < r + 6 && Math.abs(t.x - x) < r * 2)) continue;
      tseen.push({ x, y });
      for (let dx = -r; dx <= r; dx++) for (let dy = -1; dy <= 2; dy++) {
        if ((dx * dx) / (r * r * 0.8) + (dy * dy) / 5 <= 1) mput(x + dx, y + dy, SOIL);
      }
      trees.push({ x, y, r, h: Math.round(r * 0.7), ph: hash(i, 4, 33) * 6.28, seed: i });
    }
    trees.sort((a, b) => a.y - b.y);
    // fireflies live by the water
    const rs = reeds.length ? reeds : [{ x: W / 2, y: WH / 2 }];
    for (let i = 0; i < 44; i++) {
      const r = rs[(hash(i, 1, 34) * rs.length) | 0];
      flies.push({ x: r.x + (hash(i, 2, 34) - 0.5) * 22, y: r.y - 3 - hash(i, 3, 34) * 12, ph: hash(i, 4, 34) * 6.28, th: i / 44 });
    }
  };

  /* ------------------------------------------------------------------ anchors: where the page is in the story */
  const q = (s) => doc.querySelector(s);
  const ANCH = [
    ['#field-guide', 0, 0.05], ['#tree', 0, 0.3], ['#the-practice', 0, 0.9], ['#sky', 0, 1.3], ['#sky', 1, 2.0],
    ['#ancestors', 0, 2.05], ['.source-window', 0, 2.15], ['.evidence-folio', 1, 2.3], ['#afterward', 0, 2.4], ['.end-note', 0, 3.0]
  ];
  const END_P = 3.5;
  let anchors = [];
  const readAnchors = () => {
    const sy = win.scrollY || 0;
    const out = [];
    let prev = -1e9;
    ANCH.forEach(([sel, edge, p]) => {
      const el = q(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const y = Math.max(prev + 1, r.top + sy + edge * r.height);
      prev = y;
      out.push([y, p]);
    });
    const endY = Math.max(prev + 1, doc.documentElement.scrollHeight - win.innerHeight / 2);
    out.push([endY, END_P]);
    anchors = out;
  };
  const phaseAt = (yc) => {
    const a = anchors;
    if (!a.length || yc <= a[0][0]) return a.length ? a[0][1] : 0;
    for (let i = 1; i < a.length; i++) {
      if (yc <= a[i][0]) return lerp(a[i - 1][1], a[i][1], (yc - a[i - 1][0]) / (a[i][0] - a[i - 1][0]));
    }
    return a[a.length - 1][1];
  };
  const segmentAt = (yc) => {
    for (let i = 1; i < anchors.length; i++) if (yc <= anchors[i][0]) return i - 1;
    return Math.max(0, anchors.length - 2);
  };

  /* ------------------------------------------------------------------ drawing */
  let rowSky = new Uint8Array(1);

  const drawSky = (P) => {
    const rows = gy + 2;
    for (let y = 0; y < rows; y++) {
      const bp = clamp((y / (hy * 0.82)) * 4, 0, 3.999), k = Math.floor(bp), tt = smooth(0.05, 0.95, bp - k);
      const Pk = clamp(P + 0.3 * (bp / 4), 0, 3.999), pi = Math.floor(Pk), pf = smooth(0.2, 0.8, Pk - pi);
      const a0 = SKY[pi][k], a1 = SKY[pi][k + 1], b0 = SKY[pi + 1][k], b1 = SKY[pi + 1][k + 1];
      rowSky[y] = (pf < 0.5 ? (tt < 0.5 ? a0 : a1) : (tt < 0.5 ? b0 : b1));
      for (let x = 0; x < W; x++) {
        const th = BAY[((y & 3) << 2) | (x & 3)], th2 = BAY[(((y + 2) & 3) << 2) | ((x + 1) & 3)];
        const cA = th < tt ? a1 : a0, cB = th < tt ? b1 : b0;
        buf[y * W + x] = U32[th2 < pf ? cB : cA];
      }
    }
  };

  const drawStars = (night, tick, anim) => {
    if (night <= 0.01) return;
    for (const s of stars) {
      if (s.th > night * 0.95) continue;
      const x = Math.floor(s.x * W), y = Math.floor(s.y * hy);
      let c = s.b > 0.97 ? BONE : s.b > 0.8 ? SAGE : LICHEN;
      if (anim && ((tick + Math.floor(s.ph)) % 7 === 0) && s.b < 0.7) c = MOSS;
      raw(x, y, c);
    }
  };

  const drawMoon = (mx, my, r, amt) => {
    if (amt <= 0.02) return;
    for (let dy = -r - 3; dy <= r + 3; dy++) for (let dx = -r - 3; dx <= r + 3; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r + r * 0.4) raw(mx + dx, my + dy, BONE);
      else if (d2 <= (r + 2.4) * (r + 2.4) && BAY[(((my + dy) & 3) << 2) | ((mx + dx) & 3)] < 0.28 * amt) raw(mx + dx, my + dy, LICHEN);
    }
    raw(mx - 1, my - 1, SAGE); raw(mx + 1, my + 1, SAGE); raw(mx + 2, my + 1, SAGE); raw(mx - 2, my + 2, SAGE);
  };

  const drawAurora = (a, t) => {
    if (a <= 0.02) return;
    for (let x = 0; x < W; x++) {
      const env = smooth(0.15, 0.7, 0.5 + 0.5 * Math.sin(x * 0.011 + 1.3 + t * 0.00004));
      if (env <= 0) continue;
      const yb = hy * (0.4 + 0.06 * Math.sin(x * 0.03 + t * 0.0003) + 0.03 * Math.sin(x * 0.09 - t * 0.0002));
      const ray = 0.5 + hash(x >> 1, 77, 0) * 0.9;
      const L = hy * (0.14 + 0.14 * (0.5 + 0.5 * Math.sin(x * 0.045 + t * 0.00025 + 1))) * ray;
      const streak = (0.85 + 0.15 * Math.sin(x * 1.3 + 3 * Math.sin(t * 0.0007 + x * 0.1))) * env;
      for (let y = Math.max(0, Math.floor(yb - L)); y <= Math.floor(yb); y++) {
        const d = (yb - y) / L, k = a * 1.05 * Math.pow(1 - d, 1.1) * streak, th = BAY[((y & 3) << 2) | (x & 3)];
        if (k > 0.8 + th * 0.2) buf[y * W + x] = U32[CANOPY];
        else if (k > 0.42 + th * 0.3) buf[y * W + x] = U32[CDK];
        else if (k > 0.08 + th * 0.45) buf[y * W + x] = U32[MOSS];
      }
    }
  };

  const drawClouds = (t, pan) => {
    for (const c of clouds) {
      const span = W + 100;
      const cx = Math.floor(mod(c.x + t * c.v * 0.001 * 6 + pan * 0.5, span)) - 50;
      const base = Math.round(8 + c.y * hy * 0.5);
      const sky = rowSky[clamp(base, 0, H - 1)];
      const body = STEP[sky], shade = sky;
      const puffs = [[-0.4, 0.17], [-0.1, 0.27], [0.2, 0.21], [0.42, 0.14]];
      for (const [ox, rr] of puffs) {
        const pr = Math.max(2, Math.round(c.w * rr * 0.9)), pcx = Math.round(cx + ox * c.w);
        for (let y = -pr; y <= 0; y++) for (let x = -pr; x <= pr; x++) {
          if (x * x + y * y <= pr * pr + pr * 0.5) {
            const px = pcx + x, py = base + y;
            if (px < 0 || px >= W || py < 0 || py >= H) continue;
            const low = y > -2 && ((px + py) & 1) === 0;
            buf[py * W + px] = U32[low ? shade : body];
          }
        }
      }
    }
  };

  // three ranges of rolling dark hills
  const WWH = 640;
  const LAYERS = [
    { c: UNDER, base: 0.70, a1: 0.13, a2: 0.05, k1: 2, k2: 5, ph: 0.7, sp: 0.004, pines: 0.05 },
    { c: SOIL, base: 0.83, a1: 0.09, a2: 0.04, k1: 3, k2: 7, ph: 1.9, sp: 0.008, pines: 0.035 },
    { c: INK, base: 0.97, a1: 0.035, a2: 0.025, k1: 4, k2: 9, ph: 0.3, sp: 0.014, pines: 0 }
  ];
  const drawHills = (scrollEq, t, anim, from, to) => {
    LAYERS.forEach((L, li) => {
      if (li < from || li > to) return;
      const pan = Math.floor(scrollEq * L.sp);
      for (let x = 0; x < W; x++) {
        const xw = mod(x + pan, WWH);
        const cy = Math.round(hy * (L.base + L.a1 * Math.sin((TAU * L.k1 * xw) / WWH + L.ph) + L.a2 * Math.sin((TAU * L.k2 * xw) / WWH + L.ph * 2.3) + 0.012 * Math.sin((TAU * 13 * xw) / WWH)));
        const bottom = li === 2 ? gy + 2 + Math.round(1.5 * Math.sin(xw * 0.07) + 1.5 * Math.sin(xw * 0.19 + 1)) : gy;
        for (let y = cy; y < bottom; y++) put(x, y, L.c);
        const h = hash(xw, li, 40);
        if (L.pines && h < L.pines) {
          const ph = 4 + ((hash(xw, li, 41) * 4) | 0);
          for (let i = 0; i < ph; i++) { const half = i >> 1; for (let d = -half; d <= half; d++) put(x + d, cy - ph + i, L.c); }
        } else if (li === 2 && h < 0.2) {
          const sway = anim && ((Math.floor(t / 900 + hash(xw, 3, 42) * 7) % 3) === 0) ? 1 : 0;
          put(x + sway, cy - 1, L.c);
          if (h < 0.08) put(x + sway, cy - 2, L.c);
        }
      }
    });
  };

  const HZ = [0.95, 0.95, 0.9, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.22, 0.16, 0.1, 0.06];
  const drawGround = (camY, tick, moonX, moonAmt) => {
    for (let yy = 0; yy < vr; yy++) {
      const r = camY + yy, y = gy + yy, rowW = r * W;
      const haze = HZ[yy] || 0;
      for (let x = 0; x < W; x++) {
        const k = rowW + x;
        let c = map[k], rawc = -1;
        const bi = ((y & 3) << 2) | (x & 3);
        if (wm[k]) {
          if (c === WATER && (r & 1) === 0 && ((x + r * 5 + tick) % 13) < 2) c = WHI;
          if (moonAmt > 0.05) {
            const dm = Math.abs(x - moonX);
            if (dm <= 5 && hash(x, r, tick + 50) < moonAmt * 0.2 * (1 - dm / 6)) rawc = hash(x, r, 51) < 0.04 ? BONE : hash(x, r, 52) < 0.5 ? SAGE : LICHEN;
          }
        }
        if (haze > 0 && BAY[bi] < haze) c = INK;
        buf[y * W + x] = rawc >= 0 ? U32[rawc] : (BAY[bi] < LF[c] ? LB[c] : LA[c]);
      }
    }
  };

  const drawTree = (tr, sy, anim, t, tick) => {
    const r = tr.r, cx = tr.x, cy = sy - tr.h - Math.round(r * 0.55);
    for (let i = 0; i < tr.h; i++) { put(cx, sy - i, EARTH); put(cx + 1, sy - i, i > 1 ? EARTHL : EARTH); }
    put(cx - 1, sy, EARTH); put(cx + 2, sy, EARTH);
    const sw = anim ? Math.round(Math.sin(t / 1100 + tr.ph) * 1.3) : 0;
    const blobs = [[0, 0, r], [-r * 0.55, r * 0.28, r * 0.7], [r * 0.55, r * 0.3, r * 0.68], [0, -r * 0.5, r * 0.66]];
    for (let y = Math.floor(cy - r * 1.3); y <= Math.ceil(cy + r * 0.95); y++) {
      const shear = Math.round(sw * clamp((cy + r - y) / (2 * r), 0, 1));
      for (let x = Math.floor(cx - r * 1.4); x <= Math.ceil(cx + r * 1.4); x++) {
        let inside = false;
        for (const b of blobs) { const dx = x - cx - b[0], dy = y - cy - b[1]; if (dx * dx + dy * dy <= b[2] * b[2]) { inside = true; break; } }
        if (!inside) continue;
        const lt = (-(x - cx) * 0.5 - (y - cy) * 0.85) / r;
        let lv = lt > 0.62 ? 3 : lt > 0.0 ? 2 : lt > -0.55 ? 1 : 0;
        const h = hash(x - cx, y - cy, tr.seed + 60);
        if (h < 0.14 && lv < 3) lv++; else if (h > 0.92 && lv > 0) lv--;
        if (anim && hash(x, y, tick + tr.seed) < 0.045 && lv < 3) lv++;
        let c = lv === 3 ? CANOPY : lv === 2 ? CDK : lv === 1 ? MOSS : UNDER;
        if (lt > 0.72 && h > 0.97) c = SPROUT;
        put(x + shear, y, c);
      }
    }
  };

  const draw = (now, anim, eff) => {
    if (!ready) return;
    const vh = win.innerHeight;
    readAnchors();
    const yc = eff + vh / 2;
    const P = phaseAt(yc);
    const maxS = Math.max(1, doc.documentElement.scrollHeight - vh);
    const y0 = (field.getBoundingClientRect().top + (win.scrollY || 0)) - vh;
    // the field guide's own sky covers the viewport for a stretch; the world's camera skips that stretch
    const sk = q('#sky');
    let sTop = 1e12, occ = 0;
    if (sk) { sTop = sk.getBoundingClientRect().top + (win.scrollY || 0); occ = Math.max(0, sk.offsetHeight - vh); }
    const u = eff <= sTop ? eff : eff < sTop + occ ? sTop : eff - occ;
    const prog = clamp((u - y0) / Math.max(1, maxS - occ - y0), 0, 1);
    const camY = Math.floor(prog * (WH - vr));
    const t = anim ? now : 0;
    const tick = anim ? Math.floor(now / 380) : 0;
    const night = smooth(0.4, 1.4, P) * (1 - smooth(3.3, 3.95, P));
    const aur = smooth(2.0, 2.7, P) * (1 - smooth(3.2, 3.7, P));
    const moonAmt = smooth(0.6, 1.3, P) * (1 - smooth(3.4, 3.95, P));
    const fireF = smooth(0.1, 0.9, P) * (1 - smooth(3.3, 3.8, P));
    const mq = clamp((P - 0.7) / 3.2, 0, 1);
    const mr = Math.max(3, Math.round(hy * 0.055));
    const mx = Math.round(W * (0.84 - 0.62 * mq)), my = Math.round(hy * (1.06 - 0.86 * Math.sin(Math.PI * Math.pow(mq, 0.92))));
    const scrollEq = eff;

    buildGrade(P);
    clipTop = 0;
    drawSky(P);
    drawMoon(mx, my, mr, moonAmt);
    drawStars(night, tick, anim);
    drawAurora(aur, t);
    drawClouds(t, Math.floor(scrollEq * 0.01));
    drawHills(scrollEq, t, anim, 0, 1);
    clipTop = gy;
    drawGround(camY, tick, mx, moonAmt);
    clipTop = 0;
    drawHills(scrollEq, t, anim, 2, 2);
    clipTop = gy;

    // reeds
    for (const rd of reeds) {
      const y = gy + (rd.y - camY);
      if (y < gy - 8 || y > H + 2) continue;
      const off = anim ? Math.round(Math.sin(t / 1200 + rd.ph)) : 0;
      for (let i = 0; i < rd.h; i++) put(rd.x + (i >= rd.h - 2 ? off : 0), y - i, REED);
      put(rd.x + off, y - rd.h, EARTH); put(rd.x + off, y - rd.h - 1, EARTH);
    }
    // trees, back to front
    for (const tr of trees) {
      const y = gy + (tr.y - camY);
      if (y < gy - tr.r * 3 || y > H + tr.r * 2 + 4) continue;
      drawTree(tr, y, anim, t, tick);
    }
    // the moon, on the larger pond
    if (pondB && moonAmt > 0.05) {
      const py = gy + (pondB.y - camY);
      if (py > gy - 6 && py < H + 6) {
        const rx = pondB.x - 2, ry = py - 1;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy <= 9 && ((dy + (anim ? tick : 0)) & 1) === 0) raw(Math.round(rx + dx), ry + dy, dx * dx + dy * dy < 4 ? BONE : SAGE);
        }
      }
    }
    // lantern
    if (lantern) {
      const ly = gy + (lantern.y - camY), lx = lantern.x;
      if (ly > gy - 8 && ly < H + 8) {
        const lit = fireF > 0.15;
        if (lit) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > 2 && d2 <= 18 && BAY[(((ly + dy) & 3) << 2) | ((lx + dx) & 3)] < 0.34 * fireF) raw(lx + dx, ly + dy, GLOW);
        }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(lx + dx, ly + dy, EARTH);
        if (lit) raw(lx, ly, anim && (tick % 5 === 0) ? CLAY : SAFFRON); else put(lx, ly, EARTHL);
      }
    }
    // fireflies
    for (const f of flies) {
      if (f.th > fireF) continue;
      const fx = Math.round(f.x + (anim ? Math.sin(t / 1700 + f.ph) * 3 : 0)), fyy = gy + Math.round(f.y + (anim ? Math.cos(t / 1300 + f.ph * 1.3) * 2 : 0) - camY);
      if (fyy < gy || fyy > H) continue;
      const on = anim ? Math.sin(t / 430 + f.ph * 5) > -0.1 : f.ph > 1.2;
      if (!on) continue;
      raw(fx, fyy, SAFFRON);
      raw(fx - 1, fyy, GLOW); raw(fx + 1, fyy, GLOW); raw(fx, fyy - 1, GLOW); raw(fx, fyy + 1, GLOW);
    }
    ctx.putImageData(img, 0, 0);
  };

  /* ------------------------------------------------------------------ motion state, visibility, scheduling */
  const mqRM = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const isStill = () => !!mqRM.matches || doc.body.classList.contains('still-frames') || field.dataset.motion === 'off';
  let raf = 0, dirty = true, lastDraw = 0, lastScroll = -1, lastSeg = -2, wasStill = null;

  const skyBg = () => q('#sky .sky-bg');
  const isActive = () => {
    if (doc.hidden) return false;
    const vh = win.innerHeight;
    if (doc.getElementById('outside-world').getBoundingClientRect().top >= vh) return false;
    const s = skyBg();
    if (s) { const r = s.getBoundingClientRect(); if (r.top <= 1 && r.bottom >= vh - 1) return false; }
    return true;
  };
  const schedule = () => { if (!raf) raf = win.requestAnimationFrame(frame); };

  function frame(now) {
    raf = 0;
    if (!ready || doc.hidden) return;
    const still = isStill();
    if (wasStill !== still) { wasStill = still; dirty = true; lastSeg = -2; }
    if (!isActive()) return;
    const sy = win.scrollY || 0;
    if (still) {
      readAnchors();
      const vh = win.innerHeight, yc = sy + vh / 2, seg = segmentAt(yc);
      if (dirty || seg !== lastSeg) {
        const a = anchors, mid = a.length > seg + 1 ? (a[seg][0] + a[seg + 1][0]) / 2 : yc;
        draw(0, false, mid - vh / 2);
        lastSeg = seg; dirty = false;
      }
      return;
    }
    if (dirty || sy !== lastScroll || now - lastDraw >= 83) {
      draw(now, true, sy);
      lastDraw = now; lastScroll = sy; dirty = false;
    }
    schedule();
  }

  const wake = () => { dirty = true; schedule(); };
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', () => {
    clearTimeout(rebuildT);
    rebuildT = setTimeout(() => {
      const vw = win.innerWidth, vh = win.innerHeight;
      if (ready && Math.abs(vw - (canvas.__vw || 0)) < 2 && Math.abs(vh - (canvas.__vh || 0)) < vh * 0.2) { wake(); return; }
      canvas.__vw = vw; canvas.__vh = vh;
      layout(); wake();
    }, 160);
  });
  doc.addEventListener('visibilitychange', schedule);
  if (mqRM.addEventListener) mqRM.addEventListener('change', wake); else if (mqRM.addListener) mqRM.addListener(wake);
  new MutationObserver(wake).observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(wake).observe(field, { attributes: true, attributeFilter: ['data-motion'] });
  if (win.ResizeObserver) { let hh = 0; new win.ResizeObserver(() => { const h = doc.documentElement.scrollHeight; if (Math.abs(h - hh) > 40) { hh = h; wake(); } }).observe(doc.body); }

  /* ------------------------------------------------------------------ start */
  const start = () => {
    const world = doc.getElementById('outside-world');
    (world || doc.body).insertBefore(canvas, (world || doc.body).firstChild);
    canvas.__vw = win.innerWidth; canvas.__vh = win.innerHeight;
    layout();
    ready = true;
    wasStill = isStill();
    draw(wasStill ? 0 : performance.now(), !wasStill, win.scrollY || 0);
    root.classList.add('pb-on');
    schedule();
  };
  if (doc.readyState === 'complete') setTimeout(start, 0);
  else win.addEventListener('load', () => setTimeout(start, 0), { once: true });
})();
