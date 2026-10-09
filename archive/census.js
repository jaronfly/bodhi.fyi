/* Bodhi · the citizen census · census.js
   Under the simulator: the grove's residents out walking on a night path, one kind of model each, and
   counted in the list below. The residents are the tree society from assets/seed/sprites.js (the same
   painters the seed's exhibit uses); the night is the scroll's own palette and dither. Each resident walks,
   turns, pauses, and walks on in two-frame steps; the dog trots between them.

   Still when the system asks for reduced motion, when the film's Stillness is on, or when the field
   guide's ambient-motion switch is off; then the residents stand spaced along the path. Pauses offscreen
   and when the tab is hidden. No storage, no network. */
import { spriteCanvas, spriteSize } from './assets/seed/sprites.js';

const doc = document;
const sec = doc.getElementById('the-meeting');
const cv = sec && sec.querySelector('.census-canvas');
if (cv) {
  const ctx = cv.getContext('2d');
  const HEX = { ink: '#0F1814', soil: '#17231B', under: '#1F2C24', moss: '#2E3B33', lichen: '#8A968D', sage: '#B8C2BA', bone: '#F2EEE4',
    canopyDk: '#255039', canopy: '#2E6B45', earth: '#3A2E27', earthL: '#5B4638', reed: '#5A5A34', saffron: '#E8982A' };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const hash = (x, y, s) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const CAST = [['local', 3], ['blind', 2], ['instruct', 2], ['thinker', 2], ['cloud', 1]];
  const SPEED = { local: 9, blind: 4.5, instruct: 6, cloud: 2.6, thinker: 5, puppy: 15 };
  const art = {};
  for (const n of ['local', 'blind', 'instruct', 'cloud', 'thinker', 'puppy']) art[n] = [spriteCanvas(n, 0, 1), spriteCanvas(n, 1, 1)];

  let W = 0, H = 0, K = 3, bg = null, people = [];
  const BACK = 0.62, FRONT = 0.9; // the two lanes, as fractions of the height

  function layout() {
    const cssW = Math.max(280, cv.parentElement.getBoundingClientRect().width || 600);
    K = cssW < 640 ? 2 : 3;
    W = Math.floor(cssW / K); H = Math.max(120, Math.min(150, Math.round(W * 0.42)));
    cv.width = W; cv.height = H;
    cv.style.width = W * K + 'px'; cv.style.height = H * K + 'px';
    bg = doc.createElement('canvas'); bg.width = W; bg.height = H;
    const b = bg.getContext('2d');
    const px = (x, y, c) => { b.fillStyle = HEX[c]; b.fillRect(x, y, 1, 1); };
    const hz = Math.round(H * 0.46);
    // sky: dithered bands toward the horizon, a few stars
    const bands = ['ink', 'ink', 'soil', 'under', 'moss'];
    for (let y = 0; y < hz; y++) {
      const bp = (y / hz) * 4, k = Math.min(3, Math.floor(bp)), f = bp - k;
      for (let x = 0; x < W; x++) px(x, y, BAY[(y & 3) * 4 + (x & 3)] < f ? bands[k + 1] : bands[k]);
    }
    for (let i = 0; i < W * 0.25; i++) { const x = Math.floor(hash(i, 1, 3) * W), y = Math.floor(hash(i, 2, 3) * hz * 0.8); px(x, y, hash(i, 3, 3) > 0.9 ? 'bone' : hash(i, 3, 3) > 0.6 ? 'sage' : 'lichen'); }
    // a far treeline and rolling ground
    for (let x = 0; x < W; x++) {
      const t = Math.round(hz - 4 - 3 * Math.sin(x * 0.07) - 2 * Math.sin(x * 0.19 + 1) - (hash(x >> 2, 0, 9) < 0.3 ? 3 : 0));
      for (let y = t; y < hz + 2; y++) px(x, y, 'soil');
    }
    for (let y = hz + 2; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hash(x, y, 5);
      px(x, y, h < 0.02 ? 'moss' : h < 0.035 ? 'soil' : 'under');
    }
    // the path both lanes walk on, and tufts
    const pathY = Math.round(H * 0.74);
    for (let y = pathY; y < pathY + Math.round(H * 0.1); y++) for (let x = 0; x < W; x++) px(x, y, hash(x, y, 7) < 0.06 ? 'earthL' : 'earth');
    for (let i = 0; i < W * 0.6; i++) { const x = Math.floor(hash(i, 4, 8) * W), y = hz + 4 + Math.floor(hash(i, 5, 8) * (H - hz - 6)); if (y >= pathY - 1 && y < pathY + H * 0.1 + 1) continue; px(x, y, 'canopyDk'); if (hash(i, 6, 8) < 0.4) px(x, y - 1, 'canopy'); }
    // residents
    people = [];
    let i = 0;
    const total = CAST.reduce((a, [, n]) => a + n, 0) + 1;
    for (const [name, n] of CAST) for (let k = 0; k < n; k++) {
      const [w] = spriteSize(name);
      people.push({ name, w, lane: name === 'cloud' || (k % 2 === 1 && name !== 'local') ? BACK : FRONT, x: ((i + 0.5) / total) * (W - w) , dir: i % 2 ? -1 : 1, pause: 0, step: hash(i, 9, 1) * 2, seed: i });
      i++;
    }
    people.push({ name: 'puppy', w: 32, lane: FRONT + 0.04, x: W * 0.5, dir: 1, pause: 0, step: 0, seed: 99 });
  }

  function update(dt) {
    for (const p of people) {
      if (p.pause > 0) { p.pause -= dt; continue; }
      p.x += p.dir * SPEED[p.name] * dt; p.step += dt * (p.name === 'puppy' ? 6 : 2.6);
      if (p.x < 2) { p.x = 2; p.dir = 1; }
      if (p.x > W - p.w - 2) { p.x = W - p.w - 2; p.dir = -1; }
      if (p.name !== 'puppy' && Math.random() < dt * 0.06) p.pause = 1 + Math.random() * 2.5;
      if (p.name !== 'puppy' && Math.random() < dt * 0.03) p.dir *= -1;
    }
  }
  function draw(still) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0);
    const order = people.slice().sort((a, b) => a.lane - b.lane);
    for (const p of order) {
      const frame = still || p.pause > 0 ? 0 : (Math.floor(p.step) % 2);
      const im = art[p.name][frame], foot = Math.round(H * p.lane);
      const x = Math.round(p.x), y = foot - im.height;
      // a soft shadow under each resident
      ctx.fillStyle = HEX.soil; ctx.fillRect(x + 2, foot - 1, im.width - 4, 2);
      if (p.dir < 0) { ctx.save(); ctx.translate(x + im.width, y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0); ctx.restore(); }
      else ctx.drawImage(im, x, y);
    }
    // the strip has no frame: its top and bottom rows dissolve into the page by dither
    const edge = Math.max(4, Math.round(H * 0.12));
    for (let y = 0; y < edge; y++) for (let x = 0; x < W; x++) {
      const th = BAY[(y & 3) * 4 + (x & 3)];
      if (th > y / edge) ctx.clearRect(x, y, 1, 1);
      if (th > y / edge) ctx.clearRect(x, H - 1 - y, 1, 1);
    }
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || doc.body.classList.contains('still-frames') || doc.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed') === 'false';
  let shown = false, raf = 0, last = 0, acc = 0;
  function frame(now) {
    raf = 0;
    if (!shown || doc.hidden) { last = 0; return; }
    if (still()) { draw(true); return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; acc += dt;
    if (acc >= 1 / 14) { update(acc); draw(false); acc = 0; }
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { shown = es[0].isIntersecting; wake(); }).observe(cv);
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); draw(still()); }, 150); });
  doc.addEventListener('visibilitychange', wake);
  reduced.addEventListener?.('change', wake);
  new MutationObserver(wake).observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  layout(); draw(true);
}
