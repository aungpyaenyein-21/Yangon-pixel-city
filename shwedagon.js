'use strict';
// Shwedagon Pixel — the Shwedagon Pagoda platform, drawn entirely in code.
// Layout of the platform (small stupas, shrines, halls, trees) follows OpenStreetMap.

// ── projection: 2:1 isometric, camera looks from the south-west ─────────────
const HW = 12, HH = 6, FL = 10;              // half tile (1 tile ≈ 5 m), px per storey
const MW = 80, MH = 104;                      // map in tiles: x → east, y → south (1 tile ≈ 5 m)
const OY = MW * HH + 170;                     // headroom for the stupa
const CW = (MW + MH) * HW, CH = OY + MH * HH + 40;
const sx = (x, y) => Math.round((x + y) * HW);
const sy = (x, y, z = 0) => Math.round((y - x) * HH) + OY - z;
const bw = (c, x) => (c >> 1) - Math.round(x * 12) + OY;        // ground line under an x = const wall
const bs = (c, y) => Math.round(y * 12) - ((c + 1) >> 1) + OY;  // ground line under a y = const wall

// ── small helpers ────────────────────────────────────────────────────────────
let seed = 1885;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;
const q12 = v => Math.round(v * 12) / 12;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const shc = new Map();
function sh(hex, f = 1) {
  const k = hex + f; let v = shc.get(k);
  if (!v) {
    const n = parseInt(hex.slice(1), 16), c = s => Math.min(255, Math.round(s * f));
    v = `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`; shc.set(k, v);
  }
  return v;
}

// ── drawing primitives (one 1-px column at a time keeps edges pixel-perfect) ─
function wF(g, x, ya, yb, za, zb, col) {   // wall facing west (x = const)
  g.fillStyle = col;
  for (let c = sx(x, ya), e = sx(x, yb); c < e; c++) g.fillRect(c, bw(c, x) - zb, 1, zb - za);
}
function sF(g, y, xa, xb, za, zb, col) {   // wall facing south (y = const)
  g.fillStyle = col;
  for (let c = sx(xa, y), e = sx(xb, y); c < e; c++) g.fillRect(c, bs(c, y) - zb, 1, zb - za);
}
function tF(g, x0, y0, x1, y1, z, col) {   // flat top at height z
  g.fillStyle = col; const n = sx(x1, y0), w = sx(x0, y1);
  for (let c = sx(x0, y0), e = sx(x1, y1); c < e; c++) {
    const t = c < n ? bs(c, y0) : bw(c, x1), b = c < w ? bw(c, x0) : bs(c, y1);
    if (b > t) g.fillRect(c, t - z, 1, b - t);
  }
}
function box(g, x0, y0, x1, y1, za, zb, col, top) {
  wF(g, x0, y0, y1, za, zb, sh(col)); sF(g, y1, x0, x1, za, zb, sh(col, .8)); tF(g, x0, y0, x1, y1, zb, top || sh(col, 1.1));
}
// the two visible walls of a footprint; s = light factor
const faces = (x0, y0, x1, y1) => [{ w: 1, k: x0, a: y0, b: y1, s: 1 }, { w: 0, k: y1, a: x0, b: x1, s: .8 }];
const fr = (g, f, a, b, za, zb, col) => (f.w ? wF(g, f.k, a, b, za, zb, col) : sF(g, f.k, a, b, za, zb, col));
function fimg(g, f, u, z, img) {           // paste an image flat onto a wall, bottom edge at height z
  const c0 = f.w ? sx(f.k, u) : sx(u, f.k);
  for (let i = 0; i < img.width; i++) {
    const c = c0 + i;
    g.drawImage(img, i, 0, 1, img.height, c, (f.w ? bw(c, f.k) : bs(c, f.k)) - z - img.height, 1, img.height);
  }
}
// solid of revolution (stupa, domes, trees, tanks); rf(z) → radius in tiles, pal = light → dark
function lathe(g, cx, cy, z0, H, rf, pal, top, tex = 0) {
  const X = sx(cx, cy), Y = sy(cx, cy, z0), n = pal.length;
  for (let z = 0; z <= H; z++) {
    const r = rf(z); if (!(r > 0)) continue;
    const rx = r * HW * Math.SQRT2, ry = r * HH * Math.SQRT2, flat = z === H || rf(z + 1) < r - .15;
    const lift = z > H * .7 ? -1 : z < H * .3 ? 1 : 0;
    for (let dy = -Math.floor(ry); dy <= ry; dy++) {
      const w = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)); if (w < .5) continue;
      const xa = Math.round(X - w), xb = Math.round(X + w), y = Y - z + dy;
      if (flat) { g.fillStyle = top; g.fillRect(xa, y, xb - xa, 1); continue; }
      for (let k = 0; k < n; k++) {
        const a = Math.max(xa, Math.round(X + rx * (-1 + 2 * k / n))), b = Math.min(xb, Math.round(X + rx * (-1 + 2 * (k + 1) / n)));
        if (b <= a) continue;
        g.fillStyle = pal[Math.max(0, Math.min(n - 1, k + lift))]; g.fillRect(a, y, b - a, 1);
        if (tex && rnd() < tex) { g.fillStyle = pal[Math.min(n - 1, k + 1 + lift)] || pal[n - 1]; g.fillRect(a + ((rnd() * (b - a)) | 0), y, 1, 1); }
      }
    }
  }
}

// ── sprites: every building / prop is its own canvas so entities can hide behind it ──
const sprites = [];
function spr(x0, y0, x1, y1, h, pad = 2, keep = true) {
  const left = sx(x0, y0) - pad, top = sy(x1, y0, h) - pad;
  const cv = mk(sx(x1, y1) + pad - left, sy(x0, y1) + 1 + pad - top), g = cv.getContext('2d');
  g.translate(-left, -top);
  const s = { x0, y0, x1, y1, left, top, w: cv.width, h: cv.height, cv, g, ecv: null, eg: null };
  if (keep) sprites.push(s);
  return s;
}
function glow(s) {                           // matching night-light layer
  if (!s.eg) { s.ecv = mk(s.w, s.h); s.eg = s.ecv.getContext('2d'); s.eg.translate(-s.left, -s.top); }
  return s.eg;
}

