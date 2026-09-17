const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4176';
 for(const project of ['linea-dental','modul-store','privilegia','rtk-redesign','lesnoy-bereg']){
  await page.goto(base+'/projects/'+project+'/');
  const toggle=page.locator('.menu-button,.menu-toggle');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true',project);
  await page.keyboard.press('Escape');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false',project);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('menu-open')),false,project);
 }
 for(const [url,open,dialog] of [
  ['/', '.open-contact','#contact-dialog'],
  ['/projects/ember/','.open-booking','#booking-dialog'],
  ['/projects/linea-dental/','.js-book','#booking-dialog'],
  ['/projects/privilegia/','.open-tour','#tour-dialog']
 ]){
  await page.goto(base+url);
  await page.locator(open + ':visible').first().click();
  assert.equal(await page.locator(dialog).isVisible(),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  const box=await page.locator(dialog).boundingBox();
  await page.mouse.click(box.x+3,box.y+Math.min(30,box.height/2));
  assert.equal(await page.locator(dialog).isVisible(),true,'Padding must not close '+url);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator(dialog).isVisible(),false);
  await page.waitForFunction(()=>getComputedStyle(document.body).overflowY !== 'hidden');
 }
 await page.goto(base+'/projects/modul-store/');
 await page.locator('.add-button').first().click();
 assert.equal(await page.locator('.cart-drawer').evaluate(el=>el.inert),false);
 assert.equal(await page.locator('.cart-count').first().textContent(),'1');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.cart-drawer').evaluate(el=>el.inert),true);
 await page.locator('.search-button').click();
  await page.locator('#search-input').fill('диван');
  assert.match(await page.locator('.search-results').innerText(),/Ничего не найдено/);
  await page.locator('#search-input').fill('кресло');
 assert.ok(await page.locator('.search-result').count()>0);
 await page.locator('.search-result').first().click();
 assert.equal(await page.locator('#search-dialog').isVisible(),false);
 await page.goto(base+'/projects/rtk-redesign/');
 await page.locator('#route-calculator button').click();
 assert.match(await page.locator('#calc-result').innerText(),/₽/);
 await page.locator('#to').selectOption({label:'Москва'});
 await page.locator('#route-calculator button').click();
 assert.match(await page.locator('#calc-result').innerText(),/разные города/);
 await page.goto(base+'/projects/privilegia/apartments.html');
 await page.locator('[data-room="4"]').click();
 assert.ok(await page.locator('.apartment-card:not(.is-hidden)').count()>0);
 for(const card of await page.locator('.apartment-card:not(.is-hidden)').all())assert.equal(await card.getAttribute('data-rooms'),'4');
 console.log('PASS: menus, Escape, modal padding, scroll lock, cart, search, route calculator, apartment filters');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
