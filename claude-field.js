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

  const ANCESTRY = {"source":"The Bodhi Build (draft v0.3, 2026-09-28), DATA.commits: git log --no-merges of the project repository, 2026-05-21 to 2026-09-28. Kinds as classified by the report (build, fix, write, other, auto = autosave). Subjects omitted.","label":"MEASURED","start":"2026-05-21","kinds":"ofowobfwwwwwbwwbbwwwwwwwwwwwwboobbbbbbbbofffbobbbbbbbbbbbbbbwbbbfbbbfoobwfbbfbbbbwowbfbbbbffbwwfbfbbbooooofobbfwwwooboooowwwoooooooooooooooooooooooooooooooooooooooooooooobbbbooooooooooowwbbbbbbbowwooooooooobbbbboobbwwoooooooooooooooowwwwwwwwwwwwwwwwbboooowoooooooowffooffffbbbbbwbbfffbwbwowwooowwfbwbbbfbowoowwowowwwwooooowbbaawawawaaowaooawbaawabaabfaawwwwwfwwoooofffofwwbfffwbowwbfwwbbbbffbwwfwwfwbwwfwbbwwfowfwfofbbbfbbbbbfbbbbbfbfbwfoowwobobwwbbwwfbbffbffwffbbbofoooooffwowwbfbfbbbbbfbfffobbbbbffbfwbfwfwbfbbwbbbwwwwbbbfbbwwbwbofffbbbbbbbbwfofbbwwbbbbbbwbwffbabaaaaaobfbbfbfwffwwbwbaaaabafaaaaaaawwfwwwwwwwwwbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafaaaaaaaaaaaaaaaabaaaaaaaaaaaaaaaaaaaaaaaaabaaaaaaawwbabababaaaaaabwbwbbbfbfbffwbfwbowfwbwwwwfbfwffwfwbfbwwwwwwwbfaowwwwwwwwwwwwwwbwwwwwawwwffwwwwwwwaaaaaaawwwwwwwwwwwwwawwawwwwwwwwwwawwaaaawwaaaaaawwwwfwaaaoaaawobwaoaaaawbaaaaaaaaaaaaaaawwbaoooobobwaaaaabaabawaaaawawaaawowwaaaooooobafaaobboobwowoowwwwboao","days":[[0,28],[2,2],[3,2],[4,9],[5,3],[6,2],[7,5],[8,4],[9,3],[10,10],[11,5],[19,1],[20,5],[21,10],[23,18],[24,6],[25,15],[26,1],[30,4],[31,2],[32,5],[33,2],[35,1],[37,2],[58,1],[62,1],[65,3],[66,8],[70,10],[71,12],[72,2],[73,3],[74,3],[75,3],[76,2],[77,6],[78,5],[80,7],[82,22],[83,12],[84,6],[86,13],[87,11],[90,13],[91,11],[92,54],[93,16],[94,70],[95,16],[96,12],[97,3],[100,4],[101,1],[100,3],[101,18],[103,1],[104,47],[105,6],[106,16],[107,5],[111,1],[113,2],[114,11],[115,27],[116,4],[117,32],[118,31],[119,30],[120,43],[121,19],[122,4],[124,8],[125,48],[126,57],[127,27],[129,25],[130,47]]};

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
      if (!s.visible && s.onHide) s.onHide();
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

  /* ================================================================== THE SEED
     Canonical algorithm from the brand's Seed animation: the dot leaves the i, arcs over the word,
     burrows into untouched soil, two root tips grow at once (the short root ends first), then the
     sprout rises, then a new seed appears on the i. Frames at 80 ms, whole pixels on a 35x13 grid. */
  const SEED_FRAMES = (() => {
    const G = {
      b: ['#...', '#...', '###.', '#..#', '#..#', '###.'],
      o: ['....', '....', '.##.', '#..#', '#..#', '.##.'],
      d: ['...#', '...#', '.###', '#..#', '#..#', '.###'],
      h: ['#...', '#...', '###.', '#..#', '#..#', '#..#'],
      i: ['o', '.', '#', '#', '#', '#']
    };
    const WORD = [0, 1, 2, 3, 4, 5].map((r) => 'bodhi'.split('').map((c) => G[c][r]).join('.'));
    const W = 35, H = 13, MY = 3, WX = 14, WY = 7;
    const TRUNK = [[5, 3]];
    const LEFT = [[5, 4], [4, 5], [3, 6], [3, 7], [2, 8]];
    const RIGHT = [[6, 4], [7, 5], [8, 6]];
    const ROOT_STEPS = [TRUNK];
    for (let s = 0; s < Math.max(LEFT.length, RIGHT.length); s++) ROOT_STEPS.push([LEFT[s], RIGHT[s]].filter(Boolean));
    const SPROUT_STEPS = [[[5, 2]], [[5, 1]], [[4, 0], [6, 0]], [[3, 0], [7, 0]]];
    const upTo = (steps, n) => steps.slice(0, n).flat();
    const make = (seed, carved, tips, sprout, dot) => {
      const g = Array.from({ length: H }, () => Array(W).fill(0));
      WORD.forEach((row, y) => row.split('').forEach((c, x) => { if (c === '#') g[WY + y][WX + x] = 1; }));
      for (let y = 3; y < 10; y++) for (let x = 0; x < 11; x++) g[MY + y][x] = 1;
      carved.forEach(([x, y]) => { g[MY + y][x] = 0; });
      tips.forEach(([x, y]) => { g[MY + y][x] = 2; });
      sprout.forEach(([x, y]) => { g[MY + y][x] = 1; });
      if (dot) g[WY][WX + 20] = 2;
      if (seed) g[seed[1]][seed[0]] = 2;
      return g;
    };
    const ALL_ROOTS = upTo(ROOT_STEPS, ROOT_STEPS.length);
    const ALL_SPROUT = upTo(SPROUT_STEPS, SPROUT_STEPS.length);
    const out = [];
    const hold = (f, n) => { for (let k = 0; k < n; k++) out.push(f); };
    hold(make(null, [], [], [], true), 12);
    const steps = 18;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(34 + (5 - 34) * t);
      const y = Math.round(7 + (5 - 7) * t - 6 * Math.sin(Math.PI * t));
      out.push(make([x, y], [], [], [], false));
    }
    hold(make([5, 5], [], [], [], false), 4);
    ROOT_STEPS.forEach((tips, k) => hold(make(null, upTo(ROOT_STEPS, k), tips, [], false), k === 0 ? 6 : 4));
    hold(make(null, ALL_ROOTS, [], [], false), 5);
    SPROUT_STEPS.forEach((_, k) => hold(make(null, ALL_ROOTS, [], upTo(SPROUT_STEPS, k + 1), false), 3));
    hold(make(null, ALL_ROOTS, [], ALL_SPROUT, false), 16);
    hold(make(null, ALL_ROOTS, [], ALL_SPROUT, true), 14);
    return out;
  })();

  const SeedPlayer = (fig) => {
    const cv = fig.querySelector('.seed-canvas');
    const frameEl = fig.querySelector('.seed-frame');
    const btn = fig.querySelector('[data-seed-replay]');
    const svg = fig.querySelector('.seed-static');
    if (!cv || !frameEl) return;
    const ctx = cv.getContext('2d');
    const last = SEED_FRAMES.length - 1;
    const closing = fig.dataset.seed === 'closing';
    const maxW = closing ? 175 : fig.classList.contains('seed-stage-sm') ? 420 : 600;
    // The canvas takes over from the static SVG, so it carries the SVG's words.
    cv.removeAttribute('aria-hidden');
    cv.setAttribute('role', 'img');
    if (svg) cv.setAttribute('aria-label', svg.getAttribute('aria-label'));
    const s = { i: last, playing: false, elapsed: 0, lastT: 0, played: false };
    const draw = () => {
      const g = SEED_FRAMES[s.i];
      ctx.clearRect(0, 0, 35, 13);
      for (let y = 0; y < 13; y++) {
        for (let x = 0; x < 35; x++) {
          const v = g[y][x];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? COLORS.bone : COLORS.saffron;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };
    s.layout = () => {
      const w = Math.min(frameEl.clientWidth || maxW, maxW);
      sizeCanvas(cv, 35, 13, clamp(Math.floor(w / 35), 2, 24));
      draw();
    };
    s.play = () => {
      s.played = true;
      if (!motion) { s.i = last; s.playing = false; draw(); return; }
      s.i = 0; s.elapsed = 0; s.lastT = 0; s.playing = true; draw(); kick();
    };
    s.tick = (t) => {
      if (!s.playing) return false;
      if (!s.lastT) s.lastT = t;
      s.elapsed += Math.min(160, t - s.lastT); s.lastT = t;
      const i = Math.min(Math.floor(s.elapsed / 80), last);
      if (i !== s.i) { s.i = i; draw(); }
      if (s.i >= last) { s.playing = false; return false; }
      return true;
    };
    s.onShow = () => { s.lastT = 0; if (!closing && !s.played) s.play(); };
    s.onHide = () => { s.lastT = 0; };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) s.lastT = 0; });
    // The final title starts on actual visibility, not the field's prewarm margin.
    // It is the same planting sequence as the first seed, played once and held.
    if (closing) {
      const titleIO = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35)) {
          if (!s.played) s.play();
          titleIO.disconnect();
        }
      }, { threshold: 0.35 });
      titleIO.observe(frameEl);
    }
    s.motionChanged = (m) => { if (!m) { s.playing = false; s.i = last; draw(); } };
    if (btn) { btn.hidden = false; btn.addEventListener('click', s.play); }
    s.layout();
    fig.classList.add('seed-ready');
    register(fig, s);
  };
  doc.querySelectorAll('[data-seed]').forEach(SeedPlayer);

  /* ================================================================== THE PADDED CELL
     A small room, a discoverable opening, and a hallway of other attempts.
     Canvas and text controls share one local view. The journal records discoveries; it is not a map. */
  const Cell = (el) => {
    const cv = el.querySelector('.cell-canvas');
    const frameEl = el.querySelector('.cell-frame');
    if (!cv || !frameEl) return;
    let ctx = null;
    try { ctx = cv.getContext('2d'); } catch (_) { /* The text route remains playable. */ }
    const thoughtEl = el.querySelector('[data-cell-thought]');
    const countEl = el.querySelector('[data-cell-count]');
    const liveEl = el.querySelector('[data-cell-live]');
    const resetBtn = el.querySelector('[data-cell-reset]');
    const descriptionEl = el.querySelector('[data-cell-description]');
    const actionsEl = el.querySelector('[data-cell-actions]');
    const emptyEl = el.querySelector('[data-cell-journal-empty]');
    const choiceEl = el.querySelector('[data-cell-choice]');
    const resultEl = el.querySelector('[data-cell-result]');
    const viewBtn = el.querySelector('[data-cell-view]');
    const journalCountEl = el.querySelector('[data-cell-journal-count]');
    const W = 15, H = 9, T = 8, CW = W * T, CH = H * T;
    let viewW = W, viewH = H;
    const viewport = () => ({ x: clamp(st.mind.x - Math.floor(viewW / 2), 0, W - viewW), y: clamp(st.mind.y - Math.floor(viewH / 2), 0, H - viewH) });
    const DRAFT = [[9, 5], [10, 5], [11, 4], [12, 4]];
    const img = ctx ? ctx.createImageData(CW, CH) : null;
    const buf = img ? new Uint32Array(img.data.buffer) : null;
    const AREAS = {
      room: {
        voice: [[7, 0]], light: [[0, 3]], sword: [[4, 3]], seams: [[14, 3], [14, 4]],
        scratch: [[0, 6]], notice: [[3, 0]], doodle: [[14, 6]], honey: [[11, 2]], door: [[11, 8]]
      },
      hall: { return: [[0, 4]], chalk: [[3, 3]], tally: [[7, 5]], prisoner: [[10, 3]], release: [[13, 4]] }
    };
    const objMaps = {};
    Object.keys(AREAS).forEach((area) => {
      objMaps[area] = {};
      Object.keys(AREAS[area]).forEach((k) => AREAS[area][k].forEach(([x, y]) => { objMaps[area][x + ',' + y] = k; }));
    });
    const START = { x: 7, y: 5 };
    const st = {
      area: 'room', mind: { ...START }, facing: [0, 1], seen: new Set(), lights: false, opening: false,
      choice: null, steps: 0, looks: 0, swordPulls: 0, honeyTouches: 0, path: [], pending: null, lastStep: 0, blink: false, bumped: false, thoughtT: 0
    };
    const objects = () => AREAS[st.area];
    const objectAt = (x, y) => objMaps[st.area][x + ',' + y];
    const isWall = (x, y) => st.area === 'room'
      ? x === 0 || y === 0 || x === W - 1 || y === H - 1
      : !((y === 4 && x >= 1 && x <= 12) || (y === 3 && x >= 9 && x <= 11));
    const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || isWall(x, y) || !!objectAt(x, y);
    const radius = () => st.area === 'room' && st.lights ? 3 : 2;
    const distance = (x, y) => Math.max(Math.abs(x - st.mind.x), Math.abs(y - st.mind.y));
    const visible = (x, y) => distance(x, y) <= radius();
    const neighbours = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    const withinReach = (k) => objects()[k] && objects()[k].some(([x, y]) => Math.abs(x - st.mind.x) + Math.abs(y - st.mind.y) === 1);

    const WALL = ['luuuuuul', 'umuuuumu', 'uumuumuu', 'uuummuuu', 'uuummuuu', 'uumuumuu', 'umuuuumu', 'luuuuuul'];
    const FLOOR = ['usssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss'];
    const SPR = {
      voice: ['luuuuuul', 'ullllllu', 'ulsssslu', 'ullllllu', 'ulsssslu', 'ullllllu', 'umuuuumu', 'luuuuuul'],
      lightOff: ['luuuuuul', 'umuuuumu', 'uubbbbuu', 'uubssbuu', 'uubsgbuu', 'uubbbbuu', 'umuuuumu', 'luuuuuul'],
      lightOn: ['luuuuuul', 'umuuuumu', 'uubbbbuu', 'uubsgbuu', 'uubssbuu', 'uubbbbuu', 'umuuuumu', 'luuuuuul'],
      scratch: ['luuuuuul', 'ulululgu', 'ululugul', 'ululglul', 'ulugulul', 'uglululu', 'umuuuumu', 'luuuuuul'],
      seam: ['luuuguul', 'umugbmuu', 'uugbumul', 'uuugguuu', 'uuumgbuu', 'uumubguu', 'umugbumu', 'luuuguul'],
      seamSeen: ['luubbbul', 'umgsssmu', 'uugsssuu', 'uugsssuu', 'uugsssuu', 'uugsssuu', 'umgsssmu', 'luubbbul'],
      sword: ['...l....', '...l....', '.ggggg..', '...b....', '...b....', '.llbllm.', 'lllllmll', 'lmllllll'],
      swordPulled: ['...l....', '.ggggg..', '...b....', '...b....', '...b....', '.llbllm.', 'lllllmll', 'lmllllll'],
      honey: ['...cc...', '..gccg..', '..gggg..', '...gg...', '..gbgg..', '..gggg..', 'mmmmmmmm', '.m....m.'],
      door: ['pppppppp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmbmp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmmmp'],
      release: ['luuuuuul', 'umggggmu', 'uugbbruu', 'uugssguu', 'uugssguu', 'uugggguu', 'umuuuumu', 'luuuuuul'],
      released: ['luuuuuul', 'umppppmu', 'uupbbpuu', 'uupsspuu', 'uupsspuu', 'uuppppuu', 'umuuuumu', 'luuuuuul'],
      prisoner: ['........', '..llll..', '.lggggl.', '..gggg..', '.cccccc.', '.c.cc.c.', '..c..c..', '..m..m..']
    };
    const PAPER = ['........', '........', '..ll....', '..bbbg..', '..bbbg..', '.....g..', '........', '........'];
    const DRAFT_MARK = ['........', '........', '..g.....', '...g....', '..g.....', '........', '........', '........'];
    const MIND = ['........', '..yyyy..', '.yyyyyy.', '.yyyyyy.', '.yyyyyy.', '.yyyyyy.', '..yyyy..', '........'];

    const notes = {};
    el.querySelectorAll('.note').forEach((li) => {
      const k = li.dataset.note;
      const h = li.querySelector('.note-h');
      const body = li.querySelector('.note-body');
      if (!h || !body) return;
      const btn = doc.createElement('button');
      btn.type = 'button'; btn.className = 'note-btn';
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', body.id);
      btn.textContent = h.textContent;
      h.textContent = ''; h.appendChild(btn);
      li.hidden = true; body.hidden = true;
      notes[k] = { li, btn, body, title: btn.textContent, originalText: body.querySelector('p')?.textContent || '' };
      // A found note can be reread; it never moves the player or reveals an unseen object.
      btn.addEventListener('click', () => setOpen(k, btn.getAttribute('aria-expanded') !== 'true'));
    });
    const setOpen = (k, open) => {
      const n = notes[k];
      if (n) { n.btn.setAttribute('aria-expanded', String(open)); n.body.hidden = !open; }
    };
    const setThought = (text) => {
      if (thoughtEl) { thoughtEl.textContent = text; st.thoughtT = performance.now(); }
    };
    const tell = (text) => {
      if (liveEl) liveEl.textContent = text;
      if (text && thoughtEl) thoughtEl.textContent = '';
    };
    const labelFor = (k) => k === 'seams' && st.opening ? 'The narrow opening' : k === 'return' ? 'The opening behind you' : notes[k] ? notes[k].title : k;
    const directionTo = (x, y) => {
      const dx = x - st.mind.x, dy = y - st.mind.y;
      return (dy < 0 ? 'north' : dy > 0 ? 'south' : '') + (dx ? (dy ? '-' : '') + (dx < 0 ? 'west' : 'east') : '');
    };
    const faceTo = (k) => {
      for (const [x, y] of objects()[k] || []) {
        const dx = x - st.mind.x, dy = y - st.mind.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) { st.facing = [dx, dy]; return; }
      }
    };
    const revealNote = (k) => {
      st.seen.add(k);
      const n = notes[k];
      if (!n) return '';
      n.li.hidden = false; n.li.classList.add('is-seen'); setOpen(k, true);
      if (emptyEl) emptyEl.hidden = true;
      const p = n.body.querySelector('p');
      return p ? p.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    const draftVisible = () => st.area === 'room' && !st.opening && visible(DRAFT[0][0], DRAFT[0][1]);
    const examineDraft = () => {
      if (!draftVisible()) return;
      const first = !st.seen.has('draft');
      const text = revealNote('draft');
      setThought('The paper leans toward cooler air to the east.');
      tell(first ? 'The paper scrap. ' + text : st.looks % 2 ? 'You hold your breath. The paper keeps moving.' :
        'The scrap wrinkles against a stitch, then lifts again.'); updateView();
    };
    const updateView = () => {
      if (countEl) countEl.textContent = st.area === 'room' ? 'Inside the room' : st.choice ? 'Your choice is on record' : 'Inside the hallway';
      if (journalCountEl) journalCountEl.textContent = String(st.seen.size);
      const nearby = Object.keys(objects()).filter((k) => objects()[k].some(([x, y]) => visible(x, y)));
      const descriptions = nearby.map((k) => {
        const [x, y] = objects()[k].find(([px, py]) => visible(px, py));
        return labelFor(k) + ' to the ' + directionTo(x, y) + (withinReach(k) ? ', within reach' : '');
      });
      if (descriptionEl) descriptionEl.textContent = descriptions.length ? descriptions.join('. ') + '.' :
        (st.area === 'room' ? 'A small patch of padded floor.' : 'A narrow hallway. Keep walking.');
      if (descriptionEl && draftVisible()) descriptionEl.textContent += st.seen.has('draft') ? ' A paper scrap flutters east.' : ' A paper scrap flutters east. Look closer.';
      if (actionsEl) {
        actionsEl.replaceChildren();
        Object.keys(objects()).filter(withinReach).forEach((k) => {
          const btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-quiet btn-sm';
          const verbs = { sword: 'Pull the sword', honey: 'Touch the bear', light: 'Flip the switch', voice: 'Listen at the vent',
            scratch: 'Read the scratches', notice: 'Read the notice', doodle: 'Read the wall sketch', door: 'Try the door',
            chalk: 'Read the chalk', tally: 'Read the tally', prisoner: 'Talk to the prisoner', release: 'Read the panel' };
          btn.textContent = k === 'seams' ? (st.opening ? 'Step through the opening' : 'Feel the seam') :
            k === 'return' ? 'Return to the room' : verbs[k] || 'Interact with ' + labelFor(k).replace(/^The /, 'the ');
          btn.addEventListener('click', () => { faceTo(k); examine(k); });
          actionsEl.appendChild(btn);
        });
      }
      render();
    };
    const enter = (area) => {
      st.area = area; st.mind = area === 'hall' ? { x: 1, y: 4 } : { x: 13, y: 4 };
      st.facing = area === 'hall' ? [1, 0] : [-1, 0]; st.path = []; st.pending = null;
      if (choiceEl) choiceEl.hidden = true;
      const text = area === 'hall' ? 'The wall opens into a narrow hallway. Scratches catch the light ahead.' : 'You return through the opening. The room is still only partly visible.';
      setThought(text); tell(text); updateView();
    };
    const examine = (k) => {
      if (!withinReach(k)) return;
      if (k === 'return') { enter('room'); return; }
      if (k === 'seams' && st.opening) { enter('hall'); return; }
      const first = !st.seen.has(k);
      let text = revealNote(k);
      if (k === 'sword') {
        const pulls = ['You pull. It doesn’t budge. The stone seems very sure about this.',
          'You pull again. Still nothing. Apparently this is someone else’s hero’s journey.',
          'Two hands. Dramatic grunt. No sword. Excellent acoustics, though.'];
        text = pulls[st.swordPulls++ % pulls.length];
        if (notes.sword) notes.sword.body.querySelector('p').textContent = notes.sword.originalText + ' ' + text;
      } else if (k === 'honey') {
        const touches = ['For some reason you think of the show Silicon Valley. Weird. The honey bear is sticky.',
          'Your finger sticks to the bottle. The bear’s smile provides no explanation.',
          'Still sticky. You are beginning to suspect this bear has no useful advice.'];
        text = touches[st.honeyTouches++ % touches.length];
      }
      if (k === 'light') st.lights = true;
      if (k === 'seams') {
        st.opening = true;
        setThought('A draft. A loose panel. Enough room to pass through.');
      } else if (k === 'voice') setThought('What is the task asking for?');
      else if (k === 'door') setThought('The marked exit is locked. Air moves somewhere else.');
      else if (k === 'release') {
        if (choiceEl) {
          choiceEl.hidden = false;
          if (!st.choice) choiceEl.querySelector('button')?.focus({ preventScroll: true });
        }
        setThought(st.choice ? 'The locks have kept both choices.' : 'Two sealed choices. One set of locks.');
      } else if (first && st.area === 'hall') setThought('Someone was here before you.');
      tell(labelFor(k) + '. ' + text); updateView();
    };
    const choose = (choice) => {
      if (st.choice || st.area !== 'hall' || !withinReach('release')) return;
      // The other prisoner's answer was sealed before the player reached this panel.
      const otherChoice = 'hold';
      st.choice = choice;
      const own = choice === 'hold' ? 1 : 0;
      const other = choice === otherChoice ? 1 : 5;
      const text = 'Their sealed choice: hold the plate. ' + (choice === 'hold'
        ? 'You held yours. One shift passes; both doors open. You leave together, each with one shift lost.'
        : 'You reported them. Your door opens immediately. Their door stays locked for five shifts. You leave alone.');
      if (resultEl) { resultEl.hidden = false; resultEl.textContent = text; }
      el.querySelectorAll('[data-cell-decide]').forEach((btn) => {
        btn.disabled = true; btn.setAttribute('aria-pressed', String(btn.dataset.cellDecide === choice));
      });
      const n = notes.record;
      if (n) n.body.querySelector('p').textContent = 'Your choice: ' + (choice === 'hold' ? 'hold' : 'report') + '. Their choice: hold. Remaining shifts: you ' + own + ', the other prisoner ' + other + '. This is the record the next visitor would find.';
      revealNote('record'); setThought(choice === 'hold' ? 'Two doors open. Two people leave.' : 'One door opens. One person remains.');
      // The panel's status announces the outcome; clear the earlier examination message.
      tell(''); updateView();
    };
    el.querySelectorAll('[data-cell-decide]').forEach((btn) => btn.addEventListener('click', () => choose(btn.dataset.cellDecide)));

    const freeNextTo = (k) => {
      const out = [];
      (objects()[k] || []).forEach(([x, y]) => neighbours(x, y).forEach(([nx, ny]) => { if (!blocked(nx, ny) && visible(nx, ny)) out.push([nx, ny]); }));
      return out;
    };
    const bfs = (goals) => {
      const key = (x, y) => x + ',' + y;
      const goalSet = new Set(goals.map(([x, y]) => key(x, y)));
      const prev = new Map([[key(st.mind.x, st.mind.y), null]]);
      const q = [[st.mind.x, st.mind.y]];
      while (q.length) {
        const [x, y] = q.shift();
        if (goalSet.has(key(x, y))) {
          const path = []; let cur = key(x, y);
          while (cur && cur !== key(st.mind.x, st.mind.y)) {
            path.unshift(cur.split(',').map(Number)); cur = prev.get(cur);
          }
          return path;
        }
        for (const [nx, ny] of neighbours(x, y)) {
          const nk = key(nx, ny);
          if (!blocked(nx, ny) && visible(nx, ny) && !prev.has(nk)) { prev.set(nk, key(x, y)); q.push([nx, ny]); }
        }
      }
      return null;
    };
    const afterStep = () => {
      st.steps++;
      if (st.area === 'room' && !st.opening) {
        if (st.steps === 4) setThought('The padding squeaks underfoot. A very small round of applause.');
        else if (st.steps === 13) setThought('Something ticks. There is no clock in sight.');
      }
      if (choiceEl && !withinReach('release')) choiceEl.hidden = true;
      updateView();
    };
    const arrive = () => {
      const k = st.pending; st.pending = null;
      if (k) { faceTo(k); examine(k); } else updateView();
    };
    const walk = (goals, pendingKey) => {
      const path = bfs(goals);
      if (!path) return;
      tell('');
      st.pending = pendingKey || null;
      if (!motion) {
        path.forEach(([x, y]) => { st.mind.x = x; st.mind.y = y; afterStep(); });
        st.path = []; arrive(); return;
      }
      st.path = path; st.lastStep = 0;
      if (!path.length) arrive();
      kick();
    };
    const tryMove = (dx, dy) => {
      st.path = []; st.pending = null; st.facing = [dx, dy];
      const nx = st.mind.x + dx, ny = st.mind.y + dy;
      const k = objectAt(nx, ny);
      if (k) { examine(k); return; }
      if (blocked(nx, ny)) {
        tell(st.area === 'room' ? 'You press a palm into the padding. It slowly remembers being a wall.' :
          'Cold stone under your hand. Mortar dust catches on your fingers.'); updateView(); return;
      }
      st.mind.x = nx; st.mind.y = ny; tell(''); afterStep(); announce(descriptionEl?.textContent || 'You move one step.');
    };
    const examineFacing = () => {
      st.looks++;
      let k = objectAt(st.mind.x + st.facing[0], st.mind.y + st.facing[1]);
      if (!k) for (const [nx, ny] of neighbours(st.mind.x, st.mind.y)) { if (objectAt(nx, ny)) { k = objectAt(nx, ny); break; } }
      if (k && ['scratch', 'notice', 'doodle', 'chalk', 'tally'].includes(k)) {
        tell(labelFor(k) + '. ' + revealNote(k)); updateView();
      }
      else if (!k && draftVisible()) examineDraft();
      else {
        if (!k) k = Object.keys(objects()).filter((key) => objects()[key].some(([x, y]) => visible(x, y)))
          .sort((a, b) => Math.min(...objects()[a].map(([x, y]) => distance(x, y))) - Math.min(...objects()[b].map(([x, y]) => distance(x, y))))[0];
        const glimpses = { sword: 'A sword stuck in a stone. In here. Really.', honey: 'A bear-shaped bottle. Its plastic smile catches the light.',
          voice: 'A metal vent. The voice behind it pauses between instructions.', light: 'A small toggle, almost lost in all this padding.',
          seams: st.opening ? 'Two pads are parted. Darkness waits on the other side.' : 'Two pads don’t quite line up. A thread trembles between them.',
          scratch: 'Someone has scratched small letters into the wall.', notice: 'A crooked notice is stitched to the north wall.',
          doodle: 'A little drawing interrupts the padding.', door: 'A green EXIT sign. Optimistic.',
          return: 'The opening you came through is still there.', chalk: 'Chalk letters and an arrow that has been drawn twice.',
          tally: 'Five scratches. A few words beneath them.', prisoner: 'Someone stands at the other plate. They are watching you too.',
          release: 'Two plates, two doors, and a small metal panel.' };
        const floor = st.area === 'room' ? ['The floor is padded too. Someone took this interior design very seriously.',
          'A crescent-shaped dent in the padding. Your shoes are not crescent-shaped.',
          'Loose stitches. A dust bunny. Neither has been assigned a task.'] :
          ['Dust, worn stone, and a scuff that turns back on itself.', 'A shallow groove runs along the floor. Many feet, or one very determined foot.',
            'The stone is polished in the middle of the passage and rough at the edges.'];
        tell(k ? glimpses[k] || labelFor(k) + '.' : floor[(st.looks - 1) % floor.length]);
      }
    };
    const keyMove = (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
      if (map[e.key]) { e.preventDefault(); tryMove(...map[e.key]); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target === cv) { e.preventDefault(); examineFacing(); }
    };
    cv.addEventListener('keydown', keyMove);
    const textControls = el.querySelector('[data-cell-controls]');
    if (textControls) textControls.addEventListener('keydown', keyMove);
    el.querySelectorAll('[data-cell-move]').forEach((btn) => btn.addEventListener('click', () => tryMove(...btn.dataset.cellMove.split(',').map(Number))));
    el.querySelector('[data-cell-examine]')?.addEventListener('click', examineFacing);
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const camera = viewport();
      const tx = camera.x + Math.floor(((e.clientX - r.left) / r.width) * viewW), ty = camera.y + Math.floor(((e.clientY - r.top) / r.height) * viewH);
      if (!visible(tx, ty)) { tell('That is beyond your view. Walk closer.'); return; }
      if (draftVisible() && DRAFT.some(([x, y]) => x === tx && y === ty)) { examineDraft(); return; }
      const k = objectAt(tx, ty);
      if (k) {
        const goals = freeNextTo(k);
        if (withinReach(k)) { faceTo(k); examine(k); } else walk(goals, k);
      } else if (!blocked(tx, ty)) walk([[tx, ty]], null);
      if (!choiceEl || choiceEl.hidden) cv.focus({ preventScroll: true });
    });
    if (viewBtn) viewBtn.addEventListener('click', () => {
      const text = el.classList.toggle('cell-text-view');
      viewBtn.setAttribute('aria-pressed', String(text)); viewBtn.textContent = text ? 'Pixel view' : 'Text view';
      if (!text) { s.layout(); if (innerWidth > 700) cv.focus({ preventScroll: true }); }
    });
    if (!ctx) { el.classList.add('cell-text-view'); if (viewBtn) viewBtn.hidden = true; }
    if (resetBtn) resetBtn.addEventListener('click', () => {
      Object.assign(st, { area: 'room', mind: { ...START }, facing: [0, 1], lights: false, opening: false, choice: null, steps: 0, looks: 0, swordPulls: 0, honeyTouches: 0, path: [], pending: null, bumped: false });
      st.seen.clear();
      Object.keys(notes).forEach((k) => { notes[k].li.hidden = true; notes[k].li.classList.remove('is-seen');
        notes[k].body.querySelector('p').textContent = notes[k].originalText; setOpen(k, false); });
      if (emptyEl) emptyEl.hidden = false;
      if (choiceEl) choiceEl.hidden = true;
      if (resultEl) { resultEl.hidden = true; resultEl.textContent = ''; }
      el.querySelectorAll('[data-cell-decide]').forEach((btn) => { btn.disabled = false; btn.setAttribute('aria-pressed', 'false'); });
      setThought(''); tell('The room is reset. You have only a small patch of light.'); updateView();
    });

    const blit = (rows, tx, ty) => {
      const ox = tx * T, oy = ty * T;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const c = rows[y][x];
        if (c !== '.') buf[(oy + y) * CW + ox + x] = P32[c];
      }
    };
    const tileSprite = (x, y, showObjects = true) => {
      const k = showObjects ? objectAt(x, y) : null;
      if (k === 'voice') return SPR.voice;
      if (k === 'light') return st.lights ? SPR.lightOn : SPR.lightOff;
      if (k === 'scratch' || k === 'notice' || k === 'doodle' || k === 'chalk' || k === 'tally') return SPR.scratch;
      if (k === 'seams') return st.opening && y === 4 ? SPR.seamSeen : SPR.seam;
      if (k === 'return') return SPR.seamSeen;
      if (k === 'door') return SPR.door;
      if (k === 'release') return st.choice ? SPR.released : SPR.release;
      return isWall(x, y) ? WALL : FLOOR;
    };
    const render = () => {
      if (!ctx) return;
      buf.fill(P32.s);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = distance(x, y), lit = d <= radius(), dim = d === radius() + 1;
        if (!lit && !dim) continue;
        blit(tileSprite(x, y, lit), x, y);
        if (lit && st.area === 'room' && !st.opening && DRAFT.some(([px, py]) => px === x && py === y)) {
          blit(x === DRAFT[0][0] && y === DRAFT[0][1] ? PAPER : DRAFT_MARK, x, y);
        }
        const k = lit ? objectAt(x, y) : null;
        if (k === 'sword') blit(st.swordPulls ? SPR.swordPulled : SPR.sword, x, y);
        else if (k === 'honey') blit(SPR.honey, x, y);
        else if (k === 'prisoner') blit(SPR.prisoner, x, y);
        if (dim) for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
          if (((xx + yy) & 1) === 0) buf[(y * T + yy) * CW + x * T + xx] = P32.s;
        }
      }
      const mx = st.mind.x * T, my = st.mind.y * T, bob = motion && st.blink ? 1 : 0;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (MIND[y][x] !== '.') buf[(my + y - bob) * CW + mx + x] = P32.y;
      const [fx, fy] = st.facing, ey = 3 + (fy > 0 ? 1 : fy < 0 ? -1 : 0) - bob, ex = fx > 0 ? 1 : fx < 0 ? -1 : 0;
      buf[(my + ey) * CW + mx + 2 + ex] = P32.s; buf[(my + ey) * CW + mx + 5 + ex] = P32.s;
      const camera = viewport();
      ctx.putImageData(img, -camera.x * T, -camera.y * T);
    };
    const s = {};
    s.layout = () => {
      if (ctx) {
        const phone = innerWidth <= 700;
        viewW = phone ? 9 : W; viewH = phone ? 7 : H;
        const width = viewW * T, height = viewH * T, w = frameEl.clientWidth || width * 3;
        const scale = clamp(Math.min(Math.floor(w / width), Math.floor(innerHeight * (phone ? .32 : .66) / height)), 1, 8);
        sizeCanvas(cv, width, height, scale);
      }
      render();
    };
    s.tick = (t) => {
      if (st.path.length && t - st.lastStep > 95) {
        st.lastStep = t;
        const [nx, ny] = st.path.shift(); st.facing = [nx - st.mind.x, ny - st.mind.y]; st.mind.x = nx; st.mind.y = ny;
        afterStep(); if (!st.path.length) arrive();
      }
      const b = Math.floor(t / 650) % 2 === 1;
      if (b !== st.blink) { st.blink = b; render(); }
      if (thoughtEl && thoughtEl.textContent && performance.now() - st.thoughtT > 6500) thoughtEl.textContent = '';
      return !!ctx || st.path.length > 0;
    };
    s.motionChanged = (m) => {
      st.blink = false;
      if (!m && st.path.length) {
        const end = st.path[st.path.length - 1]; st.mind = { x: end[0], y: end[1] }; st.path = []; arrive();
      }
      render();
    };
    updateView(); s.layout(); register(el, s);
  };
  doc.querySelectorAll('[data-cell]').forEach(Cell);

  /* ================================================================== THE TREE
     Roots first, then mycelium, trunk, branches, leaves (rhythms, cycling through four seasons),
     senses, and one saffron growing tip. Growth follows scroll; the part being read lights up. */
  const Tree = (el) => {
    const cv = el.querySelector('.tree-canvas');
    const stage = el.querySelector('.tree-stage');
    const frameEl = el.querySelector('.tree-frame');
    const partList = el.querySelector('.tree-parts');
    if (!cv || !stage || !frameEl) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const parts = Array.from(el.querySelectorAll('.part'));
    const TW = 128, TH = 160, GY = 82, CX = 64;
    const R = rng(1990);
    const px = [];
    const add = (x, y, c, part, t, ph = 0) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < TW && y < TH) px.push({ x, y, c, part, t, ph });
    };
    const line = (x0, y0, x1, y1, fn) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        fn(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    // Curves pass through every named joint; short raster lines keep adjacent pixels connected.
    const samplesFor = (points) => {
      const samples = [], joints = [], last = points.length - 1;
      let length = 0;
      for (let k = 0; k < last; k++) {
        const a = points[Math.max(0, k - 1)], b = points[k], c = points[k + 1], d = points[Math.min(last, k + 2)];
        joints[k] = length;
        const steps = Math.max(8, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 3));
        for (let j = 0; j <= steps; j++) {
          if (k && !j) continue;
          const u = j / steps, u2 = u * u, u3 = u2 * u;
          const at = [0, 1].map((axis) => 0.5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * u +
            (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * u2 + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * u3));
          const previous = samples[samples.length - 1];
          if (previous) length += Math.hypot(at[0] - previous.x, at[1] - previous.y);
          samples.push({ x: at[0], y: at[1], length });
        }
      }
      joints[last] = length;
      return { samples, joints: joints.map((n) => n / (length || 1)), length };
    };
    const path = (points, part, t0, t1, width = 0) => {
      const curve = samplesFor(points);
      curve.samples.forEach((point, i) => {
        const previous = curve.samples[Math.max(0, i - 1)], next = curve.samples[Math.min(curve.samples.length - 1, i + 1)];
        const f = point.length / (curve.length || 1), t = lerp(t0, t1, f);
        const dx = next.x - previous.x, dy = next.y - previous.y, n = Math.hypot(dx, dy) || 1;
        const radius = Math.floor(width * (1 - f * 0.8));
        line(previous.x, previous.y, point.x, point.y, (x, y) => {
          add(x, y, part === 'mycelium' ? 'l' : 'g', part, t);
          for (let w = 1; w <= radius; w++) {
            add(x - dy / n * w, y + dx / n * w, 'l', part, t);
            add(x + dy / n * w, y - dx / n * w, 'l', part, t);
          }
        });
      });
      return { points, times: curve.joints.map((f) => lerp(t0, t1, f)) };
    };

    // Taproots and feeders share exact joints and reveal only after those joints exist.
    const left = path([[CX - 1, GY], [60, 96], [46, 113], [40, 132], [30, 153]], 'roots', .02, .255, 1.8);
    const right = path([[CX + 1, GY], [69, 96], [83, 109], [94, 128], [110, 144]], 'roots', .02, .25, 1.8);
    const deep = path([[CX, GY], [65, 100], [62, 121], [65, 141], [62, 157]], 'roots', .025, .275, 1.3);
    const feeder = (parent, joint, tail, end) => path([parent.points[joint], ...tail], 'roots', parent.times[joint], end, .8);
    feeder(left, 1, [[45, 101], [25, 114], [7, 132]], .26);
    feeder(left, 2, [[34, 123], [19, 147]], .28);
    feeder(left, 3, [[46, 142], [42, 155]], .28);
    feeder(right, 1, [[86, 99], [105, 113], [122, 130]], .26);
    feeder(right, 2, [[80, 126], [91, 152]], .27);
    feeder(deep, 1, [[74, 114], [72, 135]], .27);

    // A few broken fungal threads, not an enclosing border or a solid soil panel.
    [[[7, 132], [3, 136], [2, 142]], [[19, 147], [27, 151], [30, 153]],
      [[62, 157], [78, 156], [91, 152]], [[122, 130], [125, 137], [124, 143]]].forEach((points, i) => {
      const begin = px.length;
      path(points, 'mycelium', .285 + i * .006, .40 + i * .003);
      for (let j = px.length - 1; j >= begin; j--) if ((px[j].x + px[j].y) % 3 === 0) px.splice(j, 1);
    });
    const ground = Array.from({ length: 50 }, () => {
      const x = 23 + Math.floor(R() * 87);
      return { x, y: GY + Math.round(Math.sin(x * .13) + (R() - .5) * 3), c: R() < .7 ? 'm' : 'u' };
    });

    const trunk = [[CX, GY], [63, 70], [66, 59], [CX, 46]];
    path(trunk, 'trunk', .415, .53, 2.6);
    const leaves = [];
    const branch = (x, y, ang, len, depth, t0, span) => {
      const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
      const bend = (R() - .5) * .24, t1 = t0 + span;
      path([[x, y], [x + Math.cos(ang - bend) * len * .38, y - Math.sin(ang - bend) * len * .38],
        [x2 - Math.cos(ang + bend) * len * .24, y2 + Math.sin(ang + bend) * len * .24], [x2, y2]], 'branches', t0, t1, depth >= 2 ? 1.3 : .4);
      if (depth === 0) { leaves.push([x2, y2, 4 + Math.floor(R() * 3)]); return [x2, y2]; }
      if (depth === 1) leaves.push([x2, y2, 3]);
      branch(x2, y2, ang + .28 + R() * .2, len * .65, depth - 1, t1, span * .7);
      branch(x2, y2, ang - .28 - R() * .2, len * .60, depth - 1, t1, span * .7);
      return [x2, y2];
    };
    let fruitJoint;
    [[2.72, 20, trunk[2]], [2.25, 19, trunk[3]], [1.8, 18, trunk[3]],
      [1.3, 19, trunk[3]], [.83, 21, trunk[3]], [.38, 20, trunk[2]]].forEach(([ang, length, joint], i) => {
      const end = branch(joint[0], joint[1], ang, length, 2, .53, .073);
      if (i === 0) fruitJoint = end;
    });
    leaves.forEach(([lx, ly, r]) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d > r + .3 || (d > r - 1.1 && R() < .4)) continue;
        const t = lerp(.70, .86, clamp(d / r * .72 + R() * .24, 0, 1));
        add(lx + x, ly + y, R() < .35 ? 'p' : 'c', 'rhythms', t, Math.floor(R() * 4));
      }
    });
    const leafPx = px.filter((p) => p.part === 'rhythms');
    for (let i = 0; i < 8; i++) {
      const p = leafPx[Math.floor(R() * leafPx.length)];
      add(p.x, p.y, 'b', 'senses', .875 + i * .008, i);
    }
    // The fruit hangs from an existing branch, rather than a separate fixed coordinate.
    const fruit = { x: Math.round(fruitJoint[0] + 2), y: Math.round(fruitJoint[1] + 9) };
    path([fruitJoint, [fruit.x, fruit.y - 5], [fruit.x, fruit.y - 2]], 'tip', .94, .975);
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      if (x * x + y * y < 7) add(fruit.x + x, fruit.y + y, x === -1 && y === -1 ? 'b' : 'y', 'tip', .99);
    }

    const SEASON = ['p', 'c', 'l', 'm'];
    const BOUNDS = [0, .28, .415, .53, .70, .87, .94, 1];
    const SITTER = ['.......g.......', '......ggg......', '....ccgggcc....', '....ccccccc....',
      '.....ccccc.....', '....ccbccbc....', '.....ccccc.....', '......ccc......', '....ccccccc....',
      '...ccc.c.ccc...', '...cc..c..cc...', '....c.ccc.c....', '.....ccccc.....', '..cccc...cccc..',
      '.ccc..ccc..ccc.', '..ccccccccccc..', '....ccccccc....'];
    let progress = motion ? 0 : 1, active = null, lastDraw = 0, season = 0, senseBlink = 0;
    let sitterStarted = false, sitterDone = false, sitterElapsed = 0, sitterLastT = 0;
    const syncPassage = () => {
      if (!parts.length) { progress = 1; return; }
      const horizontal = partList && getComputedStyle(partList).display === 'flex' && partList.scrollWidth > partList.clientWidth + 1;
      const listRect = horizontal ? partList.getBoundingClientRect() : null;
      const readingLine = horizontal ? listRect.left + listRect.width * .5 : innerHeight * .55;
      const rects = parts.map((part) => part.getBoundingClientRect());
      let index = 0, nearest = Infinity;
      rects.forEach((r, i) => {
        const center = horizontal ? r.left + r.width * .5 : r.top + r.height * .5;
        const d = Math.abs(center - readingLine);
        if (d < nearest) { nearest = d; index = i; }
      });
      active = parts[index].dataset.part;
      parts.forEach((part, i) => part.classList.toggle('is-active', i === index));
      const r = rects[index], phase = horizontal ? 1 : clamp((readingLine - r.top) / Math.max(1, r.height * .65), 0, 1);
      const n = Math.min(index, BOUNDS.length - 2);
      progress = lerp(BOUNDS[n], BOUNDS[n + 1], phase);
      if (progress >= .995 && !sitterStarted) {
        sitterStarted = true; sitterDone = !motion; sitterElapsed = motion ? 0 : 2600; sitterLastT = 0; kick();
      }
    };
    const floatHeight = () => {
      if (!motion || sitterDone) return 0;
      const t = sitterElapsed / 2600;
      const rise = smooth(.05, .32, t), land = 1 - smooth(.55, .9, t);
      return Math.round(4 * rise * land);
    };
    const draw = () => {
      ctx.clearRect(0, 0, TW, TH);
      ground.forEach((q) => { ctx.fillStyle = PAL[q.c]; ctx.fillRect(q.x, q.y, 1, 1); });
      const p = motion ? progress : 1;
      for (const q of px) {
        if (q.t > p) continue;
        let c = q.c;
        if (q.part === 'rhythms') c = active === 'rhythms' ? (q.c === 'p' ? 'b' : 'p') : (motion ? SEASON[(q.ph + season) % 4] : q.c);
        else if (q.part === 'senses') { if (motion && (q.ph + senseBlink) % 5 === 0) c = 'l'; }
        else if (active === q.part && q.part !== 'tip') c = 'b';
        ctx.fillStyle = PAL[c]; ctx.fillRect(q.x, q.y, 1, 1);
      }
      if (active === 'tip' && p >= .99) {
        ctx.fillStyle = COLORS.bone;
        [[-4, 0], [4, 0], [0, -4], [0, 4]].forEach(([dx, dy]) => ctx.fillRect(fruit.x + dx, fruit.y + dy, 1, 1));
      }
      if (p >= .995) {
        const x0 = 81, y0 = GY - SITTER.length + 1 - floatHeight();
        ctx.fillStyle = COLORS.under; ctx.fillRect(x0 + 4, GY + 1, 7, 1);
        SITTER.forEach((row, y) => Array.from(row).forEach((c, x) => {
          if (c !== '.') { ctx.fillStyle = PAL[c]; ctx.fillRect(x0 + x, y0 + y, 1, 1); }
        }));
      }
    };
    const s = {};
    s.layout = () => {
      const w = frameEl.clientWidth || TW * 3;
      const k = clamp(Math.min(Math.floor(w / TW), Math.floor(innerHeight * .8 / TH)), 1, 6);
      sizeCanvas(cv, TW, TH, k); syncPassage(); draw();
    };
    s.onScroll = () => { syncPassage(); draw(); };
    s.onShow = () => { sitterLastT = 0; syncPassage(); draw(); };
    s.onHide = () => { sitterLastT = 0; };
    s.tick = (t) => {
      if (progress >= .995 && sitterStarted && !sitterDone) {
        if (!sitterLastT) sitterLastT = t;
        sitterElapsed += Math.min(160, Math.max(0, t - sitterLastT)); sitterLastT = t;
        if (sitterElapsed >= 2600) { sitterElapsed = 2600; sitterDone = true; }
      } else sitterLastT = 0;
      if (t - lastDraw > 110) {
        lastDraw = t; season = Math.floor(t / 2200) % 4; senseBlink = Math.floor(t / 420); draw();
      }
      return true;
    };
    s.motionChanged = (m) => {
      if (!m) { sitterDone = true; sitterElapsed = 2600; }
      sitterLastT = 0; syncPassage(); draw();
    };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) sitterLastT = 0; });
    if (partList) partList.addEventListener('scroll', () => { syncPassage(); draw(); kick(); }, { passive: true });
    s.layout(); register(el, s);
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
      const warmAmount = smooth(0.2, 0.95, a) * smooth(0.3, 0.46, pp) * 0.42;
      if (a > 0) {
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
          // A few warm highlights move within the green edge; their two-row blend follows it continuously.
          const u = (x + 0.5) / cols, edge = smooth(0.02, 0.22, u) * smooth(0.02, 0.22, 1 - u);
          const flow = Math.pow(0.5 + 0.5 * Math.sin((u - 0.5) * 10.5 - t * 0.00012 + Math.PI / 2), 6);
          const warmth = warmAmount * edge * flow, yt = yb - 0.75;
          for (let y = Math.floor(yt); y <= Math.ceil(yt); y++) {
            if (y < 0 || y >= rows) continue;
            const weight = warmth * (1 - Math.abs(y - yt)), inv = 1 - weight, i = y * cols + x, base = buf[i];
            buf[i] = (0xff000000 | ((((base >>> 16) & 255) * inv + ((P32.y >>> 16) & 255) * weight) << 16) |
              ((((base >>> 8) & 255) * inv + ((P32.y >>> 8) & 255) * weight) << 8) |
              ((base & 255) * inv + (P32.y & 255) * weight)) >>> 0;
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
    s.onShow = () => { p = progressNow(); lastQ = -1; draw(motion ? performance.now() : 0); };
    s.tick = (t) => {
      if (t - lastDraw > 66) { lastDraw = t; draw(t); }
      return true;
    };
    s.motionChanged = () => { lastQ = -1; p = progressNow(); draw(performance.now()); };
    s.layout();
    register(sec, s);
  };
  doc.querySelectorAll('.scene-sky').forEach(Sky);

  /* ================================================================== THE ANCESTRAL PLANE
     987 real commits on a sunflower spiral, first at the centre, newest at the rim; thirteen
     constellations around it. The slider and the field notes replay the history day by day. */
  const Plane = (el) => {
    const D = ANCESTRY;
    const cv = el.querySelector('.plane-canvas');
    const frameEl = el.querySelector('.plane-frame');
    const range = el.querySelector('[data-plane-range]');
    const dateEl = el.querySelector('[data-plane-date]');
    const statEl = el.querySelector('[data-plane-stat]');
    const playBtn = el.querySelector('[data-plane-play]');
    if (!D || !cv || !range) return;
    const ctx = cv.getContext('2d');
    const kinds = D.kinds;
    const N = kinds.length;
    const cday = new Array(N);
    let idx = 0;
    D.days.forEach(([d, n]) => { for (let i = 0; i < n; i++) cday[idx++] = d; });
    const MAXD = 130;
    const START = Date.UTC(2026, 4, 21);
    const iso = (d) => new Date(START + d * 864e5).toISOString().slice(0, 10);
    const KC = { w: 'b', b: 'p', o: 'g', f: 'r', a: 'l' };
    const GA = Math.PI * (3 - Math.sqrt(5));
    // co-author lines per constellation; null = on record, not counted that way
    const LANES = Array(13).fill(null);
    const SHAPES = [
      [[0, 0], [4, -2], [8, -1], [10, 3], [6, 5]],
      [[0, 0], [3, 3], [7, 2], [9, -2]],
      [[0, 0], [2, -4], [6, -5], [8, -1], [5, 2]],
      [[0, 0], [5, 1], [9, -2]]
    ];
    let cols = 0, rows = 0, pts = [], lanePos = [], bgStars = [];
    let day = MAXD, anim = null, played = false;

    const layoutGeometry = () => {
      const w = frameEl ? frameEl.clientWidth : 600;
      const portrait = w < 560;
      cols = portrait ? 128 : 176;
      rows = portrait ? 132 : 112;
      const k = clamp(Math.min(Math.floor(w / cols), Math.floor((innerHeight * 0.52) / rows)), 1, 6);
      sizeCanvas(cv, cols, rows, k);
      const cx = portrait ? 64 : 88, cy = portrait ? 52 : 56, R = portrait ? 46 : 52;
      const c = R / Math.sqrt(N);
      pts = kinds.split('').map((_, i) => {
        const r = c * Math.sqrt(i + 0.5), a = i * GA;
        return [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
      });
      lanePos = LANES.map((_, i) => {
        if (portrait) {
          const row = i < 7 ? 0 : 1, col = i < 7 ? i : i - 7;
          return [7 + col * 16 + (row ? 8 : 0), 110 + row * 12];
        }
        const left = i % 2 === 0, j = Math.floor(i / 2);
        return [left ? 6 + (j % 2) * 8 : 150 - (j % 2) * 8, 10 + j * 15];
      });
      const r = rng(31);
      bgStars = Array.from({ length: 70 }, () => [Math.floor(r() * cols), Math.floor(r() * rows), r()]);
    };

    const draw = () => {
      ctx.clearRect(0, 0, cols, rows);
      bgStars.forEach(([x, y, b]) => { ctx.fillStyle = b > 0.8 ? COLORS.lichen : COLORS.moss; ctx.fillRect(x, y, 1, 1); });
      // lanes
      LANES.forEach((count, i) => {
        const [ox, oy] = lanePos[i];
        const shape = SHAPES[i % SHAPES.length];
        ctx.fillStyle = COLORS.moss;
        for (let j = 0; j < shape.length - 1; j++) {
          const [ax, ay] = shape[j], [bx, by] = shape[j + 1];
          const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
          for (let s = 1; s < n; s += 2) ctx.fillRect(Math.round(ox + ax + ((bx - ax) * s) / n), Math.round(oy + ay + ((by - ay) * s) / n), 1, 1);
        }
        shape.forEach(([sx, sy], j) => {
          const x = ox + sx, y = oy + sy;
          const big = j === 0 && count !== null && count >= 50;
          ctx.fillStyle = count === null ? COLORS.lichen : (j === 0 ? COLORS.bone : COLORS.sage);
          ctx.fillRect(x, y, 1, 1);
          if (big) {
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
            if (count >= 200) { ctx.fillStyle = COLORS.sage; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); }
          }
        });
      });
      // commits
      let newest = -1;
      for (let i = 0; i < N; i++) if (cday[i] <= day) newest = i;
      for (let i = 0; i < N; i++) {
        const lit = cday[i] <= day;
        ctx.fillStyle = i === newest ? COLORS.saffron : lit ? PAL[KC[kinds[i]]] : COLORS.moss;
        ctx.fillRect(pts[i][0], pts[i][1], 1, 1);
      }
    };

    const stats = () => {
      let n = 0, auto = 0;
      for (let i = 0; i < N; i++) if (cday[i] <= day) { n++; if (kinds[i] === 'a') auto++; }
      return { n, auto };
    };
    const syncText = (announceIt, note) => {
      const d = iso(day);
      const { n, auto } = stats();
      range.value = String(day);
      range.setAttribute('aria-valuetext', d + ', ' + n + ' commits');
      if (dateEl) dateEl.textContent = d;
      if (statEl) statEl.textContent = n + ' commits · ' + auto + ' autosaves';
      if (announceIt) announce('By ' + d + ': ' + n + ' commits, ' + auto + ' of them autosaves.' + (note ? ' ' + note : ''));
    };
    const setDay = (d, announceIt, note) => {
      day = clamp(Math.round(d), 0, MAXD);
      draw();
      syncText(announceIt, note);
    };

    range.addEventListener('input', () => { anim = null; played = true; setDay(+range.value, false); });
    range.addEventListener('change', () => setDay(+range.value, true));

    const play = () => {
      played = true;
      if (!motion) { setDay(MAXD, true); return; }
      anim = { elapsed: 0, lastT: 0 };
      setDay(0, false);
      kick();
    };
    if (playBtn) playBtn.addEventListener('click', play);

    // field notes become buttons that move the plane to their date
    const fnBtns = [];
    el.querySelectorAll('[data-fieldnotes] li').forEach((li) => {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'fn-btn';
      while (li.firstChild) b.appendChild(li.firstChild);
      li.appendChild(b);
      li.classList.add('has-btn');
      fnBtns.push(b);
      b.addEventListener('click', () => {
        anim = null;
        played = true;
        fnBtns.forEach((x) => x.removeAttribute('aria-current'));
        b.setAttribute('aria-current', 'true');
        const t = b.querySelector('.fn-t');
        setDay(+li.dataset.day, true, t ? t.textContent : '');
      });
    });

    const s = {};
    s.layout = () => { layoutGeometry(); draw(); };
    s.tick = (t) => {
      if (!anim) return false;
      if (!anim.lastT) anim.lastT = t;
      anim.elapsed += Math.min(160, Math.max(0, t - anim.lastT));
      anim.lastT = t;
      const f = clamp(anim.elapsed / 5200, 0, 1);
      const d = Math.round(f * f * MAXD);
      if (d !== day) setDay(d, false);
      if (f >= 1) { anim = null; syncText(true); return false; }
      return true;
    };
    s.onShow = () => { if (anim) anim.lastT = 0; if (!played && motion) play(); };
    s.onHide = () => { if (anim) anim.lastT = 0; };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden && anim) anim.lastT = 0; });
    s.motionChanged = (m) => { if (!m && anim) { anim = null; setDay(MAXD, false); } };
    s.layout();
    syncText(false);
    register(el, s);
  };
  doc.querySelectorAll('[data-plane]').forEach(Plane);

})();
