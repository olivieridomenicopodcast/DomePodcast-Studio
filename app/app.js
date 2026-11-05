// app.js - interfaccia di DomePodcast Studio: crea slide, anteprima live, elementi trascinabili, export, brief.
import { BUILD } from './build.js';
import { FORMATI, COLORI, NOMI_COLORI, brand, readBrand, loadFonts, disegnaSlide, ritagliaBarreNere } from './render.js';
import { LAYOUTS, LAYOUT_MAP } from './layouts.js';
import { ELEMENTI, ELEM_MAP, GRUPPI, disegnaElemento, colpisce } from './elementi.js';
import { zipStore } from './zip.js';
import { fotoSalva, fotoLeggi, fotoElimina, fotoSvuota } from './idb.js';
import { $, uid, esc, clamp, pausa, toast, processaFoto, scaricaBlob, condividiFile } from './util.js';
import { avviaPortfolio } from './portfolio.js';

const KEY = 'dps-stato-v1';

const PROFILO = { handle: '@domenicoolivieri_', nome: 'Domenico Olivieri', descr: 'Podcast coach, editor e sound designer' };
const SFONDI = ['bianco', 'giallo', 'arancione', 'viola', 'lilla'];

function nuovaSlide(layoutId) {
  const L = LAYOUT_MAP[layoutId] || LAYOUTS[0];
  return {
    id: uid(), layout: L.id, campi: {}, opz: {}, sfondo: L.sfondo, accento: L.accento, intestazione: L.intestazione,
    foto: L.foto ? { id: null, modo: 'riempi', fondi: false, bordi: true, strisce: false, ...L.foto } : null,
    elementi: (L.elementiIniziali || []).map((x) => ({ id: uid(), n: 1, dietro: false, ...x })),
  };
}

function leggiStato() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.slides) && s.slides.length && FORMATI[s.formato]) {
      s.profilo = { ...PROFILO, ...(s.profilo || {}) };
      s.slides = s.slides.filter((x) => LAYOUT_MAP[x.layout]);
      s.slides.forEach((x) => { x.campi ||= {}; x.opz ||= {}; x.elementi ||= []; });
      if (s.slides.length) return s;
    }
  } catch { /* stato assente o rovinato: si riparte */ }
  return { v: 1, formato: 'carosello', profilo: { ...PROFILO }, slides: [nuovaSlide('copertina'), nuovaSlide('testo'), nuovaSlide('chiusura')] };
}

let st = leggiStato();
let selEl = null; // { slide, el }
const immagini = new Map(); // id foto -> ImageBitmap
let logo = null;
const aperti = new Set();
const chiusi = new Set(); // sezioni «Testi» chiuse a mano (di default sono aperte)

let tSalva;
function salva() {
  clearTimeout(tSalva);
  tSalva = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* spazio finito */ } }, 250);
}
addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} });


const slideById = (id) => st.slides.find((s) => s.id === id);
const fmt = () => FORMATI[st.formato];

/* ---------- foto ---------- */

async function caricaImmagine(id) {
  if (!id || immagini.has(id)) return;
  const blob = await fotoLeggi(id);
  if (blob) { try { immagini.set(id, await createImageBitmap(blob)); } catch { /* file rovinato */ } }
}

function caricaLogo() {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'brand/logo/ufficiale/logo-ufficiale.svg'; });
}

/* ---------- disegno ---------- */

function opzioniDisegno(s, preview) {
  return {
    formato: st.formato, layouts: LAYOUTS, profilo: st.profilo, preview, scala: preview ? 0.75 : 1,
    imgs: { foto: s.foto && s.foto.id ? immagini.get(s.foto.id) : null, profilo: immagini.get('profilo'), logo },
  };
}
function ridisegna(s) {
  const c = $(`canvas.anteprima[data-id="${s.id}"]`);
  if (c) disegnaSlide(c, s, opzioniDisegno(s, true));
}
const ridisegnaTutte = () => st.slides.forEach(ridisegna);

/* ---------- interfaccia: Crea ---------- */

function htmlCampo(s, c) {
  const v = esc(s.campi[c.k] || '');
  const ph = esc(String(c.seg || '').replace(/\n/g, ' '));
  return `<label class="campo"><span>${esc(c.label)}</span>${c.tipo === 'area'
    ? `<textarea rows="3" data-k="${c.k}" placeholder="${ph}">${v}</textarea>`
    : `<input type="text" data-k="${c.k}" value="${v}" placeholder="${ph}">`}</label>`;
}

