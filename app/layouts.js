// layouts.js - CATALOGO dei template (tipi di slide) di DomePodcast Studio.
// Ogni layout: id, nome, descrizione, valori iniziali (sfondo, accento, intestazione), campi di testo,
// opzioni, foto (se ha uno spazio per la foto) e draw(e, s). Nessun layout inserisce elementi grafici da solo (elementiIniziali, facoltativo, non è usato).
//  - e = contesto di disegno (vedi creaContesto in render.js): e.ctx, e.W, e.top, e.bottom, e.s (scala verticale), e.y(v)
//    (y in coordinate 1350 -> y reale), e.ink / e.dark / e.deco / e.acc / e.sec (colori in base a sfondo e accento).
//  - Usa disegnaTesto per i testi (dimensione adattiva) e testo(e, s, 'campo', 'segnaposto') per i valori:
//    il segnaposto compare SOLO nell'anteprima e non viene mai esportato.
// Per un nuovo template: aggiungi un oggetto a LAYOUTS (non modificare gli esistenti) e rispetta i formati (e.top/e.bottom).
import { disegnaTesto, misuraTesto, disegnaFotoSlide } from './render.js';
import { disegnaElemento } from './elementi.js';
import { brand } from './render.js';

// Valore di un campo: se è vuoto, nell'anteprima mostra il segnaposto (sbiadito); nell'export niente.
function testo(e, s, k, seg) {
  const v = (s.campi && s.campi[k]) || '';
  if (v.trim()) return { text: v, ghost: false };
  return e.preview ? { text: seg, ghost: true } : { text: '', ghost: false };
}
const opz = (s, k, def) => (s.opz && k in s.opz ? s.opz[k] : def);

function triangolo(e, punti, colore) {
  const c = e.ctx; c.fillStyle = colore || e.deco;
  c.beginPath(); c.moveTo(punti[0][0], punti[0][1]);
  for (let i = 1; i < punti.length; i++) c.lineTo(punti[i][0], punti[i][1]);
  c.closePath(); c.fill();
}
const angoloAlto = (e, lato) => triangolo(e, [[0, e.top], [lato, e.top], [0, e.top + lato]]);
const angoloBasso = (e, lato, h = lato) => triangolo(e, [[e.W, e.bottom - h], [e.W, e.bottom], [e.W - lato, e.bottom]]);

function freccia(e, x, y, w, colore) {
  disegnaElemento(e.ctx, { tipo: 'freccia-destra', x: x / e.W, y: y / e.H, w, r: 0, c: colore }, e.W, e.H, brand);
}
const coloreFreccia = (e) => (e.bgKey !== 'bianco' ? 'bianco' : e.slide.accento === 'viola' ? 'arancione' : 'viola');

