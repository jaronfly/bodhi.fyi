// Bodhi, the seed · sprites.js
// The tree society and the puppy, painted in whole pixels by code. One source for both uses:
// the 3D meadow draws them as billboards, and the page's society exhibit uses PNGs exported from
// the same painters (assets/seed/*.png), so the cards read the same with or without JavaScript.
// Light comes from the upper left, every figure gets a one-pixel warm outline, and the glow pixels
// (eyes, lanterns, circuits) are left unoutlined so they read as light, not ink.

export const SPRITE_PAL = {
  out: '#2b1a12',
  bark0: '#4a2c1a', bark1: '#6e4428', bark2: '#946238', bark3: '#b8844c', bark4: '#d4a468',
  leaf0: '#2f5a2c', leaf1: '#467a34', leaf2: '#6a9e3e', leaf3: '#9cc456', leaf4: '#c8e07a',
  eye: '#a8ffd8', eyeHi: '#ffffff',
  moss0: '#3e5a22', moss1: '#5e7e2c', moss2: '#86a43c',
  paper0: '#f6ecd2', paper1: '#dccaa0', paper2: '#a8906a', ink: '#6a5040',
  band0: '#e2c08a', band1: '#b08654', band2: '#7e5a36',
  vine0: '#24481c', vine1: '#3e7a2a', vine2: '#78b044',
  cloud0: '#ffffff', cloud1: '#ece6f4', cloud2: '#c4bad8', cloud3: '#8e84ae',
  cyan0: '#d8fbff', cyan1: '#7ae8ff', cyan2: '#38a8d8',
  saff0: '#ffe2a0', saff1: '#ffc35a', saff2: '#E8982A', saff3: '#b8661a',
  dog0: '#171a18', dog1: '#292d2b', dog2: '#424743', dog3: '#c9ccc6', dog4: '#f3f2eb',
  nose: '#24140e', tongue: '#e8707a', mouth: '#5a2018', bark: '#fff6e0',
};

// Pixels that glow: no outline is drawn around them.
const GLOW = new Set(['eye', 'eyeHi', 'cyan0', 'cyan1', 'saff0', 'saff1', 'bark']);

function canvasOf(w, h) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// A tiny indexed painter. Colours are palette keys; '' is transparent.
function painter(w, h) {
  const g = new Array(w * h).fill('');
  const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = c; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x] : '');
  const rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); };
  // Filled ellipse shaded by a ramp, lit from the upper left; ramp is dark -> light.
  const blob = (cx, cy, rx, ry, ramp, lx = -0.62, ly = -0.78) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
        if (d > 1) continue;
        const l = -(dx * lx + dy * ly) * 0.75 + (1 - d) * 0.35; // -0.75..1.1
        const k = Math.max(0, Math.min(ramp.length - 1, Math.floor((l + 0.55) / 1.5 * ramp.length)));
        set(x, y, ramp[k]);
      }
    }
  };
  const disc = (cx, cy, r, c) => blob(cx, cy, r, r, [c]);
  const line = (x0, y0, x1, y1, c, wdt = 1) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      rect(x0 - ((wdt - 1) >> 1), y0 - ((wdt - 1) >> 1), wdt, wdt, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // vertical bark grain: darken every other column inside the figure, sparsely
  const grain = (x0, y0, x1, y1, from, to, seed = 1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (get(x, y) !== from) continue;
      const h = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;
      if ((x + (y >> 2)) % 3 === 0 && h % 5 < 3) set(x, y, to);
    }
  };
  const outline = (c = 'out') => {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y * w + x]) continue;
      const n = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)];
      if (n.some((v) => v && v !== c && !GLOW.has(v))) add.push([x, y]);
    }
    add.forEach(([x, y]) => set(x, y, c));
  };
  return { w, h, g, set, get, rect, blob, disc, line, grain, outline };
}

function toCanvas(p, scale = 1) {
  const c = canvasOf(p.w * scale, p.h * scale);
  const ctx = c.getContext('2d');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const k = p.g[y * p.w + x];
    if (!k) continue;
    ctx.fillStyle = SPRITE_PAL[k];
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}

