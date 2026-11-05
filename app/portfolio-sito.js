// portfolio-sito.js - genera le pagine STATICHE del portfolio (elenco + una pagina per podcast).
// Nessuna dipendenza dal browser: lo usano sia l'app (anteprima ed esportazione) sia scripts/genera-portfolio.mjs.
// Le pagine usano ../assets/brand.css (colori e font) e portfolio/stile.css (impaginazione).

export const PF_VUOTO = {
  v: 1,
  generale: {
    nome: 'Olivieri Domenico',
    titolo: 'Portfolio',
    motto: 'La tua voce, il mio sound.',
    foto: false,
    introTitolo: 'I podcast di chi mi ha scelto',
    introTesto: 'Progetti realizzati per autori, aziende e professionisti.',
    mieiTitolo: 'I miei podcast',
    mieiTesto: 'I progetti nati da me, per sperimentare e divertirmi.',
    ctaTitolo: 'Lavoriamo insieme?',
    ctaTesto: 'Raccontami il tuo podcast: ti aiuto in ogni fase del processo audio.',
    ctaBottone: 'Scrivimi',
    ctaLink: '',
    instagram: 'https://www.instagram.com/domenicoolivieri_/',
    linkedin: '', youtube: '', sito: 'https://olivieridomenico.it',
    clientiMax: 6,
    clientiTitolo: 'Hanno collaborato con me',
    altriTitolo: 'Altre collaborazioni',
    mostraAltri: true,
    nota: '',
    baseUrl: 'https://olivieridomenicopodcast.github.io/DomePodcast-Studio/portfolio/',
  },
  tagRuoli: ['Montaggio', 'Sonorizzazione', 'Sound design', 'Registrazione', 'Distribuzione', 'Composizione musicale', 'Coaching', 'Consulenza'], // tag del «mio ruolo»
  clienti: [], // nomi dei clienti, in ordine di importanza: { id, nome, nota, podcastId }
  podcast: [],
};

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function slugifica(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'podcast';
}

// Solo indirizzi web o email: niente "javascript:" e simili.
export function urlSicuro(u) {
  const s = String(u || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : '';
}

const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const paragrafi = (t) => String(t || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
  .map((x) => `<p>${inline(x).replace(/\n/g, '<br>')}</p>`).join('');
const righe = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

// Un tag di ruolo: solo l'iniziale maiuscola («sonorizzazione» e «SONORIZZAZIONE» diventano «Sonorizzazione»)
export function nomeTag(t) { const s = String(t || '').trim().replace(/\s+/g, ' '); return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''; }
// Ruoli di un podcast, normalizzati e senza doppioni
export function ruoliDi(p) {
  const arr = Array.isArray(p.ruoli) ? p.ruoli : String(p.ruoli || '').split(',');
  const visti = new Set();
  return arr.map(nomeTag).filter((t) => t && !visti.has(t.toLowerCase()) && visti.add(t.toLowerCase()));
}
export function linkDi(p) {
  return righe(p.link).map((r) => { const [n, ...u] = r.split('|'); const url = urlSicuro(u.join('|')); return url ? { nome: n.trim() || 'Ascolta', url } : null; }).filter(Boolean);
}
export const pubblicati = (pf) => pf.podcast.filter((p) => p.stato !== 'bozza' && p.titolo && p.titolo.trim());

// Assegna a ogni podcast un indirizzo (slug) unico
export function conSlug(pf) {
  const usati = new Set();
  return pubblicati(pf).map((p) => {
    let base = slugifica(p.slug || p.titolo), s = base, n = 2;
    while (usati.has(s)) s = `${base}-${n++}`;
    usati.add(s);
    return { ...p, slug: s };
  });
}

function testa({ titolo, descr, pre, og, url }) {
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descr)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titolo)}"><meta property="og:description" content="${esc(descr)}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
<meta name="theme-color" content="#2E1976">
<link rel="stylesheet" href="${pre}../assets/brand.css"><link rel="stylesheet" href="${pre}stile.css">
</head><body class="pf">`;
}

function cover(p, imgUrl, pre) {
  const src = p.cover ? imgUrl('cover', p, pre) : '';
  return src ? `<div class="cover"><img src="${esc(src)}" alt="Copertina di ${esc(p.titolo)}" loading="lazy"></div>`
    : `<div class="cover ph"><b class="t">${esc(p.titolo)}</b></div>`;
}

function scheda(p, imgUrl, pre = '') {
  const ruoli = ruoliDi(p);
  const meta = [ruoli.join(' · '), p.periodo].filter(Boolean).join(' · ');
  return `<a class="card" href="${pre}${esc(p.slug)}/" data-pf="${esc(p.slug)}" data-r="${esc(ruoli.join('|'))}">${cover(p, imgUrl, pre)}