// ── text: Burmese via Padauk (thresholded to hard pixels), Latin via a 3×5 pixel font ──
const MYF = '"Padauk","Myanmar Sangam MN","Myanmar Text","Noto Sans Myanmar",sans-serif';
function crisp(c) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let i = 3; i < a.length; i += 4) {
    const on = a[i] > 105; a[i] = on ? 255 : 0;
    if (on) { const p = (i - 3) >> 2, x = p % c.width, y = (p / c.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  g.putImageData(d, 0, 0);
  if (x1 < 0) return mk(1, 1);
  const o = mk(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, -x0, -y0); return o;
}
function myText(t, px, col, bold) {
  const f = `${bold ? 'bold ' : ''}${px}px ${MYF}`, m = mk(1, 1).getContext('2d'); m.font = f;
  const c = mk(m.measureText(t).width + 4, px * 2.2), g = c.getContext('2d');
  g.font = f; g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(t, 2, c.height / 2);
  return crisp(c);
}
const GLYPH = {};
('A010101111101101 B110101110101110 C011100100100011 D110101101101110 E111100110100111 F111100110100100 G011100101101011 ' +
 'H101101111101101 I111010010010111 J001001001101010 K101101110101101 L100100100100111 M101111101101101 N110101101101101 ' +
 'O010101101101010 P110101110100100 Q010101101110011 R110101110101101 S011100010001110 T111010010010010 U101101101101111 ' +
 'V101101101101010 W101101111111101 X101101010101101 Y101101010010010 Z111001010100111 0111101101101111 1010110010010111 ' +
 '2110001010100111 3110001010001110 4101101111001001 5111100110001110 6011100111101111 7111001010010010 8111101111101111 ' +
 '9111101111001110 -000000111000000 &010101010101011 .000000000000010 /001001010100100').split(' ').forEach(s => { GLYPH[s[0]] = s.slice(1); });
function pxText(t, col, k = 1) {
  t = t.toUpperCase(); const c = mk((t.length * 4 - 1) * k, 5 * k), g = c.getContext('2d'); g.fillStyle = col;
  [...t].forEach((ch, i) => { const b = GLYPH[ch]; if (b) for (let j = 0; j < 15; j++) if (b[j] === '1') g.fillRect((i * 4 + j % 3) * k, ((j / 3) | 0) * k, k, k); });
  return c;
}
const texCache = new Map();
function signTex(my, en, bg, fg, px = 11, k = 1, bold = false) {
  const key = [my, en, bg, fg, px, k, bold].join('|'); if (texCache.has(key)) return texCache.get(key);
  const a = my ? myText(my, px, fg, bold) : null, b = en ? pxText(en, fg, k) : null;
  const W = Math.max(a ? a.width + 4 : 0, b ? b.width + 4 : 0), H = 2 + (a ? a.height + 2 : 0) + (b ? b.height + 2 : 0);
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = sh(bg, .72); g.fillRect(0, H - 1, W, 1);
  let y = 2;
  if (a) { g.drawImage(a, (W - a.width) >> 1, y); y += a.height + 2; }
  if (b) g.drawImage(b, (W - b.width) >> 1, y);
  texCache.set(key, c); return c;
}


// ── palettes ──────────────────────────────────────────────────────────────────
const GOLD = ['#FFF2A6', '#FFDF5E', '#F6C230', '#E3A21A', '#C07E0E', '#8C5A08'];
const GOLDN = ['#FFFBE6', '#FFF3A8', '#FFE46A', '#FFD23C', '#F3B526', '#D9931A'];
const WHITE = ['#FFFFFF', '#F6F4EE', '#E8E4DA', '#D6D0C3', '#BDB6A6', '#9E9786'];
const TREE = ['#A3D862', '#82C24B', '#63A83A', '#4C8F2F', '#3A7425', '#2A5A1C'];
const LIT = ['#FFD98A', '#FFE7B0', '#FFCF6E', '#DDF2FF', '#FFF1C9'];
const GOODS = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#FB8C00', '#8E24AA', '#F5F5F5', '#6D4C41', '#00ACC1'];

// ── shared pieces (from Yangon Pixel City) ─────────────────────────────────────
function arches(g, e, f, z, h, trim, dark, lit = .4) {   // arched windows, one per tile
  for (let u = f.a; u < f.b - .5; u++) {
    fr(g, f, u + 3 / 12, u + 9 / 12, z + 2, z + h, sh(trim, f.s));
    fr(g, f, u + 4 / 12, u + 8 / 12, z + 2, z + h - 1, sh(dark, f.s));
    fr(g, f, u + 4 / 12, u + 5 / 12, z + h - 2, z + h - 1, sh(trim, f.s)); fr(g, f, u + 7 / 12, u + 8 / 12, z + h - 2, z + h - 1, sh(trim, f.s));
    if (e && chance(lit)) fr(e, f, u + 4 / 12, u + 8 / 12, z + 2, z + h - 2, pick(LIT));
  }
}
const TRIM = '#E3B23C';
function roofTier(g, cx, cy, z, rx, ry, h, col) {         // one hipped roof: gold eave, sloping sides, upturned corners
  box(g, cx - rx, cy - ry, cx + rx, cy + ry, z, z + 1, TRIM, TRIM);
  const m = Math.max(2, h - 1);
  for (let k = 0; k < m; k++) {
    const t = (k + 1) / m, ax = q12(Math.max(.04, rx * (1 - .64 * t))), ay = q12(Math.max(.04, ry * (1 - .64 * t)));
    box(g, cx - ax, cy - ay, cx + ax, cy + ay, z + 1 + k, z + 2 + k, col, sh(col, 1.18));
  }
  g.fillStyle = TRIM;                                               // the four corners curl up
  for (const [x, y, dx] of [[cx - rx, cy - ry, -1], [cx + rx, cy + ry, 0], [cx - rx, cy + ry, 0], [cx + rx, cy - ry, 0]]) g.fillRect(sx(x, y) + dx, sy(x, y, z + 1) - 2, 1, 2);
}
function pyatthat(g, cx, cy, z, r, n, col) {              // Burmese pyatthat: an odd number of ever-narrower roofs, a neck between each, a gold spire
  n |= 1;
  const th = Math.max(4, Math.round(3 + r * 5));
  for (let i = 0; i < n; i++) {
    const rr = q12(Math.max(.1, r * Math.pow(.74, i))), nk = q12(Math.max(.06, rr * .42));
    roofTier(g, cx, cy, z, rr, rr, th, col); z += th + 1;
    box(g, cx - nk, cy - nk, cx + nk, cy + nk, z - 1, z + 2, '#EFE3C2', '#F6EBD0'); z += 2;
  }
  const H = Math.round(10 + r * 12);                              // the spire, with a little hti ring
  lathe(g, cx, cy, z, H, t => (Math.abs(t / H - .45) < .06 ? .16 : .13 * Math.pow(1 - t / H, 1.2)) + .02, GOLD, GOLD[0]);
}
function blob(g, X, Y, rx, ry, pal) {       // shaded, speckled ball lit from the upper left
  const n = pal.length;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2))); if (w <= 0) continue;
    let run = -1, start = 0;
    for (let dx = -w; dx <= w + 1; dx++) {
      let k = -1;
      if (dx <= w) {
        const nx = dx / rx, ny = dy / ry, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const l = -.55 * nx - .6 * ny + .6 * nz + (rnd() - .5) * .35;
        k = Math.abs(dx) === w ? n - 1 : Math.max(0, Math.min(n - 1, Math.floor((1 - (l + .8) / 1.8) * n)));
      }
      if (k !== run) { if (run >= 0) { g.fillStyle = pal[run]; g.fillRect(X + start, Y + dy, dx - start, 1); } run = k; start = dx; }
    }
  }
}
function tree(x, y, R = 1 + rnd() * .6) {
  const th = ri(6, 10), rx = Math.round(R * 15), ry = Math.round(R * 12);
  const s = spr(x - .2, y - .2, x + .2, y + .2, th + 2 * ry + 12, rx + 12), g = s.g, X = sx(x, y), Y = sy(x, y, 1);
  g.fillStyle = '#6B4A2E'; g.fillRect(X - 1, Y - th - 4, 2, th + 4);
  const Yc = Y - th - ry + 4;
  blob(g, X - Math.round(rx * .45), Yc - Math.round(ry * .3), Math.round(rx * .65), Math.round(ry * .65), TREE);
  blob(g, X + Math.round(rx * .45), Yc - Math.round(ry * .25), Math.round(rx * .6), Math.round(ry * .6), TREE);
  blob(g, X, Yc, rx, Math.round(ry * .8), TREE);
  blob(g, X - Math.round(rx * .15), Yc - Math.round(ry * .6), Math.round(rx * .5), Math.round(ry * .45), TREE);
}
function bench(x, y) { benches.push([x + .4, y + .45]); const s = spr(x, y + .3, x + .8, y + .6, 10, 3), g = s.g; box(g, x, y + .3, x + .8, y + .6, 2, 4, '#7A5C3E'); g.fillStyle = '#4A3726'; g.fillRect(sx(x + .1, y + .6), sy(x + .1, y + .6) - 2, 1, 2); }
function busStop(x, y, alongX, name = 'ဘတ်စ်ကား', roadWest = false, en = 'YBS') {
  const [a, b, c, d] = alongX ? [x, y + .3, x + 2, y + .8] : [x + .2, y, x + .7, y + 2], s = spr(a, b, c, d, 46, 4), g = s.g, e = glow(s);
  g.fillStyle = '#555';
  for (const [u, v] of [[a, d], [c, d], [a, b], [c, b]]) g.fillRect(sx(u, v), sy(u, v, 1) - 16, 1, 16);
  box(g, a, b, c, d, 16, 18, '#2F6FD0', '#4A86E0');
  box(g, a + .2, b + .1, c - .2, d - .1, 3, 5, '#9A9A9A');
  const t = signTex(name, en, '#FFD600', '#0D47A1', 10), f = alongX ? { w: 0, k: d, a, b: c } : { w: 1, k: a, a: b, b: d };
  signOn(g, e, f, 18, t);
  // people waiting at the kerb, facing the road, and someone on the bench
  const kx = roadWest ? x + .15 : x + .85, kerb = alongX ? [[x + .6, y + .95], [x + 1.45, y + .95]] : [[kx, y + .55], [kx, y + 1.45]], back = !alongX && !roadWest;
  kerb.forEach(([px, py], i) => {
    const L = look(), w = i ? [[430, 600], [1000, 1150]] : [[400, 560], [990, 1140]];
    vig(px, py, [standing(L, 'idle', back), standing(L, 'idle2', back)], { win: w.map(v => jit(v, 40)), seq: [[0, 4 + V() * 4], [1, 1.5 + V()]] });
  });
  const L = look(), [bx, by] = alongX ? [x + 1, y + .55] : [x + .45, y + 1];
  vig(bx, by, [seated(L, 'sit', back), seated(L, 'fan', back)], { win: jit([520, 1100], 60), seq: [[0, 5 + V() * 5], [1, 1.2]] });
}
const SKIN = ['#C98E5C', '#B77945', '#D9A46C', '#A66A3A', '#E0B07C'];
const SHIRT = ['#F2F2F2', '#FFFFFF', '#E8E1CF', '#6FA8DC', '#E06666', '#93C47D', '#FFD966', '#8E7CC3', '#F6B26B', '#76A5AF', '#2B2B2B'];
const LONGYI = ['#2E4A7D', '#4B2E6B', '#1F5E47', '#6E2B2B', '#3A3A3A', '#5C4630', '#29506E'];
const HTAMEIN = ['#C2185B', '#E65100', '#6A1B9A', '#00897B', '#AD1457', '#F9A825', '#1565C0'];
function person(kind, bowl = false) {         // → { f: [front[2], back[2]] }, 7×15 px, feet at row 14
  const skin = pick(SKIN), shirt = pick(SHIRT), low = kind === 'woman' ? pick(HTAMEIN) : pick(LONGYI);
  const umb = kind !== 'monk' && chance(.2) ? pick(['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#333333']) : null;
  const f = [[], []];
  for (let back = 0; back < 2; back++) for (let fr2 = 0; fr2 < 2; fr2++) {
    const c = mk(7, 15), g = c.getContext('2d'), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    if (umb) { P(1, 0, 5, 1, umb); P(0, 1, 7, 1, sh(umb, .8)); P(3, 2, 1, 1, '#333'); }
    if (kind === 'monk') {
      P(2, 3, 3, 3, skin); P(1, 6, 5, 3, '#8E1F1F'); P(2, 9, 3, 5, '#8E1F1F'); P(4, 6, 1, 8, '#6D1717');
      if (!back) P(2, 5, 3, 1, skin);
      if (bowl && !back) P(2, 8, 3, 2, '#1E1E1E');
    } else {
      P(2, 3, 3, 1, '#1B1512'); P(2, 4, 3, 2, back ? '#1B1512' : skin);
      if (back) P(2, 5, 3, 1, skin);
      if (kind === 'woman') { P(3, 2, 1, 1, '#1B1512'); if (!back) P(2, 5, 1, 1, '#EADFB4'); }
      P(2, 6, 3, 3, shirt); P(1, 6, 1, 2, shirt); P(5, 6, 1, 2, shirt); P(1, 8, 1, 1, skin); P(5, 8, 1, 1, skin);
      P(2, 9, 3, 4, low); P(3, 10, 1, 1, sh(low, .72)); P(2, 12, 1, 1, sh(low, .8));
    }
    if (fr2) { P(3, 13, 1, 1, skin); P(3, 14, 1, 1, '#3B2B20'); } else { P(2, 13, 1, 1, skin); P(4, 13, 1, 1, skin); P(2, 14, 1, 1, '#3B2B20'); P(4, 14, 1, 1, '#3B2B20'); }
    f[back].push(c);
  }
  return { f };
}
function frontOf(a, b) {
  if (a.x1 <= b.x0 || a.y0 >= b.y1) return 1;
  if (b.x1 <= a.x0 || b.y0 >= a.y1) return -1;
  return Math.sign((a.y1 - a.x0) - (b.y1 - b.x0));
}
function order(list) {
  const n = list.length, behind = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const a = list[i];
    for (let j = i + 1; j < n; j++) {
      const b = list[j];
      if (a.left >= b.left + b.w || b.left >= a.left + a.w || a.top >= b.top + b.h || b.top >= a.top + a.h) continue;
      const f = frontOf(a, b); if (f > 0) behind[i].push(j); else if (f < 0) behind[j].push(i);
    }
  }
  const out = [], st = new Uint8Array(n);
  const visit = i => { if (st[i]) return; st[i] = 1; for (const j of behind[i]) visit(j); out.push(list[i]); };
  for (let i = 0; i < n; i++) visit(i);
  return out;
}
const ents = [];

// ── vignettes: a few people doing one slow thing, at one place, at certain hours ──
function rng(seed) {
  const f = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  f.i = (a, b) => a + Math.floor(f() * (b - a + 1)); f.pick = a => a[Math.floor(f() * a.length)]; f.p = p => f() < p;
  return f;
}
const V = rng(2024);                                   // own random stream, so the buildings stay as they were
const inWin = (m, w) => (w[0] <= w[1] ? m >= w[0] && m < w[1] : m >= w[0] || m < w[1]);
const inWins = w => (Array.isArray(w[0]) ? w.some(v => inWin(mins, v)) : inWin(mins, w));
const onNow = e => inWins(e.win);
const jit = (w, n = 30) => [w[0] + Math.floor(V() * n), w[1] - Math.floor(V() * n)];   // people arrive and leave one by one
const anchor = (c, ax, ay) => Object.assign(c, { ax, ay });
function pix(w, h, fn) { const c = mk(w, h), g = c.getContext('2d'); fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }); return c; }
function thing(x0, y0, x1, y1, h, pad, draw) {         // a small iso object drawn around the origin
  const s = spr(x0, y0, x1, y1, h, pad, false); draw(s.g); return anchor(s.cv, -s.left, OY - s.top);
}
function vig(x, y, pics, o = {}) {                     // seq: [[picture, seconds], …] played in a loop
  const seq = o.seq || [[0, 1]], tot = seq.reduce((a, q) => a + q[1], 0);
  const e = { k: 'vig', x, y, z: o.z ?? 1, pics, seq, tot, ph: o.ph ?? V() * tot, win: o.win, d: o.d || 0, r: 0, tick: o.tick, show: o.show, draw: o.draw };
  ents.push(e); return e;
}
function vigPic(e) { let t = (T + e.ph) % e.tot; for (const [i, d] of e.seq) { if (t < d) return e.pics[i]; t -= d; } return e.pics[0]; }