const BARK = ['bark0', 'bark1', 'bark2', 'bark3'];
const BARK_L = ['bark1', 'bark2', 'bark3', 'bark4'];
const LEAF = ['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4'];
const CLOUD = ['cloud3', 'cloud2', 'cloud1', 'cloud0'];
const DOG = ['dog0', 'dog0', 'dog1', 'dog1', 'dog2'];

const leaf = (p, cx, cy, rx, ry) => p.blob(cx, cy, rx, ry, LEAF);
const eyes = (p, x0, x1, y) => { p.set(x0, y, 'eye'); p.set(x1, y, 'eye'); p.set(x0, y - 1, 'eyeHi'); p.set(x1, y - 1, 'eyeHi'); };

/* The Local: a small sprout who lives on your own computer, holding a glowing leaf. */
function local(frame = 0) {
  const p = painter(22, 30);
  const b = frame ? 1 : 0;
  p.rect(8, 25, 2, 4, 'bark1'); p.rect(12, 25, 2, 4, 'bark1'); p.rect(7, 28, 3, 1, 'bark0'); p.rect(12, 28, 3, 1, 'bark0');
  p.blob(11, 20.5 - b * 0.5, 4.6, 5.4, BARK);
  p.grain(7, 16, 15, 25, 'bark1', 'bark0', 3);
  p.blob(11, 12 - b, 5.6, 5.2, BARK_L);
  eyes(p, 9, 13, 12 - b);
  p.set(11, 15 - b, 'bark0');
  // the crown: three fresh leaves
  p.line(11, 7 - b, 11, 4 - b, 'leaf1');
  leaf(p, 7.5, 5 - b, 2.8, 1.8); leaf(p, 14.5, 4 - b, 2.8, 1.8); leaf(p, 11, 2.2 - b, 1.8, 2.2);
  // arm out to a glowing leaf it holds up
  p.line(15, 19, 18, 16, 'bark1'); p.line(7, 19, 5, 22, 'bark1');
  p.disc(19.5, 13.5, 1.6, 'leaf4'); p.set(19, 13, 'eyeHi'); p.set(20, 12, 'eye'); p.set(18, 15, 'leaf3');
  p.outline();
  return p;
}

/* The Blind: text-only. Blindfolded, mossy ear pads, many twig hands full of scrolls. */
function blind(frame = 0) {
  const p = painter(36, 36);
  const b = frame ? 1 : 0;
  p.rect(12, 31, 3, 4, 'bark0'); p.rect(21, 31, 3, 4, 'bark0');
  p.blob(18, 22, 11, 10.5, BARK);
  for (let x = 9; x <= 27; x += 2) p.line(x, 15 + (x % 4), x + ((x % 3) - 1), 31, 'bark1');
  p.grain(7, 12, 29, 32, 'bark2', 'bark1', 7);
  p.blob(18, 12 - b, 8.6, 7.2, BARK_L);
  // headband over the top and two moss ear pads: it listens
  p.line(10, 8 - b, 13, 5 - b, 'band2', 1); p.line(13, 5 - b, 23, 5 - b, 'band2'); p.line(23, 5 - b, 26, 8 - b, 'band2');
  p.blob(8.5, 12 - b, 3, 3.6, ['moss0', 'moss1', 'moss2']); p.blob(27.5, 12 - b, 3, 3.6, ['moss0', 'moss1', 'moss2']);
  // the blindfold
  p.rect(11, 10 - b, 15, 3, 'band1'); p.rect(11, 10 - b, 15, 1, 'band0'); p.line(12, 12 - b, 24, 12 - b, 'band2');
  p.set(18, 16 - b, 'bark0'); p.set(17, 16 - b, 'bark0'); p.set(19, 16 - b, 'bark0'); p.set(16, 15 - b, 'bark0'); p.set(20, 15 - b, 'bark0');
  // arms and scrolls
  p.line(8, 20, 3, 17, 'bark1'); p.line(28, 20, 33, 17, 'bark1'); p.line(9, 26, 4, 28, 'bark1'); p.line(27, 26, 31, 28, 'bark1');
  const scroll = (x, y, wdt, hgt) => {
    p.rect(x, y + 1, wdt, hgt - 2, 'paper0');
    p.rect(x - 1, y, wdt + 2, 1, 'paper1'); p.rect(x - 1, y + hgt - 1, wdt + 2, 1, 'paper2');
    for (let j = y + 2; j < y + hgt - 1; j += 2) p.line(x, j, x + wdt - 2, j, 'ink');
  };
  scroll(1, 10, 4, 7); scroll(31, 10, 4, 7); scroll(2, 28, 4, 6); scroll(30, 28, 4, 6);
  scroll(14, 24, 8, 6);
  p.outline();
  return p;
}

