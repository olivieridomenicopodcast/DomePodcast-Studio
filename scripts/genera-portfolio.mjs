// Rigenera le pagine del portfolio da portfolio/data.json (e dalle immagini in portfolio/img/).
// Uso:  node scripts/genera-portfolio.mjs
// Di solito non serve: l'app esporta già lo zip con le pagine pronte. Serve se si modificano i dati a mano
// o se cambia il generatore (app/portfolio-sito.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cart = path.join(radice, 'portfolio');
const { generaSito, conSlug } = await import(pathToFileURL(path.join(radice, 'app/portfolio-sito.js')).href);

const pf = JSON.parse(fs.readFileSync(path.join(cart, 'data.json'), 'utf8'));
const esiste = (f) => fs.existsSync(path.join(cart, f));
pf.podcast.forEach((p) => { if (p.cover && !esiste(`img/${conSlug({ podcast: [p] })[0]?.slug}.jpg`)) { console.warn(`Manca la cover di «${p.titolo}»: la pagina usa il segnaposto.`); p.cover = false; } });
if (pf.generale.foto && !esiste('img/foto.jpg')) { console.warn('Manca img/foto.jpg: la foto in alto non compare.'); pf.generale.foto = false; }

const file = generaSito(pf, {});
for (const [nome, testo] of Object.entries(file)) {
  const dest = path.join(cart, nome);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, testo);
}
console.log(`Scritte ${Object.keys(file).length} pagine in portfolio/ (${conSlug(pf).length} podcast pubblicati).`);