export const LAYOUTS = [
  {
    id: 'copertina', nome: 'Copertina con triangolo',
    descrizione: 'Triangolo diagonale in alto a sinistra, titolo maiuscolo a destra, foto, sottotitolo e freccia per scorrere.',
    sfondo: 'bianco', accento: 'arancione', intestazione: false, foto: {},
    campi: [
      { k: 'titolo', label: 'Titolo (colore scuro)', tipo: 'area', seg: 'Titolo della' },
      { k: 'titolo2', label: 'Titolo, seconda parte (colore chiaro)', tipo: 'area', seg: 'copertina qui' },
      { k: 'sottotitolo', label: 'Sottotitolo', tipo: 'area', seg: 'Sottotitolo o breve descrizione' },
      { k: 'invito', label: 'Invito (es. Sbircia!)', tipo: 'testo', seg: 'Sbircia!' },
    ],
    opzioni: [{ k: 'foto', label: 'Mostra la foto', def: true }, { k: 'freccia', label: 'Mostra la freccia', def: true }],
    draw(e, s) {
      const { W } = e;
      angoloAlto(e, W * 0.667);
      const conFoto = opz(s, 'foto', true);
      const t = disegnaTesto(e, {
        parts: [{ ...testo(e, s, 'titolo', 'Titolo della'), color: e.dark }, { ...testo(e, s, 'titolo2', 'copertina qui'), color: e.sec }],
        fam: 'titoli', max: 116, min: 44, maxW: W - 215, maxLines: conFoto ? 5 : 7, maxH: (conFoto ? 400 : 690) * e.s,
        lh: 1.04, x: W - 105, y: e.y(215), align: 'right',
      });
      let yPos = e.y(215) + t.h + 40 * e.s;
      if (conFoto) {
        const sz = Math.min(550, e.ch * 0.41);
        disegnaFotoSlide(e, s, { x: 108, y: e.y(600), w: sz, h: sz }, false);
        yPos = e.y(595);
      }
      const colW = conFoto ? 340 : 840;
      const sub = disegnaTesto(e, { ...testo(e, s, 'sottotitolo', 'Sottotitolo o breve descrizione'), fam: 'testi', max: 47, min: 26, maxW: colW, maxLines: 6, maxH: 340 * e.s, lh: 1.25, x: W - 50, y: yPos, align: 'right', color: e.dark });
      const yInv = conFoto ? e.y(985) : yPos + sub.h + 30 * e.s;
      disegnaTesto(e, { ...testo(e, s, 'invito', 'Sbircia!'), fam: 'testi', max: 44, min: 26, maxW: 330, maxLines: 1, lh: 1.3, x: W - 130, y: yInv, align: 'right', color: e.ink });
      if (opz(s, 'freccia', true)) freccia(e, 857, e.y(1112), 285, coloreFreccia(e));
    },
  },
  {
    id: 'singolo', nome: 'Post singolo illustrato',
    descrizione: 'Triangolo viola, titolo a due colori e invito. Le illustrazioni si aggiungono dagli elementi grafici.',
    sfondo: 'bianco', accento: 'viola', intestazione: false,
    campi: [
      { k: 'titolo', label: 'Titolo, prima parte (colore chiaro)', tipo: 'area', seg: 'Prima parte\ndel titolo,' },
      { k: 'titolo2', label: 'Titolo, seconda parte (colore scuro)', tipo: 'area', seg: 'seconda parte\ndel titolo' },
      { k: 'invito', label: 'Invito (es. Leggi la caption!)', tipo: 'testo', seg: 'Leggi la caption!' },
    ],
    opzioni: [],
    draw(e, s) {
      const { W } = e;
      angoloAlto(e, W * 0.667);
      disegnaTesto(e, {
        parts: [{ ...testo(e, s, 'titolo', 'Prima parte\ndel titolo,'), color: e.sec }, { ...testo(e, s, 'titolo2', 'seconda parte\ndel titolo'), color: e.dark }],
        fam: 'titoli', max: 100, min: 40, maxW: W - 256, maxLines: 8, maxH: 660 * e.s, lh: 1.05, x: W - 128, y: e.y(265), align: 'right',
      });
      disegnaTesto(e, { ...testo(e, s, 'invito', 'Leggi la caption!'), fam: 'testi', max: 44, min: 26, maxW: 560, maxLines: 1, lh: 1.3, x: W - 140, y: e.y(935), align: 'right', color: e.sec });
    },
  },
  {
    id: 'testo', nome: 'Testo con titolo',
    descrizione: 'Intestazione, titolo e corpo del testo allineati a sinistra, triangolo in basso a destra.',
    sfondo: 'bianco', accento: 'arancione', intestazione: true,
    campi: [
      { k: 'titolo', label: 'Titolo', tipo: 'testo', seg: 'Titolo della slide?' },
      { k: 'corpo', label: 'Testo', tipo: 'area', seg: 'Qui va il corpo del testo, allineato a sinistra. Frasi brevi e dirette, scritte come le diresti a voce.' },
    ],
    opzioni: [],
    draw(e, s) {
      const { W } = e;
      const t = disegnaTesto(e, { ...testo(e, s, 'titolo', 'Titolo della slide?'), fam: 'testi', weight: 700, max: 64, min: 34, maxW: W - 216, maxLines: 3, lh: 1.2, x: 116, y: e.y(250), color: e.ink });
      const y = Math.max(e.y(420), e.y(250) + t.h + 60 * e.s);
      disegnaTesto(e, { ...testo(e, s, 'corpo', 'Qui va il corpo del testo, allineato a sinistra. Frasi brevi e dirette, scritte come le diresti a voce.'), fam: 'testi', max: 46, min: 22, maxW: W - 250, maxH: e.bottom - y - 130, lh: 1.33, x: 116, y, color: e.ink });
      angoloBasso(e, 285);
    },
  },
  {
    id: 'solotesto', nome: 'Solo testo',
    descrizione: 'Testo lungo senza titolo, margini stretti, triangolo piccolo in basso a destra.',
    sfondo: 'bianco', accento: 'viola', intestazione: true,
    campi: [{ k: 'corpo', label: 'Testo', tipo: 'area', seg: 'Prima riga di testo\n\nSecondo blocco:\naltre righe di testo che vanno a capo.' }],
    opzioni: [],
    draw(e, s) {
      const { W } = e;
      const y = e.y(330);
      disegnaTesto(e, { ...testo(e, s, 'corpo', 'Prima riga di testo\n\nSecondo blocco:\naltre righe di testo che vanno a capo.'), fam: 'testi', max: 45, min: 22, maxW: W - 160, maxH: e.bottom - y - 150, lh: 1.4, x: 40, y, color: e.dark });
      angoloBasso(e, 270);
    },
  },
  {
    id: 'piena', nome: 'Slide piena a colore',
    descrizione: 'Sfondo pieno, testo bianco grande con nota piccola e punta bianca sul bordo destro.',
    sfondo: 'giallo', accento: 'arancione', intestazione: true,
    campi: [
      { k: 'titolo', label: 'Testo grande', tipo: 'area', seg: "Una domanda o un'idea forte, scritta grande?\n\nScopriamolo insieme!" },
      { k: 'nota', label: 'Nota piccola (facoltativa)', tipo: 'area', seg: '(una nota piccola tra parentesi)' },
    ],
    opzioni: [],
    draw(e, s) {
      const { W } = e;
      const big = { ...testo(e, s, 'titolo', "Una domanda o un'idea forte, scritta grande?\n\nScopriamolo insieme!"), fam: 'testi', max: 63, min: 28, maxW: W - 240, maxH: 640 * e.s, lh: 1.42, x: 118, color: '#fff' };
      const nota = { ...testo(e, s, 'nota', '(una nota piccola tra parentesi)'), fam: 'testi', max: 34, min: 18, maxW: W - 320, maxH: 150 * e.s, lh: 1.35, x: 118, color: '#fff' };
      const hb = misuraTesto(e, big).h, hn = misuraTesto(e, nota).h;
      const tot = hb + (hn ? 30 * e.s : 0) + hn;
      const y0 = Math.max(e.y(240), e.y(790) - tot / 2);
      disegnaTesto(e, { ...big, y: y0 });
      disegnaTesto(e, { ...nota, y: y0 + hb + 30 * e.s });
      const mid = e.top + e.ch / 2;
      triangolo(e, [[W - 140, mid], [W, mid - 80], [W, mid + 80]], e.bgKey === 'bianco' ? e.deco : '#fff');
    },
  },
  {
    id: 'chiusura', nome: 'Chiusura con foto',
    descrizione: 'Foto al centro (anche a strisce, con handle in verticale) e invito a scrivere nei commenti.',
    sfondo: 'bianco', accento: 'arancione', intestazione: false, foto: { strisce: true },
    campi: [{ k: 'invito', label: 'Invito', tipo: 'area', seg: 'Hai una curiosità?\n\nChiedilo nei commenti!' }],
    opzioni: [{ k: 'handle', label: "Mostra l'handle in verticale (con le strisce)", def: true }],
    draw(e, s) {
      const { W } = e, ctx = e.ctx;
      const strisce = !!(s.foto && s.foto.strisce);
      const bw = strisce ? 310 : 640, bh = Math.min(575 * e.s, e.ch * 0.45);
      const bx = strisce ? W / 2 - bw / 2 - 20 : (W - bw) / 2, by = e.y(208);
      disegnaFotoSlide(e, s, { x: bx, y: by, w: bw, h: bh }, true);
      if (strisce && opz(s, 'handle', true) && e.profilo.handle) {
        ctx.save();
        ctx.fillStyle = e.ink; ctx.font = `400 38px ${brand.fTesti}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.translate(bx + bw + 38, by + bh - 70 * e.s); ctx.rotate(-Math.PI / 2);
        ctx.fillText(e.profilo.handle, 0, 0);
        ctx.restore();
      }
      const y = by + bh + 42 * e.s;
      disegnaTesto(e, { ...testo(e, s, 'invito', 'Hai una curiosità?\n\nChiedilo nei commenti!'), fam: 'testi', max: 57, min: 26, maxW: W - 140, maxH: e.bottom - y - 50, lh: 1.72, x: W / 2, y, align: 'center', color: e.ink });
    },
  },
  {
    id: 'fototesto', nome: 'Foto e testo',
    descrizione: 'Foto grande con angoli tondi e bordi sfumati, titolo e testo sotto.',
    sfondo: 'bianco', accento: 'arancione', intestazione: true, foto: {},
    campi: [
      { k: 'titolo', label: 'Titolo', tipo: 'testo', seg: 'Titolo accanto alla foto' },
      { k: 'corpo', label: 'Testo', tipo: 'area', seg: 'Una o due frasi per raccontare la foto e il contesto.' },
    ],
    opzioni: [],
    draw(e, s) {
      const { W } = e;
      const bh = Math.min(560 * e.s, e.ch * 0.42), by = e.y(210);
      disegnaFotoSlide(e, s, { x: 90, y: by, w: W - 180, h: bh }, false);
      const y = by + bh + 36 * e.s;
      const t = disegnaTesto(e, { ...testo(e, s, 'titolo', 'Titolo accanto alla foto'), fam: 'testi', weight: 700, max: 60, min: 30, maxW: W - 180, maxLines: 2, lh: 1.2, x: 90, y, color: e.ink });
      const y2 = y + t.h + 18 * e.s;
      disegnaTesto(e, { ...testo(e, s, 'corpo', 'Una o due frasi per raccontare la foto e il contesto.'), fam: 'testi', max: 40, min: 22, maxW: W - 220, maxH: e.bottom - y2 - 70, lh: 1.4, x: 90, y: y2, color: e.dark });
      angoloBasso(e, 200);
    },
  },
  {
    id: 'elenco', nome: 'Elenco numerato',
    descrizione: 'Titolo e fino a 5 punti con badge numerati (adatto a "errore #1, #2, #3").',
    sfondo: 'bianco', accento: 'arancione', intestazione: true,
    campi: [
      { k: 'titolo', label: 'Titolo', tipo: 'testo', seg: "Titolo dell'elenco" },
      { k: 'p1', label: 'Punto 1', tipo: 'testo', seg: "Primo punto dell'elenco" },
      { k: 'p2', label: 'Punto 2', tipo: 'testo', seg: 'Secondo punto' },
      { k: 'p3', label: 'Punto 3', tipo: 'testo', seg: 'Terzo punto' },
      { k: 'p4', label: 'Punto 4 (facoltativo)', tipo: 'testo', seg: '' },
      { k: 'p5', label: 'Punto 5 (facoltativo)', tipo: 'testo', seg: '' },
    ],
    opzioni: [],
    draw(e, s) {
      const { W, ctx } = e;
      disegnaTesto(e, { ...testo(e, s, 'titolo', "Titolo dell'elenco"), fam: 'testi', weight: 700, max: 64, min: 34, maxW: W - 200, maxLines: 2, lh: 1.2, x: 100, y: e.y(250), color: e.ink });
      let voci = ['p1', 'p2', 'p3', 'p4', 'p5'].map((k) => ({ k, ...testo(e, s, k, '') })).filter((v) => v.text.trim());
      if (!voci.length && e.preview) voci = [["Primo punto dell'elenco"], ['Secondo punto'], ['Terzo punto']].map(([t]) => ({ text: t, ghost: true }));
      if (!voci.length) return;
      const y0 = e.y(430), disp = e.bottom - 170 - y0;
      const passo = Math.min(230 * e.s, disp / voci.length);
      const r = Math.min(55, passo * 0.4);
      voci.forEach((v, i) => {
        const cy = y0 + passo * i + passo / 2;
        ctx.save(); if (v.ghost) ctx.globalAlpha = 0.5;
        ctx.fillStyle = e.deco; ctx.beginPath(); ctx.arc(100 + r, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = e.bgKey === e.slide.accento ? brand.viola : '#fff';
        ctx.font = `400 ${r * 1.3}px ${brand.fTitoli}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), 100 + r, cy + r * 0.06);
        ctx.restore();
        const c = { text: v.text, ghost: v.ghost, fam: 'testi', max: 44, min: 22, maxW: W - 100 - 2 * r - 34 - 80, maxLines: 3, lh: 1.3, x: 100 + 2 * r + 34, color: e.dark };
        const h = misuraTesto(e, c).h;
        disegnaTesto(e, { ...c, y: cy - h / 2 });
      });
      angoloBasso(e, 285);
    },
  },
];

export const LAYOUT_MAP = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));
