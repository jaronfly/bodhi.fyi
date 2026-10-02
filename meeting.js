/* Bodhi · the meeting · meeting.js
   The cast of the tree world: four model-archetypes as treants, caught mid-meeting in a loose
   night circle, with the site's own dog sitting at the edge looking up. Original pixel drawing,
   one canvas pixel per art pixel, scaled by whole numbers, on the same 23-colour night discipline
   as the fixed backdrop behind it. Warmth is spent only on the characters: a cool dark ground,
   warm rim-light facing the circle, and one saffron heart per canopy. As the section scrolls
   through the viewport the four hearts ignite one by one ("every voice a light"), then a few
   warm stars open above the group.

   Motion follows the same switches as the rest of the page: system reduced-motion, the cinema's
   Stillness control (read only), and the field guide's ambient-motion switch. With any of those
   off, the scene is one complete still frame — every light already lit. It pauses offscreen and
   when the tab is hidden. No storage, no network, no globals; without script the copy above reads
   as plain text and this file does nothing. */
(() => {
  'use strict';

  const doc = document;
  const sec = doc.getElementById('the-meeting');
  if (!sec) return;

  /* ------------------------------------------------------------- palette
     The backdrop's 23 colours. The dog keeps the orchard's own four browns —
     it is the same dog, carried down the page. */
  const HEX = {
    soil: '#17231B', under: '#1F2C24', moss: '#2E3B33', lichen: '#8A968D', sage: '#B8C2BA', bone: '#F2EEE4',
    canopy: '#2E6B45', sprout: '#8BCB8B', saffron: '#E8982A', clay: '#D9674F',
    ink: '#0F1814', canopyDk: '#255039', dusk: '#38344A', glow: '#6E4F4C', dawn: '#8C7A6A',
    earth: '#3A2E27', earthL: '#5B4638', reed: '#5A5A34', rose: '#A86F85', lilac: '#8478A8'
  };
  const u32 = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
  };
  const P32 = {};
  Object.keys(HEX).forEach((k) => { P32[k] = u32(HEX[k]); });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[((y & 3) << 2) + (x & 3)];
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ------------------------------------------------------------- motion
     The same contract as claude-field.js: system setting, the cinema's Stillness
     button (read only), and the field guide's ambient-motion switch. */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const stillBtn = doc.getElementById('stillness');
  const field = doc.getElementById('field-guide');
  const stillOn = () => !!stillBtn && stillBtn.getAttribute('aria-pressed') === 'true';
  const motionNow = () => !mq.matches && !stillOn() && !(field && field.dataset.motion === 'off');

  /* ------------------------------------------------------------- scene plumbing
     Registration, pausing and scroll follow the claude-field.js pattern. */
  const cv = sec.querySelector('.meeting-canvas');
  const frame = sec.querySelector('.meeting-frame');
  if (!cv || !frame) return;
  const ctx = cv.getContext('2d');
  let cols = 0, rows = 0, img = null, buf = null, pxs = 6;
  let p = 0, lastDraw = 0, visible = false;

  const THRESH = [0.10, 0.30, 0.50, 0.70]; // ignition thresholds, one voice at a time
  const STAR_AT = 0.84;                    // then the canopy stars above

  const progressNow = () => {
    const r = sec.getBoundingClientRect();
    return clamp((innerHeight - r.top) / (r.height + innerHeight), 0, 1);
  };

  /* ------------------------------------------------------------- primitives */
  const setPx = (x, y, c) => {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < cols && y < rows) buf[y * cols + x] = c;
  };
  const seg = (x0, y0, x1, y1, w, c) => {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + dx * i / steps), y = Math.round(y0 + dy * i / steps);
      for (let j = 0; j < w; j++) for (let k = 0; k < w; k++) setPx(x + j, y + k, c);
    }
  };

  /* ------------------------------------------------------------- the four
     The ensemble caught mid-meeting: a loose arc on the ground plane, like
     people gathered at a hallway corner. Drawn back-to-front — the cloud
     joins from behind, the local stands closest. Feet sit on an ellipse
     around (0.50, 0.80): back members higher in the frame, front members
     lower; every trunk leans a few degrees toward the circle's center. */
  const CAST = [
    { key: 'cloud',    x: 0.580, feet: 0.735, h: 0.440, face: -1, kind: 'broad', lean: -0.012, tilt: -0.08 },
    { key: 'blind',    x: 0.165, feet: 0.770, h: 0.270, face:  1, kind: 'ear',   lean:  0.030, tilt:  0.26 },
    { key: 'instruct', x: 0.815, feet: 0.775, h: 0.290, face: -1, kind: 'clip',  lean: -0.030, tilt:  0 },
    { key: 'local',    x: 0.330, feet: 0.885, h: 0.205, face:  1, kind: 'round', lean:  0.016, tilt:  0.17 }
  ];
  const DOG = { x: 0.505, feet: 0.935 };

  /* Trunk and roots. face +1 looks right. lean bends the top toward the circle. */
  const trunk = (x, feet, h, face, lean) => {
    const w = Math.max(2, Math.round(h * 0.105));
    const topX = x + lean;
    const midX = x + lean * 0.5;
    seg(x - w, feet, x - 1, feet - Math.max(1, Math.round(h * 0.06)), 1, P32.earth);
    seg(x + w, feet, x + 1, feet - Math.max(1, Math.round(h * 0.06)), 1, P32.earth);
    seg(x, feet - 1, midX, feet - h * 0.55, w, P32.earth);
    seg(midX, feet - h * 0.55, topX, feet - h, w, P32.earth);
    // one lit edge facing the circle's light, broken like bark, never a full stripe
    const litX = face > 0 ? x + w - 1 : x;
    for (let yy = Math.round(feet - h * 0.12); yy > feet - h * 0.92; yy--) {
      if (bayer(litX, yy) > 0.45) setPx(litX + Math.round((topX - x) * (feet - yy) / h), yy, P32.earthL);
    }
    setPx(x + (face > 0 ? 0 : w - 1), Math.round(feet - h * 0.72), P32.lichen);
    setPx(x + (face > 0 ? w - 1 : 0), Math.round(feet - h * 0.4), P32.moss);
    return { x, feet, h, w, face, topX, topY: feet - h };
  };

  /* Branch arms: a short line from the trunk, bent once, with a lighter tip.
     col lets a tucked arm recede (instruct holds its arms close, almost
     behind the trunk); hand adds a two-pixel twig, a gesture mid-point. */
  const arm = (t, side, ay, ax, ay2, col, hand) => {
    const x0 = Math.round(t.x + (side > 0 ? t.w - 1 : 0));
    const y0 = Math.round(t.feet - t.h * ay);
    const mx = Math.round((x0 + ax) / 2), my = Math.round(y0 + (ay2 - y0) * 0.4);
    const c = col || P32.earthL;
    seg(x0, y0, mx, my, 1, c);
    seg(mx, my, Math.round(ax), Math.round(ay2), 1, c);
    setPx(Math.round(ax), Math.round(ay2), P32.earth);
    if (hand) {
      setPx(Math.round(ax), Math.round(ay2) - 1, P32.earth);
      setPx(Math.round(ax) + (ax >= x0 ? 1 : -1), Math.round(ay2), P32.earthL);
    }
  };

  /* Canopy: clustered lumps with gaps that read as foliage; rim-light on the side
     facing the circle; optional lit heart of one saffron pixel in a warm halo.
     tilt shears the whole crown a few degrees (a listening ear leans in, a
     just-arrived one still carries its momentum); the blind one's ear-canopy
     cups a darker hollow toward the voices. */
  const canopy = (t, r, c, lit, tNow, idx) => {
    const kind = c.kind, tilt = c.tilt || 0;
    const cx = t.topX + t.face * r * (kind === 'ear' ? 0.55 : 0.12);
    const cy = t.topY - r * 0.62;
    const rx = r * (kind === 'ear' ? 1.5 : kind === 'broad' ? 1.2 : 0.95);
    const ry = r * (kind === 'ear' ? 0.58 : kind === 'clip' ? 0.85 : kind === 'broad' ? 0.9 : 0.95);
    const lumps = kind === 'broad'
      ? [[0, 0, 1], [-0.7, 0.22, 0.55], [0.7, 0.22, 0.55], [-0.4, -0.62, 0.48], [0.4, -0.62, 0.48], [0, -0.9, 0.42]]
      : kind === 'clip'
        ? [[0, 0, 1], [-0.55, 0.10, 0.5], [0.55, 0.10, 0.5], [-0.30, -0.42, 0.38], [0.30, -0.42, 0.38]]
        : [[0, 0, 1], [-0.74, 0.24, 0.52], [0.74, 0.24, 0.52]];
    const inside = (px, py) => {
      const sxx = px - (py - cy) * tilt; // shear around the crown's midline
      for (const [ox, oy, k] of lumps) {
        const lx = (sxx - (cx + ox * rx)) / (rx * k), ly = (py - (cy + oy * ry)) / (ry * k);
        if (lx * lx + ly * ly > 1.0) continue;
        if (kind === 'clip' && Math.abs(ly) > 0.8) continue; // pruned: sheared flat, topiary-tidy
        return true;
      }
      return false;
    };
    const x0 = Math.floor(cx - rx * 1.4), x1 = Math.ceil(cx + rx * 1.4);
    const y0 = Math.floor(cy - ry * 1.5), y1 = Math.ceil(cy + ry * 1.5);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inside(x, y)) continue;
        // a pixel or two of silhouette crumble so the mass never reads as a disc
        if (inside(x, y) && !inside(x + 1, y) && !inside(x, y + 1) && bayer(x, y) < 0.35) continue;
        // colour by light: dark at the base, canopy toward the sky, moss on the far rim
        const rim = t.face > 0 ? (x - cx) / rx : (cx - x) / rx;
        const top = (cy - y) / ry;
        let cc = P32.canopyDk;
        if (top > 0.35 && bayer(x, y) > 0.3) cc = P32.canopy;
        if (rim > 0.6) cc = bayer(x, y) > 0.5 ? P32.moss : P32.canopyDk; // far edge sinks
        if (rim > 0.85 && bayer(x * 3, y) > 0.4) cc = P32.under;
        setPx(x, y, cc);
      }
    }
    // the blind one's ear cups a hollow that faces the group, like a hand at an ear
    if (kind === 'ear') {
      const hx = cx + t.face * rx * 0.22, hy = cy;
      for (let y = Math.floor(hy - ry * 0.4); y <= hy + ry * 0.4; y++) {
        for (let x = Math.floor(hx - rx * 0.34); x <= hx + rx * 0.34; x++) {
          const lx = (x - hx) / (rx * 0.34), ly = (y - hy) / (ry * 0.4);
          if (lx * lx + ly * ly > 1 || bayer(x, y) < 0.35) continue;
          const j = y * cols + x;
          if (j >= 0 && j < buf.length && buf[j] !== P32.glow) setPx(x, y, bayer(x * 5, y) > 0.55 ? P32.under : P32.canopyDk);
        }
      }
    }
    // warm rim-light on the side facing the circle: a thin glow band, no saffron
    const rimX = t.face > 0 ? 1 : -1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * cols + x;
        if (i < 0 || i >= buf.length) continue;
        if (buf[i] !== P32.canopy && buf[i] !== P32.canopyDk && buf[i] !== P32.moss) continue;
        const nx = x + rimX;
        if (nx < 0 || nx >= cols || buf[y * cols + nx] === P32.ink || buf[y * cols + nx] === P32.soil) {
          if (bayer(x, y) > 0.25) setPx(x, y, P32.glow);
        }
      }
    }
    // the heart: one saffron pixel in a dithered warm halo when this voice is lit
    if (lit > 0) {
      const hx = Math.round(cx + rimX * rx * 0.2), hy = Math.round(cy - ry * 0.15);
      const halo = 1 + 2.4 * lit;
      const flick = motionNow() ? 0.06 * Math.sin(tNow * 0.004 + idx * 2.1) : 0;
      for (let y = Math.floor(hy - halo - 1); y <= hy + halo + 1; y++) {
        for (let x = Math.floor(hx - halo - 1); x <= hx + halo + 1; x++) {
          const d = Math.sqrt((x - hx) * (x - hx) + (y - hy) * (y - hy));
          if (d > halo * (0.85 + flick)) continue;
          const j = y * cols + x;
          if (j < 0 || j >= buf.length) continue;
          if (buf[j] === P32.canopy || buf[j] === P32.canopyDk || buf[j] === P32.moss || buf[j] === P32.glow) {
            setPx(x, y, P32.glow);
          }
        }
      }
      setPx(hx, hy, P32.saffron);
    }
    return { cx, cy, rx, ry };
  };

  /* The orchard dog, seated at the edge of the circle, looking up at the group.
     A small tricolour hound: dark floppy ears, a white blaze, a dark saddle,
     white chest and paws — and a raised tail with a white tip that wags in
     three discrete pixel poses. It keeps the orchard's four browns plus bone. */
  const dog = (x, feet, s, tNow) => {
    const g = (px, py, c) => setPx(x + px, feet - 13 + py, c);
    const D = u32('#704c2c'), G = u32('#c38b46'), L = u32('#e4b668'), K = u32('#263728'), W = P32.bone;
    const rows = [
      '..dd..........',
      '.dBBd.........',
      '.dBWBd........',
      'dnBWBgd.......',
      '.dggggd.......',
      '..ggglg.......',
      '.WWggggWW.....',
      'WdWWggWWdW....',
      'WdWWKKWWdW....',
      'dWWWKKWWWd....',
      '.dWWd..dWW....',
      '.dWWd..dWd....',
      '.ddd....dd....'
    ];
    rows.forEach((row, j) => {
      [...row].forEach((a, i) => {
        if (a === '.') return;
        g(i, j, a === 'd' ? D : a === 'B' ? G : a === 'g' ? G : a === 'l' ? L : a === 'K' ? K : W);
      });
    });
    // eyes: looking up at the circle over the white blaze
    g(4, 2, P32.ink); g(6, 2, P32.ink);
    // the tail: hinged at the rump, three whole-pixel wag poses
    const wag = motionNow() ? [0, 1, 2][Math.floor(tNow / 130) % 3] : 1;
    const tx = 12, ty = 9;                       // rump
    if (wag === 0) { seg(x + tx, feet - 4, x + tx + 3, feet - 4, 1, G); seg(x + tx + 3, feet - 4, x + tx + 4, feet - 3, 1, G); setPx(x + tx + 4, feet - 3, W); }
    else if (wag === 1) { seg(x + tx, feet - 4, x + tx + 3, feet - 6, 1, G); seg(x + tx + 3, feet - 6, x + tx + 4, feet - 7, 1, G); setPx(x + tx + 4, feet - 7, W); }
    else { seg(x + tx, feet - 4, x + tx + 2, feet - 6, 1, G); seg(x + tx + 2, feet - 6, x + tx + 4, feet - 6, 1, G); setPx(x + tx + 4, feet - 6, W); }
  };

  /* ------------------------------------------------------------- the frame */
  const stars = rng(77);
  const starField = Array.from({ length: 42 }, () => ({ x: stars(), y: stars() * 0.55, b: stars() }));
  const canopyStars = Array.from({ length: 8 }, (_, i) => ({
    x: i < 4 ? 0.16 + i * 0.055 + stars() * 0.02 : 0.72 + (i - 4) * 0.055 + stars() * 0.02,
    y: 0.08 + stars() * 0.10,
    c: i % 3 === 0 ? 'glow' : i % 3 === 1 ? 'sprout' : 'sage',
    ph: stars() * 6.28
  }));

  const draw = (tNow) => {
    if (!buf) return;
    const motion = motionNow();
    const gy = Math.round(rows * 0.72); // ground line
    // sky: ink at the zenith dithered down into soil at the horizon, per-pixel
    for (let y = 0; y < gy; y++) {
      const k = y / gy;
      for (let x = 0; x < cols; x++) {
        const th = bayer(x, y);
        buf[y * cols + x] = k < 0.3 ? P32.ink : k < 0.62
          ? (th > 0.72 ? P32.under : P32.ink)
          : k < 0.92 ? (th > 0.55 ? P32.soil : P32.ink) : P32.soil;
      }
    }
    // a thin horizon where the land meets the sky
    for (let x = 0; x < cols; x++) {
      setPx(x, gy - 1, bayer(x, gy) > 0.5 ? P32.under : P32.soil);
      setPx(x, gy, bayer(x, gy + 1) > 0.6 ? P32.moss : P32.under);
    }
    for (const s of starField) {
      if (s.y * rows > gy - 6) continue;
      const sx = Math.floor(s.x * cols), sy = Math.floor(s.y * rows);
      const tw = motion && Math.sin(tNow * 0.0016 + s.b * 40) > 0.9;
      setPx(sx, sy, tw ? P32.moss : s.b > 0.75 ? P32.sage : s.b > 0.4 ? P32.lichen : P32.under);
    }
    // ground: cool dark earth, mostly soil and understory with sparse warm flecks
    for (let y = gy; y < rows; y++) {
      const k = (y - gy) / Math.max(1, rows - gy);
      for (let x = 0; x < cols; x++) {
        const th = bayer(x, y);
        buf[y * cols + x] = k < 0.3
          ? (th > 0.5 ? P32.soil : P32.under)
          : th > 0.86 ? P32.earth : th > 0.5 ? P32.soil : P32.under;
      }
    }
    const R = rng(31);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(R() * cols), y = gy + 2 + Math.floor(R() * (rows - gy - 4));
      if (R() < 0.6) { setPx(x, y, P32.reed); setPx(x + 1, y, P32.reed); setPx(x, y - 1, P32.reed); }
      else { setPx(x, y, P32.lichen); setPx(x + 1, y, P32.moss); }
    }
    // the meeting ground: a faint dithered ring where the circle stands,
    // like worn earth at a hallway corner. Sparse enough to stay cool-toned.
    {
      const rcx = 0.50 * cols, rcy = 0.815 * rows, rrx = 0.365 * cols, rry = 0.105 * rows;
      for (let y = Math.floor(rcy - rry); y <= rcy + rry; y++) {
        for (let x = Math.floor(rcx - rrx); x <= rcx + rrx; x++) {
          const d = Math.sqrt(((x - rcx) / rrx) ** 2 + ((y - rcy) / rry) ** 2);
          if (Math.abs(d - 1) > 0.07 || y < rcy - rry * 0.4) continue;
          if (bayer(x * 3, y * 7) > 0.62) setPx(x, y, bayer(x, y) > 0.4 ? P32.earth : P32.moss);
        }
      }
    }
    // the four: same roots, room to differ
    const litNow = CAST.map((c, i) => motion ? smooth(THRESH[i], THRESH[i] + 0.09, p) : 1);
    CAST.forEach((c, i) => {
      const feet = Math.round(c.feet * rows);
      const h = Math.round(c.h * rows);
      const x = Math.round(c.x * cols);
      const lean = Math.round(c.lean * rows) + (motion ? Math.round(Math.sin(tNow * 0.0005 + i * 1.7) * 0.7) : 0);
      const t = trunk(x, feet, h, c.face, lean);
      // arms, per character — mid-gesture, alive
      if (c.key === 'local') {
        // one arm lifted in a small wave of greeting, one low with the satchel
        arm(t, c.face, 0.45, x + c.face * h * 0.30, feet - h * 0.70, null, true);
        arm(t, -c.face, 0.55, x - c.face * h * 0.16, feet - h * 0.5);
      } else if (c.key === 'blind') {
        // both arms reach toward the voices, palms open
        arm(t, c.face, 0.5, x + c.face * h * 0.34, feet - h * 0.72);
        arm(t, c.face, 0.62, x + c.face * h * 0.26, feet - h * 0.5, null, true);
      } else if (c.key === 'instruct') {
        // arms held close, almost behind the trunk — the tidiest posture in the room
        arm(t, c.face, 0.5, x + c.face * h * 0.10, feet - h * 0.42, P32.earth);
        arm(t, -c.face, 0.55, x - c.face * h * 0.10, feet - h * 0.38, P32.earth);
      } else {
        // five branch-arms; two are mid-gesture toward the others — it is
        // making a point from behind the group, like someone at the back of a huddle
        const f = c.face;
        arm(t, f, 0.40, x + f * h * 0.48, feet - h * 0.34, null, true); // the point, long and raised
        arm(t, f, 0.55, x + f * h * 0.34, feet - h * 0.10);
        arm(t, f, 0.68, x + f * h * 0.24, feet + h * 0.04);
        arm(t, -f, 0.44, x - f * h * 0.38, feet - h * 0.26);
        arm(t, -f, 0.62, x - f * h * 0.30, feet + h * 0.02);
      }
      // faces and bindings
      const eyeY = Math.round(feet - h * 0.72);
      if (c.key === 'local' || c.key === 'cloud') {
        setPx(t.topX + (c.face > 0 ? 0 : t.w - 1), eyeY, P32.ink);
        setPx(t.topX + (c.face > 0 ? t.w - 1 : 0), eyeY, P32.ink);
      } else if (c.key === 'blind') {
        // the blindfold: a prominent bone band across the trunk-eyes, with
        // a knot and two short tails of cloth hanging down
        for (let j = 0; j <= t.w + 1; j++) { setPx(t.topX - 1 + j, eyeY, P32.bone); setPx(t.topX - 1 + j, eyeY + 1, P32.bone); }
        setPx(t.topX - 1, eyeY, P32.lichen); setPx(t.topX + t.w, eyeY, P32.lichen);
        const knotX = c.face > 0 ? t.topX + t.w : t.topX - 1;
        setPx(knotX, eyeY + 2, P32.bone); setPx(knotX, eyeY + 3, P32.sage);
      } else {
        setPx(t.topX + (c.face > 0 ? 0 : t.w - 1), eyeY, P32.ink);
        setPx(t.topX + (c.face > 0 ? t.w - 1 : 0), eyeY, P32.ink);
        // the gag: a cloth band where the mouth would be
        const gagY = Math.round(feet - h * 0.45);
        for (let j = 0; j <= t.w + 1; j++) setPx(t.topX - 1 + j, gagY, P32.sage);
      }
      if (c.key === 'local') {
        // a root-satchel slung low: a strap over the shoulder, a bundled pouch
        const bx = x - c.face * 3, by = Math.round(feet - h * 0.16);
        seg(x, Math.round(feet - h * 0.36), bx, by - 2, 1, P32.reed);
        setPx(bx - 1, by, P32.earthL); setPx(bx, by, P32.earth); setPx(bx + 1, by, P32.earthL);
        setPx(bx - 1, by - 1, P32.earth); setPx(bx, by - 1, P32.earthL);
        setPx(bx, by + 1, P32.reed);
      }
      canopy(t, Math.round(h * (c.kind === 'broad' ? 0.34 : 0.42)), c, litNow[i], tNow, i);
    });
    // the dog, at the edge of the circle, looking up
    dog(Math.round(DOG.x * cols), Math.round(DOG.feet * rows), 1, tNow);
    // every voice a light — then the canopy stars above
    const starLit = motion ? smooth(STAR_AT, STAR_AT + 0.12, p) : 1;
    if (starLit > 0) {
      canopyStars.forEach((s, i) => {
        const on = motion ? smooth(i * 0.09, i * 0.09 + 0.08, (p - STAR_AT) / 0.16) : 1;
        if (on <= 0) return;
        const sx = Math.round(s.x * cols), sy = Math.round(s.y * rows);
        const tw = motion ? (Math.sin(tNow * 0.003 + s.ph) > 0.55 ? 1 : 0) : 0;
        setPx(sx, sy, u32(HEX[s.c]));
        if (on > 0.6 && tw) { setPx(sx - 1, sy, P32.moss); setPx(sx + 1, sy, P32.moss); }
      });
    }
    ctx.putImageData(img, 0, 0);
  };

  /* ------------------------------------------------------------- lifecycle */
  const sizeCanvas = () => {
    pxs = innerWidth < 600 ? 4 : 6;
    const w = frame.clientWidth || 600;
    cols = clamp(Math.floor(w / pxs), 60, 210);
    rows = Math.round(cols * 0.62);
    if (!cols || !rows) return;
    cv.width = cols; cv.height = rows;
    cv.style.width = cols * pxs + 'px';
    cv.style.height = rows * pxs + 'px';
    img = ctx.createImageData(cols, rows);
    buf = new Uint32Array(img.data.buffer);
    p = progressNow();
    draw(performance.now());
  };

  let raf = 0;
  const tick = (tNow) => {
    raf = 0;
    if (!motionNow() || doc.hidden || !visible) return;
    if (tNow - lastDraw > 66) { lastDraw = tNow; draw(tNow); }
    raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf && motionNow() && !doc.hidden && visible) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; });
    kick();
  }, { rootMargin: '160px 0px' });
  io.observe(sec);

  let scrollQueued = false;
  addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const np = progressNow();
      if (np !== p) { p = np; if (visible && !motionNow()) draw(performance.now()); }
    });
  }, { passive: true });

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(sizeCanvas, 120);
  });
  doc.addEventListener('visibilitychange', kick);
  if (mq.addEventListener) mq.addEventListener('change', () => { p = progressNow(); draw(performance.now()); kick(); });
  if (stillBtn) new MutationObserver(() => { draw(performance.now()); kick(); }).observe(stillBtn, { attributes: true, attributeFilter: ['aria-pressed'] });
  if (field) new MutationObserver(() => { draw(performance.now()); kick(); }).observe(field, { attributes: true, attributeFilter: ['data-motion'] });

  sizeCanvas();
})();
