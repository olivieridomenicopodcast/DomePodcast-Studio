// portfolio.js - scheda «Portfolio» dell'app: editor dei podcast, anteprima delle pagine, storie Instagram, esportazione.
import { fotoSalva, fotoLeggi, fotoElimina } from './idb.js';
import { zipStore } from './zip.js';
import { disegnaStoria, STORIA_SFONDI, STORIA_DEF } from './storia.js';
import { PF_VUOTO, generaSito, conSlug, slugifica, ruoliDi, pubblicati } from './portfolio-sito.js';
import { $, uid, esc, clamp, toast, processaFoto, scaricaBlob, condividiFile } from './util.js';

const KEY = 'dps-portfolio-v1';
const GEN = [
  ['nome', 'Il tuo nome', 'testo'], ['titolo', 'Titolo della pagina', 'testo'], ['motto', 'Frase sotto il titolo', 'testo'],
  ['introTitolo', 'Titolo sezione «per i clienti»', 'testo'], ['introTesto', 'Testo della sezione', 'testo'],
  ['mieiTitolo', 'Titolo sezione «i miei podcast»', 'testo'], ['mieiTesto', 'Testo della sezione', 'testo'],
  ['ctaTitolo', 'Chiusura: titolo', 'testo'], ['ctaTesto', 'Chiusura: testo', 'testo'], ['ctaBottone', 'Chiusura: testo del pulsante', 'testo'],
  ['ctaLink', 'Chiusura: link del pulsante (es. mailto:tuamail@esempio.it)', 'testo'],
  ['instagram', 'Link Instagram', 'testo'], ['linkedin', 'Link LinkedIn', 'testo'], ['youtube', 'Link YouTube', 'testo'], ['sito', 'Link al tuo sito', 'testo'],
  ['nota', 'Nota in fondo alla pagina (facoltativa)', 'area'],
  ['baseUrl', 'Indirizzo pubblico del portfolio (avanzato)', 'testo'],
];
const CAMPI = [
  ['titolo', 'Titolo del podcast', 'testo'],
  ['tipo', 'Tipo', 'select', [['cliente', 'Progetto per un cliente'], ['mio', 'Un mio podcast']]],
  ['stato', 'Stato', 'select', [['pubblicato', 'Pubblicato'], ['bozza', 'Bozza (non compare nel portfolio)']]],
  ['breve', 'Descrizione breve (elenco e storia)', 'area'],
  ['cliente', 'Cliente / autore', 'testo'],
  ['periodo', 'Periodo (es. 09/23)', 'testo'],
  ['ruoli', 'Il mio ruolo (separato da virgole)', 'testo', 'Montaggio, Sonorizzazione'],
  ['producer', 'Producer (facoltativo)', 'testo'],
  ['racconto', 'Di cosa parla (riga vuota = nuovo paragrafo, **grassetto**)', 'area6'],
  ['fatto', 'Cosa ho fatto (una voce per riga)', 'area'],
  ['citazione', 'Frase del cliente (facoltativa)', 'area'],
  ['citAutore', 'Chi l\'ha detta', 'testo'],
  ['link', 'Link per ascoltare (uno per riga: Nome | indirizzo)', 'area', 'Spotify | https://open.spotify.com/…'],
  ['slug', 'Indirizzo della pagina (avanzato: se lo cambi dopo la pubblicazione, il vecchio link smette di funzionare)', 'testo'],
];

let pf = leggi();
const aperti = new Set();
const urls = new Map();   // chiave immagine -> indirizzo (blob:) per anteprime
let storiaId = null;

function leggi() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.podcast)) return { ...PF_VUOTO, ...s, generale: { ...PF_VUOTO.generale, ...(s.generale || {}) } };
  } catch { /* si riparte */ }
  return JSON.parse(JSON.stringify(PF_VUOTO));
}
let tSalva;
function salva() {
  clearTimeout(tSalva);
  tSalva = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(pf)); } catch {} }, 250);
}
addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(pf)); } catch {} });

const podById = (id) => pf.podcast.find((p) => p.id === id);
const chiave = (p) => 'pf-' + p.id;

