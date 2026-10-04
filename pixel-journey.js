/* Bodhi · the walk · pixel-journey.js
   One footpath, walked in first person, behind everything after the film. It starts at a cottage door at
   dusk, goes through an autumn meadow, a wintry fogged wood (a partial view), past a pond, under a great tree, into
   a clearing with room on both sides, over the river by a lantern-lit footbridge, stops to look up at the
   ancestors, comes down to the coast at first light where the ghost ship assembles, and arrives in the
   orchard's own golden hour at the broad tree with the dog.

   How it is drawn: a 2.5D ground plane. Every row below the horizon is a depth; every pixel of that row
   is a point on the ground, looked up from analytic world features (the winding path, the river, the
   pond, the sea) and painted in whole low-resolution pixels, the same way the night scroll was. Trees,
   cottages, the lantern, the ship and the dog are billboards placed in that world and scaled by depth;
   the sky, moon, stars, aurora and three ranges of hills turn with the path's heading.

   What it reuses, literally: the night scroll's 23-colour palette, Bayer dither, star field, moon,
   aurora, cloud puffs, hill ranges and blob trees (pixel-backdrop.js), and the orchard's broad tree (landscape.js) and
   original seed puppy (assets/seed/sprites.js), whose colours are added to the palette so the walk arrives in the
   orchard's light. Colours are authored per hour of the day as a table of roles, and the role palette
   interpolates in whole pixels without smoothing their edges.

   Motion: still when the system asks for reduced motion, when the film's Stillness is on, or when the
   field guide's ambient-motion switch is off. Pauses when hidden. No storage, no network. */
import { spriteCanvas } from './assets/seed/sprites.js?v=543cf1ef031d';
import { paintCottage } from './assets/seed/cottage.js';

