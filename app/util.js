// util.js - piccole funzioni condivise (messaggi, download, condivisione, foto).
import { ritagliaBarreNere } from './render.js';

export const $ = (s, r = document) => r.querySelector(s);
export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200);
}

// Legge una foto dalla galleria, (facoltativo) toglie le barre nere e la riduce: restituisce un JPEG.
export async function processaFoto(file, max, taglia) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
  let r = { x: 0, y: 0, w: bmp.width, h: bmp.height };
  if (taglia) r = ritagliaBarreNere(bmp);
  const sc = Math.min(1, max / Math.max(r.w, r.h));
  const c = document.createElement('canvas'); c.width = Math.round(r.w * sc); c.height = Math.round(r.h * sc);
  c.getContext('2d').drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  return { blob, tagliata: r.w < bmp.width - 2 || r.h < bmp.height - 2 };
}

export function scaricaBlob(blob, nome) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function condividiFile(files) {
  try {
    if (navigator.canShare && navigator.canShare({ files })) await navigator.share({ files, title: 'DomePodcast Studio' });
    else toast('Questo telefono non può condividere i file da qui: usa «Scarica».');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Condivisione non riuscita: usa «Scarica».'); }
}
