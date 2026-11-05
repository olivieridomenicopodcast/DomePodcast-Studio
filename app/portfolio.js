// portfolio.js - scheda «Portfolio» dell'app: editor dei podcast, anteprima delle pagine, storie Instagram, esportazione.
import { fotoSalva, fotoLeggi, fotoElimina } from './idb.js';
import { zipStore } from './zip.js';
import { disegnaStoria, STORIA_SFONDI, STORIA_DEF } from './storia.js';
import { PF_VUOTO, generaSito, conSlug, slugifica, ruoliDi, pubblicati } from './portfolio-sito.js';
import { $, uid, esc, clamp, toast, processaFoto, scaricaBlob, condividiFile } from './util.js';
import { leggiConfig, salvaConfig, provaToken, pushFile, leggiFileRepo, spiegaErrore } from './github.js';

const KEY = 'dps-portfolio-v1';
const GEN = [
  ['nome', 'Il tuo nome', 'testo'], ['titolo', 'Titolo della pagina', 'testo'], ['motto', 'Frase sotto il titolo', 'testo'],
  ['introTitolo', 'Titolo sezione «per i clienti»', 'testo'], ['introTesto', 'Testo della sezione', 'testo'],
  ['mieiTitolo', 'Titolo sezione «i miei podcast»', 'testo'], ['mieiTesto', 'Testo della sezione', 'testo'],
  ['ctaTitolo', 'Chiusura: titolo', 'testo'], ['ctaTesto', 'Chiusura: testo', 'testo'], ['ctaBottone', 'Chiusura: testo del pulsante', 'testo'],
  ['ctaLink', 'Chiusura: link del pulsante (es. mailto:tuamail@esempio.it)', 'testo'],
  ['instagram', 'Link Instagram', 'testo'], ['linkedin', 'Link LinkedIn', 'testo'], ['youtube', 'Link YouTube', 'testo'], ['sito', 'Link al tuo sito', 'testo'],
  ['clientiTitolo', 'Titolo dei nomi in evidenza (in alto)', 'testo'], ['altriTitolo', 'Titolo delle altre collaborazioni (in fondo)', 'testo'],
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
    if (s && Array.isArray(s.podcast)) return { ...PF_VUOTO, clienti: [], ...s, generale: { ...PF_VUOTO.generale, ...(s.generale || {}) } };
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
  renderClienti();
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


/* ---------- clienti in evidenza ---------- */

function renderClienti() {
  const max = Math.max(0, parseInt(pf.generale.clientiMax, 10) || 0);
  $('#pf-cl-max').value = max;
  $('#pf-cl-altri').checked = pf.generale.mostraAltri !== false;
  $('#pf-cl-lista').innerHTML = pf.clienti.map((c, i) => `<div class="clrow" data-id="${c.id}">
    <span class="chip ${i < max ? 'on' : ''}">${i < max ? 'In alto' : 'In fondo'}</span>
    <input type="text" data-c="nome" value="${esc(c.nome)}" placeholder="Nome (es. Allianz Assicurazioni)">
    <input type="text" data-c="nota" value="${esc(c.nota || '')}" placeholder="Etichetta (es. Podcast interno)">
    <select data-c="podcastId"><option value="">Nessun podcast pubblico (interno)</option>${pf.podcast.map((p) => `<option value="${p.id}" ${c.podcastId === p.id ? 'selected' : ''}>Podcast: ${esc(p.titolo || 'senza titolo')}</option>`).join('')}</select>
    <div class="riga-btn"><button type="button" class="ico" data-ca="su" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button><button type="button" class="ico" data-ca="giu" ${i === pf.clienti.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button><button type="button" class="btn sec piccolo" data-ca="del">Elimina</button></div></div>`).join('')
    || '<p class="nota">Nessun cliente: tocca «+ Aggiungi un cliente».</p>';
}
$('#pf-cl-nuovo').onclick = () => { pf.clienti.push({ id: uid(), nome: '', nota: '', podcastId: '' }); renderClienti(); salva(); $('#pf-cl-lista .clrow:last-child [data-c=nome]')?.focus(); };
$('#pf-cl-import').onclick = () => {
  const noti = new Set(pf.clienti.map((c) => (c.nome || '').trim().toLowerCase()));
  let n = 0;
  pubblicati(pf).forEach((p) => {
    const nome = (p.cliente || '').trim();
    if (nome && !noti.has(nome.toLowerCase()) && !pf.clienti.some((c) => c.podcastId === p.id)) { pf.clienti.push({ id: uid(), nome, nota: '', podcastId: p.id }); noti.add(nome.toLowerCase()); n++; }
  });
  renderClienti(); salva(); toast(n ? `Aggiunti ${n} clienti dai podcast` : 'Nessun cliente nuovo da aggiungere');
};
$('#pf-cl-max').oninput = (e) => { pf.generale.clientiMax = clamp(parseInt(e.target.value, 10) || 0, 0, 30); salva(); document.querySelectorAll('#pf-cl-lista .clrow').forEach((r, i) => { const ch = $('.chip', r); const ev = i < pf.generale.clientiMax; ch.classList.toggle('on', ev); ch.textContent = ev ? 'In alto' : 'In fondo'; }); };
$('#pf-cl-altri').onchange = (e) => { pf.generale.mostraAltri = e.target.checked; salva(); };
$('#pf-cl-lista').addEventListener('input', (ev) => { const t = ev.target, r = t.closest('.clrow'); if (!r || !t.dataset.c) return; pf.clienti.find((c) => c.id === r.dataset.id)[t.dataset.c] = t.value; salva(); });
$('#pf-cl-lista').addEventListener('change', (ev) => { const t = ev.target, r = t.closest('.clrow'); if (r && t.dataset.c === 'podcastId') { const c = pf.clienti.find((x) => x.id === r.dataset.id); c.podcastId = t.value; if (t.value && !c.nome.trim()) { c.nome = podById(t.value)?.cliente || ''; renderClienti(); } salva(); } });
$('#pf-cl-lista').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-ca]'); if (!b) return;
  const r = b.closest('.clrow'), i = pf.clienti.findIndex((c) => c.id === r.dataset.id), a = b.dataset.ca;
  if (a === 'del') pf.clienti.splice(i, 1);
  else { const j = a === 'su' ? i - 1 : i + 1; if (j < 0 || j >= pf.clienti.length) return; [pf.clienti[i], pf.clienti[j]] = [pf.clienti[j], pf.clienti[i]]; }
  renderClienti(); salva();
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

