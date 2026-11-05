# Istruzioni per Claude Code – Dome Podcast Studio

Rispondi in italiano. Proprietario: Niky (Domenico Olivieri).

- Loghi e identità visiva: cartella `brand/`. Prima di usare un logo leggi `brand/CLAUDE.md` e `brand/README.md`: il **logo ufficiale** è `brand/logo/ufficiale/logo-ufficiale.svg`, tutto il resto in `brand/logo/varianti/` sono varianti ufficiali. Non usare `brand/archivio/`.
- Stile dei post/caroselli Instagram: cartella `stili-e-template/` (immagini di riferimento + `README.md` con colori e impaginazione). Per creare nuovi post parti da lì.
- Git: Niky vuole che commit, push e merge in `main` li faccia sempre Claude in autonomia, senza chiedere conferma. Non aprire pull request se non richiesto.

## La PWA «DomePodcast Studio»
Web app (PWA) per creare caroselli e post Instagram con la brand identity di Niky. Si pubblica con GitHub Pages da `main`, cartella root: https://olivieridomenicopodcast.github.io/DomePodcast-Studio/

### Brand (fonte unica: `assets/brand.css`)
- **Colori dei post:** viola `#2E1976`, arancione `#EE8F4D`, giallo-arancio `#F4B162`, lilla `#A98BEE`, bianco. I colori del logo (indaco/arancione `#FF5A00`) restano solo nel logo: non ricolorare il logo.
- **Font** (in `fonts/`, nessun @import da internet): Staatliches per i titoli maiuscoli (al posto di CS Gordon Serif di Canva, che ha licenza), Libre Baskerville per testi e intestazione.
- **Tono:** diretto e caldo, dai del tu, inviti brevi («Sbircia!», «Scopriamolo insieme!», «Chiedilo nei commenti!»). I testi li scrive Niky: non riscriverli.
- Guida completa: `brand-guide.html`. Non cambiare colori o font fuori da `assets/brand.css`.

### Struttura
- `index.html`, `app/`, `sw.js`, `manifest.webmanifest`, `icons/`: la PWA.
- `app/render.js`: motore di disegno su canvas (testo adattivo, foto con angoli tondi e bordi sfumati, foto a strisce, intestazione, ritaglio barre nere).
- `app/layouts.js`: **catalogo dei template** (8 tipi di slide). `app/elementi.js`: **catalogo degli elementi grafici** (frecce, triangoli, icone, forme, linee, badge numerati).
- `app/app.js` (interfaccia), `app/idb.js` (foto sul telefono), `app/zip.js`, `app/build.js` (numero di build).
- `templates/post.html`: versione HTML di riferimento dei template (testi e foto segnaposto).
- Formati: carosello 4:5 (1080×1350), carosello 3:4 (1080×1440), post singolo, post quadrato 1080×1080, cover reel 9:16 (1080×1920, contenuto nella fascia centrale 3:4).

### Quando Niky incolla un brief da DomePodcast Studio
1. Usa i **testi esattamente come scritti**; se vedi errori evidenti, segnalali senza cambiarli.
2. Le immagini allegate sono numerate (`immagine-1`, `immagine-2`…): abbinale alle slide come indicato.
3. Crea le slide con `app/layouts.js` e `app/elementi.js` (stessa resa dell'app). Il brief contiene lo stato in JSON: si può caricare nel `localStorage` con chiave `dps-stato-v1` e renderizzare con Playwright.
4. Mostra prima le anteprime in chat, correggi finché Niky non è soddisfatto, poi consegna i PNG con `SendUserFile` (anche in zip).
5. **Non committare** le foto di Niky, le copertine dei clienti o immagini con copyright: nel repo restano solo template, brand e codice.
6. Se i contenuti hanno fatti verificabili, controllali sul web e di' cosa è confermato e cosa no.

### Quando il brief chiede un NUOVO TEMPLATE o un NUOVO ELEMENTO
- **Template:** aggiungi un oggetto a `LAYOUTS` in `app/layouts.js` (`id`, `nome`, `descrizione`, `sfondo`, `accento`, `intestazione`, `campi`, `opzioni`, `draw`). Non toccare i layout esistenti. Usa `disegnaTesto` (testo adattivo) e le misure relative (`e.top`, `e.bottom`, `e.s`): deve reggere testi vuoti o lunghi e tutti i formati.
- **Elemento:** aggiungi una voce a `ELEMENTI` in `app/elementi.js` (tracciati SVG piatti, un solo colore dalla palette).
- Se crei file nuovi, aggiungili alla lista `FILE` di `sw.js`. Aggiungi un esempio in `templates/` se utile.
- Verifica con Playwright (viewport da telefono): nessun errore in console, anteprima corretta nei formati principali, export senza testi di esempio.

### Numero di build (in basso a sinistra nell'app)
L'app mostra «build N», con N = numero di commit; se online c'è una build più alta propone l'aggiornamento (il controllo usa `app/build.js?check`, sempre dalla rete).
**Prima di OGNI commit** esegui: `sh scripts/aggiorna-build.sh && git add app/build.js`. Niente hook di git: lo lanci a mano. Per portare il lavoro in `main` usa un merge fast-forward, così il numero resta esatto.

### Service worker (`sw.js`)
Strategia stale-while-revalidate. Tutti i file usati dall'app (anche quelli di `brand/`) vanno nella lista `FILE`. Se aggiungi un file nuovo, aggiornala.
