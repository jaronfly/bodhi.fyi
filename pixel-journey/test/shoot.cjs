// usage: node shoot.cjs <page> <WxH> <outprefix> y1 y2 ...  (y can be "id:sectionId:frac")
const { chromium } = require('playwright');
(async()=>{
  const [page,size,pre,...ys]=process.argv.slice(2);
  const [w,h]=size.split('x').map(Number);
  const b = await chromium.launch({executablePath:process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  const ctx = await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:0.5,isMobile:w<600,hasTouch:w<600});
  const p = await ctx.newPage();
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:4184/'+page,{waitUntil:'load'});
  await p.waitForTimeout(1200);
  for(const y of ys){
    let Y=y;
    if(String(y).startsWith('id:')){const [,id,f]=y.split(':');Y=await p.evaluate(([id,f])=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();return Math.round(r.top+scrollY+r.height*parseFloat(f)-innerHeight*0.5)},[id,f]);}
    await p.evaluate(Y=>window.scrollTo(0,Y),Number(Y));
    await p.waitForTimeout(700);
    await p.screenshot({path:`${pre}-${String(y).replace(/[:.]/g,'_')}.png`});
  }
  console.log('errs',errs);
  await b.close();
})();
