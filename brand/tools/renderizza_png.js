// Converte tutti gli SVG di logo/ufficiale e logo/varianti in PNG (sfondo trasparente) e crea le anteprime.
// Uso: NODE_PATH=$(npm root -g) node tools/renderizza_png.js   (serve playwright)
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const root=path.join(__dirname,'..','logo');
const dirs=['ufficiale','varianti'].map(d=>path.join(root,d)+path.sep);
(async()=>{const b=await chromium.launch();
for(const d of dirs){for(const f of fs.readdirSync(d).filter(f=>f.endsWith('.svg'))){
 const s=fs.readFileSync(d+f,'utf8');const m=s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
 const W=/^(logo-ufficiale|icona)/.test(f)&&m[2]===m[3]?1024:(f.startsWith('marchio')?1200:2000);const H=Math.round(W*m[3]/m[2]);
 const q=await b.newPage({viewport:{width:W,height:H}});
 await q.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}" style="width:${W}px;display:block">`);
 await q.screenshot({path:d+f.replace('.svg','.png'),omitBackground:true});await q.close();}}
const bd=path.join(root,'banner')+path.sep;
for(const f of fs.readdirSync(bd).filter(f=>f.endsWith('.svg'))){const s=fs.readFileSync(bd+f,'utf8');
 const q=await b.newPage({viewport:{width:3168,height:792}});await q.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}" style="width:3168px;display:block">`);
 await q.screenshot({path:bd+f.replace('.svg','.png')});await q.close();}
fs.mkdirSync(path.join(root,'anteprime'),{recursive:true});
const v=dirs[1],u=dirs[0];const all=[...fs.readdirSync(u).filter(f=>f.endsWith('.svg')).map(f=>u+f),...fs.readdirSync(v).filter(f=>f.endsWith('.svg')).map(f=>v+f)];
const cell=p=>`<div style="background:${p.includes('bianco-mono')?'#14162a':'#fff'};border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;padding:14px"><img src="data:image/svg+xml;base64,${fs.readFileSync(p).toString('base64')}" style="max-width:100%;max-height:190px"></div>`;
for(const [name,cols,filt] of [['panoramica-icone-marchi.png',4,p=>/(icona|marchio|logo-ufficiale\.)/.test(path.basename(p))],['panoramica-lockup.png',2,p=>/logo-/.test(path.basename(p))&&!/logo-ufficiale\./.test(path.basename(p))]]){
 const p=await b.newPage({viewport:{width:1400,height:900}});
 await p.setContent(`<body style="margin:0;padding:16px;background:#f4f4f6;display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px">`+all.filter(filt).map(cell).join('')+'</body>');
 await p.screenshot({path:path.join(root,'anteprime',name),fullPage:true});}
await b.close();})();