<h3>${esc(p.titolo)}</h3>${meta ? `<div class="meta">${esc(meta)}</div>` : ''}${p.breve ? `<p>${esc(p.breve)}</p>` : ''}<span class="vai">Scopri →</span></a>`;
}

function social(g) {
  const l = [['Instagram', g.instagram], ['LinkedIn', g.linkedin], ['YouTube', g.youtube], ['Sito', g.sito]]
    .map(([n, u]) => [n, urlSicuro(u)]).filter(([, u]) => u);
  return l.map(([n, u]) => `<a href="${esc(u)}" rel="noopener">${n}</a>`).join('');
}

function chiusura(g) {
  const link = urlSicuro(g.ctaLink);
  return `<section class="chiusura" id="contatti"><div class="wrap"><h2 class="t">${esc(g.ctaTitolo)}</h2>${g.ctaTesto ? `<p>${esc(g.ctaTesto)}</p>` : ''}
${link ? `<a class="btn" href="${esc(link)}">${esc(g.ctaBottone || 'Scrivimi')}</a>` : ''}</div></section>`;
}
function piede(g) {
  return `<footer class="piede"><div class="wrap"><span>© ${new Date().getFullYear()} ${esc(g.nome)}</span><nav>${social(g)}</nav></div>${g.nota ? `<div class="wrap nota-piede">${esc(g.nota)}</div>` : ''}</footer>`;
}

function sezione(titolo, testo, schede, chips) {
  if (!schede.length) return '';
  return `<section class="sez"><div class="wrap"><h2 class="t">${esc(titolo)}</h2>${testo ? `<p class="lead">${esc(testo)}</p>` : ''}${chips}