// people in poses (all cached at boot)
const PAPER = '#EFEDE4', INK = '#A5A39A', SHOE = '#3B2B20';
function look(kind) {
  const woman = kind === 'woman' || (!kind && V.p(.45)), old = kind === 'old' || V.p(.18);
  return { woman, skin: V.pick(SKIN), hair: old ? '#CFCBC2' : '#1B1512', shirt: V.pick(SHIRT), low: woman ? V.pick(HTAMEIN) : V.pick(LONGYI), book: V.pick(GOODS) };
}
function head(P, L, hx, hy, back) {
  P(hx, hy, 3, 1, L.hair); P(hx, hy + 1, 3, 2, back ? L.hair : L.skin); if (back) P(hx, hy + 2, 3, 1, L.skin);
  if (L.woman) { P(hx + 1, hy - 1, 1, 1, L.hair); if (!back) P(hx, hy + 2, 1, 1, '#EADFB4'); }   // bun, thanaka
}
function seated(L, pose, back) {                       // 7×11, feet on the ground at row 10
  return anchor(pix(7, 11, P => {
    head(P, L, pose === 'lean' ? 1 : 2, 0, back);
    P(2, 3, 3, 3, L.shirt); P(1, 6, 5, 2, L.low); P(2, 7, 3, 1, sh(L.low, .8));
    P(2, 8, 1, 2, L.skin); P(4, 8, 1, 2, L.skin); P(1, 10, 2, 1, SHOE); P(4, 10, 2, 1, SHOE);
    const armL = () => { P(1, 3, 1, 2, L.shirt); P(1, 5, 1, 1, L.skin); }, armR = () => { P(5, 3, 1, 2, L.shirt); P(5, 5, 1, 1, L.skin); };
    if (pose === 'sip') { armL(); P(5, 3, 1, 1, L.shirt); P(5, 2, 1, 1, L.skin); P(5, 1, 1, 1, '#F4F1E8'); }
    else if (pose === 'talk') { armL(); P(5, 3, 1, 1, L.shirt); P(6, 2, 1, 1, L.skin); }
    else if (pose === 'paper' || pose === 'paper2') {
      const d = pose === 'paper2' ? 1 : 0; P(0, 2 + d, 7, 5 - d, PAPER); P(1, 3 + d, 5, 1, INK); P(1, 5, 4, 1, INK); P(3, 2 + d, 1, 5 - d, '#D6D3C8');
    } else if (pose === 'read' || pose === 'read2') { armL(); armR(); P(2, 4, 3, 2, pose === 'read' ? L.book : PAPER); P(1, 4, 1, 1, L.skin); P(5, 4, 1, 1, L.skin); }
    else if (pose === 'fan' || pose === 'fan2') { armL(); P(5, 3, 1, 1, L.shirt); P(5, pose === 'fan' ? 2 : 3, 2, 2, '#C9A15A'); }
    else if (pose === 'rod') { P(1, 3, 1, 2, L.shirt); P(5, 3, 1, 1, L.shirt); P(5, 4, 1, 1, L.skin); P(1, 5, 1, 1, L.skin); }
    else { armL(); armR(); }
  }), 3, 10);
}
function standing(L, pose, back) {                     // 7×15, feet on the ground at row 14
  return anchor(pix(7, 15, P => {
    const bend = pose === 'bend' || pose === 'bend2', low = L.tuck ? 2 : 4;   // chinlone players tuck their longyi up
    if (bend) { head(P, L, 3, 5, back); P(2, 8, 4, 2, L.shirt); P(2, 10, 3, 3, L.low); P(5, 10, 1, 1, L.skin); if (pose === 'bend2') P(4, 8, 3, 2, L.book); }
    else { head(P, L, 2, 3, back); P(2, 6, 3, 3, L.shirt); P(2, 9, 3, low, L.low); P(3, 10, 1, 1, sh(L.low, .72)); }
    const down = x => { P(x, 6, 1, 2, L.shirt); P(x, 8, 1, 1, L.skin); };
    if (bend) { /* hands are on the books */ }
    else if (pose === 'wave') { down(1); P(5, 5, 1, 2, L.shirt); P(6, 4, 1, 1, L.skin); P(6, 3, 1, 1, '#7BB661'); }       // waving a wad of notes
    else if (pose === 'up') { P(1, 1, 1, 1, L.skin); P(1, 2, 1, 4, L.shirt); P(5, 1, 1, 1, L.skin); P(5, 2, 1, 4, L.shirt); }
    else if (pose === 'side') { P(0, 6, 2, 1, L.shirt); P(5, 6, 2, 1, L.shirt); P(0, 5, 1, 1, L.skin); P(6, 5, 1, 1, L.skin); }
    else if (pose === 'kick') { P(0, 6, 2, 1, L.shirt); P(5, 6, 1, 2, L.shirt); P(5, 8, 1, 1, L.skin); }
    else if (pose === 'rod') { down(1); P(5, 6, 1, 1, L.shirt); P(5, 7, 2, 1, L.skin); }
    else if (pose === 'run1' || pose === 'run2') { const f = pose === 'run1'; P(f ? 1 : 5, 5, 1, 2, L.shirt); P(f ? 5 : 1, 7, 1, 2, L.shirt); }
    else if (pose === 'throw') { down(1); P(5, 6, 2, 1, L.shirt); P(6, 7, 1, 1, L.skin); P(6, 9, 1, 1, '#E8D6A0'); P(5, 11, 1, 1, '#E8D6A0'); }
    else if (pose === 'pour') { down(1); P(5, 5, 1, 2, L.shirt); P(6, 4, 1, 1, L.skin); P(6, 3, 1, 1, '#F4F1E8'); P(6, 6, 1, 1, '#8FD3FF'); P(6, 8, 1, 1, '#8FD3FF'); }   // a cup of water over the Buddha
    else if (pose === 'pray') { P(2, 6, 1, 2, L.shirt); P(4, 6, 1, 2, L.shirt); P(3, 5, 1, 2, L.skin); }                      // palms together
    else if (pose === 'broom1' || pose === 'broom2') { const b = pose === 'broom1' ? 0 : 1; down(1); P(5, 7, 1, 1, L.skin); P(5 + b, 9, 1, 3, '#8B6A48'); P(4 + 2 * b, 12, 2, 2, '#C9B070'); }
    else if (pose === 'strike') { P(1, 6, 1, 2, L.shirt); P(5, 3, 1, 3, L.shirt); P(5, 2, 1, 1, L.skin); P(6, 0, 1, 3, '#6B4A2E'); }   // the wooden striker raised
    else { down(1); down(5); }
    if (L.flowers && !bend) { P(5, 6, 2, 1, '#3A8A3A'); P(5, 5, 2, 1, L.flowers); }
    if (L.hat) { P(1, 2, 5, 1, '#E8DCC0'); P(2, 1, 3, 1, '#D9CBA8'); }
    const leg = (x, y0) => { P(x, y0, 1, 14 - y0, L.skin); P(x, 14, 1, 1, L.bare ? L.skin : SHOE); }, top = 9 + low;
    if (pose === 'kick') { leg(2, top); P(4, 11, 1, 1, L.skin); P(5, 10, 1, 1, L.skin); P(6, 9, 1, 1, SHOE); }   // sole up behind, the chinlone way
    else if (pose === 'walk2' || pose === 'run2') leg(3, top);
    else if (pose === 'run1') { leg(1, top); leg(5, top); }
    else { leg(2, top); leg(4, top); }
  }), 3, 14);
}
const lower = (c, n = 1) => anchor(c, c.ax, c.ay - n);  // same picture, drawn n px lower (a small bob)
const dup = c => { const d = mk(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return anchor(d, c.ax, c.ay); };
function kid(L, pose) {                                // 5×11 child / tea-shop boy, feet at row 10
  return anchor(pix(7, 11, P => {
    head(P, L, 1, 0, false);
    P(1, 3, 3, 3, L.shirt); P(1, 6, 3, 2, L.low);
    if (pose === 'walk2') { P(2, 8, 1, 2, L.skin); P(2, 10, 1, 1, SHOE); } else { P(1, 8, 1, 2, L.skin); P(3, 8, 1, 2, L.skin); P(1, 10, 1, 1, SHOE); P(3, 10, 1, 1, SHOE); }
    if (pose === 'throw') { P(0, 3, 1, 2, L.shirt); P(4, 3, 2, 1, L.shirt); P(5, 4, 1, 1, L.skin); P(6, 6, 1, 1, '#E8D6A0'); P(5, 8, 1, 1, '#E8D6A0'); }
    else { P(0, 3, 1, 2, L.shirt); P(0, 5, 1, 1, L.skin); P(4, 3, 1, 2, L.shirt); P(4, 5, 1, 1, L.skin); }
    if (L.tray) { P(3, 4, 3, 1, '#C0C4C8'); P(4, 3, 1, 1, '#FFFFFF'); P(4, 4, 1, 1, L.skin); }
  }), 2, 10);
}


// ── time of day (Yangon time; ?t=18:30 to preview another hour) ─────────────
const Q = new URLSearchParams(location.search);
const ygn = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Yangon', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function minutesNow() {
  const t = Q.get('t'); if (t) { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); }
  const [h, m, s] = ygn.format(new Date()).split(':').map(Number); return h * 60 + m + s / 60;
}
const KEYS = [[0, [62, 70, 125], 1], [300, [62, 70, 125], 1], [350, [235, 160, 150], .7], [400, [255, 215, 185], .15], [480, [255, 240, 220], 0],
  [570, [255, 255, 255], 0], [960, [255, 255, 255], 0], [1040, [255, 205, 150], 0], [1100, [235, 150, 120], .35], [1150, [150, 110, 150], .8],
  [1200, [62, 70, 125], 1], [1440, [62, 70, 125], 1]];
function light(m) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
  const [ma, ca, la] = KEYS[i], [mb, cb, lb] = KEYS[i + 1], t = (m - ma) / (mb - ma);
  return { rgb: ca.map((v, k) => Math.round(v + (cb[k] - v) * t)), L: la + (lb - la) * t };
}
const phaseName = m => (m >= 300 && m < 600 ? ['နံနက်', 'Morning'] : m >= 600 && m < 960 ? ['နေ့လယ်', 'Day'] : m >= 960 && m < 1140 ? ['ညနေ', 'Evening'] : ['ည', 'Night']);
const busy = m => (m < 300 ? .15 : m < 360 ? .35 : m < 1260 ? 1 : m < 1380 ? .5 : .2);


