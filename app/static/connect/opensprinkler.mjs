#!/usr/bin/env node
// Overwater.ing -> OpenSprinkler: sets this week's lawn watering on your controller.
//
// Reads https://overwater.ing/api/schedule/<plan> (your county's weather + sprinkler type, following
// Utah's Weekly Lawn Watering Guide) and writes one weekly program named "Overwater.ing ..." to an
// OpenSprinkler on your network via its local HTTP API. Run it once a day (cron) on anything with
// Node 18+ on the same network: a Raspberry Pi, a Mac, the OpenSprinkler Pi itself.
//
//   node opensprinkler.mjs --plan salt-lake-spray --controller http://192.168.1.50 --zones 1,2,3
//
// Options (or environment variables):
//   --plan        <county>-<spray|rotor|rotary|hose>, from overwater.ing/watering   OW_PLAN
//   --controller  OpenSprinkler address (default http://localhost)                   OS_URL
//   --password    OpenSprinkler password (default opendoor)                          OS_PASSWORD
//   --zones       lawn zones (stations), 1-based, comma-separated (default 1)        OS_ZONES
//   --date        preview another day's week, YYYY-MM-DD (default today)
//   --api         default https://overwater.ing
//   --dry-run     print what would change, change nothing
//
// No dependencies. It only ever touches the program it created; your other programs, drip zones
// and settings are left alone. When the state says skip the week, the program is switched off
// and switched back on with new run times when watering resumes.
import { createHash } from 'node:crypto';

const NAME = 'Overwater.ing';
const args = Object.fromEntries(
	process.argv.slice(2).reduce((acc, a, i, all) => {
		if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
		return acc;
	}, [])
);
const opt = {
	plan: args.plan ?? process.env.OW_PLAN,
	controller: (args.controller ?? process.env.OS_URL ?? 'http://localhost').replace(/\/$/, ''),
	password: args.password ?? process.env.OS_PASSWORD ?? 'opendoor',
	zones: (args.zones ?? process.env.OS_ZONES ?? '1').split(',').map(Number).filter((n) => n >= 1),
	date: args.date,
	api: (args.api ?? 'https://overwater.ing').replace(/\/$/, ''),
	dry: args['dry-run'] === 'true'
};
if (!opt.plan || args.help) {
	console.log('usage: node opensprinkler.mjs --plan salt-lake-spray [--controller http://192.168.1.50] [--zones 1,2,3] [--date 2027-07-14] [--dry-run]');
	process.exit(opt.plan ? 0 : 2);
}
const pw = createHash('md5').update(opt.password).digest('hex');
const DAY_BIT = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const ERR = { 2: 'wrong password', 3: 'missing data', 16: 'data missing', 17: 'value out of range', 18: 'format error', 32: 'page not found', 48: 'not permitted' };

async function os(cmd, params = {}) {
	const q = new URLSearchParams({ pw, ...params }).toString().replace(/%5B/g, '[').replace(/%5D/g, ']').replace(/%2C/g, ',');
	const r = await fetch(`${opt.controller}/${cmd}?${q}`, { signal: AbortSignal.timeout(10000) });
	const j = await r.json();
	if (j.result != null && j.result !== 1) throw new Error(`OpenSprinkler /${cmd}: ${ERR[j.result] ?? `error ${j.result}`}`);
	return j;
}
const encDate = (iso) => (+iso.slice(5, 7)) * 32 + +iso.slice(8, 10); // OpenSprinkler date: month*32 + day
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const url = `${opt.api}/api/schedule/${encodeURIComponent(opt.plan)}${opt.date ? `?date=${opt.date}` : ''}`;
const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
const plan = await res.json();
const w = plan.this_week;

const jp = await os('jp');
const nStations = (jp.nboards ?? 1) * 8;
const zones = opt.zones.filter((z) => z <= nStations);
if (!zones.length) throw new Error(`no zones in range 1-${nStations}`);
const pid = jp.pd.findIndex((p) => typeof p[5] === 'string' && p[5].startsWith(NAME));
const name = `${NAME} ${plan.key}`.slice(0, (jp.pnsize ?? 32) - 1);
const where = `${plan.place}, ${plan.system.label.toLowerCase()}`;

console.log(`${plan.county} County week of ${w.start} to ${w.end}: ${w.note}`);
if (w.paused) {
	if (pid < 0) console.log('Nothing to switch off: no Overwater.ing program on this controller yet.');
	else if (opt.dry) console.log(`[dry run] would switch off program ${pid + 1} "${jp.pd[pid][5]}"`);
	else {
		await os('cp', { pid: String(pid), en: '0' });
		console.log(`Switched off program ${pid + 1} "${jp.pd[pid][5]}" for the week. Your other programs are untouched.`);
	}
	process.exit(0);
}

// Weekly program, repeating start type: first start 5:00, then (cycles - 1) repeats an hour or more
// apart (cycle and soak). Per-zone durations are seconds per cycle. Date range: this week plus a
// week of grace, so a missed sync falls back to "keep last week's schedule" for a few days, then stops.
const [h, m] = (plan.start_time ?? '05:00').split(':').map(Number);
const perCycleS = Math.round(w.minutesPerCycle * 60);
const gap = Math.max(60, Math.ceil((zones.length * w.minutesPerCycle + 10) / 10) * 10);
const days0 = w.days.reduce((b, d) => b | (1 << DAY_BIT[d]), 0);
const flag = 1 /* enabled */ | (0 << 1) /* our run times already follow the weather */ | (1 << 7); /* date range on */
const durs = Array.from({ length: nStations }, (_, i) => (zones.includes(i + 1) ? perCycleS : 0));
const v = `[${flag},${days0},0,[${h * 60 + m},${Math.max(0, w.cycles - 1)},${gap},0],[${durs.join(',')}]]`;
const params = { pid: String(pid), v, name, from: String(encDate(w.start)), to: String(encDate(addDays(w.end, 7))) };
const summary = `${w.days.join(', ')} at ${plan.start_time}: ${w.cycles > 1 ? `${w.cycles} × ${w.minutesPerCycle} min, ${gap} min apart` : `${w.minutesPerDay} min`} on zone${zones.length > 1 ? 's' : ''} ${zones.join(', ')} (${where})`;
if (opt.dry) console.log(`[dry run] would ${pid < 0 ? 'add' : 'update'} "${name}": ${summary}\n  /cp ${new URLSearchParams(params)}`);
else {
	await os('cp', params);
	console.log(`${pid < 0 ? 'Added' : 'Updated'} "${name}": ${summary}`);
}
