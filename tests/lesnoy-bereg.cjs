const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4176';
  const project = base + '/projects/lesnoy-bereg/';
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const file of ['index', 'houses', 'experience', 'about', 'sosna', 'bereg', 'kedr', 'booking']) {
      const response = await page.goto(project + file + '.html');
      assert.equal(response.status(), 200, file);
      for (const img of await page.locator('img').all()) await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.images].every(img => img.complete));
      assert.equal(await page.evaluate(() => [...document.images].filter(img => !img.naturalWidth).length), 0, 'Images: ' + file);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Overflow: ' + file + ' at ' + width);
      await page.evaluate(() => scrollTo(0, 0));
      if (file === 'index') await page.screenshot({ path: path.join(os.tmpdir(), 'lesnoy-' + width + '.png'), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(project);
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Домики', exact: true }).click();
  await page.locator('.stay-search select').selectOption('6');
  assert.equal(await page.locator('.house-card:visible').count(), 1);
  await page.locator('#pets').check();
  await page.locator('#sauna').check();
  assert.equal(await page.locator('.house-card:visible').count(), 1);
  await page.locator('#reset-filters').click();
  assert.equal(await page.locator('.house-card:visible').count(), 3);
  await page.locator('.house-card:visible h3 a').first().click();
  await page.locator('.book-house').click();
  const arrival = await page.locator('[name=arrival]').inputValue();
  const departure = await page.locator('[name=departure]').inputValue();
  assert.equal((Date.parse(departure)-Date.parse(arrival))/86400000, 2);
  assert.match(await page.locator('#total').innerText(), /15\s?800/);
  await page.locator('[name=breakfast]').check();
  await page.locator('[name=boat]').check();
  assert.match(await page.locator('#total').innerText(), /19\s?900/);
  await page.locator('[name=guests]').selectOption('6');
  assert.equal(await page.locator('[type=submit]').isDisabled(), true);
  await page.locator('[name=house]').selectOption('kedr');
  assert.equal(await page.locator('[type=submit]').isEnabled(), true);
  assert.match(await page.locator('#total').innerText(), /41\s?100/);
  await page.locator('[name=departure]').fill(arrival);
  await page.locator('[name=departure]').dispatchEvent('change');
  assert.equal(await page.locator('[type=submit]').isDisabled(), true);
  await page.locator('[name=departure]').fill(departure);
  await page.locator('[name=departure]').dispatchEvent('change');
  await page.getByRole('button', { name: 'Завершить пробное бронирование' }).click();
  assert.equal(await page.locator('#confirmation').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#confirmation').isVisible(), false);
  await page.goto(base + '/');
  await page.locator('#lesnoy-project').scrollIntoViewIfNeeded();
  await page.screenshot({path: path.join(os.tmpdir(),'lesnoy-portfolio.png')});
  assert.equal(await page.locator('.lesnoy-cover img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  assert.deepEqual(errors, []);
  console.log('PASS: 8 pages at 390/1280 px, local images, menu, filters, date propagation, rates, capacity, invalid dates, confirmation and portfolio');
  console.log('Screenshots: ' + os.tmpdir());
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
