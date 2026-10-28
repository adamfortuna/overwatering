// Screenshots of the OpenSprinkler demo firmware before/after the Overwater.ing connector runs.
// Needs the demo controller running: scripts/opensprinkler-demo.sh (then this script runs `sync` itself).
// Writes docs/pitch/shots/06-os-paused.png (this week: state guide says no watering) and
// 06-os-july.png (a July week). The UI assets come from ui.opensprinkler.com, whose Cloudflare
// rejects HeadlessChrome's user agent, so we send a desktop Chrome one.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const sync = (...args) => console.log(execFileSync(path.join(repo, 'scripts/opensprinkler-demo.sh'), ['sync', ...args], { encoding: 'utf8' }).trim());

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2, userAgent: UA });

async function capture(name) {
	await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(2500);
	if (await page.$('input[type=password]')) { await page.fill('input[type=password]', 'opendoor'); await page.keyboard.press('Enter'); await page.waitForTimeout(3500); }
	await page.evaluate(() => { location.hash = '#programs'; });
	await page.waitForTimeout(3000);
	// The single program is expanded by default; clip from its header through the station run times.
	const box = await page.evaluate(() => {
		const head = [...document.querySelectorAll('h3, .ui-collapsible-heading')].find((e) => /Overwater\.ing/.test(e.textContent));
		const st = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /^Stations/.test(e.textContent.trim()));
		const s8 = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /^S04:?$/.test(e.textContent.trim()));
		return { head: head?.getBoundingClientRect().toJSON(), st: st?.getBoundingClientRect().toJSON(), s4: s8?.getBoundingClientRect().toJSON(), h: document.documentElement.scrollHeight };
	});
	console.log(name, JSON.stringify(box));
	await page.screenshot({ path: path.join(repo, 'docs/pitch/shots', name + '-full.png'), fullPage: true });
}

sync('--date', '2027-07-14');
await capture('06-os-july');
sync();
await capture('06-os-paused');
await browser.close();
