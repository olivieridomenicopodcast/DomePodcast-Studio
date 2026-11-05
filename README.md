# Dome Podcast Studio

Web app (PWA) per creare caroselli e post Instagram con la brand identity di Olivieri Domenico (podcast coach, editor e sound designer). Funziona da telefono, anche offline, e si installa sulla schermata home.

Indirizzo (GitHub Pages): https://olivieridomenicopodcast.github.io/DomePodcast-Studio/

## Cosa contiene

- [`brand/`](brand/): loghi e identità visiva (logo ufficiale, varianti, banner). Leggi [`brand/README.md`](brand/README.md).
- [`stili-e-template/`](stili-e-template/): esempi di post e caroselli Instagram da cui nascono i template. Leggi [`stili-e-template/README.md`](stili-e-template/README.md).
- [`brand-guide.html`](brand-guide.html): guida del brand (logo, palette dei post, font, regole d'uso, tono di voce).
- [`assets/brand.css`](assets/brand.css) e [`fonts/`](fonts/): colori e font (unica fonte, in locale).
- [`templates/post.html`](templates/post.html): i template in HTML di riferimento.
- `index.html`, [`app/`](app/), `sw.js`, `manifest.webmanifest`, `icons/`: la PWA.

## Cosa fa l'app

- **Crea:** scegli il formato (carosello 4:5, carosello 3:4, post singolo, quadrato, cover reel 9:16), aggiungi slide, scegli il tipo di ciascuna (8 template), scrivi i testi, carica la foto dalla galleria (angoli tondi e bordi sfumati, barre nere tolte da sole, opzioni «intera», «sfondo chiaro che si fonde» e «foto a strisce»), scegli sfondo e colori. Anteprima live; sposta, duplica ed elimina le slide.
- **Elementi grafici:** frecce, triangoli, icone, forme, linee e numeri da una libreria; colore, dimensione e rotazione si regolano, la posizione si trascina col dito.
- **Salva:** «Scarica» (Download del telefono), «Condividi» (menu del telefono), «Scarica zip».
- **Brief per Claude:** genera il messaggio da incollare in Claude Code, con le foto numerate da condividere e la casella per chiedere un nuovo template o elemento.
- **Impostazioni:** handle, nome, descrizione e foto profilo, installazione, elenco di template ed elementi, cancellazione dati.

Testi e foto restano sul telefono (localStorage e IndexedDB). In basso a sinistra compare «build N» (numero di commit): l'app avvisa quando ce n'è una più nuova.

## Per chi sviluppa

Vedi [`CLAUDE.md`](CLAUDE.md): struttura, come aggiungere template ed elementi, numero di build e regole di lavoro.
