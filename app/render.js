// render.js - motore di disegno su canvas per le slide di DomePodcast Studio.
// Nessuna dipendenza. Colori e font vengono letti da assets/brand.css (unica fonte del brand).
import { disegnaElemento } from './elementi.js';

export const FORMATI = {
  carosello:   { label: 'Carosello 4:5', w: 1080, h: 1350, multi: true,  extra: 0,   sigla: 'carosello' },
  carosello34: { label: 'Carosello 3:4', w: 1080, h: 1440, multi: true,  extra: 0,   sigla: 'carosello-34' },
  post:        { label: 'Post singolo',  w: 1080, h: 1350, multi: false, extra: 0,   sigla: 'post' },
  quadrato:    { label: 'Post quadrato', w: 1080, h: 1080, multi: false, extra: 0,   sigla: 'quadrato' },
  // Cover reel 9:16: il contenuto sta nella fascia centrale 3:4, che resta visibile nella griglia del profilo
  reel:        { label: 'Cover reel 9:16', w: 1080, h: 1920, multi: false, extra: 240, sigla: 'reel' },
};

export const COLORI = ['viola', 'arancione', 'giallo', 'lilla', 'bianco'];
export const NOMI_COLORI = { viola: 'Viola', arancione: 'Arancione', giallo: 'Giallo', lilla: 'Lilla', bianco: 'Bianco' };

export const brand = {
  viola: '#2E1976', arancione: '#EE8F4D', giallo: '#F4B162', lilla: '#A98BEE', bianco: '#FFFFFF',
  fTitoli: '"Staatliches", Impact, sans-serif', fTesti: '"Libre Baskerville", Georgia, serif',
};

export function readBrand() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  for (const k of COLORI) if (g('--' + k)) brand[k] = g('--' + k);
  if (g('--font-titoli')) brand.fTitoli = g('--font-titoli');
  if (g('--font-testi')) brand.fTesti = g('--font-testi');
}

export function loadFonts() {
  const tutti = Promise.all(['400 40px "Staatliches"', '400 40px "Libre Baskerville"', '700 40px "Libre Baskerville"']
    .map((f) => document.fonts.load(f, 'AaÈè0123')));
  return Promise.race([tutti, new Promise((r) => setTimeout(r, 5000))]);
}

/* ---------- utilità testo ---------- */