<div class="griglia">${schede.join('')}</div></div></section>`;
}


// Nomi dei clienti: i primi «clientiMax» in evidenza sotto l'intestazione, gli altri in «Altre collaborazioni».
// Se il cliente è collegato a un podcast pubblicato, il nome porta alla sua pagina; altrimenti è solo un nome (podcast interno).
function nomiClienti(pf, g, lista) {
  const tutti = (pf.clienti || []).filter((c) => String(c.nome || '').trim());
  const max = Math.max(0, parseInt(g.clientiMax, 10) || 0);
  const voce = (c) => {
    const p = c.podcastId && lista.find((x) => x.id === c.podcastId);
    const nota = String(c.nota || '').trim() || (p ? 'Podcast online' : 'Collaborazione');
    const dentro = `<span class="cl-n">${esc(c.nome)}</span><span class="cl-c">${esc(nota)}</span>`;
    return p ? `<li><a href="${esc(p.slug)}/" data-pf="${esc(p.slug)}">${dentro}</a></li>` : `<li>${dentro}</li>`;
  };
  const ev = tutti.slice(0, max), altri = tutti.slice(max);
  return {
    alto: ev.length ? `<section class="clienti"><div class="wrap"><h2 class="mini">${esc(g.clientiTitolo)}</h2><ul class="cl-lista">${ev.map(voce).join('')}</ul></div></section>` : '',
    basso: g.mostraAltri && altri.length ? `<section class="sez altri-cl"><div class="wrap"><h2 class="t">${esc(g.altriTitolo)}</h2><p class="elenco-cl">${altri.map((c) => esc(c.nome)).join(' · ')}</p></div></section>` : '',
  };
}

const FILTRO = `<script>(function(){var c=document.querySelectorAll('.chip[data-f]');c.forEach(function(b){b.addEventListener('click',function(){c.forEach(function(x){x.classList.toggle('on',x===b)});var f=b.dataset.f;document.querySelectorAll('.card[data-r]').forEach(function(k){k.hidden=!!f&&(k.dataset.r||'').split('|').indexOf(f)<0})})})})();</script>`;

// pf = dati del portfolio. Ritorna { 'index.html': testo, '<slug>/index.html': testo, ... }
// opzioni: imgUrl(tipo, podcast, prefisso) -> indirizzo dell'immagine; base -> indirizzo pubblico del portfolio
export function generaSito(pf, opzioni = {}) {
  const g = { ...PF_VUOTO.generale, ...(pf.generale || {}) };
  const imgUrl = opzioni.imgUrl || ((tipo, p, pre) => (tipo === 'foto' ? `${pre}img/foto.jpg` : `${pre}img/${p.slug}.jpg`));
  const base = opzioni.base ?? g.baseUrl;
  const lista = conSlug(pf);
  const clienti = lista.filter((p) => p.tipo !== 'mio'), miei = lista.filter((p) => p.tipo === 'mio');
  const file = {};
  const cl = nomiClienti(pf, g, lista);

  // ----- elenco
  const ruoliTutti = [...new Set(clienti.flatMap(ruoliDi))];
  const chips = ruoliTutti.length > 1
    ? `<div class="chips"><button type="button" class="chip on" data-f="">Tutti</button>${ruoliTutti.map((r) => `<button type="button" class="chip" data-f="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : '';
  const stat = [`${lista.length} ${lista.length === 1 ? 'podcast' : 'podcast'}`, ...ruoliTutti.slice(0, 3)].join(' · ');
  const foto = g.foto ? `<div class="hero-foto"><img src="${esc(imgUrl('foto', {}, ''))}" alt="${esc(g.nome)}"></div>` : '';
  file['index.html'] = `${testa({ titolo: `${g.titolo} - ${g.nome}`, descr: g.motto, pre: '', og: base && lista.find((p) => p.cover) ? `${base}img/${lista.find((p) => p.cover).slug}.jpg` : '', url: base })}
<header class="hero"><div class="wrap"><nav class="nav"><a href="#contatti">Lavora con me</a><a href="#contatti">Contatti</a></nav>
<div class="hero-in"><div class="hero-testo"><p class="autore">${esc(g.nome)}</p><h1 class="t">${esc(g.titolo)}</h1><p class="motto">${esc(g.motto)}</p><a class="cta" href="#progetti">Guarda i progetti ↓</a></div>${foto}</div>
${lista.length ? `<p class="num">${esc(stat)}</p>` : ''}</div></header>
${cl.alto}
<main id="progetti">${lista.length ? '' : '<section class="sez"><div class="wrap"><p class="lead">Il portfolio è in arrivo.</p></div></section>'}
${sezione(g.introTitolo, g.introTesto, clienti.map((p) => scheda(p, imgUrl)), chips)}
${sezione(g.mieiTitolo, g.mieiTesto, miei.map((p) => scheda(p, imgUrl)), '')}</main>
${cl.basso}
${chiusura(g)}${piede(g)}${FILTRO}</body></html>`;

  // ----- una pagina per podcast
  for (const p of lista) {
    const ruoli = ruoliDi(p), links = linkDi(p), fatto = righe(p.fatto);
    const info = [['Cliente', p.cliente], ['Periodo', p.periodo], ['Il mio ruolo', ruoli.join(', ')], ['Producer', p.producer]].filter(([, v]) => v);
    const altri = lista.filter((x) => x.slug !== p.slug).sort((a, b) => (b.tipo === p.tipo) - (a.tipo === p.tipo)).slice(0, 3);
    const by = [p.tipo === 'mio' ? 'Un mio podcast' : p.cliente ? `Podcast di ${p.cliente}` : '', p.periodo].filter(Boolean).join(' · ');
    const og = p.cover && base ? `${base}img/${p.slug}.jpg` : '';
    file[`${p.slug}/index.html`] = `${testa({ titolo: `${p.titolo} - ${g.nome}`, descr: p.breve || g.motto, pre: '../', og, url: base ? `${base}${p.slug}/` : '' })}
<header class="det"><div class="wrap"><a class="back" data-pf="home" href="../">← ${esc(g.titolo)}</a>
${cover(p, imgUrl, '../')}<h1 class="t">${esc(p.titolo)}</h1>${by ? `<p class="by">${esc(by)}</p>` : ''}</div></header>
<main class="det-main"><div class="wrap">
${info.length ? `<dl class="info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
${p.racconto && p.racconto.trim() ? `<section class="blocco"><h2 class="t">Di cosa parla</h2><div class="testo">${paragrafi(p.racconto)}</div></section>` : ''}
${fatto.length ? `<section class="blocco"><h2 class="t">Cosa ho fatto</h2><ul class="fatto">${fatto.map((f) => `<li><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>${inline(f)}</li>`).join('')}</ul></section>` : ''}
${p.citazione && p.citazione.trim() ? `<blockquote class="cit">${inline(p.citazione)}${p.citAutore ? `<cite>${esc(p.citAutore)}</cite>` : ''}</blockquote>` : ''}
${links.length ? `<section class="blocco"><h2 class="t">Ascolta</h2><div class="asc">${links.map((l, i) => `<a class="btn${i ? ' sec' : ''}" href="${esc(l.url)}" rel="noopener">${esc(l.nome)}</a>`).join('')}</div></section>` : ''}
${altri.length ? `<section class="blocco"><h2 class="t">Altri progetti</h2><div class="griglia">${altri.map((x) => scheda(x, imgUrl, '../')).join('')}</div></section>` : ''}
</div></main>${chiusura(g)}${piede(g)}</body></html>`;
  }
  return file;
}
