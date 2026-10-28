// Screenshots of the live site for the deck and the demo fallback.
// Usage: node docs/pitch/tools/shots.mjs [name ...]   (no names = all)
// 1600x1000 viewport at 2x, motion off. Uses the preinstalled Google Chrome.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
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

// Numbers read off the live pages, so the deck, script and demo path quote what's on screen.
const FACTS = path.join(repo, 'docs/pitch/shots/facts.json');
const facts = fs.existsSync(FACTS) ? JSON.parse(fs.readFileSync(FACTS, 'utf8')) : {};
const num = (t, re) => { const m = t.match(re); return m ? Number(m[1].replace(/,/g, '')) : null; };
async function lotFacts() {
	const t = await page.innerText('main');
	return {
		address: (t.match(/\n([0-9]+ [A-Z0-9 .]+)\n/) ?? [])[1] ?? null,
		lot_sqft: num(t, /Lot ([\d,]+) sq ft/),
		lawn_sqft: num(t, /([\d,]+)\s*sq ft of lawn/),
		canopy_sqft: num(t, /Plus ([\d,]+) sq ft under trees/),
		converted_sqft: num(t, /([\d,]+) sq ft already converted/),
		need_in: num(t, /about (\d+) inches of water/),
		need_gal: num(t, /inches of water a season, or ([\d,]+) gallons/),
		corrections: num(t, /(\d+) corrections? so far/) ?? 0,
		range_lo: num(t, /Range before your edits: ([\d,]+)/),
		range_hi: num(t, /Range before your edits: [\d,]+–([\d,]+)/),
		rebate_usd: num(t, /up to \$([\d,]+)/),
		rebate_program: (t.match(/\n([^\n]+?): \$[\d.]+ per sq ft/) ?? [])[1] ?? null,
		native_gal: num(t, /Go native\s*([\d,]+) gal\/yr/),
		county: (t.match(/([A-Z. ]+) · ([A-Z]+) COUNTY/) ?? [])[2] ?? null
	};
}
const saveFacts = () => fs.writeFileSync(FACTS, JSON.stringify(facts, null, '\t') + '\n');