export function font(ctx, fam, weight, size) {
  ctx.font = `${weight} ${size}px ${fam === 'titoli' ? brand.fTitoli : brand.fTesti}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = fam === 'titoli' ? (size * 0.05) + 'px' : '0px';
}

function baseline(ctx, top, lineH, size) {
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? size * 0.8;
  const desc = m.fontBoundingBoxDescent ?? size * 0.2;
  return top + (lineH - (asc + desc)) / 2 + asc;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (!line || ctx.measureText(t).width <= maxW) line = t; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

// Disegna uno o più "pezzi" di testo (ognuno col suo colore) con dimensione adattiva:
// riduce il corpo finché stanno nel numero di righe e nell'altezza disponibili.
// Con x = bordo sinistro (left), destro (right) o centro (center). Ritorna l'altezza usata.
export function disegnaTesto(e, c) {
  const ctx = e.ctx;
  const parts = (c.parts || [{ text: c.text, ghost: c.ghost, color: c.color }])
    .filter((p) => String(p.text || '').trim());
  if (!parts.length) return { h: 0, size: c.max, lines: 0 };
  const upper = c.fam === 'titoli';
  const lh = c.lh ?? 1.3;
  const maxLines = c.maxLines ?? 99;
  const maxH = c.maxH ?? 99999;
  let size = c.max, res;
  for (;;) {
    font(ctx, c.fam, c.weight ?? 400, size);
    res = parts.map((p) => wrapLines(ctx, upper ? String(p.text).toUpperCase() : p.text, c.maxW));
    const n = res.reduce((s, l) => s + l.length, 0);
    const larga = res.some((ls) => ls.some((l) => ctx.measureText(l).width > c.maxW + 0.5));
    if ((n <= maxLines && n * size * lh <= maxH && !larga) || size <= c.min) break;
    size -= 2;
  }
  const lineH = size * lh;
  const align = c.align || 'left';
  const sp = upper && 'letterSpacing' in ctx ? size * 0.05 : 0;
  let y = c.y, tot = 0;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  parts.forEach((p, pi) => {
    ctx.save();
    ctx.fillStyle = p.color || c.color;
    if (p.ghost) ctx.globalAlpha = 0.35;
    res[pi].forEach((l) => {
      const w = ctx.measureText(l).width - sp;
      const cx = align === 'center' ? c.x - w / 2 : align === 'right' ? c.x - w : c.x;
      if (!c.misura) ctx.fillText(l, cx, baseline(ctx, y, lineH, size));
      y += lineH; tot += lineH;
    });
    ctx.restore();
  });
  return { h: tot, size, lines: res.reduce((s, l) => s + l.length, 0) };
}

// Misura senza disegnare (serve per centrare i blocchi in verticale)
export function misuraTesto(e, c) { return disegnaTesto(e, { ...c, misura: true }); }

/* ---------- foto ---------- */

export function coprire(o, img, w, h) {
  const r = Math.max(w / img.width, h / img.height);
  const dw = img.width * r, dh = img.height * r;
  o.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// Foto con angoli tondi e bordi sfumati sui lati (stile DICETIDICE)
export function disegnaFoto(ctx, img, box, { modo = 'riempi', fondi = false, bordi = true, radius = 44 } = {}) {
  if (!img || box.w < 20 || box.h < 20) return;
  let { x, y, w, h } = box;
  const ar = img.width / img.height;
  if (modo === 'intera') {
    let tw = w, th = w / ar;
    if (th > h) { th = h; tw = h * ar; }
    x += (w - tw) / 2; y += (h - th) / 2; w = tw; h = th;
  }
  const off = document.createElement('canvas');
  off.width = Math.round(w); off.height = Math.round(h);
  const o = off.getContext('2d');
  if (bordi) { roundRect(o, 0, 0, off.width, off.height, radius); o.save(); o.clip(); }
  if (fondi && 'filter' in o) o.filter = 'brightness(1.07) contrast(1.03)';
  coprire(o, img, off.width, off.height);
  if (bordi) o.restore();
  o.filter = 'none';
  if (bordi) {
    o.globalCompositeOperation = 'destination-in';
    let g = o.createLinearGradient(0, 0, off.width, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.07, '#000'); g.addColorStop(0.93, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
    g = o.createLinearGradient(0, 0, 0, off.height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.09, '#000'); g.addColorStop(0.91, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g; o.fillRect(0, 0, off.width, off.height);
  }
  ctx.save();
  if (fondi) ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(off, x, y);
  ctx.restore();
}

// Foto "a strisce": barre verticali di altezze diverse, le esterne più chiare.
const STRISCE = [ // x0, larghezza, alto, basso (frazioni del riquadro), chiara
  [0, .066, .098, .912, 1], [.079, .092, .058, .951, 1], [.197, .046, 0, .85, 1], [.27, .05, .05, .9, 1],
  [.329, .319, .018, 1, 0], [.664, .05, 0, .945, 0], [.743, .089, 0, .89, 0], [.845, .066, .037, .855, 0], [.934, .066, .2, .855, 0],
];
export function disegnaStrisce(ctx, img, box) {
  if (!img) return;
  STRISCE.forEach(([x0, bw, t, b, chiara]) => {
    const rx = box.x + x0 * box.w, ry = box.y + t * box.h, rw = bw * box.w, rh = (b - t) * box.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.translate(box.x, box.y);
    const o = ctx; coprire(o, img, box.w, box.h);
    ctx.restore();
    if (chiara) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(rx, ry, rw, rh); }
  });
}

export function disegnaSegnapostoFoto(e, box) {
  if (!e.preview || box.w < 20 || box.h < 20) return;
  const ctx = e.ctx;
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.strokeStyle = e.dark; ctx.lineWidth = 4; ctx.setLineDash([22, 16]);
  roundRect(ctx, box.x + 2, box.y + 2, box.w - 4, box.h - 4, 44); ctx.stroke();
  ctx.setLineDash([]);
  font(ctx, 'testi', 400, 34); ctx.fillStyle = e.dark; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Aggiungi una foto', box.x + box.w / 2, box.y + box.h / 2 + 12);
  ctx.restore();
}

export function disegnaFotoSlide(e, s, box, stripes) {
  const img = e.imgs.foto;
  if (!img) { disegnaSegnapostoFoto(e, box); return; }
  const f = s.foto || {};
  if (stripes && f.strisce) disegnaStrisce(e.ctx, img, box);
  else disegnaFoto(e.ctx, img, box, { modo: f.modo, fondi: f.fondi, bordi: f.bordi !== false });
}

/* ---------- intestazione (foto tonda + nome + descrizione) ---------- */

export function disegnaIntestazione(e) {
  const { ctx } = e, p = e.profilo;
  const x = 64, y = e.top + 46, d = 104;
  ctx.save();
  ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
  const img = e.imgs.profilo || e.imgs.logo;
  if (img) {
    ctx.translate(x, y); coprire(ctx, img, d, d);
  } else { ctx.fillStyle = brand.lilla; ctx.fillRect(x, y, d, d); }
  ctx.restore();
  const tx = x + d + 22;
  ctx.fillStyle = e.hdrInk; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  font(ctx, 'testi', 700, 32);
  ctx.fillText(p.nome || '', tx, y + 36);
  font(ctx, 'testi', 700, 22);
  wrapLines(ctx, p.descr || '', 330).slice(0, 3).forEach((l, i) => ctx.fillText(l, tx, y + 68 + i * 29));
}

/* ---------- slide intera ---------- */

export function creaContesto(slide, o, layout) {
  const F = FORMATI[o.formato] || FORMATI.carosello;
  const ctx = o.ctx;
  const bgKey = slide.sfondo || 'bianco';
  const acc = slide.accento || 'arancione';
  const sec = { arancione: 'giallo', viola: 'arancione', giallo: 'viola', lilla: 'viola', bianco: 'viola' }[acc];
  const ch = F.h - 2 * F.extra;
  const e = {
    ctx, W: F.w, H: F.h, top: F.extra, bottom: F.h - F.extra, ch, s: ch / 1350, extra: F.extra,
    preview: !!o.preview, imgs: o.imgs || {}, profilo: o.profilo || {}, slide, bgKey,
    bg: brand[bgKey], acc: brand[acc], sec: brand[sec],
    // colori dei testi in base allo sfondo
    ink: bgKey === 'bianco' ? brand[acc] : '#fff',                       // testo principale colorato
    dark: bgKey === 'viola' ? '#fff' : brand.viola,                      // testo scuro di base
    deco: bgKey === acc ? '#fff' : brand[acc],                           // triangoli e decorazioni
    hdrInk: bgKey === 'viola' ? '#fff' : brand.viola,
    y: null,
  };
  e.y = (v) => e.top + v * e.s;
  return e;
}

export function disegnaSlide(canvas, slide, o) {
  const F = FORMATI[o.formato] || FORMATI.carosello;
  const sc = o.scala || 1;
  canvas.width = Math.round(F.w * sc); canvas.height = Math.round(F.h * sc);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  const layout = o.layouts.find((l) => l.id === slide.layout) || o.layouts[0];
  const e = creaContesto(slide, { ...o, ctx }, layout);
  ctx.fillStyle = e.bg; ctx.fillRect(0, 0, F.w, F.h);
  const els = slide.elementi || [];
  els.filter((el) => el.dietro).forEach((el) => disegnaElemento(ctx, el, F.w, F.h, brand));
  layout.draw(e, slide);
  if (slide.intestazione) disegnaIntestazione(e);
  els.filter((el) => !el.dietro).forEach((el) => disegnaElemento(ctx, el, F.w, F.h, brand));
  return e;
}

/* ---------- ritaglio automatico delle barre nere ---------- */

export function ritagliaBarreNere(img) {
  const sc = Math.min(1, 400 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * sc)), h = Math.max(1, Math.round(img.height * sc));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const nera = (px, py) => { const i = (py * w + px) * 4; return d[i] + d[i + 1] + d[i + 2] < 60; };
  const rigaNera = (py) => { let n = 0; for (let px = 0; px < w; px++) if (!nera(px, py)) n++; return n <= w * 0.01; };
  const colNera = (px) => { let n = 0; for (let py = 0; py < h; py++) if (!nera(px, py)) n++; return n <= h * 0.01; };
  let t = 0, b = h - 1, l = 0, r = w - 1;
  while (t < b && t < h * 0.35 && rigaNera(t)) t++;
  while (b > t && h - 1 - b < h * 0.35 && rigaNera(b)) b--;
  while (l < r && l < w * 0.35 && colNera(l)) l++;
  while (r > l && w - 1 - r < w * 0.35 && colNera(r)) r--;
  if (t < 2 && l < 2 && h - 1 - b < 2 && w - 1 - r < 2) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: Math.round(l / sc), y: Math.round(t / sc), w: Math.round((r - l + 1) / sc), h: Math.round((b - t + 1) / sc) };
}
