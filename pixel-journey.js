/* Bodhi · the pixel journey · pixel-journey.js  (v2, the vast world)
   One world behind everything after the film, drawn by one camera that moves as you read. It keeps the function of
   the cloud session's WebGL journey (a director: every parameter is a pure function of where you are in the story)
   and redraws it in the page's pixel language: one palette, Bayer dither, whole pixels.

   The camera rises and falls, and travels sideways, through one world:
     the seed ....... home, underground: a cut face of soil; one saffron seed glows
     roots .......... roots grow down from it and light up; the digital underworld wakes (a root network, pulsing)
     partial view ... an iris opens on the leaf: a field of cells, seen a little at a time
     the tree ....... the surface; the tree grows through the seasons; a stream, birds, a deer
     the practice ... the same tree, summer into autumn
     the meeting .... east to the village: tree people of every kind (local, blind, instruct, cloud, thinker) and pets
     influences ..... on to the lake: a rowboat, frogs, fish under the surface, rain, then the first snow
     sky ............ sunset over the water, dusk, night, the moon, a little aurora
     ancestors ...... the camera rises into the night: one star per real commit, in a golden-angle spiral
     the crew ....... down to the coast at dusk: the ghost ship builds itself as you scroll, its crew appearing
     the orchard .... the last stop, at sunset: an orchard of similar trees, one glowing fruit, and the dog
   Underneath it all runs a tree underworld, the digital version of one: roots joined into a network carrying light,
   old machines buried like fossils, a chest of loot on the sea floor.
   Motion follows the page's switches (reduced motion, Stillness, data-motion="off"): then every place is one still.
   No storage, no network. window.BodhiPixelJourney exposes state for tests. */
