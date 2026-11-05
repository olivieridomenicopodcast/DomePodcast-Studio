# Brand e loghi – Olivieri Domenico (Podcast coach, editor e sound designer)

Cartella dei loghi (in `brand/` del repo DomePodcast-Studio) e dell'identità visiva di **Olivieri Domenico**, con sigla **DO**.

## Logo ufficiale

Il **logo ufficiale** è il monogramma **DO** in bianco su quadrato arrotondato con sfumatura **indaco/viola**: la D e la O si intrecciano e dalla O escono due onde sonore (il riferimento ai podcast e all'audio).

| File | Uso |
|---|---|
| [`logo/ufficiale/logo-ufficiale.svg`](logo/ufficiale/logo-ufficiale.svg) (+ `.png` 1024×1024) | **Icona ufficiale**: foto profilo, app, favicon, cover, ovunque serva un logo quadrato |
| [`logo/ufficiale/logo-ufficiale-orizzontale.svg`](logo/ufficiale/logo-ufficiale-orizzontale.svg) (+ `.png`) | **Lockup ufficiale orizzontale**: monogramma + "OLIVIERI DOMENICO" + "PODCAST COACH · EDITOR · SOUND DESIGNER". Banner, firme email, copertine, sito |

![Logo ufficiale](logo/ufficiale/logo-ufficiale.png)

## Varianti ufficiali

Tutte le altre versioni in [`logo/varianti/`](logo/varianti/) sono **varianti ufficiali** dello stesso logo: stessa forma, solo colori diversi o senza sfondo. Si usano quando il logo ufficiale non va bene per il fondo o per il tipo di stampa.

| Variante | File | Quando usarla |
|---|---|---|
| Nero | `icona-nero`, `logo-banner-nero` | Versione stilizzata nera con lettere bianche |
| Arancione, lettere bianche | `icona-arancione-bianco`, `logo-banner-arancione-bianco` | Alternativa vivace, per spiccare |
| Arancione, lettere viola | `icona-arancione-viola`, `logo-banner-arancione-viola` | Alternativa vivace con le lettere in viola |
| Marchio a colori (senza sfondo) | `marchio-colore`, `logo-colore` | Su fondi chiari, quando non si vuole il quadrato |
| Monocolore nero | `marchio-nero-mono`, `logo-nero` | Timbri, stampe in bianco e nero, ricami |
| Monocolore arancione | `marchio-arancione-mono`, `logo-arancione` | Stampe a un colore su fondo chiaro |
| Monocolore bianco | `marchio-bianco-mono` | Su fondi scuri o foto (il PNG è trasparente: su sfondo bianco sembra vuoto) |

## Banner LinkedIn

In [`logo/banner/`](logo/banner/), formato LinkedIn **1584×396** (i PNG sono a doppia risoluzione, 3168×792, per restare nitidi):

- `banner-linkedin-chiaro`: sfondo bianco con icona ufficiale + nome e descrizione (la versione di riferimento).
- `banner-linkedin-indaco`: sfondo indaco a tutta larghezza con marchio e testo bianchi.

Il contenuto è centrato: su LinkedIn la foto profilo copre in basso a sinistra, quindi non mettere nulla in quella zona.

Anteprima di tutto: [`logo/anteprime/`](logo/anteprime/).

Ogni file esiste in **SVG** (vettoriale, da preferire) e **PNG** (sfondo trasparente).

## Regole d'uso

1. **Se non c'è un motivo specifico, usa il logo ufficiale** (sfondo indaco).
2. Le varianti vanno usate così come sono: non cambiare proporzioni, forma, spessori o posizione delle onde.
3. Non rimettere il vecchio logo con la "P" né le prove in `archivio/`.
4. Colori, font e geometria sono in [`brand.json`](brand.json).
5. Lascia attorno al logo uno spazio libero di almeno la metà dello spessore della D.

## Come rigenerare i file

Tutti gli SVG nascono da un unico script, così le varianti restano coerenti:

```bash
pip install fonttools          # serve il font Inter (variabile FONT_DIR se non è in /usr/share/fonts/opentype/inter/)
python3 tools/genera_logo.py   # scrive gli SVG in logo/ufficiale/ e logo/varianti/
NODE_PATH=$(npm root -g) node tools/renderizza_png.js   # PNG + anteprime (serve playwright)
```

Per aggiungere una variante basta definire un nuovo tema in `THEMES` dentro `tools/genera_logo.py`.

## Struttura

```
logo/ufficiale/   logo ufficiale (icona + lockup orizzontale)
logo/varianti/    varianti ufficiali (colori e monocolore)
logo/banner/      banner LinkedIn (1584x396)
logo/anteprime/   immagini riassuntive
tools/            script che generano i loghi
archivio/         prove scartate: NON usare
brand.json        colori, font, geometria
CLAUDE.md         istruzioni per Claude Code
```

> Tutti i comandi vanno lanciati dalla cartella `brand/`. Il lavoro sulle altre parti del repo (fuori da `brand/`) non tocca i loghi.