const CARC = ['#F2F2EE', '#C9CDD2', '#D23B3B', '#2F5FB3', '#2B2B2E', '#E8C547', '#3D8C5A', '#8A8F96'];
const BUSC = ['#E23B3B', '#2F6FD0', '#F2B632', '#29A37A', '#7B4FC2'];
const VDIM = { car: [7, 4], taxi: [7, 4], bus: [15, 5], pickup: [8, 4], trishaw: [4, 4], fire: [12, 5], sampan: [9, 3], ferry: [26, 7] };
function sitter() {
  const c = mk(5, 9), g = c.getContext('2d'), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const skin = pick(SKIN); P(1, 0, 3, 1, '#1B1512'); P(1, 1, 3, 2, skin); P(1, 3, 3, 3, pick(SHIRT)); P(0, 4, 1, 1, skin); P(4, 4, 1, 1, skin);
  P(1, 6, 3, 2, pick(LONGYI)); P(1, 8, 1, 1, skin); P(3, 8, 1, 1, skin);
  return c;
}
function vehicle(type, dir, col) {
  const along = dir === 'E' || dir === 'W', fwd = dir === 'E' || dir === 'S' ? 1 : -1;
  const [L2, W2] = VDIM[type], hl = L2 / 12, hw = W2 / 12;
  const [x0, y0, x1, y1] = along ? [-hl, -hw, hl, hw] : [-hw, -hl, hw, hl];
  const boat = type === 'sampan' || type === 'ferry', zb = boat ? -5 : 0;
  const s = spr(x0, y0, x1, y1, 36, 8, false), g = s.g, e = glow(s);
  const sub = (t0, t1, za, zb2, c, top) => {
    let a = t0, b = t1; if (fwd < 0) [a, b] = [-t1, -t0];
    if (along) box(g, a * hl, y0, b * hl, y1, za, zb2, c, top); else box(g, x0, a * hl, x1, b * hl, za, zb2, c, top);
  };
  const [wf, sf] = faces(x0, y0, x1, y1), front = (dir === 'W' || dir === 'S'), fface = dir === 'W' || dir === 'E' ? wf : sf;
  const ends = (za, zb2, cf, cr, ecf, ecr) => {          // lights on whichever end faces the camera
    const f = fface, c = front ? cf : cr, ec = front ? ecf : ecr;
    fr(g, f, f.a + 1 / 12, f.a + 3 / 12, za, zb2, c); fr(g, f, f.b - 3 / 12, f.b - 1 / 12, za, zb2, c);
    fr(e, f, f.a + 1 / 12, f.a + 3 / 12, za, zb2, ec); fr(e, f, f.b - 3 / 12, f.b - 1 / 12, za, zb2, ec);
  };
  if (type === 'car' || type === 'taxi') {
    sub(-1, 1, 0, 2, '#222'); sub(-1, 1, 1, 5, col); sub(-.55, .4, 5, 9, '#3C4A5A', col);
    if (type === 'taxi') sub(-.12, .12, 9, 11, '#F5E663');
    ends(2, 4, '#F4F1E0', '#8E1B1B', '#FFF4C0', '#FF3B3B');
  } else if (type === 'bus') {
    sub(-1, 1, 0, 2, '#222'); sub(-1, 1, 1, 14, col, sh(col, 1.15));
    for (const f of [wf, sf]) { fr(g, f, f.a + 1 / 12, f.b - 1 / 12, 8, 12, sh('#34465A', f.s)); fr(e, f, f.a + 1 / 12, f.b - 1 / 12, 8, 12, '#FFF0C0'); fr(g, f, f.a, f.b, 4, 5, sh('#FFFFFF', f.s)); }
    ends(2, 4, '#F4F1E0', '#8E1B1B', '#FFF4C0', '#FF3B3B');
  } else if (type === 'pickup') {
    sub(-1, 1, 0, 2, '#222'); sub(.15, 1, 1, 10, col); sub(-1, .15, 1, 5, col);
    for (const f of [wf, sf]) fr(g, f, f.a + 2 / 12, f.b - 2 / 12, 6, 9, sh('#3C4A5A', f.s));
    const bx = along ? -.45 * hl * fwd : 0, by = along ? 0 : -.45 * hl * fwd; g.drawImage(sitter(), sx(bx, by) - 4, sy(bx, by, 13)); g.drawImage(sitter(), sx(bx, by), sy(bx, by, 12));
    ends(2, 4, '#F4F1E0', '#8E1B1B', '#FFF4C0', '#FF3B3B');
  } else if (type === 'trishaw') {
    sub(-1, 1, 0, 2, '#333'); sub(-1, .2, 2, 6, col); g.drawImage(sitter(), sx(0, 0) - 5, sy(0, 0, 14)); g.drawImage(sitter(), sx(0, 0), sy(0, 0, 12));
  } else if (type === 'fire') {
    sub(-1, 1, 0, 2, '#222'); sub(-1, 1, 1, 11, '#C62828', '#D84040'); sub(-.8, .6, 11, 12, '#BDBDBD');
    for (const f of [wf, sf]) fr(g, f, f.a, f.b, 5, 6, sh('#FFFFFF', f.s));
  } else if (type === 'sampan') {
    sub(-1, 1, zb, zb + 3, '#6B4A2E', '#8A6440'); g.drawImage(sitter(), sx(0, 0) - 2, sy(0, 0, 9 + zb));
  } else if (type === 'ferry') {
    sub(-1, 1, zb, zb + 5, '#F2F2EE', '#E0DED8'); sub(-.85, .85, zb + 5, zb + 11, '#FAFAF5', '#D23B3B');
    for (const f of [wf, sf]) { fr(g, f, f.a, f.b, zb + 2, zb + 3, sh('#1E4FA0', f.s)); fr(g, f, f.a + .3, f.b - .3, zb + 6, zb + 9, sh('#34465A', f.s)); fr(e, f, f.a + .3, f.b - .3, zb + 6, zb + 9, '#FFF0C0'); }
  }
  return { cv: s.cv, ecv: s.ecv, dx: s.left, dy: s.top - OY, bb: (x, y) => ({ x0: x + x0, y0: y + y0, x1: x + x1, y1: y + y1, left: s.left + sx(x, y), top: s.top + sy(x, y) - OY, w: s.w, h: s.h }) };
}

// generated from OpenStreetMap (© OpenStreetMap contributors, ODbL); tiles of 5 m, stupa at (40, 38)
const SMALL = [[40.0,38.0,0],[44.25,10.0,0],[28.5,58.25,0],[54.0,49.5,0],[37.25,56.25,0],[58.5,43.5,0],[30.5,55.75,0],[39.75,55.75,0],[35.25,56.75,0],[25.0,53.75,0],[57.5,48.5,0],[56.0,49.0,0],[30.75,32.0,0],[34.25,27.75,1],[49.5,37.5,0],[31.5,42.75,0],[48.25,47.25,1],[50.0,40.0,0],[32.5,45.0,0],[29.5,29.75,1],[49.75,46.25,1],[27.5,32.0,1],[44.5,25.75,1],[52.0,41.5,1],[50.25,40.75,0],[33.25,30.25,0],[48.25,29.25,1],[43.25,25.5,1],[35.25,50.25,1],[32.5,30.75,0],[29.75,34.25,0],[27.5,36.0,1],[48.75,47.0,1],[36.0,50.5,1],[48.0,32.75,0],[27.25,33.75,1],[46.75,47.75,1],[30.0,33.25,0],[49.25,44.0,0],[49.25,32.0,1],[30.25,45.25,1],[47.25,26.25,1],[37.75,48.0,0],[51.5,45.5,1],[52.0,44.0,1],[31.0,28.75,1],[31.25,42.0,0],[41.25,28.0,0],[36.0,48.25,0],[43.0,28.25,0],[47.5,27.0,1],[45.0,28.25,0],[40.25,26.0,1],[32.75,49.75,1],[46.25,29.75,0],[41.25,47.5,0],[46.0,46.0,0],[51.5,38.75,1],[34.25,50.5,1],[50.0,42.25,0],[31.75,31.25,0],[31.25,47.25,1],[38.5,50.25,1],[29.75,36.75,0],[49.75,38.25,0],[30.0,38.25,0],[39.25,50.0,1],[39.25,26.25,1],[49.25,36.75,0],[50.0,39.0,0],[47.0,45.75,0],[47.0,30.5,0],[30.0,32.5,0],[31.75,43.5,0],[51.25,38.0,1],[33.5,46.25,0],[47.75,28.5,1],[28.75,30.0,1],[52.0,42.75,1],[34.25,30.0,0],[32.0,44.25,0],[27.25,33.0,1],[40.0,49.75,1],[43.75,25.5,1],[51.75,40.0,1],[42.5,25.75,1],[27.5,34.75,1],[29.75,35.25,0],[44.0,28.25,0],[27.75,36.75,1],[47.75,32.0,0],[44.25,46.5,0],[47.75,45.25,0],[37.0,50.25,1],[48.25,33.5,0],[45.0,46.25,0],[47.5,47.5,1],[33.0,28.0,1],[50.25,43.25,0],[30.0,44.25,1],[50.75,45.75,1],[48.5,44.5,0],[49.0,31.0,1],[32.0,28.25,1],[45.25,25.5,1],[38.75,48.25,0],[30.25,39.0,0],[30.25,29.0,1],[48.5,29.75,1],[34.75,47.75,0],[43.0,47.75,2],[40.25,28.25,0],[42.0,28.0,0],[47.75,27.75,1],[41.75,25.5,1],[32.25,49.0,1],[45.5,29.25,0],[38.5,28.75,0],[40.5,47.75,0],[51.5,39.25,1],[33.25,50.25,1],[37.0,28.25,2],[39.25,28.5,0],[30.5,46.0,1],[47.25,31.25,0],[29.75,36.0,0],[28.0,37.75,1],[36.75,48.0,0],[32.0,48.25,1],[30.0,37.5,0],[48.5,34.25,0],[58.5,46.0,0],[58.5,38.75,0],[58.75,41.0,0],[60.75,35.0,0],[59.75,31.75,0],[25.5,24.75,0],[21.25,29.5,0],[21.75,30.75,0],[21.5,32.5,0],[21.0,37.5,0],[21.0,26.75,0],[30.25,40.75,2],[49.25,35.25,2],[25.25,13.0,0],[19.0,19.25,0],[19.25,15.0,0],[20.75,14.25,0],[16.5,17.0,0],[18.0,16.75,0],[22.25,13.5,0],[43.0,20.75,0],[44.5,6.0,3],[47.75,13.25,3],[40.25,9.75,3],[48.75,11.5,3],[47.5,6.75,3],[54.0,22.25,0],[42.75,14.5,3],[52.75,22.0,0],[45.25,14.0,3],[40.75,11.0,3],[48.25,10.25,3],[41.25,13.5,3],[42.0,6.75,3],[44.0,14.25,3],[40.0,8.75,3],[48.75,12.75,3],[36.75,9.0,0],[46.75,13.5,3],[47.75,7.75,3],[47.0,5.5,3],[55.5,22.25,0],[41.0,7.0,3],[36.75,7.25,0],[47.75,16.25,0],[53.75,26.25,0],[39.75,7.5,3],[45.75,5.75,3],[37.75,8.75,0],[41.0,12.25,3],[43.0,6.25,3],[48.0,9.0,3],[41.75,14.75,3],[53.25,23.5,0],[55.75,24.25,0],[41.25,5.75,0],[45.5,4.5,0],[47.0,4.25,0],[46.25,4.5,0],[29.75,8.5,0],[52.5,42.25,1],[52.5,40.75,1],[41.0,25.75,1],[50.0,41.5,0],[34.0,47.0,0],[33.0,45.5,0],[36.0,29.25,0],[35.0,29.75,0],[39.25,6.25,0],[40.5,6.0,0],[44.5,5.0,0],[53.25,13.25,0],[17.75,23.25,0],[16.5,15.75,0],[17.75,15.5,0],[39.5,48.0,0]];   // [x, y, 0 stupa | 1 shrine | 2 big stupa | 3 north-terrace stupa]
const HALLS = [[41.5,55.0,44.5,57.75],[45.75,49.75,60.25,57.25],[46.5,49.5,53.0,53.5],[41.5,48.5,45.75,52.5],[33.0,52.75,36.5,55.5],[32.0,56.0,34.5,59.5],[19.5,33.75,28.75,57.0],[49.75,32.5,54.0,36.75],[25.5,39.5,29.5,43.5],[34.25,24.0,38.75,28.0],[59.25,42.25,65.0,49.75],[55.25,32.25,59.75,42.25],[53.5,23.75,59.0,32.75],[51.75,16.5,54.75,21.5],[51.75,14.0,54.5,16.5],[49.5,16.5,51.75,19.25],[47.0,18.0,49.5,22.0],[38.25,16.25,46.5,23.0],[36.5,9.5,40.25,12.75],[31.75,4.5,35.0,7.25],[23.0,7.25,34.75,16.5],[33.25,20.0,36.75,23.25],[31.25,15.75,36.0,20.5],[24.75,13.75,28.75,17.25],[20.25,10.0,23.0,13.0],[19.75,15.25,26.75,22.5],[20.25,22.25,22.75,25.5],[18.25,22.25,19.75,24.0],[21.75,26.0,23.5,30.0],[47.0,54.25,57.0,60.75],[23.75,2.0,30.25,6.0],[41.0,2.75,44.0,5.75],[54.0,5.25,57.25,8.0],[48.25,7.0,52.0,10.25],[30.25,56.75,32.25,59.0],[56.0,45.0,58.0,47.0],[39.75,14.5,40.75,15.25],[37.25,13.0,38.75,14.5],[39.75,13.5,40.5,14.5],[39.5,12.75,40.25,13.5],[44.25,14.25,47.25,18.0],[48.5,6.75,49.25,7.5],[38.0,7.25,38.75,8.0],[37.75,5.75,38.5,6.75],[48.25,5.75,49.0,6.5],[37.75,6.5,38.75,7.25],[18.5,10.75,20.5,13.0],[32.5,23.0,33.25,23.75],[60.25,26.0,62.25,28.25],[59.25,23.0,61.25,25.0],[58.0,20.25,60.0,21.75],[54.75,7.75,57.5,11.5],[62.5,17.75,64.25,19.5],[61.25,15.5,63.0,17.25],[61.75,11.0,62.75,12.75],[60.75,13.0,63.5,15.0],[59.75,11.0,62.0,13.25],[59.5,8.75,62.75,11.0]];
const TREES = [[26.25,62.25],[35.75,59.25],[38.0,58.75],[50.75,11.75],[63.75,51.0],[16.5,10.75],[65.5,17.75],[66.0,19.75],[62.25,20.0],[63.25,23.25],[63.5,54.75],[66.0,43.5],[65.5,42.0],[40.0,62.0],[42.0,61.0],[21.5,61.25],[23.0,57.5],[16.5,60.25],[12.5,54.75],[15.0,52.25],[16.75,55.25],[12.5,48.25],[19.0,53.75],[21.25,50.5],[18.75,49.0],[20.0,47.25],[13.75,42.0],[12.0,41.5],[15.25,36.75],[12.5,38.75],[12.0,37.25],[17.0,37.5],[18.0,39.75],[35.5,8.75],[36.25,4.0],[39.5,5.25],[43.0,16.5],[29.0,53.0],[18.5,28.25],[19.5,29.0],[17.0,21.25]];