// Element crops for the flow slide: clip to the union of the matched elements plus padding.
async function crop(name, sels, pad = 14) {
	// Scroll the union into view and clip in viewport coordinates. (fullPage captures resize the
	// viewport, which clears MapLibre's WebGL canvas.)
	const rect = () => page.evaluate(([sels, pad]) => {
		const boxes = sels.map((q) => { const e = document.querySelector(q); if (!e) throw new Error('no ' + q); return e.getBoundingClientRect(); });
		const x0 = Math.min(...boxes.map((b) => b.left)) - pad, y0 = Math.min(...boxes.map((b) => b.top)) - pad;
		const x1 = Math.max(...boxes.map((b) => b.right)) + pad, y1 = Math.max(...boxes.map((b) => b.bottom)) + pad;
		return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
	}, [sels, pad]);
	const r0 = await rect();
	await page.evaluate((dy) => window.scrollBy(0, dy), r0.y - 10);
	await page.waitForTimeout(600);
	const r = await rect();
	await page.screenshot({ path: out(name), clip: r });
	console.log('ok', name, Math.round(r.width) + 'x' + Math.round(r.height));
}

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
		facts.lot = { ...(await lotFacts()), checked: new Date().toISOString() };
		await shot('03-lot');
		await shot('03-lot-full', { fullPage: true });
	},
	async bill() {
		await go(LOT); await page.waitForTimeout(1500);
		await page.click('summary:has-text("Add your water bill")');
		await page.setInputFiles('input[type=file]', BILL);
		await page.waitForFunction(() => /Read \d+ months/.test(document.body.innerText), null, { timeout: 60000 });
		await page.waitForTimeout(1500);
		{
			const t = await page.innerText('main');
			facts.bill = { gap_gal: num(t, /([\d,]+) gal\/yr\s*Overwatering/), outdoor_gal: num(t, /Your bill shows ([\d,]+) gal/), months: num(t, /Read (\d+) months/) };
		}
		await scrollToText('1 · Today', 140);
		await shot('04-bill-read');
		await page.click('summary:has-text("Edit your bill")').catch(() => {});
		await page.waitForTimeout(300);
		await scrollToText('1 · Today', 140);
		await shot('04-bill');
		await crop('zoom-bill', ['.card.door']);
	},
	async rebate() {
		await go(LOT); await page.waitForTimeout(1500);
		await scrollToText('2 · One time', 120);
		await shot('08-rebate');
	},
	async watering() {
		// The demo's path: straight to the plan for this lot's lawn (no bill).
		const lawn = facts.lot?.lawn_sqft ?? 11141;
		await go(`/watering?lawn=${lawn}&eto=slc&back=${encodeURIComponent(LOT)}`);
		await page.click('button:has-text("Pop-up spray heads")');
		await page.click('button:has-text("A basic timer")');
		await page.waitForTimeout(800);
		{
			const t = await page.innerText('main');
			const one = t.match(/YOUR ONE THING\s*\n+([^\n]+)\n+save ~([\d,]+) gal\/yr/i);
			facts.plan = { one_thing: one?.[1] ?? null, save_gal: one ? Number(one[2].replace(/,/g, '')) : null };
			const wk = (await page.waitForSelector('#calendar .week', { timeout: 15000 }).then((e) => e.innerText()).catch(() => '')).replace(/\s+/g, ' ').trim();
			const m = wk.match(/^This week(?: \(([^)]+)\))?: (.+)$/);
			facts.week = { label: m?.[1] ?? null, text: m?.[2] ?? wk, paused: /no watering/i.test(wk) };
		}
		await shot('05-watering');
		await scrollToText('Your one thing', 80);
		await shot('05-watering-plan');
		await scrollToText('Your schedule', 60);
		await shot('05-watering-schedule');
		await scrollTo('#calendar', 60);
		await shot('06-calendar');
		await crop('flow-4-calendar', ['#calendar']);
		await crop('flow-4-plan', ['.takeaway']);
		await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent.trim() === 'Your schedule').closest('section').setAttribute('data-schedule', ''));
		await crop('flow-4-schedule', ['[data-schedule] table']);
	},
	async connect() { await go('/connect'); await shot('06-connect'); },
	async native() {
		await go(`/native?lawn=${facts.lot?.lawn_sqft ?? 11141}&eto=slc&city=Salt+Lake+City&county=Salt+Lake&back=${encodeURIComponent(LOT)}`);
		await page.waitForTimeout(1000);
		await shot('07-native');
	},
	async impact() {
		await go('/impact'); await page.waitForTimeout(1500);
		await shot('12-impact');
		await shot('12-impact-full', { fullPage: true });
	},
	async flow() {
		await go('/');
		await page.fill('input', '603 E South Temple');
		await page.waitForSelector(`a[href="${LOT}"]`, { timeout: 20000 });
		await page.waitForTimeout(400);
		await crop('flow-1-search', ['input', `a[href="${LOT}"]`], 18);
		await go(LOT);
		await page.waitForFunction(() => [...document.querySelectorAll('.mapwrap img, .mapwrap image')].some((i) => (i.complete ?? true) && (i.naturalWidth ?? 1) > 0), null, { timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(4000);
		await crop('flow-2-map', ['.mapwrap', '.legend']);
		await crop('flow-2-lawn', ['.card.reveal']);
		await page.evaluate(() => document.querySelectorAll('.card.door')[2].setAttribute('data-native', ''));
		await page.evaluate(() => document.querySelectorAll('.card.door')[1].setAttribute('data-rebate', ''));
		await crop('flow-3-native', ['[data-native]']);
		await crop('flow-3-rebate', ['[data-rebate]']);
		await go(`/native?lawn=${facts.lot?.lawn_sqft ?? 11141}&eto=slc&city=Salt+Lake+City&county=Salt+Lake&back=${encodeURIComponent(LOT)}`);
		await page.waitForTimeout(800);
		await crop('flow-3-native-compare', ['.compare']);
	},
	async how() { await go('/how'); await shot('10-how'); },
	async district() { await go('/district/avenues'); await page.waitForTimeout(4000); await shot('11-district-avenues'); },
	async live() {
		await go(LIVE);
		await page.waitForFunction(() => /sq ft of lawn|didn't work/.test(document.body.innerText), null, { timeout: 120000 });
		if (/didn't work/.test(await page.innerText('body'))) throw new Error('live measurement failed: ' + (await page.innerText('main')).slice(0, 200));
		await page.waitForTimeout(2500);
		facts.live = { ...(await lotFacts()), url: LIVE, checked: new Date().toISOString() };
		await shot('09-live');
		await crop('zoom-live', ['.card.reveal']);
	}
};

const want = process.argv.slice(2);
for (const [name, fn] of Object.entries(SHOTS)) {
	if (want.length && !want.includes(name)) continue;
	try { await fn(); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
}
saveFacts();
await browser.close();