async function urlImmagine(k) {
  if (urls.has(k)) return urls.get(k);
  const bl = await fotoLeggi(k);
  if (bl) { const u = URL.createObjectURL(bl); urls.set(k, u); return u; }
  return '';
}
async function precarica() {
  await Promise.all([...pf.podcast.map((p) => (p.cover ? urlImmagine(chiave(p)) : null)), pf.generale.foto ? urlImmagine('pf-hero') : null]);
}
function scartaUrl(k) { const u = urls.get(k); if (u) { URL.revokeObjectURL(u); urls.delete(k); } }

/* ---------- editor ---------- */

function htmlCampo(p, [k, lab, tipo, ph, extra]) {
  const v = p[k] ?? '';
  if (tipo === 'select') return `<label class="campo"><span>${lab}</span><select data-f="${k}">${ph.map(([val, n]) => `<option value="${val}" ${v === val || (!v && val === ph[0][0]) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
  if (tipo === 'testo') return `<label class="campo"><span>${lab}</span><input type="text" data-f="${k}" value="${esc(v)}" placeholder="${esc(ph || '')}"></label>`;
  return `<label class="campo"><span>${lab}</span><textarea rows="${tipo === 'area6' ? 7 : 3}" data-f="${k}" placeholder="${esc(ph || '')}">${esc(v)}</textarea></label>`;
}

function htmlPodcast(p, i) {
  const th = p.cover ? urls.get(chiave(p)) : '';
  return `<details class="pcard" data-id="${p.id}" ${aperti.has(p.id) ? 'open' : ''}>
  <summary>${th ? `<img class="th" src="${th}" alt="">` : '<span class="th"></span>'}<span><b class="pt">${esc(p.titolo || 'Nuovo podcast')}</b><small>${esc(p.tipo === 'mio' ? 'Mio podcast' : p.cliente || 'Cliente')}${p.stato === 'bozza' ? ' · bozza' : ''}</small></span></summary>
  <div class="riga-btn">
    <label class="btn sec piccolo file">${p.cover ? 'Cambia cover' : 'Carica la cover'}<input type="file" accept="image/*" data-cover hidden></label>
    ${p.cover ? '<button type="button" class="btn sec piccolo" data-a="cover-del">Togli cover</button>' : ''}
  </div>
  ${CAMPI.map((c) => htmlCampo(p, c)).join('')}
  <div class="riga-btn">
    <button type="button" class="btn piccolo" data-a="storia">Crea storia</button>
    <button type="button" class="btn sec piccolo" data-a="prev">Anteprima pagina</button>
  </div>
  <div class="riga-btn">
    <button type="button" class="ico" data-a="su" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
    <button type="button" class="ico" data-a="giu" ${i === pf.podcast.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
    <button type="button" class="btn sec piccolo" data-a="dup">Duplica</button>
    <button type="button" class="btn sec piccolo" data-a="del">Elimina</button>
  </div></details>`;
}

function renderLista() {
  const n = pubblicati(pf).length;
  $('#pf-riepilogo').textContent = pf.podcast.length
    ? `${pf.podcast.length} podcast nell'editor, ${n} pubblicati nel portfolio.` : 'Ancora nessun podcast: tocca «+ Nuovo podcast».';
  $('#pf-lista').innerHTML = pf.podcast.map(htmlPodcast).join('');
  $('#pf-gen-campi').innerHTML = GEN.map(([k, lab, tipo]) => htmlCampo(pf.generale, [k, lab, tipo])).join('')
    + `<div class="riga-btn"><label class="spunta"><input type="checkbox" data-gc="foto" ${pf.generale.foto ? 'checked' : ''}> Mostra la mia foto in alto</label>
    <label class="btn sec piccolo file">${urls.get('pf-hero') ? 'Cambia foto' : 'Carica la foto'}<input type="file" accept="image/*" data-hero hidden></label></div>`;
}

$('#pf-nuovo').onclick = () => {
  const p = { id: uid(), titolo: '', tipo: 'cliente', stato: 'pubblicato', breve: '', cliente: '', periodo: '', ruoli: '', producer: '', racconto: '', fatto: '', citazione: '', citAutore: '', link: '', slug: '', cover: false, storia: { ...STORIA_DEF } };
  pf.podcast.push(p); aperti.add(p.id); renderLista(); salva();
  $(`.pcard[data-id="${p.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const lista = $('#pf-lista');
lista.addEventListener('toggle', (ev) => { const d = ev.target.closest('.pcard'); if (d && ev.target === d) { if (d.open) aperti.add(d.dataset.id); else aperti.delete(d.dataset.id); } }, true);

lista.addEventListener('input', (ev) => {
  const t = ev.target, card = t.closest('.pcard'); if (!card || !t.dataset.f) return;
  const p = podById(card.dataset.id); p[t.dataset.f] = t.value;
  if (t.dataset.f === 'titolo') {
    $('.pt', card).textContent = t.value || 'Nuovo podcast';
    if (!p.slugBloccato) { p.slug = slugifica(t.value); const s = $('[data-f=slug]', card); if (s) s.value = p.slug; }
  }
  if (t.dataset.f === 'slug') p.slugBloccato = true;
  salva();
});

lista.addEventListener('change', async (ev) => {
  const t = ev.target, card = t.closest('.pcard'); if (!card) return;
  const p = podById(card.dataset.id);
  if (t.dataset.f === 'stato' || t.dataset.f === 'tipo') { p[t.dataset.f] = t.value; renderLista(); salva(); }
  else if (t.dataset.cover !== undefined && t.files[0]) {
    try {
      const { blob } = await processaFoto(t.files[0], 900, true);
      await fotoSalva(chiave(p), blob); scartaUrl(chiave(p)); await urlImmagine(chiave(p));
      p.cover = true; renderLista(); salva(); toast('Cover caricata');
    } catch { toast('Non riesco a leggere questa immagine'); }
  }
});

lista.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const card = b.closest('.pcard'), p = podById(card.dataset.id), i = pf.podcast.indexOf(p), a = b.dataset.a;
  if (a === 'su' || a === 'giu') {
    const j = a === 'su' ? i - 1 : i + 1; if (j < 0 || j >= pf.podcast.length) return;
    [pf.podcast[i], pf.podcast[j]] = [pf.podcast[j], pf.podcast[i]]; renderLista(); salva();
  } else if (a === 'dup') {
    const c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.titolo = (p.titolo || 'Podcast') + ' (copia)'; c.slug = ''; c.slugBloccato = false; c.stato = 'bozza';
    if (p.cover) { const bl = await fotoLeggi(chiave(p)); if (bl) { await fotoSalva(chiave(c), bl); await urlImmagine(chiave(c)); } else c.cover = false; }
    pf.podcast.splice(i + 1, 0, c); aperti.add(c.id); renderLista(); salva();
  } else if (a === 'del') {
    if (!confirm(`Eliminare «${p.titolo || 'questo podcast'}» dall'editor?`)) return;
    fotoElimina(chiave(p)); scartaUrl(chiave(p)); pf.podcast.splice(i, 1); renderLista(); salva();
  } else if (a === 'cover-del') { fotoElimina(chiave(p)); scartaUrl(chiave(p)); p.cover = false; renderLista(); salva(); }
  else if (a === 'prev') anteprima(p.id);
  else if (a === 'storia') apriStoria(p.id);
});