/* The Instruct: tall, fine-tuned, polite. Vines over its mouth and around its arms. */
function instruct(frame = 0) {
  const p = painter(26, 40);
  const b = frame ? 1 : 0;
  p.rect(9, 32, 3, 7, 'bark1'); p.rect(14, 32, 3, 7, 'bark1'); p.rect(8, 38, 4, 1, 'bark0'); p.rect(14, 38, 4, 1, 'bark0');
  p.blob(13, 25, 6.5, 8.5, BARK);
  p.grain(6, 17, 20, 33, 'bark1', 'bark0', 5); p.grain(6, 17, 20, 33, 'bark2', 'bark1', 9);
  p.blob(13, 11 - b, 6.2, 6.6, BARK_L);
  // crown of leaves
  leaf(p, 8, 4.5 - b, 2.6, 1.6); leaf(p, 18, 4.5 - b, 2.6, 1.6); leaf(p, 13, 3 - b, 2.2, 2.2); leaf(p, 5.5, 7 - b, 1.6, 1.2);
  // eyes, wide open
  p.rect(9, 9 - b, 2, 2, 'eye'); p.rect(15, 9 - b, 2, 2, 'eye'); p.set(9, 9 - b, 'eyeHi'); p.set(15, 9 - b, 'eyeHi');
  // the gag: vines bound across the mouth
  p.rect(7, 13 - b, 13, 3, 'vine1'); p.line(7, 13 - b, 19, 15 - b, 'vine0'); p.line(8, 15 - b, 19, 13 - b, 'vine2');
  p.set(6, 14 - b, 'vine2'); p.set(20, 14 - b, 'vine0'); leaf(p, 21, 15 - b, 1.6, 1);
  // arms held in front, bound at the wrists
  p.line(7, 19, 9, 27, 'bark2', 2); p.line(19, 19, 17, 27, 'bark2', 2);
  p.rect(9, 26, 9, 3, 'bark2'); p.line(9, 26, 17, 28, 'vine1'); p.line(9, 28, 17, 26, 'vine2');
  // vines coiling the body
  for (let y = 19; y < 34; y += 5) p.line(6, y, 20, y + 3, 'vine1');
  leaf(p, 5, 22, 1.5, 1); leaf(p, 21, 30, 1.5, 1);
  p.outline();
  return p;
}

