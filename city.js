'use strict';
// Yangon Pixel City — downtown Yangon around Sule Pagoda, drawn entirely in code.
// Streets and landmarks follow OpenStreetMap; north–south is squeezed a little so the river fits.

// ── projection: 2:1 isometric, camera looks from the south-west ─────────────
const HW = 12, HH = 6, FL = 10;              // half tile (1 tile ≈ 5 m), px per storey
const MW = 134, MH = 176;                     // map in tiles: x → east, y → south
const OY = MW * HH + 150;                     // headroom for the towers near the NE corner
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

// ── palettes & words ─────────────────────────────────────────────────────────
const GOLD = ['#FFF2A6', '#FFDF5E', '#F6C230', '#E3A21A', '#C07E0E', '#8C5A08'];
const GOLDN = ['#FFFBE6', '#FFF3A8', '#FFE46A', '#FFD23C', '#F3B526', '#D9931A'];
const WHITE = ['#FFFFFF', '#F6F4EE', '#E8E4DA', '#D6D0C3', '#BDB6A6', '#9E9786'];
const TREE = ['#A3D862', '#82C24B', '#63A83A', '#4C8F2F', '#3A7425', '#2A5A1C'];
const TANK = ['#5A5A5A', '#474747', '#383838', '#2C2C2C', '#232323', '#1A1A1A'];
const BLUET = ['#7FB2E0', '#4F8FCC', '#3877B0', '#2B6092', '#214C75', '#183957'];
const WALLS = ['#E8DCC0', '#E6CF86', '#A9D3B8', '#9EC5DC', '#E7AAA6', '#E09A78', '#C8B5DD', '#EDEBE3', '#BCB6AA',
  '#D8A548', '#83B9AA', '#F0C9A0', '#D6D0C2', '#B7C98E', '#F2E3B3', '#D98C8C'];
const COLO = ['#E9DFC6', '#E7D08E', '#D99B7C', '#BFBAB0', '#B8CDD8', '#E3C6A8', '#C9D6B8', '#EAD7B7'];
const WIN = ['#34404E', '#2E3238', '#3E584C', '#584535'];
const LIT = ['#FFD98A', '#FFE7B0', '#FFCF6E', '#DDF2FF', '#FFF1C9'];
const GOODS = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#FB8C00', '#8E24AA', '#F5F5F5', '#6D4C41', '#00ACC1'];
const SHOPS = [   // Burmese, English, sign colour, text colour
  ['လက်ဖက်ရည်', 'TEA', '#C62828', '#FFF3C4'], ['ဆေးဆိုင်', 'PHARMACY', '#1E7D46', '#FFFFFF'],
  ['ငွေလဲ', 'EXCHANGE', '#0D47A1', '#FFE14D'], ['စာအုပ်', 'BOOKS', '#F2EFE6', '#1A3C8C'],
  ['ထမင်း', 'RICE', '#F2B632', '#7A1F10'], ['မုန့်ဟင်းခါး', 'MOHINGA', '#E8742A', '#FFFFFF'],
  ['ရွှေဆိုင်', 'GOLD', '#8B0000', '#F7D34A'], ['ဖုန်း', 'MOBILE', '#1565C0', '#FFFFFF'],
  ['ဟိုတယ်', 'HOTEL', '#263238', '#FFD54F'], ['ကွမ်းယာ', 'BETEL', '#2E7D32', '#FFEB3B'],
  ['ဆံပင်ညှပ်', 'BARBER', '#F2EFE6', '#C62828'], ['မျက်မှန်', 'OPTICAL', '#004D60', '#FFFFFF'],
  ['ကော်ဖီ', 'COFFEE', '#4E342E', '#FFE0B2'], ['စတိုး', 'STORE', '#FFEB3B', '#B71C1C'],
  ['ဒံပေါက်', 'BIRYANI', '#F9A825', '#3E2723'], ['ပလာတာ', 'PARATHA', '#FFF8E1', '#BF360C'],
  ['ဖိနပ်', 'SHOES', '#AD1457', '#FFFFFF'], ['လုံချည်', 'LONGYI', '#6A1B9A', '#FFFFFF'],
  ['နာရီ', 'WATCH', '#37474F', '#FFFFFF'], ['ပုံနှိပ်', 'PRINT', '#00897B', '#FFFFFF'],
  ['ဘီယာ', 'BEER', '#FFB300', '#1B1B1B'], ['အကြော်', 'FRITTERS', '#E64A19', '#FFFFFF'],
  ['လက်ဖက်ရည်', 'TEA', '#1B5E20', '#FFFFFF'], ['ငွေလဲ', 'EXCHANGE', '#B71C1C', '#FFFFFF'],
  ['ဘဏ်', 'BANK', '#0D47A1', '#FFFFFF'], ['ပြခန်း', 'GALLERY', '#263238', '#FFD54F'], ['ရုံး', 'OFFICE', '#F2EFE6', '#37474F'],
];
const BILLS = [
  ['မင်္ဂလာပါ', 'MINGALARBAR', '#D32F2F', '#FFFFFF'], ['ရန်ကုန်', 'YANGON', '#1E4FA0', '#FFE14D'],
  ['လက်ဖက်သုပ်', 'LAPHET', '#2E7D32', '#FFFFFF'], ['မုန့်ဟင်းခါး', 'MOHINGA', '#F2B632', '#3A1F00'],
  ['သနပ်ခါး', 'THANAKA', '#F5E6C8', '#6B3E12'], ['ဖုန်းကတ်', 'TOP UP', '#7B1FA2', '#FFFFFF'],
  ['ကော်ဖီမစ်', 'COFFEE MIX', '#6D3B1F', '#FFE9C2'], ['ရွှေမြို့', 'GOLDEN CITY', '#1B1B1B', '#F2C230'],
];

// ── map (tiles, from OpenStreetMap) ──────────────────────────────────────────
const EW = [ // [y0, y1, x0, x1, main, Burmese name, English name]
  [6, 10, 0, MW, 1, 'ဗိုလ်ချုပ်အောင်ဆန်းလမ်း', 'BOGYOKE AUNG SAN RD'],
  [44, 48, 0, MW, 1, 'အနော်ရထာလမ်း', 'ANAWRAHTA RD'],
  [66, 68, 69, 99, 0, 'စည်ပင်လမ်း', 'MUNICIPAL ST'],
  [84, 88, 0, MW, 1, 'မဟာဗန္ဓုလလမ်း', 'MAHA BANDULA RD'],
  [126, 130, 0, MW, 1, 'ကုန်သည်လမ်း', 'MERCHANT RD'],
  [138, 140, 69, 126, 0, 'ဘဏ်လမ်း', 'BANK ST'],
  [148, 152, 0, MW, 1, 'ကမ်းနားလမ်း', 'STRAND RD'],
];
const NS = [ // [x0, x1, y0, y1, main, Burmese name, English name]
  [4, 8, 0, 152, 1, 'ရွှေဘုံသာလမ်း', 'SHWE BON THAR RD'],
  [16, 18, 0, 148, 0, '၂၉ လမ်း', '29TH ST'],
  [25, 27, 0, 148, 0, '၃၀ လမ်း', '30TH ST'],
  [35, 37, 0, 148, 0, 'ဗိုလ်ဆွန်ပတ်လမ်း', 'BO SOON PAT ST'],
  [44, 46, 0, 148, 0, '၃၁ လမ်း', '31ST ST'],
  [53, 55, 0, 148, 0, '၃၂ လမ်း', '32ND ST'],
  [65, 69, 0, 152, 1, 'ဆူးလေဘုရားလမ်း', 'SULE PAGODA RD'],
  [82, 84, 0, 66, 0, '၃၃ လမ်း', '33RD ST'],
  [90, 92, 0, 66, 0, '၃၄ လမ်း', '34TH ST'],
  [99, 101, 0, 148, 0, 'မဟာဗန္ဓုလပန်းခြံလမ်း', 'MAHA BANDULA PARK ST'],
  [108, 110, 0, 84, 0, '၃၅ လမ်း', '35TH ST'],
  [117, 119, 0, 148, 0, '၃၆ လမ်း', '36TH ST'],
  [126, 130, 0, 152, 1, 'ပန်းဆိုးတန်းလမ်း', 'PANSODAN ST'],
];
const [CX, CY] = [67, 86];  // Sule roundabout
const LM = {
  hall: [76, 69, 98, 83], mosque: [56, 70, 61, 78], fire: [56, 54, 64, 62], shangri: [56, 11, 64, 28],
  sakura: [70, 11, 78, 19], shae: [70, 21, 79, 31], sulecin: [70, 33, 79, 41], church: [102, 89, 108, 96],
  court: [103, 99, 116, 122], ysx: [70, 131, 77, 137], usemb: [78, 131, 86, 137], meie: [87, 131, 98, 137],
  divcourt: [70, 141, 98, 147], temple: [19, 105, 24, 110],
};

const G = new Uint8Array(MW * MH), MAIN = new Uint8Array(MW * MH), HT = new Uint16Array(MW * MH);
const ROAD = 1, WALK = 2, GRASS = 3, WATER = 4, PATH = 5, PROM = 6, PLAZA = 7, RES = 8, LOT = 9, ISLE = 10;
const at = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? -1 : G[y * MW + x]);
const rbd = (x, y) => Math.hypot(x + .5 - CX, y + .5 - CY);
function mark(x0, y0, x1, y1, h) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x >= 0 && y >= 0 && x < MW && y < MH) HT[y * MW + x] = h; }
// can the camera see a figure h px tall standing at (x, y)? walk the sight line towards the south-west
function seen(x, y, h = 10, z = 1) {
  for (const o of [-.35, 0, .35]) for (let t = .5; t < 30; t += .5) {    // three sight lines ≈ a figure's width
    const tx = Math.floor(x + o - t), ty = Math.floor(y + o + t);
    if (tx < 0 || ty >= MH) break;
    if (HT[ty * MW + tx] > 12 * t + z + h / 2) return false;
  }
  return true;
}
function fill(x0, y0, x1, y1, t, only) {
  for (let y = Math.max(0, y0); y < Math.min(MH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(MW, x1); x++) {
    const i = y * MW + x; if (only === undefined || G[i] === only) G[i] = t;
  }
}

function layout() {
  for (const [y0, y1, x0, x1, m] of EW) { fill(x0, y0, x1, y1, ROAD); if (m) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) MAIN[y * MW + x] = 1; }
  for (const [x0, x1, y0, y1, m] of NS) { fill(x0, y0, x1, y1, ROAD); if (m) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) MAIN[y * MW + x] = 1; }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const d = rbd(x, y), i = y * MW + x;
    if (d < 5) G[i] = ISLE; else if (d < 8.5) { G[i] = ROAD; MAIN[i] = 1; }
    if (y >= 155) G[i] = WATER; else if (y >= 152 && !G[i]) G[i] = PROM;
  }
  const side = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (G[y * MW + x]) continue;
    let r = rbd(x, y) < 9.6;
    for (let dy = -1; dy <= 1 && !r; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === ROAD) { r = true; break; }
    if (r) side.push(y * MW + x);
  }
  for (const i of side) G[i] = WALK;
  fill(70, 89, 99, 126, GRASS, 0);                                  // Maha Bandula Park
  fill(84, 89, 85, 126, PATH, GRASS); fill(70, 107, 99, 108, PATH, GRASS);
  fill(80, 103, 89, 112, PATH, GRASS); fill(83, 117, 92, 121, WATER, GRASS); fill(83, 117, 92, 121, WATER, PATH);
  for (const r of Object.values(LM)) fill(r[0], r[1], r[2], r[3], RES, 0);
}

// ── ground ───────────────────────────────────────────────────────────────────
const GC = { 0: '#C3BBAA', [ROAD]: '#5B5E64', [WALK]: '#CEC6B4', [GRASS]: '#7DB64C', [WATER]: '#4E7F88', [PATH]: '#DCCFAE',
  [PROM]: '#C8BDA6', [PLAZA]: '#C3BBAA', [RES]: '#B9B1A1', [LOT]: '#8E877B', [ISLE]: '#E6DDC8' };
