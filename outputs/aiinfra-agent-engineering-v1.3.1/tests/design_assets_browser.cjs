const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const [repository, registryFile] = process.argv.slice(2);
const library = fs.realpathSync(path.join(repository, 'ai-infra-research'));
const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
const origin = 'http://127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
};

async function verify(browser, id, entry, check) {
  const asset = registry.assets.find((item) => item.id === id);
  assert.ok(asset?.entrypoints.includes(entry), entry);
  const files = asset.libraryDependencies.sha256;
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const relative = decodeURIComponent(url.pathname.slice(1));
    try {
      assert.ok(url.origin === origin && Object.hasOwn(files, relative), 'outside registered closure');
      const file = fs.realpathSync(path.join(library, relative));
      assert.ok(file.startsWith(library + path.sep), 'outside library');
      const body = fs.readFileSync(file);
      assert.equal(createHash('sha256').update(body).digest('hex'), files[relative]);
      await route.fulfill({ body, contentType: types[path.extname(file)] || 'application/octet-stream' });
    } catch (error) {
      errors.push(url.href + ' ' + error.message);
      await route.abort();
    }
  });
  try {
    await page.goto(origin + '/' + entry);
    const checks = await check(page).catch((error) => {
      throw new Error([error.message, ...errors].join('\n'), { cause: error });
    });
    assert.deepEqual(errors, []);
    return { id, entry, sha256: files[entry], checks, status: 'passed' };
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE });
  try {
    const results = [];
    results.push(await verify(browser, 'unpack-layout-inspector', 'patterns/unpack-layout-inspector/index.html', async (page) => {
      const graph = page.locator('#world');
      await graph.locator('[data-action="cell"]').first().waitFor({ state: 'attached' });
      const before = await graph.getAttribute('transform');
      await page.locator('#plus').click();
      assert.notEqual(await graph.getAttribute('transform'), before);
      const zoomed = await graph.getAttribute('transform');
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.move(canvas.x + 30, canvas.y + 30);
      await page.mouse.down();
      await page.mouse.move(canvas.x + 100, canvas.y + 70, { steps: 4 });
      await page.mouse.up();
      assert.notEqual(await graph.getAttribute('transform'), zoomed);
      await page.locator('#configTrigger').click();
      await page.getByRole('option').nth(1).click();
      assert.equal(await page.locator('#config').inputValue(), '1');
      await page.locator('#sourceToggle').click();
      assert.ok(await page.locator('#sourceWindow').isVisible());
      return ['zoom', 'drag pan', 'configuration change', 'source inspector'];
    }));
    results.push(await verify(browser, 'model-architecture-v41', 'patterns/model-architecture-v4/index.html', async (page) => {
      await page.locator('#v4Graph svg').first().waitFor({ state: 'attached' });
      assert.equal(await page.evaluate(() => typeof window.PtoV4ModelArchitecturePattern.render), 'function');
      await page.locator('#legend-toggle').click();
      assert.ok(await page.locator('#legend-panel').isVisible());
      const theme = await page.locator('#theme').textContent();
      await page.locator('#theme').click();
      assert.notEqual(await page.locator('#theme').textContent(), theme);
      await page.locator('#layers-toggle').click();
      const count = await page.locator('#layers-count').textContent();
      await page.locator('#layers-menu input').first().click();
      assert.notEqual(await page.locator('#layers-count').textContent(), count);
      return ['renderer mount and API', 'legend toggle', 'theme change', 'information-layer toggle'];
    }));
    console.log(JSON.stringify({ catalog: registry.catalog, viewport: [1440, 1000], results }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
