const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.HOME+'/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  const p = await b.newPage({viewport:{width:1280,height:800}});
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:4184/'+(process.argv[2]||'index.html'),{waitUntil:'load'});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(()=>{const ids=['the-seed','roots','partial-view','tree','the-practice','the-meeting','influences','sky','ancestors','similar-trees','the-crew','afterward'];
   return {H:document.documentElement.scrollHeight, secs:ids.map(i=>{const e=document.getElementById(i);if(!e)return [i,null];const r=e.getBoundingClientRect();return [i,Math.round(r.top+scrollY),Math.round(r.height)]})}});
  console.log(JSON.stringify(r)); console.log('errs',errs);
  await b.close();
})();