(() => {
  'use strict';
  const doc = document, win = window, root = doc.documentElement;
  const world = doc.getElementById('outside-world');
  if (!world || !win.requestAnimationFrame) return;

  /* ------------------------------------------------------------------ palette */
  const HEX = {
    soil: '#17231B', under: '#1F2C24', moss: '#2E3B33', lichen: '#8A968D', sage: '#B8C2BA', bone: '#F2EEE4',
    canopy: '#2E6B45', sprout: '#8BCB8B', saffron: '#E8982A', clay: '#D9674F',
    ink: '#0F1814', canopyDk: '#255039', wDeep: '#162D38', water: '#22404F', wHi: '#36606F',
    dusk: '#38344A', glow: '#6E4F4C', dawn: '#8C7A6A', earth: '#3A2E27', earthL: '#5B4638', reed: '#5A5A34',
    rose: '#A86F85', lilac: '#8478A8',
    // the orchard's golden hour, from landscape.js
    sk1: '#655263', sk2: '#9c6971', sk3: '#c6856c', sk4: '#dfa075', sk5: '#e9bb82', sun: '#f3d5a0', cloudW: '#b47d78',
    hl1: '#69686c', hl2: '#626d60', hl3: '#73794f', hl4: '#7e824d', gr1: '#a9a263', gr2: '#666f48', gr3: '#c1ac6b',
    rv1: '#a09269', rv2: '#c1b38b', rv3: '#dfc592',
    oak0: '#304c31', oak1: '#526d3e', oak2: '#829252', oak3: '#b5ad69', bark0: '#39402c', bark1: '#72754b', bark2: '#a29b60',
    fruit0: '#9d5529', fruitHi: '#ffe0a0', dogD: '#704c2c', dogG: '#c38b46', dogL: '#e4b668', dogN: '#263728', grassB: '#859355'
  };
  const NAMES = Object.keys(HEX), P = {};
  NAMES.forEach((n, i) => { P[n] = i; });
  const U32 = NAMES.map((n) => { const h = HEX[n]; const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; });

  /* Roles. Everything in the world is painted in a role; each hour maps roles onto the palette. */
  const ROLES = ['G0', 'G1', 'G2', 'TUFT', 'P0', 'P1', 'PEB', 'BANK', 'BANKL', 'W0', 'W1', 'WHI', 'SAND', 'T0', 'T1', 'T2', 'T3',
    'TRK', 'TRKL', 'PINE0', 'PINE1', 'ROCK0', 'ROCK1', 'ROCKHI', 'HILL0', 'HILL1', 'HILL2', 'FOG', 'WOOD', 'WOODD', 'ROOF', 'ROOFD',
    'WALL', 'WALLD', 'WIN', 'BLOOM1', 'BLOOM2', 'REED', 'CLOUD', 'CLOUDL'];
  const S = {};
  ROLES.forEach((r, i) => { S[r] = i; });
  const AUTUMN_COLORS = {
    [S.T1]: P.earth, [S.T2]: P.reed, [S.T3]: P.clay, [S.TUFT]: P.earthL, [S.BLOOM1]: P.clay
  };
  const WINTER_COLORS = {
    [S.G0]: P.lichen, [S.G1]: P.moss, [S.G2]: P.sage, [S.TUFT]: P.bone,
    [S.ROCK0]: P.soil, [S.ROCK1]: P.moss, [S.ROCKHI]: P.sage
  };
  const night = {
    G0: 'under', G1: 'soil', G2: 'moss', TUFT: 'canopyDk', P0: 'earth', P1: 'soil', PEB: 'earthL', BANK: 'earth', BANKL: 'earthL',
    W0: 'water', W1: 'wDeep', WHI: 'wHi', SAND: 'earth', T0: 'soil', T1: 'under', T2: 'moss', T3: 'canopyDk', TRK: 'earth', TRKL: 'earthL',
    PINE0: 'soil', PINE1: 'under', ROCK0: 'soil', ROCK1: 'under', ROCKHI: 'moss', HILL0: 'under', HILL1: 'soil', HILL2: 'ink', FOG: 'moss',
    WOOD: 'earthL', WOODD: 'earth', ROOF: 'under', ROOFD: 'soil', WALL: 'earth', WALLD: 'soil', WIN: 'saffron', BLOOM1: 'rose', BLOOM2: 'lilac',
    REED: 'reed', CLOUD: 'under', CLOUDL: 'moss'
  };
  const HOURS = [
    // 0 dusk
    { sky: ['soil', 'under', 'under', 'dusk', 'glow'], stars: 0.25, moon: 0.55, aurora: 0, sun: 0, lamp: 0.6,
      roles: Object.assign({}, night, { G0: 'moss', G1: 'under', G2: 'canopyDk', TUFT: 'canopy', P0: 'earthL', P1: 'earth', PEB: 'earth',
        T0: 'under', T1: 'moss', T2: 'canopyDk', T3: 'canopy', PINE1: 'moss', ROCK1: 'moss', ROCKHI: 'lichen', HILL0: 'dusk', HILL1: 'moss', HILL2: 'under',
        ROOF: 'moss', WALL: 'earthL', WALLD: 'earth', CLOUD: 'glow', CLOUDL: 'dawn' }) },
    // 1 twilight
    { sky: ['ink', 'soil', 'under', 'under', 'dusk'], stars: 0.7, moon: 1, aurora: 0, sun: 0, lamp: 1,
      roles: Object.assign({}, night, { P0: 'earthL', P1: 'earth', PEB: 'earth', T0: 'under', T1: 'moss', T2: 'canopyDk', T3: 'canopy',
        PINE1: 'moss', ROCK1: 'moss', ROCKHI: 'lichen', HILL0: 'dusk', HILL1: 'under', HILL2: 'soil', CLOUD: 'moss', CLOUDL: 'dusk' }) },
    // 2 night
    { sky: ['ink', 'soil', 'soil', 'under', 'moss'], stars: 1, moon: 1, aurora: 0.15, sun: 0, lamp: 1, roles: night },
    // 3 deep night, the aurora
    { sky: ['ink', 'ink', 'soil', 'soil', 'under'], stars: 1, moon: 0.9, aurora: 1, sun: 0, lamp: 1,
      roles: Object.assign({}, night, { G0: 'soil', G1: 'ink', G2: 'under', TUFT: 'moss', T3: 'moss', T2: 'under', T1: 'soil', T0: 'ink',
        HILL0: 'soil', HILL1: 'ink', HILL2: 'ink', FOG: 'under', CLOUD: 'soil', CLOUDL: 'under' }) },
    // 4 first light, at the coast
    { sky: ['soil', 'dusk', 'glow', 'dawn', 'sk4'], stars: 0.12, moon: 0.15, aurora: 0, sun: 0.55, lamp: 0.3,
      roles: Object.assign({}, night, { G0: 'moss', G1: 'under', G2: 'canopyDk', TUFT: 'canopy', P0: 'dawn', P1: 'earthL', PEB: 'earthL',
        BANK: 'earthL', BANKL: 'dawn', WHI: 'wHi', SAND: 'dawn', T0: 'under', T1: 'moss', T2: 'canopyDk', T3: 'canopy', PINE0: 'under', PINE1: 'moss',
        ROCK0: 'moss', ROCK1: 'lichen', ROCKHI: 'sage', HILL0: 'dusk', HILL1: 'moss', HILL2: 'under', FOG: 'lichen', WOOD: 'dawn', WOODD: 'earthL',
        ROOF: 'moss', ROOFD: 'under', WALL: 'dawn', WALLD: 'earthL', CLOUD: 'glow', CLOUDL: 'dawn' }) },
    // 5 the orchard's golden hour
    { sky: ['sk1', 'sk2', 'sk3', 'sk4', 'sk5'], stars: 0, moon: 0, aurora: 0, sun: 1, lamp: 0,
      roles: { G0: 'hl4', G1: 'gr2', G2: 'gr1', TUFT: 'grassB', P0: 'rv2', P1: 'rv1', PEB: 'gr3', BANK: 'rv1', BANKL: 'rv2', W0: 'rv1', W1: 'hl1',
        WHI: 'rv3', SAND: 'gr3', T0: 'oak0', T1: 'oak1', T2: 'oak2', T3: 'oak3', TRK: 'bark0', TRKL: 'bark1', PINE0: 'oak0', PINE1: 'oak1',
        ROCK0: 'hl1', ROCK1: 'hl2', ROCKHI: 'gr3', HILL0: 'hl1', HILL1: 'hl2', HILL2: 'hl3', FOG: 'hl1', WOOD: 'bark2', WOODD: 'bark0',
        ROOF: 'hl1', ROOFD: 'hl2', WALL: 'bark1', WALLD: 'bark0', WIN: 'sun', BLOOM1: 'gr3', BLOOM2: 'sk4', REED: 'hl3', CLOUD: 'cloudW', CLOUDL: 'sk3' } }
  ];
  const TAB = HOURS.map((h) => Uint8Array.from(ROLES, (r) => P[h.roles[r]]));
  const SKYI = HOURS.map((h) => h.sky.map((n) => P[n]));

  /* ------------------------------------------------------------------ helpers */
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sat = (v) => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const vnoise = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  /* ------------------------------------------------------------------ the world, in path coordinates
     z runs along the walk; d is the distance from the path's centre line. */
  const ZEND = 520;
  const PXT = new Float32Array(ZEND * 4 + 16);
  for (let i = 0; i < PXT.length; i++) { const z = i / 4 - 2; PXT[i] = 7 * Math.sin(z * 0.043) + 2.6 * Math.sin(z * 0.117 + 1.3); }
  const PX = (z) => { const u = (z + 2) * 4, i = clamp(Math.floor(u), 0, PXT.length - 2), f = clamp(u - i, 0, 1); return PXT[i] + (PXT[i + 1] - PXT[i]) * f; };
  const PW = 0.6;                                      // half-width of the path
  const inRange = (z, a, b, edge = 8) => smooth(a - edge, a, z) * (1 - smooth(b, b + edge, z));
  const autumnAt = (z) => inRange(z, 25, 65);
  // Winter belongs to the early mountain/limited-view passage. After the
  // ancestral sky the path returns to thawed ground and a rising sun.
  const winterAt = (z) => inRange(z, 72, 108, 12);
  const pathWidth = (z) => PW - 0.22 * inRange(z, 76, 128, 12) + 0.5 * inRange(z, 202, 234, 12) - 0.28 * inRange(z, 304, 329, 12);
  const RIV0 = 236, RIV1 = 292, RIVZ = 264, RW = 0.9;  // the river crosses the path diagonally at RIVZ
  const riverD = (z) => (z - RIVZ) * 0.9;
  const POND = { d: -4.6, z: 141, rx: 2.6, rz: 1.6 };
  const seaEdge = (z) => (z < 340 ? 1e9 : z < 356 ? lerp(22, 3.4, smooth(340, 356, z)) : z < 404 ? 3.4 + 0.7 * Math.sin(z * 0.31) : 3.4 + 0.7 * Math.sin(z * 0.31) + (z - 404) * 0.9);

  // what the ground is at a point; also used to keep props off the path and out of the water
  function kind(d, z) {
    if (z > 340 && d > seaEdge(z) - 1.2) return 'water';
    if (z > RIV0 && z < RIV1 && Math.abs(d - riverD(z)) * 0.743 < RW + 0.5) return 'water';
    const pu = (d - POND.d) / POND.rx, pv = (z - POND.z) / POND.rz;
    if (pu * pu + pv * pv < 1.6) return 'water';
    if (Math.abs(d) < pathWidth(z) + 0.6) return 'path';
    return 'grass';
  }

  // the ground's role at a point, seen from depth zc (far points skip fine detail so they do not shimmer)
  function ground(wx, wz, zc) {
    const d = wx - PX(wz);
    if (wz > 340) {
      const e = seaEdge(wz);
      if (d > e) return d > e + 0.7 ? S.W0 : S.W1;
      if (d > e - 1.1) return S.SAND;
    }
    if (wz > RIV0 && wz < RIV1) {
      const ar = Math.abs(d - riverD(wz)) * 0.743;
      if (ar < RW) {
        if (Math.abs(d) < PW + 0.25) return (Math.floor(wz * 6) % 3 === 0) ? S.WOODD : S.WOOD;
        return ar > RW - 0.22 ? S.W1 : S.W0;
      }
      if (ar < RW + 0.32) return hash(Math.floor(wx * 4), Math.floor(wz * 4), 9) < 0.3 ? S.BANKL : S.BANK;
    }
    {
      const pu = (d - POND.d) / POND.rx, pv = (wz - POND.z) / POND.rz, a = Math.atan2(pv, pu);
      const wob = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5 + 2), pr = (pu * pu + pv * pv) / (wob * wob);
      if (pr < 1) return pr > 0.8 ? S.W1 : S.W0;
      if (pr < 1.3) return hash(Math.floor(wx * 4), Math.floor(wz * 4), 9) < 0.3 ? S.BANKL : S.BANK;
    }
    const ad = Math.abs(d), width = pathWidth(wz);
    // A narrow trail opens gradually onto shingle; no straight cross-map cutoff.
    const shore = inRange(wz, 366, 390, 24);
    const shoreWidth = lerp(width, 3.2, shore);
    const irregularEdge = (vnoise(wx * 1.1, wz * 0.9, 38) - 0.5) * 0.32;
    const shingle = shore * (1 - smooth(shoreWidth - 0.55, shoreWidth + 0.2 + irregularEdge, ad));
    const surfaceMix = hash(Math.floor(wx * 7), Math.floor(wz * 7), 37);
    if (surfaceMix < shingle) {
      const h = hash(Math.floor(wx * 7), Math.floor(wz * 7), 33);
      return h < 0.08 ? S.ROCK1 : h < 0.25 ? S.PEB : S.SAND;
    }
    // The shared clearing has a circular garden walk, not a road running through the meeting.
    if (wz > 202 && wz < 240 && ad < 6) {
      const ring = (d / 3.5) ** 2 + ((wz - 224) / 15) ** 2;
      if (ring > 0.65 && ring < 0.92) return hash(Math.floor(wx * 5), Math.floor(wz * 5), 36) < 0.2 ? S.PEB : S.P1;
      if (ad < width && ring < 0.65) return S.G0;
    }
    // Alpine ground uses the same stone painter and palette as the older walk.
    const snow = winterAt(wz);
    if (ad > width && vnoise(wx * 0.9, wz * 0.7, 43) > 1 - 0.56 * snow) return S.ROCK1;
    if (ad < width) {
      if (zc < 9 && hash(Math.floor(wx * 9), Math.floor(wz * 9), 3) < 0.05) return S.PEB;
      return ad > width - 0.16 ? S.P1 : S.P0;
    }
    if (zc < 9) {
      const h = hash(Math.floor(wx * 8), Math.floor(wz * 8), 5);
      if (h < 0.035) return S.TUFT;
      if (h > 0.996) return h > 0.998 ? S.BLOOM1 : S.BLOOM2;
    }
    const sp = hash(Math.floor(wx * 8), Math.floor(wz * 8), 1);
    if (sp < 0.025) return S.G2;
    if (sp < 0.045) return S.G1;
    const n = vnoise(wx * 0.22, wz * 0.22, 1);
    return n > 0.87 ? S.G2 : n < 0.1 ? S.G1 : S.G0;
  }

  /* ------------------------------------------------------------------ props */
  const props = [];
  {
    const R = rng(7);
    const add = (k, d, z, o) => props.push(Object.assign({ k, d, z, seed: props.length }, o || {}));
    // home: a lit cottage at the start, a cat on its step, a second cottage, a signpost
    add('cottage', -3.2, 5, { w: 1.7, h: 1.25 }); add('cat', -2.3, 4.6); add('cottage', 4.0, 10, { w: 1.4, h: 1.05 }); add('sign', 0.95, 7);
    // landmarks
    add('tree', 2.6, 50, { r: 1.3 });                                   // the old tree where it started
    add('tree', -2.8, 84, { r: 0.8 }); add('tree', 3.8, 103, { r: 0.9 }); // bare winter branches before the lake
    add('tree', 2.0, 158, { r: 2.1 });                                  // the great tree you sit under
    add('bench', -1.15, 210, { face: 1 }); add('bench', 1.15, 210, { face: -1 }); // a clearing: room on both sides
    add('cottage', -3.8, 214, { w: 1.7, h: 1.25 }); // the shared workbench, using the first home's own painter
    add('cottage', 5.2, 218, { w: 1.2, h: 0.9 });
    add('cottage', -4.0, 234, { w: 1.5, h: 1.1 });
    add('cottage', 4.6, 239, { w: 1.2, h: 0.9 });
    add('lantern', 0.95, 261.3);
    add('rail', 0, 0, { a: [0.8, 261.6], b: [0.8, 266.4] }); add('rail', 0, 0, { a: [-0.8, 261.6], b: [-0.8, 266.4] });
    add('post', 0.8, 261.6); add('post', 0.8, 266.4); add('post', -0.8, 261.6); add('post', -0.8, 266.4);
    add('boat', riverD(259.5) - 0.1, 259.5);
    add('ship', 8.5, 390);
    add('orchard', 3.0, 450); add('dog', 1.9, 449.7);
    // the countryside
    for (let z = 2; z < 470; z += 0.45) {
      const pine = z > 70 && z < 134, clearing = inRange(z, 196, 240, 12), alpine = inRange(z, 72, 108, 12), coast = z > 340 && z < 406, gold = z > 406;
      let p = pine ? 0.85 : coast ? 0.16 : gold ? 0.28 : 0.34;
      p = lerp(p, 0.2, clearing);
      p = lerp(p, 0.58, alpine);
      if (z < 12) p = 0.1;
      if (R() > p) continue;
      const side = coast ? -1 : (R() < 0.5 ? -1 : 1);
      const distanceRoll = R();
      let d = side * (pine ? 1.3 + Math.pow(distanceRoll, 1.3) * 8 : 1.7 + Math.pow(distanceRoll, 1.4) * 13);
      if (clearing > 0) {
        const clearingDistance = 6.5 + (clearing >= 1 ? R() : hash(Math.round(z * 100), 0, 73)) * 7;
        d = side * lerp(Math.abs(d), clearingDistance, clearing);
      }
      if (kind(d, z) !== 'grass') continue;
      if (alpine >= 1 || (alpine > 0 && hash(Math.round(d * 16), Math.round(z * 16), 74) < alpine)) add('rock', d, z, { r: 0.45 + R() * 1.0 });
      else if (pine) add('pine', d, z, { h: 1.6 + R() * 1.3 });
      else if (R() < 0.18) add('rock', d, z, { r: 0.16 + R() * 0.2 });
      else if (R() < 0.3) add('bush', d, z, { r: 0.24 + R() * 0.18 });
      else add('tree', d, z, { r: gold ? 0.45 + R() * 0.25 : 0.6 + R() * 0.45 });
    }
    // reeds on the river banks and around the pond, fireflies by the water
    for (let z = RIV0 + 3; z < RIV1 - 3; z += 0.4) for (const sd of [-1, 1]) {
      const d = riverD(z) + sd * (RW / 0.743 + 0.25);
      if (Math.abs(d) > PW + 0.8 && hash(z * 10, sd, 21) < 0.35) add('reeds', d, z);
    }
    for (let a = 0; a < TAU; a += 0.3) if (hash(a * 10, 1, 22) < 0.6) add('reeds', POND.d + Math.cos(a) * (POND.rx + 0.35), POND.z + Math.sin(a) * (POND.rz + 0.3));
    for (let i = 0; i < 46; i++) {
      const at = i < 20 ? [riverD(250 + i * 1.2) + (R() - 0.5) * 3, 250 + i * 1.2] : i < 32 ? [POND.d + (R() - 0.5) * 5, POND.z + (R() - 0.5) * 3.5] : [2 + (R() - 0.5) * 4, 156 + (R() - 0.5) * 5];
      add('fly', at[0], at[1], { y: 0.2 + R() * 0.7, ph: R() * TAU });
    }
  }

  /* ------------------------------------------------------------------ canvas and layout (the night scroll's whole-pixel scaling)
     The ground is the night scroll's map, tilted a little: rows near the horizon are compressed so the land eases
     into the hills instead of meeting the sky at a line. G[y] is how far ahead of the bottom row the ground at row y
     lies; SC[y] is how many pixels one world unit spans there. */
  const canvas = doc.createElement('canvas');
  canvas.className = 'pj-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  let W = 0, H = 0, HY0 = 0, PXW = 0, GMAX = 0, G = null, SC = null, img = null, buf = null, buf2 = null, stars = [], clouds = [];
  function layout() {
    const vw = Math.max(320, win.innerWidth || 0), vh = Math.max(320, win.innerHeight || 0), dpr = win.devicePixelRatio || 1;
    const sCss = clamp(Math.round(vw / 340), 2, 6), sDev = Math.max(1, Math.round(sCss * dpr)), cssPer = sDev / dpr;
    W = Math.ceil((vw * dpr) / sDev); H = Math.ceil((vh * dpr) / sDev);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * cssPer + 'px'; canvas.style.height = H * cssPer + 'px';
    const tall = H / W > 1.3;
    HY0 = Math.round(H * (tall ? 0.27 : 0.33));
    PXW = W / (tall ? 12 : 22);
    G = new Float32Array(H + 1); SC = new Float32Array(H + 1);
    let g = 0;
    for (let y = H - 1; y > HY0; y--) { const u = (y - HY0) / (H - HY0); SC[y] = PXW * (0.26 + 0.74 * Math.pow(u, 0.8)); G[y] = g; g += 1 / SC[y]; }
    GMAX = g; G[HY0] = g; SC[HY0] = PXW * 0.26;
    img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer); buf2 = new Uint32Array(W * H);
    stars = Array.from({ length: 320 }, (_, i) => ({ x: hash(i, 1, 7), y: Math.pow(hash(i, 2, 7), 0.8) * 0.94, th: hash(i, 3, 7), b: hash(i, 4, 7), ph: hash(i, 5, 7) * 40 }));
    clouds = Array.from({ length: 6 }, (_, i) => ({ x: hash(i, 1, 9) * (W + 90), y: 0.12 + hash(i, 2, 9) * 0.62, w: 24 + hash(i, 3, 9) * 30, v: 1.2 + hash(i, 4, 9) * 1.6 }));
  }

  /* ------------------------------------------------------------------ per-frame colour state */
  const colours = new Uint32Array(ROLES.length);
  const mixInk = (a, b, t) => {
    const inv = 1 - t;
    return (0xff000000 | ((((a >>> 16) & 255) * inv + ((b >>> 16) & 255) * t) << 16) |
      ((((a >>> 8) & 255) * inv + ((b >>> 8) & 255) * t) << 8) |
      ((a & 255) * inv + (b & 255) * t)) >>> 0;
  };
  let PF = 0, HA = 0, HB = 0, fallWeight = 0, snowWeight = 0;
  const setHour = (a, b, f) => {
    HA = a; HB = b; PF = f;
    // Seasons belong to places in the story. Interpolate the role palette once,
    // keeping every object solid while its daylight and season change.
    fallWeight = autumnAt(CZ);
    snowWeight = winterAt(CZ);
    for (let i = 0; i < ROLES.length; i++) {
      let c = mixInk(U32[TAB[a][i]], U32[TAB[b][i]], f);
      if (AUTUMN_COLORS[i] != null) c = mixInk(c, U32[AUTUMN_COLORS[i]], fallWeight);
      if (WINTER_COLORS[i] != null) c = mixInk(c, U32[WINTER_COLORS[i]], snowWeight);
      colours[i] = c;
    }
  };
  const hourVal = (key) => lerp(HOURS[HA][key], HOURS[HB][key], PF);
  const bi = (x, y) => ((y & 3) << 2) | (x & 3);
  const roleColor = (x, y, r) => colours[r];
  const put = (x, y, r) => { if (x < 0 || x >= W || y < 0 || y >= H) return; buf[y * W + x] = roleColor(x, y, r); };
  const raw = (x, y, c) => { if (x < 0 || x >= W || y < 0 || y >= H) return; buf[y * W + x] = U32[c]; };
  let FOGK = 0; // fog on the sprite being drawn
  const fput = (x, y, r) => { x |= 0; y |= 0; if (x < 0 || x >= W || y < 0 || y >= H) return; buf[y * W + x] = roleColor(x, y, BAY[bi(x, y)] < FOGK ? S.FOG : r); };
  const frect = (x, y, w, h, r) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) fput(x + i, y + j, r); };
  const fdisk = (cx, cy, rad, r) => { for (let j = -rad; j <= rad; j++) { const w = Math.floor(Math.sqrt(rad * rad - j * j)); for (let i = -w; i <= w; i++) fput(cx + i, cy + j, r); } };
  const fline = (pts, r, wd) => {
    const half = Math.max(0, Math.round(wd) - 1) / 2;
    for (let k = 1; k < pts.length; k++) {
      let [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy, n = 0;
      while (n++ < 4000) {
        for (let j = -Math.floor(half); j <= Math.ceil(half); j++) for (let i = -Math.floor(half); i <= Math.ceil(half); i++) fput(x0 + i, y0 + j, r);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
      }
    }
  };

  /* ------------------------------------------------------------------ camera */
  let CX = 0, CZ = 0, HY = 0, DY = 0, FOG = 0;
  const rowOf = (gz) => {
    if (gz <= 0) return H - 1 + (-gz) * SC[H - 1];
    if (gz >= GMAX) return HY0;
    let lo = HY0 + 1, hi = H - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (G[m] > gz) lo = m; else hi = m; }
    const f = (G[lo] - gz) / Math.max(1e-6, G[lo] - G[hi]);
    return lo + f * (hi - lo);
  };
  const project = (d, z, y) => {
    const gz = z - CZ;
    if (gz < -2.5 || gz > GMAX) return null;
    const r = rowOf(gz), s = SC[clamp(Math.round(r), HY0 + 1, H - 1)] || PXW;
    return { x: W / 2 + (PX(z) + d - CX) * s, y: r + DY - (y || 0) * s, zc: gz, s };
  };
  const fogAt = (g) => FOG * smooth(1.2, 7, g);

  /* ------------------------------------------------------------------ sky (the night scroll's own, in screen space) */
  function drawSky() {
    const top = Math.min(HY, H), A = SKYI[HA], B = SKYI[HB], span = HY0 * 0.82 + DY;
    for (let y = 0; y < top; y++) {
      const bp = clamp((y / span) * 4, 0, 3.999), k = Math.floor(bp), tt = smooth(0.05, 0.95, bp - k);
      for (let x = 0; x < W; x++) {
        const th = BAY[bi(x, y)];
        const cA = th < tt ? A[k + 1] : A[k], cB = th < tt ? B[k + 1] : B[k];
        buf[y * W + x] = mixInk(U32[cA], U32[cB], PF);
      }
    }
  }
  function drawStars(amt, tick, anim) {
    if (amt <= 0.01) return;
    for (const st of stars) {
      if (st.th > amt * 0.95) continue;
      const x = Math.floor(st.x * W), y = Math.floor(st.y * (HY0 + DY));
      if (y >= HY - 2) continue;
      let c = st.b > 0.97 ? P.bone : st.b > 0.8 ? P.sage : P.lichen;
      if (anim && ((tick + Math.floor(st.ph)) % 7 === 0) && st.b < 0.7) c = P.moss;
      raw(x, y, c);
      if (st.b > 0.975) { raw(x - 1, y, P.lichen); raw(x + 1, y, P.lichen); raw(x, y - 1, P.lichen); raw(x, y + 1, P.lichen); }
    }
  }
  function drawMoon(amt) {
    if (amt <= 0.02) return null;
    const mq = clamp(CZ / 450, 0, 1), r = Math.max(3, Math.round(HY0 * 0.055));
    const mx = Math.round(W * (0.84 - 0.62 * mq)), my = Math.round(HY0 * (1.06 - 0.86 * Math.sin(Math.PI * Math.pow(mq, 0.92)))) + DY;
    for (let dy = -r - 3; dy <= r + 3; dy++) for (let dx = -r - 3; dx <= r + 3; dx++) {
      if (my + dy >= HY) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r + r * 0.4) raw(mx + dx, my + dy, P.bone);
      else if (d2 <= (r + 2.4) * (r + 2.4) && BAY[bi(mx + dx, my + dy)] < 0.28 * amt) raw(mx + dx, my + dy, P.lichen);
    }
    raw(mx - 1, my - 1, P.sage); raw(mx + 1, my + 1, P.sage); raw(mx + 2, my + 1, P.sage); raw(mx - 2, my + 2, P.sage);
    return mx;
  }
  function drawSun(amt) {
    if (amt <= 0.05) return;
    const sx = Math.round(W * 0.24), sy = HY - Math.round(HY0 * (0.2 + amt * 0.6)), r = Math.max(4, Math.round(Math.min(W, H) * 0.06));
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r * 0.3 || sy + dy >= HY) continue;
      if (BAY[bi(sx + dx, sy + dy)] < amt * 1.2) raw(sx + dx, sy + dy, P.sun);
    }
  }
  function drawAurora(a, t) {
    if (a <= 0.02) return;
    const hy = HY0 + DY;
    for (let x = 0; x < W; x++) {
      const env = smooth(0.15, 0.7, 0.5 + 0.5 * Math.sin(x * 0.011 + 1.3 + t * 0.04));
      if (env <= 0) continue;
      const yb = hy * (0.4 + 0.06 * Math.sin(x * 0.03 + t * 0.3) + 0.03 * Math.sin(x * 0.09 - t * 0.2));
      const ray = 0.5 + hash(x >> 1, 77, 0) * 0.9;
      const L = hy * (0.14 + 0.14 * (0.5 + 0.5 * Math.sin(x * 0.045 + t * 0.25 + 1))) * ray;
      const streak = (0.85 + 0.15 * Math.sin(x * 1.3 + 3 * Math.sin(t * 0.7 + x * 0.1))) * env;
      for (let y = Math.max(0, Math.floor(yb - L)); y <= Math.floor(yb) && y < HY; y++) {
        const d = (yb - y) / L, k = a * 1.05 * Math.pow(1 - d, 1.1) * streak, th = BAY[bi(x, y)];
        if (k > 0.86 + th * 0.12) buf[y * W + x] = U32[P.sprout];
        else if (k > 0.8 + th * 0.2) buf[y * W + x] = U32[P.canopy];
        else if (k > 0.42 + th * 0.3) buf[y * W + x] = U32[P.canopyDk];
        else if (k > 0.08 + th * 0.45) buf[y * W + x] = U32[P.moss];
      }
      // Claude's single warm thread returns with the original aurora, after the sun has set.
      if (a > 0.65 && x > W * 0.1 && x < W * 0.9) raw(x, Math.round(yb) + 1, P.saffron);
    }
  }
  function drawClouds(t) {
    const hy = HY0 + DY;
    for (const c of clouds) {
      const span = W + 100, cx = Math.floor((((c.x + t * c.v * 6 + CZ * 1.5) % span) + span) % span) - 50, base = Math.round(8 + c.y * hy * 0.5);
      if (base >= HY) continue;
      for (const [ox, rr] of [[-0.4, 0.17], [-0.1, 0.27], [0.2, 0.21], [0.42, 0.14]]) {
        const pr = Math.max(2, Math.round(c.w * rr * 0.9)), pcx = Math.round(cx + ox * c.w);
        for (let y = -pr; y <= 0; y++) for (let x = -pr; x <= pr; x++) {
          if (x * x + y * y > pr * pr + pr * 0.5) continue;
          const low = y > -2 && ((pcx + x + base + y) & 1) === 0;
          put(pcx + x, base + y, low ? S.CLOUD : S.CLOUDL);
        }
      }
    }
  }
  // the night scroll's three ranges of rolling hills, panning in whole pixels as you walk
  const WWH = 640;
  const LAYERS = [
    { r: 'HILL0', base: 0.70, a1: 0.13, a2: 0.05, k1: 2, k2: 5, ph: 0.7, sp: 1.1, pines: 0.05 },
    { r: 'HILL1', base: 0.83, a1: 0.09, a2: 0.04, k1: 3, k2: 7, ph: 1.9, sp: 2.2, pines: 0.035 },
    { r: 'HILL2', base: 0.97, a1: 0.035, a2: 0.025, k1: 4, k2: 9, ph: 0.3, sp: 3.9, pines: 0 }
  ];
  function drawHills(t, anim) {
    if (HY <= 0) return;
    LAYERS.forEach((L, li) => {
      const role = S[L.r], pan = Math.floor(CZ * L.sp + CX * (li + 1));
      for (let x = 0; x < W; x++) {
        const xw = (((x + pan) % WWH) + WWH) % WWH;
        const mountain = inRange(CZ, 68, 124, 18);
        const ridge = Math.abs(Math.sin((TAU * (L.k1 + 1) * xw) / WWH + L.ph));
        const round = L.base + L.a1 * Math.sin((TAU * L.k1 * xw) / WWH + L.ph) + L.a2 * Math.sin((TAU * L.k2 * xw) / WWH + L.ph * 2.3) + 0.012 * Math.sin((TAU * 13 * xw) / WWH);
        const crag = L.base - 0.22 + ridge * 0.25 + 0.02 * Math.sin(xw * 0.11);
        const cy = DY + Math.round(HY0 * lerp(round, crag, mountain));
        const bottom = li === 2 ? HY + 2 + Math.round(1.5 * Math.sin(xw * 0.07) + 1.5 * Math.sin(xw * 0.19 + 1)) : HY + 1;
        for (let y = Math.max(0, cy); y < bottom && y < H; y++) put(x, y, role);
        if (li === 0 && mountain > 0.5 && ridge < 0.28) for (let y = Math.max(0, cy); y < cy + 2 + (hash(xw, 3, 94) * 3 | 0) && y < H; y++) raw(x, y, P.sage);
        const h = hash(xw, li, 40);
        if (L.pines && h < L.pines) {
          const ph = 4 + ((hash(xw, li, 41) * 4) | 0);
          for (let i = 0; i < ph; i++) { const half = i >> 1; for (let d = -half; d <= half; d++) put(x + d, cy - ph + i, role); }
        } else if (li === 2 && h < 0.2) {
          const sway = anim && ((Math.floor(t * 1.1 + hash(xw, 3, 42) * 7) % 3) === 0) ? 1 : 0;
          put(x + sway, cy - 1, role); if (h < 0.08) put(x + sway, cy - 2, role);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ ground: the map, read row by row */
  const HZ = [0.95, 0.95, 0.9, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.22, 0.16, 0.1, 0.06];
  function drawGround(tick, moonX) {
    const moonOn = hourVal('moon') > 0.3 && moonX != null;
    for (let y = Math.max(0, HY + 1); y < H; y++) {
      const yi = y - DY;
      if (yi <= HY0 || yi >= H) continue;
      const g = G[yi], sc = SC[yi], wz = CZ + g, detail = (4 * PXW) / sc;
      const haze = HZ[yi - HY0 - 1] || 0, fogk = fogAt(g);
      for (let x = 0; x < W; x++) {
        const wx = CX + (x - W / 2) / sc;
        let r = ground(wx, wz, detail);
        if (r === S.W0) {
          if (((Math.floor(wz * 4) + tick) % 11) === 0 && hash(Math.floor(wx * 2), Math.floor(wz * 4), 2) < 0.3) r = S.WHI;
          if (moonOn && Math.abs(x - moonX) < 3 && hash(x, y, tick + 50) < 0.3) r = S.WHI;
        }
        const t = BAY[bi(x, y)];
        if (t < haze) r = S.HILL2; else if (t < fogk) r = S.FOG;
        buf[y * W + x] = roleColor(x, y, r);
      }
    }
  }

  /* ------------------------------------------------------------------ billboards */
  // a blob tree, the night scroll's own: four discs lit from the upper left, sway in the top half
  function drawTree(sx, sy, r, seed, anim, t, tick) {
    if (r < 1.2) { fput(sx, sy - 1, S.T2); fput(sx, sy - 2, S.T3); return; }
    r = Math.min(r, 70);
    const h = Math.max(1, Math.round(r * 0.8)), cx = Math.round(sx), cy = Math.round(sy - h - r * 0.55), tw = Math.max(0, Math.round(r * 0.13));
    for (let i = 0; i <= h + Math.round(r * 0.3); i++) for (let k = -tw; k <= tw + 1; k++) fput(cx + k, sy - i, k > 0 ? S.TRKL : S.TRK);
    const sw = anim ? Math.round(Math.sin(t * 0.9 + seed) * Math.min(2, r * 0.08)) : 0;
    // Branch forks follow Claude's tree anatomy. The canopy sheds individual
    // clusters through autumn; winter leaves the same tree's branches visible.
    for (const [dx, dy] of [[-0.8, -0.35], [-0.5, -0.95], [0.5, -1], [0.85, -0.3]]) {
      const bx = cx + dx * r, by = cy + dy * r;
      fline([[cx, sy - h * 0.65], [cx + dx * r * 0.4, cy + r * 0.3], [bx, by]], S.TRK, Math.max(1, r * 0.05));
      fline([[bx, by], [bx + dx * r * 0.25, by - r * 0.25]], S.TRKL, Math.max(1, r * 0.025));
    }
    const blobs = [[0, 0, r], [-r * 0.55, r * 0.28, r * 0.7], [r * 0.55, r * 0.3, r * 0.68], [0, -r * 0.5, r * 0.66]];
    const cell = Math.max(1, Math.round(r / 14));
    for (let y = Math.floor(cy - r * 1.3); y <= Math.ceil(cy + r * 0.95); y++) {
      if (y < 0 || y >= H) continue;
      const shear = Math.round(sw * sat((cy + r - y) / (2 * r)));
      for (let x = Math.floor(cx - r * 1.4); x <= Math.ceil(cx + r * 1.4); x++) {
        let inside = false;
        for (const b of blobs) { const dx = x - cx - b[0], dy = y - cy - b[1]; if (dx * dx + dy * dy <= b[2] * b[2]) { inside = true; break; } }
        if (!inside) continue;
        const lt = (-(x - cx) * 0.5 - (y - cy) * 0.85) / r;
        let lv = lt > 0.62 ? 3 : lt > 0.0 ? 2 : lt > -0.55 ? 1 : 0;
        const hh = hash(Math.floor((x - cx) / cell), Math.floor((y - cy) / cell), seed + 60);
        if (hh > 1 - fallWeight * 0.55 - snowWeight * 0.97) continue;
        if (hh < 0.14 && lv < 3) lv++; else if (hh > 0.92 && lv > 0) lv--;
        if (anim && hash(Math.floor(x / cell), Math.floor(y / cell), tick + seed) < 0.03 && lv < 3) lv++;
        fput(x + shear, y, lv === 3 ? S.T3 : lv === 2 ? S.T2 : lv === 1 ? S.T1 : S.T0);
      }
    }
    if (anim && fallWeight > 0.1 && snowWeight < 0.5) for (let i = 0; i < 8; i++) {
      const phase = (t * 0.13 + hash(i, seed, 72)) % 1;
      const lx = cx + (hash(i, seed, 73) - 0.5) * r * 2 + Math.sin(phase * 6 + seed) * r * 0.16;
      const ly = cy - r * 0.4 + phase * (sy - cy + r * 0.4);
      fput(Math.round(lx), Math.round(ly), i % 2 ? S.T3 : S.TUFT);
    }
  }
  function drawPine(sx, sy, hp) {
    if (hp < 3) { fput(sx, sy - 1, S.PINE1); return; }
    hp = Math.min(hp, 260);
    const trunk = Math.max(1, Math.round(hp * 0.12)), tw = Math.max(0, Math.round(hp * 0.025)), body = hp - trunk, top = sy - hp;
    for (let i = 0; i < trunk + 2; i++) for (let k = -tw; k <= tw; k++) fput(sx + k, sy - i, S.TRK);
    for (let y = 0; y < body; y++) {
      const u = y / body, tier = (u * 4) % 1;
      const half = Math.round((0.05 + u * 0.27) * hp * (0.62 + 0.38 * tier));
      for (let x = -half; x <= half; x++) fput(sx + x, top + y, x < -half * 0.4 ? S.T2 : x > half * 0.45 ? S.PINE0 : S.PINE1);
    }
  }
  function drawRock(sx, sy, r) {
    r = Math.max(1, Math.round(Math.min(r, 80)));
    for (let dy = -r; dy <= 0; dy++) for (let dx = -Math.round(r * 1.4); dx <= Math.round(r * 1.4); dx++) {
      const e = (dx * dx) / (r * r * 1.96) + (dy * dy) / (r * r);
      if (e > 1) continue;
      fput(sx + dx, sy + dy, dx < -r * 0.3 && dy < -r * 0.45 ? S.ROCKHI : dy > -r * 0.3 ? S.ROCK0 : S.ROCK1);
    }
  }
  function drawBush(sx, sy, r, seed) {
    r = Math.max(1, Math.round(Math.min(r, 80)));
    for (let dy = -r * 1.6; dy <= 0; dy++) for (let dx = -r * 1.3; dx <= r * 1.3; dx++) {
      const e = (dx * dx) / (r * r * 1.69) + ((dy + r * 0.8) ** 2) / (r * r * 0.64);
      if (e > 1) continue;
      const lt = (-dx - (dy + r * 0.8)) / r, hh = hash(dx, dy, seed);
      fput(sx + dx, sy + dy, lt > 0.5 || hh < 0.08 ? S.T3 : lt > -0.2 ? S.T2 : S.T1);
    }
  }
  function drawCottage(sx, sy, s, o, lampAmt) {
    paintCottage(sx, sy, s, o, lampAmt, {fput, frect, raw, S, P, BAY, bi});
  }
  function drawSign(sx, sy, s) {
    const ph = Math.round(1.1 * s), pw = Math.max(1, Math.round(0.08 * s));
    frect(Math.round(sx), sy - ph, pw, ph, S.TRK);
    const bw = Math.round(0.8 * s), bh = Math.max(1, Math.round(0.22 * s));
    frect(Math.round(sx), sy - ph + Math.round(0.1 * s), bw, bh, S.WOOD);
    frect(Math.round(sx), sy - ph + Math.round(0.1 * s) + bh, bw, Math.max(1, Math.round(bh / 3)), S.WOODD);
  }
  // seen end-on from the path: a seat in profile, its back on the outer side, so two benches face each other
  function drawBench(sx, sy, s, face) {
    const dw = Math.max(2, Math.round(0.55 * s)), seat = Math.round(0.45 * s), th = Math.max(1, Math.round(0.09 * s)), back = Math.round(0.95 * s);
    const x0 = Math.round(sx - dw / 2), outer = face > 0 ? x0 : x0 + dw - th;
    frect(x0, sy - seat, dw, th, S.WOOD);
    frect(outer, sy - back, th, back, S.WOODD);
    frect(face > 0 ? x0 + dw - th : x0, sy - seat, th, seat, S.WOODD);
    frect(outer + (face > 0 ? th : -Math.max(1, Math.round(0.12 * s))), sy - back + th, Math.max(1, Math.round(0.12 * s)), th, S.WOOD);
  }
  function drawLantern(sx, sy, s, lampAmt, tick, anim) {
    const ph = Math.round(1.6 * s), pw = Math.max(1, Math.round(0.07 * s)), X = Math.round(sx);
    frect(X, sy - ph, pw, ph, S.TRK);
    const lb = Math.max(1, Math.round(0.22 * s));
    frect(X - Math.floor(lb / 2), sy - ph - lb, lb + pw, lb, S.TRK);
    const lx = X, ly = sy - ph - Math.ceil(lb / 2);
    if (lampAmt > 0.15) {
      const R = Math.max(3, Math.round(0.9 * s));
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > 2 && d2 <= R * R && BAY[bi(lx + dx, ly + dy)] < 0.34 * lampAmt * (1 - Math.sqrt(d2) / R)) raw(lx + dx, ly + dy, P.glow);
      }
      raw(lx, ly, anim && tick % 5 === 0 ? P.clay : P.saffron);
      if (lb > 2) raw(lx + 1, ly, P.saffron);
    }
  }
  function drawBoat(sx, sy, s) {
    const L = Math.round(1.9 * s), h = Math.max(1, Math.round(0.3 * s)), x0 = Math.round(sx - L / 2);
    for (let j = 0; j < h; j++) { const ins = Math.round((j / h) * L * 0.12); for (let i = ins; i < L - ins; i++) fput(x0 + i, sy - h + j, j === 0 ? S.WOOD : S.WOODD); }
    fline([[x0 + L * 0.7, sy - h], [x0 + L * 1.05, sy + h * 0.6]], S.WOOD, Math.max(1, s * 0.05));
  }
  function drawReeds(sx, sy, s, seed, anim, t) {
    const hh = Math.round(0.6 * s), off = anim ? Math.round(Math.sin(t * 0.8 + seed) * Math.min(1, s * 0.05)) : 0;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(sx + k * Math.max(1, s * 0.12)), h = Math.round(hh * (k === 0 ? 1 : 0.75));
      for (let i = 0; i < h; i++) fput(x + (i > h * 0.7 ? off : 0), sy - i, S.REED);
      if (k === 0 && s > 6) { fput(x + off, sy - h, S.TRK); fput(x + off, sy - h - 1, S.TRK); }
    }
  }
  const CAT = ['k...k', 'kk.kk', 'kekek', 'kkkkk', '.kkk.', '.kkkk', 'kkkkk'];
  function drawCat(sx, sy, s, anim, tick) {
    const k = Math.max(1, Math.round(s * 0.09)), x0 = Math.round(sx - 2.5 * k), y0 = sy - CAT.length * k;
    const blink = anim && tick % 23 === 0;
    CAT.forEach((row, j) => [...row].forEach((c, i) => {
      if (c === '.') return;
      for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) {
        if (c === 'e' && !blink) raw(x0 + i * k + a, y0 + j * k + b, P.sprout); else fput(x0 + i * k + a, y0 + j * k + b, S.G1);
      }
    }));
    // the tail curls around the step
    for (let i = 0; i < 3 * k; i++) fput(x0 + 5 * k + i, sy - 1 - Math.round(Math.sin(i / k) * k), S.G1);
  }

  // the orchard's broad tree (landscape.js orchardTree), painted in roles so each hour lights it
  function drawOrchardTree(x, y, s, t) {
    const r = rng(840);
    for (let j = 0; j < 5; j++) frect(x - 34 * s + j * 3 * s, y + j * s, (76 - j * 5) * s, Math.max(1, s), S.G1);
    fline([[x - 19 * s, y + 2 * s], [x - 5 * s, y - 8 * s], [x + 3 * s, y - 31 * s], [x - 4 * s, y - 66 * s], [x + 2 * s, y - 99 * s]], S.TRK, 10 * s);
    fline([[x - 17 * s, y], [x - 2 * s, y - 9 * s], [x + 8 * s, y - 31 * s], [x + 1 * s, y - 67 * s], [x + 4 * s, y - 100 * s]], S.TRKL, 4 * s);
    fline([[x - 12 * s, y], [x + 1 * s, y - 10 * s], [x + 6 * s, y - 32 * s], [x, y - 57 * s]], S.TRKL, s);
    const clusters = [];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.399, rr = 18 + Math.sqrt(i / 14) * 27, bx = x + Math.cos(a) * rr * s, by = y - (80 + Math.sin(a) * rr * 0.5) * s;
      fline([[x + 4 * s, y - 42 * s], [x + (bx - x) * 0.45, y - 67 * s], [bx, by]], S.TRK, (i < 5 ? 4 : 2) * s);
      clusters.push([bx, by, (12 + r() * 8) * s]);
    }
    clusters.sort((a, b) => a[1] - b[1]);
    const st = Math.max(1, s);
    for (const [cx, cy, rad] of clusters) {
      for (let dy = -rad; dy < rad; dy += st) for (let dx = -rad; dx < rad; dx += st) {
        if (dx * dx + dy * dy > rad * rad * (0.88 + r() * 0.2)) continue;
        const light = (dx - dy) / (rad * 2) + r() * 0.4;
        frect(Math.round(cx + dx), Math.round(cy + dy), Math.ceil(st), Math.ceil(st), light > 0.6 ? S.T3 : light > 0.25 ? S.T2 : light > -0.12 ? S.T1 : S.T0);
      }
    }
    fline([[x, y - 51 * s], [x - 13 * s, y - 71 * s], [x - 18 * s, y - 93 * s]], S.TRK, 3 * s);
    const ax = x - 19 * s, ay = y - 74 * s, fr = Math.max(1, Math.round(4 * s));
    frect(ax, ay - 6 * s, Math.max(1, s), 6 * s, S.T1);
    for (let j = -fr; j <= fr; j++) { const w = Math.floor(Math.sqrt(fr * fr - j * j)); for (let i = -w; i <= w; i++) raw(Math.round(ax + i), Math.round(ay + j), P.fruit0); }
    const f2 = Math.max(1, Math.round(3 * s));
    for (let j = -f2; j <= f2; j++) { const w = Math.floor(Math.sqrt(f2 * f2 - j * j)); for (let i = -w; i <= w; i++) raw(Math.round(ax - s + i), Math.round(ay - s + j), P.saffron); }
    raw(Math.round(ax - 2 * s), Math.round(ay - 2 * s), P.fruitHi);
  }
  // Shadow keeps the puppy’s bark and upward gaze; its six tail poses move independently.
  const PET = [0, 1].map(frame => Array.from({ length: 6 }, (_, pose) => {
    const c = spriteCanvas('puppy', frame, 1, pose);
    return new Uint32Array(c.getContext('2d').getImageData(0, 0, 32, 24).data.buffer);
  }));
  function paintPuppy(target, x, y, s, t, hi) {
    const k = Math.max(1, Math.round(s * 0.75));
    const cyc = t % 1.5;
    const hop = hi > 0 ? Math.abs(Math.sin(hi * 6)) * 5 : cyc > 0.16 && cyc < 0.66 ? Math.sin((cyc - 0.16) / 0.5 * Math.PI) * 4.5 : 0;
    const frame = hi > 0 || hop > 3 ? 1 : Math.floor(t * 5) % 2;
    const pose = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1][Math.floor(t * 12) % 10];
    const src = PET[frame][pose], x0 = Math.round(x), y0 = Math.round(y - 23 * k - hop * s);
    for (let j = 0; j < 24; j++) for (let i = 0; i < 32; i++) {
      const c = src[j * 32 + i]; if (!(c >>> 24)) continue;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const X = x0 + i * k + dx, Y = y0 + j * k + dy;
        if (X >= 0 && X < W && Y >= 0 && Y < H) target[Y * W + X] = c;
      }
    }
  }
  function drawDog(x, y, s, t, hi) { paintPuppy(buf, x, y, s, t, hi); }

  // the ghost ship: the harbour's own drawing, read once from the page, revealed hull first as the section scrolls
  let SHIP = null;
  (() => {
    const svg = doc.querySelector('.ship svg');
    if (!svg || !win.XMLSerializer) return;
    const im = new Image();
    im.onload = () => {
      const c = doc.createElement('canvas'); c.width = 64; c.height = 40;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 40);
      const d = x.getImageData(0, 0, 64, 40).data, px = new Int16Array(64 * 40).fill(-1);
      const near = (r, g, b) => { let best = 0, bd = 1e12; for (const n of ['sage', 'moss', 'lichen', 'bone', 'soil']) { const h = HEX[n], dr = r - parseInt(h.slice(1, 3), 16), dg = g - parseInt(h.slice(3, 5), 16), db = b - parseInt(h.slice(5, 7), 16), q = dr * dr + dg * dg + db * db; if (q < bd) { bd = q; best = P[n]; } } return best; };
      for (let i = 0; i < 64 * 40; i++) if (d[i * 4 + 3] > 128) px[i] = near(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      SHIP = px;
    };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  })();
  function drawShip(sx, sy, s, build, t, anim) {
    if (!SHIP || build <= 0.01) return;
    const k = Math.max(1, Math.round(s * 0.11)), x0 = Math.round(sx - 32 * k), bob = anim ? Math.round(Math.sin(t * 1.2) * k * 0.6) : 0;
    const y0 = Math.round(sy - 34 * k) + bob, from = Math.floor(40 - build * 40);
    for (let j = from; j < 40; j++) for (let i = 0; i < 64; i++) {
      const c = SHIP[j * 64 + i];
      if (c < 0) continue;
      for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) raw(x0 + i * k + a, y0 + j * k + b, c);
    }
  }


  /* ------------------------------------------------------------------ the orchard, painted by its own code
     landscape.js's valley, broad tree and dog, ported line for line to whole pixels in a second buffer, so the
     walk can ease into the orchard in whole pixels and it never arrives as a block with an edge. */
  const HEXU = new Map();
  const hu = (h) => { let v = HEXU.get(h); if (v === undefined) { v = (0xff000000 | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0; HEXU.set(h, v); } return v; };
  let OB = null;
  const orect = (h, x, y, w, hh) => { const c = hu(h); x = Math.round(x); y = Math.round(y); w = Math.max(1, Math.round(w)); hh = Math.max(1, Math.round(hh)); for (let j = y; j < y + hh; j++) { if (j < 0 || j >= H) continue; for (let i = x; i < x + w; i++) if (i >= 0 && i < W) OB[j * W + i] = c; } };
  const odisk = (h, x, y, r) => { for (let j = -r; j <= r; j++) { const w = Math.floor(Math.sqrt(r * r - j * j)); orect(h, x - w, y + j, w * 2 + 1, 1); } };
  const oline = (h, pts, wd) => {
    const c = hu(h), half = Math.max(0, Math.round(wd) - 1) / 2;
    for (let k = 1; k < pts.length; k++) {
      let [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy, n = 0;
      while (n++ < 4000) {
        for (let j = -Math.floor(half); j <= Math.ceil(half); j++) for (let i = -Math.floor(half); i <= Math.ceil(half); i++) { const X = x0 + i, Y = y0 + j; if (X >= 0 && X < W && Y >= 0 && Y < H) OB[Y * W + X] = c; }
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
      }
    }
  };
  const B16 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function oValley(w, h, t, night) {
    const horizon = Math.round(h * 0.56), r = rng(2019);
    const sky = ['#655263', '#9c6971', '#c6856c', '#dfa075', '#e9bb82'], bh = horizon + 24;
    for (let y = 0; y < bh; y++) { const pp = (y / bh) * (sky.length - 1), i = Math.min(sky.length - 2, Math.floor(pp)), f = pp - i; for (let x = 0; x < w; x++) orect(B16[(y % 4) * 4 + (x % 4)] / 16 < f ? sky[i + 1] : sky[i], x, y, 1, 1); }
    odisk('#f3d5a0', Math.round(w * 0.24), Math.round(horizon - 13), Math.round(Math.min(w, h) * 0.067));
    for (let i = 0; i < 7; i++) { const cx = ((i * 83 + t * 0.2) % (w + 70)) - 40, cy = 18 + (i % 3) * 17, k = 1 + (i % 2) * 0.4; for (const [dx, dy, ww, hh] of [[0, 0, 34, 3], [6, -3, 22, 3], [12, -6, 11, 3], [28, 1, 18, 2], [-5, 2, 17, 2]]) orect('#b47d78', cx + dx * k, cy + dy * k, ww * k, hh * k); }
    const hills = ['#69686c', '#626d60', '#73794f', '#7e824d'];
    for (let layer = 0; layer < 4; layer++) for (let x = 0; x < w; x++) { const y = horizon + layer * 15 + Math.sin(x * 0.019 + layer * 1.9) * 12 + Math.sin(x * 0.048 + layer) * 4; orect(hills[layer], x, Math.floor(y), 1, h - y); }
    for (let y = horizon + 13; y < h; y++) {
      const pp = (y - horizon - 13) / (h - horizon - 13), x = w * (0.43 + Math.sin(pp * 5.5 + 0.1) * 0.16), half = 1 + Math.pow(pp, 1.7) * w * 0.095;
      orect('#a09269', x - half - 2, y, half * 2 + 4, 1); orect('#c1b38b', x - half, y, half * 2, 1);
      if (y % 4 === 0) { const shine = (Math.sin(y * 0.33 + t * 0.6) + 1) / 2; orect('#dfc592', x - half + shine * half, y, Math.max(1, half * 0.6), 1); }
    }
    for (let i = 0; i < 700; i++) {
      const x = r() * w, y = horizon + 16 + r() * (h - horizon - 16), pp = (y - horizon) / (h - horizon), rx = w * (0.43 + Math.sin(((y - horizon - 13) / (h - horizon - 13)) * 5.5 + 0.1) * 0.16);
      if (Math.abs(x - rx) < 3 + Math.pow(clamp((y - horizon - 13) / (h - horizon - 13), 0, 1), 1.7) * w * 0.095) continue;
      const c = ['#a9a263', '#666f48', '#c1ac6b'][i % 3];
      orect(c, x, y, 1 + Math.floor(pp * 2), 1); if (i % 7 === 0) orect(c, x, y - 2, 1, 3);
    }
    for (let i = 0; i < 10; i++) { const x = (i * w) / 9 + Math.sin(i) * 9, y = horizon + 18 + Math.sin(x * 0.019 + 1.9) * 12; orect('#354a35', x, y - 9, 2, 11); for (let j = -4; j <= 4; j++) orect('#38553d', x - Math.floor(5 - Math.abs(j) / 2), y - 8 + j, 10 - Math.abs(j), 1); }
  }
  function oTree(x, y, s, t) {
    const r = rng(840);
    for (let j = 0; j < 5; j++) orect('#3b4930', x - 34 * s + j * 3 * s, y + j * s, (76 - j * 5) * s, s);
    oline('#39402c', [[x - 19 * s, y + 2 * s], [x - 5 * s, y - 8 * s], [x + 3 * s, y - 31 * s], [x - 4 * s, y - 66 * s], [x + 2 * s, y - 99 * s]], 10 * s);
    oline('#72754b', [[x - 17 * s, y], [x - 2 * s, y - 9 * s], [x + 8 * s, y - 31 * s], [x + 1 * s, y - 67 * s], [x + 4 * s, y - 100 * s]], 4 * s);
    oline('#a29b60', [[x - 12 * s, y], [x + 1 * s, y - 10 * s], [x + 6 * s, y - 32 * s], [x, y - 57 * s]], s);
    const cl = [];
    for (let i = 0; i < 14; i++) { const a = i * 2.399, rr = 18 + Math.sqrt(i / 14) * 27, bx = x + Math.cos(a) * rr * s, by = y - (80 + Math.sin(a) * rr * 0.5) * s; oline('#424b31', [[x + 4 * s, y - 42 * s], [x + (bx - x) * 0.45, y - 67 * s], [bx, by]], (i < 5 ? 4 : 2) * s); cl.push([bx, by, (12 + r() * 8) * s]); }
    cl.sort((a, b) => a[1] - b[1]);
    const st = Math.max(1, s);
    for (const [cx, cy, rad] of cl) for (let dy = -rad; dy < rad; dy += st) for (let dx = -rad; dx < rad; dx += st) {
      if (dx * dx + dy * dy > rad * rad * (0.88 + r() * 0.2)) continue;
      const light = (dx - dy) / (rad * 2) + r() * 0.4;
      orect(light > 0.6 ? '#b5ad69' : light > 0.25 ? '#829252' : light > -0.12 ? '#526d3e' : '#304c31', cx + dx, cy + dy, Math.ceil(st), Math.ceil(st));
    }
    oline('#424a31', [[x, y - 51 * s], [x - 13 * s, y - 71 * s], [x - 18 * s, y - 93 * s]], 3 * s);
    const ax = x - 19 * s, ay = y - 74 * s;
    orect('#3b4e2e', ax, ay - 6 * s, s, 6 * s); orect('#9ab16a', ax + s, ay - 6 * s, 4 * s, s);
    odisk('#9d5529', Math.round(ax), Math.round(ay), Math.round(4 * s)); odisk('#e8982a', Math.round(ax - s), Math.round(ay - s), Math.round(3 * s)); orect('#ffe0a0', ax - 2 * s, ay - 2 * s, s, 2 * s);
    for (let i = 0; i < 3; i++) { const k = (t * 0.035 + i * 0.31) % 1; orect(i % 2 ? '#8d9c5d' : '#a9b56b', x + (Math.sin(k * 5 + i) * 18 - 24) * s, y - (76 - k * 72) * s, 2 * s, s); }
  }
  function oDog(x, y, s, t, hi) { paintPuppy(OB, x, y, s, t, hi); }
  function drawOrchardScene(t, night) {
    OB = buf2;
    const w = W, h = H, band = Math.round(h * (h / w > 1.3 ? 0.78 : 0.86));
    oValley(w, h, t, night);
    const x = w * 0.74, y = band * 0.9, sc = Math.max(1, Math.round(Math.min(w / 260, band / 120) * 2) / 2);
    oTree(x, y, sc, t); oDog(x - 39 * sc, y + 2 * sc, sc, t, hello);
    // Shade the existing valley, keeping its river and texture continuous.
    // There is no second ground painting or grass row to expose a section edge.
    for (let yy = Math.floor(h * 0.72); yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const a = smooth(h * 0.72, h, yy + Math.sin(xx * 0.03) * 3) * 0.42;
      const k = yy * w + xx, c = OB[k], ia = 1 - a;
      OB[k] = (0xff000000 | ((((c >>> 16) & 255) * ia + 23 * a) << 16) | ((((c >>> 8) & 255) * ia + 31 * a) << 8) | ((c & 255) * ia + 23 * a)) >>> 0;
    }
    if (night > 0.01) {
      const a = night * 0.75, ia = 1 - a, dr = 6 * a, dg = 19 * a, db = 22 * a;
      for (let k = 0; k < w * h; k++) { const c = OB[k]; OB[k] = (0xff000000 | ((((c >>> 16) & 255) * ia + db) << 16) | ((((c >>> 8) & 255) * ia + dg) << 8) | ((c & 255) * ia + dr)) >>> 0; }
      const rr = rng(77);
      for (let i = 0; i < 65; i++) { const sx = rr() * w, sy = rr() * h * 0.4; if (Math.sin(t * 0.3 + i) > 0.2 - night) orect('#dde7cf', sx, sy, 1, 1); }
      odisk('#d9dfbd', Math.round(w * 0.82), Math.round(h * 0.18), 6); odisk('#163029', Math.round(w * 0.82 + 3), Math.round(h * 0.18 - 2), 6);
    }
  }

  /* ------------------------------------------------------------------ the story: stations along the walk
     [selector, z on arrival, z on leaving, hour, look up (0..1), fog (0..1)] */
  const STATIONS = [
    ['#the-meeting', -12, -4, 0, 0, 0],
    ['#the-seed', 0, 4, 0, 0, 0],
    ['#roots', 44, 52, 1, 0, 0],
    ['#partial-view', 92, 104, 2, 0, 1],
    ['#tree', 150, 161, 2, 0, 0],
    ['#the-practice', 204, 213, 2, 0, 0],
    ['#questions', 224, 232, 2, 1, 0],
    ['#influences', 250, 271, 3, 1, 0],
    ['#sky', 290, 294, 3, 1, 0],
    ['#ancestors', 294, 297, 3, 1, 0],
    ['.source-window', 318, 321, 4, 0.15, 0],
    ['.evidence-folio', 323, 328, 4, 0, 0],
    ['#the-crew', 366, 384, 4, 0, 0],
    ['#similar-trees', 426, 436, 5, 0, 0],
    ['#afterward', 437, 443, 0, 0, 0]
  ];
  // room to breathe: a stretch of the walk with nothing over it, after each of these
  const INTERLUDE_AFTER = ['#the-seed', '#roots', '#partial-view', '#tree', '#the-practice', '#questions', '#influences', '#ancestors', '.evidence-folio', '#the-crew'];
  function addInterludes() {
    INTERLUDE_AFTER.forEach((sel) => {
      const el = doc.querySelector(sel);
      if (!el || (el.nextElementSibling && el.nextElementSibling.classList.contains('pj-interlude'))) return;
      const sp = doc.createElement('div'); sp.className = 'pj-interlude'; sp.setAttribute('aria-hidden', 'true');
      el.after(sp);
    });
  }
  let stEls = [];
  const collect = () => { stEls = STATIONS.map((s) => [doc.querySelector(s[0]), s]).filter((e) => e[0]); };
  function where() {
    const vh = win.innerHeight, sy = win.scrollY || 0, keys = [];
    let prev = -1e9;
    for (const [el, s] of stEls) {
      const r = el.getBoundingClientRect(), top = r.top + sy - vh * 0.55, bot = r.bottom + sy - vh * 0.45;
      const a = Math.max(prev + 1, top), b = Math.max(a + 1, bot); prev = b;
      keys.push([a, s[1], s[3], s[4], s[5]], [b, s[2], s[3], s[4], s[5]]);
    }
    if (!keys.length) return null;
    // Leave the village through its closing reflection, before the field-guide
    // toolbar arrives. The meeting is part of the same walk as the seed.
    const entrance = doc.querySelector('.grove-thought') || stEls[0][0];
    const on = entrance.getBoundingClientRect().top < vh * 0.85;
    let i = 0;
    while (i < keys.length - 1 && sy > keys[i + 1][0]) i++;
    const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)];
    const f = B === A ? 0 : sat((sy - A[0]) / Math.max(1, B[0] - A[0]));
    const e = smooth(0, 1, f);
    const oe = doc.getElementById('similar-trees'), title = doc.querySelector('.seed-finale .seed-canvas');
    const orch = oe ? smooth(vh * 1.6, -vh * 0.15, oe.getBoundingClientRect().top) : 0;
    // Shadow stays in the orchard's light until the closing mark itself is visible.
    // The canvas uses whole pixel multiples and can be narrower than its frame on phones.
    const titleRect = title?.getBoundingClientRect();
    const tr = titleRect?.width ? titleRect : null;
    const ending = tr ? smooth(vh * 0.7, vh * 0.1, tr.top) : 0;
    const dusk = ending * 0.65;
    const rootX = tr ? (tr.left + tr.width * 5.5 / 35) / win.innerWidth : 0.5;
    const rootY = tr ? (tr.top + tr.height) / vh : 0.35;
    return { on, z: lerp(A[1], B[1], sy < keys[0][0] ? 0 : f), ha: A[2], hb: B[2], hf: e, look: lerp(A[3], B[3], e), fog: lerp(A[4], B[4], e), orch, dusk, ending, rootX, rootY };
  }
  const crewBuild = () => {
    const stage = Number(doc.getElementById('the-crew')?.dataset.crewStage ?? 0);
    return [0.45, 0.78, 1][Math.max(0, Math.min(2, stage))];
  };

  /* ------------------------------------------------------------------ draw */
  let hello = 0;
  function drawWalk(st, t, anim, tick) {
    CZ = st.z; CX = PX(CZ + GMAX * 0.3) + inRange(CZ, 220, 237, 5) * 1.5 - inRange(CZ, 138, 149, 5) * 1.2;
    DY = Math.round(st.look * (H - HY0 + 8)); HY = HY0 + DY;
    FOG = st.fog;
    setHour(st.ha, st.hb, st.hf);
    drawSky();
    drawSun(hourVal('sun'));
    const moonX = drawMoon(hourVal('moon'));
    drawStars(hourVal('stars'), tick, anim);
    drawAurora(hourVal('aurora'), t);
    drawClouds(anim ? t : 0);
    if (FOG > 0.01) for (let y = Math.max(0, HY - Math.round(HY0 * 0.5)); y < Math.min(H, HY + 1); y++) {
      const k = FOG * smooth(HY - HY0 * 0.5, HY, y);
      for (let x = 0; x < W; x++) if (BAY[bi(x, y)] < k) put(x, y, S.FOG);
    }
    drawHills(t, anim);
    if (HY < H) drawGround(tick, moonX);

    // things standing in the world, far to near
    const lampAmt = hourVal('lamp'), build = crewBuild(), vis = [];
    for (const p of props) {
      if (p.k === 'rail') continue;
      // The chapter's original close ship tells this story; keep its distant approach out of the text.
      if (p.k === 'ship') {
        const chapter = doc.getElementById('the-crew'), r = chapter?.getBoundingClientRect();
        if (chapter?.dataset.shipDeparted === 'true' || (r && r.bottom > 0 && r.top < innerHeight)) continue;
      }
      if (p.z < CZ - 3 || p.z > CZ + GMAX) continue;
      const q = project(p.d, p.z, p.k === 'fly' ? p.y + (anim ? Math.sin(t * 0.8 + p.ph) * 0.1 : 0) : 0);
      if (!q || q.y - q.s * 6 > H) continue;
      if (q.x < -q.s * 5 || q.x > W + q.s * 5) continue;
      vis.push([q, p]);
    }
    vis.sort((a, b) => b[0].zc - a[0].zc);
    let railsDone = !(CZ > 246 && CZ < 267);
    for (const [q, p] of vis) {
      if (!railsDone && p.z < 264) { drawRails(); railsDone = true; }
      FOGK = fogAt(q.zc);
      const sx = Math.round(q.x), sy = Math.round(q.y), sc = q.s;
      switch (p.k) {
        case 'tree': drawTree(sx, sy, p.r * sc, p.seed, anim, t, tick); break;
        case 'pine': drawPine(sx, sy, Math.round(p.h * sc)); break;
        case 'rock': drawRock(sx, sy, p.r * sc); break;
        case 'bush': drawBush(sx, sy, p.r * sc, p.seed); break;
        case 'cottage': drawCottage(sx, sy, sc, p, lampAmt); break;
        case 'sign': drawSign(sx, sy, sc); break;
        case 'bench': drawBench(sx, sy, sc, p.face); break;
        case 'lantern': drawLantern(sx, sy, sc, lampAmt, tick, anim); break;
        case 'post': frect(sx, sy - Math.round(0.5 * sc), Math.max(1, Math.round(0.08 * sc)), Math.round(0.5 * sc), S.WOODD); break;
        case 'boat': drawBoat(sx, sy, sc); break;
        case 'reeds': drawReeds(sx, sy, sc, p.seed, anim, t); break;
        case 'cat': drawCat(sx, sy, sc, anim, tick); break;
        case 'ship': drawShip(sx, sy, sc, build, t, anim); break;
        case 'orchard': drawOrchardTree(sx, sy, Math.max(0.05, sc * 0.03), t); break;
        case 'dog': drawDog(sx, sy, sc * 0.035, anim ? t : 0.4, hello); break;
        case 'fly': {
          if (lampAmt < 0.5) break;
          const on = anim ? Math.sin(t * 2.3 + p.ph * 5) > -0.1 : p.ph > 1.2;
          if (!on) break;
          raw(sx, sy, P.saffron);
          if (sc > PXW * 0.6) { raw(sx - 1, sy, P.glow); raw(sx + 1, sy, P.glow); raw(sx, sy - 1, P.glow); raw(sx, sy + 1, P.glow); }
          break;
        }
      }
    }
    if (!railsDone) drawRails();
    FOGK = 0;
    const birdAmt = hourVal('sun');
    if (birdAmt > 0.2 && HY > 10) for (let i = 0; i < 7; i++) {
      const bx = Math.round(W * (0.3 + i * 0.07) + (anim ? t * 2.5 : 0) % W + Math.sin(i * 3) * 12) % W, by = Math.round(HY - HY0 * (0.45 + 0.1 * Math.sin(i * 1.7)));
      const fl = anim && (Math.floor(t * 4) + i) % 2 === 0;
      put(bx - 1, by - (fl ? 1 : 0), S.HILL2); put(bx, by, S.HILL2); put(bx + 1, by - (fl ? 1 : 0), S.HILL2);
    }
  }
  // Small, slow motes share the same pixel grid as the landscape. Autumn
  // leaves descend; night fireflies rise. Stillness paints one quiet arrangement.
  function drawMotes(st, t, anim) {
    if (st.look > 0.6 || st.fog > 0.75) return;
    const autumn = st.z > 30 && st.z < 76, rr = rng(420);
    for (let i = 0; i < 28; i++) {
      const ph = rr(), speed = 0.7 + rr(), baseX = rr() * W;
      const fall = ((ph + (anim ? t * 0.011 * speed : 0)) % 1);
      const y = Math.round(H * (0.36 + (autumn ? fall : 1 - fall) * 0.64));
      const x = Math.round((baseX + Math.sin(fall * 7 + i) * 6 + W) % W);
      const color = autumn ? P.clay : i % 5 === 0 ? P.saffron : P.lichen;
      if (autumn || !anim || Math.sin(t * 0.6 + ph * 8) > 0.1) raw(x, y, color);
    }
  }

  // Come home to the mark's soil. Its roots carry on through the green credits,
  // using the same whole-pixel line painter as the orchard's trunk and branches.
  let returnBase = null, returnKey = '';
  function drawRootReturn(st, t, anim) {
    if (st.ending <= 0.001) return;
    OB = buf2;
    const rx = Math.round(st.rootX * W), ry = Math.round(st.rootY * H);
    const key = W + 'x' + H + '|' + rx + '|' + ry;
    if (key !== returnKey) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const glow = Math.exp(-Math.pow((x - rx) / (W * 0.65), 2) - Math.pow((y - ry) / (H * 0.9), 2));
        OB[y * W + x] = mixInk(hu('#071b13'), hu('#21462a'), glow * 0.8);
      }
      const span = Math.max(H * 0.72, 120);
      for (let i = 0; i < 9; i++) {
        const side = (i - 4) / 4, depth = span * (0.6 + (i % 3) * 0.16);
        const x1 = rx + side * W * 0.09, y1 = ry + depth * 0.28;
        const x2 = rx + side * W * 0.24, y2 = ry + depth * 0.64;
        const x3 = rx + side * W * 0.39, y3 = ry + depth;
        oline(i % 2 ? '#3c6940' : '#4f7c45', [[rx, ry], [x1, y1], [x2, y2], [x3, y3]], 1);
        if (side) {
          oline('#294d31', [[x2, y2], [x2 + side * W * 0.12, y2 + depth * 0.09], [x2 + side * W * 0.18, y2 + depth * 0.27]], 1);
        }
      }
      returnBase = new Uint32Array(buf2); returnKey = key;
    } else buf2.set(returnBase);
    const rr = rng(1990);
    for (let i = 0; i < 22; i++) {
      const x = rr() * W, y = rr() * H;
      if (!anim || Math.sin(t * 0.4 + i) > 0.55) orect(i % 4 ? '#3c6940' : '#92b479', x, y, 1, 1);
    }
    for (let k = 0; k < W * H; k++) buf[k] = mixInk(buf[k], buf2[k], st.ending);
  }
  function draw(st, t, anim) {
    const tick = anim ? Math.floor(t * 2.6) : 0, oa = st.orch || 0;
    if (oa < 0.999) drawWalk(st, t, anim, tick);
    if (oa > 0.001) {
      drawOrchardScene(anim ? t : 0.4, st.dusk || 0);
      if (oa >= 0.999) buf.set(buf2);
      else for (let y = 0; y < H; y++) {
        // The sky arrives first, then the hills and foreground. Mix each whole
        // pixel's colour instead of interleaving two roads in a checkerboard.
        const blend = smooth(0, 1, sat(oa * 1.7 - y / H * 0.7));
        for (let x = 0; x < W; x++) { const k = y * W + x; buf[k] = mixInk(buf[k], buf2[k], blend); }
      }
    }
    if (oa < 0.95) drawMotes(st, t, anim);
    drawRootReturn(st, t, anim);
    ctx.putImageData(img, 0, 0);
  }
  function drawRails() {
    for (const p of props) {
      if (p.k !== 'rail') continue;
      const a = project(p.a[0], p.a[1], 0.45), b = project(p.b[0], p.b[1], 0.45);
      if (!a || !b) continue;
      FOGK = 0;
      fline([[a.x, a.y], [b.x, b.y]], S.WOOD, Math.max(1, Math.min(a.s, b.s) * 0.07));
    }
  }

  /* ------------------------------------------------------------------ loop */
  const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const motionOff = () => reduced.matches || doc.body.classList.contains('still-frames') ||
    doc.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed') === 'false';
  let visible = false, raf = 0, last = 0, time = 0, zS = null, lastKey = '', lastT = 0;
  const api = (win.BodhiPixelJourney = { z: 0, on: false, frames: 0 });
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    const st = where();
    if (!st) return;
    if (st.on !== visible) { visible = st.on; root.classList.toggle('pj-on', visible); }
    api.on = visible;
    if (!visible || doc.hidden) { last = 0; return; }
    const still = motionOff();
    if (still) {
      const zq = Math.round(st.z / 3) * 3, key = zq + '|' + st.ha + st.hb + Math.round(st.hf * 4) + '|' + Math.round(st.look * 4) + '|' + Math.round(st.orch * 4) + Math.round(st.dusk * 4) + '|' + Math.round(st.ending * 16) + '|' + Math.round(st.rootY * H) + '|' + W + 'x' + H + '|' + crewBuild();
      if (key !== lastKey) { lastKey = key; draw(Object.assign({}, st, { z: zq, hf: Math.round(st.hf * 4) / 4, orch: Math.round(st.orch * 4) / 4 }), 0, false); api.frames++; }
      api.z = zq;
      return;
    }
    if (zS === null || Math.abs(st.z - zS) > 30) zS = st.z;
    zS += (st.z - zS) * (1 - Math.exp(-dt * 6));
    time += dt; if (hello > 0) hello = Math.max(0, hello - dt);
    const key = zS.toFixed(3) + st.hf.toFixed(3) + st.look.toFixed(3) + st.orch.toFixed(3) + st.dusk.toFixed(3) + st.ending.toFixed(3) + st.rootY.toFixed(3);
    if (key !== lastKey || now - lastT > 80) { lastKey = key; lastT = now; draw(Object.assign({}, st, { z: zS }), time, true); api.frames++; }
    api.z = zS;
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  let rz = 0;
  win.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); lastKey = ''; wake(); }, 150); }, { passive: true });
  win.addEventListener('scroll', wake, { passive: true });
  doc.addEventListener('bodhi:crew-stage', () => { lastKey = ''; wake(); });
  doc.addEventListener('visibilitychange', wake);
  if (reduced.addEventListener) reduced.addEventListener('change', () => { lastKey = ''; wake(); });
  new MutationObserver(() => { lastKey = ''; wake(); }).observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  // The field's toggle changes its own state, not the cinema's body class.
  // Wake the stopped landscape when motion is restored without a scroll.
  const fieldMotion = doc.querySelector('[data-motion-toggle]');
  if (fieldMotion) new MutationObserver(() => { lastKey = ''; wake(); }).observe(fieldMotion, { attributes: true, attributeFilter: ['aria-pressed'] });

  world.insertBefore(canvas, world.firstChild);
  addInterludes(); collect(); layout(); wake();
  if (doc.readyState !== 'complete') win.addEventListener('load', () => { collect(); wake(); }, { once: true });
})();
