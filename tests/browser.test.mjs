import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const url = 'http://127.0.0.1:8890/';
let browser, server;
before(async () => {
  server = spawn('python3', ['-m', 'http.server', '8890', '-d', '_site', '--bind', '127.0.0.1'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    if (i === 59) throw Error('Servidor de QA no disponible');
    await delay(250);
  }
  browser = await chromium.launch({ headless: true });
  mkdirSync('qa-screenshots', { recursive: true });
});
after(async () => { await browser?.close(); server?.kill(); });

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`Responsive ${width}px y WCAG automatizado`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('h1').waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 2) {
        const offenders = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).map(el => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className.slice(0, 100) : '', left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        }).filter(x => x.right > innerWidth + 2 || x.left < -2).sort((a,b) => b.right - a.right).slice(0, 20));
        console.log('OVERFLOW_DIAGNOSTIC_' + width, JSON.stringify(offenders));
      }
      assert.ok(overflow <= 2, `Overflow horizontal: ${overflow}px`);
      assert.deepEqual(errors, [], 'Errores JS');
      await page.screenshot({ path: `qa-screenshots/jimena-${width}.png`, fullPage: true, animations: 'disabled', timeout: 30000 });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      const serious = axe.violations.filter(v => ['serious', 'critical'].includes(v.impact));
      assert.equal(serious.length, 0, JSON.stringify(serious.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), null, 2));
    } finally { await ctx.close(); }
  });
}

test('FAQ: cambio de categoría informa el estado accesible', async () => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const buttons = page.locator('[data-faq] [data-topic]');
    assert.ok((await buttons.count()) >= 2);
    await buttons.nth(1).click();
    assert.equal(await buttons.nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await buttons.nth(0).getAttribute('aria-pressed'), 'false');
  } finally { await ctx.close(); }
});