const GZ = t => (t === ROAD ? 0 : t === WATER ? -5 : 1);
function ground(g) {
  for (let y = 0; y < MH; y++) {
    for (let x = MW - 1; x >= 0;) {                     // east → west so the nearer tile wins
      const t = G[y * MW + x]; let a = x;
      while (a > 0 && G[y * MW + a - 1] === t) a--;
      tF(g, a, y, x + 1, y + 1, GZ(t), GC[t]); x = a - 1;
    }
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = G[y * MW + x], z = GZ(t), X = x + rnd(), Y = y + rnd();
    if (t === WALK || t === PLAZA || t === PROM || t === PATH || t === ISLE) {   // paving joints
      wF(g, x, y, y + 1, z, z + 1, sh(GC[t], .93)); sF(g, y, x, x + 1, z, z + 1, sh(GC[t], .93));
      if (chance(.2)) { g.fillStyle = sh(GC[t], .85); g.fillRect(sx(X, Y), sy(X, Y, z) - 1, 1, 1); }
    } else if (t === ROAD) {
      g.fillStyle = chance(.5) ? '#53565C' : '#63666C'; g.fillRect(sx(X, Y), sy(X, Y), 2, 1);
    } else if (t === GRASS) {
      for (let k = 0; k < 4; k++) { const U = x + rnd(), V = y + rnd(); g.fillStyle = chance(.5) ? '#6CA23F' : '#94C862'; g.fillRect(sx(U, V), sy(U, V, 1) - 1, 1, 1); }
    } else if (t === WATER) {
      g.fillStyle = chance(.5) ? '#5C8E96' : '#44737B'; g.fillRect(sx(X, Y), sy(X, Y, -5), 4, 1);
    }
    // curbs and river walls: the south / west side of a higher tile
    const S = at(x, y + 1), W = at(x - 1, y);
    if (z > 0 && S === ROAD) sF(g, y + 1, x, x + 1, 0, 1, '#8B8475');
    if (z > 0 && W === ROAD) wF(g, x, y, y + 1, 0, 1, '#8B8475');
    if (t === WATER) {
      const N = at(x, y - 1), E = at(x + 1, y);
      if (N >= 0 && N !== WATER) sF(g, y, x, x + 1, -5, 1, '#6E675C');
      if (E >= 0 && E !== WATER) wF(g, x + 1, y, y + 1, -5, 1, '#7C7468');
    }
  }
  // lane markings and zebra crossings
  const paint = '#DCD9CC';
  for (const [y0, y1, x0, x1, m] of EW) if (m) for (let x = x0; x < x1; x++) {
    if (at(x, y0 - 1) === ROAD || at(x, y1) === ROAD || rbd(x, y0 + 2) < 10) continue;
    g.fillStyle = paint; for (let c = sx(x, y0 + 2), e = sx(x + .5, y0 + 2); c < e; c++) g.fillRect(c, bs(c, y0 + 2), 1, 1);
  }
  for (const [x0, x1, y0, y1, m] of NS) if (m) for (let y = y0; y < y1; y++) {
    if (at(x0 - 1, y) === ROAD || at(x1, y) === ROAD || rbd(x0 + 2, y) < 10) continue;
    g.fillStyle = paint; for (let c = sx(x0 + 2, y), e = sx(x0 + 2, y + .5); c < e; c++) g.fillRect(c, bw(c, x0 + 2), 1, 1);
  }
  for (const [y0, y1, ex0, ex1, m] of EW) for (const [x0, x1, ny0, ny1, nm] of NS) {
    if (!(m || nm) || x0 < ex0 || x1 > ex1 || ny0 > y0 || ny1 < y1 || rbd(x0, y0) < 12) continue;
    if (m && x0 - 1.25 > 0) for (let k = 0; k < (y1 - y0) * 2; k++) tF(g, x0 - 1.25, y0 + k * .5 + .125, x0 - .25, y0 + k * .5 + .375, 0, paint);
    if (nm && y0 - 1.25 > 0) for (let k = 0; k < (x1 - x0) * 2; k++) tF(g, x0 + k * .5 + .125, y0 - 1.25, x0 + k * .5 + .375, y0 - .25, 0, paint);
  }
}

// ── buildings ────────────────────────────────────────────────────────────────
const teaSpots = [], upper = [];
function arches(g, e, f, z, h, trim, dark, lit = .4) {   // arched windows, one per tile
  for (let u = f.a; u < f.b - .5; u++) {
    fr(g, f, u + 3 / 12, u + 9 / 12, z + 2, z + h, sh(trim, f.s));
    fr(g, f, u + 4 / 12, u + 8 / 12, z + 2, z + h - 1, sh(dark, f.s));
    fr(g, f, u + 4 / 12, u + 5 / 12, z + h - 2, z + h - 1, sh(trim, f.s)); fr(g, f, u + 7 / 12, u + 8 / 12, z + h - 2, z + h - 1, sh(trim, f.s));
    if (e && chance(lit)) fr(e, f, u + 4 / 12, u + 8 / 12, z + 2, z + h - 2, pick(LIT));
  }
}
function pyatthat(g, cx, cy, z, r, n, col) {             // Burmese tiered roof
  for (let i = 0; i < n; i++) {
    const rr = q12(r * (1 - i / (n + .6))), nk = q12(rr * .55);
    box(g, cx - rr, cy - rr, cx + rr, cy + rr, z, z + 3, col, sh(col, 1.3));
    box(g, cx - nk, cy - nk, cx + nk, cy + nk, z + 3, z + 5, '#EFE3C2'); z += 5;
  }
  lathe(g, cx, cy, z, 14, t => .28 * (1 - t / 14) + .03, GOLD, GOLD[0]);
}
function streaks(g, f, zmax) {
  g.fillStyle = 'rgba(40,34,28,.2)';
  for (let n = ri(0, 3); n > 0; n--) {
    const u = f.a + rnd() * (f.b - f.a - .1), c = f.w ? sx(f.k, u) : sx(u, f.k), zt = ri(14, zmax - 4), len = ri(4, 16);
    g.fillRect(c, (f.w ? bw(c, f.k) : bs(c, f.k)) - zt, 1, Math.min(len, zt));
  }
}
function roofStuff(g, x0, y0, x1, y1, H) {
  for (let n = ri(0, 2); n > 0; n--) {
    const cx = q12(x0 + .4 + rnd() * (x1 - x0 - .8)), cy = q12(y0 + .4 + rnd() * (y1 - y0 - .8));
    lathe(g, cx, cy, H, 6, () => .2, chance(.7) ? TANK : BLUET, chance(.7) ? '#3E3E3E' : '#8CBBE6');
  }
  if (chance(.25) && x1 - x0 > 1.5 && y1 - y0 > 1.5) box(g, x0 + .25, y0 + .25, x0 + 1.25, y0 + 1.25, H, H + 8, '#CFC9BB');
  if (chance(.3)) { g.fillStyle = '#4A4A4A'; g.fillRect(sx(x1 - .4, y0 + .4), sy(x1 - .4, y0 + .4, H) - 15, 1, 15); }
  if (V.p(.45)) {                                              // satellite dish
    const X = sx(x0 + .3 + V() * (x1 - x0 - .6), y0 + .3 + V() * (y1 - y0 - .6)), Y = sy(x0 + .5, y0 + .5, H) + Math.round((V() - .5) * 6);
    g.fillStyle = '#5A5A5A'; g.fillRect(X, Y - 4, 1, 4); g.fillStyle = '#E8E8E4'; g.fillRect(X - 2, Y - 7, 4, 2); g.fillRect(X - 1, Y - 8, 3, 1); g.fillStyle = '#BDBDB8'; g.fillRect(X - 2, Y - 5, 4, 1);
  }
  for (let n = V.i(0, 2); n > 0; n--) {                        // air-con outdoor units
    const a = q12(x0 + .15 + V() * (x1 - x0 - .6)), b = q12(y0 + .15 + V() * (y1 - y0 - .5));
    box(g, a, b, a + .33, b + .25, H, H + 4, '#D9D9D4'); wF(g, a, b + .04, b + .21, H + 1, H + 3, '#6E6E6A');
  }
}
// what a street sells: each street has its own mix, and neighbours never repeat a sign
const SR = rng(4242), signUse = {}, lastOn = {};
const INDIAN = ['BIRYANI', 'PARATHA', 'BETEL', 'RICE', 'TEA', 'LONGYI', 'GOLD'];
const TRADE = {
  'SHWE BON THAR RD': ['GOLD', 'GOLD', 'LONGYI', 'WATCH', 'TEA', 'PHARMACY'],
  'SULE PAGODA RD': ['EXCHANGE', 'MOBILE', 'OPTICAL', 'WATCH', 'HOTEL', 'PHARMACY', 'COFFEE', 'TEA'],
  'PANSODAN ST': ['BOOKS', 'BOOKS', 'PRINT', 'TEA', 'COFFEE', 'OPTICAL', 'GALLERY', 'BANK', 'OFFICE'],
  'BOGYOKE AUNG SAN RD': ['LONGYI', 'SHOES', 'GOLD', 'WATCH', 'TEA', 'MOBILE'],
  'ANAWRAHTA RD': ['MOBILE', 'PHARMACY', 'SHOES', 'RICE', 'TEA', 'BIRYANI', 'STORE'],
  'MERCHANT RD': ['STORE', 'RICE', 'BEER', 'PRINT', 'TEA', 'FRITTERS'],
  'STRAND RD': ['STORE', 'BEER', 'RICE', 'HOTEL', 'FRITTERS', 'TEA'],
  '29TH ST': INDIAN, '30TH ST': INDIAN, '31ST ST': INDIAN, 'BO SOON PAT ST': INDIAN,
  '32ND ST': ['TEA', 'BIRYANI', 'MOBILE', 'BETEL', 'RICE', 'MOHINGA'],
  'MB WEST': ['PARATHA', 'BIRYANI', 'GOLD', 'TEA', 'BETEL', 'MOHINGA'],
  'MB EAST': ['PHARMACY', 'EXCHANGE', 'OPTICAL', 'COFFEE', 'MOBILE', 'TEA'],
};
const ALLTRADE = [...new Set(SHOPS.map(s => s[1]))];
function streetOf(f) {                                            // the street a wall looks onto
  const r = f.w ? NS.find(r => r[1] === f.k - 1 && r[2] <= f.a && r[3] >= f.b) : EW.find(r => r[0] === f.k + 1 && r[2] <= f.a && r[3] >= f.b);
  if (!r) return null;
  return r[6] === 'MAHA BANDULA RD' ? (f.a < CX ? 'MB WEST' : 'MB EAST') : r[6];
}
function shopSign(maxW, f) {
  const key = (f.w ? 'w' : 's') + f.k, prev = lastOn[key], mid = (f.a + f.b) / 2;
  let list = (TRADE[streetOf(f)] || ALLTRADE).filter(en => !(prev && prev[0] === en && Math.abs(prev[1] - mid) < 6));
  for (let i = 0; i < 8 && list.length; i++) {
    const w = list.map(en => 1 / (1 + (signUse[en] || 0) * .6)), tot = w.reduce((a, b) => a + b, 0);   // rarer signs get picked more
    let r = SR() * tot, j = 0; while (r > w[j]) r -= w[j++];
    const en = list[j], [my, , bg, fg] = SR.pick(SHOPS.filter(s => s[1] === en));
    for (const t of [signTex(my, en, bg, fg), signTex(my, en, bg, fg, 10), signTex(my, null, bg, fg, 10)]) {
      if (t.width <= maxW) { signUse[en] = (signUse[en] || 0) + 1; lastOn[key] = [en, mid]; return [t, en]; }
    }
    list = list.filter(e => e !== en);
  }
  return [null];
}
function signOn(g, e, f, z, t) {
  const u = f.a + Math.max(0, Math.round(((f.b - f.a) * 12 - t.width) / 2)) / 12;
  fimg(g, f, u, z, t); if (e) fimg(e, f, u, z, t);
}
function billboard(g, e, x0, y0, x1, y1, H) {
  const [my, en, bg, fg] = pick(BILLS), t = signTex(my, en, bg, fg, 13, 1, true);
  const alongY = y1 - y0 >= x1 - x0, room = (alongY ? y1 - y0 : x1 - x0) * 12;
  if (t.width > room) return;
  const f = alongY ? { w: 1, k: q12(x0 + .5), a: y0, b: y1 } : { w: 0, k: q12(y1 - .5), a: x0, b: x1 };
  g.fillStyle = '#3A3A3A';
  for (const u of [f.a + .5, f.b - .5]) { const c = f.w ? sx(f.k, u) : sx(u, f.k); g.fillRect(c, (f.w ? bw(c, f.k) : bs(c, f.k)) - H - 8, 1, 8); }
  signOn(g, e, f, H + 6, t);
}

function shop(x0, y0, x1, y1, fl, stW, stS, main) {
  const H = 14 + (fl - 1) * FL + 2, s = spr(x0, y0, x1, y1, H + 40), g = s.g, e = glow(s);
  mark(x0, y0, x1, y1, H);
  if (stW && fl >= 3) upper.push({ x0, y0, y1, fl });
  const col = pick(WALLS), win = pick(WIN), bal = chance(.35), grille = chance(.5);
  box(g, x0, y0, x1, y1, 0, H, col, '#A7A194');
  tF(g, x0 + 1 / 6, y0 + 1 / 6, x1 - 1 / 6, y1 - 1 / 6, H, '#948E82');
  for (const f of faces(x0, y0, x1, y1)) {
    const street = f.w ? stW : stS;
    if (street) {                              // open shop front
      fr(g, f, f.a + 1 / 12, f.b - 1 / 12, 0, 11, sh('#2B2521', f.s));
      fr(e, f, f.a + 1 / 12, f.b - 1 / 12, 5, 11, '#FFCF7A');
      for (let u = f.a + 2 / 12; u < f.b - 2 / 12; u += 1 / 12) if (chance(.6)) fr(g, f, u, u + 1 / 12, ri(1, 3), ri(4, 8), pick(GOODS));
      fr(g, f, f.a + 1 / 12, f.b - 1 / 12, 11, 13, sh('#8E9094', f.s));
    } else if (chance(.6)) {
      const u = q12(f.a + .3 + rnd() * (f.b - f.a - 1)); fr(g, f, u, u + 4 / 12, 0, 10, sh('#4A3B30', f.s));
    }
    for (let k = 1; k < fl; k++) {
      const z = 14 + (k - 1) * FL;
      fr(g, f, f.a, f.b, z, z + 1, sh(col, f.s * .82));
      for (let u = f.a; u < f.b - .5; u++) {
        fr(g, f, u + 3 / 12, u + 9 / 12, z + 3, z + 9, sh(win, f.s));
        if (grille) for (let i = 4; i < 9; i += 2) fr(g, f, u + i / 12, u + (i + 1) / 12, z + 3, z + 9, sh('#8C9096', f.s));
        else fr(g, f, u + 3 / 12, u + 4 / 12, z + 7, z + 9, sh('#9FB6CC', f.s));
        if (chance(.45)) fr(e, f, u + 3 / 12, u + 9 / 12, z + 3, z + 9, pick(LIT));
        if (chance(.3)) fr(g, f, u + 7 / 12, u + 10 / 12, z + 1, z + 3, sh('#E4E4E0', f.s));      // air-con
      }
      if (bal) {
        fr(g, f, f.a, f.b, z + 2, z + 4, sh(col, f.s * .7));
        for (let u = f.a; u < f.b; u += 1 / 6) if (chance(.12)) fr(g, f, u, u + 1 / 12, z + 4, z + 6, pick(GOODS));   // laundry
      }
    }
    fr(g, f, f.a, f.b, H - 2, H, sh(col, f.s * 1.08));
    streaks(g, f, H);
    if (street && chance(.8)) {
      const [t, en] = shopSign((f.b - f.a) * 12 - 2, f);
      if (t) { signOn(g, e, f, 13, t); if (en === 'TEA') teaSpots.push(f.w ? [f.k - 1, Math.floor((f.a + f.b) / 2), 'E'] : [Math.floor((f.a + f.b) / 2), f.k, 'N']); }
    }
  }
  roofStuff(g, x0, y0, x1, y1, H);
  if (main && fl >= 6 && chance(.22)) billboard(g, e, x0, y0, x1, y1, H);
  return s;
}

