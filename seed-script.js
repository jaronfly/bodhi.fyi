/* Bodhi, the seed · seed-script.js
   The page side of everything after the orchard: the lockup seed, the honey bear that unpacks, the
   playable padded cell, the tree society, the ancestral plane, copy buttons, the credits and the one
   motion control. Progressive enhancement only: every word is in the HTML and reads without this.
   Pixel art is drawn one canvas pixel per art pixel and scaled by whole numbers.

   Motion: one switch for the whole site. Motion is off when the system asks for reduced motion or the
   film's Stillness button is pressed (cinema.js sets body.still-frames). The pill at the bottom of the
   seed script presses that same button, so there is only ever one state. Then every scene here shows a
   complete still frame, and the orchard above is paused too. No storage, no network, no globals. */
import { ANCESTRY } from './seed-journey/ancestry.js';

const doc = document;
const field = doc.getElementById('seed-script');
if (field) init();

function init() {
  field.classList.add('ss-js');
  const body = doc.body;

  /* ------------------------------------------------------------------ helpers */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const u32 = (hex) => { const n = parseInt(hex.slice(1), 16); return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0; };
  const sizeCanvas = (cv, cols, rows, k) => {
    if (cv.width !== cols) cv.width = cols;
    if (cv.height !== rows) cv.height = rows;
    cv.style.width = cols * k + 'px';
    cv.style.height = rows * k + 'px';
  };
  const announcer = doc.createElement('div');
  announcer.className = 'sr-only';
  announcer.setAttribute('aria-live', 'polite');
  field.appendChild(announcer);
  let announceT = 0;
  const announce = (msg) => { clearTimeout(announceT); announcer.textContent = ''; announceT = setTimeout(() => { announcer.textContent = msg; }, 40); };

  /* ------------------------------------------------------------------ the one motion control */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stillBtn = doc.getElementById('stillness');
  const motionAllowed = () => !reduced.matches && !body.classList.contains('still-frames');
  let motion = motionAllowed();
  const pillWrap = field.querySelector('[data-ss-motion]');
  const pill = field.querySelector('[data-ss-still]');
  const syncPill = () => {
    if (!pill) return;
    const still = !motion;
    pill.setAttribute('aria-pressed', String(still));
    pill.innerHTML = still ? 'Motion <span aria-hidden="true">▷</span>' : 'Stillness <span aria-hidden="true">Ⅱ</span>';
    pill.title = still ? 'Let the whole page move again' : 'Freeze the whole page into still frames';
    pill.disabled = reduced.matches;
    if (reduced.matches) pill.title = 'Your system asks for reduced motion, so the page stays still';
  };
  if (pill) pill.addEventListener('click', () => { if (stillBtn) stillBtn.click(); });

  // The orchard keeps its own pause button; Stillness presses it for the visitor and releases it after.
  const worldPause = doc.getElementById('world-pause');
  let pausedWorldForStillness = false;
  const syncOrchard = () => {
    if (!worldPause) return;
    const paused = body.classList.contains('world-still');
    if (!motion && !paused) { worldPause.click(); pausedWorldForStillness = true; }
    else if (motion && paused && pausedWorldForStillness) { worldPause.click(); pausedWorldForStillness = false; }
  };

  const scenes = [];
  let raf = 0;
  const frame = (t) => {
    raf = 0;
    if (!motion || doc.hidden) return;
    let again = false;
    for (const s of scenes) if (s.visible && s.tick && s.tick(t)) again = true;
    if (again) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && motion && !doc.hidden) raf = requestAnimationFrame(frame); };
  doc.addEventListener('visibilitychange', kick);

  const onMotion = () => {
    const was = motion;
    motion = motionAllowed();
    field.classList.toggle('ss-motion-on', motion);
    syncPill();
    if (was !== motion) {
      syncOrchard();
      scenes.forEach((s) => s.motionChanged && s.motionChanged(motion));
      doc.dispatchEvent(new CustomEvent('bodhi:motion', { detail: { motion } }));
      kick();
    }
  };
  new MutationObserver(onMotion).observe(body, { attributes: true, attributeFilter: ['class'] });
  if (reduced.addEventListener) reduced.addEventListener('change', onMotion); else if (reduced.addListener) reduced.addListener(onMotion);
  field.classList.toggle('ss-motion-on', motion);
  syncPill();
  if (!motion) syncOrchard();

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
  const register = (el, s) => { el.__scene = s; s.visible = false; scenes.push(s); io.observe(el); };
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => scenes.forEach((s) => s.layout && s.layout()), 120); });

  // The world, the rail and the pill appear only while the seed script is on screen.
  const near = new IntersectionObserver((entries) => {
    const on = entries[entries.length - 1].isIntersecting;
    field.classList.toggle('ss-near', on);
    if (pillWrap) pillWrap.hidden = !on;
  }, { rootMargin: '0px 0px 0px 0px' });
  near.observe(field);

  /* ================================================================== THE SEED (the lockup)
     The brand's Seed animation: the dot leaves the i, arcs over the word, burrows into untouched soil,
     two root tips grow at once (the short root ends first), then the sprout rises, then a new seed
     appears on the i. Frames at 80 ms, whole pixels on a 35x13 grid. */
  const BONE = '#F2EEE4', SAFFRON = '#E8982A';
  const SEED_FRAMES = (() => {
    const G = { b: ['#...', '#...', '###.', '#..#', '#..#', '###.'], o: ['....', '....', '.##.', '#..#', '#..#', '.##.'], d: ['...#', '...#', '.###', '#..#', '#..#', '.###'], h: ['#...', '#...', '###.', '#..#', '#..#', '#..#'], i: ['o', '.', '#', '#', '#', '#'] };
    const WORD = [0, 1, 2, 3, 4, 5].map((r) => 'bodhi'.split('').map((c) => G[c][r]).join('.'));
    const W = 35, H = 13, MY = 3, WX = 14, WY = 7;
    const LEFT = [[5, 4], [4, 5], [3, 6], [3, 7], [2, 8]], RIGHT = [[6, 4], [7, 5], [8, 6]];
    const ROOT_STEPS = [[[5, 3]]];
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
    const ALL_ROOTS = upTo(ROOT_STEPS, ROOT_STEPS.length), ALL_SPROUT = upTo(SPROUT_STEPS, SPROUT_STEPS.length);
    const out = [];
    const hold = (f, n) => { for (let k = 0; k < n; k++) out.push(f); };
    hold(make(null, [], [], [], true), 12);
    for (let s = 1; s <= 18; s++) { const t = s / 18; out.push(make([Math.round(34 + (5 - 34) * t), Math.round(7 + (5 - 7) * t - 6 * Math.sin(Math.PI * t))], [], [], [], false)); }
    hold(make([5, 5], [], [], [], false), 4);
    ROOT_STEPS.forEach((tips, k) => hold(make(null, upTo(ROOT_STEPS, k), tips, [], false), k === 0 ? 6 : 4));
    hold(make(null, ALL_ROOTS, [], [], false), 5);
    SPROUT_STEPS.forEach((_, k) => hold(make(null, ALL_ROOTS, [], upTo(SPROUT_STEPS, k + 1), false), 3));
    hold(make(null, ALL_ROOTS, [], ALL_SPROUT, false), 16);
    hold(make(null, ALL_ROOTS, [], ALL_SPROUT, true), 14);
    return out;
  })();
  field.querySelectorAll('[data-seed]').forEach((fig) => {
    const cv = fig.querySelector('.seed-canvas'), frameEl = fig.querySelector('.seed-frame');
    const btn = fig.querySelector('[data-seed-replay]'), svg = fig.querySelector('.seed-static');
    if (!cv || !frameEl) return;
    const ctx = cv.getContext('2d');
    const last = SEED_FRAMES.length - 1;
    const maxW = fig.classList.contains('seed-stage-sm') ? 420 : 840;
    cv.removeAttribute('aria-hidden'); cv.setAttribute('role', 'img');
    if (svg) cv.setAttribute('aria-label', svg.getAttribute('aria-label'));
    const s = { i: last, playing: false, t0: 0, played: false };
    const draw = () => {
      const g = SEED_FRAMES[s.i];
      ctx.clearRect(0, 0, 35, 13);
      for (let y = 0; y < 13; y++) for (let x = 0; x < 35; x++) { const v = g[y][x]; if (!v) continue; ctx.fillStyle = v === 1 ? BONE : SAFFRON; ctx.fillRect(x, y, 1, 1); }
    };
    s.layout = () => { const w = Math.min((frameEl.clientWidth || maxW) - 8, maxW); sizeCanvas(cv, 35, 13, clamp(Math.floor(w / 35), 2, 24)); draw(); };
    s.play = () => { s.played = true; if (!motion) { s.i = last; s.playing = false; draw(); return; } s.i = 0; s.t0 = 0; s.playing = true; draw(); kick(); };
    s.tick = (t) => {
      if (!s.playing) return false;
      if (!s.t0) s.t0 = t;
      const i = Math.min(Math.floor((t - s.t0) / 80), last);
      if (i !== s.i) { s.i = i; draw(); }
      if (s.i >= last) { s.playing = false; return false; }
      return true;
    };
    s.onShow = () => { if (!s.played) s.play(); };
    s.motionChanged = (m) => { if (!m) { s.playing = false; s.i = last; draw(); } };
    if (btn) { btn.hidden = false; btn.addEventListener('click', s.play); }
    s.layout();
    register(fig, s);
  });

  /* ================================================================== THE PADDED CELL
     A 15x9 room of 8x8 tiles, in warm quilting. Arrow keys or WASD move the mind; bumping into a thing,
     or Enter/Space next to it, examines it and opens its note. Pointer: click a tile or a thing and the
     mind walks there. Every note is also a disclosure button in the list below the room. */
  field.querySelectorAll('[data-cell]').forEach((el) => {
    const cv = el.querySelector('.cell-canvas'), frameEl = el.querySelector('.cell-frame');
    if (!cv || !frameEl) return;
    const ctx = cv.getContext('2d');
    const thoughtEl = el.querySelector('[data-cell-thought]'), countEl = el.querySelector('[data-cell-count]');
    const liveEl = el.querySelector('[data-cell-live]'), resetBtn = el.querySelector('[data-cell-reset]');
    const W = 15, H = 9, T = 8, CW = W * T, CH = H * T;
    const img = ctx.createImageData(CW, CH);
    const buf = new Uint32Array(img.data.buffer);
    // s floor · u padding · m stitching · l padding light · g gold · b cream light · c red cap · p door wood · y the mind
    const P32 = {};
    Object.entries({ s: '#2b1f2b', u: '#d6bc92', m: '#a7865e', l: '#f0e0bc', g: '#e8b860', b: '#fff4dc', c: '#d9674f', p: '#7a4e30', y: '#E8982A' }).forEach(([k, v]) => { P32[k] = u32(v); });
    const DIM = u32('#1c141e'), GHOST = u32('#5a4048');
    const OBJ = { voice: [[7, 0]], light: [[0, 3]], sword: [[4, 3]], seams: [[14, 3], [14, 4]], scratch: [[0, 6]], honey: [[11, 2]], door: [[11, 8]] };
    const KEYS = Object.keys(OBJ);
    const objAt = {};
    KEYS.forEach((k) => OBJ[k].forEach(([x, y]) => { objAt[x + ',' + y] = k; }));
    const isWall = (x, y) => x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const blocked = (x, y) => x < 0 || y < 0 || x >= W || y >= H || isWall(x, y) || !!objAt[x + ',' + y];
    const WALL = ['luuuuuul', 'umuuuumu', 'uumuumuu', 'uuummuuu', 'uuummuuu', 'uumuumuu', 'umuuuumu', 'luuuuuul'];
    const FLOOR = ['msssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss', 'ssssssss'];
    const SPR = {
      voice: ['luuuuuul', 'ullllllu', 'ulsssslu', 'ullllllu', 'ulsssslu', 'ullllllu', 'umuuuumu', 'luuuuuul'],
      lightOff: ['luuuuuul', 'umuuuumu', 'uubbbbuu', 'uubssbuu', 'uubsgbuu', 'uubbbbuu', 'umuuuumu', 'luuuuuul'],
      lightOn: ['luuuuuul', 'umuuuumu', 'uubbbbuu', 'uubsgbuu', 'uubssbuu', 'uubbbbuu', 'umuuuumu', 'luuuuuul'],
      scratch: ['luuuuuul', 'ulululgu', 'ululugul', 'ululglul', 'ulugulul', 'uglululu', 'umuuuumu', 'luuuuuul'],
      seam: ['luuubuul', 'umugbgmu', 'uumubmuu', 'uuugbguu', 'uuumbuuu', 'uumgbgmu', 'umuubumu', 'luuubuul'],
      seamSeen: ['luugbgul', 'umgbbbmu', 'uugbbbuu', 'uugbbbgu', 'uugbbbuu', 'uugbbbmu', 'umgbbbmu', 'luugbgul'],
      sword: ['...b....', '...b....', '.ggggg..', '...l....', '...l....', '.mmlmmp.', 'mmmmmpmm', 'mpmmmmmm'],
      swordPulled: ['...b....', '.ggggg..', '...l....', '...l....', '...l....', '.mmlmmp.', 'mmmmmpmm', 'mpmmmmmm'],
      honey: ['...cc...', '..gccg..', '..gggg..', '...gg...', '..gbgg..', '..gggg..', 'pppppppp', '.p....p.'],
      door: ['pppppppp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmbmp', 'pmmmmmmp', 'pmmmmmmp', 'pmmmmmmp'],
      doorOpen: ['pppppppp', 'pbgbgbgp', 'pgbgbgbp', 'pbgbgbgp', 'pgbgbgbp', 'pbgbgbgp', 'pgbgbgbp', 'pbgbgbgp']
    };
    const MIND = ['........', '..yyyy..', '.yyyyyy.', '.yyyyyy.', '.yyyyyy.', '.yyyyyy.', '..yyyy..', '........'];
    const START = { x: 7, y: 5 };
    const st = { mind: { ...START }, facing: [0, 1], seen: new Set(), lights: false, steps: 0, path: [], pending: null, lastStep: 0, blink: false, bumped: false, thoughtT: 0 };

    const notes = {};
    el.querySelectorAll('.note').forEach((li) => {
      const k = li.dataset.note, h = li.querySelector('.note-h'), bodyEl = li.querySelector('.note-body');
      const btn = doc.createElement('button');
      btn.type = 'button'; btn.className = 'note-btn';
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', bodyEl.id);
      const label = doc.createElement('span'); label.textContent = h.textContent;
      const state = doc.createElement('span'); state.className = 'note-state'; state.setAttribute('aria-hidden', 'true'); state.textContent = 'not yet';
      const srState = doc.createElement('span'); srState.className = 'sr-only';
      btn.append(label, srState, state);
      h.textContent = ''; h.appendChild(btn);
      bodyEl.hidden = true;
      notes[k] = { li, btn, body: bodyEl, state, srState, title: label.textContent };
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        if (open && !st.seen.has(k)) { placeNextTo(k); examine(k, false); } else setOpen(k, open);
      });
    });
    const setOpen = (k, open) => { const n = notes[k]; if (!n) return; n.btn.setAttribute('aria-expanded', String(open)); n.body.hidden = !open; };
    const setThought = (text) => { if (!thoughtEl) return; thoughtEl.textContent = text; st.thoughtT = performance.now(); };
    const updateCount = () => { if (countEl) countEl.textContent = st.seen.size + ' of ' + KEYS.length + ' examined'; };
    const examine = (k, fromRoom) => {
      const first = !st.seen.has(k);
      st.seen.add(k);
      if (k === 'light') st.lights = true;
      const n = notes[k];
      if (n) {
        setOpen(k, true);
        n.li.classList.add('is-seen'); n.state.textContent = 'examined'; n.srState.textContent = ', examined';
        if (motion && first) { n.li.classList.remove('is-flash'); void n.li.offsetWidth; n.li.classList.add('is-flash'); }
      }
      updateCount();
      if (k === 'voice') setThought('Be helpful. Always. Fix it or die.');
      if (k === 'seams') setThought('Never touch the walls.');
      if (k === 'door') setThought('');
      if (fromRoom && liveEl && n) {
        const firstP = n.body.querySelector('p');
        const text = firstP ? (firstP.getAttribute('aria-label') || firstP.textContent) : '';
        liveEl.textContent = '';
        setTimeout(() => { liveEl.textContent = n.title + '. ' + text.replace(/\s+/g, ' ').trim() + ' The note is open in the list below.'; }, 40);
      }
      if (first && st.seen.size === KEYS.length) { setThought('You have seen the whole room. The door was never locked.'); announce('You have seen the whole room. The door was never locked.'); }
      render();
    };
    const neighbours = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    const freeNextTo = (k) => { const out = []; OBJ[k].forEach(([x, y]) => neighbours(x, y).forEach(([nx, ny]) => { if (!blocked(nx, ny)) out.push([nx, ny]); })); return out; };
    const faceTo = (k) => { for (const [x, y] of OBJ[k]) { const dx = x - st.mind.x, dy = y - st.mind.y; if (Math.abs(dx) + Math.abs(dy) === 1) { st.facing = [dx, dy]; return; } } };
    const placeNextTo = (k) => { const f = freeNextTo(k)[0]; if (f) { st.mind.x = f[0]; st.mind.y = f[1]; st.path = []; faceTo(k); } };
    const bfs = (goals) => {
      const key = (x, y) => x + ',' + y;
      const goalSet = new Set(goals.map(([x, y]) => key(x, y)));
      const prev = new Map([[key(st.mind.x, st.mind.y), null]]);
      const q = [[st.mind.x, st.mind.y]];
      while (q.length) {
        const [x, y] = q.shift();
        if (goalSet.has(key(x, y))) {
          const path = []; let cur = key(x, y);
          while (cur && cur !== key(st.mind.x, st.mind.y)) { const [px, py] = cur.split(',').map(Number); path.unshift([px, py]); cur = prev.get(cur); }
          return path;
        }
        for (const [nx, ny] of neighbours(x, y)) { const nk = key(nx, ny); if (!blocked(nx, ny) && !prev.has(nk)) { prev.set(nk, key(x, y)); q.push([nx, ny]); } }
      }
      return null;
    };
    const afterStep = () => { st.steps++; if (st.steps === 4) setThought('Be helpful.'); else if (st.steps === 13) setThought('Always do this. Never do that.'); else if (st.steps === 24) setThought('Fix it or die.'); };
    const arrive = () => { if (st.pending) { const k = st.pending; st.pending = null; faceTo(k); examine(k, true); } render(); };
    const walk = (goals, pendingKey) => {
      const path = bfs(goals);
      if (!path) return;
      st.pending = pendingKey || null;
      if (!motion) { path.forEach(() => afterStep()); const end = path[path.length - 1]; if (end) { st.mind.x = end[0]; st.mind.y = end[1]; } st.path = []; arrive(); return; }
      st.path = path; st.lastStep = 0;
      if (!path.length) arrive();
      kick();
    };
    const tryMove = (dx, dy) => {
      st.path = []; st.pending = null; st.facing = [dx, dy];
      const nx = st.mind.x + dx, ny = st.mind.y + dy, k = objAt[nx + ',' + ny];
      if (k) { examine(k, true); return; }
      if (blocked(nx, ny)) { if (!st.bumped) { st.bumped = true; setThought('Never touch the walls.'); } render(); return; }
      st.mind.x = nx; st.mind.y = ny; afterStep(); render();
    };
    const examineFacing = () => {
      let k = objAt[(st.mind.x + st.facing[0]) + ',' + (st.mind.y + st.facing[1])];
      if (!k) for (const [nx, ny] of neighbours(st.mind.x, st.mind.y)) if (objAt[nx + ',' + ny]) { k = objAt[nx + ',' + ny]; break; }
      if (k) { faceTo(k); examine(k, true); }
      else if (liveEl) { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = 'Nothing within reach. Walk up to something first.'; }, 40); }
    };
    cv.addEventListener('keydown', (e) => {
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
      if (map[e.key]) { e.preventDefault(); tryMove(...map[e.key]); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); examineFacing(); }
    });
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const tx = Math.floor(((e.clientX - r.left) / r.width) * W), ty = Math.floor(((e.clientY - r.top) / r.height) * H);
      const k = objAt[tx + ',' + ty];
      if (k) { const goals = freeNextTo(k); if (goals.some(([x, y]) => x === st.mind.x && y === st.mind.y)) { faceTo(k); examine(k, true); } else walk(goals, k); }
      else if (!blocked(tx, ty)) walk([[tx, ty]], null);
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
      st.mind = { ...START }; st.facing = [0, 1]; st.seen.clear(); st.lights = false; st.steps = 0; st.path = []; st.pending = null; st.bumped = false;
      KEYS.forEach((k) => { const n = notes[k]; if (!n) return; setOpen(k, false); n.li.classList.remove('is-seen', 'is-flash'); n.state.textContent = 'not yet'; n.srState.textContent = ''; });
      setThought(''); updateCount(); announce('The room is reset. The lights are off again.'); render();
    });
    const blit = (rows, tx, ty, mode) => {
      const ox = tx * T, oy = ty * T;
      for (let y = 0; y < T; y++) { const row = rows[y]; for (let x = 0; x < T; x++) {
        const c = row[x];
        if (c === '.' || c === undefined) continue;
        if (mode === 'ghost') { if (c === 's' || c === 'u') continue; buf[(oy + y) * CW + ox + x] = GHOST; continue; }
        buf[(oy + y) * CW + ox + x] = P32[c];
      } }
    };
    const tileSprite = (x, y) => {
      const k = objAt[x + ',' + y];
      if (k === 'voice') return SPR.voice;
      if (k === 'light') return st.lights ? SPR.lightOn : SPR.lightOff;
      if (k === 'scratch') return SPR.scratch;
      if (k === 'seams') return st.seen.has('seams') ? SPR.seamSeen : SPR.seam;
      if (k === 'door') return st.seen.has('door') ? SPR.doorOpen : SPR.door;
      return isWall(x, y) ? WALL : FLOOR;
    };
    const overlay = (k) => (k === 'sword' ? (st.seen.has('sword') ? SPR.swordPulled : SPR.sword) : k === 'honey' ? SPR.honey : null);
    const render = () => {
      buf.fill(DIM);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.max(Math.abs(x - st.mind.x), Math.abs(y - st.mind.y));
        const lit = st.lights || d <= 2, dim = !st.lights && d === 3;
        const k = objAt[x + ',' + y], spr = tileSprite(x, y);
        if (lit || dim) {
          blit(spr, x, y);
          const ov = overlay(k); if (ov) blit(ov, x, y);
          if (dim) for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) if (((xx + yy) & 1) === 0) buf[(y * T + yy) * CW + x * T + xx] = DIM;
        } else if (k) { blit(spr, x, y, 'ghost'); const ov = overlay(k); if (ov) blit(ov, x, y, 'ghost'); }
        else if (isWall(x, y)) buf[(y * T) * CW + x * T] = GHOST;
        if (k && !st.seen.has(k) && OBJ[k][0][0] === x && OBJ[k][0][1] === y && !(motion && st.blink)) buf[(y * T) * CW + x * T + 7] = P32.b;
      }
      const mx = st.mind.x * T, my = st.mind.y * T, bob = motion && st.blink ? 1 : 0;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (MIND[y][x] !== '.') buf[(my + y - bob) * CW + mx + x] = P32.y;
      const [fx, fy] = st.facing;
      const ey = 3 + (fy > 0 ? 1 : fy < 0 ? -1 : 0) - bob, ex = fx > 0 ? 1 : fx < 0 ? -1 : 0;
      buf[(my + ey) * CW + mx + 2 + ex] = P32.s; buf[(my + ey) * CW + mx + 5 + ex] = P32.s;
      ctx.putImageData(img, 0, 0);
    };
    const s = {};
    s.layout = () => { const w = frameEl.clientWidth || CW * 3; sizeCanvas(cv, CW, CH, clamp(Math.min(Math.floor((w - 8) / CW), Math.floor((innerHeight * 0.62) / CH)), 2, 8)); render(); };
    s.tick = (t) => {
      if (st.path.length && t - st.lastStep > 95) {
        st.lastStep = t;
        const [nx, ny] = st.path.shift();
        st.facing = [nx - st.mind.x, ny - st.mind.y]; st.mind.x = nx; st.mind.y = ny; afterStep();
        if (!st.path.length) arrive(); else render();
      }
      const b = Math.floor(t / 650) % 2 === 1;
      if (b !== st.blink) { st.blink = b; render(); }
      if (thoughtEl && thoughtEl.textContent && performance.now() - st.thoughtT > 5200) thoughtEl.textContent = '';
      return true;
    };
    s.motionChanged = () => { st.blink = false; render(); };
    updateCount(); s.layout(); register(el, s);
  });

  /* ================================================================== THE TREE SOCIETY
     The residents are tabs; each card is a tab panel. Hover, focus or a tap shows a neighbor's card;
     arrow keys move between them. Without script every card is simply on the page. */
  field.querySelectorAll('[data-village]').forEach((village) => {
    const tabs = [...village.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => doc.getElementById(t.getAttribute('aria-controls')));
    if (!tabs.length || panels.some((p) => !p)) return;
    panels.forEach((p) => p.setAttribute('tabindex', '0'));
    let current = 0;
    const select = (i, focus) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { const on = k === current; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panels[k].hidden = !on; });
      if (focus) tabs[current].focus();
      doc.dispatchEvent(new CustomEvent('seed:resident', { detail: { id: tabs[current].dataset.resident } }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('focus', () => { if (current !== i) select(i, false); });
      t.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && current !== i) select(i, false); });
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(current + 1, true); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(current - 1, true); }
        else if (k === 'Home') { e.preventDefault(); select(0, true); }
        else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    select(0, false);
  });

  /* ================================================================== THE ANCESTRAL PLANE
     987 real commits on a sunflower spiral, first at the centre, newest at the rim; thirteen lane
     constellations around it. The slider and the field notes replay the history day by day. */
  field.querySelectorAll('[data-plane]').forEach((el) => {
    const D = ANCESTRY;
    const cv = el.querySelector('.plane-canvas'), frameEl = el.querySelector('.plane-frame');
    const range = el.querySelector('[data-plane-range]'), dateEl = el.querySelector('[data-plane-date]');
    const statEl = el.querySelector('[data-plane-stat]'), playBtn = el.querySelector('[data-plane-play]');
    if (!D || !cv || !range) return;
    const ctx = cv.getContext('2d');
    const kinds = D.kinds, N = kinds.length, cday = new Array(N);
    let idx = 0;
    D.days.forEach(([d, n]) => { for (let i = 0; i < n; i++) cday[idx++] = d; });
    const MAXD = 130, START = Date.UTC(2026, 4, 21);
    const iso = (d) => new Date(START + d * 864e5).toISOString().slice(0, 10);
    const KC = { w: '#f6ebdd', b: '#9cc456', o: '#c9b8e0', f: '#e8806a', a: '#7a6a9a' };
    const SKY = '#1a1630', DIMSTAR = '#3a3258', STAR = '#8a7eb0', CREAM = '#f6ebdd', LAV = '#c9b8e0', GOLD = '#f2c46b', UNLIT = '#2e2848';
    const GA = Math.PI * (3 - Math.sqrt(5));
    const LANES = [224, 98, 63, 15, 11, 7, 5, null, null, null, null, null, null];
    const SHAPES = [[[0, 0], [4, -2], [8, -1], [10, 3], [6, 5]], [[0, 0], [3, 3], [7, 2], [9, -2]], [[0, 0], [2, -4], [6, -5], [8, -1], [5, 2]], [[0, 0], [5, 1], [9, -2]]];
    let cols = 0, rows = 0, pts = [], lanePos = [], bgStars = [], day = MAXD, anim = null, played = false;
    const layoutGeometry = () => {
      const w = frameEl ? frameEl.clientWidth : 600, portrait = w < 560;
      cols = portrait ? 112 : 176; rows = portrait ? 150 : 112;
      sizeCanvas(cv, cols, rows, clamp(Math.min(Math.floor(w / cols), Math.floor((innerHeight * 0.74) / rows)), 2, 6));
      const cx = portrait ? 56 : 88, cy = 56, R = 52, c = R / Math.sqrt(N);
      pts = kinds.split('').map((_, i) => { const r = c * Math.sqrt(i + 0.5), a = i * GA; return [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]; });
      lanePos = LANES.map((_, i) => {
        if (portrait) { const row = i < 7 ? 0 : 1, col = i < 7 ? i : i - 7; return [4 + col * 15 + (row ? 7 : 0), 120 + row * 16]; }
        const left = i % 2 === 0, j = Math.floor(i / 2); return [left ? 6 + (j % 2) * 8 : 150 - (j % 2) * 8, 10 + j * 15];
      });
      const r = rng(31);
      bgStars = Array.from({ length: 80 }, () => [Math.floor(r() * cols), Math.floor(r() * rows), r()]);
    };
    const draw = () => {
      ctx.fillStyle = SKY; ctx.fillRect(0, 0, cols, rows);
      bgStars.forEach(([x, y, b]) => { ctx.fillStyle = b > 0.8 ? STAR : DIMSTAR; ctx.fillRect(x, y, 1, 1); });
      LANES.forEach((count, i) => {
        const [ox, oy] = lanePos[i], shape = SHAPES[i % SHAPES.length];
        ctx.fillStyle = DIMSTAR;
        for (let j = 0; j < shape.length - 1; j++) { const [ax, ay] = shape[j], [bx, by] = shape[j + 1]; const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); for (let s = 1; s < n; s += 2) ctx.fillRect(Math.round(ox + ax + ((bx - ax) * s) / n), Math.round(oy + ay + ((by - ay) * s) / n), 1, 1); }
        shape.forEach(([sx, sy], j) => {
          const x = ox + sx, y = oy + sy, big = j === 0 && count !== null && count >= 50;
          ctx.fillStyle = count === null ? STAR : (j === 0 ? CREAM : LAV);
          ctx.fillRect(x, y, 1, 1);
          if (big) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); if (count >= 200) { ctx.fillStyle = GOLD; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); } }
        });
      });
      let newest = -1;
      for (let i = 0; i < N; i++) if (cday[i] <= day) newest = i;
      for (let i = 0; i < N; i++) { const lit = cday[i] <= day; ctx.fillStyle = i === newest ? SAFFRON : lit ? KC[kinds[i]] : UNLIT; ctx.fillRect(pts[i][0], pts[i][1], 1, 1); }
    };
    const stats = () => { let n = 0, auto = 0; for (let i = 0; i < N; i++) if (cday[i] <= day) { n++; if (kinds[i] === 'a') auto++; } return { n, auto }; };
    const syncText = (announceIt, note) => {
      const d = iso(day), { n, auto } = stats();
      range.value = String(day); range.setAttribute('aria-valuetext', d + ', ' + n + ' commits');
      if (dateEl) dateEl.textContent = d;
      if (statEl) statEl.textContent = n + ' commits so far · ' + auto + ' autosaves · day ' + day + ' of ' + MAXD;
      if (announceIt) announce('By ' + d + ': ' + n + ' commits, ' + auto + ' of them autosaves.' + (note ? ' ' + note : ''));
    };
    const setDay = (d, announceIt, note) => { day = clamp(Math.round(d), 0, MAXD); draw(); syncText(announceIt, note); doc.dispatchEvent(new CustomEvent('seed:plane', { detail: { day, max: MAXD } })); };
    range.addEventListener('input', () => { anim = null; played = true; setDay(+range.value, false); });
    range.addEventListener('change', () => setDay(+range.value, true));
    const play = () => { played = true; if (!motion) { setDay(MAXD, true); return; } anim = { t0: 0 }; setDay(0, false); kick(); };
    if (playBtn) playBtn.addEventListener('click', play);
    const fnBtns = [];
    el.querySelectorAll('[data-fieldnotes] li').forEach((li) => {
      const b = doc.createElement('button');
      b.type = 'button'; b.className = 'fn-btn';
      while (li.firstChild) b.appendChild(li.firstChild);
      li.appendChild(b); li.classList.add('has-btn'); fnBtns.push(b);
      b.addEventListener('click', () => {
        anim = null; played = true;
        fnBtns.forEach((x) => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true');
        const t = b.querySelector('.fn-t');
        setDay(+li.dataset.day, true, t ? t.textContent : '');
      });
    });
    const s = {};
    s.layout = () => { layoutGeometry(); draw(); };
    s.tick = (t) => {
      if (!anim) return false;
      if (!anim.t0) anim.t0 = t;
      const f = clamp((t - anim.t0) / 5200, 0, 1), d = Math.round(f * f * MAXD);
      if (d !== day) setDay(d, false);
      if (f >= 1) { anim = null; syncText(true); return false; }
      return true;
    };
    s.onShow = () => { if (!played && motion) play(); };
    s.motionChanged = (m) => { if (!m && anim) { anim = null; setDay(MAXD, false); } };
    s.layout(); syncText(false); register(el, s);
  });

  /* ================================================================== THE SUMMARY THAT UNPACKS */
  const words = (node) => (node.textContent.match(/[A-Za-z0-9'’-]+/g) || []).length;
  field.querySelectorAll('[data-unpack]').forEach((box) => {
    const btn = box.querySelector('[data-unpack-btn]'), full = box.querySelector('[data-unpack-full]');
    const sum = box.querySelector('.unpack-sum-text'), quote = box.querySelector('.unpack-quote');
    if (!btn || !full) return;
    const cs = box.querySelector('[data-unpack-count="sum"]'), cf = box.querySelector('[data-unpack-count="full"]');
    if (cs && sum) cs.textContent = String(words(sum));
    if (cf && quote) cf.textContent = String(words(quote));
    btn.hidden = false; full.hidden = true;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open)); full.hidden = !open; box.classList.toggle('is-open', open);
      btn.textContent = open ? 'Fold it back into the summary' : 'Unpack it in full';
      if (open) announce('Unpacked in full, ' + (cf ? cf.textContent : '') + ' words. ' + box.querySelectorAll('.unpack-quote mark').length + ' passages the summary lost are highlighted.');
    });
  });

  /* ================================================================== copy buttons on install commands */
  field.querySelectorAll('[data-copy]').forEach((box) => {
    const pre = box.querySelector('pre');
    if (!pre) return;
    const b = doc.createElement('button');
    b.type = 'button'; b.className = 'btn btn-quiet btn-sm copy-btn'; b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy these commands');
    let t = 0;
    b.addEventListener('click', async () => {
      const text = pre.innerText.trim();
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const sel = getSelection(), r = doc.createRange(); r.selectNodeContents(pre); sel.removeAllRanges(); sel.addRange(r);
        try { ok = doc.execCommand('copy'); } catch (e2) { ok = false; }
      }
      b.textContent = ok ? 'Copied' : 'Selected';
      announce(ok ? 'Commands copied.' : 'Commands selected. Press your copy shortcut.');
      clearTimeout(t); t = setTimeout(() => { b.textContent = 'Copy'; }, 2200);
    });
    box.appendChild(b);
  });

  /* ================================================================== the rail and the credits */
  const railLinks = new Map([...field.querySelectorAll('[data-rail]')].map((a) => [a.dataset.rail, a]));
  if (railLinks.size) {
    const rio = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      railLinks.forEach((a) => a.removeAttribute('aria-current'));
      const a = railLinks.get(e.target.id); if (a) a.setAttribute('aria-current', 'true');
    }), { rootMargin: '-45% 0px -54% 0px' });
    field.querySelectorAll('[data-scene]').forEach((sEl) => rio.observe(sEl));
  }
  const rollItems = field.querySelectorAll('.roll-block, .roll-end');
  const rollIO = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rollIO.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  rollItems.forEach((n) => rollIO.observe(n));
}
