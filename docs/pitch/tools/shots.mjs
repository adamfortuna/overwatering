// Screenshots of the live site for the deck and the demo fallback.
// Usage: node docs/pitch/tools/shots.mjs [name ...]   (no names = all)
// 1600x1000 viewport at 2x, motion off. Uses the preinstalled Google Chrome.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = (n) => path.join(repo, 'docs/pitch/shots', n + '.png');
const SITE = process.env.SITE ?? 'https://overwater.ing';
const LOT = '/p/84102/09314870040000'; // 603 E South Temple (Governor's Mansion)
const BILL = path.join(repo, 'scripts/fixtures/sample_slc_bill.png');
// A lot outside Salt Lake County, measured live in the browser.
const LIVE = process.env.LIVE ?? '/u/Washington/SG-464-CB';

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const go = (u) => page.goto(SITE + u, { waitUntil: 'networkidle' });
const shot = (n, opts = {}) => page.screenshot({ path: out(n), ...opts }).then(() => console.log('ok', n));
// Scroll so an element's top sits `pad` px below the viewport top.
const scrollTo = (sel, pad = 24) => page.evaluate(([s, p]) => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - p); }, [sel, pad]);
const scrollToText = (t, pad = 24) => page.evaluate(([t, p]) => {
	const e = [...document.querySelectorAll('h1,h2,h3,h4,p,summary,div,section')].find((e) => e.childElementCount < 4 && e.textContent.trim().startsWith(t));
	window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - p);
}, [t, pad]);

const SHOTS = {
	async home() { await go('/'); await shot('01-home'); },
	async search() {
		await go('/');
		await page.fill('input', '603 E South Temple');
		await page.waitForSelector(`a[href="${LOT}"]`, { timeout: 20000 });
		await page.waitForTimeout(500);
		await shot('02-search');
	},
	async lot() {
		await go(LOT); await page.waitForTimeout(2500);
		await shot('03-lot');
		await shot('03-lot-full', { fullPage: true });
	},
	async bill() {
		await go(LOT); await page.waitForTimeout(1500);
		await page.click('summary:has-text("Add your water bill")');
		await page.setInputFiles('input[type=file]', BILL);
		await page.waitForFunction(() => /Read \d+ months/.test(document.body.innerText), null, { timeout: 60000 });
		await page.waitForTimeout(1500);
		await scrollToText('1 · Today', 140);
		await shot('04-bill-read');
		await page.click('summary:has-text("Edit your bill")').catch(() => {});
		await page.waitForTimeout(300);
		await scrollToText('1 · Today', 140);
		await shot('04-bill');
	},
	async rebate() {
		await go(LOT); await page.waitForTimeout(1500);
		await scrollToText('2 · One time', 120);
		await shot('08-rebate');
	},
	async watering() {
		// Through the bill, the way the demo goes: lot -> bill -> "Build my watering plan".
		await go(LOT); await page.waitForTimeout(1500);
		await page.click('summary:has-text("Add your water bill")');
		await page.setInputFiles('input[type=file]', BILL);
		await page.waitForFunction(() => /Read \d+ months/.test(document.body.innerText), null, { timeout: 60000 });
		await page.click('a:has-text("Build my watering plan")');
		await page.waitForLoadState('networkidle');
		await page.click('button:has-text("Pop-up spray heads")');
		await page.click('button:has-text("A basic timer")');
		await page.waitForTimeout(800);
		await shot('05-watering');
		await scrollToText('Your one thing', 80);
		await shot('05-watering-plan');
		await scrollToText('Your schedule', 60);
		await shot('05-watering-schedule');
		await scrollTo('#calendar', 60);
		await shot('06-calendar');
	},
	async calendar() {
		await go(`/watering?lawn=11141&eto=slc&back=${encodeURIComponent(LOT)}`);
		await page.click('button:has-text("Pop-up spray heads")');
		await page.click('button:has-text("A basic timer")');
		await page.waitForTimeout(1500);
		await scrollTo('#calendar', 60);
		await shot('06-calendar-nobill');
	},
	async connect() { await go('/connect'); await shot('06-connect'); },
	async native() {
		await go(`/native?lawn=11141&eto=slc&city=Salt+Lake+City&county=Salt+Lake&back=${encodeURIComponent(LOT)}`);
		await page.waitForTimeout(1000);
		await shot('07-native');
	},
	async impact() {
		await go('/impact'); await page.waitForTimeout(1500);
		await shot('12-impact');
		await shot('12-impact-full', { fullPage: true });
	},
	async how() { await go('/how'); await shot('10-how'); },
	async district() { await go('/district/avenues'); await page.waitForTimeout(4000); await shot('11-district-avenues'); },
	async live() {
		await go(LIVE);
		await page.waitForFunction(() => /sq ft of lawn|didn't work/.test(document.body.innerText), null, { timeout: 120000 });
		if (/didn't work/.test(await page.innerText('body'))) throw new Error('live measurement failed: ' + (await page.innerText('main')).slice(0, 200));
		await page.waitForTimeout(2500);
		await shot('09-live');
	}
};

const want = process.argv.slice(2);
for (const [name, fn] of Object.entries(SHOTS)) {
	if (want.length && !want.includes(name)) continue;
	try { await fn(); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
}
await browser.close();
