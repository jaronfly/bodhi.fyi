/* Bodhi · the pixel journey · pixel-journey.js
   One world behind everything after the film, drawn by one camera that moves as you read.
   It keeps the function of the cloud session's WebGL journey (a director: every parameter is a pure function of
   where you are in the story) and redraws it in the page's pixel language: a palette, Bayer dither, whole pixels.

   The camera travels vertically through a single world, so the sections are places, not slides:
     the seed ....... underground, a cut face of soil strata; one saffron seed glows
     roots .......... roots grow down from it and light up; a sprout breaks the soil line
     partial view ... an iris opens on the leaf: a field of cells, seen a little at a time (Caves of Qud)
     the tree ....... the surface; the tree grows through spring, summer, autumn, winter; birds, a deer, rain, snow
     sky ............ golden hour, sunset, dusk, night; the moon, stars, a little aurora
     ancestors ...... the camera rises into the night: one star per real commit, in a golden-angle spiral
     the orchard .... back down at sunset, to the same tree, now bearing one glowing fruit; the dog has found it
   Motion follows the page's switches (reduced motion, Stillness, data-motion="off"): then every place is one still.
   No storage, no network, no globals besides window.BodhiPixelJourney (state for tests). */
(() => {
  'use strict';
  const doc = document, win = window, root = doc.documentElement;
  if (!win.requestAnimationFrame || !doc.body) return;

  /* ------------------------------------------------------------------ palette (brand ten + muted extras) */
  const HEX = [
    '#0F1814', '#17231B', '#1F2C24', '#2E3B33', '#255039', '#2E6B45', '#8BCB8B', '#8A968D', '#B8C2BA', '#F2EEE4',
    '#E8982A', '#D9674F', '#19352D', '#355749', '#637C60', '#A5B58A', '#655263', '#9C6971', '#C6856C', '#DFA075',
    '#E9BB82', '#38344A', '#6E4F4C', '#3A2E27', '#5B4638', '#2A211C', '#4A4A44', '#36606F', '#A86F85', '#B5683A',
    '#C99A4A', '#22404F'
  ];
  const [INK, SOIL, UNDER, MOSS, CDK, CANOPY, SPROUT, LICHEN, SAGE, BONE, SAFF, CLAY, D0, D1, D2, D3, S0, S1, S2, S3,
    S4, DUSK, GLOW, EARTH, EARTHL, EARTHD, ROCK, WATER, ROSE, RUST, GOLD, DEEPW] = HEX.map((_, i) => i);
  const U32 = HEX.map((h) => (0xff000000 | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0);
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  /* ------------------------------------------------------------------ helpers */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sat = (v) => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => sm(sat((x - a) / (b - a)));
  const hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  };
  const vnoise = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, 0, s), hash(i + 1, 0, s), u); };
  // eased piecewise track over the canonical position c (holds at each knot), as in the WebGL director
  const track = (knots) => (c) => {
    if (c <= knots[0][0]) return knots[0][1];
    for (let i = 1; i < knots.length; i++) if (c <= knots[i][0]) {
      const [c0, v0] = knots[i - 1], [c1, v1] = knots[i];
      return v0 + (v1 - v0) * sm((c - c0) / (c1 - c0));
    }
    return knots[knots.length - 1][1];
  };

  /* ------------------------------------------------------------------ the story clock
     Each lower section is a place; c = its index + progress through it. */
  const PLACES = ['the-seed', 'roots', 'partial-view', 'tree', 'the-practice', 'the-meeting', 'influences', 'sky', 'ancestors', 'similar-trees', 'the-crew', 'afterward'];
  // camera altitude in screen heights (negative = underground, 0 = ground line at the horizon line)
  const T = {
    alt:    track([[0, -0.78], [0.6, -0.7], [1.0, -0.55], [1.9, -0.32], [2.2, -0.05], [3.0, 0.0], [6.9, 0.0], [7.4, 0.25], [7.95, 0.55], [8.4, 2.4], [8.95, 2.4], [9.3, 0.0], [12, 0.0]]),
    tod:    track([[0, 0.2], [2.6, 0.4], [3.0, 1.0], [5.6, 1.4], [6.6, 1.8], [7.15, 2.2], [7.5, 3.0], [7.85, 4.0], [8.1, 5.0], [8.95, 5.0], [9.25, 2.6], [10.2, 3.0], [11.2, 3.6], [12, 3.9]]),
    season: track([[0, 0.0], [3.0, 0.0], [3.9, 1.0], [4.9, 1.6], [5.9, 2.3], [6.6, 3.2], [7.0, 3.6], [7.6, 1.4], [9.0, 1.4], [9.2, 1.9], [12, 1.9]]),
    growth: track([[0, 0], [1.4, 0], [2.0, 0.08], [3.0, 0.3], [4.0, 0.62], [5.5, 0.92], [6.5, 1.0], [12, 1.0]]),
    roots:  track([[0, 0.02], [0.5, 0.06], [1.0, 0.25], [1.85, 1.0], [12, 1.0]]),
    rootLit:track([[0, 0], [1.2, 0], [1.9, 1], [2.4, 0.4], [12, 0.25]]),
    iris:   track([[0, 0], [1.75, 0], [2.15, 1], [2.75, 1], [3.05, 0]]),
    zoom:   track([[0, 0], [1.8, 0], [2.5, 1], [2.8, 1.2]]),
    rain:   track([[0, 0], [6.0, 0], [6.35, 1], [6.75, 0.8], [7.05, 0]]),
    snow:   track([[0, 0], [6.85, 0], [7.0, 0.9], [7.3, 0]]),
    aurora: track([[0, 0], [7.9, 0], [8.15, 1], [8.8, 0.6], [9.1, 0]]),
    spiral: track([[0, 0], [8.1, 0], [8.55, 1], [8.95, 1], [9.2, 0]]),
    fruit:  track([[0, 0], [9.1, 0], [9.5, 1]]),
    dog:    track([[0, 0], [9.15, 0], [9.45, 1]]),
  };

  /* ------------------------------------------------------------------ canvas */
  const canvas = doc.createElement('canvas');
  canvas.className = 'pj-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const world = doc.getElementById('outside-world');
  (world || doc.body).insertBefore(canvas, (world || doc.body).firstChild);

  let W = 0, H = 0, img = null, buf = null, cssPer = 4;
  let stars = [], clouds = [], rootSegs = [], branches = [], leaves = [], cells = null, commits = [], hills = [];
  const SEED = { x: 0, d: 22 }; // seed position: x in px, depth below ground in px

  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = U32[c]; };
  const mix = (x, y, a, b, t) => put(x, y, BAY[((y & 3) << 2) | (x & 3)] < t ? b : a);
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const disk = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, c); };

  function layout() {
    const vw = Math.max(320, win.innerWidth || 0), vh = Math.max(320, win.innerHeight || 0), dpr = win.devicePixelRatio || 1;
    const sCss = clamp(Math.round(vw / 340), 2, 6), sDev = Math.max(1, Math.round(sCss * dpr));
    cssPer = sDev / dpr;
    W = Math.ceil((vw * dpr) / sDev); H = Math.ceil((vh * dpr) / sDev);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * cssPer + 'px'; canvas.style.height = H * cssPer + 'px';
    img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer);
    build();
  }

  /* ------------------------------------------------------------------ the world, built once per size */
  function build() {
    SEED.x = Math.round(W * (W > H ? 0.62 : 0.5));
    stars = Array.from({ length: 160 }, (_, i) => ({ x: hash(i, 1, 7), y: hash(i, 2, 7), b: hash(i, 3, 7), ph: hash(i, 4, 7) * 30 }));
    clouds = Array.from({ length: 7 }, (_, i) => ({ x: hash(i, 1, 9), y: 0.08 + hash(i, 2, 9) * 0.32, w: 18 + hash(i, 3, 9) * 34, v: 0.6 + hash(i, 4, 9) }));
    hills = [0, 1, 2].map((k) => Array.from({ length: W + 1 }, (_, x) => {
      const n = vnoise(x / (60 - k * 14), 30 + k) * 0.7 + vnoise(x / (18 - k * 3), 40 + k) * 0.3;
      return Math.round((10 - k * 3) + n * (14 - k * 3));
    }));
    // roots: stochastic branching with gravitropism, revealed by arc length
    rootSegs = [];
    const grow = (x, y, ang, len, depth, s0) => {
      let px = x, py = y, s = s0;
      const steps = Math.round(len);
      for (let i = 0; i < steps; i++) {
        ang += (hash(i, depth, s0 * 7 + 3) - 0.5) * 0.5; ang = lerp(ang, Math.PI / 2, 0.05);
        const nx = px + Math.cos(ang), ny = py + Math.sin(ang);
        rootSegs.push({ x: nx, y: ny, s: s / 160, d: depth });
        px = nx; py = ny; s++;
        if (depth < 3 && i > 4 && hash(i, depth, s0 + 11) < 0.07) grow(px, py, ang + (hash(i, 5, s0) < 0.5 ? -1 : 1) * (0.7 + hash(i, 6, s0) * 0.6), len * 0.55, depth + 1, s);
      }
    };
    grow(0, 0, Math.PI / 2, 46, 0, 0);
    grow(0, 2, Math.PI * 0.82, 26, 1, 20);
    grow(0, 2, Math.PI * 0.2, 28, 1, 22);
    // the tree: branches as segments (built at full size, scaled by growth)
    branches = []; leaves = [];
    const limb = (x, y, ang, len, w, depth) => {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      branches.push({ x, y, ex, ey, w, depth });
      if (depth >= 5) { for (let k = 0; k < 7; k++) leaves.push({ x: ex + (hash(k, depth, x * 13) - 0.5) * 14, y: ey + (hash(k, 9, y * 7) - 0.5) * 10, r: 2 + (hash(k, 2, ex) * 3) | 0, s: hash(k, 3, ey) }); return; }
      const n = depth < 2 ? 2 : 3;
      for (let k = 0; k < n; k++) limb(ex, ey, ang + (k - (n - 1) / 2) * (0.55 + hash(k, depth, len) * 0.25) + (hash(depth, k, 3) - 0.5) * 0.2, len * (0.7 + hash(k, depth, 9) * 0.12), w * 0.66, depth + 1);
    };
    limb(0, 0, -Math.PI / 2, 15, 4, 0);
    // the leaf's cells, a Voronoi field cached once (walls, interior, chloroplasts)
    const CW = 160, CH = 120; cells = { w: CW, h: CH, px: new Uint8Array(CW * CH) };
    const sites = Array.from({ length: 70 }, (_, i) => [hash(i, 1, 51) * CW, hash(i, 2, 51) * CH]);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      let d1 = 1e9, d2 = 1e9, id = 0;
      for (let i = 0; i < sites.length; i++) {
        let dx = Math.abs(x - sites[i][0]); dx = Math.min(dx, CW - dx);
        let dy = Math.abs(y - sites[i][1]); dy = Math.min(dy, CH - dy);
        const d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      let c = CANOPY;
      if (edge < 1.1) c = SPROUT; else if (edge < 2.2) c = D2;
      else if (hash(x >> 1, y >> 1, 61 + id) < 0.12) c = D3;
      else if (d1 < 4 && id % 9 === 0) c = BONE;
      cells.px[y * CW + x] = c;
    }
    // commits for the ancestors' spiral: one per real commit when the page carries the data
    const A = win.BODHI_ANCESTRY;
    const n = A && A.kinds ? A.kinds.length : 987;
    const KIND = { b: SPROUT, f: CLAY, w: BONE, o: SAGE, a: LICHEN };
    commits = Array.from({ length: n }, (_, i) => ({ r: Math.sqrt(i / n), a: i * 2.39996, c: A && A.kinds ? KIND[A.kinds[i]] || SAGE : (i % 5 === 0 ? SPROUT : SAGE) }));
  }

  /* ------------------------------------------------------------------ sky: authored per time of day, dithered between */
  // tod: 0 predawn · 1 day · 2 golden hour · 3 sunset · 4 dusk · 5 night. Five stops, horizon to zenith.
  const SKY = [
    [DUSK, MOSS, UNDER, SOIL, INK],
    [D3, D2, D2, D1, D0],
    [S4, S3, D2, D1, D0],
    [S4, S3, S2, S1, S0],
    [S1, GLOW, DUSK, SOIL, INK],
    [MOSS, UNDER, SOIL, INK, INK],
  ];
  // the land's three grades of light (far hill, near hill, ground) per time of day
  const LAND = [
    [UNDER, SOIL, UNDER], [D1, CDK, CDK], [S0, GLOW, EARTHL], [S0, GLOW, EARTH], [DUSK, SOIL, UNDER], [SOIL, INK, SOIL],
  ];
  function skyColor(tod, f, x, y) {
    const i = clamp(Math.floor(tod), 0, 4), k = tod - i;
    const pick = (row) => {
      const p = clamp(f, 0, 0.999) * 4, j = Math.floor(p), t = p - j;
      return BAY[((y & 3) << 2) | (x & 3)] < t ? row[j + 1] : row[j];
    };
    const a = pick(SKY[i]), b = pick(SKY[i + 1]);
    return BAY[(((y + 1) & 3) << 2) | ((x + 2) & 3)] < k ? b : a;
  }
  const landColor = (tod, layer) => LAND[clamp(Math.round(tod), 0, 5)][layer];

  /* ------------------------------------------------------------------ one frame */
  const S = { c: 0 };
  function draw(c, t, still) {
    for (const k in T) S[k] = T[k](c);
    S.c = c;
    const gy = Math.round(H * (0.66 + S.alt)); // ground line on screen
    const night = sstep(3.6, 4.8, S.tod), tod = S.tod;
    const skySpan = H * 0.66;

    // sky and stars
    for (let y = 0; y < Math.min(gy, H); y++) {
      const f = clamp((gy - y) / skySpan, 0, 1);
      for (let x = 0; x < W; x++) buf[y * W + x] = U32[skyColor(tod, f, x, y)];
    }
    const starA = Math.max(night, sstep(0.6, 1.8, S.alt));
    if (starA > 0.02) for (const s of stars) {
      const sy = Math.round(s.y * (gy - 4) - (S.alt > 0.5 ? (S.alt - 0.5) * H * 0.4 * (s.b + 0.3) : 0) % H);
      const yy = ((sy % H) + H) % H;
      if (yy >= gy - 2) continue;
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 1.7 + s.ph);
      if (s.b * tw > 1 - starA) put(s.x * W, yy, s.b > 0.85 ? BONE : s.b > 0.6 ? SAGE : LICHEN);
    }
    // sun and moon
    const sunUp = 1 - sstep(2.8, 3.6, tod);
    if (sunUp > 0.02 && tod >= 0.6) {
      const sx = Math.round(W * 0.22), sy = Math.round(gy - skySpan * lerp(0.75, 0.04, sstep(1.2, 3.4, tod)));
      if (sy < gy + 4) { disk(sx, sy, Math.max(4, Math.round(W / 46)), tod > 2.2 ? S4 : BONE); }
    }
    const moonA = sstep(3.9, 4.8, tod) * (1 - sstep(8.95, 9.2, c));
    if (moonA > 0.02) {
      const mx = Math.round(W * 0.74), my = Math.round(gy - skySpan * lerp(0.15, 0.62, sstep(7.8, 8.4, c))), mr = Math.max(5, Math.round(W / 34));
      for (let y = -mr - 4; y <= mr + 4; y++) for (let x = -mr - 4; x <= mr + 4; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= mr) put(mx + x, my + y, hash(x + 9, y + 9, 3) < 0.06 && d < mr - 1 ? SAGE : BONE);
        else if (d <= mr + 4 && my + y < gy) mix(mx + x, my + y, buf[(my + y) * W + mx + x] === U32[INK] ? INK : SOIL, MOSS, (1 - (d - mr) / 4) * 0.6 * moonA);
      }
    }
    // aurora: curtains of sprout and canopy, folded by noise
    if (S.aurora > 0.02) for (let x = 0; x < W; x++) {
      const base = gy - skySpan * (0.45 + 0.2 * vnoise(x / 40 + (still ? 0 : t * 0.05), 71));
      const len = skySpan * (0.12 + 0.18 * vnoise(x / 25, 72)) * S.aurora;
      for (let y = Math.max(0, Math.round(base - len)); y < Math.min(gy - 6, Math.round(base)); y++) {
        const k = 1 - (base - y) / len;
        mix(x, y, buf[y * W + x] === U32[INK] ? INK : SOIL, k > 0.7 ? SPROUT : CANOPY, k * 0.55 * S.aurora);
      }
    }
    // the ancestors: one star per commit in a golden-angle spiral, centred high in the sky
    if (S.spiral > 0.02) {
      const cx = W * 0.5, cy = H * 0.42, R = Math.min(W, H) * 0.42;
      const show = Math.floor(commits.length * sstep(8.1, 8.6, c));
      for (let i = 0; i < show; i++) {
        const p = commits[i];
        put(cx + Math.cos(p.a) * p.r * R, cy + Math.sin(p.a) * p.r * R * 0.9, i === commits.length - 1 ? SAFF : p.c);
      }
    }
    // clouds: flat pixel shapes, lit by the hour
    if (S.alt < 1.2) for (const cl of clouds) {
      const x0 = Math.round(((cl.x * (W + 80) + (still ? 0 : t * cl.v * 2)) % (W + 80)) - 40), y0 = Math.round(gy - skySpan * (1 - cl.y));
      const col = tod < 1.5 ? D2 : tod < 2.6 ? S3 : tod < 3.6 ? S2 : tod < 4.5 ? DUSK : UNDER;
      for (let i = 0; i < cl.w; i++) {
        const hgt = Math.round(3 + 3 * Math.sin((i / cl.w) * Math.PI) + vnoise(i / 5 + cl.x * 9, 81) * 3);
        for (let j = 0; j < hgt; j++) if (y0 - j < gy - 8) put(x0 + i, y0 - j, j === hgt - 1 && tod > 2 && tod < 3.6 ? S4 : col);
      }
    }

    // hills and the ground line
    if (gy - 30 < H) for (let k = 0; k < 3; k++) {
      const col = landColor(tod, k === 2 ? 1 : 0), off = k === 0 ? 0.06 : 0.12;
      for (let x = 0; x < W; x++) {
        const top = gy - Math.round(hills[k][x] * (k === 2 ? 0.5 : 1)) - (k === 0 ? 6 : 0);
        for (let y = Math.max(0, top); y < Math.min(H, gy); y++) put(x, y, k === 2 ? col : (y < top + 1 ? landColor(tod, 1) : col));
      }
      void off;
    }
    // underground: strata, pebbles, the seed and its roots
    for (let y = Math.max(0, gy); y < H; y++) {
      const d = y - gy;
      for (let x = 0; x < W; x++) {
        let col = d < 2 ? landColor(tod, 2) : d < 9 ? EARTHL : d < 40 ? EARTH : d < 90 ? EARTHD : SOIL;
        const band = vnoise(x / 30 + d / 9, 91);
        if (d >= 9 && d < 40 && band > 0.82) col = EARTHL;
        if (d >= 40 && band > 0.86) col = EARTH;
        if (d > 3 && hash(x >> 1, y >> 1, 93) < 0.012) col = d > 60 ? ROCK : LICHEN;
        if (d < 2 && hash(x, 0, 95) < 0.35) col = S.season > 2.9 && S.season < 3.8 ? BONE : CDK;
        buf[y * W + x] = U32[col];
      }
    }
    // grass tufts on the line
    for (let x = 0; x < W; x += 1) if (hash(x, 1, 97) < 0.25) {
      const h = 1 + ((hash(x, 2, 97) * 3) | 0), sway = still ? 0 : Math.round(Math.sin(t * 1.3 + x * 0.2) * 0.6);
      for (let j = 1; j <= h; j++) put(x + (j === h ? sway : 0), gy - j, S.season > 2.9 && S.season < 3.8 ? SAGE : night > 0.5 ? INK : CDK);
    }
    // roots, revealed by arc length; lit in a travelling pulse
    const sx = SEED.x, sy = gy + SEED.d;
    for (const r of rootSegs) {
      if (r.s > S.roots) continue;
      const lit = S.rootLit > 0 && Math.abs(r.s - ((t * 0.12) % 1)) < 0.06 * S.rootLit;
      put(sx + r.x, sy + r.y, lit ? SPROUT : r.d === 0 ? SAGE : LICHEN);
    }
    // the seed: one saffron pixel, a warm halo in the soil
    if (sy < H + 4 && sy > -4 && S.growth < 0.2) {
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d > 1 && d < 5.5) mix(sx + x, sy + y, EARTH, GLOW, (1 - d / 5.5) * 0.7); }
      put(sx, sy, SAFF); put(sx + 1, sy, SAFF);
    }

    // the tree (at the seed's spot), grown and dressed by the season
    const g = S.growth;
    if (g > 0.01) {
      const scale = lerp(0.12, 1, g) * Math.min(1.25, H / 260);
      const tx = sx, ty = gy;
      const season = S.season % 4; // 0 spring 1 summer 2 autumn 3 winter
      const wind = still ? 0 : Math.sin(t * 0.9) * 0.6;
      for (const b of branches) {
        if (b.depth > g * 6.5) continue;
        const sway = wind * (b.depth / 6);
        const x0 = tx + b.x * scale * 3.2 + sway * b.depth * 0.4, y0 = ty + b.y * scale * 3.2;
        const x1 = tx + b.ex * scale * 3.2 + sway * (b.depth + 1) * 0.4, y1 = ty + b.ey * scale * 3.2;
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        const wpx = Math.max(1, Math.round(b.w * scale * 1.4));
        for (let i = 0; i <= steps; i++) {
          const px = x0 + (x1 - x0) * (i / steps), py = y0 + (y1 - y0) * (i / steps);
          for (let k = 0; k < wpx; k++) put(px + k - (wpx >> 1), py, k === 0 && tod < 3.5 ? EARTHL : EARTH);
        }
      }
      if (season < 3 || season > 3.6) {
        const lc = season < 1 ? [CANOPY, SPROUT, ROSE] : season < 2 ? [CDK, CANOPY, SPROUT] : [RUST, GOLD, CLAY];
        const shade = night > 0.5 ? [INK, CDK, CDK] : tod > 2.6 && tod < 3.8 ? [S0, GLOW, lc[1]] : lc;
        const leafA = sstep(0.25, 0.7, g) * (season > 2.6 ? 1 - sstep(2.6, 3.0, season) : 1);
        for (const l of leaves) {
          if (l.s > leafA) continue;
          const lx = tx + l.x * scale * 3.2 + wind * 1.4, ly = ty + l.y * scale * 3.2;
          const r = Math.max(1, Math.round(l.r * scale * 1.3));
          for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) {
            const h = hash(Math.round(lx + x), Math.round(ly + y), 7);
            put(lx + x, ly + y, y < -r * 0.3 ? shade[2] === ROSE && h < 0.15 ? ROSE : shade[h < 0.3 ? 2 : 1] : shade[h < 0.5 ? 0 : 1]);
          }
        }
        // autumn: a few leaves falling
        if (season >= 2 && season < 3 && !still) for (let i = 0; i < 10; i++) {
          const fx = tx + (hash(i, 1, 33) - 0.5) * 60 * scale + Math.sin(t + i) * 3, fy = ty - 50 * scale + (((t * 9 + i * 17) % (60 * scale + 10)));
          put(fx, fy, i % 2 ? RUST : GOLD);
        }
      } else if (S.snow > 0 || season >= 3) {
        for (const l of leaves) if (l.s < 0.3) put(tx + l.x * scale * 3.2, ty + l.y * scale * 3.2 - 1, BONE); // snow resting on the limbs
      }
      // the one fruit, at the orchard
      if (S.fruit > 0.02) {
        const fx = tx + Math.round(10 * scale), fy = ty - Math.round(30 * scale);
        put(fx, fy, SAFF); put(fx + 1, fy, SAFF); put(fx, fy + 1, SAFF); put(fx + 1, fy + 1, GOLD); put(fx, fy - 1, CDK);
        if (!still) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 1.5 && d < 3.5 && hash(x, y, (t * 4) | 0) < 0.12 * S.fruit) put(fx + x, fy + y, GOLD); }
      }
    }

    // fauna and weather
    if (!still && S.alt < 0.6 && S.alt > -0.2) {
      // birds by day: little Vs that cross the sky
      if (tod > 0.8 && tod < 3.3) for (let i = 0; i < 4; i++) {
        const bx = ((t * (6 + i * 2) + i * 97) % (W + 40)) - 20, by = gy - skySpan * (0.45 + i * 0.08) + Math.sin(t * 2 + i) * 2;
        const flap = ((t * 6 + i) | 0) % 2;
        put(bx, by, INK); put(bx - 1, by - 1 + flap, INK); put(bx + 1, by - 1 + flap, INK);
      }
      // a deer at the treeline, autumn into winter
      if (c > 4.2 && c < 6.2) {
        const dx = Math.round(W * 0.16 + Math.sin(t * 0.1) * 4), dy = gy - 1, col = tod < 2.6 ? D0 : INK;
        rect(dx, dy - 4, 6, 2, col); put(dx, dy - 2, col); put(dx + 5, dy - 2, col); put(dx, dy - 1, col); put(dx + 5, dy - 1, col);
        put(dx + 6, dy - 5, col); put(dx + 6, dy - 6, col); put(dx + 7, dy - 6, col); put(dx + 6, dy - 8, col); put(dx + 7, dy - 9, col);
      }
      // fireflies at dusk near the ground
      if (tod > 3.2 && tod < 4.9) for (let i = 0; i < 14; i++) {
        const fx = W * hash(i, 1, 41) + Math.sin(t * 0.7 + i) * 6, fy = gy - 3 - hash(i, 2, 41) * 18 + Math.cos(t * 0.9 + i) * 2;
        if (Math.sin(t * 3 + i * 7) > 0.4) put(fx, fy, i === 0 ? SAFF : SPROUT);
      }
      // rain and snow
      if (S.rain > 0.02) for (let i = 0; i < 220 * S.rain; i++) {
        const rx = (hash(i, 1, 5) * W + t * 40) % W, ry = (hash(i, 2, 5) * H + t * 160) % H;
        if (ry < gy) { put(rx, ry, LICHEN); put(rx - 1, ry - 1, D3); }
      }
      if (S.snow > 0.02) for (let i = 0; i < 160 * S.snow; i++) {
        const rx = (hash(i, 1, 6) * W + Math.sin(t + i) * 3) % W, ry = (hash(i, 2, 6) * H + t * 14) % H;
        if (ry < gy) put(rx, ry, BONE);
      }
    }

    // the dog, at the orchard: a wag, a jump at the fruit, a bark
    if (S.dog > 0.02) drawDog(sx - Math.round(26 * Math.min(1.25, H / 260)), gy, t, still);

    // the leaf: an iris opens on its cells (seen a little at a time)
    if (S.iris > 0.01) {
      const R = Math.round(Math.min(W, H) * 0.34 * S.iris), cx = W >> 1, cy = Math.round(H * 0.5);
      const z = 1 + Math.round(S.zoom * 2), ox = Math.round((still ? 0 : t * 3) + S.zoom * 40), oy = Math.round(S.zoom * 25);
      for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) {
        const d = Math.hypot(x, y);
        if (d <= R) {
          const u = (((Math.floor((x + ox) / z) % cells.w) + cells.w) % cells.w), v = (((Math.floor((y + oy) / z) % cells.h) + cells.h) % cells.h);
          put(cx + x, cy + y, d > R - 1 ? SPROUT : cells.px[v * cells.w + u]);
        } else if (d <= R + 2) put(cx + x, cy + y, INK);
      }
      // the world outside the iris dims to night
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > R + 2 && BAY[((y & 3) << 2) | (x & 3)] < 0.7 * S.iris) buf[y * W + x] = U32[INK];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // a readable dog: side view, white-tipped tail, ears, muzzle; wags; jumps toward the fruit
  const DOG = [
    '......oo......',
    '.....oooo.....',
    '....ooKooo.ww.',
    '...oooooooowww',
    '.ooooooooooo..',
    'oowoooooooo...',
    'woo.oo..oo....',
    '....oo..oo....',
  ];
  let hello = 0;
  function drawDog(x, gy, t, still) {
    const jump = still ? 0 : Math.max(0, Math.sin(t * 3.2)) * (hello > 0 ? 6 : 3);
    const wag = still ? 0 : Math.round(Math.sin(t * 14));
    const rows = DOG.length, y0 = gy - rows - Math.round(jump);
    for (let j = 0; j < rows; j++) for (let i = 0; i < DOG[j].length; i++) {
      const ch = DOG[j][i];
      if (ch === '.') continue;
      // the tail (left end) wags; the dog faces right, toward the tree
      const tail = i <= 2 && j >= 4;
      const px = x + (13 - i), py = y0 + j + (tail ? wag : 0);
      put(px, py, ch === 'K' ? INK : ch === 'w' ? BONE : RUST);
    }
    // bark: little marks in front of the muzzle while jumping
    if (!still && (jump > 2 || hello > 0) && ((t * 4) | 0) % 2) { put(x + 15, y0 + 1, BONE); put(x + 16, y0, BONE); put(x + 15, y0 - 1, BONE); }
  }

  /* ------------------------------------------------------------------ the clock: where are we in the story */
  let els = [];
  const collect = () => { els = PLACES.map((id) => doc.getElementById(id)).filter(Boolean); };
  function clockC() {
    if (!els.length) return { c: 0, on: false };
    const line = win.innerHeight * 0.5;
    const first = els[0].getBoundingClientRect();
    const on = first.top < win.innerHeight * 0.85;
    let i = 0, r = first;
    for (let k = 0; k < els.length; k++) { const b = els[k].getBoundingClientRect(); if (k === 0 || b.top <= line) { i = k; r = b; } }
    const p = sat((line - r.top) / Math.max(1, r.height));
    return { c: PLACES.indexOf(els[i].id) + p, on };
  }

  /* ------------------------------------------------------------------ loop */
  const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionOff = () => reduced.matches || doc.body.classList.contains('still-frames') || root.dataset.motion === 'off';
  let cS = null, target = 0, visible = false, raf = 0, last = 0, time = 0, lastDraw = -1, lastStill = '';
  const api = (win.BodhiPixelJourney = { c: 0, on: false, frames: 0 });

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    const st = clockC(); target = st.c;
    if (st.on !== visible) { visible = st.on; root.classList.toggle('pj-on', visible); }
    api.on = visible;
    if (!visible || doc.hidden) { last = 0; return; }
    const still = motionOff();
    if (cS === null || Math.abs(target - cS) > 1.5) cS = target;
    cS += (target - cS) * (1 - Math.exp(-dt * 6));
    if (still) {
      const key = Math.round(target * 4) + '|' + W + 'x' + H;
      if (key !== lastStill) { lastStill = key; draw(Math.round(target * 4) / 4, 20, true); api.frames++; }
    } else {
      time += dt;
      // ambient life at ~15 fps, camera moves at full rate
      if (Math.abs(cS - lastDraw) > 0.0005 || now - api.t > 66) { draw(cS, time, false); lastDraw = cS; api.t = now; api.frames++; }
    }
    api.c = cS;
    raf = requestAnimationFrame(frame);
  }
  api.t = 0;
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  let rz = 0;
  win.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); lastStill = ''; wake(); }, 150); }, { passive: true });
  win.addEventListener('scroll', wake, { passive: true });
  doc.addEventListener('visibilitychange', wake);
  if (reduced.addEventListener) reduced.addEventListener('change', () => { lastStill = ''; wake(); });
  doc.getElementById('greet-dog')?.addEventListener('click', () => { hello = 2.4; setTimeout(() => { hello = 0; }, 2400); wake(); });

  collect(); layout(); wake();
  if (doc.readyState !== 'complete') win.addEventListener('load', () => { collect(); wake(); }, { once: true });
})();
