// elementi.js - CATALOGO degli elementi grafici inseribili nelle slide (frecce, triangoli, icone, forme...).
// Per aggiungerne uno basta aggiungere una voce a ELEMENTI:
//   { id, nome, gruppo, vb:[larghezza, altezza] (sistema di coordinate dei tracciati), w: larghezza iniziale in px,
//     ancora?: 'tl'|'tr'|'bl'|'br' (si posiziona nell'angolo), colore?: colore iniziale,
//     paths: [ F('tracciato SVG') riempito  |  S('tracciato', spessore) solo contorno ] }
// Un elemento ha UN solo colore (dalla palette del brand). Stile: piatto, senza sfumature.

const F = (d, o = {}) => ({ d, m: 'f', ...o });
const S = (d, sw = 7, o = {}) => ({ d, m: 's', sw, ...o });
const cerchio = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const tondo = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const R = (g) => (g * Math.PI) / 180;

function ingranaggio() {
  const n = 8, ro = 48, ri = 36, c = 50;
  const p = (r, a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n, nx = ((i + 1) * 2 * Math.PI) / n;
    d += `${i ? 'L' : 'M'}${p(ri, a - 0.24)}L${p(ro, a - 0.15)}L${p(ro, a + 0.15)}L${p(ri, a + 0.24)}A${ri} ${ri} 0 0 1 ${p(ri, nx - 0.24)}`;
  }
  return d + 'Z' + cerchio(c, c, 16);
}
function stella() {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 20 : 50, a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i ? 'L' : 'M'}${(50 + r * Math.cos(a)).toFixed(2)} ${(52 + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}
function barre() {
  const h = [20, 40, 28, 56, 36, 48, 24, 36, 16];
  return h.map((v, i) => S(`M${6 + i * 11} ${30 - v / 2}V${30 + v / 2}`, 7));
}
function onde() {
  const out = [];
  [[26, 0.7], [38, 0.7], [50, 0.7]].forEach(([r], k) => {
    const a = R(38);
    const pt = (s, t) => `${(50 + s * r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
    out.push(S(`M${pt(1, -a)}A${r} ${r} 0 0 1 ${pt(1, a)}`, 6, { op: 1 - k * 0.2 }));
    out.push(S(`M${pt(-1, -a)}A${r} ${r} 0 0 0 ${pt(-1, a)}`, 6, { op: 1 - k * 0.2 }));
  });
  return out;
}

export const GRUPPI = ['Frecce', 'Triangoli', 'Forme', 'Icone', 'Podcast', 'Linee', 'Numeri'];

export const ELEMENTI = [
  // --- Frecce
  { id: 'freccia-destra', nome: 'Freccia destra', gruppo: 'Frecce', vb: [100, 30], w: 285, colore: 'viola', paths: [F('M0 12H72V0L100 15L72 30V18H0Z')] },
  { id: 'freccia-sinistra', nome: 'Freccia sinistra', gruppo: 'Frecce', vb: [100, 30], w: 285, colore: 'viola', paths: [F('M100 12H28V0L0 15L28 30V18H100Z')] },
  { id: 'freccia-su', nome: 'Freccia su', gruppo: 'Frecce', vb: [30, 100], w: 90, colore: 'viola', paths: [F('M12 100V28H0L15 0L30 28H18V100Z')] },
  { id: 'freccia-giu', nome: 'Freccia giù', gruppo: 'Frecce', vb: [30, 100], w: 90, colore: 'viola', paths: [F('M12 0V72H0L15 100L30 72H18V0Z')] },
  { id: 'freccia-doppia', nome: 'Freccia doppia', gruppo: 'Frecce', vb: [100, 30], w: 285, colore: 'viola', paths: [F('M28 0L0 15L28 30V18H72V30L100 15L72 0V12H28Z')] },
  { id: 'freccia-curva', nome: 'Freccia curva', gruppo: 'Frecce', vb: [100, 100], w: 240, colore: 'giallo', paths: [S('M8 92C8 48 36 18 70 16', 7), F('M68 0L100 16L68 32Z')] },
  { id: 'freccia-curva-giu', nome: 'Freccia a mano', gruppo: 'Frecce', vb: [100, 100], w: 180, colore: 'viola', paths: [S('M14 12C52 -8 94 18 58 44C26 68 62 70 56 80', 6), F('M42 78L56 100L70 78Z')] },
  // --- Triangoli (angoli e diagonali)
  { id: 'angolo-tl', nome: 'Angolo in alto a sinistra', gruppo: 'Triangoli', vb: [100, 100], w: 290, ancora: 'tl', colore: 'arancione', paths: [F('M0 0H100L0 100Z')] },
  { id: 'angolo-tr', nome: 'Angolo in alto a destra', gruppo: 'Triangoli', vb: [100, 100], w: 290, ancora: 'tr', colore: 'arancione', paths: [F('M0 0H100V100Z')] },
  { id: 'angolo-bl', nome: 'Angolo in basso a sinistra', gruppo: 'Triangoli', vb: [100, 100], w: 290, ancora: 'bl', colore: 'arancione', paths: [F('M0 0V100H100Z')] },
  { id: 'angolo-br', nome: 'Angolo in basso a destra', gruppo: 'Triangoli', vb: [100, 100], w: 290, ancora: 'br', colore: 'arancione', paths: [F('M100 0V100H0Z')] },
  { id: 'diagonale-grande', nome: 'Diagonale grande (copertina)', gruppo: 'Triangoli', vb: [100, 100], w: 720, ancora: 'tl', colore: 'arancione', paths: [F('M0 0H100L0 100Z')] },
  { id: 'triangolo-punta', nome: 'Punta a sinistra', gruppo: 'Triangoli', vb: [100, 115], w: 140, colore: 'bianco', paths: [F('M0 57L100 0V115Z')] },
  { id: 'triangolo', nome: 'Triangolo', gruppo: 'Triangoli', vb: [100, 87], w: 200, colore: 'lilla', paths: [F('M50 0L100 87H0Z')] },
  // --- Forme
  { id: 'cerchio', nome: 'Cerchio', gruppo: 'Forme', vb: [100, 100], w: 180, colore: 'lilla', paths: [F(cerchio(50, 50, 50))] },
  { id: 'anello', nome: 'Anello', gruppo: 'Forme', vb: [100, 100], w: 180, colore: 'lilla', paths: [F(cerchio(50, 50, 50) + cerchio(50, 50, 38), { rule: 'evenodd' })] },
  { id: 'quadrato', nome: 'Quadrato arrotondato', gruppo: 'Forme', vb: [100, 100], w: 150, colore: 'giallo', paths: [F(tondo(0, 0, 100, 100, 12))] },
  { id: 'rettangolo', nome: 'Rettangolo', gruppo: 'Forme', vb: [100, 60], w: 260, colore: 'giallo', paths: [F(tondo(0, 0, 100, 60, 8))] },
  { id: 'rombo', nome: 'Rombo', gruppo: 'Forme', vb: [100, 100], w: 150, colore: 'giallo', paths: [F('M50 0L100 50L50 100L0 50Z')] },
  { id: 'stella', nome: 'Stella', gruppo: 'Forme', vb: [100, 100], w: 150, colore: 'giallo', paths: [F(stella())] },
  // --- Icone
  { id: 'avviso', nome: 'Avviso', gruppo: 'Icone', vb: [100, 90], w: 420, colore: 'lilla', paths: [S('M50 10L92 82H8Z', 12), F('M45 34H55V58H45Z'), F('M45 66H55V76H45Z')] },
  { id: 'ingranaggio', nome: 'Ingranaggio', gruppo: 'Icone', vb: [100, 100], w: 160, colore: 'giallo', paths: [F(ingranaggio(), { rule: 'evenodd' })] },
  { id: 'spunta', nome: 'Spunta', gruppo: 'Icone', vb: [100, 100], w: 150, colore: 'arancione', paths: [S('M10 54L38 82L90 20', 14)] },
  { id: 'spunta-cerchio', nome: 'Spunta nel cerchio', gruppo: 'Icone', vb: [100, 100], w: 170, colore: 'arancione', paths: [S(cerchio(50, 50, 44), 8), S('M28 52L44 68L74 34', 9)] },
  { id: 'fabbrica', nome: 'Fabbrica', gruppo: 'Icone', vb: [110, 95], w: 300, colore: 'giallo', paths: [S('M6 88V36L38 54V36L70 54V36L102 54V88Z', 5, { join: 'miter', cap: 'butt' }), S('M14 36V8H26V44', 5, { join: 'miter', cap: 'butt' }), F('M22 66H36V78H22Z'), F('M48 66H62V78H48Z'), F('M74 66H88V78H74Z')] },
  { id: 'processo', nome: 'Passaggi di processo', gruppo: 'Icone', vb: [190, 40], w: 400, colore: 'giallo', paths: [F(cerchio(14, 20, 13)), S('M32 20H66', 5), S('M58 12L68 20L58 28', 5), F('M90 4L106 20L90 36L74 20Z'), S('M112 20H146', 5), S('M138 12L148 20L138 28', 5), F(tondo(158, 6, 28, 28, 4))] },
  { id: 'smartphone', nome: 'Smartphone', gruppo: 'Icone', vb: [100, 100], w: 150, colore: 'lilla', paths: [S(tondo(24, 6, 52, 88, 9), 7), S('M42 82H58', 6)] },
  { id: 'cuore', nome: 'Cuore', gruppo: 'Icone', vb: [100, 100], w: 150, colore: 'arancione', paths: [F('M50 90C8 60 4 30 26 18C40 11 50 24 50 30C50 24 60 11 74 18C96 30 92 60 50 90Z')] },
  { id: 'commento', nome: 'Commento', gruppo: 'Icone', vb: [100, 100], w: 160, colore: 'lilla', paths: [S('M12 14H88V64H44L24 84V64H12Z', 7), F(cerchio(32, 39, 4.5)), F(cerchio(50, 39, 4.5)), F(cerchio(68, 39, 4.5))] },
  { id: 'lampadina', nome: 'Lampadina', gruppo: 'Icone', vb: [100, 100], w: 150, colore: 'giallo', paths: [S('M50 8C28 8 18 26 24 44C28 54 36 60 36 70H64C64 60 72 54 76 44C82 26 72 8 50 8Z', 7), S('M38 81H62', 7), S('M43 92H57', 7)] },
  { id: 'razzo', nome: 'Razzo', gruppo: 'Icone', vb: [100, 100], w: 150, colore: 'lilla', paths: [F('M50 4C68 20 74 46 66 68H34C26 46 32 20 50 4Z' + cerchio(50, 34, 8), { rule: 'evenodd' }), F('M34 54L16 76L34 72Z M66 54L84 76L66 72Z'), F('M42 74H58L50 98Z')] },
  // --- Podcast
  { id: 'microfono', nome: 'Microfono', gruppo: 'Podcast', vb: [100, 100], w: 200, colore: 'lilla', paths: [F('M34 24A16 16 0 0 1 66 24V44A16 16 0 0 1 34 44Z'), S('M22 44C22 66 78 66 78 44', 7), S('M50 62V84', 7), S('M34 91H66', 7)] },
  { id: 'onde-sonore', nome: 'Onde sonore', gruppo: 'Podcast', vb: [100, 100], w: 340, colore: 'lilla', paths: onde() },
  { id: 'onde-audio', nome: 'Onde audio', gruppo: 'Podcast', vb: [100, 60], w: 300, colore: 'lilla', paths: barre() },
  { id: 'cuffie', nome: 'Cuffie', gruppo: 'Podcast', vb: [100, 100], w: 200, colore: 'lilla', paths: [S('M14 62V50A36 36 0 0 1 86 50V62', 8), F(tondo(6, 56, 22, 36, 7)), F(tondo(72, 56, 22, 36, 7))] },
  { id: 'timeline', nome: 'Timeline audio', gruppo: 'Podcast', vb: [100, 30], w: 320, colore: 'viola', paths: [S('M4 15H96', 6, { op: 0.3 }), S('M4 15H60', 6), F(cerchio(60, 15, 10))] },
  // --- Linee
  { id: 'linea', nome: 'Linea', gruppo: 'Linee', vb: [100, 10], w: 400, colore: 'viola', paths: [S('M3 5H97', 6)] },
  { id: 'tratteggio', nome: 'Linea tratteggiata', gruppo: 'Linee', vb: [100, 10], w: 400, colore: 'viola', paths: [S('M3 5H97', 5, { dash: [8, 9], cap: 'butt' })] },
  { id: 'sottolineatura', nome: 'Sottolineatura a onda', gruppo: 'Linee', vb: [100, 14], w: 360, colore: 'arancione', paths: [S('M3 8Q15 -2 27 8T51 8T75 8T98 8', 4.5)] },
  // --- Numeri
  { id: 'badge', nome: 'Numero (badge)', gruppo: 'Numeri', vb: [100, 100], w: 120, colore: 'arancione', numero: true, paths: [F(cerchio(50, 50, 50))] },
];

export const ELEM_MAP = Object.fromEntries(ELEMENTI.map((x) => [x.id, x]));

const cache = new Map();
function path2d(d) { if (!cache.has(d)) cache.set(d, new Path2D(d)); return cache.get(d); }

function trasforma(ctx, el, def, W, H) {
  const k = el.w / def.vb[0];
  ctx.translate(el.x * W, el.y * H);
  ctx.rotate(R(el.r || 0));
  ctx.scale(k, k);
  ctx.translate(-def.vb[0] / 2, -def.vb[1] / 2);
}

export function disegnaElemento(ctx, el, W, H, brand) {
  const def = ELEM_MAP[el.tipo];
  if (!def) return;
  const col = brand[el.c] || el.c || '#000';
  ctx.save();
  trasforma(ctx, el, def, W, H);
  ctx.fillStyle = col; ctx.strokeStyle = col;
  for (const p of def.paths) {
    ctx.save();
    if (p.op != null) ctx.globalAlpha = p.op;
    if (p.m === 's') {
      ctx.lineWidth = p.sw; ctx.lineCap = p.cap || 'round'; ctx.lineJoin = p.join || 'round';
      ctx.setLineDash(p.dash || []); ctx.stroke(path2d(p.d));
    } else ctx.fill(path2d(p.d), p.rule || 'nonzero');
    ctx.restore();
  }
  if (def.numero) {
    ctx.fillStyle = el.c === 'bianco' ? brand.viola : '#fff';
    ctx.font = `400 64px ${brand.fTitoli}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(el.n ?? 1), 50, 53);
  }
  ctx.restore();
}

// Il punto (px, py) in coordinate del canvas cade sull'elemento?
export function colpisce(el, px, py, W, H) {
  const def = ELEM_MAP[el.tipo];
  if (!def) return false;
  const k = el.w / def.vb[0];
  const dx = px - el.x * W, dy = py - el.y * H, a = -R(el.r || 0);
  const lx = (dx * Math.cos(a) - dy * Math.sin(a)) / k + def.vb[0] / 2;
  const ly = (dx * Math.sin(a) + dy * Math.cos(a)) / k + def.vb[1] / 2;
  const m = 14 / k; // margine di tocco
  return lx >= -m && lx <= def.vb[0] + m && ly >= -m && ly <= def.vb[1] + m;
}

export function altezzaElemento(el) { const d = ELEM_MAP[el.tipo]; return d ? el.w * d.vb[1] / d.vb[0] : el.w; }