// impostazioni generali del portfolio
$('#pf-gen-campi').addEventListener('input', (ev) => { const t = ev.target; if (t.dataset.f) { pf.generale[t.dataset.f] = t.value; salva(); } });
$('#pf-gen-campi').addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.dataset.gc) { pf.generale[t.dataset.gc] = t.checked; salva(); }
  else if (t.dataset.hero !== undefined && t.files[0]) {
    try {
      const { blob } = await processaFoto(t.files[0], 900, false);
      await fotoSalva('pf-hero', blob); scartaUrl('pf-hero'); await urlImmagine('pf-hero');
      pf.generale.foto = true; renderLista(); salva(); toast('Foto salvata');
    } catch { toast('Non riesco a leggere questa foto'); }
  }
});

/* ---------- anteprima delle pagine ---------- */

function risolvi(k, p) { return k === 'foto' ? urls.get('pf-hero') || '' : urls.get('pf-' + p.id) || ''; }

async function anteprima(id) {
  await precarica();
  // per l'anteprima anche le bozze compaiono
  const copia = { ...pf, podcast: pf.podcast.map((p) => ({ ...p, stato: p.id === id ? 'pubblicato' : p.stato })) };
  const lista2 = conSlug(copia);
  const slug = id ? lista2.find((p) => p.id === id)?.slug : null;
  if (id && !slug) { toast('Scrivi prima il titolo del podcast'); return; }
  const files = generaSito(copia, { imgUrl: risolvi, base: '' });
  const nome = slug ? `${slug}/index.html` : 'index.html';
  const base = new URL('portfolio/' + (slug ? slug + '/' : ''), document.baseURI).href;
  const html = files[nome].replace('<head>', `<head><base href="${base}">`);
  const fr = $('#pf-frame');
  $('#pf-overlay').hidden = false;
  fr.onload = () => {
    const d = fr.contentDocument; if (!d) return;
    d.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      const h = a.getAttribute('href') || '';
      if (a.dataset.pf) { e.preventDefault(); const q = a.dataset.pf === 'home' ? null : lista2.find((x) => x.slug === a.dataset.pf)?.id; anteprima(q); }
      else if (h.startsWith('#')) { e.preventDefault(); d.querySelector(h)?.scrollIntoView({ behavior: 'smooth' }); }
      else if (/^https?:|^mailto:/.test(h)) { a.target = '_blank'; }
      else e.preventDefault();
    });
  };
  fr.srcdoc = html;
}
$('#pf-anteprima').onclick = () => anteprima(null);
$('#pf-chiudi').onclick = () => { $('#pf-overlay').hidden = true; $('#pf-frame').srcdoc = ''; };