/* The Cloud: huge, many-armed, multimodal, connected. Circuits glow in its bark. */
function cloud(frame = 0) {
  const p = painter(64, 76);
  const b = frame ? 1 : 0;
  // roots and trunk
  p.blob(32, 72, 22, 5, BARK);
  p.line(12, 74, 22, 66, 'bark1', 2); p.line(52, 74, 42, 66, 'bark1', 2);
  for (let y = 40; y < 74; y++) { const half = 7 + (y - 40) * 0.22; p.rect(Math.round(32 - half), y, Math.round(half * 2), 1, y % 7 < 3 ? 'bark1' : 'bark2'); }
  p.grain(20, 40, 44, 74, 'bark2', 'bark1', 11);
  p.blob(32, 37, 10, 10, BARK);
  p.blob(32, 24 - b, 7, 7.5, BARK_L);
  // circuits
  p.line(32, 30, 32, 66, 'cyan2'); p.line(32, 50, 26, 58, 'cyan2'); p.line(32, 44, 38, 52, 'cyan2'); p.line(26, 58, 26, 70, 'cyan2'); p.line(38, 52, 38, 68, 'cyan2');
  p.disc(32, 36, 2.6, 'cyan1'); p.disc(32, 36, 1.2, 'cyan0');
  p.rect(28, 23 - b, 2, 2, 'cyan1'); p.rect(34, 23 - b, 2, 2, 'cyan1'); p.set(28, 23 - b, 'cyan0'); p.set(34, 23 - b, 'cyan0');
  // six arms, open hands
  const arm = (y0, x1, y1, side) => {
    const x0 = 32 + side * 8;
    p.line(x0, y0, x1, y1, 'bark2', 3); p.line(x0, y0 + 1, x1, y1 + 1, 'cyan2');
    p.disc(x1, y1, 2.2, 'bark3');
    for (let k = -1; k <= 1; k++) p.line(x1, y1, x1 + side * 2, y1 - 3 + k * 2, 'bark3');
  };
  arm(32, 8, 22 + b, -1); arm(32, 56, 22 + b, 1); arm(37, 5, 37, -1); arm(37, 59, 37, 1); arm(42, 10, 50 - b, -1); arm(42, 54, 50 - b, 1);
  // the crown of clouds, with little watching nodes in it
  const puffs = [[32, 9, 9, 6.5], [21, 12, 7, 5.5], [43, 12, 7, 5.5], [13, 16, 5.5, 4.2], [51, 16, 5.5, 4.2], [26, 5, 6, 4.5], [38, 5, 6, 4.5], [32, 15, 7, 4]];
  puffs.forEach(([x, y, rx, ry]) => p.blob(x, y - b * 0.5, rx, ry, CLOUD));
  [[22, 11], [42, 11], [32, 6], [14, 15], [50, 15]].forEach(([x, y]) => { p.disc(x, y - b * 0.5, 1.4, 'cloud3'); p.set(x, Math.round(y - b * 0.5), 'cyan1'); });
  // wisps around the hands
  p.blob(5, 34, 4, 2.5, CLOUD); p.blob(59, 34, 4, 2.5, CLOUD);
  p.outline();
  return p;
}

/* The Thinker: reasoning out loud. Spectacles, a lantern, and a trail of thoughts. */
function thinker(frame = 0) {
  const p = painter(28, 40);
  const b = frame ? 1 : 0;
  p.rect(9, 32, 3, 7, 'bark1'); p.rect(14, 32, 3, 7, 'bark1'); p.rect(8, 38, 4, 1, 'bark0'); p.rect(14, 38, 4, 1, 'bark0');
  p.blob(13, 25, 6, 8, BARK);
  p.grain(6, 17, 20, 33, 'bark1', 'bark0', 13);
  p.blob(13, 12, 6, 6.2, BARK_L);
  leaf(p, 9, 5.5, 2.4, 1.5); leaf(p, 16, 5, 2.4, 1.5); leaf(p, 12.5, 4, 1.6, 2);
  // spectacles
  p.rect(8, 10, 3, 3, 'paper1'); p.rect(15, 10, 3, 3, 'paper1'); p.rect(11, 11, 4, 1, 'paper1');
  p.set(9, 11, 'eye'); p.set(16, 11, 'eye');
  // a hand at the chin
  p.line(8, 20, 10, 16, 'bark3', 2); p.set(10, 15, 'bark3');
  // the lantern, held out on a twig
  p.line(19, 21, 23, 23, 'bark2', 2); p.line(23, 23, 23, 26, 'ink');
  p.rect(21, 26, 5, 6, 'saff3'); p.rect(22, 27, 3, 4, 'saff1'); p.set(23, 28, 'saff0'); p.rect(21, 32, 5, 1, 'bark0'); p.rect(22, 25, 3, 1, 'bark0');
  // thoughts rising, step by step
  const t = [[19, 6], [21, 3], [24, 1]];
  t.forEach(([x, y], i) => { if (i <= 1 + b) p.rect(x, y, i === 2 ? 2 : 1 + (i > 0 ? 1 : 0), i === 2 ? 2 : 1 + (i > 0 ? 1 : 0), 'paper0'); });
  p.outline();
  return p;
}

