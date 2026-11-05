// storia.js - disegna la storia Instagram (1080x1920) di un podcast: cover, titolo e breve descrizione.
// Il contenuto sta nella fascia centrale: in alto (~250 px) e in basso (~340 px) Instagram mette la sua interfaccia.
import { brand, roundRect, disegnaTesto, misuraTesto, coprire, font } from './render.js';
import { ruoliDi } from './portfolio-sito.js';

export const STORIA_W = 1080, STORIA_H = 1920;
export const STORIA_SFONDI = { bianco: 'Bianco', viola: 'Viola', giallo: 'Giallo' };
export const STORIA_DEF = { sfondo: 'bianco', ruolo: true, data: true, invito: 'Ascolta ora' };

// Taglia la descrizione (con «…») se non sta nel numero di righe anche col testo più piccolo.
function adatta(e, c) {
  let t = String(c.text || '').trim();
  const parole = t.split(/\s+/);
  while (parole.length > 3 && misuraTesto(e, { ...c, text: t, max: c.min }).lines > c.maxLines) {
    parole.pop(); t = parole.join(' ').replace(/[,;:.\s]+$/, '') + '…';
  }
  return t;
}

export function disegnaStoria(canvas, p, { cover, preview = false, scala = 1 } = {}) {
  const o = { ...STORIA_DEF, ...(p.storia || {}) };
  canvas.width = Math.round(STORIA_W * scala); canvas.height = Math.round(STORIA_H * scala);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scala, 0, 0, scala, 0, 0);
  const W = STORIA_W;
  const scuro = o.sfondo === 'viola';
  const bg = brand[o.sfondo] || '#fff';
  const ink = scuro ? '#fff' : brand.viola;
  const acc = o.sfondo === 'giallo' ? brand.viola : brand.arancione;
  const soft = scuro ? 'rgba(255,255,255,.88)' : '#3d2f7a';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, STORIA_H);
  const e = { ctx };

  // triangoli d'angolo, come nei post
  ctx.fillStyle = scuro ? brand.arancione : brand.viola;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, 0); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = brand.arancione;
  ctx.beginPath(); ctx.moveTo(W, STORIA_H); ctx.lineTo(W - 220, STORIA_H); ctx.lineTo(W, STORIA_H - 220); ctx.closePath(); ctx.fill();

  // riga in alto: di chi è il podcast
  const riga = p.tipo === 'mio' ? 'Un mio podcast' : p.cliente ? `Podcast di ${p.cliente}` : 'Nel mio portfolio';
  disegnaTesto(e, { text: riga, fam: 'testi', weight: 700, max: 34, min: 22, maxW: 860, maxLines: 1, lh: 1.3, x: W / 2, y: 280, align: 'center', color: acc });

  // ---- impaginazione: testo il più grande possibile (e INTERO); la cover si restringe solo se serve
  const titoloTesto = p.titolo || (preview ? 'Titolo del podcast' : '');
  const descTesto = String(p.breve || '').trim();
  const extra = [o.ruolo ? ruoliDi(p).join(' · ') : '', o.data ? p.periodo : ''].filter(Boolean).join('  ·  ');
  const yCover = 340, yFine = 1440; // il contenuto finisce prima del pulsante (y 1470) e dell'interfaccia di Instagram (y 1580)
  const T = { fam: 'titoli', max: 104, min: 54, maxW: 920, maxLines: 2, lh: 1.04, x: W / 2, align: 'center' };
  const prova = (cs, minD) => {
    const t = misuraTesto(e, { ...T, text: titoloTesto });
    const yT = yCover + cs + 56, yD = yT + t.h + 22 + 6 + 40;
    const exH = extra ? 100 : 0;
    const budget = yFine - exH - yD;
    const d = descTesto ? misuraTesto(e, { fam: 'testi', max: 54, min: minD, maxW: 900, maxLines: 99, lh: 1.4, maxH: budget, text: descTesto }) : { h: 0, size: 54 };
    return { cs, yT, yD, budget, tH: t.h, ok: !descTesto || d.h <= budget };
  };
  let L = null, minD = 30;
  scelta: for (const m of [50, 44, 38, 34, 30]) for (let cs = 560; cs >= 360; cs -= 20) { const r = prova(cs, m); if (r.ok) { L = r; minD = m; break scelta; } }
  let descFinale = descTesto;
  if (!L) { // testo lunghissimo: taglia solo come ultima risorsa, al corpo minimo
    L = prova(360, 30); minD = 30;
    descFinale = adatta(e, { fam: 'testi', max: 30, min: 30, maxW: 900, maxLines: Math.max(3, Math.floor(L.budget / (30 * 1.4))), lh: 1.4, text: descTesto });
  }
  const cs = L.cs, cx = (W - cs) / 2, cy = yCover;

  // cover
  ctx.save();
  ctx.shadowColor = 'rgba(46,25,118,.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  roundRect(ctx, cx, cy, cs, cs, 48); ctx.fillStyle = '#ECE8FA'; ctx.fill();
  ctx.restore();
  ctx.save(); roundRect(ctx, cx, cy, cs, cs, 48); ctx.clip();
  if (cover) { ctx.translate(cx, cy); coprire(ctx, cover, cs, cs); }
  else {
    const g = ctx.createLinearGradient(cx, cy, cx + cs, cy + cs); g.addColorStop(0, brand.viola); g.addColorStop(1, brand.lilla);
    ctx.fillStyle = g; ctx.fillRect(cx, cy, cs, cs);
    if (p.titolo) disegnaTesto(e, { text: p.titolo, fam: 'titoli', max: 100, min: 40, maxW: cs - 80, maxLines: 4, lh: 1.05, x: W / 2, y: cy + cs * 0.22, align: 'center', color: '#fff' });
  }
  ctx.restore();
  if (!cover && preview) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)'; font(ctx, 'testi', 400, 28); ctx.textAlign = 'center';
    ctx.fillText('(carica la cover nell\'editor)', W / 2, cy + cs - 30); ctx.restore();
  }

  // titolo, barretta, descrizione intera
  disegnaTesto(e, { ...T, text: titoloTesto, ghost: !p.titolo, y: L.yT, color: p.titolo ? ink : soft });
  const yBar = L.yT + L.tH + 22;
  ctx.fillStyle = acc; ctx.fillRect(W / 2 - 40, yBar, 80, 7);
  const d = disegnaTesto(e, { fam: 'testi', max: 54, min: minD, maxW: 900, maxLines: 99, lh: 1.4, maxH: L.budget, x: W / 2, align: 'center', y: L.yD,
    text: descFinale || (preview ? 'Qui compare la descrizione breve del podcast.' : ''), ghost: !descFinale, color: soft });
  if (extra) disegnaTesto(e, { text: extra.toUpperCase(), fam: 'testi', weight: 700, max: 30, min: 20, maxW: 920, maxLines: 2, lh: 1.35, x: W / 2, y: L.yD + d.h + 26, align: 'center', color: acc });

  // invito (pulsante) - lo sticker «Link» di Instagram si mette sotto
  if (o.invito && o.invito.trim()) {
    font(ctx, 'testi', 700, 38);
    const w = Math.min(860, ctx.measureText(o.invito).width + 120), h = 96, x = (W - w) / 2, by = 1470;
    roundRect(ctx, x, by, w, h, 48); ctx.fillStyle = scuro ? '#fff' : brand.viola; ctx.fill();
    ctx.fillStyle = scuro ? brand.viola : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.invito, W / 2, by + h / 2 + 2); ctx.textBaseline = 'alphabetic';
  }

  if (preview) { // guida: zone coperte dall'interfaccia di Instagram (solo anteprima)
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(46,25,118,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(W, 250); ctx.moveTo(0, 1580); ctx.lineTo(W, 1580); ctx.stroke(); ctx.restore();
  }
}