function colonial(x0, y0, x1, y1, fl, col = pick(COLO), sign = null, stW = true, stS = true) {
  const FH = 13, H = 16 + (fl - 1) * FH + 5, s = spr(x0, y0, x1, y1, H + 30), g = s.g, e = glow(s), trim = '#F4EEE0';
  mark(x0, y0, x1, y1, H);
  box(g, x0, y0, x1, y1, 0, H, col, '#B0A898');
  for (const f of faces(x0, y0, x1, y1)) {
    const street = f.w ? stW : stS;
    for (let u = f.a; u < f.b - .5; u++) {       // ground-floor arcade
      fr(g, f, u + 2 / 12, u + 10 / 12, 0, 12, sh(street ? '#2E2723' : '#4A3F37', f.s));
      fr(g, f, u + 2 / 12, u + 3 / 12, 10, 12, sh(col, f.s)); fr(g, f, u + 9 / 12, u + 10 / 12, 10, 12, sh(col, f.s));
      if (street && chance(.6)) fr(e, f, u + 3 / 12, u + 9 / 12, 3, 10, '#FFCF7A');
    }
    for (let k = 1; k < fl; k++) {
      const z = 16 + (k - 1) * FH;
      fr(g, f, f.a, f.b, z - 2, z, sh(trim, f.s));
      arches(g, e, f, z, 11, trim, '#34404E', .35);
    }
    for (let u = f.a; u <= f.b; u++) fr(g, f, Math.max(f.a, u - 1 / 12), Math.min(f.b, u + 1 / 12), 16, H - 5, sh(trim, f.s * .96));
    fr(g, f, f.a, f.b, H - 5, H - 3, sh(trim, f.s));
    for (let u = f.a; u < f.b; u += 2 / 12) fr(g, f, u, u + 1 / 12, H - 3, H, sh(trim, f.s * .9));
    streaks(g, f, H);
  }
  if (sign) signOn(g, e, sign.f === 's' ? faces(x0, y0, x1, y1)[1] : faces(x0, y0, x1, y1)[0], 13, sign.t);
  if (chance(.25)) lathe(g, q12(x0 + .8), q12(y1 - .8), H, 12, t => .75 * Math.cos(t / 12 * Math.PI / 2) + .05, ['#8FB0A0', '#739888', '#5E8272', '#4B6C5E', '#3B574B', '#2E463C'], '#A9C8B8');
  return s;
}

function tower(g, e, x0, y0, x1, y1, zb, n, wall, glass, fh) {
  const zt = zb + n * fh + 4; box(g, x0, y0, x1, y1, zb, zt, wall, sh(wall, .92));
  for (const f of faces(x0, y0, x1, y1)) for (let k = 0; k < n; k++) {
    const z = zb + k * fh + 2;
    fr(g, f, f.a + 2 / 12, f.b - 2 / 12, z, z + fh - 3, sh(glass, f.s));
    for (let u = f.a + .5; u < f.b - .1; u += .5) fr(g, f, u, u + 1 / 12, z, z + fh - 3, sh(wall, f.s));
    for (let u = f.a; u < f.b - .4; u += .5) if (chance(.35)) fr(e, f, u + 2 / 12, u + 6 / 12, z, z + fh - 3, pick(LIT));
  }
  return zt;
}

// ── landmarks ────────────────────────────────────────────────────────────────
function sule() {
  const s = spr(CX - 5, CY - 5, CX + 5, CY + 5, 150), g = s.g, e = glow(s);
  s.round = 1;
  lathe(g, CX, CY, 0, 16, () => 4.8, ['#FBF6EA', '#F1E9D6', '#E3D8BE', '#CFC2A4', '#B3A687', '#93876B'], '#EDE4CF');
  const X = sx(CX, CY), Y = sy(CX, CY), rx = 4.8 * HW * Math.SQRT2, ry = 4.8 * HH * Math.SQRT2;
  for (let a = .2; a < Math.PI - .15; a += .2) {     // ring of shops around the base
    const x = Math.round(X + rx * Math.cos(a)), y = Math.round(Y + ry * Math.sin(a));
    g.fillStyle = pick(['#C62828', '#1565C0', '#F9A825', '#2E7D32']); g.fillRect(x - 2, y - 13, 5, 2);
    g.fillStyle = '#3A2E26'; g.fillRect(x - 2, y - 11, 5, 8);
    g.fillStyle = pick(GOODS); g.fillRect(x - 1, y - 6, 3, 2);
    e.fillStyle = '#FFD27A'; e.fillRect(x - 2, y - 11, 5, 5);
  }
  const prof = z => z < 7 ? 4.1 : z < 13 ? 3.6 : z < 19 ? 3.1 : z < 25 ? 2.75
    : z < 58 ? 1.35 + 1.4 * Math.cos((z - 25) / 33 * Math.PI / 2)
    : z < 64 ? 1.45 : z < 69 ? 1.2 : z < 76 ? 1
    : z < 104 ? .12 + .88 * Math.pow(1 - (z - 76) / 28, 1.3)
    : z < 110 ? .12 : z < 116 ? .4 - (z - 110) * .05 : .06;
  lathe(g, CX, CY, 16, 124, prof, GOLD, '#FFF6C8');
  lathe(e, CX, CY, 16, 124, prof, GOLDN, '#FFFDF0');
  const t = signTex('ဆူးလေစေတီ', 'SULE PAGODA', '#8B1A1A', '#FFD54F');
  g.drawImage(t, X - (t.width >> 1), Math.round(Y + ry) - 14 - t.height); e.drawImage(t, X - (t.width >> 1), Math.round(Y + ry) - 14 - t.height);
}

function cityHall() {
  const [x0, y0, x1, y1] = LM.hall, s = spr(x0, y0, x1, y1, 140), g = s.g, e = glow(s);
  const L = '#BBA3D2', T = '#F2EADB', R = '#5B6B66';
  box(g, x0, y0, x1, y1, 0, 40, L, '#A39C90');
  for (const f of faces(x0, y0, x1, y1)) {
    for (const z of [0, 14, 27]) { arches(g, e, f, z, 11, T, '#3A3346', .45); fr(g, f, f.a, f.b, z + 12, z + 14, sh(T, f.s)); }
    fr(g, f, f.a, f.b, 38, 40, sh(T, f.s));
    for (let u = f.a; u < f.b; u += 2 / 12) fr(g, f, u, u + 1 / 12, 40, 42, sh(T, f.s));
  }
  const pav = (a, b, c, d, h, n, r) => {
    box(g, a, b, c, d, 40, h, L, sh(L, 1.1));
    for (const f of faces(a, b, c, d)) { arches(g, e, f, 42, h - 44, T, '#3A3346', .5); fr(g, f, f.a, f.b, h - 2, h, sh(T, f.s)); }
    pyatthat(g, (a + c) / 2, (b + d) / 2, h, r, n, R);
  };
  pav(94, 69, 98, 73, 50, 3, 2.25); pav(94, 79, 98, 83, 50, 3, 2.25); pav(76, 69, 80, 73, 50, 3, 2.25);
  pav(83, 77, 91, 83, 62, 5, 3.5); pav(76, 79, 80, 83, 50, 3, 2.25);
  const t = signTex('ရန်ကုန်မြို့တော်ခန်းမ', 'YANGON CITY HALL', '#F2EADB', '#4A2F66');
  signOn(g, e, { w: 0, k: y1, a: 83, b: 91 }, 13, t);
}

function mosque() {
  const [x0, y0, x1, y1] = LM.mosque, s = spr(x0, y0, x1, y1, 110, 10), g = s.g, e = glow(s);
  box(g, x0, y0, x1, y1, 0, 32, '#F3F1EA', '#D8D3C8');
  const tiles = ['#2E8B57', '#1E6FA8', '#F2C230', '#FFFFFF', '#1E6FA8', '#2E8B57'];
  for (const f of faces(x0, y0, x1, y1)) {
    for (let u = f.a, i = 0; u < f.b; u += 1 / 12, i++) for (let z = 2; z < 12; z++) fr(g, f, u, u + 1 / 12, z, z + 1, sh(tiles[(i + z) % 6], f.s));
    arches(g, e, f, 14, 11, '#2E8B57', '#23313A', .5);
    fr(g, f, f.a, f.b, 26, 28, sh('#2E8B57', f.s));
    for (let u = f.a; u < f.b; u += 3 / 12) fr(g, f, u, u + 1 / 12, 32, 35, sh('#FFFFFF', f.s));
  }
  const onion = (R, H) => z => { const t = z / H; return t < .55 ? R * (.8 + .25 * Math.sin(t / .55 * Math.PI / 2)) : R * 1.05 * Math.cos((t - .55) / .45 * Math.PI / 2) + .03; };
  lathe(g, (x0 + x1) / 2, (y0 + y1) / 2, 32, 22, onion(1.5, 22), ['#8FD1AE', '#5DB88A', '#3E9A6A', '#2E8057', '#236646', '#1A4D35'], '#BFE8CF');
  const minaret = (x, y) => {
    lathe(g, x, y, 0, 70, z => z < 6 ? .5 : (z > 44 && z < 47) || (z > 58 && z < 61) ? .55 : z < 62 ? .34 : .36 * Math.cos((z - 62) / 8 * Math.PI / 2) + .02, WHITE, '#FFFFFF');
    lathe(e, x, y, 62, 8, z => .36 * Math.cos(z / 8 * Math.PI / 2) + .02, ['#E8FFF0', '#C8F5DA', '#A8E8C0'], '#FFFFFF');
  };
  minaret(x1, y1); minaret(x0, y1);
}

function fireStation() {
  const [x0, y0, x1, y1] = LM.fire, s = spr(x0, y0, x1, y1, 100), g = s.g, e = glow(s);
  const B = '#B34A33', C = '#EFE2C8';
  box(g, x0, y0, x1, y1, 0, 38, B, '#9C8E80');
  for (const f of faces(x0, y0, x1, y1)) {
    for (const z of [12, 25, 36]) fr(g, f, f.a, f.b, z, z + 2, sh(C, f.s));
    arches(g, e, f, 13, 11, C, '#2F2A2A'); arches(g, e, f, 26, 9, C, '#2F2A2A');
  }
  const wf = faces(x0, y0, x1, y1)[0];
  for (const u of [y0 + .5, y0 + 2.8, y0 + 5.1]) { fr(g, wf, u, u + 1.8, 0, 11, '#F4EEE0'); fr(g, wf, u + 1 / 12, u + 1.8 - 1 / 12, 0, 10, '#C62828'); fr(g, wf, u + .8, u + .9, 0, 10, '#8E1B1B'); }
  // watch tower at the south-west corner
  const [a, b, c, d] = [x0, y1 - 2.5, x0 + 2.5, y1];
  box(g, a, b, c, d, 38, 64, B, sh(B, 1.1));
  for (const f of faces(a, b, c, d)) { fr(g, f, f.a, f.b, 50, 52, sh(C, f.s)); fr(g, f, f.a + 3 / 12, f.b - 3 / 12, 55, 62, sh('#2A2A2A', f.s)); fr(e, f, f.a + 3 / 12, f.b - 3 / 12, 55, 62, '#FFE7B0'); }
  for (let i = 0; i < 4; i++) { const r = q12(1.45 - i * .35); box(g, a + 1.25 - r, b + 1.25 - r, a + 1.25 + r, b + 1.25 + r, 64 + i * 3, 67 + i * 3, '#4A3A34'); }
  signOn(g, e, { w: 1, k: x0, a: y0, b: y0 + 5 }, 24, signTex('မီးသတ်ဌာန', 'FIRE STATION', '#C62828', '#FFFFFF'));
}

function shangriLa() {
  const [x0, y0, x1, y1] = LM.shangri, s = spr(x0, y0, x1, y1, 270), g = s.g, e = glow(s);
  box(g, x0, y0, x1, y1, 0, 30, '#D9CDB5', '#B8AE9C');
  for (const f of faces(x0, y0, x1, y1)) { fr(g, f, f.a + .2, f.b - .2, 2, 12, sh('#3E5F78', f.s)); fr(e, f, f.a + .2, f.b - .2, 2, 12, '#FFE3A8'); fr(g, f, f.a, f.b, 14, 16, sh('#8C7B5E', f.s)); }
  const zt = tower(g, e, 57, 13, 63, 26, 30, 22, '#D6C9AE', '#5E88A8', 9);
  box(g, 58, 15, 62, 24, zt, zt + 12, '#C9BA9A');
  signOn(g, e, { w: 0, k: 26, a: 57, b: 63 }, zt - 20, signTex(null, 'SULE SHANGRI-LA', '#2B3A4A', '#F2E3B3'));
  signOn(g, e, { w: 1, k: 57, a: 13, b: 26 }, zt - 22, signTex('ဆူးလေ ရှန်ဂရီလာ', null, '#2B3A4A', '#F2E3B3'));
}