// ── the scene ─────────────────────────────────────────────────────────────────
const [CX, CY] = [40, 38];                       // the main stupa
const PZ = 40, BZ = PZ + 7;                      // platform height above the street; top of the stupa's lower terrace
const PLAT = [11, 1, 67, 64], BASE = [28.5, 26.5, 51.5, 49.5], INNER = [32, 30, 48, 46];
const STAIR = [47.5, 64, 50.5, 91];              // the southern covered stairway
const ROAD = [96, 100];
const inR = (r, x, y) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
// planetary posts (OSM): day, x, y, animal
const POSTS = [['sun', 47.2, 24.8, 'garuda'], ['mon', 53, 34.4, 'tiger'], ['tue', 54, 45, 'lion'], ['wed', 43.8, 53.5, 'elephant'],
  ['sat', 32.6, 54.5, 'naga'], ['thu', 27.6, 41.4, 'rat'], ['rahu', 26.4, 30.4, 'tusker'], ['fri', 36.4, 25.2, 'guineapig']];
const BELLS = [[21.6, 23.4], [50.6, 18.4]];      // King Singu's bell (NW), King Tharyarwady's bell (NE)
const AUNGMYAY = [28, 19.5];                      // the "victory ground" where people kneel to make a wish
const RELICWELL = [31.6, 22.6];

// ground: the hill, the street at the foot of the stairs, and the platform on top
const G = new Uint8Array(MW * MH);
const GRASS = 0, ROADT = 1, WALK = 2;
const at = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? -1 : G[y * MW + x]);
function layout() {
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) G[y * MW + x] = y >= ROAD[0] && y < ROAD[1] ? ROADT : y === ROAD[0] - 1 || y === ROAD[1] ? WALK : GRASS;
}
const GC = { [GRASS]: '#6E9E45', [ROADT]: '#5B5E64', [WALK]: '#CEC6B4' };
const MARBLE = ['#F1EDE4', '#E7E1D5'];
function ground(g, backdrop) {
  for (let y = 0; y < MH; y++) for (let x = MW - 1; x >= 0;) {
    const t = G[y * MW + x]; let a = x; while (a > 0 && G[y * MW + a - 1] === t) a--;
    tF(g, a, y, x + 1, y + 1, t === ROADT ? 0 : 1, GC[t]); x = a - 1;
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = G[y * MW + x];
    if (t === GRASS) for (let k = 0; k < 3; k++) { const u = x + rnd(), v = y + rnd(); g.fillStyle = chance(.5) ? '#5E8C3A' : '#86B65A'; g.fillRect(sx(u, v), sy(u, v, 1) - 1, 1, 1); }
    if (t === ROADT && y === ROAD[0] + 2 && x % 2) { g.fillStyle = '#DCD9CC'; for (let c = sx(x, y), e = sx(x + .5, y); c < e; c++) g.fillRect(c, bs(c, y), 1, 1); }
    if (t === WALK) { wF(g, x, y, y + 1, 1, 2, '#BDB5A3'); if (at(x, y + 1) === ROADT) sF(g, y + 1, x, x + 1, 0, 1, '#8B8475'); }
  }
  for (const s of backdrop) g.drawImage(s.cv, s.left, s.top);   // trees behind the hilltop
  // the platform on the hill: white retaining walls, marble on top
  const [x0, y0, x1, y1] = PLAT;
  box(g, x0, y0, x1, y1, 0, PZ, '#E4DCCB', MARBLE[0]);
  for (const f of faces(x0, y0, x1, y1)) {
    for (const z of [6, PZ - 4]) fr(g, f, f.a, f.b, z, z + 2, sh('#CFC5B1', f.s));
    for (let u = f.a + 1; u < f.b - 1; u += 2) fr(g, f, u, u + .25, 10, PZ - 8, sh('#D6CDB9', f.s));
  }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) tF(g, x, y, x + 1, y + 1, PZ, MARBLE[(x + y) & 1]);
  // the pilgrims' walk around the stupa: a darker band of worn stone
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const d = Math.max(Math.abs(x + .5 - CX), Math.abs(y + .5 - CY));
    if (d > 12.5 && d < 14.5) tF(g, x, y, x + 1, y + 1, PZ, (x + y) & 1 ? '#DCCFB8' : '#D3C5AC');
  }
  // the stupa's lower terrace, gilded, with the ring of small stupas on it
  box(g, ...BASE, PZ, BZ, '#D9A93A', '#E9CB7A');
  for (const f of faces(...BASE)) for (let u = f.a + .5; u < f.b; u += 1.5) fr(g, f, u, u + .5, PZ + 2, BZ - 1, sh('#B8862A', f.s));
}