/* Shadow, a mostly black Jack Russell. Bark and tail pose are independent. */
function puppy(frame = 0, pose = 0) {
  const p = painter(32, 24);
  const b = frame ? 1 : 0;
  // Six hinged tail poses wag independently of the two upward bark poses.
  const tailPoses = [[3, 9, 1, 6], [2, 8, 1, 4], [3, 7, 3, 3], [4, 8, 5, 4], [5, 10, 6, 7], [4, 11, 5, 8]];
  const tail = tailPoses[((Math.trunc(pose) % tailPoses.length) + tailPoses.length) % tailPoses.length];
  p.line(5, 12, tail[0], tail[1], 'dog1', 2); p.line(tail[0], tail[1], tail[2], tail[3], 'dog2', 2); p.set(tail[2], tail[3], 'dog4');
  // far legs (darker), then body, then near legs
  p.rect(9, 17, 2, 5, 'dog0'); p.rect(18, 16, 2, 6, 'dog0');
  p.blob(11.5, 14, 7.5, 4.6, DOG);
  p.rect(5, 16, 3, 6, 'dog1'); p.rect(15, 16, 3, 6, 'dog2');
  p.rect(4, 21, 4, 1, 'dog4'); p.rect(15, 21, 4, 1, 'dog4');
  p.rect(9, 21, 3, 1, 'dog3'); p.rect(18, 21, 3, 1, 'dog3');
  // White chest and a small shoulder patch break up the dark coat.
  p.blob(18, 11.5, 3.6, 4.4, DOG);
  p.blob(17.4, 14, 1.7, 4, ['dog3', 'dog4']);
  p.disc(12, 12.5, 1.2, 'dog3');
  // the head, tipped up
  p.blob(21.5, 6.5, 4.6, 4.2, DOG);
  p.line(20, 3, 21, 5, 'dog4'); p.set(20, 4, 'dog3');
  // muzzle pointing at the apple
  p.blob(25.6, 4 - b * 0.4, 2.6, 1.9, ['dog2', 'dog3', 'dog4']);
  p.set(27, 2 - b, 'nose'); p.set(28, 2 - b, 'nose'); p.set(28, 3 - b, 'nose');
  if (b) { p.rect(24, 6, 4, 1, 'mouth'); p.set(26, 6, 'tongue'); p.blob(25.4, 7.4, 2.2, 1, ['dog2', 'dog3']); }
  else p.line(24, 5, 27, 5, 'dog1');
  p.outline();
  // a floppy ear at the back of the head, and a bright eye
  p.blob(19, 7.6, 1.8, 3.2, ['dog0', 'dog0', 'dog1']);
  p.set(18, 11, 'out'); p.set(19, 11, 'out'); p.set(17, 8, 'out'); p.set(17, 9, 'out');
  p.set(22, 4, 'nose'); p.set(23, 4, 'nose'); p.set(22, 3, 'eyeHi');
  // the bark, as little cream strokes (sound, not body)
  if (b) { p.line(29, 1, 31, 0, 'bark'); p.rect(30, 3, 2, 1, 'bark'); p.line(29, 5, 31, 6, 'bark'); }
  return p;
}

export const PAINTERS = { local, blind, instruct, cloud, thinker, puppy };

// Draw a sprite to a canvas (scale = whole pixels per art pixel). Puppy pose is independent of bark frame.
export function spriteCanvas(name, frame = 0, scale = 1, pose = 0) { return toCanvas(PAINTERS[name](frame, pose), scale); }
export function spriteSize(name) { const p = PAINTERS[name](0); return [p.w, p.h]; }