function sakura() {
  const [x0, y0, x1, y1] = LM.sakura, s = spr(x0, y0, x1, y1, 210), g = s.g, e = glow(s);
  const zt = tower(g, e, x0, y0, x1, y1, 0, 20, '#DDE0E2', '#3F8FA6', 8);
  box(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, zt, zt + 10, '#C8CDD1');
  lathe(g, x0 + 4, y0 + 4, zt + 10, 14, t => .15 * (1 - t / 14) + .03, WHITE, '#FFFFFF');
  signOn(g, e, { w: 0, k: y1, a: x0, b: x1 }, zt - 22, signTex('ဆာကူရာ တာဝါ', 'SAKURA TOWER', '#F4F6F7', '#C2185B'));
}

const POSTERS = ['ချစ်သူ', 'မိုး', 'ရွှေ', 'ည', 'သူရဲကောင်း', 'ကြယ်'];
function poster(i) {
  const c = mk(22, 30), g = c.getContext('2d'), bg = ['#1A237E', '#B71C1C', '#004D40', '#4A148C', '#E65100', '#263238'][i % 6];
  g.fillStyle = bg; g.fillRect(0, 0, 22, 30); g.fillStyle = sh(bg, 1.5); g.fillRect(0, 0, 22, 9);
  g.fillStyle = '#1B1512'; g.fillRect(7, 5, 8, 4); g.fillStyle = pick(['#D9A46C', '#C98E5C']); g.fillRect(7, 8, 8, 8);
  g.fillStyle = '#1B1512'; g.fillRect(9, 11, 1, 1); g.fillRect(12, 11, 1, 1); g.fillStyle = pick(GOODS); g.fillRect(6, 16, 10, 5);
  g.fillStyle = '#FFF'; for (let k = 0; k < 4; k++) g.fillRect(ri(1, 20), ri(1, 4), 1, 1);
  const t = myText(POSTERS[i % POSTERS.length], 9, '#FFE14D', true); g.drawImage(t, (22 - t.width) >> 1, 29 - t.height);
  return c;
}
function cinema([x0, y0, x1, y1], my, en, col) {
  const s = spr(x0, y0, x1, y1, 100), g = s.g, e = glow(s);
  box(g, x0, y0, x1, y1, 0, 82, col, '#A69E91');
  const [wf, sf] = faces(x0, y0, x1, y1);
  fr(g, wf, y0 + .5, y1 - .5, 0, 11, '#2B2320'); fr(e, wf, y0 + .5, y1 - .5, 0, 11, '#FFE0A0');
  for (let u = y0 + .75; u < y1 - .5; u += .5) { fr(g, wf, u, u + 1 / 12, 0, 11, '#C9A13A'); fr(e, wf, u, u + 1 / 12, 9, 11, '#FFF6D0'); }
  fr(g, wf, y0, y1, 11, 14, '#C62828'); for (let u = y0; u < y1; u += 2 / 12) fr(e, wf, u, u + 1 / 12, 12, 13, '#FFF3B0');   // marquee bulbs
  const t = signTex(my, en, '#1B1B1B', '#FFD54F', 15, 1, true); signOn(g, e, wf, 15, t);
  for (let i = 0; i < 3; i++) { const p = poster(ri(0, 5)); const u = q12(y0 + .5 + i * ((y1 - y0 - 1) / 3)); fimg(g, wf, u, 16 + t.height + 2, p); fimg(e, wf, u, 16 + t.height + 2, p); }
  for (const z of [14, 30, 46, 62]) arches(g, e, sf, z, 11, '#F4EEE0', '#34404E');
  for (const f of [wf, sf]) fr(g, f, f.a, f.b, 80, 82, sh('#C62828', f.s));
}

function church() {
  const [x0, y0, x1, y1] = LM.church, s = spr(x0, y0, x1, y1, 120), g = s.g, e = glow(s);
  const B = '#A04E3C', W = '#F2EADB';
  box(g, x0, y0, x1, y1, 0, 30, B);
  for (const f of faces(x0, y0, x1, y1)) {
    for (let u = f.a + .5; u < f.b - .4; u++) { fr(g, f, u + 3 / 12, u + 7 / 12, 6, 24, sh(W, f.s)); fr(g, f, u + 4 / 12, u + 6 / 12, 7, 22, sh('#3A3F66', f.s)); if (chance(.6)) fr(e, f, u + 4 / 12, u + 6 / 12, 7, 22, '#FFD27A'); }
    fr(g, f, f.a, f.b, 28, 30, sh(W, f.s));
  }
  for (let k = 0; k < 4; k++) box(g, x0 + k * .75, y0, x1 - k * .75, y1, 30 + k * 3, 33 + k * 3, '#5B4B47', '#6F5C57');
  const [a, b, c, d] = [x0, y0, x0 + 2.5, y0 + 2.5];
  box(g, a, b, c, d, 30, 58, B);
  for (const f of faces(a, b, c, d)) { fr(g, f, f.a + .75, f.b - .75, 46, 54, sh('#2A2A2A', f.s)); fr(g, f, f.a, f.b, 56, 58, sh(W, f.s)); }
  for (let i = 0; i < 6; i++) { const r = q12(1.25 - i * .2); box(g, a + 1.25 - r, b + 1.25 - r, a + 1.25 + r, b + 1.25 + r, 58 + i * 6, 64 + i * 6, '#6E6A70'); }
  g.fillStyle = '#FFFFFF'; const X = sx(a + 1.25, b + 1.25), Y = sy(a + 1.25, b + 1.25, 94);
  g.fillRect(X, Y - 8, 1, 8); g.fillRect(X - 2, Y - 6, 5, 1);
  signOn(g, e, { w: 1, k: x0, a: y0 + 3, b: y1 }, 26, signTex(null, 'IMMANUEL', W, '#6B2A1F'));
}

function court() {
  const [x0, y0, x1, y1] = LM.court, s = spr(x0, y0, x1, y1, 130), g = s.g, e = glow(s);
  const B = '#A5452F', W = '#EFE6D6';
  box(g, x0, y0, x1, y1, 0, 40, B, '#9A8E82');
  for (const f of faces(x0, y0, x1, y1)) {
    for (const z of [0, 14, 28]) { arches(g, e, f, z, 11, W, '#2C2A30', .3); fr(g, f, f.a, f.b, z + 12, z + 14, sh(W, f.s)); }
    for (let u = f.a; u < f.b; u += 2 / 12) fr(g, f, u, u + 1 / 12, 40, 43, sh(W, f.s));
  }
  // clock tower on the park side
  const [a, b, c, d] = [103, 108, 106.5, 111.5];
  box(g, a, b, c, d, 40, 92, B);
  for (const f of faces(a, b, c, d)) {
    for (const z of [54, 68, 88]) fr(g, f, f.a, f.b, z, z + 2, sh(W, f.s));
    fr(g, f, f.a + 1.25 - 4 / 12, f.a + 1.25 + 4 / 12, 72, 80, sh('#FFFFFF', f.s)); fr(e, f, f.a + 1.25 - 4 / 12, f.a + 1.25 + 4 / 12, 72, 80, '#FFFBE8');
    fr(g, f, f.a + 1.25, f.a + 1.25 + 1 / 12, 76, 79, '#222'); fr(g, f, f.a + 1.25, f.a + 1.25 + 3 / 12, 76, 77, '#222');
    fr(g, f, f.a + .5, f.b - .5, 58, 66, sh('#2C2A30', f.s));
  }
  for (let i = 0; i < 5; i++) { const r = q12(1.9 - i * .38); box(g, a + 1.75 - r, b + 1.75 - r, a + 1.75 + r, b + 1.75 + r, 92 + i * 4, 96 + i * 4, '#5A4B45'); }
  lathe(g, a + 1.75, b + 1.75, 112, 10, t => .12, GOLD, GOLD[0]);
  lathe(g, x0 + 1, y1 - 1, 40, 14, t => 1 * Math.cos(t / 14 * Math.PI / 2) + .05, ['#8FB0A0', '#739888', '#5E8272', '#4B6C5E', '#3B574B', '#2E463C'], '#A9C8B8');
  signOn(g, e, { w: 1, k: x0, a: 112, b: 120 }, 13, signTex('တရားလွှတ်တော်', 'HIGH COURT', W, '#6B2A1F'));
}

function temple() {
  const [x0, y0, x1, y1] = LM.temple, s = spr(x0, y0, x1, y1, 90), g = s.g;
  box(g, x0, y0, x1, y1, 0, 14, '#F4F0E6');
  for (const f of faces(x0, y0, x1, y1)) arches(g, glow(s), f, 0, 11, '#E75A7C', '#3B2A2A', .5);
  const cols = ['#E75A7C', '#4FA3D9', '#F2C230', '#5DBB63', '#F28C38', '#B06FD1'];
  for (let i = 0; i < 6; i++) box(g, x0 + .25 * i, y0 + .5 + .25 * i, x0 + 2.5 - .25 * i, y1 - .5 - .25 * i, 14 + 7 * i, 21 + 7 * i, cols[i]);
  lathe(g, x0 + 1.25, (y0 + y1) / 2, 56, 8, t => .25 * (1 - t / 8) + .03, GOLD, GOLD[0]);
}

function jetty() {
  const s = spr(120, 155, 131, 164, 50, 8), g = s.g, e = glow(s);
  for (let x = 120.5; x < 131; x += 2) for (const y of [155.5, 163.5]) { g.fillStyle = '#4A3726'; g.fillRect(sx(x, y), sy(x, y, -8), 2, 6); }
  box(g, 120, 155, 131, 164, -3, -1, '#7A5C3E', '#9C7A55');
  box(g, 122, 156, 129, 161, -1, 14, '#E5E1D6', '#3F7F6A');
  for (let k = 1; k < 3; k++) box(g, 122 + k, 156, 129 - k, 161, 14 + (k - 1) * 3, 17 + (k - 1) * 3, '#3F7F6A', '#4F9A80');
  for (const f of faces(122, 156, 129, 161)) { fr(g, f, f.a + .5, f.b - .5, 1, 9, sh('#39424A', f.s)); fr(e, f, f.a + .5, f.b - .5, 1, 9, '#FFE7B0'); }
  signOn(g, e, { w: 1, k: 122, a: 156, b: 161 }, 5, signTex('ပန်းဆိုးတန်းဆိပ်', 'PANSODAN JETTY', '#0D47A1', '#FFFFFF'));
}

function monument() {                                     // Independence Monument
  const s = spr(81, 104, 88, 111, 130), g = s.g, e = glow(s);
  box(g, 81, 104, 88, 111, 1, 4, '#E9E4D8'); box(g, 82, 105, 87, 110, 4, 8, '#F1ECE1');
  for (const [x, y] of [[82, 105], [86, 105], [82, 109], [86, 109]]) { box(g, x, y, x + 1, y + 1, 8, 14, '#E2DCCD'); }
  box(g, 83.75, 106.75, 85.25, 108.25, 8, 18, '#F4F0E6');
  box(g, 84.25, 107.25, 84.75, 107.75, 18, 104, '#F7F4EC'); box(g, 84.33, 107.33, 84.67, 107.67, 104, 110, '#F7F4EC');
  box(e, 84.25, 107.25, 84.75, 107.75, 18, 104, '#FFFBEF');
}