function chipsColore(act, attivo, lista = COLORI) {
  return `<div class="chips">${lista.map((c) => `<button type="button" class="sw ${c === attivo ? 'on' : ''}" data-act="${act}" data-v="${c}" style="background:${brand[c]}" aria-label="${NOMI_COLORI[c]}" title="${NOMI_COLORI[c]}"></button>`).join('')}</div>`;
}

function htmlPannelloEl(s, el) {
  const def = ELEM_MAP[el.tipo];
  const r = (prop, lab, min, max, step, val, unit) => `<label class="campo"><span>${lab}: <b data-v-out="${prop}">${val}</b>${unit}</span><input type="range" data-eprop="${prop}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  return `<div class="pannello" data-el="${el.id}">
    <b>${esc(def.nome)}</b>
    <div class="campo"><span>Colore</span>${chipsColore('el-col', el.c)}</div>
    ${r('w', 'Dimensione', 20, 1400, 2, Math.round(el.w), ' px')}
    ${r('r', 'Rotazione', -180, 180, 1, Math.round(el.r || 0), '°')}
    <div class="xy">${r('x', 'Posizione orizzontale', 0, 100, 0.5, +(el.x * 100).toFixed(1), '%')}${r('y', 'Posizione verticale', 0, 100, 0.5, +(el.y * 100).toFixed(1), '%')}</div>
    <div class="riga-btn"><span class="nota">Sposta di poco:</span>
      <button type="button" class="ico" data-act="nudge" data-dx="-1" data-dy="0">◀</button><button type="button" class="ico" data-act="nudge" data-dx="1" data-dy="0">▶</button>
      <button type="button" class="ico" data-act="nudge" data-dx="0" data-dy="-1">▲</button><button type="button" class="ico" data-act="nudge" data-dx="0" data-dy="1">▼</button></div>
    ${def.numero ? `<label class="campo"><span>Numero</span><input type="text" inputmode="numeric" data-eprop="n" value="${esc(el.n ?? 1)}"></label>` : ''}
    <div class="riga-btn">
      <button type="button" class="btn sec piccolo" data-act="el-dup">Duplica</button>
      <button type="button" class="btn sec piccolo" data-act="el-del">Elimina</button>
      <button type="button" class="btn sec piccolo" data-act="el-livello" data-v="su">Livello su</button>
      <button type="button" class="btn sec piccolo" data-act="el-livello" data-v="giu">Livello giù</button>
      <button type="button" class="btn sec piccolo" data-act="el-dietro">${el.dietro ? 'Porta davanti al testo' : 'Porta dietro al testo'}</button>
    </div></div>`;
}

function htmlCard(s, i) {
  const L = LAYOUT_MAP[s.layout], multi = fmt().multi, n = st.slides.length;
  const sel = selEl && selEl.slide === s.id ? s.elementi.find((x) => x.id === selEl.el) : null;
  const ap = (nome) => ((nome === 'testi' ? !chiusi.has(`${s.id}:testi`) : aperti.has(`${s.id}:${nome}`)) ? 'open' : '');
  const f = s.foto;
  return `<article class="card" data-id="${s.id}">
  <div class="card-top"><b>${multi ? 'Slide ' + (i + 1) : 'Post'}</b>
    <select data-act="layout" aria-label="Tipo di slide">${LAYOUTS.map((l) => `<option value="${l.id}" ${l.id === s.layout ? 'selected' : ''}>${esc(l.nome)}</option>`).join('')}</select>
    ${multi ? `<button type="button" class="ico" data-act="su" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button><button type="button" class="ico" data-act="giu" ${i === n - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button><button type="button" class="ico" data-act="dup" aria-label="Duplica">⧉</button>` : ''}
    <button type="button" class="ico" data-act="scarica-una" aria-label="Scarica questa slide">⬇</button>
    ${n > 1 ? '<button type="button" class="ico" data-act="del" aria-label="Elimina">✕</button>' : ''}</div>
  <canvas class="anteprima" data-id="${s.id}" style="touch-action:${sel ? 'none' : 'pan-y'}"></canvas>
  <details data-sec="testi" ${ap('testi')}><summary>Testi</summary>${L.campi.map((c) => htmlCampo(s, c)).join('')}
    ${(L.opzioni || []).map((o) => `<label class="spunta"><input type="checkbox" data-opz="${o.k}" ${(o.k in s.opz ? s.opz[o.k] : o.def) ? 'checked' : ''}> ${esc(o.label)}</label>`).join('')}</details>
  <details data-sec="stile" ${ap('stile')}><summary>Sfondo e stile</summary>
    <div class="campo"><span>Sfondo</span>${chipsColore('sfondo', s.sfondo, SFONDI)}</div>
    <div class="campo"><span>Colore di titoli e triangoli</span>${chipsColore('accento', s.accento)}</div>
    <label class="spunta"><input type="checkbox" data-prop="intestazione" ${s.intestazione ? 'checked' : ''}> Intestazione col profilo (foto tonda, nome, descrizione)</label></details>
  ${f ? `<details data-sec="foto" ${ap('foto')}><summary>Foto</summary>
    <div class="riga-btn"><label class="btn sec piccolo file">${f.id ? 'Cambia foto' : 'Scegli dalla galleria'}<input type="file" accept="image/*" data-foto hidden></label>
      ${f.id ? '<button type="button" class="btn sec piccolo" data-act="foto-del">Rimuovi</button>' : ''}</div>
    <label class="campo"><span>Adattamento</span><select data-fprop="modo"><option value="riempi" ${f.modo === 'riempi' ? 'selected' : ''}>Riempi il riquadro</option><option value="intera" ${f.modo === 'intera' ? 'selected' : ''}>Foto intera</option></select></label>
    <label class="spunta"><input type="checkbox" data-fprop="bordi" ${f.bordi !== false ? 'checked' : ''}> Angoli tondi e bordi sfumati</label>
    <label class="spunta"><input type="checkbox" data-fprop="fondi" ${f.fondi ? 'checked' : ''}> Sfondo chiaro che si fonde</label>
    ${'strisce' in (L.foto || {}) ? `<label class="spunta"><input type="checkbox" data-fprop="strisce" ${f.strisce ? 'checked' : ''}> Foto a strisce</label>` : ''}
    <p class="nota">Le barre nere ai bordi vengono tolte da sole.</p></details>` : ''}
  <details data-sec="elementi" ${ap('elementi')}><summary>Elementi grafici (${s.elementi.length})</summary>
    <button type="button" class="btn sec piccolo" data-act="el-aggiungi">+ Aggiungi elemento</button>
    <div class="lista-el">${s.elementi.map((x) => `<button type="button" class="chip ${sel && sel.id === x.id ? 'on' : ''}" data-act="el-sel" data-el="${x.id}">${esc(ELEM_MAP[x.tipo]?.nome || x.tipo)}</button>`).join('')}</div>
    ${s.elementi.length ? '<p class="nota">Tocca un elemento (nell\'anteprima o qui) per selezionarlo, poi trascinalo col dito.</p>' : ''}
    ${sel ? htmlPannelloEl(s, sel) : ''}</details>
  </article>`;
}

function renderSlides() {
  const F = fmt();
  $('#slides').innerHTML = st.slides.map(htmlCard).join('');
  $('.aggiungi').style.display = F.multi ? '' : 'none';
  ridisegnaTutte();
  salva();
}
function rifaiCard(s) {
  const el = $(`.card[data-id="${s.id}"]`);
  if (!el) return renderSlides();
  const t = document.createElement('div'); t.innerHTML = htmlCard(s, st.slides.indexOf(s));
  el.replaceWith(t.firstElementChild);
  ridisegna(s); salva();
}

function renderFormati() {
  $('#formati').innerHTML = Object.entries(FORMATI).map(([k, f]) => `<button type="button" class="chip ${k === st.formato ? 'on' : ''}" data-fmt="${k}">${f.label}</button>`).join('');
}

/* ---------- eventi sulle slide ---------- */

const slidesEl = $('#slides');
slidesEl.addEventListener('toggle', (ev) => {
  const d = ev.target, card = d.closest('.card');
  if (!card || !d.dataset.sec) return;
  const k = `${card.dataset.id}:${d.dataset.sec}`;
  if (d.dataset.sec === 'testi') { if (d.open) chiusi.delete(k); else chiusi.add(k); }
  else if (d.open) aperti.add(k); else aperti.delete(k);
}, true);

function elemSel(s) { return selEl && selEl.slide === s.id ? s.elementi.find((x) => x.id === selEl.el) : null; }

slidesEl.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.tagName === 'SELECT') return;
  const card = b.closest('.card'); const s = slideById(card.dataset.id); const act = b.dataset.act;
  const i = st.slides.indexOf(s);
  if (act === 'su' || act === 'giu') {
    const j = act === 'su' ? i - 1 : i + 1; if (j < 0 || j >= st.slides.length) return;
    [st.slides[i], st.slides[j]] = [st.slides[j], st.slides[i]]; renderSlides();
  } else if (act === 'dup') {
    const c = JSON.parse(JSON.stringify(s)); c.id = uid(); c.elementi.forEach((x) => { x.id = uid(); });
    if (c.foto && c.foto.id) { c.foto.id = 'f-' + uid(); const bl = await fotoLeggi(s.foto.id); if (bl) { await fotoSalva(c.foto.id, bl); await caricaImmagine(c.foto.id); } }
    st.slides.splice(i + 1, 0, c); renderSlides();
  } else if (act === 'del') {
    if (!confirm('Eliminare questa slide?')) return;
    if (s.foto && s.foto.id) { fotoElimina(s.foto.id); immagini.delete(s.foto.id); }
    st.slides.splice(i, 1); if (selEl && selEl.slide === s.id) selEl = null; renderSlides();
  } else if (act === 'scarica-una') {
    const blob = await rendiPNG(s); scaricaBlob(blob, nomeFile(i)); toast('Immagine salvata nei Download');
  } else if (act === 'sfondo' || act === 'accento') {
    s[act] = b.dataset.v; rifaiCard(s);
  } else if (act === 'foto-del') {
    if (s.foto.id) { fotoElimina(s.foto.id); immagini.delete(s.foto.id); s.foto.id = null; } rifaiCard(s);
  } else if (act === 'el-aggiungi') {
    apriPicker(s);
  } else if (act === 'el-sel') {
    selEl = { slide: s.id, el: b.dataset.el }; rifaiCard(s);
  } else if (act === 'el-col') {
    const e = elemSel(s); if (!e) return; e.c = b.dataset.v; rifaiCard(s);
  } else if (act === 'nudge') {
    const e = elemSel(s); if (!e) return; const F = fmt();
    e.x = clamp(e.x + (+b.dataset.dx * 4) / F.w, 0, 1); e.y = clamp(e.y + (+b.dataset.dy * 4) / F.h, 0, 1); aggiornaSlider(card, e); ridisegna(s); salva();
  } else if (act === 'el-dup') {
    const e = elemSel(s); if (!e) return; const c = { ...e, id: uid(), x: clamp(e.x + 0.04, 0, 1), y: clamp(e.y + 0.03, 0, 1) };
    s.elementi.splice(s.elementi.indexOf(e) + 1, 0, c); selEl = { slide: s.id, el: c.id }; rifaiCard(s);
  } else if (act === 'el-del') {
    const e = elemSel(s); if (!e) return; s.elementi.splice(s.elementi.indexOf(e), 1); selEl = null; rifaiCard(s);
  } else if (act === 'el-livello') {
    const e = elemSel(s); if (!e) return; const k = s.elementi.indexOf(e), j = b.dataset.v === 'su' ? k + 1 : k - 1;
    if (j < 0 || j >= s.elementi.length) return; [s.elementi[k], s.elementi[j]] = [s.elementi[j], s.elementi[k]]; rifaiCard(s);
  } else if (act === 'el-dietro') {
    const e = elemSel(s); if (!e) return; e.dietro = !e.dietro;
    s.elementi.splice(s.elementi.indexOf(e), 1); if (e.dietro) s.elementi.unshift(e); else s.elementi.push(e); rifaiCard(s);
  }
});

function aggiornaSlider(card, e) {
  const F = fmt();
  const val = { w: Math.round(e.w), r: Math.round(e.r || 0), x: +(e.x * 100).toFixed(1), y: +(e.y * 100).toFixed(1) };
  for (const [p, v] of Object.entries(val)) {
    const inp = $(`[data-eprop="${p}"]`, card); if (inp) inp.value = v;
    const out = $(`[data-v-out="${p}"]`, card); if (out) out.textContent = v;
  }
}

slidesEl.addEventListener('input', (ev) => {
  const t = ev.target, card = t.closest('.card'); if (!card) return;
  const s = slideById(card.dataset.id);
  if (t.dataset.k) { s.campi[t.dataset.k] = t.value; ridisegna(s); salva(); }
  else if (t.dataset.eprop) {
    const e = elemSel(s); if (!e) return; const p = t.dataset.eprop;
    if (p === 'n') e.n = t.value;
    else { const v = parseFloat(t.value); e[p] = p === 'x' || p === 'y' ? v / 100 : v; const out = $(`[data-v-out="${p}"]`, card); if (out) out.textContent = v; }
    ridisegna(s); salva();
  }
});

slidesEl.addEventListener('change', async (ev) => {
  const t = ev.target, card = t.closest('.card'); if (!card) return;
  const s = slideById(card.dataset.id);
  if (t.dataset.act === 'layout') {
    const n = nuovaSlide(t.value);
    // tiene i testi con lo stesso nome di campo, la foto, gli elementi e le scelte già fatte
    s.layout = n.layout; s.sfondo = n.sfondo; s.accento = n.accento; s.intestazione = n.intestazione; s.opz = {};
    if (!s.foto && n.foto) s.foto = n.foto; else if (s.foto && n.foto) Object.assign(s.foto, { strisce: n.foto.strisce ?? false });
    if (!s.elementi.length) s.elementi = n.elementi;
    rifaiCard(s);
  } else if (t.dataset.opz) { s.opz[t.dataset.opz] = t.checked; ridisegna(s); salva(); }
  else if (t.dataset.prop) { s[t.dataset.prop] = t.checked; ridisegna(s); salva(); }
  else if (t.dataset.fprop) {
    s.foto[t.dataset.fprop] = t.type === 'checkbox' ? t.checked : t.value; ridisegna(s); salva();
  } else if (t.dataset.foto !== undefined && t.files && t.files[0]) {
    try {
      const { blob, tagliata } = await processaFoto(t.files[0], 1800, true);
      const vecchia = s.foto.id; const id = 'f-' + uid();
      await fotoSalva(id, blob); await caricaImmagine(id);
      if (vecchia) { fotoElimina(vecchia); immagini.delete(vecchia); }
      s.foto.id = id; rifaiCard(s);
      toast(tagliata ? 'Foto caricata (barre nere tolte)' : 'Foto caricata');
    } catch { toast('Non riesco a leggere questa foto'); }
  }
});

/* ---------- trascinamento degli elementi (tocco e mouse) ---------- */

let drag = null;
function coordCanvas(c, ev) { const r = c.getBoundingClientRect(), F = fmt(); return [((ev.clientX - r.left) / r.width) * F.w, ((ev.clientY - r.top) / r.height) * F.h]; }

slidesEl.addEventListener('pointerdown', (ev) => {
  const c = ev.target.closest('canvas.anteprima'); if (!c) return;
  const s = slideById(c.dataset.id), F = fmt(); const [px, py] = coordCanvas(c, ev);
  const davanti = s.elementi.filter((x) => !x.dietro).reverse(), dietro = s.elementi.filter((x) => x.dietro).reverse();
  const hit = [...davanti, ...dietro].find((x) => colpisce(x, px, py, F.w, F.h));
  if (!hit) { drag = { vuoto: true, s, moved: false }; return; }
  if (selEl && selEl.slide === s.id && selEl.el === hit.id) ev.preventDefault();
  try { c.setPointerCapture(ev.pointerId); } catch {}
  drag = { s, el: hit, c, dx: px - hit.x * F.w, dy: py - hit.y * F.h, moved: false, cambiaSel: !(selEl && selEl.slide === s.id && selEl.el === hit.id) };
});
slidesEl.addEventListener('pointermove', (ev) => {
  if (!drag || drag.vuoto || !drag.c) return;
  const F = fmt(); const [px, py] = coordCanvas(drag.c, ev);
  const nx = clamp((px - drag.dx) / F.w, 0, 1), ny = clamp((py - drag.dy) / F.h, 0, 1);
  if (Math.abs(nx - drag.el.x) + Math.abs(ny - drag.el.y) > 0.001) drag.moved = true;
  drag.el.x = nx; drag.el.y = ny;
  const card = drag.c.closest('.card'); if (!drag.cambiaSel && card) aggiornaSlider(card, drag.el);
  ridisegna(drag.s);
});
function fineDrag() {
  if (!drag) return; const d = drag; drag = null;
  if (d.vuoto) { if (selEl && selEl.slide === d.s.id) { selEl = null; rifaiCard(d.s); } return; }
  if (d.cambiaSel) { selEl = { slide: d.s.id, el: d.el.id }; }
  if (d.cambiaSel || d.moved) rifaiCard(d.s); else salva();
}
slidesEl.addEventListener('pointerup', fineDrag);
slidesEl.addEventListener('pointercancel', fineDrag);

/* ---------- selettore elementi ---------- */

let pickerSlide = null;
function apriPicker(s) {
  pickerSlide = s;
  $('#picker-lista').innerHTML = GRUPPI.map((g) => {
    const els = ELEMENTI.filter((e) => e.gruppo === g); if (!els.length) return '';
    return `<h3>${g}</h3><div class="griglia">${els.map((e) => `<button type="button" data-el-tipo="${e.id}"><canvas width="160" height="112" data-prev="${e.id}"></canvas>${esc(e.nome)}</button>`).join('')}</div>`;
  }).join('');
  $('#picker').hidden = false;
  document.querySelectorAll('#picker canvas[data-prev]').forEach((c) => {
    const def = ELEM_MAP[c.dataset.prev], ctx = c.getContext('2d');
    const w = Math.min(140, 100 * (def.vb[0] / def.vb[1]) > 140 ? 140 : 100 * def.vb[0] / def.vb[1]);
    const col = def.colore === 'bianco' ? 'viola' : def.colore;
    disegnaElemento(ctx, { tipo: def.id, x: 0.5, y: 0.5, w: Math.min(w, 100 * def.vb[0] / def.vb[1]), r: 0, c: col, n: 1 }, 160, 112, brand);
  });
}
$('#picker-chiudi').onclick = () => { $('#picker').hidden = true; };
$('#picker').addEventListener('click', (ev) => {
  if (ev.target.id === 'picker') { $('#picker').hidden = true; return; }
  const b = ev.target.closest('[data-el-tipo]'); if (!b || !pickerSlide) return;
  const def = ELEM_MAP[b.dataset.elTipo], F = fmt(), s = pickerSlide;
  const w = Math.min(def.w, F.w * 0.95), h = w * def.vb[1] / def.vb[0], top = F.extra, bot = F.h - F.extra;
  let x = 0.5, y = (top + (bot - top) / 2) / F.h;
  if (def.ancora) {
    x = def.ancora.endsWith('l') ? w / 2 / F.w : 1 - w / 2 / F.w;
    y = def.ancora.startsWith('t') ? (top + h / 2) / F.h : (bot - h / 2) / F.h;
  }
  const el = { id: uid(), tipo: def.id, c: def.colore, x, y, w, r: 0, n: 1, dietro: !!def.ancora };
  if (el.dietro) s.elementi.unshift(el); else s.elementi.push(el);
  selEl = { slide: s.id, el: el.id }; aperti.add(`${s.id}:elementi`);
  $('#picker').hidden = true; rifaiCard(s);
  $(`.card[data-id="${s.id}"] canvas`)?.scrollIntoView({ block: 'nearest' });
});

/* ---------- formato, aggiungi slide ---------- */

$('#formati').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-fmt]'); if (!b) return;
  const nuovo = FORMATI[b.dataset.fmt];
  if (!nuovo.multi && st.slides.length > 1) {
    if (!confirm('Questo formato ha una sola slide: tengo solo la prima e tolgo le altre?')) return;
    st.slides.slice(1).forEach((s) => { if (s.foto && s.foto.id) fotoElimina(s.foto.id); });
    st.slides = st.slides.slice(0, 1);
  }
  st.formato = b.dataset.fmt; selEl = null; renderFormati(); renderSlides();
});
$('#nuovo-layout').innerHTML = LAYOUTS.map((l) => `<option value="${l.id}">${esc(l.nome)}</option>`).join('');
$('#aggiungi').onclick = () => {
  const s = nuovaSlide($('#nuovo-layout').value); st.slides.push(s); renderSlides();
  $(`.card[data-id="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ---------- salvataggio ---------- */

const nomeFile = (i) => `${fmt().sigla}-${String(i + 1).padStart(2, '0')}.png`;
async function rendiPNG(s) {
  await document.fonts.ready;
  const c = document.createElement('canvas');
  disegnaSlide(c, s, opzioniDisegno(s, false)); // preview=false: niente testi di esempio
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
async function tutte() { const out = []; for (let i = 0; i < st.slides.length; i++) out.push({ name: nomeFile(i), blob: await rendiPNG(st.slides[i]) }); return out; }

$('#scarica').onclick = async () => {
  const f = await tutte();
  for (const x of f) { scaricaBlob(x.blob, x.name); await pausa(350); }
  toast(f.length > 1 ? `${f.length} immagini salvate nei Download` : 'Immagine salvata nei Download');
};
$('#condividi').onclick = async () => {
  const f = (await tutte()).map((x) => new File([x.blob], x.name, { type: 'image/png' }));
  await condividiFile(f);
};
$('#zip').onclick = async () => {
  const f = await tutte();
  const files = await Promise.all(f.map(async (x) => ({ name: x.name, data: new Uint8Array(await x.blob.arrayBuffer()) })));
  scaricaBlob(zipStore(files), `${fmt().sigla}.zip`); toast('Zip salvato nei Download');
};

/* ---------- brief per Claude ---------- */

function costruisciBrief() {
  const F = fmt(), L = [];
  const foto = []; // slide con foto, in ordine
  st.slides.forEach((s) => { if (s.foto && s.foto.id) foto.push(s); });
  const numFoto = (s) => foto.indexOf(s) + 1;
  L.push('# Brief da DomePodcast Studio', '');
  L.push(`Formato: ${F.label} (${F.w}×${F.h}) - ${st.slides.length} ${st.slides.length === 1 ? 'slide' : 'slide'}`);
  L.push(`Profilo: ${st.profilo.handle} · ${st.profilo.nome} · ${st.profilo.descr}`, '');
  L.push('Istruzioni:',
    '- Usa i testi ESATTAMENTE come scritti qui sotto, senza riscriverli. Se vedi errori evidenti, segnalali ma non cambiarli.',
    '- Crea le slide con i template di app/layouts.js e gli elementi di app/elementi.js (stessa resa dell\'app).',
    `- Le foto allegate sono numerate (immagine-1, immagine-2…): abbinale alle slide come indicato. Non committarle nel repo.`,
    '- Mostra prima le anteprime in chat e correggi finché Niky non è soddisfatto; poi consegna i PNG (anche in zip).', '');
  st.slides.forEach((s, i) => {
    const l = LAYOUT_MAP[s.layout];
    L.push(`## Slide ${i + 1} - ${l.nome} (layout: ${l.id})`);
    L.push(`Sfondo: ${NOMI_COLORI[s.sfondo]} · Colore titoli/triangoli: ${NOMI_COLORI[s.accento]} · Intestazione profilo: ${s.intestazione ? 'sì' : 'no'}`);
    const testi = l.campi.filter((c) => (s.campi[c.k] || '').trim());
    if (testi.length) { L.push('Testi:'); testi.forEach((c) => L.push(`- ${c.label}: ${(s.campi[c.k]).trim().replace(/\n/g, '\n  ')}`)); }
    else L.push('Testi: (nessuno)');
    (l.opzioni || []).forEach((o) => L.push(`Opzione «${o.label}»: ${(o.k in s.opz ? s.opz[o.k] : o.def) ? 'sì' : 'no'}`));
    if (s.foto && s.foto.id) L.push(`Foto: immagine-${numFoto(s)} (${s.foto.modo === 'intera' ? 'intera' : 'riempi'}${s.foto.bordi === false ? ', senza bordi sfumati' : ', angoli tondi e bordi sfumati'}${s.foto.fondi ? ', sfondo chiaro che si fonde' : ''}${s.foto.strisce ? ', a strisce' : ''})`);
    if (s.elementi.length) {
      L.push('Elementi grafici:');
      s.elementi.forEach((x) => L.push(`- ${ELEM_MAP[x.tipo]?.nome || x.tipo} (${x.tipo}) · colore ${NOMI_COLORI[x.c] || x.c} · posizione ${Math.round(x.x * 100)}% da sinistra, ${Math.round(x.y * 100)}% dall'alto · larghezza ${Math.round(x.w)} px · rotazione ${Math.round(x.r || 0)}° · ${x.dietro ? 'dietro al testo' : 'davanti al testo'}${ELEM_MAP[x.tipo]?.numero ? ` · numero ${x.n}` : ''}`));
    }
    L.push('');
  });
  const tipo = $('#nt-tipo').value, nome = $('#nt-nome').value.trim(), desc = $('#nt-desc').value.trim();
  if (tipo) {
    L.push(tipo === 'template' ? '## NUOVO TEMPLATE' : '## NUOVO ELEMENTO GRAFICO');
    L.push(tipo === 'template'
      ? 'Arricchisci l\'app con un nuovo layout in app/layouts.js (senza toccare quelli esistenti), seguendo le regole del CLAUDE.md.'
      : 'Arricchisci l\'app con un nuovo elemento in app/elementi.js (grafica vettoriale piatta, un solo colore), seguendo le regole del CLAUDE.md.');
    L.push(`Nome: ${nome || '(da decidere)'}`, `Descrizione: ${desc || '(da decidere)'}`, '');
  }
  const copia = JSON.parse(JSON.stringify({ formato: st.formato, profilo: st.profilo, slides: st.slides }));
  copia.slides.forEach((s) => { if (s.foto && s.foto.id) s.foto.id = `immagine-${numFoto(st.slides[copia.slides.indexOf(s)])}`; });
  L.push('## Stato dell\'app (JSON, per ricaricare tutto nell\'app: localStorage chiave dps-stato-v1)', '```json', JSON.stringify(copia), '```');
  return L.join('\n');
}
function aggiornaBrief() { $('#brief').value = costruisciBrief(); }
['#nt-tipo', '#nt-nome', '#nt-desc'].forEach((s) => $(s).addEventListener('input', aggiornaBrief));
$('#copia-brief').onclick = async () => {
  aggiornaBrief();
  try { await navigator.clipboard.writeText($('#brief').value); toast('Brief copiato: incollalo in Claude Code'); }
  catch { $('#brief').select(); toast('Seleziona e copia il testo'); }
};
$('#condividi-foto').onclick = async () => {
  const files = [];
  for (const s of st.slides) {
    if (!(s.foto && s.foto.id)) continue;
    const bl = await fotoLeggi(s.foto.id); if (bl) files.push(new File([bl], `immagine-${files.length + 1}.jpg`, { type: 'image/jpeg' }));
  }
  if (!files.length) { toast('Nessuna foto nelle slide'); return; }
  await condividiFile(files);
};

/* ---------- impostazioni ---------- */

async function avatarProfilo() {
  const bl = await fotoLeggi('profilo'); const img = $('#p-foto');
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  if (bl) { img.dataset.url = URL.createObjectURL(bl); img.src = img.dataset.url; } else { img.dataset.url = ''; img.src = 'brand/logo/ufficiale/logo-ufficiale.svg'; }
}
function impostazioni() {
  const p = st.profilo;
  [['handle', '#p-handle'], ['nome', '#p-nome'], ['descr', '#p-descr']].forEach(([k, sel]) => {
    $(sel).value = p[k];
    $(sel).addEventListener('input', (ev) => { p[k] = ev.target.value; ridisegnaTutte(); salva(); });
  });
  $('#p-file').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const { blob } = await processaFoto(f, 600, false);
      await fotoSalva('profilo', blob); immagini.delete('profilo'); await caricaImmagine('profilo');
      await avatarProfilo(); ridisegnaTutte(); toast('Foto profilo salvata');
    } catch { toast('Non riesco a leggere questa foto'); }
  });
  $('#p-rimuovi').onclick = async () => { await fotoElimina('profilo'); immagini.delete('profilo'); await avatarProfilo(); ridisegnaTutte(); };
  avatarProfilo();
  $('#elenco-cat').innerHTML = '<p class="nota"><b>Template</b></p>' + LAYOUTS.map((l) => `<p class="nota"><b>${esc(l.nome)}</b>: ${esc(l.descrizione)}</p>`).join('')
    + '<p class="nota" style="margin-top:10px"><b>Elementi grafici</b></p><div class="elenco-cat">' + GRUPPI.map((g) => `<p class="nota"><b>${g}</b><br>${ELEMENTI.filter((e) => e.gruppo === g).map((e) => `<span>${esc(e.nome)}</span>`).join('')}</p>`).join('') + '</div>';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#istruzioni-installa').textContent = standalone ? 'L\'app è già installata su questo telefono.'
    : ios ? 'Su iPhone: apri questa pagina in Safari, tocca «Condividi» e poi «Aggiungi alla schermata Home».'
      : 'Su Android: se non vedi il pulsante, apri il menu ⋮ di Chrome e scegli «Installa app» (o «Aggiungi a schermata Home»).';
}
let promptInstall = null;
addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); promptInstall = ev; $('#installa').hidden = false; });
$('#installa').onclick = async () => { if (!promptInstall) return; promptInstall.prompt(); await promptInstall.userChoice; promptInstall = null; $('#installa').hidden = true; };
$('#cancella').onclick = async () => {
  if (!confirm('Cancellare tutti i testi, le foto e le impostazioni salvati su questo telefono?')) return;
  localStorage.removeItem(KEY); await fotoSvuota(); location.reload();
};