// File del sito pronti da pubblicare. Nei dati (data.json) vanno solo i podcast pubblicati: le bozze restano sul telefono.
async function costruisciFile() {
  const enc = new TextEncoder();
  const pubbl = { ...pf, podcast: pf.podcast.filter((p) => p.stato !== 'bozza') };
  const files = generaSito(pubbl, {});
  const out = Object.entries(files).map(([name, txt]) => ({ name, data: enc.encode(txt) }));
  const lista2 = conSlug(pubbl), slugDi = new Map(lista2.map((p) => [p.id, p.slug]));
  let nCover = 0;
  for (const p of lista2) {
    if (!p.cover) continue;
    const bl = await fotoLeggi(chiave(p)); if (bl) { out.push({ name: `img/${p.slug}.jpg`, data: new Uint8Array(await bl.arrayBuffer()) }); nCover++; }
  }
  if (pf.generale.foto) { const bl = await fotoLeggi('pf-hero'); if (bl) out.push({ name: 'img/foto.jpg', data: new Uint8Array(await bl.arrayBuffer()) }); }
  const dati = { ...pubbl, podcast: pubbl.podcast.map((p) => ({ ...p, slug: slugDi.get(p.id) || p.slug })) };
  out.push({ name: 'data.json', data: enc.encode(JSON.stringify(dati, null, 1)) });
  return { out, n: lista2.length, nCover };
}
async function costruisciZip() {
  const { out, n } = await costruisciFile();
  const css = await (await fetch('portfolio/stile.css')).arrayBuffer();
  out.push({ name: 'stile.css', data: new Uint8Array(css) });
  return { blob: zipStore(out), n };
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
    `Nomi in evidenza in alto (${Math.max(0, parseInt(pf.generale.clientiMax, 10) || 0)}): ${pf.clienti.slice(0, Math.max(0, parseInt(pf.generale.clientiMax, 10) || 0)).map((c) => c.nome).filter(Boolean).join(', ') || '(nessuno)'}`, '',
    `Podcast pubblicati (${l.length}):`, ...l.map((p) => `- ${p.titolo} → portfolio/${p.slug}/${p.cover ? '' : ' (senza cover)'}`), '',
    'Nota: le cover sono immagini di clienti e il repo è pubblico. Prima di committare portfolio/img/ chiedi a Niky conferma esplicita di avere l\'ok a pubblicarle (questo messaggio non è una conferma).'].join('\n');
  try { await navigator.clipboard.writeText(testo); toast('Messaggio copiato: incollalo in Claude Code'); } catch { toast('Non riesco a copiare: riprova'); }
};


/* ---------- sincronizzazione con GitHub (push / pull) ---------- */