// ── props ────────────────────────────────────────────────────────────────────
const used = new Set();
const free1 = (x, y) => { const k = (x | 0) + ',' + (y | 0); if (used.has(k)) return false; used.add(k); return true; };
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
function lamp(x, y) {
  const s = spr(x - .1, y - .1, x + .1, y + .1, 30, 16), g = s.g, e = glow(s), X = sx(x, y), Y = sy(x, y, 1);
  g.fillStyle = '#4A4F55'; g.fillRect(X, Y - 24, 1, 24); g.fillRect(X - 3, Y - 24, 4, 1); g.fillStyle = '#E8E8E8'; g.fillRect(X - 4, Y - 24, 2, 2);
  e.fillStyle = '#FFF1B8'; e.fillRect(X - 4, Y - 24, 3, 2);
  e.fillStyle = 'rgba(255,205,120,.22)';
  for (let dy = -6; dy <= 6; dy++) { const w = Math.round(13 * Math.sqrt(1 - (dy / 7) ** 2)); e.fillRect(X - 3 - w, Y + dy, 2 * w, 1); }
}
function stall(x, y) {
  const s = spr(x + .15, y + .15, x + .85, y + .85, 30, 8), g = s.g, e = glow(s);
  box(g, x + .2, y + .2, x + .8, y + .8, 0, 7, pick(['#8B5A2B', '#2F6FD0', '#C84B3A', '#3D8C5A']));
  for (let k = 0; k < 5; k++) { const u = x + .25 + rnd() * .5, v = y + .25 + rnd() * .5; g.fillStyle = pick(GOODS); g.fillRect(sx(u, v), sy(u, v, 8), 2, 1); }
  const X = sx(x + .5, y + .5), Y = sy(x + .5, y + .5); g.fillStyle = '#333'; g.fillRect(X, Y - 17, 1, 10);
  lathe(g, x + .5, y + .5, 16, 2, t => .6 - t * .15, [pick(['#E53935', '#1E88E5', '#FDD835', '#F5F5F5', '#43A047'])].concat(['#D8D8D8', '#BDBDBD']), '#F0F0F0');
  e.fillStyle = '#FFE7A0'; e.fillRect(X - 1, Y - 14, 3, 2);
  g.drawImage(person(pickKind()).f[0][0], X + 6, Y - 13);
}
function teaShop(x, y, door) {          // tables go out on two sidewalk tiles; the people are vignettes (see teaVig)
  door = door || (at(x + 1, y) === LOT ? 'E' : 'N');
  const [x2, y2] = door === 'E' ? [x, y + 1] : [x + 1, y];
  if (at(x2, y2) === WALK && seen(x + .5, y + .5) && free1(x2, y2)) teaVig(x, y, door);
}
const benches = [];
function bench(x, y) { benches.push([x + .4, y + .45]); const s = spr(x, y + .3, x + .8, y + .6, 10, 3), g = s.g; box(g, x, y + .3, x + .8, y + .6, 2, 4, '#7A5C3E'); g.fillStyle = '#4A3726'; g.fillRect(sx(x + .1, y + .6), sy(x + .1, y + .6) - 2, 1, 2); }
function busStop(x, y, alongX, name = 'ဘတ်စ်ကား', roadWest = false) {
  const [a, b, c, d] = alongX ? [x, y + .3, x + 2, y + .8] : [x + .2, y, x + .7, y + 2], s = spr(a, b, c, d, 46, 4), g = s.g, e = glow(s);
  g.fillStyle = '#555';
  for (const [u, v] of [[a, d], [c, d], [a, b], [c, b]]) g.fillRect(sx(u, v), sy(u, v, 1) - 16, 1, 16);
  box(g, a, b, c, d, 16, 18, '#2F6FD0', '#4A86E0');
  box(g, a + .2, b + .1, c - .2, d - .1, 3, 5, '#9A9A9A');
  const t = signTex(name, 'YBS', '#FFD600', '#0D47A1', 10), f = alongX ? { w: 0, k: d, a, b: c } : { w: 1, k: a, a: b, b: d };
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

// the footbridge over Sule Pagoda Rd and Anawrahta Rd, just south of the cinemas (OSM: footway bridge + steps)
const FB = 25;                                                   // deck height, px
function footbridge() {
  for (const [x, y] of [[64, 38], [64, 39], [64, 40], [64, 41], [64, 42], [69, 31], [69, 32], [69, 42], [69, 43], [69, 48], [69, 49], [69, 50], [69, 51], [69, 52], [69, 53]]) used.add(x + ',' + y);
  const deck = (x0, y0, x1, y1, alongX) => {                     // a slab in the air: always drawn over what's under / behind it
    const s = spr(x0, y0, x1, y1, FB + 8, 2), g = s.g; s.above = true;
    box(g, x0, y0, x1, y1, FB, FB + 3, '#B8B2A6', '#A39D91');
    const r = 1 / 12;
    if (alongX) { box(g, x0, y0, x1, y0 + r, FB + 3, FB + 7, '#D6D1C6'); box(g, x0, y1 - r, x1, y1, FB + 3, FB + 7, '#D6D1C6'); }
    else { box(g, x1 - r, y0, x1, y1, FB + 3, FB + 7, '#D6D1C6'); box(g, x0, y0, x0 + r, y1, FB + 3, FB + 7, '#D6D1C6'); }
  };
  const pillar = (x, y) => { const s = spr(x - .08, y - .08, x + .08, y + .08, FB + 2, 2); box(s.g, x - .08, y - .08, x + .08, y + .08, 0, FB, '#ABA59A'); };
  const stairs = (x0, x1, yTop, dir) => {                         // steps down along the sidewalk, dir = -1 north / +1 south
    const n = 12, d = 1 / 3, y0 = dir < 0 ? yTop - n * d : yTop, y1 = dir < 0 ? yTop : yTop + n * d, s = spr(x0, y0, x1, y1, FB + 6, 2), g = s.g;
    const order = [...Array(n).keys()]; if (dir < 0) order.reverse();   // far steps first
    for (const i of order) {
      const a = dir < 0 ? yTop - (i + 1) * d : yTop + i * d, z = Math.round(FB + 3 - (i + 1) * (FB + 2) / n);
      box(g, x0, a, x1, a + d, 0, Math.max(1, z), '#BDB7AB', '#D2CDC2');
    }
  };
  stairs(64.2, 64.8, 42.2, -1);
  for (const [x, y] of [[64.5, 42.5], [69.5, 43.5], [69.5, 48.5]]) pillar(x, y);
  deck(64.2, 42.2, 69.8, 42.8, true);                            // across Sule Pagoda Rd
  deck(69.2, 42.8, 69.8, 49.2, false);                           // across Anawrahta Rd
  stairs(69.2, 69.8, 49.2, 1);
}
function bridgeWalkers() {                                         // a few people crossing slowly, over the traffic
  const path = [[64.5, 42.5], [69.5, 42.5], [69.5, 49.1]], len = 5 + 6.6;
  for (let i = 0; i < 3; i++) {
    const L = look(), sp = .3 + V() * .1, rest = 3 + V() * 4, P = 2 * (len / sp + rest), ph = V() * P;
    const pics = [standing(L, 'walk1', false), standing(L, 'walk2', false), standing(L, 'walk1', true), standing(L, 'walk2', true)];
    vig(64.5, 42.5, pics, { z: FB + 3, win: jit([420, 1260], 90), tick: e => {
      const t = (T + ph) % P, go = len / sp, out = t < go, back = t >= go + rest && t < 2 * go + rest;
      let d = out ? t * sp : back ? len - (t - go - rest) * sp : t < go + rest ? len : 0;
      const seg = d < 5 ? 0 : 1, u = seg ? (d - 5) / 6.6 : d / 5, [ax, ay] = path[seg], [bx, by] = path[seg + 1];
      e.x = ax + (bx - ax) * u; e.y = ay + (by - ay) * u;
      const moving = out || back, toward = back ? seg === 0 : seg === 1;   // going west or south = towards us
      e.cur = pics[(toward ? 0 : 2) + (moving ? Math.floor(T * 3 + ph) % 2 : 0)];
    } });
  }
}
function railing(x0, x1) {
  const s = spr(x0, 154.85, x1, 155, 8, 2), g = s.g;
  sF(g, 155, x0, x1, 4, 5, '#EDEDE6'); sF(g, 155, x0, x1, 2, 3, '#CFCFC6');
  for (let x = x0; x < x1; x += .5) { const c = sx(x, 155); g.fillStyle = '#BDBDB5'; g.fillRect(c, bs(c, 155) - 5, 1, 5); }
}
function parked(x, y, dir, type = pick(['car', 'car', 'taxi'])) {
  const v = vehicle(type, dir, type === 'fire' ? '#C62828' : pick(CARC)), s = { ...v.bb(x, y), cv: v.cv, ecv: null };
  sprites.push(s);
}

// ── people & vehicles (pixel sprites) ────────────────────────────────────────
const SKIN = ['#C98E5C', '#B77945', '#D9A46C', '#A66A3A', '#E0B07C'];
const SHIRT = ['#F2F2F2', '#FFFFFF', '#E8E1CF', '#6FA8DC', '#E06666', '#93C47D', '#FFD966', '#8E7CC3', '#F6B26B', '#76A5AF', '#2B2B2B'];
const LONGYI = ['#2E4A7D', '#4B2E6B', '#1F5E47', '#6E2B2B', '#3A3A3A', '#5C4630', '#29506E'];
const HTAMEIN = ['#C2185B', '#E65100', '#6A1B9A', '#00897B', '#AD1457', '#F9A825', '#1565C0'];
const pickKind = () => pick(['man', 'man', 'woman', 'woman', 'man', 'woman', 'monk']);
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
function sitter() {
  const c = mk(5, 9), g = c.getContext('2d'), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const skin = pick(SKIN); P(1, 0, 3, 1, '#1B1512'); P(1, 1, 3, 2, skin); P(1, 3, 3, 3, pick(SHIRT)); P(0, 4, 1, 1, skin); P(4, 4, 1, 1, skin);
  P(1, 6, 3, 2, pick(LONGYI)); P(1, 8, 1, 1, skin); P(3, 8, 1, 1, skin);
  return c;
}
const CARC = ['#F2F2EE', '#C9CDD2', '#D23B3B', '#2F5FB3', '#2B2B2E', '#E8C547', '#3D8C5A', '#8A8F96'];
const BUSC = ['#E23B3B', '#2F6FD0', '#F2B632', '#29A37A', '#7B4FC2'];
const VDIM = { car: [7, 4], taxi: [7, 4], bus: [15, 5], pickup: [8, 4], trishaw: [4, 4], fire: [12, 5], sampan: [9, 3], ferry: [26, 7] };
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

// ── build everything ─────────────────────────────────────────────────────────
function blocks() {
  const seen = new Uint8Array(MW * MH), out = [];
  for (let i = 0; i < MW * MH; i++) {
    if (seen[i] || G[i] !== 0) continue;
    let x0 = MW, y0 = MH, x1 = 0, y1 = 0; const st = [i]; seen[i] = 1;
    while (st.length) {
      const j = st.pop(), x = j % MW, y = (j / MW) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const k of [j - 1, j + 1, j - MW, j + MW]) if (k >= 0 && k < MW * MH && !seen[k] && G[k] === 0 && Math.abs(k % MW - x) <= 1) { seen[k] = 1; st.push(k); }
    }
    out.push([x0, y0, x1 + 1, y1 + 1]);
  }
  return out;
}
const isFree = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (at(x, y) !== 0) return false; return true; };
const nearMain = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && MAIN[(y | 0) * MW + (x | 0)] === 1;
function building(x0, y0, x1, y1) {
  const mx = (x0 + x1) >> 1, my = (y0 + y1) >> 1;
  const stW = at(x0 - 1, my) === WALK, stS = at(mx, y1) === WALK;
  const main = nearMain(x0 - 2, my) || nearMain(mx, y1 + 1) || nearMain(x1 + 1, my) || nearMain(mx, y0 - 2);
  if (x0 >= 119 || (y0 >= 131 && x0 >= 69)) {
    const f = stW ? faces(x0, y0, x1, y1)[0] : stS ? faces(x0, y0, x1, y1)[1] : null;
    let sg = null;
    if (f && chance(.4)) { const [t] = shopSign((f.b - f.a) * 12 - 2, f); if (t) sg = { f: f.w ? 'w' : 's', t }; }
    return colonial(x0, y0, x1, y1, ri(3, 4), undefined, sg, stW, stS);
  }
  let fl = ri(2, 5) + (main ? ri(1, 2) : 0);
  if (main && chance(.05)) fl = ri(9, 12);
  if (x0 >= 56 && x1 <= 64 && y0 >= 26 && y1 <= 44) fl = ri(2, 3);   // opposite the cinemas
  if (x0 >= 56 && x1 <= 82 && y0 >= 48 && y1 <= 60) fl = Math.min(fl, 3);   // keep the footbridge in view
  return shop(x0, y0, x1, y1, fl, stW, stS, main);
}
function lots() {
  for (const [x0, y0, x1, y1] of blocks()) {
    const W = x1 - x0, rows = W >= 6 ? [[x0, x0 + (W >> 1)], [x0 + (W >> 1), x1]] : [[x0, x1]];
    for (const [a, b] of rows) for (let y = y0; y < y1;) {
      let len = Math.min(ri(2, 4), y1 - y); if (y1 - y - len === 1) len++;
      if (isFree(a, y, b, y + len)) { fill(a, y, b, y + len, LOT); building(a, y, b, y + len); }
      y += len;
    }
  }
  fill(0, 0, MW, MH, PLAZA, 0);
}
function props() {
  footbridge();
  for (let y = 91; y < 100; y++) for (let x = 88; x < 97; x++) used.add(x + ',' + y);   // an open lawn for the morning exercise group
  for (let n = 0; n < 90; n++) {                         // park trees
    const x = 70.5 + rnd() * 27, y = 89.5 + rnd() * 35;
    if ([at(x | 0, y | 0), at((x - 1) | 0, y | 0), at((x + 1) | 0, y | 0), at(x | 0, (y - 1) | 0), at(x | 0, (y + 1) | 0)].every(t => t === GRASS) && free1(x, y)) tree(q12(x), q12(y), 1.1 + rnd() * .7);
  }
  for (let x = 2; x < MW - 1; x += 5) if (x < 117 || x > 133) tree(x + .5, 153.5, 1 + rnd() * .4);
  for (let x = 4.5; x < MW - 1; x += 5) if (x < 117 || x > 133) lamp(x, 154.4);
  for (const [x, y] of [[74.5, 88.5], [80.5, 88.5], [88.5, 88.5], [94.5, 88.5], [71.5, 83.5], [73.5, 70.5], [72, 76]]) tree(x, y, 1);
  for (let x = 0; x < 120; x += 12) railing(x, Math.min(x + 12, 119));
  for (const [y0, y1, x0, x1, m] of EW) if (m) for (let x = x0 + 3; x < x1; x += 8) for (const y of [y0 - 1, y1]) if (at(x, y) === WALK && rbd(x, y) > 10 && free1(x, y)) lamp(x + .5, y + .5);
  for (const [x0, x1, y0, y1, m] of NS) if (m) for (let y = y0 + 3; y < y1; y += 8) for (const x of [x0 - 1, x1]) if (at(x, y) === WALK && rbd(x, y) > 10 && free1(x, y)) lamp(x + .5, y + .5);
  for (let a = 0; a < 6.28; a += .785) { const x = CX + 9 * Math.cos(a), y = CY + 9 * Math.sin(a); if (free1(x, y)) lamp(x, y); }
  for (const [x, y, door] of teaSpots) if (at(x, y) === WALK && free1(x, y)) teaShop(x, y, door);
  const cand = [];                                        // sidewalks in front of shops that the camera can actually see
  for (const [y0, , x0, x1] of EW) for (let x = x0; x < x1; x++) if (at(x, y0 - 1) === WALK && at(x, y0 - 2) === LOT) cand.push([x, y0 - 1, 'N']);
  for (const [, x1, y0, y1] of NS) for (let y = y0; y < y1; y++) if (at(x1, y) === WALK && at(x1 + 1, y) === LOT) cand.push([x1, y, 'E']);
  const teas = [];
  for (let n = 0; n < 4000 && teas.length < 34; n++) {
    const [x, y, door] = V.pick(cand);
    if (rbd(x, y) < 11 || teas.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 9) || !seen(x + .5, y + .5) || !free1(x, y)) continue;
    teas.push([x, y]); teaShop(x, y, door);
  }
  for (let n = 0; n < 400; n++) {                         // street stalls, busiest near Sule
    const x = ri(0, MW - 1), y = ri(0, 151), d = Math.hypot(x - CX, y - CY);
    if (at(x, y) === WALK && d > 10 && rnd() < 40 / (d + 20) && free1(x, y)) (chance(.3) ? teaShop : stall)(x, y);
  }
  for (let y = 49; y < 126; y++) if (at(130, y) === WALK && at(131, y) === LOT && free1(130, y)) bookSpot(130, y);   // Pansodan booksellers (east sidewalk: the west one is hidden from this camera)
  for (const [x, y, ax] of [[28, 83, 1], [110, 83, 1], [40, 43, 1], [64, 58, 0], [64, 112, 0]]) if (free1(x, y)) busStop(x, y, ax);
  busStop(69, 31, 0, 'ဆူးလေ ရုပ်ရှင်ရုံ', true);               // the YBS stop by the cinemas (OSM), between the two of them
  for (let n = 0; n < 12; n++) { const x = 70.5 + rnd() * 27, y = 106.2; if (at(x | 0, 106) === GRASS) bench(q12(x), 106); }
  const quiet = [];                                       // chinlone: quiet streets without through traffic
  for (const [x0, x1, y0, y1] of NS) if (x1 - x0 === 2 && y1 < 148) for (let y = y0 + 3; y < y1 - 3; y++) quiet.push([x0 + 1, y + .5]);
  for (const [y0, y1, x0, x1, m] of EW) if (!m) for (let x = x0 + 3; x < x1 - 3; x++) quiet.push([x + .5, y0 + 1]);
  const courts = [];
  for (let n = 0; n < 3000 && courts.length < 2; n++) {
    const [x, y] = V.pick(quiet);
    if (!seen(x, y, 14) || courts.some(([a, b]) => Math.hypot(a - x, b - y) < 30) || rbd(x, y) < 12) continue;
    courts.push([x, y]); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) used.add(((x + dx) | 0) + ',' + ((y + dy) | 0));
    chinlone(x, y);
  }
  wiring();
  parked(54.3, 58, 'N', 'fire');
  for (const [x0, x1, y0, y1] of NS) if (x1 - x0 === 2) for (let y = y0 + 2; y < y1 - 1; y += 1.5) {
    if (at(x0 - 1, y | 0) === WALK && at(x0 - 1, (y + 1) | 0) === WALK && chance(.35) && free1(x0, y)) parked(x0 + .4, y + .5, chance(.5) ? 'N' : 'S');
  }
  const f = vehicle('ferry', 'N', '#F2F2EE'); sprites.push({ ...f.bb(132.6, 159.5), cv: f.cv, ecv: f.ecv });
}

