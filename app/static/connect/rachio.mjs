#!/usr/bin/env node
// Overwater.ing -> Rachio: scales your Rachio schedules to this week's watering.
//
// Rachio's public API can't write schedules, but it can set a schedule's seasonal adjustment and
// a rain delay. So: set your Rachio fixed schedule(s) for midsummer once, and run this every
// morning. It reads https://overwater.ing/api/schedule/<plan> (your county's weather + sprinkler
// type, following Utah's Weekly Lawn Watering Guide) and
//   - sets each schedule's seasonal adjustment to this week's water vs. the July peak
//     (April might be -60%, July 0%), or
//   - when the state says skip the week, sets a rain delay through the end of the guide's week.
//
//   node rachio.mjs --plan salt-lake-spray --token <API key from the Rachio app: Account > API access>
//
// Options (or environment variables):
//   --plan       <county>-<spray|rotor|rotary|hose>, from overwater.ing/watering   OW_PLAN
//   --token      Rachio API key                                                    RACHIO_TOKEN
//   --device     controller name, if you have more than one (default: the first)  RACHIO_DEVICE
//   --schedules  comma-separated schedule names (default: every enabled fixed schedule)
//   --date       preview another day's week, YYYY-MM-DD (default today)
//   --dry-run    print what would change, change nothing
//
// Flex schedules are left alone: Rachio already adjusts those from its own weather data.
// No dependencies; Node 18+. Runs anywhere with internet (Rachio is a cloud API).

const args = Object.fromEntries(
	process.argv.slice(2).reduce((acc, a, i, all) => {
		if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
		return acc;
	}, [])
);
const opt = {
	plan: args.plan ?? process.env.OW_PLAN,
	token: args.token ?? process.env.RACHIO_TOKEN,
	device: args.device ?? process.env.RACHIO_DEVICE,
	schedules: args.schedules ? args.schedules.split(',').map((s) => s.trim().toLowerCase()) : null,
	date: args.date,
	api: (args.api ?? 'https://overwater.ing').replace(/\/$/, ''),
	rachio: (process.env.RACHIO_API ?? 'https://api.rach.io/1').replace(/\/$/, ''),
	dry: args['dry-run'] === 'true'
};
if (!opt.plan || !opt.token || args.help) {
	console.log('usage: node rachio.mjs --plan salt-lake-spray --token <Rachio API key> [--device "Front yard"] [--schedules "Lawn,Park strip"] [--date 2027-07-14] [--dry-run]');
	process.exit(opt.plan && opt.token ? 0 : 2);
}

async function rachio(method, path, body) {
	const r = await fetch(`${opt.rachio}/public/${path}`, {
		method,
		headers: { authorization: `Bearer ${opt.token}`, 'content-type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(15000)
	});
	if (r.status === 401) throw new Error('Rachio rejected the API key');
	if (!r.ok) throw new Error(`Rachio ${method} /${path}: ${r.status} ${await r.text()}`);
	const text = await r.text();
	return text ? JSON.parse(text) : null;
}

/** Seconds from now until the end (23:59:59 Utah time) of `isoDate`, at most Rachio's 7 days. */
function secondsUntilEndOf(isoDate) {
	const now = new Date();
	// Utah is UTC-7 (MST) or UTC-6 (MDT); the hour of slack either way is fine for a rain delay.
	const end = Date.parse(`${isoDate}T23:59:59-07:00`);
	return Math.max(0, Math.min(604800, Math.round((end - now.getTime()) / 1000)));
}

const url = `${opt.api}/api/schedule/${encodeURIComponent(opt.plan)}${opt.date ? `?date=${opt.date}` : ''}`;
const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
const plan = await res.json();
const w = plan.this_week;

const { id: personId } = await rachio('GET', 'person/info');
const person = await rachio('GET', `person/${personId}`);
const devices = (person.devices ?? []).filter((d) => !d.deleted);
const device = opt.device ? devices.find((d) => d.name.toLowerCase() === opt.device.toLowerCase()) : devices[0];
if (!device) throw new Error(opt.device ? `no Rachio controller named "${opt.device}" (have: ${devices.map((d) => d.name).join(', ')})` : 'no Rachio controller on this account');
const rules = (device.scheduleRules ?? []).filter((r) => (opt.schedules ? opt.schedules.includes(r.name.toLowerCase()) : r.enabled));
if (!rules.length) throw new Error(`no ${opt.schedules ? 'matching' : 'enabled fixed'} schedules on "${device.name}" (have: ${(device.scheduleRules ?? []).map((r) => r.name).join(', ') || 'none'})`);

console.log(`${plan.county} County week of ${w.start} to ${w.end}: ${w.note}`);
if (w.paused) {
	const secs = secondsUntilEndOf(w.end);
	const days = (secs / 86400).toFixed(1);
	if (opt.dry) console.log(`[dry run] would set a ${days}-day rain delay on "${device.name}"`);
	else {
		await rachio('PUT', 'device/rain_delay', { id: device.id, duration: secs });
		console.log(`Set a ${days}-day rain delay on "${device.name}" (through ${w.end}).`);
	}
	if (w.source === 'off-season') console.log('Off season: Rachio rain delays max out at 7 days, so also turn the controller off in the app for winter.');
	process.exit(0);
}

// Rachio's adjustment is a fraction from -1 to 1 applied to each schedule's run times.
const adjustment = Math.round(Math.max(-1, Math.min(1, w.peakPct / 100 - 1)) * 100) / 100;
const label = `${adjustment >= 0 ? '+' : ''}${Math.round(adjustment * 100)}%`;
for (const r of rules) {
	if (opt.dry) console.log(`[dry run] would set "${r.name}" seasonal adjustment to ${label}`);
	else {
		await rachio('PUT', 'schedulerule/seasonal_adjustment', { id: r.id, adjustment });
		console.log(`Set "${r.name}" seasonal adjustment to ${label}: ${w.weeklyIn} in this week vs. July's peak.`);
	}
}