/* ---------- storia Instagram ---------- */

async function apriStoria(id) {
  storiaId = id; const p = podById(id); p.storia = { ...STORIA_DEF, ...(p.storia || {}) };
  $('#storia-overlay').hidden = false;
  $('#st-sfondi').innerHTML = Object.entries(STORIA_SFONDI).map(([k, n]) => `<button type="button" class="chip ${p.storia.sfondo === k ? 'on' : ''}" data-sf="${k}">${n}</button>`).join('');
  $('#st-ruolo').checked = !!p.storia.ruolo; $('#st-data').checked = !!p.storia.data; $('#st-invito').value = p.storia.invito;
  $('#st-titolo').textContent = p.titolo || 'Nuovo podcast';
  await ridisegnaStoria();
}
async function bitmapCover(p) {
  if (!p.cover) return null;
  const bl = await fotoLeggi(chiave(p)); if (!bl) return null;
  try { return await createImageBitmap(bl); } catch { return null; }
}
async function ridisegnaStoria() {
  const p = podById(storiaId); if (!p) return;
  disegnaStoria($('#st-canvas'), p, { cover: await bitmapCover(p), preview: true, scala: 0.5 });
}
$('#st-sfondi').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-sf]'); if (!b) return;
  podById(storiaId).storia.sfondo = b.dataset.sf;
  document.querySelectorAll('#st-sfondi .chip').forEach((c) => c.classList.toggle('on', c === b)); ridisegnaStoria(); salva();
});
$('#st-ruolo').onchange = (e) => { podById(storiaId).storia.ruolo = e.target.checked; ridisegnaStoria(); salva(); };
$('#st-data').onchange = (e) => { podById(storiaId).storia.data = e.target.checked; ridisegnaStoria(); salva(); };
$('#st-invito').oninput = (e) => { podById(storiaId).storia.invito = e.target.value; ridisegnaStoria(); salva(); };
$('#st-chiudi').onclick = () => { $('#storia-overlay').hidden = true; };
async function pngStoria() {
  await document.fonts.ready;
  const p = podById(storiaId), c = document.createElement('canvas');
  disegnaStoria(c, p, { cover: await bitmapCover(p), preview: false, scala: 1 }); // niente segnaposto né guide
  return { blob: await new Promise((ok) => c.toBlob(ok, 'image/png')), nome: `storia-${slugifica(p.titolo)}.png` };
}
$('#st-scarica').onclick = async () => { const { blob, nome } = await pngStoria(); scaricaBlob(blob, nome); toast('Storia salvata nei Download'); };
$('#st-condividi').onclick = async () => { const { blob, nome } = await pngStoria(); await condividiFile([new File([blob], nome, { type: 'image/png' })]); };