// painter's order: a is in front of b if it lies wholly west or wholly south of it
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

// ── moving things ────────────────────────────────────────────────────────────
const ents = [], birds = [], crows = [], sparkles = [];
const R6 = 6.75, rad = Math.PI / 180;
const arc = (a0, a1) => { const p = [], n = Math.ceil((a1 - a0) / 12); for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * rad; p.push([CX + R6 * Math.cos(a), CY - R6 * Math.sin(a)]); } return p; };
function lane(pts, sp, minor) {
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = { pts, cum, len: cum[cum.length - 1], sp };
  const n = Math.max(1, Math.round(L.len / (minor ? 18 : 11)));
  for (let i = 0; i < n; i++) {
    const t = pick(minor ? ['car', 'taxi', 'trishaw', 'trishaw', 'car'] : ['car', 'car', 'car', 'taxi', 'taxi', 'bus', 'pickup']);
    const col = t === 'taxi' ? pick(['#F2F2EE', '#E9E9E4', '#F2F2EE', '#D23B3B']) : t === 'bus' ? pick(BUSC) : pick(CARC);
    const spr4 = {}; for (const d of 'EWSN') spr4[d] = vehicle(t, d, col);
    ents.push({ k: 'veh', L, s: (i + rnd() * .5) / n * L.len, spr: spr4, r: rnd(), x: 0, y: 0, d: 'E' });
  }
}
function lanePos(L, s) {
  let i = 1; while (i < L.cum.length - 1 && L.cum[i] < s) i++;
  const a = L.pts[i - 1], b = L.pts[i], t = (s - L.cum[i - 1]) / ((L.cum[i] - L.cum[i - 1]) || 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[0] - a[0], b[1] - a[1]];
}
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'));
const WALKABLE = new Set([WALK, PROM, PATH, PLAZA, ROAD, ISLE]);
const linePt = (l, s) => (l.ring ? [CX + 9.1 * Math.cos(s / 9.1), CY + 9.1 * Math.sin(s / 9.1)] : [l.ax + (l.bx - l.ax) * s / l.len, l.ay + (l.by - l.ay) * s / l.len]);
const okPt = (l, x, y) => WALKABLE.has(at(x | 0, y | 0)) && (l.ring || Math.hypot(x - CX, y - CY) > 9.3);
function walkers(ax, ay, bx, by, per = 14) {
  const l = { ax, ay, bx, by, len: Math.hypot(bx - ax, by - ay) };
  for (let n = Math.round(l.len / per); n > 0; n--) addWalker(l, pickKind());
  return l;
}
function addWalker(l, kind, s, bowl) {
  for (let i = 0; i < 12 && s === undefined; i++) { const t = rnd() * l.len, [x, y] = linePt(l, t); if (okPt(l, x, y)) s = t; }
  if (s === undefined) return;
  const [x, y] = linePt(l, s);
  ents.push({ k: 'ped', l, s, dir: chance(.5) ? 1 : -1, sp: .28 + rnd() * .25, pause: 0, spr: person(kind, bowl), r: rnd(), ph: rnd() * 2, x, y });
}
function populate() {
  for (const [y0, y1, x0, x1, m] of EW) {
    if (y0 === 84) { lane([[MW + 1, 85], ...arc(8.5, 171.5), [-1, 85]], 2.2); lane([[-1, 87], ...arc(188.5, 351.5), [MW + 1, 87]], 2.2); }
    else if (m) { lane([[x1 + 1, y0 + 1], [x0 - 1, y0 + 1]], 2.2); lane([[x0 - 1, y0 + 3], [x1 + 1, y0 + 3]], 2.2); }
    walkers(x0, y0 - .5, x1, y0 - .5); walkers(x0, y1 + .5, x1, y1 + .5);
  }
  let alt = 0;
  for (const [x0, x1, y0, y1, m] of NS) {
    if (x0 === 65) { lane([[66, -1], ...arc(98.5, 261.5), [66, 149], [-1, 149]], 2.2); lane([[-1, 151], [68, 151], ...arc(278.5, 441.5), [68, -1]], 2.2); }
    else if (m) { lane([[x0 + 1, -1], [x0 + 1, 149], [-1, 149]], 2.2); lane([[-1, 151], [x0 + 3, 151], [x0 + 3, -1]], 2.2); }
    else if (y1 >= 148) { const x = x0 + 1; lane(alt++ % 2 ? [[-1, 151], [x, 151], [x, -1]] : [[x, -1], [x, 149], [-1, 149]], 1.1, true); }
    walkers(x0 - .5, y0, x0 - .5, y1); walkers(x1 + (x0 === 126 ? .2 : .5), y0, x1 + (x0 === 126 ? .2 : .5), y1);   // Pansodan: keep off the books
  }
  walkers(84.5, 89, 84.5, 117, 6); walkers(70, 107.5, 99, 107.5, 6); walkers(0, 153.5, 120, 153.5, 7);
  const ring = { ring: 1, len: 2 * Math.PI * 9.1 };
  for (let i = 0; i < 16; i++) addWalker(ring, pickKind());
  const mline = { ax: 76.5, ay: 88.5, bx: 98, by: 88.5, len: 21.5 };      // morning alms round along the park
  for (let i = 0; i < 8; i++) { addWalker(mline, 'monk', 2 + i * .9, true); const m = ents[ents.length - 1]; m.dir = 1; m.sp = .4; m.alms = 1; m.win = [330, 570]; }
  for (let i = 0; i < 40; i++) {                                           // pigeons
    const [x, y] = i < 25 ? [80 + rnd() * 9, 103 + rnd() * 9] : [CX + 9 * Math.cos(i), CY + 9 * Math.sin(i)];
    if (WALKABLE.has(at(x | 0, y | 0))) ents.push({ k: 'pig', x, y, hx: x, hy: y, t: rnd() * 2, r: rnd() });
  }
  for (let i = 0; i < 26; i++) birds.push({ a: rnd() * 6.28, r: 5 + rnd() * 6, z: 50 + rnd() * 70, w: (.25 + rnd() * .3) * (i % 3 ? 1 : -1) });
  for (let i = 0; i < 7; i++) crows.push({ x: rnd() * MW, y: rnd() * 150, vx: .8 + rnd(), vy: (rnd() - .5) * .6, z: 90 + rnd() * 50 });
  for (const [y, n] of [[160, 2], [165.5, 1], [170, 3]]) for (let i = 0; i < n; i++) {
    const big = y === 165.5, dir = i % 2 ? 'E' : 'W', col = '#F2F2EE';
    ents.push({ k: 'boat', y, x: rnd() * MW, v: (big ? .5 : .3 + rnd() * .3) * (dir === 'E' ? 1 : -1), spr: vehicle(big ? 'ferry' : 'sampan', dir, col), r: 0 });
  }
  for (let i = 0; i < 260; i++) { const x = rnd() * MW, y = 155.5 + rnd() * 20; sparkles.push([x, y, rnd() * 6.28]); }
}

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
    else { down(1); down(5); }
    const leg = (x, y0) => { P(x, y0, 1, 14 - y0, L.skin); P(x, 14, 1, 1, SHOE); }, top = 9 + low;
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

// tea shop: low tables and tiny plastic stools on the sidewalk, regulars, and the boy who brings the tea
const STOOLS = ['#D84040', '#3F7FD0', '#D84040', '#2E9E6A'];
const teaTable = top => thing(-.1667, -.1667, .1667, .1667, 12, 3, g => {
  box(g, -.1667, -.1667, .1667, .1667, 1, 5, top[0], top[1]);
  g.fillStyle = '#FFFFFF'; g.fillRect(sx(-.04, .02) - 1, sy(-.04, .02, 6), 1, 1); g.fillRect(sx(.05, -.03), sy(.05, -.03, 6), 1, 1);
  g.fillStyle = '#6D4C41'; g.fillRect(sx(0, 0) - 1, sy(0, 0, 7), 2, 2);
});
const stool = c => thing(-.0625, -.0625, .0625, .0625, 6, 2, g => box(g, -.0625, -.0625, .0625, .0625, 1, 4, c));
const teaWin = () => jit(V.pick([[330, 600], [345, 560], [960, 1300], [1000, 1320], [420, 1260], [600, 1000]]), 40);
function drinker(x, y, back) {
  const L = look(), habit = V.pick(['sip', 'sip', 'paper', 'talk']);
  const poses = habit === 'paper' ? ['paper', 'paper2'] : habit === 'talk' ? ['sit', 'talk', 'sip'] : ['sit', 'sip'];
  const seq = habit === 'paper' ? [[0, 3 + V() * 3], [1, .6 + V() * .5]]
    : habit === 'talk' ? [[0, 1.5 + V() * 2], [1, 1 + V()], [0, 1 + V() * 2], [1, .8 + V() * .6], [0, 2 + V() * 2], [2, 1.3]]
    : [[0, 2.5 + V() * 3], [1, 1.2 + V() * .8]];
  vig(x, y, poses.map(p => seated(L, p, back)), { seq, win: teaWin() });
}
function teaVig(x, y, door) {
  // a = along the sidewalk (0‥2 tiles), c = across it (0 = kerb, 1 = shop front)
  const at2 = (a, c) => (door === 'E' ? [x + c, y + a] : [x + a, y + 1 - c]);
  const tables = [.35, 1, 1.65].map(a => at2(a, .5));
  const top = V.pick([['#8B5A2B', '#A87445'], ['#E8E4DA', '#FFFFFF'], ['#3F7FD0', '#5A96E0']]);
  for (const [i, [tx, ty]] of tables.entries()) {
    vig(tx, ty, [teaTable(top)], { z: 0 });
    for (const [da, dc] of [[-.3, 0], [.3, 0], [0, -.33]]) {
      const [px, py] = at2([.35, 1, 1.65][i] + da, .5 + dc);
      vig(px, py, [stool(V.pick(STOOLS))], { z: 0, d: -.02 });
      if (V.p(.6)) drinker(px, py, px < tx - .01 || py > ty + .01);   // west / south seats face away from us
    }
  }
  const L = look('man'); L.tray = 1; L.shirt = V.pick(['#FFFFFF', '#E8E1CF', '#6FA8DC']);
  const f = ['idle', 'walk1', 'walk2'].map(p => kid(L, p)), P = 12 + V() * 6, ph = V() * P * 3;
  const home = at2(1, .95);
  tables.forEach(t => { const [ex, ey] = at2(0, .78); t[0] += ex - at2(0, .5)[0]; t[1] += ey - at2(0, .5)[1]; });   // the boy stops beside a table
  vig(home[0], home[1], f, { win: [330, 1320], tick: e => {        // out to a table, wait, back to the counter
    const t = (T + ph) % P, tb = tables[Math.floor((T + ph) / P) % 3];
    const u = t < 3 ? 0 : t < 5.5 ? (t - 3) / 2.5 : t < 7.5 ? 1 : t < 10 ? 1 - (t - 7.5) / 2.5 : 0;
    e.x = home[0] + (tb[0] - home[0]) * u; e.y = home[1] + (tb[1] - home[1]) * u;
    e.cur = u > 0 && u < 1 ? f[1 + (Math.floor(T * 3) % 2)] : f[0];
  } });
}