// the main stupa: gilded terraces, octagonal dais, the bell, bowl, lotus, banana bud, hti, vane and diamond orb
const hash = k => { const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
function stupa() {
  const s = spr(...INNER, 350, 6), g = s.g, e = glow(s);
  s.round = 1; s.cx = CX; s.cy = CY;
  const terr = [[32, 30, 48, 46, 0, 9], [33.5, 31.5, 46.5, 44.5, 9, 18], [35, 33, 45, 43, 18, 26]];
  for (const [a, b, c, d, z0, z1] of terr) {
    box(g, a, b, c, d, BZ + z0, BZ + z1, '#E0B23E', '#F0CF72');
    box(e, a, b, c, d, BZ + z0, BZ + z1, '#FFD86A', '#FFE9A0');
    for (const f of faces(a, b, c, d)) for (let u = f.a + .25; u < f.b; u += 1) fr(g, f, u, u + .25, BZ + z0 + 2, BZ + z1 - 1, sh('#B8862A', f.s));
  }
  // profile, px above the terraces → radius in tiles. The Shwedagon silhouette is the contrast between
  // the full, round-shouldered bell and the long slender banana bud above it.
  const Z0 = BZ + 26, H = 250, SEAMS = [22, 70, 100, 116, 134, 206];
  const prof = z =>
    z < 10 ? 4.8 : z < 14 ? 4.4 : z < 18 ? 4.1 : z < 22 ? 3.8                           // octagonal dais, three rings
    : z < 70 ? 2.45 + 1.25 * Math.pow(1 - (z - 22) / 48, 1.8)                          // the flared skirt of the bell, plated in gold
    : z < 100 ? 2 + .45 * Math.sqrt(Math.max(0, 1 - ((z - 70) / 30) ** 2))             // the bell itself, round-shouldered
    : z < 112 ? 2.1 + .18 * Math.sin((z - 100) / 12 * Math.PI)                          // inverted alms bowl
    : z < 116 ? 1.95                                                                     // ornamental band
    : z < 125 ? 2.05 - (z - 116) * .05 : z < 134 ? 1.55 + (z - 125) * .03              // double lotus: down-turned, then up-turned
    : z < 206 ? .14 + 1.28 * Math.pow(1 - (z - 134) / 72, 1.7)                          // banana bud, long and slender
    : 0;
  lathe(g, CX, CY, Z0, 205, prof, GOLD, '#FFF6C8', .02);
  lathe(e, CX, CY, Z0, 205, prof, GOLDN, '#FFFDF0');
  // the hti: seven tiers, each flaring at its rim, a paler, jewelled gold
  const HTI = ['#FFF7DC', '#F8E6A6', '#EDCC6A', '#D6AC45', '#B08530', '#80601E'];
  const hti = z => { const t = Math.floor(z / 4.3), f = (z % 4.3) / 4.3; return z >= 30 ? 0 : (.5 - t * .055) * (1 - f * .35) + .04; };
  lathe(g, CX, CY, Z0 + 206, 30, hti, HTI, '#FFFBEA');
  lathe(e, CX, CY, Z0 + 206, 30, hti, GOLDN, '#FFFDF0');
  const X = sx(CX, CY), Y = z => sy(CX, CY, Z0 + z);
  const arc = (c, z, r, col) => {                                  // the front half of a ring round the stupa
    const rx = r * HW * Math.SQRT2, ry = r * HH * Math.SQRT2; c.fillStyle = col;
    for (let x = -Math.floor(rx); x <= rx; x++) c.fillRect(X + x, Math.round(Y(z) + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2))), 1, 1);
  };
  for (const z of SEAMS) {                                         // a dark line at each seam, a bright one just above
    const r = prof(z + 1) || hti(0);
    arc(g, z, r + .02, '#7A4E08'); arc(g, z + 1, r, '#FFF2A6');
    arc(e, z, r + .02, '#C88A10'); arc(e, z + 1, r, '#FFFBE6');
  }
  const petals = (z0, up, r0, col, dark) => {                      // lotus petals round the front of the lotus bands
    const rx = r0 * HW * Math.SQRT2, ry = r0 * HH * Math.SQRT2;
    for (let a = .12; a < Math.PI - .08; a += .21) {
      const px = Math.round(X + rx * Math.cos(a)), py = Math.round(Y(z0) + ry * Math.sin(a));
      for (let i = 0; i < 5; i++) {
        const w = up ? Math.max(0, 2 - (i >> 1)) : Math.min(2, i >> 1), yy = up ? py - i : py - 4 + i;
        g.fillStyle = col; g.fillRect(px - w, yy, 2 * w + 1, 1);
        g.fillStyle = dark; g.fillRect(px + w + 1, yy, 1, 1);
      }
    }
  };
  for (let a = .1; a < Math.PI - .05; a += .17) {                  // vertical seams of the gold plates on the skirt
    for (let z = 23; z < 69; z++) {
      const r = prof(z), px = Math.round(X + r * HW * Math.SQRT2 * Math.cos(a)), py = Math.round(Y(z) + r * HH * Math.SQRT2 * Math.sin(a));
      g.fillStyle = '#B07A18'; g.fillRect(px, py, 1, 1); e.fillStyle = '#E8A830'; e.fillRect(px, py, 1, 1);
    }
  }
  petals(116, false, 2.02, '#F6D77E', '#A87420');
  petals(126, true, 1.6, '#FFF0B0', '#B8821A');
  for (let a = .2; a < Math.PI - .1; a += .3) {                    // a garland of beads round the bowl
    const r = 2.25 * HW * Math.SQRT2, rr = 2.25 * HH * Math.SQRT2;
    g.fillStyle = '#FFF2B0'; g.fillRect(Math.round(X + r * Math.cos(a)), Math.round(Y(106) + rr * Math.sin(a)), 1, 1);
  }
  g.fillStyle = '#9A958E'; g.fillRect(X, Y(236) - 6, 1, 6); g.fillRect(X + 1, Y(236) - 6, 3, 2);   // the vane
  g.fillStyle = '#E8D6A0'; g.fillRect(X - 1, Y(244), 3, 3); g.fillStyle = '#FFFFFF'; g.fillRect(X, Y(244), 1, 1);   // the diamond orb
  g.fillRect(X, Y(248), 1, 3);
}
function smallStupa(x, y, z, k) {
  const sc = k === 2 ? 1.5 : k === 3 ? .8 : 1, s = spr(x - .5 * sc, y - .5 * sc, x + .5 * sc, y + .5 * sc, z + 40 * sc, 4), g = s.g, e = glow(s);
  const prof = t => { t /= sc; return (t < 3 ? .45 : t < 5 ? .38 : t < 14 ? .36 * Math.cos((t - 5) / 9 * Math.PI / 2) + .14 : .16 * (1 - (t - 14) / 12) + .02) * sc; };
  lathe(g, x, y, z, Math.round(26 * sc), prof, GOLD, GOLD[0]);
  lathe(e, x, y, z, Math.round(26 * sc), prof, GOLDN, GOLDN[0]);
}
function shrine(x, y, z) {
  const s = spr(x - .3, y - .3, x + .3, y + .3, z + 50, 4), g = s.g, e = glow(s);
  box(g, x - .3, y - .3, x + .3, y + .3, z, z + 9, '#F2ECDF');
  const f = { w: 0, k: y + .3 }; fr(g, f, x - .13, x + .13, z + 1, z + 7, '#3B2A22'); fr(g, f, x - .05, x + .05, z + 2, z + 5, '#E8B83A');
  fr(e, f, x - .13, x + .13, z + 1, z + 7, '#FFD27A');
  pyatthat(g, x, y, z + 9, .42, 3, V.pick(['#B8862A', '#8E2F24']));
}
const HALLC = [['#F3EDE1', '#8E2F24'], ['#F3EDE1', '#B8862A'], ['#E9D9B5', '#8E2F24'], ['#C9473A', '#D9A93A'], ['#F3EDE1', '#3E5F55']];
function hall(x0, y0, x1, y1) {
  const long = Math.max(x1 - x0, y1 - y0) > 12, h = long ? 9 : 8 + V.i(0, 1) * 2;
  const s = spr(x0, y0, x1, y1, PZ + h + 110, 4), g = s.g, e = glow(s), [wall, roof] = V.pick(HALLC);
  if (long) {                                                     // a covered walkway: pillars and a long roof
    for (const f of faces(x0, y0, x1, y1)) for (let u = f.a; u < f.b; u += 1) fr(g, f, u, u + .17, PZ, PZ + h, sh('#C9473A', f.s));
    for (let v = y0; v < y1; v += 2) box(g, x0, v, x1, Math.min(y1, v + 1.5), PZ + h, PZ + h + 2, '#8E6A4A', '#A5825E');   // slatted, so it doesn't swamp the view
    return s;
  }
  box(g, x0, y0, x1, y1, PZ, PZ + h, wall, '#CFC6B4');
  for (const f of faces(x0, y0, x1, y1)) {
    for (let u = f.a + .2; u < f.b - .4; u += 1) {                  // arched openings, pillars, a glimpse of gold inside
      fr(g, f, u, u + .6, PZ, PZ + h - 4, sh('#D9A93A', f.s)); fr(g, f, u + .08, u + .52, PZ, PZ + h - 5, sh('#3A2A24', f.s));
      if (V.p(.5)) fr(g, f, u + .22, u + .38, PZ + 2, PZ + 7, sh('#E8B83A', f.s));
      fr(e, f, u + .08, u + .52, PZ, PZ + h - 5, '#FFD690');
    }
    fr(g, f, f.a, f.b, PZ + h - 2, PZ + h, sh('#D9A93A', f.s));
  }
  // a low hipped roof over the hall (two layers on big ones), then a pyatthat rising from the middle
  const w = x1 - x0, d = y1 - y0, m = Math.min(w, d), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let z = PZ + h;
  roofTier(g, cx, cy, z, q12(w / 2 + .15), q12(d / 2 + .15), 5, roof); z += 5;
  if (m > 3) { roofTier(g, cx, cy, z, q12(w / 2 * .72), q12(d / 2 * .72), 4, roof); z += 4; }
  const r = q12(Math.max(.4, Math.min(1.3, m * .28))), n = m < 2 ? 3 : m < 4 ? 5 : 7;
  pyatthat(g, cx, cy, z, r, n, roof);
  return s;
}
const ANIMAL = {                                                   // tiny pixel animals for the planetary posts
  garuda: ['#D9A93A', [[1, 0, 3, 1], [0, 1, 5, 1], [2, 2, 1, 2]]], tiger: ['#E08A2A', [[0, 1, 5, 2], [4, 0, 2, 2], [0, 3, 1, 1], [3, 3, 1, 1]]],
  lion: ['#F2ECDF', [[0, 1, 5, 2], [4, 0, 2, 2], [0, 3, 1, 1], [3, 3, 1, 1]]], elephant: ['#9A9A9A', [[0, 0, 5, 3], [5, 1, 1, 3], [0, 3, 1, 1], [3, 3, 1, 1]]],
  tusker: ['#8A8A8A', [[0, 0, 5, 3], [5, 1, 1, 2], [0, 3, 1, 1], [3, 3, 1, 1]]], rat: ['#7A7068', [[0, 2, 4, 1], [3, 1, 2, 1], [0, 3, 1, 1]]],
  guineapig: ['#B98A5A', [[0, 1, 4, 2], [3, 0, 2, 2]]], naga: ['#3E8A5A', [[0, 3, 5, 1], [4, 1, 1, 2], [3, 0, 2, 1]]],
};
function post([day, x, y, animal]) {                              // a small Buddha on a pedestal, his animal, a water basin
  const s = spr(x - .35, y - .35, x + .35, y + .35, PZ + 30, 8), g = s.g, e = glow(s);
  box(g, x - .3, y - .3, x + .3, y + .3, PZ, PZ + 5, '#F2ECDF', '#FFFFFF');
  lathe(g, x, y, PZ + 5, 9, t => (t < 4 ? .18 : .12 * (1 - (t - 4) / 5)) + .02, ['#FFFFFF', '#F4F1EA', '#E6E1D6', '#D2CCBF'], '#FFFFFF');
  box(g, x - .12, y - .05, x + .12, y + .15, PZ + 14, PZ + 16, '#D9A93A');
  const [col, parts] = ANIMAL[animal], X = sx(x + .45, y + .1), Y = sy(x + .45, y + .1, PZ + 1) - 4;
  g.fillStyle = col; for (const [a, b, w, h] of parts) g.fillRect(X + a, Y + b, w, h);
  g.fillStyle = '#7FB6D6'; g.fillRect(sx(x - .45, y + .2) - 2, sy(x - .45, y + .2, PZ + 1) - 1, 4, 1);
  void day; void e;
}
function bellPavilion(x, y) {
  const s = spr(x - 1, y - 1, x + 1, y + 1, PZ + 110, 4), g = s.g;
  g.fillStyle = '#8E2F24';
  for (const [u, v] of [[x - .9, y + .9], [x + .9, y + .9], [x - .9, y - .9], [x + .9, y - .9]]) g.fillRect(sx(u, v), sy(u, v, PZ) - 24, 1, 24);
  lathe(g, x, y, PZ + 4, 18, t => .25 + .55 * Math.pow(1 - t / 18, 1.6), ['#C9A060', '#A88048', '#8A6A3A', '#6E522C', '#55401F'], '#B8904E');   // the bronze bell
  pyatthat(g, x, y, PZ + 24, 1.1, 3, '#8E2F24');
}
function treeAt(x, y, R, z, keep = true) {                         // the shared tree, standing on the platform or the hill
  const th = V.i(6, 10), rx = Math.round(R * 15), ry = Math.round(R * 12);
  const s = spr(x - .2, y - .2, x + .2, y + .2, z + th + 2 * ry + 12, rx + 12, keep), g = s.g, X = sx(x, y), Y = sy(x, y, z);
  g.fillStyle = '#6B4A2E'; g.fillRect(X - 1, Y - th - 4, 2, th + 4);
  const Yc = Y - th - ry + 4;
  blob(g, X - Math.round(rx * .45), Yc - Math.round(ry * .3), Math.round(rx * .65), Math.round(ry * .65), TREE);
  blob(g, X + Math.round(rx * .45), Yc - Math.round(ry * .25), Math.round(rx * .6), Math.round(ry * .6), TREE);
  blob(g, X, Yc, rx, Math.round(ry * .8), TREE);
  blob(g, X - Math.round(rx * .15), Yc - Math.round(ry * .6), Math.round(rx * .5), Math.round(ry * .45), TREE);
  return s;
}
function lampAt(x, y, z) {
  const s = spr(x - .1, y - .1, x + .1, y + .1, z + 30, 16), g = s.g, e = glow(s), X = sx(x, y), Y = sy(x, y, z);
  g.fillStyle = '#6E6A66'; g.fillRect(X, Y - 20, 1, 20); g.fillStyle = '#F4F1EA'; g.fillRect(X - 1, Y - 23, 3, 3);
  e.fillStyle = '#FFF1B8'; e.fillRect(X - 1, Y - 23, 3, 3);
  e.fillStyle = 'rgba(255,205,120,.2)';
  for (let dy = -5; dy <= 5; dy++) { const w = Math.round(11 * Math.sqrt(1 - (dy / 6) ** 2)); e.fillRect(X - w, Y + dy, 2 * w, 1); }
}
// the southern stairway: a long covered flight down the hill, roofs stepping down, stalls inside
function stairway() {
  const [x0, y0, x1, y1] = STAIR, n = 9, L = (y1 - y0) / n, s = spr(x0, y0, x1, y1, PZ + 60, 6), g = s.g, e = glow(s);
  for (let i = 0; i < n; i++) {
    const a = y0 + i * L, b = a + L, fz = Math.round(PZ * (1 - (i + 1) / n)), rz = fz + 18;
    box(g, x0, a, x1, b, 0, fz + 1, '#DCD3C1', '#D2C8B4');         // the flight itself, stepping down
    const f = { w: 1, k: x0 };
    for (let u = a; u < b - .1; u += .5) {
      fr(g, f, u, u + .1, fz, rz, '#A8342A');                       // red pillars
      fr(g, f, u + .1, u + .5, fz + 1, fz + 8, V.pick(GOODS));      // stalls: flowers, candles, umbrellas, books
      fr(e, f, u + .1, u + .5, fz + 8, rz - 2, '#FFD690');
    }
    box(g, x0 - .15, a, x1 + .15, b, rz, rz + 3, '#B8862A', '#D9A93A');
    box(g, x0 + .4, a + .2, x1 - .4, b - .2, rz + 3, rz + 6, '#8E2F24', '#A8342A');
  }
  const gate = spr(x0 - .8, y1 - .6, x1 + .8, y1 + .4, 130, 4), gg = gate.g;   // the gateway at the foot
  box(gg, x0 - .8, y1 - .6, x0 - .2, y1 + .4, 0, 26, '#F2ECDF'); box(gg, x1 + .2, y1 - .6, x1 + .8, y1 + .4, 0, 26, '#F2ECDF');
  box(gg, x0 - .8, y1 - .6, x1 + .8, y1 + .4, 26, 30, '#D9A93A');
  pyatthat(gg, (x0 + x1) / 2, y1 - .1, 30, 1.6, 5, '#8E2F24');
}
function chinthe(x, y, flip) {                                     // the two great white leogryphs guarding the south gate
  const s = spr(x - 1, y - 1, x + 1, y + 1, 80, 4), g = s.g;
  box(g, x - .9, y - .9, x + .9, y + .9, 0, 10, '#E9E4D8', '#F4F1EA');
  box(g, x - .6, y - .5, x + .6, y + .7, 10, 30, '#F7F4EC', '#FFFFFF');   // haunches and chest
  const hx = flip ? x + .1 : x - .1;
  box(g, hx - .55, y + .1, hx + .55, y + .95, 30, 46, '#FAF8F2', '#FFFFFF');   // head, turned to the street
  const f = { w: 0, k: y + .95 };
  fr(g, f, hx - .45, hx + .45, 32, 35, '#C0392B'); fr(g, f, hx - .35, hx - .15, 39, 41, '#D9A93A'); fr(g, f, hx + .15, hx + .35, 39, 41, '#D9A93A');
  for (let z = 30; z < 46; z += 3) fr(g, { w: 1, k: hx - .55 }, y + .1, y + .95, z, z + 1, '#D9A93A');   // gilded mane
  box(g, hx - .55, y + .1, hx + .55, y + .95, 46, 49, '#D9A93A');
}
function stall(x, y, kind) {                                       // flower and candle sellers, the shoe stand
  const s = spr(x - .4, y - .3, x + .4, y + .3, 30, 6), g = s.g;
  box(g, x - .4, y - .3, x + .4, y + .3, 0, 6, kind === 'shoes' ? '#6B4A2E' : '#8B5A2B', '#A87445');
  for (let k = 0; k < 10; k++) {
    const u = x - .35 + V() * .7, v = y - .25 + V() * .5;
    g.fillStyle = kind === 'shoes' ? V.pick(['#2B2B2B', '#6B3E2E', '#1E4FA0', '#8E2F24']) : V.pick(['#F5F5F5', '#FDD835', '#E53935', '#FB8C00', '#F48FB1', '#43A047']);
    g.fillRect(sx(u, v), sy(u, v, 7), 2, kind === 'shoes' ? 1 : 2);
  }
  if (kind !== 'shoes') { g.fillStyle = '#333'; g.fillRect(sx(x, y), sy(x, y, 7) - 12, 1, 12); lathe(g, x, y, 18, 2, t => .5 - t * .12, [V.pick(['#E53935', '#1E88E5', '#FDD835']), '#D8D8D8', '#BDBDBD'], '#F0F0F0'); }
}