/* ---------- esportazione per la pubblicazione ---------- */

async function costruisciZip() {
  const enc = new TextEncoder();
  const files = generaSito(pf, {});
  const out = Object.entries(files).map(([name, txt]) => ({ name, data: enc.encode(txt) }));
  const css = await (await fetch('portfolio/stile.css')).arrayBuffer();
  out.push({ name: 'stile.css', data: new Uint8Array(css) });
  const lista2 = conSlug(pf), slugDi = new Map(lista2.map((p) => [p.id, p.slug]));
  for (const p of lista2) {
    if (!p.cover) continue;
    const bl = await fotoLeggi(chiave(p)); if (bl) out.push({ name: `img/${p.slug}.jpg`, data: new Uint8Array(await bl.arrayBuffer()) });
  }
  if (pf.generale.foto) { const bl = await fotoLeggi('pf-hero'); if (bl) out.push({ name: 'img/foto.jpg', data: new Uint8Array(await bl.arrayBuffer()) }); }
  const dati = { ...pf, podcast: pf.podcast.map((p) => ({ ...p, slug: slugDi.get(p.id) || p.slug })) };
  out.push({ name: 'data.json', data: enc.encode(JSON.stringify(dati, null, 1)) });
  return { blob: zipStore(out), n: lista2.length };
}
$('#pf-zip').onclick = async () => {
  if (!pubblicati(pf).length) { toast('Nessun podcast pubblicato da esportare'); return; }
  const { blob } = await costruisciZip(); scaricaBlob(blob, 'portfolio-sito.zip'); toast('portfolio-sito.zip salvato nei Download');
};
$('#pf-zip-share').onclick = async () => {
  if (!pubblicati(pf).length) { toast('Nessun podcast pubblicato da esportare'); return; }
  const { blob } = await costruisciZip(); await condividiFile([new File([blob], 'portfolio-sito.zip', { type: 'application/zip' })]);
};
$('#pf-copia').onclick = async () => {
  const l = conSlug(pf);
  const testo = ['Pubblica il portfolio aggiornato.', '',
    'Ho allegato portfolio-sito.zip (generato da DomePodcast Studio). Cosa fare:',
    '1. Scompatta lo zip nella cartella portfolio/ del repo, sostituendo i file esistenti (index.html, le cartelle dei podcast, stile.css, img/, data.json).',
    '2. Controlla con Playwright (viewport da telefono) che l\'elenco e le pagine dei podcast si aprano, senza errori in console e con le immagini.',
    '3. Se non ci sono errori: sh scripts/aggiorna-build.sh, commit, push e merge in main (fast-forward).',
    '4. Dimmi l\'indirizzo: https://olivieridomenicopodcast.github.io/DomePodcast-Studio/portfolio/', '',
    `Podcast pubblicati (${l.length}):`, ...l.map((p) => `- ${p.titolo} → portfolio/${p.slug}/${p.cover ? '' : ' (senza cover)'}`), '',
    'Nota: le cover sono immagini di clienti e il repo è pubblico. Prima di committare portfolio/img/ chiedi a Niky conferma esplicita di avere l\'ok a pubblicarle (questo messaggio non è una conferma).'].join('\n');
  try { await navigator.clipboard.writeText(testo); toast('Messaggio copiato: incollalo in Claude Code'); } catch { toast('Non riesco a copiare: riprova'); }
};

/* ---------- avvio ---------- */

export async function avviaPortfolio() {
  await precarica();
  renderLista();
}