// chinlone: a ring of players keeping the cane ball in the air, late afternoon, on a quiet street
const hash = k => { const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
const BALL = anchor(pix(3, 3, P => { P(1, 0, 1, 3, '#E8C547'); P(0, 1, 3, 1, '#E8C547'); P(2, 2, 1, 1, '#B8902A'); P(1, 1, 1, 1, '#B8902A'); }), 1, 2);
const BALLSHADOW = anchor(pix(3, 1, P => P(0, 0, 3, 1, 'rgba(0,0,0,.35)')), 1, 0);
function chinlone(cx, cy) {
  const n = 5, win = jit([960, 1110], 20), pos = [], D = 1.15, ph = V() * 50;
  for (let i = 0; i < n; i++) {
    const a = i / n * 2 * Math.PI + .4, x = cx + .55 * Math.cos(a), y = cy + .55 * Math.sin(a);
    const back = !(Math.cos(a) > .2 || Math.sin(a) < -.2);          // everyone faces the middle
    const L = look('man'); L.tuck = 1;
    const idle = standing(L, 'idle', back), pics = [idle, lower(dup(idle)), standing(L, 'kick', back)];
    pos.push([x, y]);
    vig(x, y, pics, { win, tick: e => {
      const k = Math.floor((T + ph) / D), u = (T + ph) / D - k, from = Math.floor(hash(k) * n), to = Math.floor(hash(k + 1) * n);
      e.cur = (from === i && u < .2) || (to === i && u > .82) ? pics[2] : pics[Math.floor(T * 1.4 + i * .7) % 2];
    } });
  }
  const fly = (e, lift) => {                                      // the ball arcs from one player to the next
    const k = Math.floor((T + ph) / D), u = (T + ph) / D - k, a = Math.floor(hash(k) * n), b = Math.floor(hash(k + 1) * n);
    e.x = pos[a][0] + (pos[b][0] - pos[a][0]) * u; e.y = pos[a][1] + (pos[b][1] - pos[a][1]) * u;
    e.z = lift ? 9 + (a === b ? 12 : 22 + hash(k + .5) * 10) * 4 * u * (1 - u) : 1;
  };
  vig(cx, cy, [BALLSHADOW], { win, d: -.05, tick: e => fly(e, false) });
  vig(cx, cy, [BALL], { win, z: 0, tick: e => fly(e, true) });
}

// Pansodan booksellers: books laid out on the pavement and leaned on the wall, browsers bent over them
const BOOKC = ['#8E2B2B', '#2B4F8E', '#E8C547', '#3D7A4A', '#E8E4DA', '#6B3E6B', '#D9772B', '#2B2B2B', '#B8A07A', '#5A8FA8'];
const bookMat = () => thing(-.17, -.42, .17, .42, 16, 2, g => {
  tF(g, -.17, -.42, .17, .42, 1, V.pick(['#3E5C7A', '#6B4A2E', '#7A7A72']));
  for (let v = -.38; v < .38; v += 2 / 12) for (let u = -.13; u < .12; u += 1.5 / 12) {
    if (V.p(.85)) { g.fillStyle = V.pick(BOOKC); g.fillRect(sx(u, v), sy(u, v, 2), 2, 1); }
  }
  for (let k = V.i(0, 2); k > 0; k--) { const v = -.3 + V() * .5; box(g, -.1, v, .02, v + .15, 1, 1 + V.i(2, 5), V.pick(BOOKC)); }
  wF(g, .17, -.4, .4, 1, 13, '#8B6A48');                         // a board against the wall, spines out
  for (let v = -.36; v < .36; v += 1 / 12) wF(g, .17, v, v + 1 / 12, 3, V.i(7, 11), V.pick(BOOKC));
});
function bookSpot(x, y) {
  if (!seen(x + .6, y + .5, 8)) return;
  const win = jit([480, 1080], 35);                              // laid out one by one from 8:00, packed away by 18:00
  if (V.p(.8)) vig(x + .6, y + .5, [bookMat()], { z: 0, win });
  else {                                                          // the seller, or an old man with a book, on a stool
    const L = look(V.p(.4) ? 'old' : 'man'), habit = V.p(.5) ? ['fan', 'fan2'] : ['read', 'read2'];
    vig(x + .6, y + .5, [stool(V.pick(STOOLS))], { z: 0, d: -.02, win });
    vig(x + .6, y + .5, habit.map(p => seated(L, p, false)), { win, seq: [[0, 3 + V() * 4], [1, .7 + V() * .6]] });
  }
  if (V.p(.3)) {                                                  // someone browsing, for a while
    const L = look(), a = 540 + V() * 460;
    vig(x + .22, y + .5, [standing(L, 'bend', true), standing(L, 'bend2', true)], { win: [a, a + 40 + V() * 120], seq: [[0, 3 + V() * 3], [1, 2 + V() * 3]] });
  }
}

// the Strand at sunset: people behind the railing watching the river, couples, a few rods out
function fisher(L) {
  const body = standing(L, 'rod', false);
  return [10, 11].map(tipY => {                                     // the rod tip bobs a little
    const c = mk(22, 38), g = c.getContext('2d'); g.drawImage(body, 0, 10);
    g.fillStyle = '#7A5A36'; for (let i = 0; i <= 14; i++) g.fillRect(5 + i, Math.round(17 + (tipY - 17) * i / 14), 1, 1);
    g.fillStyle = 'rgba(235,235,230,.7)'; g.fillRect(19, tipY + 1, 1, 37 - tipY);
    return anchor(c, 3, 24);
  });
}
function riverside() {
  const slots = [];
  for (let n = 0; n < 400 && slots.length < 18; n++) {
    const x = 1 + V() * 115;
    const off = c => Math.abs((((x - c) % 5) + 7.5) % 5 - 2.5);    // distance to the nearest tree / lamp
    if (off(2.5) > .9 && off(4.5) > .4 && !slots.some(a => Math.abs(a - x) < 1.4)) slots.push(x);
  }
  slots.forEach((x, i) => {
    const win = jit([1020, 1140], 25), y = 154.6;
    if (i % 6 === 0) { const L = look('man'); vig(x, y, fisher(L), { win: jit([990, 1150], 20), seq: [[0, 2 + V() * 3], [1, 1 + V()]] }); }
    else if (i % 6 === 1) {                                          // a couple; one leans in now and then
      const A = look('man'), B = look('woman');
      vig(x - .3, y, [seated(A, 'sit', false)], { win });
      vig(x, y, [seated(B, 'sit', false), seated(B, 'lean', false)], { win, seq: [[0, 4 + V() * 5], [1, 3 + V() * 3]] });
    } else if (i % 6 === 2) { const L = look(); vig(x, y, [standing(L, 'idle', false), standing(L, 'idle2', false)], { win, seq: [[0, 5 + V() * 5], [1, 2]] }); }
    else { const L = look(); vig(x, y, [seated(L, 'sit', false), seated(L, V.p(.5) ? 'fan' : 'talk', false)], { win, seq: [[0, 6 + V() * 6], [1, 1.5]] }); }
  });
}

// around Sule: money changers calling out, a lottery-ticket board, a child feeding the pigeons
const ringPt = deg => [CX + 9.1 * Math.cos(deg * rad), CY + 9.1 * Math.sin(deg * rad)];   // on the ring sidewalk, y is south
const lotteryBoard = () => thing(-.05, -.3, .05, .3, 24, 3, g => {
  g.fillStyle = '#5A4632'; for (const v of [-.25, .25]) g.fillRect(sx(0, v), sy(0, v, 1) - 18, 1, 18);
  wF(g, 0, -.3, .3, 8, 20, '#F4F1E8');
  for (let z = 10; z < 19; z += 3) for (let v = -.27; v < .27; v += 1 / 12) wF(g, 0, v, v + 1 / 12, z, z + 2, V.pick(['#E53935', '#1E88E5', '#43A047', '#FDD835', '#8E24AA', '#FB8C00']));
});
function suleLife() {
  for (const deg of [118, 152]) {                                 // money changers: "change, change"
    const [x, y] = ringPt(deg), L = look('man');
    if (seen(x, y)) vig(x, y, [standing(L, 'idle', false), standing(L, 'wave', false)], { win: jit([480, 1080], 40), seq: [[0, 2 + V() * 3], [1, .9], [0, 1 + V() * 2], [1, .7]] });
  }
  { const [x, y] = ringPt(40), L = look('woman'), win = jit([450, 1140], 30);    // lottery seller beside her board
    vig(x + .25, y, [lotteryBoard()], { z: 0, win });
    vig(x - .15, y + .1, [stool(V.pick(STOOLS))], { z: 0, d: -.02, win });
    vig(x - .15, y + .1, [seated(L, 'fan', false), seated(L, 'fan2', false)], { win, seq: [[0, .7], [1, .7], [0, .7], [1, .7], [0, 3 + V() * 3]] }); }
  { const [x, y] = ringPt(135), win = [[jit([420, 630])[0], 630], [930, jit([930, 1080])[1]]];   // a child throwing grain, a parent watching
    const K = look(), M = look('woman');
    vig(x, y, [kid(K, 'idle'), kid(K, 'throw')], { win, seq: [[0, 1.6 + V()], [1, .6]] });
    vig(x + .3, y - .25, [standing(M, 'idle', false), standing(M, 'idle2', false)], { win, seq: [[0, 4], [1, 1.5]] });
    const fx = x + .6, fy = y + .6;                                 // grain lands in front of the child
    for (const e of ents) if (e.k === 'pig' && Math.hypot(e.hx - CX, e.hy - CY) < 10.5) { e.feed = [fx, fy]; e.fwin = win; }
    for (let i = 0; i < 10; i++) ents.push({ k: 'pig', x: fx, y: fy, hx: fx, hy: fy, t: V() * 2, r: 0, feed: [fx, fy], fwin: win, win: win.map(w => jit(w, 25)) }); }
}

// Maha Bandula Park: early joggers and a group of elders exercising; couples under an umbrella in the evening
const umbrellaPair = (A, B, lean) => {
  const a = seated(A, 'sit', false), b = seated(B, lean ? 'lean' : 'sit', false), c = mk(14, 17), g = c.getContext('2d');
  g.drawImage(a, 0, 6); g.drawImage(b, 5, 6);
  const u = V.pick(['#C62828', '#1565C0', '#2E7D32', '#6A1B9A', '#F9A825']);
  g.fillStyle = sh(u, .75); g.fillRect(1, 2, 12, 1); g.fillStyle = u; g.fillRect(2, 1, 10, 1); g.fillRect(4, 0, 6, 1);
  g.fillStyle = '#3A3A3A'; g.fillRect(7, 3, 1, 4);
  return anchor(c, 6, 16);
};
function parkLife() {
  const loop = [[80.3, 103.3], [88.7, 103.3], [88.7, 111.7], [80.3, 111.7]], per = 33.6;
  for (let i = 0; i < 4; i++) {                                   // joggers circle the monument
    const L = look(); L.tuck = 1; L.low = '#2B2B2B'; L.shirt = V.pick(['#FFFFFF', '#E06666', '#6FA8DC', '#FFD966']);
    const pics = [standing(L, 'run1', false), standing(L, 'run2', false), standing(L, 'run1', true), standing(L, 'run2', true)], sp = .9 + V() * .3, off = V() * per;
    vig(80.3, 103.3, pics, { win: jit([360, 480], 20), tick: e => {
      let d = (T * sp + off) % per, k = 0;
      while (d > 8.4) { d -= 8.4; k++; }
      const [ax, ay] = loop[k], [bx, by] = loop[(k + 1) % 4];
      e.x = ax + (bx - ax) * d / 8.4; e.y = ay + (by - ay) * d / 8.4;
      e.cur = pics[(bx < ax || by > ay ? 0 : 2) + (Math.floor(T * 5 + off) % 2)];
    } });
  }
  const base = V() * 5;                                          // elders exercising together, a beat apart
  for (let i = 0; i < 6; i++) {
    const L = look('old'), x = 91 + (i % 3) * .7, y = 95 + Math.floor(i / 3) * .8;
    if (at(x | 0, y | 0) !== GRASS && at(x | 0, y | 0) !== PATH) continue;
    vig(x, y, [standing(L, 'up', false), standing(L, 'side', false), standing(L, 'idle', false)], { win: jit([360, 480], 15), seq: [[0, 1.6], [1, 1.6], [2, 1.6]], ph: base + i * .18 });
  }
  benches.forEach(([x, y], i) => {                                 // benches: an umbrella couple, or someone alone
    if (i % 3 === 0) { const A = look('man'), B = look('woman'); vig(x, y, [umbrellaPair(A, B, false), umbrellaPair(A, B, true)], { win: jit([990, 1140], 30), seq: [[0, 5 + V() * 5], [1, 3 + V() * 3]] }); }
    else if (i % 3 === 1) { const L = look(); vig(x, y, [seated(L, 'read', false), seated(L, 'read2', false)], { win: jit([900, 1110], 40), seq: [[0, 6 + V() * 4], [1, .6]] }); }
  });
}

// upper floors: laundry on bamboo poles, and the rope basket that comes down to the street now and then
function laundry() {
  const cloth = [0, 1, 2].map(() => [V.pick(GOODS), V.i(3, 4)]);
  return [0, 1].map(f => anchor(pix(13, 12, P => {
    for (let i = 0; i <= 12; i++) P(12 - i, i >> 1, 1, 1, '#9C7A4E');
    cloth.forEach(([c, h], j) => { const x = 9 - j * 4, y = (12 - x) >> 1; P(x, y + 1, 2, h - 1, c); P(x + ((f + j) % 2 ? 1 : -1) * (j === 1 ? 0 : 1), y + h, 2, 1, sh(c, .8)); });
  }), 6, 3));
}
function upperLife() {
  const faces2 = upper.filter(() => V.p(.35));
  for (const u of faces2) {
    const y = u.y0 + V.i(0, u.y1 - u.y0 - 1) + .5, k = V.i(2, u.fl - 1), z = 14 + (k - 1) * FL;
    if (V.p(.6)) {
      if (seen(u.x0 - .5, y, 8, z + 6)) vig(u.x0 - .5, y, laundry(), { z: z + 8, seq: [[0, .9 + V() * .8], [1, .9 + V() * .8]] });
    } else if (seen(u.x0 - .4, y, 12)) {                            // the rope basket
      const zw = z + 3, P = 70 + V() * 90, ph = V() * P, x = u.x0 - .12;
      const phase = () => (T + ph) % P;
      vig(x, y, [], { z: 0, draw: (e, px, py) => {
        const t = phase(), s = t < 8 ? t / 8 : t < 20 ? 1 : t < 28 ? 1 - (t - 20) / 8 : 0, k2 = s * s * (3 - 2 * s), bz = Math.round(zw - (zw - 1) * k2), h = zw - bz + 1;
        drawEnt({ width: 3, height: h + 3, paint: (g, dx, dy) => {
          g.fillStyle = '#E8E4DA'; g.fillRect(dx + 1, dy, 1, h);
          g.fillStyle = '#A0703A'; g.fillRect(dx, dy + h, 3, 3); g.fillStyle = '#7A5226'; g.fillRect(dx, dy + h + 1, 3, 1);
          if (t >= 20 && t < 28) { g.fillStyle = '#F4F1E8'; g.fillRect(dx + 1, dy + h - 1, 2, 1); }   // the newspaper going up
        } }, px - 1, py - zw - 3, e.x, e.y);
      } });
      const L = look();                                               // someone waiting below while it's down
      vig(u.x0 - .5, y + .15, [standing(L, 'idle', false), standing(L, 'idle2', false)], { show: () => { const t = phase(); return t > 6 && t < 21; }, seq: [[0, 2], [1, 1]] });
    }
  }
}
// tangled electric wires across the side streets, on concrete poles
function wires(ax, ay, bx, by, n) {                               // wires between two pole tops (a straight line on the map)
  const along = ay !== by, s = spr(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx) + (along ? .08 : 0), Math.max(ay, by) + (along ? 0 : .08), 46, 6), g = s.g;
  for (const [x, y] of [[ax, ay], [bx, by]]) {
    const X = sx(x, y), Y = sy(x, y, 1);
    g.fillStyle = '#A8A49A'; g.fillRect(X, Y - 38, 2, 38); g.fillStyle = '#86827A'; g.fillRect(X + 1, Y - 38, 1, 38); g.fillRect(X - 2, Y - 34, 6, 1);
    g.fillStyle = 'rgba(30,30,30,.8)'; for (let i = 0; i < 12; i++) g.fillRect(X - 3 + V.i(0, 7), Y - 36 + V.i(0, 7), V.i(1, 3), 1);   // the knot at the top
  }
  g.fillStyle = 'rgba(28,28,28,.75)';
  for (let i = 0; i < n; i++) {
    const za = 27 + V() * 9, zb = 27 + V() * 9, sag = 3 + V() * (along ? 10 : 7);
    const A = [sx(ax, ay), sy(ax, ay, za)], B = [sx(bx, by), sy(bx, by, zb)];
    for (let c = A[0]; c <= B[0]; c++) { const t = (c - A[0]) / ((B[0] - A[0]) || 1); g.fillRect(c, Math.round(A[1] + (B[1] - A[1]) * t + sag * 4 * t * (1 - t)), 1, 1); }
  }
}
function wiring() {
  for (const [x0, x1, y0, y1, m] of NS) {
    if (m) continue;
    let last = null;
    for (let y = y0 + 2 + V.i(0, 6); y < y1 - 2; y += V.i(8, 12)) {
      if (at(x0 - 1, y) !== WALK || at(x1, y) !== WALK) { last = null; continue; }
      wires(x0 - .6, y + .5, x1 + .4, y + .5, V.i(3, 6));
      if (last !== null && y - last < 14) wires(x1 + .4, last + .5, x1 + .4, y + .5, V.i(2, 4));
      last = y;
    }
  }
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

function update(dt) {
  T += dt;
  for (const e of ents) {
    if (e.k === 'veh') {
      e.s = (e.s + e.L.sp * dt) % e.L.len; const [x, y, dx, dy] = lanePos(e.L, e.s); e.x = x; e.y = y; e.d = dirOf(dx, dy);
    } else if (e.k === 'ped') {
      if (e.pause > 0) { e.pause -= dt; continue; }
      const ns = e.s + e.dir * e.sp * dt, [x, y] = linePt(e.l, ns);
      if ((!e.l.ring && (ns < 0 || ns > e.l.len)) || !okPt(e.l, x, y)) { e.dir = -e.dir; if (!e.alms) e.pause = 3 + Math.random() * 6; }   // wait a while before heading back
      else { e.s = e.l.ring ? (ns + e.l.len) % e.l.len : ns; e.x = x; e.y = y; }
      if (!e.alms && Math.random() < dt * .02) e.pause = 2 + Math.random() * 4;                                             // stop and look around
    } else if (e.k === 'pig') {
      e.t -= dt;
      if (e.t < 0) {
        const fed = e.feed && inWins(e.fwin), [hx, hy] = fed ? e.feed : [e.hx, e.hy], r = fed ? .9 : 1.5;
        e.t = (fed ? .3 : .4) + Math.random() * (fed ? .8 : 1.5); e.x = hx + (Math.random() - .5) * r; e.y = hy + (Math.random() - .5) * r;
      }
    } else if (e.k === 'vig') {
      if (e.tick) e.tick(e);
    } else if (e.k === 'boat') {
      e.x += e.v * dt; if (e.x > MW + 3) e.x = -3; if (e.x < -3) e.x = MW + 3;
    }
  }
  for (const b of birds) b.a += b.w * dt;
  for (const c of crows) { c.x += c.vx * dt; c.y += c.vy * dt; if (c.x > MW + 5) { c.x = -5; c.y = rnd() * 150; } if (c.y < 0 || c.y > 160) c.vy = -c.vy; }
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

function render() {
  const X = Math.round(camX), Y = Math.round(camY);
  fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1;
  fg.fillStyle = '#1d2630'; fg.fillRect(0, 0, vw, vh);
  fg.drawImage(ST, X, Y, vw, vh, 0, 0, vw, vh);
  drawList = sprites.filter(s => s.left < X + vw && s.left + s.w > X && s.top < Y + vh && s.top + s.h > Y);
  fg.save(); fg.translate(-X, -Y);
  const vis = [];
  for (const e of ents) {
    if (e.r > density && e.k !== 'boat') continue;
    if (e.win && !onNow(e)) continue;
    if (e.show && !e.show(e)) continue;
    const px = sx(e.x, e.y); if (px < X - 60 || px > X + vw + 60) continue;
    vis.push(e);
  }
  vis.sort((a, b) => (a.y - a.x + (a.d || 0)) - (b.y - b.x + (b.d || 0)));
  const lights = [];
  for (const e of vis) {
    const px = sx(e.x, e.y), py = sy(e.x, e.y);
    if (py < Y - 40 || py > Y + vh + 40) continue;
    if (e.k === 'veh' || e.k === 'boat') {
      const v = e.k === 'veh' ? e.spr[e.d] : e.spr, dx = px + v.dx, dy = py + v.dy;
      if (!drawEnt(v.cv, dx, dy, e.x, e.y) && v.ecv) lights.push([v.ecv, dx, dy]);
    } else if (e.k === 'ped') {
      const vx = e.l.ring ? -Math.sin(e.s / 9.1) * e.dir : (e.l.bx - e.l.ax) * e.dir, vy = e.l.ring ? Math.cos(e.s / 9.1) * e.dir : (e.l.by - e.l.ay) * e.dir;
      const img = e.spr.f[vx < 0 || vy > 0 ? 0 : 1][e.pause > 0 ? 0 : Math.floor(T * 4 + e.ph) % 2];
      drawEnt(img, px - 3, py - 1 - 14, e.x, e.y);
    } else if (e.k === 'vig') {
      if (e.draw) e.draw(e, px, py);
      else { const c = e.cur || vigPic(e); drawEnt(c, px - c.ax, py - e.z - c.ay, e.x, e.y); }
    } else if (e.k === 'pig') {
      fg.fillStyle = '#6E737B'; fg.fillRect(px - 1, py - 2, 2, 1); fg.fillStyle = '#9AA0A8'; fg.fillRect(px + 1, py - 3, 1, 1);
    }
  }
  const dusk = mins > 1000 && mins < 1135;                     // the river catches the sunset
  fg.fillStyle = dusk ? 'rgba(255,190,120,.8)' : 'rgba(235,245,240,.6)';
  for (const [x, y, p] of sparkles) if (Math.sin(T * 1.3 + p) > (dusk ? .5 : .75)) fg.fillRect(sx(x, y) + ((T * 3 + p * 5) % 6 | 0), sy(x, y, -5), 3, 1);
  fg.fillStyle = '#4A4F57';
  for (const b of birds) {
    const x = CX + b.r * Math.cos(b.a), y = CY - b.r * Math.sin(b.a), X2 = sx(x, y), Y2 = sy(x, y, b.z), f = (T * 8 + b.r) % 2 < 1;
    fg.fillRect(X2 - 1, Y2 - (f ? 1 : 0), 1, 1); fg.fillRect(X2, Y2, 1, 1); fg.fillRect(X2 + 1, Y2 - (f ? 1 : 0), 1, 1);
  }
  fg.fillStyle = '#16181C';
  for (const c of crows) { const X2 = sx(c.x, c.y), Y2 = sy(c.x, c.y, c.z), f = (T * 6 + c.z) % 2 < 1; fg.fillRect(X2 - 2, Y2 - (f ? 1 : 0), 2, 1); fg.fillRect(X2, Y2, 1, 1); fg.fillRect(X2 + 1, Y2 - (f ? 1 : 0), 2, 1); }
  fg.restore();
  if (lt.rgb.some(v => v < 255)) {
    fg.globalCompositeOperation = 'multiply'; fg.fillStyle = `rgb(${lt.rgb})`; fg.fillRect(0, 0, vw, vh); fg.globalCompositeOperation = 'source-over';
  }
  if (lt.L > .01) {
    fg.globalAlpha = Math.min(1, lt.L); fg.drawImage(EM, X, Y, vw, vh, 0, 0, vw, vh);
    for (const [c, dx, dy] of lights) fg.drawImage(c, dx - X, dy - Y);
    fg.globalAlpha = 1;
  }
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
  // the Burmese subset only loads when asked for Burmese text, so ask with some
  await Promise.race([Promise.all([document.fonts.load(`11px ${MYF}`, 'မြန်မာ Aa'), document.fonts.load(`bold 15px ${MYF}`, 'မြန်မာ Aa')]), new Promise(r => setTimeout(r, 10000))]);
  layout();
  sule(); cityHall(); mosque(); fireStation(); shangriLa(); sakura(); church(); court(); temple(); jetty(); monument();
  cinema(LM.shae, 'ရှေ့ဆောင်', 'SHAE SAUNG CINEMA', '#EADCC0');
  cinema(LM.sulecin, 'ဆူးလေ ရုပ်ရှင်ရုံ', 'SULE CINEMA', '#D8E2E8');
  colonial(...LM.ysx, 3, '#EFE7D2', { f: 'w', t: signTex('စတော့အိတ်ချိန်း', 'YSX', '#0D3C61', '#FFFFFF') });
  colonial(...LM.usemb, 4, '#E7D08E'); colonial(...LM.meie, 3, '#BFBAB0');
  colonial(...LM.divcourt, 3, '#A5452F', { f: 's', t: signTex('တိုင်းတရားရုံး', 'DIVISION COURT', '#EFE6D6', '#6B2A1F') });
  for (const [k, h] of Object.entries({ hall: 40, mosque: 32, fire: 38, shangri: 232, sakura: 164, shae: 82, sulecin: 82, church: 30, court: 40, temple: 14 })) mark(...LM[k], h);
  for (let y = CY - 5; y < CY + 5; y++) for (let x = CX - 5; x < CX + 5; x++) if (rbd(x, y) < 5) HT[y * MW + x] = 70;
  lots(); props();
  ST = mk(CW, CH); EM = mk(CW, CH);
  const sg = ST.getContext('2d'), eg = EM.getContext('2d');
  ground(sg);
  const sorted = order(sprites); sprites.length = 0; sprites.push(...sorted);
  for (const s of sprites) {
    sg.drawImage(s.cv, s.left, s.top);
    eg.globalCompositeOperation = 'destination-out'; eg.drawImage(s.cv, s.left, s.top); eg.globalCompositeOperation = 'source-over';
    if (s.ecv) eg.drawImage(s.ecv, s.left, s.top);
    s.ecv = s.eg = s.g = null;
  }
  populate(); riverside(); suleLife(); parkLife(); upperLife(); bridgeWalkers();
  resize(); camX = sx(CX, CY) - vw / 2; camY = sy(CX, CY, 60) - vh / 2; clampCam();
  document.getElementById('load').remove();
  tick(); setInterval(tick, 1000);
  requestAnimationFrame(loop);
})();