/* ---------- schede ---------- */

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'brief') aggiornaBrief();
  scrollTo(0, 0);
}));

/* ---------- build e aggiornamenti ---------- */

$('#build').textContent = `build ${BUILD}`;
async function controllaAggiornamenti(manuale) {
  const stato = $('#stato-agg');
  try {
    const r = await fetch('app/build.js?check&t=' + Date.now(), { cache: 'no-store' });
    const m = (await r.text()).match(/BUILD\s*=\s*(\d+)/); const n = m ? +m[1] : 0;
    if (n > BUILD) {
      const b = $('#aggiorna'); b.hidden = false;
      b.innerHTML = `Nuova versione disponibile (build ${n}) <button type="button" id="aggiorna-ora">Aggiorna</button>`;
      $('#aggiorna-ora').onclick = async () => {
        try { for (const k of await caches.keys()) await caches.delete(k); for (const g of await navigator.serviceWorker.getRegistrations()) await g.unregister(); } catch {}
        location.reload();
      };
      if (manuale) stato.textContent = `Disponibile la build ${n}.`;
    } else if (manuale) stato.textContent = `Hai già l'ultima versione (build ${BUILD}).`;
  } catch { if (manuale) stato.textContent = 'Non riesco a controllare: forse sei offline.'; }
}
$('#controlla').onclick = () => controllaAggiornamenti(true);

/* ---------- avvio ---------- */

async function avvia() {
  readBrand();
  logo = await caricaLogo();
  await loadFonts();
  await caricaImmagine('profilo');
  for (const s of st.slides) if (s.foto && s.foto.id) await caricaImmagine(s.foto.id);
  renderFormati(); renderSlides(); impostazioni();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  avviaPortfolio();
  controllaAggiornamenti(false);
  document.documentElement.dataset.pronto = '1';
}
avvia();
