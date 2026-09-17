const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../public');
const pages=fs.readdirSync(root,{recursive:true}).filter(p=>p.endsWith('.html'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4176';
 const failures=[];
 page.on('pageerror',e=>failures.push({url:page.url(),error:e.message}));
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  for(const file of pages){
   const url=base+'/'+file.replaceAll('\\','/');
   await page.goto(url);
   for(const img of await page.locator('img:visible').all())await img.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.images].filter(i=>i.getBoundingClientRect().height>0).every(i=>i.complete));
   const state=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    wide:[...document.querySelectorAll('h1,h2,h3')].filter(e=>!e.closest('[aria-hidden="true"],[inert]')&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.textContent),
    images:[...document.images].filter(i=>i.getBoundingClientRect().height>0&&!i.naturalWidth).map(i=>i.src)
   }));
   if(state.overflow||state.wide.length||state.images.length)failures.push({file,width,...state});
   if(width===390&&file.endsWith('index.html')){
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(os.tmpdir(),'audit-'+file.replaceAll(/[\\/]/g,'-')+'.png'),fullPage:true});
   }
  }
 }
 // Verify all local resources and navigable links without submitting forms.
 const checked=new Set();
 for(const file of pages){
  const url=base+'/'+file.replaceAll('\\','/');
  await page.goto(url);
  const links=await page.locator('[href],[src]').evaluateAll(els=>els.map(e=>e.href||e.src).filter(Boolean));
  for(const link of links){
   const target=new URL(link,url);if(target.origin!==base||checked.has(target.href))continue;
   checked.add(target.href);const response=await page.request.get(target.href);
   if(!response.ok())failures.push({file,link,status:response.status()});
  }
 }
 console.log(JSON.stringify({pages:pages.length,widths:[320,390,1440],resources:checked.size,failures},null,2));
 await browser.close();process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
