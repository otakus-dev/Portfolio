const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({reducedMotion:'reduce'});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4176';
 const root=path.resolve(__dirname,'../public');
 const paths=['index.html',...fs.readdirSync(path.join(root,'projects')).flatMap(dir=>fs.readdirSync(path.join(root,'projects',dir)).filter(f=>f.endsWith('.html')).map(f=>'projects/'+dir+'/'+f))];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report=[];
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});
  for(const file of paths){
   await page.goto(base+'/'+file);
   for(const img of await page.locator('img:visible').all()) await img.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.images].filter(i=>i.getBoundingClientRect().width).every(i=>i.complete));
   const state=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),
    badAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),
    wide:[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>e.textContent)
   }));
   report.push({file,width,...state});
   if(file.endsWith('index.html')){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(os.tmpdir(),'audit-'+file.replaceAll('/','-')+'-'+width+'.png')});}
  }
 }
 console.log(JSON.stringify({report,errors},null,2));await browser.close();
 if(errors.length||report.some(r=>r.overflow||r.broken.length||r.badAnchors.length||r.wide.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