function build() {
  const backdrop = [];
  for (let n = 0; n < 60; n++) {                                  // hill trees behind the platform (baked into the ground)
    const x = V() * MW, y = V() * 4;
    if (x > 5) backdrop.push(treeAt(q12(x), q12(y), 1 + V() * .8, 1, false));
  }
  for (let n = 0; n < 40; n++) { const x = 67.5 + V() * 12, y = 2 + V() * 60; backdrop.push(treeAt(q12(x), q12(y), 1 + V() * .8, 1, false)); }
  backdrop.sort((a, b) => (a.y1 - a.x0) - (b.y1 - b.x0));
  stupa();
  for (const [x, y, k] of SMALL) (k === 1 ? shrine : smallStupa)(x, y, inR(BASE, x, y) ? BZ : PZ, k);
  for (const h of HALLS) hall(...h);
  for (const p of POSTS) post(p);
  for (const [x, y] of BELLS) bellPavilion(x, y);
  shrine(...RELICWELL, PZ);
  for (const [x, y] of TREES) if (!HALLS.some(h => inR([h[0] - .5, h[1] - .5, h[2] + .5, h[3] + .5], x, y))) treeAt(x, y, 1.1 + V() * .6, PZ);
  for (const [x, y] of [[26.5, 25.5], [53.5, 25.5], [53.5, 50.5], [26.5, 50.5], [40, 24.5], [40, 51.5], [26.5, 38], [53.5, 38]]) lampAt(x, y, PZ);
  stairway(); chinthe(46.2, 92, false); chinthe(51.8, 92, true);
  for (const [x, y, k] of [[44.8, 90.2, 'flowers'], [44.8, 88.8, 'shoes'], [53.2, 90.2, 'flowers'], [53.2, 88.8, 'candles']]) stall(x, y, k);
  for (let n = 0; n < 160; n++) {                                  // the wooded hillside in front of the platform
    const x = V() * MW, y = 64.5 + V() * 30;
    if ((x > 42 && x < 56) || y > ROAD[0] - 1.5) continue;
    treeAt(q12(x), q12(y), 1 + V() * .9, 1);
  }
  for (let n = 0; n < 40; n++) { const x = V() * 10.5, y = 2 + V() * 62; treeAt(q12(x), q12(y), 1 + V() * .8, 1); }
  return backdrop;
}

// ── life on the platform ────────────────────────────────────────────────────
const ROBE = { monk: ['#8E1F1F', '#8E1F1F'], nun: ['#E7A3B5', '#C9803D'] };
function pilgrimLook() {
  const k = V.pick(['man', 'woman', 'woman', 'man', 'woman', 'monk', 'nun', 'tourist', 'kid']);
  const L = look(k === 'woman' ? 'woman' : 'man');
  L.bare = true;                                                  // everyone walks barefoot on the platform
  if (k === 'monk' || k === 'nun') { L.shirt = L.low = ROBE[k][0]; L.hair = L.skin; L.woman = false; }
  if (k === 'woman' && V.p(.6)) L.flowers = V.pick(['#F5F5F5', '#FDD835', '#F48FB1', '#E53935']);
  if (k === 'tourist') { L.hat = 1; L.shirt = V.pick(['#FFFFFF', '#6FA8DC', '#93C47D']); }
  return L;
}
// the walk goes clockwise round the stupa (seen from above): north → east → south → west
const RING = 13.5, RPER = RING * 8;
function ringPt(s) {
  s = ((s % RPER) + RPER) % RPER; const side = Math.floor(s / (RING * 2)), u = s % (RING * 2) - RING;
  return [[CX + u, CY - RING, 1, 0], [CX + RING, CY + u, 0, 1], [CX - u, CY + RING, -1, 0], [CX - RING, CY - u, 0, -1]][side];
}
function pilgrims() {
  for (let i = 0; i < 46; i++) {
    const L = pilgrimLook();
    const pics = [standing(L, 'walk1', false), standing(L, 'walk2', false), standing(L, 'walk1', true), standing(L, 'walk2', true)];
    const e = vig(CX, CY, pics, { z: PZ + 1, win: jit(V.pick([[240, 660], [300, 600], [600, 1000], [960, 1320], [300, 1300]]), 50) });
    let s = V() * RPER, pause = 0; const sp = .22 + V() * .12;
    e.tick = (e, dt) => {
      if (pause > 0) pause -= dt; else { s += sp * dt; if (V() < dt * .015) pause = 2 + V() * 5; }
      const [x, y, dx, dy] = ringPt(s + i * .05); e.x = x + (i % 3 - 1) * .35; e.y = y + ((i >> 2) % 3 - 1) * .35;
      const toward = dx < 0 || dy > 0;
      e.cur = pics[(toward ? 0 : 2) + (pause > 0 ? 0 : Math.floor(T * 3 + i) % 2)];
    };
  }
}
function kneeling(L, pose, back) {                                 // 7×10, knees on the ground at row 9
  return anchor(pix(7, 10, P => {
    if (pose === 'bow') { head(P, L, 3, 4, back); P(2, 6, 4, 2, L.shirt); }
    else { head(P, L, 2, 0, back); P(2, 3, 3, 3, L.shirt); if (!back) P(3, 4, 1, 1, L.skin); }
    P(1, 7, 5, 2, L.low); P(1, 9, 2, 1, L.skin); P(4, 9, 2, 1, L.skin);
    if (pose === 'light') { P(5, 5, 2, 1, L.skin); }
  }), 3, 9);
}
function worshippers() {
  const spots = [];                                               // kneeling towards the stupa, round the edge of the terrace
  for (let n = 0; n < 60 && spots.length < 22; n++) {
    const side = V.i(0, 3), u = (V() - .5) * 20, d = 12.3;
    const [x, y] = [[CX + u, CY - d], [CX + d, CY + u], [CX + u, CY + d], [CX - d, CY + u]][side];
    if (!spots.some(([a, b]) => Math.hypot(a - x, b - y) < 1.2)) spots.push([x, y, side]);
  }
  for (let n = 0; n < 8; n++) spots.push([AUNGMYAY[0] + (V() - .5) * 2.5, AUNGMYAY[1] + (V() - .5) * 2, 9]);   // the wish-granting ground
  for (const [x, y, side] of spots) {
    const L = pilgrimLook(), back = side === 2 || side === 3 || side === 9;   // facing the stupa, so south & west sides show their backs
    vig(x, y, [kneeling(L, 'kneel', back), kneeling(L, 'bow', back)], { z: PZ + 1, win: jit(V.pick([[270, 600], [960, 1300], [360, 1260]]), 60),
      seq: [[0, 5 + V() * 6], [1, 1.2], [0, 1], [1, 1.2], [0, 1], [1, 1.2]] });   // three bows, then a long quiet moment
  }
  for (const [, x, y] of POSTS) for (let k = 0; k < 2; k++) {       // pouring water over the Buddha of one's birthday
    const L = pilgrimLook(), px = x - .6 - k * .5, py = y + .5 + k * .2;
    vig(px, py, [standing(L, 'idle', true), standing(L, 'pour', true), standing(L, 'pray', true)],
      { z: PZ + 1, win: jit(V.pick([[300, 620], [900, 1290], [480, 1140]]), 60), seq: [[0, 2 + V() * 3], [1, 1.2], [0, .6], [1, 1.2], [0, .6], [1, 1.2], [2, 4 + V() * 4]] });
  }
}
function sweepers() {                                              // volunteers sweeping the marble in a long row, morning and evening
  for (let i = 0; i < 9; i++) {
    const L = look(i % 3 ? 'woman' : 'man'); L.shirt = '#FFFFFF'; L.low = i % 3 ? '#3E6F99' : '#2B4A7A';
    const pics = [standing(L, 'broom1', false), standing(L, 'broom2', false)];
    const e = vig(0, 0, pics, { z: PZ + 1, win: [[jit([330, 450], 10)[0], 450], [1020, jit([1020, 1110], 10)[1]]] });
    e.tick = e => {                                               // the row crawls west along the south side, then starts again
      const t = (T * .12 + i * .02) % 26; e.x = CX + 13 - t; e.y = CY + 14.8 + i * .45;
      e.cur = pics[Math.floor(T * 1.6 + i * .4) % 2];
    };
  }
}
function bellRinger() {
  const [x, y] = BELLS[0], L = look('man');
  vig(x - .2, y + 1.3, [standing(L, 'idle', true), standing(L, 'strike', true)], { z: PZ + 1, win: jit([360, 1260], 60), seq: [[0, 6 + V() * 6], [1, .5], [0, .8], [1, .5], [0, .8], [1, .5]] });
}
// candles and oil lamps lit at dusk in front of the planetary posts and on the wish-granting ground
function candles() {
  const racks = POSTS.map(([, x, y]) => [x + .1, y + .75]).concat([[AUNGMYAY[0], AUNGMYAY[1] + 1.4], [AUNGMYAY[0] + 1.2, AUNGMYAY[1] + 1.4]]);
  const RACK = thing(-.4, -.1, .4, .1, PZ + 10, 2, g => { box(g, -.4, -.1, .4, .1, PZ, PZ + 3, '#7A6A5A', '#8C7C6A'); });
  for (const [x, y] of racks) {
    vig(x, y, [RACK], { z: 0 });
    const win = jit([1050, 1290], 30), fl = [];
    for (let i = 0; i < 12; i++) fl.push([-.36 + i * .065, V() * 6.28]);
    vig(x, y, [], { z: 0, win, d: .01, draw: (e, X, Y) => {
      const lit = Math.min(12, Math.floor((mins - win[0]) / 3) + 1);   // they come alight one by one
      for (let i = 0; i < lit; i++) {
        const [u, p] = fl[i], cx = sx(x + u, y), cy = sy(x + u, y, PZ + 4), c = Math.sin(T * 9 + p) > 0 ? '#FFD27A' : '#FFB347';
        fg.fillStyle = '#F4F1EA'; fg.fillRect(cx, cy, 1, 2); fg.fillStyle = c; fg.fillRect(cx, cy - 1, 1, 1); glows.push([cx, cy - 1, c, 1]);
      }
      void X; void Y; void e;
    } });
    const L = pilgrimLook();
    vig(x - .3, y + .45, [kneeling(L, 'light', true), kneeling(L, 'kneel', true)], { z: PZ + 1, win: [win[0], win[0] + 40 + V() * 60], seq: [[0, 2], [1, 3]] });
  }
}
function birds() {                                                // pigeons on the marble; a slow wheel of birds round the spire
  for (let i = 0; i < 30; i++) { const x = CX - 8 + V() * 16, y = CY + 13 + V() * 3; ents.push({ k: 'pig', x, y, hx: x, hy: y, t: V() * 2, r: 0, z: PZ + 1 }); }
  for (let i = 0; i < 22; i++) flock.push({ a: V() * 6.28, r: 5 + V() * 7, z: PZ + 120 + V() * 90, w: (.2 + V() * .25) * (i % 3 ? 1 : -1) });
}
function streetLife() {                                           // cars along the road at the foot of the hill, people arriving
  for (const [y, dir] of [[ROAD[0] + 1, 'W'], [ROAD[0] + 3, 'E']]) for (let i = 0; i < 5; i++) {
    const t = V.pick(['car', 'car', 'taxi', 'bus', 'pickup']), col = t === 'bus' ? V.pick(BUSC) : V.pick(CARC);
    ents.push({ k: 'car', x: V() * MW, y, v: (dir === 'E' ? 1 : -1) * (1.6 + V() * .6), spr: vehicle(t, dir, col), r: V() });
  }
  for (let i = 0; i < 12; i++) {                                  // walking along the sidewalk and up to the gate
    const L = pilgrimLook(), pics = [standing(L, 'walk1', false), standing(L, 'walk2', false), standing(L, 'walk1', true), standing(L, 'walk2', true)];
    const x0 = V() * MW, sp = (.3 + V() * .2) * (V.p(.5) ? 1 : -1);
    vig(x0, ROAD[0] - .5, pics, { tick: e => { e.x = ((x0 + T * sp) % MW + MW) % MW; e.cur = pics[(sp < 0 ? 0 : 2) + Math.floor(T * 3 + x0) % 2]; } });
  }
  for (const [x, y, habit] of [[44.8, 90.9, 'fan'], [53.2, 90.9, 'fan'], [44.2, 88.8, 'read']]) {   // the sellers
    const L = look('woman');
    vig(x, y, [seated(L, habit, false), seated(L, habit + '2', false)], { win: jit([300, 1260], 30), seq: [[0, 3 + V() * 3], [1, .7]] });
  }
}

