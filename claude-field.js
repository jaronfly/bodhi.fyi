/* Bodhi · the pixel scenes after the film · claude-field.js
   Claude’s tree and sky as one IIFE: no globals, no storage, no cinema.js state.
   Vanilla ES2020, progressive enhancement: every scene reads fully without it.
   Pixel art is drawn one canvas pixel per art pixel and scaled by whole numbers (image-rendering: pixelated).
   Motion is off when the system asks for reduced motion, when the cinema's Stillness control is pressed
   (read only), or when the Motion switch below is off (in memory; it resets on reload). Then every scene
   renders a complete still frame. Canvases pause when off-screen and when the tab is hidden. */
(() => {
  'use strict';

  const doc = document;
  const field = doc.querySelector('.claude-field');
  if (!field) return;
  field.classList.add('cf-js');

  const COLORS = {
    soil: '#17231B', under: '#1F2C24', moss: '#2E3B33', lichen: '#8A968D', sage: '#B8C2BA',
    bone: '#F2EEE4', canopy: '#2E6B45', sprout: '#8BCB8B', saffron: '#E8982A', clay: '#D9674F'
  };
  const PAL = {
    s: COLORS.soil, u: COLORS.under, m: COLORS.moss, l: COLORS.lichen, g: COLORS.sage,
    b: COLORS.bone, c: COLORS.canopy, p: COLORS.sprout, y: COLORS.saffron, r: COLORS.clay
  };
  // Colours packed for ImageData (little-endian ABGR).
  const u32 = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
  };
  const P32 = {};
  Object.keys(PAL).forEach((k) => { P32[k] = u32(PAL[k]); });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[((y & 3) << 2) + (x & 3)];

  /* ------------------------------------------------------------------ announcer */
  const announcer = doc.createElement('div');
  announcer.className = 'sr-only';
  announcer.setAttribute('aria-live', 'polite');
  field.appendChild(announcer);
  let announceT = 0;
  const announce = (msg) => {
    clearTimeout(announceT);
    announcer.textContent = '';
    announceT = setTimeout(() => { announcer.textContent = msg; }, 40);
  };

  /* ------------------------------------------------------------------ motion */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const stillBtn = doc.getElementById('stillness'); // the cinema's control: read only
  const stillOn = () => !!stillBtn && stillBtn.getAttribute('aria-pressed') === 'true';
  let userOff = false; // in memory only
  const motionAllowed = () => !mq.matches && !userOff && !stillOn();
  let motion = motionAllowed();
  if (!motion) field.dataset.motion = 'off';

  const scenes = [];
  let raf = 0;
  const frame = (t) => {
    raf = 0;
    if (!motion || doc.hidden) return;
    let again = false;
    for (const s of scenes) {
      if (s.visible && s.tick && s.tick(t)) again = true;
    }
    if (again) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && motion && !doc.hidden) raf = requestAnimationFrame(frame);
  };
  doc.addEventListener('visibilitychange', kick);

  const toggle = field.querySelector('[data-motion-toggle]');
  const syncToggle = () => {
    if (!toggle) return;
    // With the system setting on, motion stays off everywhere. With Stillness pressed in the film, the
    // switch is disabled and says why.
    toggle.hidden = !!mq.matches;
    toggle.disabled = stillOn();
    toggle.setAttribute('aria-pressed', String(motion));
    const st = toggle.querySelector('.mt-state');
    if (st) st.textContent = motion ? 'on' : (stillOn() ? 'off · Stillness' : 'off');
  };
  const setMotion = () => {
    const was = motion;
    motion = motionAllowed();
    if (motion) delete field.dataset.motion; else field.dataset.motion = 'off';
    syncToggle();
    if (was !== motion) {
      scenes.forEach((s) => s.motionChanged && s.motionChanged(motion));
      kick();
    }
  };
  if (toggle) toggle.addEventListener('click', () => { userOff = motion; setMotion(); });
  if (mq.addEventListener) mq.addEventListener('change', setMotion);
  else if (mq.addListener) mq.addListener(setMotion);
  if (stillBtn) new MutationObserver(setMotion).observe(stillBtn, { attributes: true, attributeFilter: ['aria-pressed'] });
  syncToggle();

  /* ------------------------------------------------------------------ scene plumbing */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const s = e.target.__scene;
      if (!s) return;
      s.visible = e.isIntersecting;
      if (s.visible && s.onShow) s.onShow();
    });
    kick();
  }, { rootMargin: '160px 0px' });
  const register = (el, s) => {
    el.__scene = s;
    s.visible = false;
    scenes.push(s);
    io.observe(el);
  };

  let scrollQueued = false;
  addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      scenes.forEach((s) => { if (s.visible && s.onScroll) s.onScroll(); });
    });
  }, { passive: true });

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => scenes.forEach((s) => s.layout && s.layout()), 120);
  });

  const sizeCanvas = (cv, cols, rows, k) => {
    if (cv.width !== cols) cv.width = cols;
    if (cv.height !== rows) cv.height = rows;
    cv.style.width = cols * k + 'px';
    cv.style.height = rows * k + 'px';
  };

  /* ================================================================== THE TREE
     Roots first, then mycelium, trunk, branches, leaves (rhythms, cycling through four seasons),
     senses, and one saffron growing tip. Growth follows scroll; the part being read lights up. */
  const Tree = (el) => {
    const cv = el.querySelector('.tree-canvas');
    const stage = el.querySelector('.tree-stage');
    const frameEl = el.querySelector('.tree-frame');
    if (!cv || !stage) return;
    const ctx = cv.getContext('2d');
    const parts = Array.from(el.querySelectorAll('.part'));
    const TW = 96, TH = 128, GY = 84;
    const R = rng(1990);
    const px = [];
    const add = (x, y, c, part, t, ph) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < TW && y < TH) px.push({ x, y, c, part, t, ph: ph || 0 });
    };
    const line = (x0, y0, x1, y1, fn) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      const n = Math.max(dx, -dy) || 1;
      let err = dx + dy, i = 0;
      for (;;) {
        fn(x0, y0, i / n, i);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
        i++;
      }
    };

    // roots: the left one runs deeper than the right, like the mark
    const tips = [];
    const rootWalk = (x, y, dir, len, t0, t1, depth, col) => {
      let cx = x, cy = y;
      for (let i = 0; i < len; i++) {
        cy += 1;
        const r = R();
        if (r < 0.5) cx += dir; else if (r < 0.62) cx -= dir;
        add(cx, cy, col, 'roots', lerp(t0, t1, i / len));
        if (depth > 0 && i > 4 && R() < 0.13) {
          const tt = lerp(t0, t1, i / len);
          rootWalk(cx, cy, R() < 0.5 ? -1 : 1, Math.floor(len * (0.3 + R() * 0.3)), tt, lerp(tt, t1, 0.9), depth - 1, 'l');
        }
      }
      tips.push([cx, cy]);
    };
    rootWalk(47, GY, -1, 37, 0.02, 0.26, 2, 'g');
    rootWalk(49, GY, 1, 24, 0.02, 0.2, 2, 'g');
    rootWalk(48, GY, 0, 14, 0.05, 0.16, 1, 'l');

    // mycelium: dotted threads joining the root tips and running off to other trees
    tips.sort((a, b) => a[0] - b[0]);
    const thread = (a, b, t0, t1) => line(a[0], a[1], b[0], b[1], (x, y, f, i) => { if (i % 2 === 0) add(x, y, 'l', 'mycelium', lerp(t0, t1, f)); });
    for (let i = 0; i < tips.length - 1; i++) thread(tips[i], tips[i + 1], 0.26 + i * 0.01, 0.4);
    if (tips.length) {
      thread(tips[0], [0, clamp(tips[0][1] + 6, GY + 4, TH - 2)], 0.3, 0.42);
      thread(tips[tips.length - 1], [TW - 1, clamp(tips[tips.length - 1][1] - 4, GY + 4, TH - 2)], 0.3, 0.42);
    }

    // trunk
    const TOP = GY - 30;
    for (let y = GY; y >= TOP; y--) {
      const f = (GY - y) / (GY - TOP);
      const t = lerp(0.34, 0.47, f);
      add(47, y, 'g', 'trunk', t);
      add(48, y, 'l', 'trunk', t);
      if (f < 0.7) add(49, y, 'l', 'trunk', t);
      if (f < 0.25) add(46, y, 'l', 'trunk', t);
    }

    // branches: six, each splitting twice, leaves at the tips
    const leaves = [];
    const branch = (x, y, ang, len, depth, t0, span) => {
      const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
      const t1 = t0 + span;
      line(x, y, x2, y2, (bx, by, f) => {
        add(bx, by, 'g', 'branches', lerp(t0, t1, f));
        if (depth >= 2) add(bx, by + 1, 'l', 'branches', lerp(t0, t1, f));
      });
      if (depth === 0) { leaves.push([x2, y2, t1, 4 + Math.floor(R() * 3)]); return; }
      if (depth === 1) leaves.push([x2, y2, t1, 3]);
      branch(x2, y2, ang + 0.32 + R() * 0.28, len * 0.7, depth - 1, t1, span * 0.8);
      branch(x2, y2, ang - 0.32 - R() * 0.28, len * 0.66, depth - 1, t1, span * 0.8);
    };
    [[2.75, 15, TOP + 8], [2.3, 17, TOP + 4], [1.85, 16, TOP], [1.3, 16, TOP], [0.85, 17, TOP + 4], [0.4, 15, TOP + 8]]
      .forEach(([a, l, y]) => branch(48, y, a, l, 2, 0.47, 0.075));

    // leaves: rhythms, each pixel with its own season phase
    let top = { x: 48, y: TH };
    leaves.forEach(([lx, ly, lt, r]) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r + 0.3) continue;
        if (d > r - 1.2 && R() < 0.45) continue;
        const c = R() < 0.35 ? 'p' : 'c';
        const t = clamp(lt + 0.08 + (d / r) * 0.06 + R() * 0.04, 0.64, 0.86);
        add(lx + x, ly + y, c, 'rhythms', t, Math.floor(R() * 4));
        if (ly + y < top.y) top = { x: Math.round(lx + x), y: Math.round(ly + y) };
      }
    });
    // senses: a few bright points at the edge of the canopy
    const leafPx = px.filter((p) => p.part === 'rhythms');
    for (let i = 0; i < 8; i++) {
      const p = leafPx[Math.floor(R() * leafPx.length)];
      add(p.x + (R() < 0.5 ? -1 : 1), p.y - 1, 'b', 'senses', 0.86 + i * 0.008, i);
    }
    // the growing tip: one saffron pixel, the part that is never done
    add(top.x, top.y - 1, 'g', 'tip', 0.94);
    add(top.x, top.y - 2, 'y', 'tip', 0.96);

    const SEASON = ['p', 'c', 'l', 'm'];
    let progress = motion ? 0 : 1;
    let active = null;
    let lastDraw = 0, season = 0, senseBlink = 0;

    const draw = () => {
      ctx.clearRect(0, 0, TW, TH);
      ctx.fillStyle = COLORS.under;
      ctx.fillRect(0, GY + 1, TW, TH - GY - 1);
      ctx.fillStyle = COLORS.moss;
      ctx.fillRect(0, GY, TW, 1);
      const p = motion ? progress : 1;
      for (const q of px) {
        if (q.t > p) continue;
        let c = q.c;
        if (q.part === 'rhythms') c = active === 'rhythms' ? (q.c === 'p' ? 'b' : 'p') : (motion ? SEASON[(q.ph + season) % 4] : q.c);
        else if (q.part === 'senses') { if (motion && (q.ph + senseBlink) % 5 === 0) c = 'l'; }
        else if (active === q.part && q.part !== 'tip') c = 'b';
        ctx.fillStyle = PAL[c];
        ctx.fillRect(q.x, q.y, 1, 1);
        if (q.part === 'senses' && active === 'senses') {
          ctx.fillRect(q.x - 1, q.y, 3, 1);
          ctx.fillRect(q.x, q.y - 1, 1, 3);
        }
      }
      if (active === 'tip' && p >= 0.96) {
        ctx.fillStyle = COLORS.bone;
        [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([dx, dy]) => ctx.fillRect(top.x + dx, top.y - 2 + dy, 1, 1));
      }
    };

    const computeProgress = () => {
      const sticky = getComputedStyle(stage).position === 'sticky';
      const vh = innerHeight;
      let p;
      if (sticky) {
        const r = el.getBoundingClientRect();
        p = (vh * 0.9 - r.top) / (r.height * 0.62);
      } else {
        const r = stage.getBoundingClientRect();
        p = (vh - r.top) / (r.height + vh * 0.35);
      }
      return clamp(p, 0, 1);
    };

    const s = {};
    s.layout = () => {
      const w = frameEl.clientWidth || TW * 3;
      const k = clamp(Math.min(Math.floor(w / TW), Math.floor((innerHeight * 0.8) / TH)), 2, 6);
      sizeCanvas(cv, TW, TH, k);
      progress = computeProgress();
      draw();
    };
    s.onScroll = () => {
      if (!motion) return;
      const p = computeProgress();
      if (Math.abs(p - progress) > 0.002) { progress = p; draw(); }
    };
    s.tick = (t) => {
      if (t - lastDraw > 140) {
        lastDraw = t;
        season = Math.floor(t / 2200) % 4;
        senseBlink = Math.floor(t / 420);
        draw();
      }
      return true;
    };
    s.motionChanged = () => { progress = motion ? computeProgress() : 1; draw(); };

    const pio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        active = e.target.dataset.part;
        parts.forEach((p) => p.classList.toggle('is-active', p === e.target));
        draw();
      });
    }, { rootMargin: '-42% 0px -42% 0px' });
    parts.forEach((p) => pio.observe(p));

    s.layout();
    register(el, s);
  };
  doc.querySelectorAll('[data-tree]').forEach(Tree);

  /* ================================================================== THE SKY
     Dusk to night as you scroll: a pale sun sets behind a treeline, clouds darken, stars come out,
     a moon rises, then aurora curtains in canopy and sprout greens with a single saffron thread.
     The sun has gone before the thread appears, so the sky only ever holds one saffron. */
  const Sky = (sec) => {
    const bg = sec.querySelector('.sky-bg');
    const cv = sec.querySelector('.sky-canvas');
    if (!bg || !cv) return;
    const ctx = cv.getContext('2d');
    const R = rng(4242);
    const stars = Array.from({ length: 320 }, () => ({ x: R(), y: R() * 0.82, th: 0.22 + R() * 0.5, ph: R() * 6.28, b: R() }));
    const clouds = Array.from({ length: 6 }, () => ({ x: R() * 1.3, y: 0.3 + R() * 0.32, w: 0.1 + R() * 0.12, h: 0.028 + R() * 0.02, sp: 0.000006 + R() * 0.00001 }));
    const RAMP = [P32.s, P32.u, P32.m, P32.c, P32.p];
    let cols = 0, rows = 0, img = null, buf = null, hills = [], pxs = 6;
    let p = 0, lastQ = -1, lastDraw = 0;

    const setPx = (x, y, c) => { if (x >= 0 && y >= 0 && x < cols && y < rows) buf[y * cols + x] = c; };
    const disc = (cx, cy, r, c, test) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.6 && (!test || test(x, y))) setPx(Math.round(cx + x), Math.round(cy + y), c);
      }
    };

    const progressNow = () => {
      const r = sec.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    };

    const draw = (t) => {
      if (!buf) return;
      const pp = motion ? p : (p < 0.34 ? 0.06 : p < 0.67 ? 0.5 : 1);
      t = motion ? t : 0;
      const dusk = 1 - pp;
      // sky, dithered through the brand ramp
      for (let y = 0; y < rows; y++) {
        const low = y / rows;
        const v = dusk * (0.55 + 3.5 * Math.pow(low, 1.7));
        for (let x = 0; x < cols; x++) {
          buf[y * cols + x] = RAMP[clamp(Math.floor(v + bayer(x, y)), 0, 4)];
        }
      }
      // stars
      for (const s of stars) {
        if (pp < s.th) continue;
        const sx = Math.floor(s.x * cols), sy = Math.floor(s.y * rows);
        let c = s.b > 0.86 ? P32.b : s.b > 0.5 ? P32.g : P32.l;
        if (motion && Math.sin(t * 0.0021 + s.ph * 7) > 0.93) c = P32.m;
        setPx(sx, sy, c);
        if (s.b > 0.975) { setPx(sx - 1, sy, P32.l); setPx(sx + 1, sy, P32.l); setPx(sx, sy - 1, P32.l); setPx(sx, sy + 1, P32.l); }
      }
      // aurora: a sinuous ribbon with rays hanging up from its bright lower edge
      const a = smooth(0.46, 0.86, pp);
      const sunGone = pp > 0.3;
      if (a > 0) {
        let prevY = null;
        for (let x = 0; x < cols; x++) {
          const yb = rows * (0.36 + 0.07 * Math.sin(x * 0.035 + t * 0.0003) + 0.03 * Math.sin(x * 0.09 - t * 0.0002));
          const L = rows * (0.14 + 0.09 * (0.5 + 0.5 * Math.sin(x * 0.05 + t * 0.00025 + 1)) + 0.05 * (0.5 + 0.5 * Math.sin(x * 0.013 + 2)));
          const streak = 0.82 + 0.18 * Math.sin(x * 1.3 + 3 * Math.sin(t * 0.0007 + x * 0.1));
          for (let y = Math.max(0, Math.floor(yb - L)); y <= Math.min(rows - 1, Math.floor(yb)); y++) {
            const d = (yb - y) / L;
            const k = a * Math.pow(1 - d, 1.4) * streak;
            const th = bayer(x, y);
            if (k > 0.72 + th * 0.22) buf[y * cols + x] = P32.p;
            else if (k > 0.1 + th * 0.55) buf[y * cols + x] = P32.c;
          }
          // the single saffron thread along the ribbon's lower edge
          if (a > 0.35 && sunGone && x > cols * 0.1 && x < cols * 0.9) {
            const yt = Math.round(yb) + 1;
            if (prevY !== null && Math.abs(yt - prevY) > 1) {
              const s0 = Math.min(yt, prevY), s1 = Math.max(yt, prevY);
              for (let yy = s0 + 1; yy < s1; yy++) setPx(x, yy, P32.y);
            }
            setPx(x, yt, P32.y);
            prevY = yt;
          }
        }
      }
      // moon
      const mp = smooth(0.28, 0.9, pp);
      const mr = Math.max(4, Math.round(Math.min(cols, rows) * 0.045));
      if (mp > 0) {
        const mx = Math.round(cols * 0.8), my = Math.round(lerp(rows * 1.05, rows * 0.2, mp));
        disc(mx, my, mr, P32.b);
        setPx(mx - Math.round(mr * 0.3), my - Math.round(mr * 0.2), P32.g);
        setPx(mx + Math.round(mr * 0.35), my + Math.round(mr * 0.3), P32.g);
        setPx(mx + Math.round(mr * 0.35) + 1, my + Math.round(mr * 0.3), P32.g);
        setPx(mx - Math.round(mr * 0.1), my + Math.round(mr * 0.5), P32.g);
      }
      // sun: pale, pixelated, setting
      const horizon = rows - Math.round(rows * 0.12);
      const sr = Math.max(5, Math.round(Math.min(cols, rows) * 0.06));
      const sy = Math.round(horizon - sr * 0.35 + pp * rows * 0.7);
      const sx = Math.round(cols * 0.64);
      if (sy - sr < horizon) {
        if (pp < 0.3) disc(sx, sy, sr + 3, P32.p, (x, y) => (x * x + y * y > sr * sr) && bayer(x + sx, y + sy) > 0.45);
        disc(sx, sy, sr, P32.b);
      }
      // clouds: a few round puffs on a flat base
      for (const c of clouds) {
        const cx = ((c.x + t * c.sp) % 1.4 - 0.2) * cols;
        const base = Math.round(c.y * rows), w = c.w * cols, h = Math.max(2, c.h * rows);
        const body = pp < 0.45 ? P32.m : P32.u;
        const puffs = [[-0.42, 1.1], [-0.1, 1.7], [0.28, 1.35], [0.5, 0.9]];
        for (const [ox, rr] of puffs) {
          const pr = Math.max(2, Math.round(h * rr)), pcx = Math.round(cx + ox * w);
          for (let y = -pr; y <= 0; y++) for (let x = -pr; x <= pr; x++) {
            if (x * x + y * y <= pr * pr + pr * 0.5) setPx(pcx + x, base + y, body);
          }
        }
        if (pp < 0.3) {
          for (let x = Math.round(cx - w * 0.42 - h); x <= Math.round(cx + w * 0.5 + h * 0.6); x++) {
            if ((x & 1) === 0 && x >= 0 && x < cols && base >= 0 && base < rows && buf[base * cols + x] === body) setPx(x, base, P32.l);
          }
        }
      }
      // treeline
      for (let x = 0; x < cols; x++) {
        for (let y = rows - hills[x]; y < rows; y++) setPx(x, y, P32.s);
      }
      ctx.putImageData(img, 0, 0);
    };

    const s = {};
    s.layout = () => {
      pxs = innerWidth < 600 ? 5 : 6;
      cols = Math.ceil(bg.clientWidth / pxs);
      rows = Math.ceil(bg.clientHeight / pxs);
      if (!cols || !rows) return;
      cv.width = cols; cv.height = rows;
      cv.style.width = cols * pxs + 'px';
      cv.style.height = rows * pxs + 'px';
      img = ctx.createImageData(cols, rows);
      buf = new Uint32Array(img.data.buffer);
      const H = rng(99);
      hills = [];
      let h = rows * 0.1;
      for (let x = 0; x < cols; x++) {
        h += (H() - 0.5) * 1.6;
        h = clamp(h, rows * 0.07, rows * 0.15);
        const tree = H() < 0.12 ? Math.floor(H() * 4) + 2 : 0;
        hills.push(Math.round(h) + tree);
      }
      p = progressNow();
      draw(performance.now());
    };
    s.onScroll = () => {
      const np = progressNow();
      if (motion) { p = np; if (!s.visible) return; draw(performance.now()); return; }
      const q = np < 0.34 ? 0 : np < 0.67 ? 1 : 2;
      p = np;
      if (q !== lastQ) { lastQ = q; draw(0); }
    };
    s.tick = (t) => {
      if (t - lastDraw > 66) { lastDraw = t; draw(t); }
      return true;
    };
    s.motionChanged = () => { lastQ = -1; p = progressNow(); draw(performance.now()); };
    s.layout();
    register(sec, s);
  };
  doc.querySelectorAll('.scene-sky').forEach(Sky);

})();
