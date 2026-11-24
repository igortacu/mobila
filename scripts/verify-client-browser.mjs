import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import os from 'node:os';

const file = process.argv[2] ?? 'dist/demo-client/roomsheet-demo.html';
const bytes = (await readFile(file)).length;
const url = pathToFileURL(resolve(file)).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await context.setOffline(true);
const errors = [];
const external = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => { if (!request.url().startsWith('file:') && !request.url().startsWith('data:')) external.push(request.url()); });

try {
  await page.goto(url, { waitUntil: 'load' });
  await page.locator('#stage canvas').waitFor({ state: 'visible' });
  const canvasReadyMs = await page.evaluate(() => Math.round(performance.now()));
  await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
  const result = await page.evaluate(() => ({
    fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime),
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasWidth: document.querySelector('#stage canvas')?.getBoundingClientRect().width ?? 0,
  }));
  await page.getByRole('button', { name: 'Spre dulap' }).click();
  await page.locator('#wardrobe-door').selectOption('left');
  await page.locator('#bed-lift').check();
  await page.locator('#season').selectOption('winter');
  await page.locator('#hour').selectOption('20');
  await page.locator('#wall-color').selectOption('#c4c9c2');
  await page.locator('#wall-finish').selectOption('satin');
  await page.locator('#floor-finish').selectOption('walnut');
  const interactive = await page.evaluate(() => ({
    door: document.querySelector('#wardrobe-door')?.value,
    bed: document.querySelector('#bed-lift')?.checked,
    season: document.querySelector('#season')?.value,
    hour: document.querySelector('#hour')?.value,
    walls: document.querySelector('#wall-color')?.value,
    wallFinish: document.querySelector('#wall-finish')?.value,
    floorFinish: document.querySelector('#floor-finish')?.value,
  }));
  const report = { file: resolve(file), bytes, browser: await browser.version(), os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model, viewport: '390×844', cpuThrottle: '4×', offline: true, canvasReadyMs, ...result, interactive, external, errors };
  console.log(JSON.stringify(report, null, 2));
  if (bytes > 5_000_000 || result.fcpMs >= 3000 || result.scrollWidth > result.viewportWidth || result.canvasWidth <= 0 || external.length || errors.length || interactive.door !== 'left' || !interactive.bed || interactive.hour !== '20' || interactive.wallFinish !== 'satin' || interactive.floorFinish !== 'walnut') process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