const ghStato = (t, errore) => { const el = $('#gh-stato'); el.textContent = t; el.style.color = errore ? '#b3261e' : ''; };
function ghConfigDaCampi() {
  const c = { ...leggiConfig(), token: $('#gh-token').value.trim(), repo: $('#gh-repo').value.trim(), branch: $('#gh-branch').value.trim() || 'main' };
  salvaConfig(c); return c;
}
function ghMostra() { const c = leggiConfig(); $('#gh-token').value = c.token; $('#gh-repo').value = c.repo; $('#gh-branch').value = c.branch; }
['#gh-token', '#gh-repo', '#gh-branch'].forEach((s) => $(s).addEventListener('change', ghConfigDaCampi));
$('#gh-mostra').onclick = () => { const i = $('#gh-token'); i.type = i.type === 'password' ? 'text' : 'password'; };
function ghPronto() { const c = ghConfigDaCampi(); if (!c.token) { ghStato('Incolla prima il token.', true); return null; } return c; }

$('#gh-prova').onclick = async () => {
  const c = ghPronto(); if (!c) return;
  try { ghStato('Controllo…'); const r = await provaToken(c); ghStato(r.puoScrivere ? `Token valido: posso scrivere su ${r.nome}.` : `Il token legge ${r.nome} ma NON può scrivere: serve «Contents: Read and write».`, !r.puoScrivere); }
  catch (e) { ghStato(spiegaErrore(e), true); }
};

$('#gh-push').onclick = async () => {
  const c = ghPronto(); if (!c) return;
  if (!pubblicati(pf).length) { ghStato('Nessun podcast pubblicato da inviare.', true); return; }
  try {
    ghStato('Preparo i file…');
    const { out, n, nCover } = await costruisciFile();
    if (!confirm(`⬆ Push: invio al sito ${n} podcast${nCover ? ` e ${nCover} cover` : ''} su ${c.repo}.\n\nIl repo è PUBBLICO: tutto diventa visibile a chiunque. Le cover sono immagini dei clienti: confermi di avere il loro ok a pubblicarle? Le bozze non vengono inviate.`)) { ghStato('Push annullato.'); return; }
    const r = await pushFile(c, 'portfolio', out.map((f) => ({ path: f.name, data: f.data })), 'Portfolio: aggiornamento dall\'app', ghStato);
    ghStato(r.cambiato ? 'Fatto: il portfolio è stato inviato. Online tra circa un minuto.' : 'Il sito è già aggiornato: niente da inviare.');
    if (r.cambiato) toast('Push riuscito');
  } catch (e) { ghStato(spiegaErrore(e), true); }
};

$('#gh-pull').onclick = async () => {
  const c = ghPronto(); if (!c) return;
  try {
    ghStato('Scarico i dati dal sito…');
    const bl = await leggiFileRepo(c, 'portfolio/data.json');
    if (!bl) { ghStato('Sul sito non c\'è ancora nessun portfolio (manca portfolio/data.json).', true); return; }
    const remoto = JSON.parse(await bl.text());
    if (!remoto || !Array.isArray(remoto.podcast)) { ghStato('Il file sul sito non è nel formato giusto.', true); return; }
    if (!confirm(`⬇ Pull: sostituisco i podcast sul telefono con quelli del sito (${remoto.podcast.length}). Le tue bozze restano. Continuo?`)) { ghStato('Pull annullato.'); return; }
    let i = 0;
    for (const p of remoto.podcast) {
      ghStato(`Scarico le cover… ${++i}/${remoto.podcast.length}`);
      if (p.cover) {
        const img = await leggiFileRepo(c, `portfolio/img/${p.slug}.jpg`);
        if (img) { await fotoSalva(chiave(p), img); scartaUrl(chiave(p)); } else p.cover = false;
      }
    }
    if (remoto.generale && remoto.generale.foto) {
      const h = await leggiFileRepo(c, 'portfolio/img/foto.jpg');
      if (h) { await fotoSalva('pf-hero', h); scartaUrl('pf-hero'); } else remoto.generale.foto = false;
    }
    const bozze = pf.podcast.filter((p) => p.stato === 'bozza' && !remoto.podcast.some((r) => r.id === p.id));
    pf = { ...PF_VUOTO, clienti: [], ...remoto, generale: { ...PF_VUOTO.generale, ...(remoto.generale || {}) }, podcast: [...remoto.podcast, ...bozze] };
    salva(); await precarica(); renderLista();
    ghStato(`Fatto: ${remoto.podcast.length} podcast presi dal sito.`); toast('Pull riuscito');
  } catch (e) { ghStato(e instanceof SyntaxError ? 'Il file sul sito è rovinato.' : spiegaErrore(e), true); }
};

/* ---------- avvio ---------- */

export async function avviaPortfolio() {
  ghMostra();
  await precarica();
  renderLista();
}
