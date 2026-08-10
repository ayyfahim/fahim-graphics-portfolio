// Screenshot + console/error capture for the bounded verification pass.
// Usage: node tools/shoot.mjs [baseUrl]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

// Playwright is resolved from wherever it is installed on this machine; this
// project intentionally ships with zero dependencies.
const require = createRequire(import.meta.url);
const PW = process.env.PW_PATH || 'D:/Work/mental-empire-studio/node_modules/playwright';
const { chromium } = require(PW);

const BASE = process.argv[2] || 'http://localhost:4321/';
const OUT = 'tools/shots';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desktop', width: 1440, height: 900, dsf: 2 },
  { name: 'mobile', width: 390, height: 844, dsf: 3, mobile: true },
];

const problems = [];

for (const v of VIEWS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dsf,
    isMobile: !!v.mobile,
    hasTouch: !!v.mobile,
  });
  const page = await ctx.newPage();

  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${v.name}][console.${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[${v.name}][pageerror] ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${v.name}][404/fail] ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${v.name}][http ${r.status()}] ${r.url()}`); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200); // let the reveal failsafe + guilloche settle

  // Horizontal overflow check
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const bad = [];
    if (de.scrollWidth > de.clientWidth + 1) {
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
          bad.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
        }
      });
    }
    return { doc: de.scrollWidth, client: de.clientWidth, bad: bad.slice(0, 12) };
  });
  if (overflow.doc > overflow.client + 1) {
    problems.push(`[${v.name}][overflow-x] scrollWidth ${overflow.doc} > client ${overflow.client}\n    ${overflow.bad.join('\n    ')}`);
  }

  // Tap-target check (mobile only)
  if (v.mobile) {
    const small = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('a,button,input,[role="slider"],[tabindex]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (getComputedStyle(el).display === 'none') return;
        if (r.height < 44 || r.width < 44) {
          out.push(`${el.tagName.toLowerCase()}[${(el.textContent || '').trim().slice(0, 22)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      });
      return out.slice(0, 20);
    });
    small.forEach((s) => problems.push(`[${v.name}][tap<44px] ${s}`));
  }

  await page.screenshot({ path: `${OUT}/${v.name}-01-first.png` });
  await page.screenshot({ path: `${OUT}/${v.name}-full.png`, fullPage: true });

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = Math.min(6, Math.ceil(total / v.height));
  for (let i = 1; i < steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * v.height);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${v.name}-${String(i + 1).padStart(2, '0')}-scroll.png` });
  }

  await browser.close();
}

console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No console/network/overflow/tap problems.');