// ── runtime ──────────────────────────────────────────────────────────────────
const cv = document.getElementById('c'), ctx = cv.getContext('2d'), fb = mk(1, 1), fg = fb.getContext('2d');
let ST, EM, drawList = [], zoom = Q.get('z') === '2' ? 2 : 1, camX = 0, camY = 0, vw = 1, vh = 1, T = 0, mins = 0, lt = light(0), density = 1, lastClock = -1;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  vw = Math.max(1, Math.ceil(innerWidth / zoom)); vh = Math.max(1, Math.ceil(innerHeight / zoom)); fb.width = vw; fb.height = vh;
  ctx.imageSmoothingEnabled = false; clampCam();
  document.querySelectorAll('#hud button').forEach(b => b.classList.toggle('on', +b.dataset.z === zoom));
}
function clampCam() { camX = Math.max(0, Math.min(CW - vw, camX)); camY = Math.max(0, Math.min(CH - vh, camY)); }
function setZoom(z, px = innerWidth / 2, py = innerHeight / 2) {
  if (z === zoom) return;
  const wx = camX + px / zoom, wy = camY + py / zoom; zoom = z; resize(); camX = wx - px / zoom; camY = wy - py / zoom; clampCam();
}


const flock = [];
function update(dt) {
  T += dt;
  for (const e of ents) {
    if (e.k === 'vig') { if (e.tick) e.tick(e, dt); }
    else if (e.k === 'car') { e.x += e.v * dt; if (e.x > MW + 3) e.x = -3; if (e.x < -3) e.x = MW + 3; }
    else if (e.k === 'pig') { e.t -= dt; if (e.t < 0) { e.t = .4 + Math.random() * 1.5; e.x = e.hx + (Math.random() - .5) * 1.5; e.y = e.hy + (Math.random() - .5) * 1.5; } }
  }
  for (const b of flock) b.a += b.w * dt;
}

function behind(ex, ey, s) {
  if (s.above) return true;                        // bridge decks: anything they overlap on screen is under or behind them
  if (s.round) return ey - ex < CY - CX;
  if (ex >= s.x0 && ex <= s.x1 && ey >= s.y0 && ey <= s.y1) return ey - ex < (s.y0 + s.y1 - s.x0 - s.x1) / 2;
  return ex > s.x0 && ey < s.y1;
}
function drawEnt(img, dx, dy, ex, ey) {           // draw, then redraw whatever should hide it
  if (img.paint) img.paint(fg, dx, dy); else fg.drawImage(img, dx, dy);
  let clip = false;
  for (const s of drawList) {
    if (s.left >= dx + img.width || s.left + s.w <= dx || s.top >= dy + img.height || s.top + s.h <= dy || !behind(ex, ey, s)) continue;
    if (!clip) { fg.save(); fg.beginPath(); fg.rect(dx, dy, img.width, img.height); fg.clip(); clip = true; }
    fg.drawImage(s.cv, s.left, s.top);
  }
  if (clip) fg.restore();
  return clip;
}


let glows = [];
function render() {
  const X = Math.round(camX), Y = Math.round(camY);
  fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1;
  fg.fillStyle = '#2B3A2A'; fg.fillRect(0, 0, vw, vh);
  fg.drawImage(ST, X, Y, vw, vh, 0, 0, vw, vh);
  drawList = sprites.filter(s => s.left < X + vw && s.left + s.w > X && s.top < Y + vh && s.top + s.h > Y);
  fg.save(); fg.translate(-X, -Y);
  const vis = [];
  for (const e of ents) {
    if (e.r > density) continue;
    if (e.win && !onNow(e)) continue;
    if (e.show && !e.show(e)) continue;
    const px = sx(e.x, e.y); if (px < X - 60 || px > X + vw + 60) continue;
    vis.push(e);
  }
  vis.sort((a, b) => (a.y - a.x + (a.d || 0)) - (b.y - b.x + (b.d || 0)));
  const lights = []; glows = [];
  for (const e of vis) {
    const px = sx(e.x, e.y), py = sy(e.x, e.y);
    if (py < Y - 80 || py > Y + vh + 80) continue;
    if (e.k === 'car') {
      const v = e.spr, dx = px + v.dx, dy = py + v.dy;
      if (!drawEnt(v.cv, dx, dy, e.x, e.y) && v.ecv) lights.push([v.ecv, dx, dy]);
    } else if (e.k === 'vig') {
      if (e.draw) e.draw(e, px, py);
      else { const c = e.cur || vigPic(e); drawEnt(c, px - c.ax, py - e.z - c.ay, e.x, e.y); }
    } else if (e.k === 'pig') {
      const Y2 = sy(e.x, e.y, e.z || 1);
      fg.fillStyle = '#6E737B'; fg.fillRect(px - 1, Y2 - 1, 2, 1); fg.fillStyle = '#9AA0A8'; fg.fillRect(px + 1, Y2 - 2, 1, 1);
    }
  }
  fg.fillStyle = '#4A4F57';
  for (const b of flock) {
    const x = CX + b.r * Math.cos(b.a), y = CY - b.r * Math.sin(b.a), X2 = sx(x, y), Y2 = sy(x, y, b.z), f = (T * 8 + b.r) % 2 < 1;
    fg.fillRect(X2 - 1, Y2 - (f ? 1 : 0), 1, 1); fg.fillRect(X2, Y2, 1, 1); fg.fillRect(X2 + 1, Y2 - (f ? 1 : 0), 1, 1);
  }
  // the diamond orb catches the light: a 3-frame glint every 5–9 s by day, every 10–15 s by night
  const night = lt.L > .5, gap = night ? 10 + 5 * hash(Math.floor(T / 12)) : 5 + 4 * hash(Math.floor(T / 7)), tg = T % gap;
  if (tg < .36) {
    const ox = sx(CX, CY), oy = sy(CX, CY, BZ + 26 + 245), f = Math.floor(tg / .12);
    fg.fillStyle = '#FFFFFF';
    if (f === 1) { fg.fillRect(ox - 2, oy, 5, 1); fg.fillRect(ox, oy - 2, 1, 5); glows.push([ox - 2, oy, '#FFFFFF', 5, 1], [ox, oy - 2, '#FFFFFF', 1, 5]); }
    else { fg.fillRect(ox, oy, 1, 1); glows.push([ox, oy, '#FFFFFF', 1, 1]); }
  }
  fg.restore();
  if (lt.rgb.some(v => v < 255)) {
    fg.globalCompositeOperation = 'multiply'; fg.fillStyle = `rgb(${lt.rgb})`; fg.fillRect(0, 0, vw, vh); fg.globalCompositeOperation = 'source-over';
  }
  if (lt.L > .01) {
    fg.globalAlpha = Math.min(1, lt.L); fg.drawImage(EM, X, Y, vw, vh, 0, 0, vw, vh);
    for (const [c, dx, dy] of lights) fg.drawImage(c, dx - X, dy - Y);
    fg.globalAlpha = 1;
  }
  for (const [gx, gy, col, w = 3, h = 2] of glows) { fg.globalAlpha = Math.max(.35, Math.min(1, lt.L + .3)); fg.fillStyle = col; fg.fillRect(gx - X, gy - Y, w, h); }
  fg.globalAlpha = 1;
  const k = zoom * cv.width / innerWidth;
  ctx.drawImage(fb, 0, 0, vw, vh, 0, 0, vw * k, vh * k);
}

function tick() {
  mins = minutesNow(); lt = light(mins); density = busy(mins);
  const s = Math.floor(mins);
  if (s !== lastClock) {
    lastClock = s; const h = String(Math.floor(s / 60)).padStart(2, '0'), m = String(s % 60).padStart(2, '0');
    const [my, en] = phaseName(mins);
    document.getElementById('clock').innerHTML = `${h}:${m} · ${my}<span class="en"> ${en}</span>`;
  }
}
let last = performance.now();
function loop(now) {
  const dt = Math.max(0, Math.min(.1, (now - last) / 1000)); last = now;
  requestAnimationFrame(loop);
  if (!cv.width || !cv.height) return;
  update(dt); render();
}

// ── input: drag to pan, wheel / double-click / buttons / keys 1 & 2 to zoom ──
const ptrs = new Map(); let pinch = 0;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); cv.classList.add('drag'); });
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const [c, d] = [...ptrs.values()], d1 = Math.hypot(c[0] - d[0], c[1] - d[1]); pinch += d1 - d0;
    if (Math.abs(pinch) > 60) { setZoom(pinch > 0 ? 2 : 1, (c[0] + d[0]) / 2, (c[1] + d[1]) / 2); pinch = 0; }
    return;
  }
  camX -= (e.clientX - p[0]) / zoom; camY -= (e.clientY - p[1]) / zoom; ptrs.set(e.pointerId, [e.clientX, e.clientY]); clampCam();
});
const up = e => { ptrs.delete(e.pointerId); pinch = 0; if (!ptrs.size) cv.classList.remove('drag'); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
let wheelAcc = 0;
cv.addEventListener('wheel', e => {      // trackpad pinch (ctrl+wheel) zooms, plain wheel / two-finger scroll pans
  e.preventDefault();
  if (!e.ctrlKey) { camX += e.deltaX / zoom; camY += e.deltaY / zoom; clampCam(); return; }
  wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 30) { setZoom(wheelAcc < 0 ? 2 : 1, e.clientX, e.clientY); wheelAcc = 0; }
}, { passive: false });
cv.addEventListener('dblclick', e => setZoom(zoom === 1 ? 2 : 1, e.clientX, e.clientY));
document.querySelectorAll('#hud button').forEach(b => b.addEventListener('click', () => setZoom(+b.dataset.z)));
addEventListener('keydown', e => {
  if (e.key === '1' || e.key === '2') setZoom(+e.key);
  const k = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] }[e.key];
  if (k) { camX += k[0] / zoom; camY += k[1] / zoom; clampCam(); }
});
addEventListener('resize', resize);


// ── boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await new Promise(r => setTimeout(r, 30));                       // let the loading text paint first
  layout();
  const backdrop = build();
  ST = mk(CW, CH); EM = mk(CW, CH);
  const sg = ST.getContext('2d'), eg = EM.getContext('2d');
  ground(sg, backdrop);
  const sorted = order(sprites); sprites.length = 0; sprites.push(...sorted);
  for (const s of sprites) {
    sg.drawImage(s.cv, s.left, s.top);
    eg.globalCompositeOperation = 'destination-out'; eg.drawImage(s.cv, s.left, s.top); eg.globalCompositeOperation = 'source-over';
    if (s.ecv) eg.drawImage(s.ecv, s.left, s.top);
    s.ecv = s.eg = s.g = null;
  }
  pilgrims(); worshippers(); sweepers(); bellRinger(); candles(); birds(); streetLife();
  resize(); camX = sx(CX, CY) - vw / 2 + Math.min(140, vw * .12); camY = sy(CX, CY + 12, 120) - vh / 2; clampCam();   // the stupa, with the south stairway to its right
  document.getElementById('load').remove();
  tick(); setInterval(tick, 1000);
  requestAnimationFrame(loop);
})();