(() => {
  'use strict';
  const doc = document, win = window, root = doc.documentElement;
  if (!win.requestAnimationFrame || !doc.body) return;

  /* ------------------------------------------------------------------ palette (brand ten + muted extras) */
  const HEX = [
    '#0F1814', '#17231B', '#1F2C24', '#2E3B33', '#255039', '#2E6B45', '#8BCB8B', '#8A968D', '#B8C2BA', '#F2EEE4',
    '#E8982A', '#D9674F', '#19352D', '#355749', '#637C60', '#A5B58A', '#655263', '#9C6971', '#C6856C', '#DFA075',
    '#E9BB82', '#38344A', '#6E4F4C', '#3A2E27', '#5B4638', '#2A211C', '#4A4A44', '#36606F', '#A86F85', '#B5683A',
    '#C99A4A', '#22404F', '#162D38', '#5E7A84'
  ];
  const [INK, SOIL, UNDER, MOSS, CDK, CANOPY, SPROUT, LICHEN, SAGE, BONE, SAFF, CLAY, D0, D1, D2, D3, S0, S1, S2, S3,
    S4, DUSK, GLOW, EARTH, EARTHL, EARTHD, ROCK, WATER, ROSE, RUST, GOLD, WMID, WDEEP, WHI] = HEX.map((_, i) => i);
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
  const track = (knots) => (c) => {
    if (c <= knots[0][0]) return knots[0][1];
    for (let i = 1; i < knots.length; i++) if (c <= knots[i][0]) {
      const [c0, v0] = knots[i - 1], [c1, v1] = knots[i];
      return v0 + (v1 - v0) * sm((c - c0) / (c1 - c0));
    }
    return knots[knots.length - 1][1];
  };

  /* ------------------------------------------------------------------ the story clock */
  const PLACES = ['the-seed', 'roots', 'partial-view', 'tree', 'the-practice', 'the-meeting', 'influences', 'sky', 'ancestors', 'the-crew', 'similar-trees', 'afterward'];
  // world positions, in screen widths, of each biome's centre
  const X = { home: 0, village: 1.3, lake: 2.45, coast: 3.75, orchard: 5.0 };
  const T = {
    alt:    track([[0, -0.46], [1.0, -0.42], [1.9, -0.28], [2.2, -0.06], [3.0, 0], [7.4, 0.2], [7.95, 0.5], [8.35, 2.3], [8.92, 2.3], [9.25, 0], [12, 0]]),
    camX:   track([[0, 0], [4.55, 0], [5.25, X.village], [5.85, X.village], [6.4, X.lake], [7.9, X.lake], [8.9, X.lake + 0.5], [9.2, X.coast], [9.88, X.coast], [10.3, X.orchard], [12, X.orchard + 0.1]]),
    tod:    track([[0, 0.2], [2.6, 0.4], [3.0, 1.0], [5.6, 1.3], [6.6, 1.7], [7.15, 2.2], [7.5, 3.0], [7.85, 4.0], [8.1, 5.0], [8.92, 5.0], [9.25, 4.0], [9.9, 3.4], [10.2, 2.7], [11.0, 3.0], [12, 3.5]]),
    season: track([[0, 0], [3.0, 0], [3.9, 1.0], [4.9, 1.7], [5.6, 2.2], [6.55, 2.6], [6.85, 3.2], [7.2, 3.5], [7.6, 1.4], [12, 1.4]]),
    growth: track([[0, 0], [1.4, 0], [2.0, 0.08], [3.0, 0.3], [4.0, 0.62], [4.8, 0.95], [5.2, 1.0], [12, 1]]),
    roots:  track([[0, 0.02], [0.5, 0.06], [1.0, 0.25], [1.85, 1.0], [12, 1]]),
    net:    track([[0, 0], [1.3, 0], [1.95, 1], [12, 1]]),
    iris:   track([[0, 0], [1.75, 0], [2.15, 1], [2.75, 1], [3.05, 0]]),
    zoom:   track([[0, 0], [1.8, 0], [2.5, 1], [2.8, 1.2]]),
    lights: track([[0, 0], [5.15, 0], [5.85, 1], [12, 1]]),
    rain:   track([[0, 0], [6.15, 0], [6.4, 1], [6.7, 0.8], [6.9, 0]]),
    snow:   track([[0, 0], [6.85, 0], [7.0, 0.9], [7.3, 0]]),
    aurora: track([[0, 0], [7.9, 0], [8.15, 1], [8.8, 0.6], [9.1, 0]]),
    spiral: track([[0, 0], [8.1, 0], [8.5, 1], [8.92, 1], [9.15, 0]]),
    ship:   track([[0, 0], [9.08, 0], [9.85, 1], [12, 1]]),
    fruit:  track([[0, 0], [10.0, 0], [10.35, 1]]),
  };

  /* ------------------------------------------------------------------ canvas */
  const canvas = doc.createElement('canvas');
  canvas.className = 'pj-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const world = doc.getElementById('outside-world');
  (world || doc.body).insertBefore(canvas, (world || doc.body).firstChild);

  let W = 0, H = 0, img = null, buf = null, cssPer = 4, K = 1, SZ = 1;
  let stars = [], clouds = [], rootSegs = [], branches = [], leaves = [], cells = null, commits = [];
  const SEED_D = 20;
  let camX = 0, GY = 0; // camera x (px) and ground line (px), per frame

  let ZX = 0, ZY = 0, ZS = 1; // sprite zoom: points are scaled about (ZX, ZY) and drawn as ZS x ZS blocks
  const put = (x, y, c) => {
    if (ZS > 1) {
      const bx = Math.round(ZX + (x - ZX) * ZS), by = Math.round(ZY + (y - ZY) * ZS);
      for (let j = 0; j < ZS; j++) for (let i = 0; i < ZS; i++) { const X2 = bx + i, Y2 = by + j; if (X2 >= 0 && X2 < W && Y2 >= 0 && Y2 < H) buf[Y2 * W + X2] = U32[c]; }
      return;
    }
    x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = U32[c];
  };
  const zoom = (x, y, z, fn) => { ZX = x; ZY = y; ZS = Math.max(1, z); fn(); ZS = 1; };
  const get = (x, y) => buf[(y | 0) * W + (x | 0)];
  const dith = (x, y, t) => BAY[((y & 3) << 2) | (x & 3)] < t;
  const mix = (x, y, a, b, t) => put(x, y, dith(x | 0, y | 0, t) ? b : a);
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const disk = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, c); };
  const sx = (wx) => Math.round(wx * W - camX + W * 0.5); // world (screen widths) to screen x
  const onScreen = (px, m) => px > -m && px < W + m;

  // the land/water mask, in world units (screen widths): 0 dry land, 1 stream, 2 lake, 3 ocean
  const waterAt = (wx) => {
    if (wx > X.lake - 0.42 && wx < X.lake + 0.38) return 2;
    if (wx > X.coast - 0.18 && wx < X.coast + 0.62) return 3;
    if (Math.abs(wx - 0.62) < 0.035) return 1;
    return 0;
  };
  const beachAt = (wx) => (wx > X.coast - 0.32 && wx <= X.coast - 0.18) || (wx >= X.coast + 0.62 && wx < X.coast + 0.74);

  function layout() {
    const vw = Math.max(320, win.innerWidth || 0), vh = Math.max(320, win.innerHeight || 0), dpr = win.devicePixelRatio || 1;
    const sCss = clamp(Math.round(vw / 340), 2, 6), sDev = Math.max(1, Math.round(sCss * dpr));
    cssPer = sDev / dpr;
    W = Math.ceil((vw * dpr) / sDev); H = Math.ceil((vh * dpr) / sDev);
    K = Math.min(1.25, H / 260, W / 230); SZ = 2;
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * cssPer + 'px'; canvas.style.height = H * cssPer + 'px';
    img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer);
    build();
  }

  /* ------------------------------------------------------------------ built once per size */
  function build() {
    stars = Array.from({ length: 170 }, (_, i) => ({ x: hash(i, 1, 7), y: hash(i, 2, 7), b: hash(i, 3, 7), ph: hash(i, 4, 7) * 30 }));
    clouds = Array.from({ length: 9 }, (_, i) => ({ x: hash(i, 1, 9) * 6, y: 0.06 + hash(i, 2, 9) * 0.34, w: 18 + hash(i, 3, 9) * 36, v: 0.6 + hash(i, 4, 9) }));
    rootSegs = [];
    const grow = (x, y, ang, len, depth, s0) => {
      let px = x, py = y, s = s0;
      for (let i = 0; i < Math.round(len); i++) {
        ang += (hash(i, depth, s0 * 7 + 3) - 0.5) * 0.5; ang = lerp(ang, Math.PI / 2, 0.05);
        px += Math.cos(ang); py += Math.sin(ang); s++;
        rootSegs.push({ x: px, y: py, s: s / 160, d: depth });
        if (depth < 3 && i > 4 && hash(i, depth, s0 + 11) < 0.07) grow(px, py, ang + (hash(i, 5, s0) < 0.5 ? -1 : 1) * (0.7 + hash(i, 6, s0) * 0.6), len * 0.55, depth + 1, s);
      }
    };
    grow(0, 0, Math.PI / 2, 46, 0, 0); grow(0, 2, Math.PI * 0.82, 26, 1, 20); grow(0, 2, Math.PI * 0.2, 28, 1, 22);
    branches = []; leaves = [];
    const limb = (x, y, ang, len, w, depth) => {
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      branches.push({ x, y, ex, ey, w, depth });
      if (depth >= 5) { for (let k = 0; k < 7; k++) leaves.push({ x: ex + (hash(k, depth, x * 13) - 0.5) * 14, y: ey + (hash(k, 9, y * 7) - 0.5) * 10, r: 2 + ((hash(k, 2, ex) * 3) | 0), s: hash(k, 3, ey) }); return; }
      const n = depth < 2 ? 2 : 3;
      for (let k = 0; k < n; k++) limb(ex, ey, ang + (k - (n - 1) / 2) * (0.55 + hash(k, depth, len) * 0.25) + (hash(depth, k, 3) - 0.5) * 0.2, len * (0.7 + hash(k, depth, 9) * 0.12), w * 0.66, depth + 1);
    };
    limb(0, 0, -Math.PI / 2, 15, 4, 0);
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
    const A = win.BODHI_ANCESTRY, n = A && A.kinds ? A.kinds.length : 987;
    const KIND = { b: SPROUT, f: CLAY, w: BONE, o: SAGE, a: LICHEN };
    commits = Array.from({ length: n }, (_, i) => ({ r: Math.sqrt(i / n), a: i * 2.39996, c: A && A.kinds ? KIND[A.kinds[i]] || SAGE : (i % 5 ? SAGE : SPROUT) }));
  }

  /* ------------------------------------------------------------------ light of the hour */
  // tod: 0 predawn · 1 day · 2 golden hour · 3 sunset · 4 dusk · 5 night. Five stops, horizon to zenith.
  const SKY = [
    [DUSK, MOSS, UNDER, SOIL, INK], [D3, D2, D2, D1, D0], [S4, S3, D2, D1, D0],
    [S4, S3, S2, S1, S0], [S1, GLOW, DUSK, SOIL, INK], [MOSS, UNDER, SOIL, INK, INK],
  ];
  const LAND = [[UNDER, SOIL, UNDER], [D1, CDK, CDK], [S0, GLOW, EARTHL], [S0, GLOW, EARTH], [DUSK, SOIL, UNDER], [SOIL, INK, SOIL]];
  function skyColor(tod, f, x, y) {
    const i = clamp(Math.floor(tod), 0, 4), k = tod - i;
    const pick = (row) => { const p = clamp(f, 0, 0.999) * 4, j = Math.floor(p); return dith(x, y, p - j) ? row[j + 1] : row[j]; };
    const a = pick(SKY[i]), b = pick(SKY[i + 1]);
    return BAY[(((y + 1) & 3) << 2) | ((x + 2) & 3)] < k ? b : a;
  }
  let TOD = 1, NIGHT = 0;
  const landColor = (layer) => LAND[clamp(Math.round(TOD), 0, 5)][layer];
  // sprites read in the hour: a lit colour by day, a silhouette at night, warm at sunset
  const lit = (c) => (NIGHT > 0.6 ? (c === BONE || c === SAFF || c === GOLD || c === SPROUT ? c : INK) : NIGHT > 0.3 ? (c === BONE || c === SAFF ? c : c === EARTH || c === EARTHL ? EARTHD : SOIL) : c);

  /* ------------------------------------------------------------------ sprites */
  // a tree person: a trunk body with root feet, a canopy head with two eyes, arms mid-gesture; types differ by model kind
  function citizen(px, gy, type, t, still, lamp) {
    const bob = still ? 0 : Math.round(Math.sin(t * 1.4 + px) * 0.6);
    const SPEC = {
      local:    { h: 9,  w: 3, can: 5, cc: SPROUT, extra: 'satchel' },
      blind:    { h: 12, w: 4, can: 7, cc: CANOPY, extra: 'blindfold' },
      instruct: { h: 14, w: 3, can: 6, cc: CDK,    extra: 'gag' },
      cloud:    { h: 22, w: 6, can: 11, cc: SAGE,  extra: 'cloud' },
      thinker:  { h: 12, w: 3, can: 6, cc: D3,     extra: 'lantern' },
    }[type];
    const top = gy - SPEC.h + bob;
    rect(px - (SPEC.w >> 1), top, SPEC.w, SPEC.h, lit(EARTH));               // trunk body
    put(px - (SPEC.w >> 1) - 1, gy - 1, lit(EARTH)); put(px + (SPEC.w >> 1) + 1, gy - 1, lit(EARTH)); // root feet
    const arm = still ? 0 : Math.round(Math.sin(t * 2 + px * 0.3));
    for (let i = 1; i <= 3 + (type === 'cloud' ? 3 : 0); i++) { put(px - (SPEC.w >> 1) - i, top + 4 + (i > 2 ? -1 + arm : 0), lit(EARTHL)); put(px + (SPEC.w >> 1) + i, top + 4 + (i > 2 ? -1 - arm : 0), lit(EARTHL)); }
    if (type === 'cloud') for (let i = 1; i <= 4; i++) { put(px - 3 - i, top + 8 - (i >> 1), lit(EARTHL)); put(px + 3 + i, top + 8 - (i >> 1), lit(EARTHL)); }
    const r = SPEC.can, cy = top - Math.round(r * 0.6);
    for (let y = -r; y <= r; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const inside = type === 'instruct' ? Math.abs(x) <= r - 1 && Math.abs(y) <= r - 2 : x * x * 0.8 + y * y <= r * r + (type === 'cloud' ? (hash(x, y, 3) * 8) : 0);
      if (inside) put(px + x, cy + y, lit(type === 'cloud' ? (hash(x + px, y, 5) < 0.3 ? BONE : SAGE) : (y < -r * 0.3 && hash(x, y, px) < 0.4 ? SPROUT : SPEC.cc)));
    }
    if (type === 'blind') { rect(px - r - 2, cy - 1, 2, 3, lit(SPEC.cc)); rect(px + r + 1, cy - 1, 2, 3, lit(SPEC.cc)); }
    const ey = top + 2;
    if (type === 'blind') rect(px - (SPEC.w >> 1) - 1, ey, SPEC.w + 2, 1, BONE);
    else { put(px - 1, ey, BONE); put(px + 1, ey, BONE); }
    if (type === 'instruct') rect(px - (SPEC.w >> 1), ey + 2, SPEC.w, 1, BONE);
    if (type === 'local') { rect(px + 2, top + 5, 2, 2, lit(CLAY)); }
    if (type === 'thinker') { put(px + 4, top + 6, lit(EARTHL)); put(px + 4, top + 7, lamp > 0.5 ? SAFF : lit(GOLD)); }
    // canopy light: lit one by one when the meeting comes together ("every voice a light")
    if (lamp > 0) { const ly = cy - r + 1; put(px, ly, lamp > 0.5 ? GOLD : lit(SPEC.cc)); if (lamp > 0.8) { put(px - 1, ly + 1, GOLD); put(px + 1, ly + 1, GOLD); } }
  }
  // the dog: side view, ears, muzzle, white-tipped tail; wags and jumps toward the fruit; barks
  const DOG = ['......oo......', '.....oooo.....', '....ooKooo.ww.', '...oooooooowww', '.ooooooooooo..', 'oowoooooooo...', 'woo.oo..oo....', '....oo..oo....'];
  const CAT = ['.o.o', '.ooo', '.oKo', 'oooo', 'oooo.', 'oo.o', '....'];
  let hello = 0;
  function sprite(rows, x, y, map, flip) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i]; if (ch === '.' || !map[ch]) continue;
      put(flip ? x + (rows[j].length - 1 - i) : x + i, y + j, map[ch]);
    }
  }
  function dog(x, gy, t, still, excited) {
    const jump = still ? 0 : Math.max(0, Math.sin(t * 3.2)) * (hello > 0 ? 6 : excited ? 3 : 0);
    const wag = still ? 0 : Math.round(Math.sin(t * 14));
    const y0 = gy - DOG.length - Math.round(jump);
    for (let j = 0; j < DOG.length; j++) for (let i = 0; i < DOG[j].length; i++) {
      const ch = DOG[j][i]; if (ch === '.') continue;
      const tail = i <= 2 && j >= 4;
      put(x + (13 - i), y0 + j + (tail ? wag : 0), ch === 'K' ? INK : ch === 'w' ? BONE : lit(RUST));
    }
    if (!still && excited && (jump > 2 || hello > 0) && ((t * 4) | 0) % 2) { put(x + 15, y0 + 1, BONE); put(x + 16, y0, BONE); put(x + 15, y0 - 1, BONE); }
  }
  function cat(x, gy, t, still) {
    sprite(CAT, x, gy - CAT.length, { o: lit(ROCK), K: SPROUT });
    const flick = still ? 0 : Math.round(Math.sin(t * 2.2) * 1.2);
    put(x + 4, gy - 3, lit(ROCK)); put(x + 5, gy - 4 + flick, lit(ROCK)); put(x + 5, gy - 5 + flick, lit(ROCK));
  }
  function lizard(x, gy, t, still) {
    rect(x - 3, gy - 2, 7, 2, lit(ROCK)); rect(x - 2, gy - 3, 5, 1, lit(ROCK)); // the rock
    const dx = still ? 0 : Math.round(Math.sin(t * 0.6) * 1);
    rect(x - 1 + dx, gy - 4, 4, 1, lit(CANOPY)); put(x + 3 + dx, gy - 4, lit(SPROUT)); put(x - 2 + dx, gy - 3, lit(CANOPY)); put(x - 3 + dx, gy - 3, lit(CANOPY));
  }
  function boat(x, y, t, still) {
    const rock = still ? 0 : Math.round(Math.sin(t * 1.1));
    rect(x - 6, y - 1 + rock, 13, 1, lit(EARTHL)); rect(x - 5, y + rock, 11, 1, lit(EARTH)); rect(x - 4, y + 1 + rock, 9, 1, lit(EARTHD));
    rect(x - 1, y - 4 + rock, 2, 3, lit(SAGE)); put(x, y - 5 + rock, lit(CANOPY)); // a rower with a leaf on top (a tree person off duty)
    const oar = still ? 0 : Math.round(Math.sin(t * 1.6) * 2);
    put(x + 2, y - 2 + rock, lit(EARTHL)); put(x + 4, y - 1 + oar + rock, lit(EARTHL)); put(x + 5, y + oar + rock, lit(EARTHL));
  }
  // the ghost ship: hull, masts, then sails, one by one, as you scroll; the crew, faint, each at their post
  function ghostShip(x, y, b, t, still) {
    if (b <= 0) return;
    const ghost = (px, py, c, a) => { if (dith(px | 0, py | 0, a)) put(px, py, c); };
    const bob = still ? 0 : Math.sin(t * 0.9) * 1;
    const hull = sstep(0, 0.2, b), masts = sstep(0.15, 0.35, b);
    const yy = Math.round(y + bob);
    for (let i = -18; i <= 18; i++) { const d = Math.round(Math.abs(i) / 6); for (let j = 0; j < 4 - d; j++) ghost(x + i, yy - j, j === 3 - d ? SAGE : LICHEN, hull * 0.9); }
    for (let i = -14; i <= 14; i += 4) ghost(x + i, yy - 2, BONE, hull * 0.7);
    const mastX = [-9, 0, 9], mastH = [14, 20, 13];
    mastX.forEach((m, k) => { for (let j = 0; j < Math.round(mastH[k] * masts); j++) ghost(x + m, yy - 4 - j, LICHEN, 0.9); });
    const sails = [[-9, 4, 6], [-9, 10, 5], [0, 4, 8], [0, 11, 7], [0, 17, 4], [9, 4, 6], [9, 9, 4]];
    sails.forEach(([m, hgt, w], k) => {
      const a = sstep(0.3 + k * 0.07, 0.38 + k * 0.07, b);
      if (a <= 0) return;
      for (let j = 0; j < 4; j++) for (let i = -w; i <= w; i++) ghost(x + m + i + (j === 2 ? 1 : 0), yy - 4 - hgt + j, j === 0 ? BONE : SAGE, a * 0.85);
    });
    const crew = sstep(0.82, 1, b);
    if (crew > 0) [-12, -4, 5, 13].forEach((cx, k) => { ghost(x + cx, yy - 5, SAGE, crew * 0.6); ghost(x + cx, yy - 6, BONE, crew * 0.6); if (k === 1) ghost(x + cx, yy - 7, BONE, crew * 0.6); });
    // its reflection, in broken lines
    for (let i = -16; i <= 16; i += 2) ghost(x + i, yy + 3 + ((i >> 2) & 1), WHI, hull * 0.4);
  }

  /* ------------------------------------------------------------------ the Bodhi tree (and its similar trees) */
  function tree(tx, ty, scale, g, season, t, still, variant) {
    const wind = still ? 0 : Math.sin(t * 0.9 + variant) * 0.6;
    const flip = variant % 2 ? -1 : 1;
    for (const b of branches) {
      if (b.depth > g * 6.5) continue;
      const sway = wind * (b.depth / 6);
      const x0 = tx + flip * b.x * scale * 3.2 + sway * b.depth * 0.4, y0 = ty + b.y * scale * 3.2;
      const x1 = tx + flip * b.ex * scale * 3.2 + sway * (b.depth + 1) * 0.4, y1 = ty + b.ey * scale * 3.2;
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), wpx = Math.max(1, Math.round(b.w * scale * 1.4));
      for (let i = 0; i <= steps; i++) {
        const px = x0 + (x1 - x0) * (i / steps), py = y0 + (y1 - y0) * (i / steps);
        for (let k = 0; k < wpx; k++) put(px + k - (wpx >> 1), py, lit(k === 0 && TOD < 3.5 ? EARTHL : EARTH));
      }
    }
    const s4 = season % 4;
    if (s4 < 3) {
      const lc = s4 < 1 ? [CANOPY, SPROUT, ROSE] : s4 < 2 ? [CDK, CANOPY, SPROUT] : [RUST, GOLD, CLAY];
      const shade = NIGHT > 0.5 ? [INK, SOIL, CDK] : TOD > 2.6 && TOD < 3.8 ? [S0, GLOW, lc[1]] : lc;
      const leafA = sstep(0.25, 0.7, g) * (s4 > 2.6 ? 1 - sstep(2.6, 3.0, s4) : 1);
      for (const l of leaves) {
        if (l.s > leafA) continue;
        const lx = tx + flip * l.x * scale * 3.2 + wind * 1.4, ly = ty + l.y * scale * 3.2;
        const r = Math.max(1, Math.round(l.r * scale * 1.3));
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) {
          const h = hash(Math.round(lx + x), Math.round(ly + y), 7 + variant);
          put(lx + x, ly + y, y < -r * 0.3 ? (shade[2] === ROSE && h < 0.15 ? ROSE : shade[h < 0.3 ? 2 : 1]) : shade[h < 0.5 ? 0 : 1]);
        }
      }
      if (s4 >= 2 && !still) for (let i = 0; i < 8; i++) {
        const fx = tx + (hash(i, 1, 33 + variant) - 0.5) * 60 * scale + Math.sin(t + i) * 3, fy = ty - 50 * scale + ((t * 9 + i * 17) % (50 * scale + 10));
        put(fx, fy, i % 2 ? RUST : GOLD);
      }
    } else for (const l of leaves) if (l.s < 0.3) put(tx + flip * l.x * scale * 3.2, ty + l.y * scale * 3.2 - 1, BONE);
  }

  /* ------------------------------------------------------------------ one frame */
  const S = { c: 0 };
  function draw(c, t, still) {
    for (const k in T) S[k] = T[k](c);
    S.c = c; TOD = S.tod; NIGHT = sstep(3.6, 4.8, TOD);
    camX = S.camX * W;
    const gy = (GY = Math.round(H * (0.66 + S.alt)));
    const skySpan = H * 0.66;
    const wxAt = (x) => (x + camX - W * 0.5) / W; // screen x to world (screen widths)

    // sky
    for (let y = 0; y < Math.min(gy, H); y++) { const f = clamp((gy - y) / skySpan, 0, 1); for (let x = 0; x < W; x++) buf[y * W + x] = U32[skyColor(TOD, f, x, y)]; }
    const starA = Math.max(NIGHT, sstep(0.6, 1.8, S.alt));
    if (starA > 0.02) for (const s of stars) {
      const yy = ((Math.round(s.y * (gy - 4) - (S.alt > 0.5 ? (S.alt - 0.5) * H * 0.4 * (s.b + 0.3) : 0)) % H) + H) % H;
      if (yy >= gy - 2) continue;
      const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 1.7 + s.ph);
      if (s.b * tw > 1 - starA) put(((s.x * W - camX * 0.05) % W + W) % W, yy, s.b > 0.85 ? BONE : s.b > 0.6 ? SAGE : LICHEN);
    }
    if (TOD >= 0.6 && TOD < 3.7) {
      const sxp = Math.round(W * 0.22), syp = Math.round(gy - skySpan * lerp(0.75, 0.02, sstep(1.2, 3.5, TOD)));
      if (syp < gy + 4) disk(sxp, syp, Math.max(4, Math.round(W / 46)), TOD > 2.2 ? S4 : BONE);
    }
    const moonA = sstep(3.9, 4.8, TOD) * (1 - sstep(8.95, 9.2, c));
    if (moonA > 0.02) {
      const mx = Math.round(W * 0.74), my = Math.round(gy - skySpan * lerp(0.15, 0.62, sstep(7.8, 8.4, c))), mr = Math.max(5, Math.round(W / 34));
      for (let y = -mr - 4; y <= mr + 4; y++) for (let x = -mr - 4; x <= mr + 4; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= mr) put(mx + x, my + y, hash(x + 9, y + 9, 3) < 0.06 && d < mr - 1 ? SAGE : BONE);
        else if (d <= mr + 4 && my + y >= 0 && my + y < gy && mx + x >= 0 && mx + x < W) mix(mx + x, my + y, get(mx + x, my + y) === U32[INK] ? INK : SOIL, MOSS, (1 - (d - mr) / 4) * 0.6 * moonA);
      }
    }
    if (S.aurora > 0.02) for (let x = 0; x < W; x++) {
      const base = gy - skySpan * (0.45 + 0.2 * vnoise(x / 40 + (still ? 0 : t * 0.05), 71)), len = skySpan * (0.12 + 0.18 * vnoise(x / 25, 72)) * S.aurora;
      for (let y = Math.max(0, Math.round(base - len)); y < Math.min(gy - 6, Math.round(base)); y++) { const k = 1 - (base - y) / len; mix(x, y, get(x, y) === U32[INK] ? INK : SOIL, k > 0.7 ? SPROUT : CANOPY, k * 0.55 * S.aurora); }
    }
    if (S.spiral > 0.02) {
      const cx = W * 0.5, cy = H * 0.42, R = Math.min(W, H) * 0.42, show = Math.floor(commits.length * sstep(8.1, 8.55, c));
      for (let i = 0; i < show; i++) { const p = commits[i]; put(cx + Math.cos(p.a) * p.r * R, cy + Math.sin(p.a) * p.r * R * 0.9, i === commits.length - 1 ? SAFF : p.c); }
    }
    if (S.alt < 1.2) for (const cl of clouds) {
      const x0 = Math.round(((cl.x * W - camX * 0.25 + (still ? 0 : t * cl.v * 2)) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3), y0 = Math.round(gy - skySpan * (1 - cl.y));
      const col = TOD < 1.5 ? D2 : TOD < 2.6 ? S3 : TOD < 3.6 ? S2 : TOD < 4.5 ? DUSK : UNDER;
      for (let i = 0; i < cl.w; i++) {
        const hgt = Math.round(3 + 3 * Math.sin((i / cl.w) * Math.PI) + vnoise(i / 5 + cl.x * 9, 81) * 3);
        for (let j = 0; j < hgt; j++) if (y0 - j < gy - 8) put(x0 + i, y0 - j, j === hgt - 1 && TOD > 2 && TOD < 3.6 ? S4 : col);
      }
    }

    // hills, in parallax; far mountains stay, near hills give way to water
    if (gy - 40 < H) for (let k = 0; k < 3; k++) {
      const par = [0.3, 0.6, 1][k], col = landColor(k === 2 ? 1 : 0), hi = landColor(1);
      for (let x = 0; x < W; x++) {
        const wx = (x + camX * par) / W;
        const water = k === 0 ? 0 : waterAt((x + camX - W * 0.5) / W);
        if (k > 0 && water >= 2) continue;
        const n = vnoise(wx * (5 + k * 4), 30 + k) * 0.7 + vnoise(wx * (16 + k * 8), 40 + k) * 0.3;
        let h = Math.round(((10 - k * 3) + n * (14 - k * 3)) * (k === 2 ? 0.5 : 1)) + (k === 0 ? 6 : 0);
        if (k === 2 && beachAt(wxAt(x))) h = 1;
        for (let y = Math.max(0, gy - h); y < Math.min(H, gy); y++) put(x, y, k === 2 ? col : y < gy - h + 1 ? hi : col);
      }
    }

    // the ground, the water and the underworld, column by column
    const wave = still ? 0 : t;
    for (let x = 0; x < W; x++) {
      const wx = wxAt(x), water = waterAt(wx), beach = beachAt(wx);
      const shore = water ? Math.min(Math.abs(wx - (water === 2 ? X.lake - 0.42 : water === 3 ? X.coast - 0.18 : 0.585)), Math.abs(wx - (water === 2 ? X.lake + 0.38 : water === 3 ? X.coast + 0.62 : 0.655))) : 1;
      const depthMax = water === 3 ? 999 : water === 2 ? Math.round(clamp(shore * 260, 2, 46)) : water === 1 ? 5 : 0;
      const wob = Math.round(vnoise(wx * 8, 90) * 6);
      for (let y = Math.max(0, gy); y < H; y++) {
        const d = y - gy;
        let col;
        if (d < depthMax) {
          // water: surface glints, then darker with depth; fish; weeds
          col = d === 0 ? (dith(x, ((x + Math.round(wave * 6)) >> 2), 0.3) ? WHI : TOD > 2.4 && TOD < 3.8 && Math.abs(x - W * 0.22) < 10 ? S4 : WMID) : d < 6 ? WMID : d < 30 ? WATER : d < 80 ? WDEEP : INK;
          if (NIGHT > 0.6 && d === 0 && Math.abs(x - W * 0.74) < 6 && dith(x, Math.round(wave * 3), 0.5)) col = BONE; // moon on water
        } else {
          const dd = d - depthMax + wob;
          col = d === depthMax && depthMax === 0 ? (beach ? GOLD : landColor(2)) : beach && dd < 6 ? (d < 3 ? GOLD : EARTHL) : dd < 9 ? EARTHL : dd < 40 ? EARTH : dd < 70 ? EARTHD : dd < 76 ? (dith(x, y, 0.5) ? EARTHD : ROCK) : dd < 96 ? (vnoise((x + camX) / 14, 88) * 0.6 + vnoise(dd / 4, 87) * 0.4 > 0.6 ? ROCK : UNDER) : dd < 100 ? WDEEP : (vnoise((x + camX) / 22, 89) * 0.55 + vnoise(dd / 6, 86) * 0.45 > 0.62 ? UNDER : SOIL);
          if (dd >= 96 && dd < 100 && !still && dith(x, y, 0.15) && ((x + Math.round(wave * 8)) & 7) === 0) col = WMID; // an underground stream
          if (dd > 3 && hash(x + (camX | 0), y, 93) < 0.012) col = dd > 60 ? ROCK : LICHEN;
          if (depthMax === 0 && d < 2 && hash(x + (camX | 0), 0, 95) < 0.35) col = S.season % 4 > 2.9 ? BONE : CDK;
        }
        buf[y * W + x] = U32[col];
      }
      // grass tufts and reeds
      if (!water && !beach && hash(x + (camX | 0), 1, 97) < 0.25) {
        const h = 1 + ((hash(x + (camX | 0), 2, 97) * 3) | 0), sway = still ? 0 : Math.round(Math.sin(t * 1.3 + x * 0.2) * 0.6);
        for (let j = 1; j <= h; j++) put(x + (j === h ? sway : 0), gy - j, S.season % 4 > 2.9 ? SAGE : NIGHT > 0.5 ? INK : CDK);
      }
      if (water === 2 && shore < 0.05 && hash(x + (camX | 0), 3, 99) < 0.5) for (let j = 1; j <= 5; j++) put(x, gy - j, lit(j === 5 ? EARTHL : REEDC));
    }

    // the underworld network: the roots of every tree joined, carrying light (the digital tree world under ours)
    if (S.net > 0.02) {
      const ny = gy + 34 * K;
      for (let x = 0; x < W; x++) {
        const wx = wxAt(x); if (waterAt(wx) >= 2) continue;
        const y = Math.round(ny + Math.sin(wx * 9) * 5 + Math.sin(wx * 23) * 2);
        if (y >= H || y < 0) continue;
        const pulse = !still && Math.abs(((wx * 3 - t * 0.25) % 1 + 1) % 1 - 0.5) < 0.02;
        if (dith(x, y, S.net)) put(x, y, pulse ? SPROUT : CDK);
        if (hash(Math.round(wx * 40), 0, 77) < 0.25) for (let j = 1; j < 8; j++) if (dith(x, y - j, S.net * 0.7)) put(x + (j >> 2), y - j, CDK); // threads up to the roots
      }
      // fossils: machines buried like bones
      const fossils = [[0.35, 'disk'], [0.95, 'crt'], [1.75, 'bones'], [3.25, 'disk'], [4.6, 'crt']];
      for (const [fx, kind] of fossils) {
        const px = sx(fx), py = Math.round(gy + 58 * K);
        if (!onScreen(px, 20) || py >= H) continue;
        if (kind === 'disk') { rect(px, py, 7, 7, ROCK); rect(px + 2, py, 3, 2, LICHEN); rect(px + 1, py + 4, 5, 2, EARTH); }
        else if (kind === 'crt') { rect(px, py, 10, 8, ROCK); rect(px + 1, py + 1, 8, 5, EARTHD); put(px + 3, py + 3, CDK); rect(px + 3, py + 8, 4, 1, ROCK); }
        else for (let i = 0; i < 9; i++) put(px + i, py + (i % 2), SAGE);
      }
    }
    // the seed and its roots, at home
    const hx = sx(X.home), hy = gy + SEED_D;
    if (onScreen(hx, 80)) {
      for (const r of rootSegs) {
        if (r.s > S.roots) continue;
        const litR = !still && S.net > 0 && Math.abs(r.s - ((t * 0.12) % 1)) < 0.05;
        put(hx + r.x, hy + r.y, litR ? SPROUT : r.d === 0 ? SAGE : LICHEN);
      }
      if (S.growth < 0.2) {
        for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y); if (d > 1 && d < 9.5) mix(hx + x, hy + y, EARTH, d < 5 ? GLOW : EARTHL, (1 - d / 9.5) * 0.75); }
        put(hx, hy, SAFF); put(hx + 1, hy, SAFF);
      }
      if (S.growth > 0.01) tree(hx, gy, lerp(0.12, 1, S.growth) * K, S.growth, S.season, t, still, 0);
    }
    // small lives in the soil: worms that wander, a mole in its burrow
    if (onScreen(hx, 160)) for (let i = 0; i < 4; i++) {
      const wxp = hx - 120 + i * 70 + (still ? 0 : Math.round(Math.sin(t * 0.3 + i) * 6)), wyp = gy + 14 + i * 9;
      for (let k = 0; k < 5; k++) put(wxp + k, wyp + Math.round(Math.sin(k + (still ? 0 : t * 2) + i)), CLAY);
    }
    if (onScreen(hx + 90, 30)) { const mx = hx + 90, my = gy + 44; rect(mx - 6, my - 3, 14, 7, EARTHD); rect(mx - 3, my - 1, 7, 3, ROCK); put(mx + 4, my - 1, BONE); put(mx + 3, my, ROSE); }
    // a stream crossing near home, with a cat watching it and a lizard on a rock
    if (onScreen(sx(0.7), 60)) { zoom(sx(0.7), gy, SZ, () => cat(sx(0.7), gy, t, still)); zoom(sx(0.5), gy, SZ, () => lizard(sx(0.5), gy, t, still)); }
    // the village: tree people of every kind, met in a loose circle; pets at the edge
    const vx = sx(X.village);
    if (onScreen(vx, 120)) {
      const cast = [['local', -46], ['blind', -24], ['cloud', 0], ['instruct', 24], ['thinker', 44], ['local', 64]];
      cast.forEach(([type, off], k) => { const px = vx + Math.round(off * K * SZ); zoom(px, gy, SZ, () => citizen(px, gy, type, t, still, sstep(k / cast.length, (k + 0.6) / cast.length, S.lights))); });
      { const px = vx - Math.round(92 * K * SZ); zoom(px, gy, SZ, () => dog(px, gy, t, still, false)); }
      { const px = vx + Math.round(90 * K * SZ); zoom(px, gy, SZ, () => cat(px, gy, t, still)); }
      tree(vx + Math.round(110 * K), gy, 0.55 * K, 1, S.season, t, still, 3);
      tree(vx - Math.round(118 * K), gy, 0.45 * K, 1, S.season, t, still, 4);
    }
    // the lake: a rowboat, frogs on the shore, fish below
    const lx = sx(X.lake);
    if (onScreen(lx, W * 0.5)) {
      { const bx = lx + Math.round((still ? 0 : Math.sin(t * 0.05) * 30) * K); zoom(bx, gy - 1, SZ, () => boat(bx, gy - 1, t, still)); }
      if (!still) for (let i = 0; i < 6; i++) { const fx = lx + Math.round(((t * (4 + i) + i * 40) % 160) - 80), fy = gy + 12 + i * 5; if (fy < H) { put(fx, fy, lit(i % 2 ? CLAY : SAGE)); put(fx - 1, fy, lit(LICHEN)); } }
      const frog = sx(X.lake - 0.45); rect(frog, gy - 2, 3, 2, lit(CANOPY)); put(frog, gy - 3, lit(SPROUT)); put(frog + 2, gy - 3, lit(SPROUT));
    }
    // the coast: the ghost ship builds itself as you read; a chest of loot on the sea floor
    const cx2 = sx(X.coast + 0.25);
    if (onScreen(cx2, W * 0.6)) {
      zoom(cx2, gy - 1, SZ, () => ghostShip(cx2, gy - 1, S.ship, t, still));
      const chx = sx(X.coast + 0.1), chy = gy + 92 * K;
      if (chy < H - 6) { rect(chx, chy, 9, 6, EARTH); rect(chx, chy, 9, 2, EARTHL); put(chx + 4, chy + 2, GOLD); if (!still && ((t * 2) | 0) % 3 === 0) put(chx + 2, chy - 1, GOLD); }
    }
    // the orchard of similar trees at sunset; the one fruit; the dog has found it
    const ox = sx(X.orchard);
    if (onScreen(ox, W)) {
      [[-150, 0.5, 5], [-95, 0.62, 6], [95, 0.58, 7], [150, 0.48, 8]].forEach(([off, s, v]) => tree(ox + Math.round(off * K), gy, s * K, 1, 1.4, t, still, v));
      tree(ox, gy, 0.95 * K, 1, 1.4, t, still, 2);
      if (S.fruit > 0.02) {
        const fx = ox + Math.round(10 * K), fy = gy - Math.round(31 * K);
        put(fx, fy - 1, CDK); rect(fx, fy, 2, 2, SAFF); put(fx + 1, fy + 1, GOLD);
        if (!still) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 1.5 && d < 3.5 && hash(x, y, (t * 4) | 0) < 0.12 * S.fruit) put(fx + x, fy + y, GOLD); }
      }
      { const px = ox - Math.round(34 * K * SZ); zoom(px, gy, SZ, () => dog(px, gy, t, still, true)); }
    }

    // weather and creatures of the air
    if (!still && S.alt < 0.6 && S.alt > -0.2) {
      if (TOD > 0.8 && TOD < 3.3) for (let i = 0; i < 4; i++) {
        const bx = ((t * (6 + i * 2) + i * 97) % (W + 40)) - 20, by = gy - skySpan * (0.45 + i * 0.08) + Math.sin(t * 2 + i) * 2, flap = ((t * 6 + i) | 0) % 2;
        put(bx, by, INK); put(bx - 1, by - 1 + flap, INK); put(bx + 1, by - 1 + flap, INK);
      }
      if (c > 4.0 && c < 4.9) { // a deer at the treeline near home
        const dx = sx(-0.3), col = TOD < 2.6 ? D0 : INK;
        rect(dx, gy - 5, 6, 2, col); put(dx, gy - 3, col); put(dx + 5, gy - 3, col); put(dx, gy - 2, col); put(dx + 5, gy - 2, col);
        put(dx + 6, gy - 6, col); put(dx + 6, gy - 7, col); put(dx + 7, gy - 7, col); put(dx + 6, gy - 9, col); put(dx + 7, gy - 10, col);
      }
      if (TOD > 3.2 && TOD < 4.9) for (let i = 0; i < 14; i++) {
        const fx = W * hash(i, 1, 41) + Math.sin(t * 0.7 + i) * 6, fy = gy - 3 - hash(i, 2, 41) * 18 + Math.cos(t * 0.9 + i) * 2;
        if (Math.sin(t * 3 + i * 7) > 0.4) put(fx, fy, i === 0 ? SAFF : SPROUT);
      }
      if (S.rain > 0.02) for (let i = 0; i < 220 * S.rain; i++) { const rx = (hash(i, 1, 5) * W + t * 40) % W, ry = (hash(i, 2, 5) * H + t * 160) % H; if (ry < gy) { put(rx, ry, LICHEN); put(rx - 1, ry - 1, D3); } }
      if (S.snow > 0.02) for (let i = 0; i < 160 * S.snow; i++) { const rx = (hash(i, 1, 6) * W + Math.sin(t + i) * 3) % W, ry = (hash(i, 2, 6) * H + t * 14) % H; if (ry < gy) put(rx, ry, BONE); }
    }

    // the leaf: an iris opens on its cells
    if (S.iris > 0.01) {
      const R = Math.round(Math.min(W, H) * 0.34 * S.iris), cx = W >> 1, cy = Math.round(H * 0.5);
      const z = 1 + Math.round(S.zoom * 2), ox2 = Math.round((still ? 0 : t * 3) + S.zoom * 40), oy = Math.round(S.zoom * 25);
      for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) {
        const d = Math.hypot(x, y);
        if (d <= R) { const u = ((Math.floor((x + ox2) / z) % cells.w) + cells.w) % cells.w, v = ((Math.floor((y + oy) / z) % cells.h) + cells.h) % cells.h; put(cx + x, cy + y, d > R - 1 ? SPROUT : cells.px[v * cells.w + u]); }
        else if (d <= R + 2) put(cx + x, cy + y, INK);
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - cx, y - cy) > R + 2 && dith(x, y, 0.7 * S.iris)) buf[y * W + x] = U32[INK];
    }
    ctx.putImageData(img, 0, 0);
  }
  const REEDC = CDK;

  /* ------------------------------------------------------------------ where are we in the story */
  let els = [];
  const collect = () => { els = PLACES.map((id) => doc.getElementById(id)).filter(Boolean); };
  function clockC() {
    if (!els.length) return { c: 0, on: false };
    const line = win.innerHeight * 0.5, first = els[0].getBoundingClientRect();
    const on = first.top < win.innerHeight * 0.85;
    let i = 0, r = first;
    for (let k = 0; k < els.length; k++) { const b = els[k].getBoundingClientRect(); if (k === 0 || b.top <= line) { i = k; r = b; } }
    return { c: PLACES.indexOf(els[i].id) + sat((line - r.top) / Math.max(1, r.height)), on };
  }

  /* ------------------------------------------------------------------ loop */
  const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionOff = () => reduced.matches || doc.body.classList.contains('still-frames') || root.dataset.motion === 'off';
  let cS = null, visible = false, raf = 0, last = 0, time = 0, lastDraw = -1, lastStill = '', lastT = 0;
  const api = (win.BodhiPixelJourney = { c: 0, on: false, frames: 0, snap: () => { cS = null; } });

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    const st = clockC();
    if (st.on !== visible) { visible = st.on; root.classList.toggle('pj-on', visible); }
    api.on = visible;
    if (!visible || doc.hidden) { last = 0; return; }
    const still = motionOff();
    if (cS === null || Math.abs(st.c - cS) > 1.5) cS = st.c;
    cS += (st.c - cS) * (1 - Math.exp(-dt * 5));
    if (still) {
      const q = Math.round(st.c * 4) / 4, key = q + '|' + W + 'x' + H;
      if (key !== lastStill) { lastStill = key; draw(q, 20, true); api.frames++; }
    } else {
      time += dt; if (hello > 0) hello = Math.max(0, hello - dt);
      if (Math.abs(cS - lastDraw) > 0.0005 || now - lastT > 66) { draw(cS, time, false); lastDraw = cS; lastT = now; api.frames++; }
    }
    api.c = cS;
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  let rz = 0;
  win.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); lastStill = ''; wake(); }, 150); }, { passive: true });
  win.addEventListener('scroll', wake, { passive: true });
  doc.addEventListener('visibilitychange', wake);
  if (reduced.addEventListener) reduced.addEventListener('change', () => { lastStill = ''; wake(); });
  doc.getElementById('greet-dog')?.addEventListener('click', () => { hello = 2.4; wake(); });

  collect(); layout(); wake();
  if (doc.readyState !== 'complete') win.addEventListener('load', () => { collect(); build(); wake(); }, { once: true });
})();
