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

export function disegnaStoria(canvas, p, { cover, profilo = {}, preview = false, scala = 1 } = {}) {
  const o = { ...STORIA_DEF, ...(p.storia || {}) };
  canvas.width = Math.round(STORIA_W * scala); canvas.height = Math.round(STORIA_H * scala);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scala, 0, 0, scala, 0, 0);
  const W = STORIA_W;
  const scuro = o.sfondo === 'viola';
  const bg = brand[o.sfondo] || '#fff';
  const ink = scuro ? '#fff' : brand.viola;
  const acc = o.sfondo === 'giallo' ? brand.viola : brand.arancione;
  const soft = scuro ? 'rgba(255,255,255,.8)' : '#4a3c8a';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, STORIA_H);
  const e = { ctx };

  // triangoli d'angolo, come nei post
  ctx.fillStyle = scuro ? brand.arancione : brand.viola;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, 0); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = scuro ? brand.arancione : brand.arancione;
  ctx.beginPath(); ctx.moveTo(W, STORIA_H); ctx.lineTo(W - 220, STORIA_H); ctx.lineTo(W, STORIA_H - 220); ctx.closePath(); ctx.fill();

  // riga in alto: di chi è il podcast
  const riga = p.tipo === 'mio' ? 'Un mio podcast' : p.cliente ? `Podcast di ${p.cliente}` : 'Nel mio portfolio';
  disegnaTesto(e, { text: riga, fam: 'testi', weight: 700, max: 32, min: 22, maxW: 820, maxLines: 1, lh: 1.3, x: W / 2, y: 290, align: 'center', color: acc });

  // cover
  const cs = 520, cx = (W - cs) / 2, cy = 350;
  ctx.save();
  ctx.shadowColor = 'rgba(46,25,118,.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  roundRect(ctx, cx, cy, cs, cs, 48); ctx.fillStyle = '#ECE8FA'; ctx.fill();
  ctx.restore();
  ctx.save(); roundRect(ctx, cx, cy, cs, cs, 48); ctx.clip();
  if (cover) { ctx.translate(cx, cy); coprire(ctx, cover, cs, cs); }
  else {
    const g = ctx.createLinearGradient(cx, cy, cx + cs, cy + cs); g.addColorStop(0, brand.viola); g.addColorStop(1, brand.lilla);
    ctx.fillStyle = g; ctx.fillRect(cx, cy, cs, cs);
    if (!preview || p.titolo) disegnaTesto(e, { text: p.titolo || '', fam: 'titoli', max: 100, min: 40, maxW: cs - 80, maxLines: 4, lh: 1.05, x: W / 2, y: cy + 120, align: 'center', color: '#fff' });
  }
  ctx.restore();
  if (!cover && preview) { // promemoria solo nell'anteprima
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)'; font(ctx, 'testi', 400, 28); ctx.textAlign = 'center';
    ctx.fillText('(carica la cover nell\'editor)', W / 2, cy + cs - 40); ctx.restore();
  }

  // titolo
  const t = disegnaTesto(e, { text: p.titolo || (preview ? 'Titolo del podcast' : ''), ghost: !p.titolo, fam: 'titoli', max: 104, min: 54, maxW: 900, maxLines: 2, lh: 1.04, x: W / 2, y: 930, align: 'center', color: p.titolo ? ink : soft });
  let y = 930 + t.h + 22;
  ctx.fillStyle = acc; ctx.fillRect(W / 2 - 36, y, 72, 6); y += 36;

  // descrizione breve
  const dc = { fam: 'testi', max: 38, min: 28, maxW: 820, maxLines: 3, lh: 1.42, x: W / 2, align: 'center', color: soft };
  const descr = adatta(e, { ...dc, text: p.breve || '' });
  const d = disegnaTesto(e, { ...dc, text: descr || (preview ? 'Qui compare la descrizione breve del podcast.' : ''), ghost: !descr, y });
  y += d.h + 22;

  // ruolo e data
  const extra = [o.ruolo ? ruoliDi(p).join(' · ') : '', o.data ? p.periodo : ''].filter(Boolean).join('  ·  ');
  if (extra) disegnaTesto(e, { text: extra.toUpperCase(), fam: 'testi', weight: 700, max: 24, min: 18, maxW: 880, maxLines: 2, lh: 1.4, x: W / 2, y, align: 'center', color: acc });

  // invito (pulsante) - lo sticker «Link» di Instagram si mette sotto
  if (o.invito && o.invito.trim()) {
    font(ctx, 'testi', 700, 36);
    const w = Math.min(820, ctx.measureText(o.invito).width + 110), h = 90, x = (W - w) / 2, by = 1470;
    roundRect(ctx, x, by, w, h, 50); ctx.fillStyle = scuro ? '#fff' : brand.viola; ctx.fill();
    ctx.fillStyle = scuro ? brand.viola : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.invito, W / 2, by + h / 2 + 2); ctx.textBaseline = 'alphabetic';
  }

  if (preview) { // guida: zone coperte dall'interfaccia di Instagram (solo anteprima)
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(46,25,118,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(W, 250); ctx.moveTo(0, 1580); ctx.lineTo(W, 1580); ctx.stroke(); ctx.restore();
  }
}
