// github.js - sincronizzazione col repo tramite l'API di GitHub (push = invia, pull = riprendi).
// Il token resta SOLO in questo telefono (localStorage): non finisce mai nel repo.
const CHIAVE = 'dps-gh-v1';
export const GH_DEF = { token: '', repo: 'olivieridomenicopodcast/DomePodcast-Studio', branch: 'main', api: 'https://api.github.com' };

export function leggiConfig() {
  try { return { ...GH_DEF, ...(JSON.parse(localStorage.getItem(CHIAVE)) || {}) }; } catch { return { ...GH_DEF }; }
}
export function salvaConfig(c) { try { localStorage.setItem(CHIAVE, JSON.stringify(c)); } catch { /* spazio finito */ } }

export function spiegaErrore(e) {
  if (e && e.status === 401) return 'Token non valido o scaduto: controllalo in Impostazioni di GitHub.';
  if (e && e.status === 403) return 'Il token non ha il permesso (serve «Contents: Read and write» su questo repo) oppure hai fatto troppe richieste.';
  if (e && e.status === 404) return 'Repo o ramo non trovato: controlla il nome e che il token abbia accesso al repo.';
  if (e && e.status === 409) return 'Il sito è stato modificato nel frattempo: riprova.';
  if (e && e.status === 422) return 'GitHub ha rifiutato l\'aggiornamento (il sito è cambiato nel frattempo): riprova.';
  if (e instanceof TypeError) return 'Nessuna connessione a GitHub.';
  return 'Errore di GitHub: ' + (e && e.message ? e.message : e);
}

async function chiama(c, percorso, opz = {}) {
  const r = await fetch(c.api + percorso, {
    cache: 'no-store', ...opz,
    headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opz.json ? { 'Content-Type': 'application/json' } : {}), ...(opz.headers || {}) },
    body: opz.json ? JSON.stringify(opz.json) : opz.body,
  });
  if (!r.ok) { const e = new Error(`${r.status}`); e.status = r.status; throw e; }
  return r;
}

// Controlla che il token funzioni e possa scrivere nel repo
export async function provaToken(c) {
  const r = await (await chiama(c, `/repos/${c.repo}`)).json();
  return { puoScrivere: !!(r.permissions && r.permissions.push), nome: r.full_name || c.repo };
}

function inBase64(u8) {
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

// files: [{ path, data: Uint8Array }] (percorsi relativi alla cartella). Crea UN commit con tutte le modifiche
// e cancella i file generati che non servono più (pagine e immagini di podcast tolti).
export async function pushFile(c, cartella, files, messaggio, stato = () => {}) {
  for (let tentativo = 0; ; tentativo++) {
    try {
      const rep = `/repos/${c.repo}`;
      stato('Leggo lo stato del sito…');
      const head = (await (await chiama(c, `${rep}/git/ref/heads/${c.branch}`)).json()).object.sha;
      const baseTree = (await (await chiama(c, `${rep}/git/commits/${head}`)).json()).tree.sha;
      const esistenti = (await (await chiama(c, `${rep}/git/trees/${baseTree}?recursive=1`)).json()).tree
        .filter((t) => t.type === 'blob' && t.path.startsWith(cartella + '/')).map((t) => t.path);
      const voci = []; let fatti = 0;
      const coda = [...files];
      await Promise.all([0, 1, 2, 3].map(async () => {
        while (coda.length) {
          const f = coda.shift();
          const b = await (await chiama(c, `${rep}/git/blobs`, { method: 'POST', json: { content: inBase64(f.data), encoding: 'base64' } })).json();
          voci.push({ path: `${cartella}/${f.path}`, mode: '100644', type: 'blob', sha: b.sha });
          stato(`Carico i file… ${++fatti}/${files.length}`);
        }
      }));
      const nuovi = new Set(voci.map((v) => v.path));
      const generato = new RegExp(`^${cartella}/(index\\.html|[^/]+/index\\.html|img/[^/]+)$`);
      esistenti.filter((p) => generato.test(p) && !nuovi.has(p)).forEach((p) => voci.push({ path: p, mode: '100644', type: 'blob', sha: null }));
      stato('Preparo l\'aggiornamento…');
      const albero = await (await chiama(c, `${rep}/git/trees`, { method: 'POST', json: { base_tree: baseTree, tree: voci } })).json();
      if (albero.sha === baseTree) return { cambiato: false };
      const nc = await (await chiama(c, `${rep}/git/commits`, { method: 'POST', json: { message: messaggio, tree: albero.sha, parents: [head] } })).json();
      await chiama(c, `${rep}/git/refs/heads/${c.branch}`, { method: 'PATCH', json: { sha: nc.sha } });
      return { cambiato: true, sha: nc.sha };
    } catch (e) {
      if (tentativo < 1 && (e.status === 422 || e.status === 409)) continue; // il ramo si è mosso: un secondo tentativo
      throw e;
    }
  }
}

// Legge un file del repo (Blob), oppure null se non esiste.
export async function leggiFileRepo(c, percorso) {
  try { return await (await chiama(c, `/repos/${c.repo}/contents/${percorso}?ref=${encodeURIComponent(c.branch)}`, { headers: { Accept: 'application/vnd.github.raw+json' } })).blob(); }
  catch (e) { if (e.status === 404) return null; throw e; }
}
