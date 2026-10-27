// Render the app's Svelte SVG art to transparent PNGs for the deck.
// Usage (from repo root, after `npm ci` in app/ and `npm i` in docs/pitch/tools/):
//   node docs/pitch/tools/art.mjs
// Server-renders each component with Vite + the Svelte plugin (the app's own node_modules),
// wraps it in an <svg> with a fitted viewBox, and screenshots it in Chrome with motion off.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const app = path.join(repo, 'app');
const out = path.join(repo, 'docs/pitch/art');
const req = createRequire(path.join(app, 'package.json'));
const { createServer } = await import(req.resolve('vite'));
const { svelte } = await import(req.resolve('@sveltejs/vite-plugin-svelte'));

const vite = await createServer({
	root: app,
	configFile: false,
	logLevel: 'error',
	server: { middlewareMode: true, hmr: false },
	appType: 'custom',
	plugins: [svelte({ compilerOptions: { runes: true, css: 'injected' } })]
});
const { render } = await vite.ssrLoadModule('svelte/server');
const load = async (p) => (await vite.ssrLoadModule(path.join(app, 'src/lib', p))).default;

// name, component, props, viewBox for the wrapping <svg> (null = component is its own <svg>), px width
const ART = [
	['sprinkler', 'art/Sprinkler.svelte', {}, '0 -40 280 205', 1400],
	['sprinkler-solo', 'art/Sprinkler.svelte', { spray: false }, '6 14 110 150', 700],
	['sprinkler-off', 'art/Sprinkler.svelte', { spray: false, off: true }, '6 14 120 150', 700],
	['grass', 'art/Grass.svelte', {}, '0 6 112 128', 800],
	['drop', 'art/Drop.svelte', {}, '0 -2 44 66', 500],
	['sun', 'art/Sun.svelte', {}, '-60 -60 120 120', 600],
	['coin', 'art/Coin.svelte', {}, '-32 -32 64 64', 500],
	['arch', 'art/Arch.svelte', {}, '-30 30 420 192', 1600],
	['arch-solo', 'art/Arch.svelte', { mountains: false, bowl: false }, '126 30 132 164', 700],
	['house-lawn', 'art/House.svelte', { mode: 'lawn' }, null, 1600],
	['house-native', 'art/House.svelte', { mode: 'native' }, null, 1600],
	['scene-hero', 'Scene.svelte', { variant: 'hero' }, null, 1600],
	['scene-footer', 'Scene.svelte', { variant: 'footer' }, null, 2400]
];

const fontUrl = (f) => 'file://' + path.join(process.env.HOME, '.local/share/fonts', f);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
fs.mkdirSync(out, { recursive: true });

async function shoot(name, markup, viewBox, width) {
	const [, , w, h] = (viewBox ?? markup.match(/viewBox="([^"]+)"/)[1]).split(/\s+/).map(Number);
	const height = Math.round((width * h) / w);
	let svg = viewBox ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">${markup}</svg>` : markup;
	svg = svg.replace(/^<svg /, `<svg width="${width}" height="${height}" `);
	const html = `<!doctype html><html><head><style>
		@font-face { font-family: Fredoka; src: url('${fontUrl('Fredoka%5Bwdth,wght%5D.ttf')}'); font-weight: 300 700; }
		:root { --display: Fredoka; } html, body { margin: 0; background: transparent; }
		svg { display: block; width: ${width}px !important; height: ${height}px !important; max-height: none !important; background: none !important; aspect-ratio: auto !important; }
	</style></head><body>${svg}</body></html>`;
	await page.setViewportSize({ width, height });
	await page.setContent(html);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: path.join(out, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width, height } });
	console.log(name, width + 'x' + height);
}

for (const [name, file, props, viewBox, width] of ART) {
	const { head, body } = render(await load(file), { props });
	const css = (head.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('');
	let markup = body.replace(/<!--[\s\S]*?-->/g, '');
	// Scene/House are their own <svg>; inject the component CSS inside it.
	markup = viewBox ? css.replace(/<style/g, '<style') + markup : markup.replace(/(<svg[^>]*>)/, `$1${css}`);
	await shoot(name, markup, viewBox, width);
}

// The logo mark (Logo.svelte's svg, without the wordmark).
{
	const { body } = render(await load('Logo.svelte'), { props: { wordmark: false, size: 64 } });
	const svg = body.match(/<svg[\s\S]*<\/svg>/)[0].replace(/ width="\d+" height="\d+"/, '').replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
	await shoot('logo', svg, null, 600);
}

await browser.close();
await vite.close();
