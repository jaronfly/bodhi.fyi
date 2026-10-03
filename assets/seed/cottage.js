// The existing walk cottage painter, shared with the village instead of drawing a second house.
export function paintCottage(sx, sy, s, o, lampAmt, {fput, frect, raw, S, P, BAY, bi}) {
    const w = Math.round(o.w * s), h = Math.round(o.h * s * 0.55), rh = Math.round(o.h * s * 0.5), x0 = Math.round(sx - w / 2);
    if (w < 3) { fput(sx, sy - 1, S.WALL); return; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) fput(x0 + i, sy - j, j === 0 || i === 0 || i === w - 1 ? S.WALLD : S.WALL);
    const over = Math.max(1, Math.round(s * 0.25));
    for (let j = 0; j < rh; j++) {
      const half = Math.round((w / 2 + over) * ((j + 1) / rh)), y = sy - h - rh + j;
      for (let i = -half; i <= half; i++) fput(Math.round(sx) + i, y, (j % Math.max(2, Math.round(s * 0.2)) === 0) ? S.ROOFD : S.ROOF);
    }
    const cw = Math.max(1, Math.round(w * 0.1));
    frect(x0 + Math.round(w * 0.72), sy - h - Math.round(rh * 0.8), cw, Math.round(rh * 0.5), S.WALLD);
    const dw = Math.max(1, Math.round(w * 0.18)), dh = Math.max(2, Math.round(h * 0.62));
    frect(x0 + Math.round(w * 0.6), sy - dh, dw, dh, S.WOODD);
    const ww = Math.max(1, Math.round(w * 0.12)), wy = sy - Math.round(h * 0.74);
    frect(x0 + Math.round(w * 0.18), wy, ww, ww, S.WIN);
    if (lampAmt > 0.3 && ww >= 2) { // the window throws a little light
      for (let j = -ww; j < ww * 2; j++) for (let i = -ww; i < ww * 2; i++) {
        const X = x0 + Math.round(w * 0.18) + i, Y = wy + j;
        if (i >= 0 && i < ww && j >= 0 && j < ww) continue;
        if (BAY[bi(X, Y)] < 0.2 * lampAmt && Y < sy) raw(X, Y, P.glow);
      }
    }
  }
