"""Genera tutti i loghi (SVG) di Olivieri Domenico.

Uso:  python3 tools/genera_logo.py && node tools/renderizza_png.js
Richiede: fonttools (pip install fonttools) e il font Inter (solo per rigenerare il testo,
che negli SVG e' gia' convertito in tracciati). Cartella font: variabile FONT_DIR.

IL LOGO UFFICIALE E' IL TEMA 'indaco' (icona) e il suo lockup orizzontale: finiscono in logo/ufficiale/.
Tutti gli altri temi sono varianti ufficiali e finiscono in logo/varianti/.
"""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=ROOT+"/logo/varianti/"; UFF=ROOT+"/logo/ufficiale/"
FD=os.environ.get("FONT_DIR","/usr/share/fonts/opentype/inter/")
os.makedirs(OUT,exist_ok=True); os.makedirs(UFF,exist_ok=True)
INK="#12152B"
D4="M44 52H84A48 48 0 0 1 84 148H44Z M60 68H84A32 32 0 0 1 84 132H60Z"
OC=(136,100)
def text_path(txt,ff,size,x,y,tr):
    f=TTFont(FD+ff);gs=f.getGlyphSet();cm=f.getBestCmap();s=size/f["head"].unitsPerEm
    adv=[f["hmtx"][cm[ord(c)]][0]*s+tr*size for c in txt];tot=sum(adv)-tr*size
    pen=SVGPathPen(gs);cx=x
    for c,a in zip(txt,adv):
        gs[cm[ord(c)]].draw(TransformPen(pen,(s,0,0,-s,cx,y)));cx+=a
    return pen.getCommands(),tot
def arc(r,a0,a1):
    p=(OC[0]+r*math.cos(math.radians(a0)),OC[1]+r*math.sin(math.radians(a0)))
    q=(OC[0]+r*math.cos(math.radians(a1)),OC[1]+r*math.sin(math.radians(a1)))
    return f"M{p[0]:.2f} {p[1]:.2f}A{r} {r} 0 0 1 {q[0]:.2f} {q[1]:.2f}"
def T(**k): return k
THEMES={
 "indaco":T(bg=("#2A1FA6","#5B45F2"),D="#FFFFFF",O="#ECE8FA",ov=INK,w="#FFFFFF",text="#FFFFFF",sub="#D9D3FF"),
 "nero":T(bg="#0B0B0F",D="#FFFFFF",O="#FFFFFF",ov=None,w="#FFFFFF",text="#FFFFFF",sub="#B5B5BD"),
 "arancione-bianco":T(bg=("#FF5A00","#FF8A2B"),D="#FFFFFF",O="#FFEEDD",ov=INK,w="#FFFFFF",text="#FFFFFF",sub="#FFE3CC"),
 "arancione-viola":T(bg=("#FF5A00","#FF8A2B"),D="#2A1FA6",O="#6B50F5",ov="#FFE9D6",w="#2A1FA6",w2="#6B50F5",text="#2A1FA6",sub="#4B3DC4"),
 "colore":T(bg=None,D="#3226C0",O=INK,ov="#B9ADFF",w="#7C5CFF",text=INK,sub="#4A4F6B"),
 "nero-mono":T(bg=None,D="#000",O="#000",ov=None,w="#000",text="#000",sub="#333"),
 "arancione-mono":T(bg=None,D="#FF5A00",O="#FF5A00",ov=None,w="#FF5A00",text="#FF5A00",sub="#FF5A00"),
 "bianco-mono":T(bg=None,D="#FFF",O="#FFF",ov=None,w="#FFF",text="#FFF",sub="#DDD"),
}
def mark(t,u):
    kn=t["ov"] is None
    defs=f'<clipPath id="c{u}"><path d="{D4}" clip-rule="evenodd"/></clipPath>'
    if kn: defs+=f'<mask id="k{u}" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="200"><rect width="300" height="200" fill="#fff"/><g clip-path="url(#c{u})"><circle cx="136" cy="100" r="40" fill="none" stroke="#000" stroke-width="16"/></g></mask>'
    body=f'<g{" mask=%s"%chr(34)+"url(#k"+u+")"+chr(34) if kn else ""}><circle cx="136" cy="100" r="40" fill="none" stroke="{t["O"]}" stroke-width="16"/><path d="{D4}" fill="{t["D"]}" fill-rule="evenodd"/>'
    if not kn: body+=f'<g clip-path="url(#c{u})"><circle cx="136" cy="100" r="40" fill="none" stroke="{t["ov"]}" stroke-width="16"/></g>'
    body+='</g>'
    body+=f'<path d="{arc(61,-40,40)}" fill="none" stroke="{t["w"]}" stroke-width="7" stroke-linecap="round"/><path d="{arc(77,-40,40)}" fill="none" stroke="{t.get("w2",t["w"])}" stroke-opacity="{1 if t.get("w2") else .5}" stroke-width="7" stroke-linecap="round"/>'
    return defs,body
def bgdef(t,u):
    b=t["bg"]
    if isinstance(b,tuple): return f'<linearGradient id="b{u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{b[0]}"/><stop offset="1" stop-color="{b[1]}"/></linearGradient>',f"url(#b{u})"
    return "",b
def svg(name,vb,defs,body):
    x,y,w,h=vb
    open(OUT+name+".svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w*3}" height="{h*3}"><defs>{defs}</defs>{body}</svg>')
def icon(key):
    t=THEMES[key];d,b=mark(t,"i");bd,fill=bgdef(t,"i")
    svg(f"icona-{key}",(0,0,200,200),d+bd,f'<rect width="200" height="200" rx="46" fill="{fill}"/><g transform="translate(92 100) scale(.8) translate(-114 -100)">{b}</g>')
def marchio(key):
    t=THEMES[key];d,b=mark(t,"m")
    svg(f"marchio-{key}",(34,38,190,124),d,b)
def lockup(key,name,banner=False):
    t=THEMES[key];d,b=mark(t,"l");PAD=36 if banner else 6
    tx=PAD+173+34
    p1,w1=text_path("OLIVIERI DOMENICO","Inter-SemiBold.otf",40,tx,76,0.09)
    p2,w2=text_path("PODCAST COACH  ·  EDITOR  ·  SOUND DESIGNER","Inter-Medium.otf",13.4,tx+1,101,0.2)
    W=tx+max(w1,w2)+PAD;H=140
    bd,fill=bgdef(t,"l") if banner else ("","")
    bgr=f'<rect width="{W:.0f}" height="{H}" rx="14" fill="{fill}"/>' if banner else ""
    svg(name,(0,0,round(W),H),d+bd,f'{bgr}<g transform="translate({PAD-44} -30)">{b}</g><path d="{p1}" fill="{t["text"]}"/><path d="{p2}" fill="{t["sub"]}"/>')
for k in ["indaco","nero","arancione-bianco","arancione-viola"]: icon(k)
for k in ["colore","nero-mono","arancione-mono","bianco-mono"]: marchio(k)
for k,n in [("colore","logo-colore"),("nero-mono","logo-nero"),("arancione-mono","logo-arancione")]: lockup(k,n)
for k in ["indaco","nero","arancione-bianco","arancione-viola"]: lockup(k,f"logo-banner-{k}",True)

# I due file ufficiali vengono spostati/rinominati in logo/ufficiale/
for a,b in [("icona-indaco","logo-ufficiale"),("logo-banner-indaco","logo-ufficiale-orizzontale")]:
    os.replace(OUT+a+".svg",UFF+b+".svg")
    if os.path.exists(OUT+a+".png"): os.remove(OUT+a+".png")

# ---- Banner LinkedIn (1584x396; la foto profilo copre in basso a sinistra, quindi il contenuto sta al centro) ----
BAN=ROOT+"/logo/banner/"; os.makedirs(BAN,exist_ok=True)
def banner_linkedin(name,dark):
    W,H=1584,396
    if not dark:   # bianco, come il primo logo: icona ufficiale + nome
        t=THEMES["indaco"];d,b=mark(t,"b");bd,fill=bgdef(t,"b");S=190;gap=46
        nsz,dsz=58,19.5;tcol,scol=INK,"#4A4F6B"
        n,wn=text_path("OLIVIERI DOMENICO","Inter-SemiBold.otf",nsz,0,0,0.09);_,wd=text_path("PODCAST COACH  ·  EDITOR  ·  SOUND DESIGNER","Inter-Medium.otf",dsz,0,0,0.2)
        total=S+gap+max(wn,wd);x0=(W-total)/2;tx=x0+S+gap;cy=H/2
        capn=nsz*.727;capd=dsz*.727;g=22;top=cy-(capn+g+capd)/2
        p1,_=text_path("OLIVIERI DOMENICO","Inter-SemiBold.otf",nsz,tx,top+capn,0.09)
        p2,_=text_path("PODCAST COACH  ·  EDITOR  ·  SOUND DESIGNER","Inter-Medium.otf",dsz,tx+2,top+capn+g+capd,0.2)
        body=(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>'
              f'<g transform="translate({x0:.1f} {cy-S/2:.1f}) scale({S/200})"><rect width="200" height="200" rx="46" fill="{fill}"/><g transform="translate(92 100) scale(.8) translate(-114 -100)">{b}</g></g>'
              f'<path d="{p1}" fill="{tcol}"/><path d="{p2}" fill="{scol}"/>')
        defs=d+bd
    else:          # indaco a tutta larghezza: marchio senza quadrato + nome in bianco
        t=THEMES["indaco"];d,b=mark(t,"b");bd,_=bgdef(t,"b");k=1.45;mw=173*k;gap=56
        nsz,dsz=58,19.5
        _,wn=text_path("OLIVIERI DOMENICO","Inter-SemiBold.otf",nsz,0,0,0.09);_,wd=text_path("PODCAST COACH  ·  EDITOR  ·  SOUND DESIGNER","Inter-Medium.otf",dsz,0,0,0.2)
        total=mw+gap+max(wn,wd);x0=(W-total)/2;tx=x0+mw+gap;cy=H/2
        capn=nsz*.727;capd=dsz*.727;g=22;top=cy-(capn+g+capd)/2
        p1,_=text_path("OLIVIERI DOMENICO","Inter-SemiBold.otf",nsz,tx,top+capn,0.09)
        p2,_=text_path("PODCAST COACH  ·  EDITOR  ·  SOUND DESIGNER","Inter-Medium.otf",dsz,tx+2,top+capn+g+capd,0.2)
        grad='<linearGradient id="bb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A1FA6"/><stop offset="1" stop-color="#5B45F2"/></linearGradient>'
        body=(f'<rect width="{W}" height="{H}" fill="url(#bb)"/>'
              f'<g transform="translate({x0-44*k:.1f} {cy-100*k:.1f}) scale({k})">{b}</g>'
              f'<path d="{p1}" fill="#FFFFFF"/><path d="{p2}" fill="#D9D3FF"/>')
        defs=d+grad
    open(BAN+name+".svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{defs}</defs>{body}</svg>')
banner_linkedin("banner-linkedin-chiaro",False)
banner_linkedin("banner-linkedin-indaco",True)
