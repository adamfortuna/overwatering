// This week's watering and a subscribable calendar (RFC 5545) for one county's weather and one
// sprinkler type. Neither depends on lawn size, so URLs carry no address: /api/schedule/salt-lake-spray.
import etoUtah from './eto_utah.json';
import { etoByKey } from './data.ts';
import { describeWaterings, GUIDE_IN_PER_WATERING, GUIDE_PAGE, type Guide } from './guide.ts';
import { schedule, SYSTEMS, type ScheduleRow, type SystemId } from './watering.ts';
import type { EtoTable } from './water.ts';

const slug = (s: string) => s.toLowerCase().replaceAll(' ', '-');
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICS_DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
/** Watering days for n waterings a week, spread out (0 = Sunday). */
export const WATER_DAYS: Record<number, number[]> = { 0: [], 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [0, 2, 4, 6] };
/** Start time, local: early, inside the 6 p.m.-10 a.m. window cities ask for. */
export const START = { h: 5, m: 0 };

export type PlanKey = { key: string; etoKey: string; county: string; place: string; system: SystemId; eto: EtoTable };

/** "salt-lake-spray" | "slc-rotor" | "box-elder-rotary" -> the weather table, county and sprinkler type. */
export function parseKey(key: string): PlanKey | null {
	const m = key.replace(/\.(ics|json)$/, '').match(/^([a-z-]+)-(spray|rotor|rotary|hose)$/);
	if (!m) return null;
	const system = m[2] as SystemId;
	let etoKey: string, county: string;
	if (m[1] === 'slc' || m[1] === 'sandy') {
		etoKey = m[1];
		county = 'Salt Lake';
	} else {
		const p = etoUtah.points.find((x) => slug(x.county) === m[1]);
		if (!p) return null;
		etoKey = county = p.county;
	}
	const eto = etoByKey(etoKey);
	return { key: `${m[1]}-${system}`, etoKey, county, place: eto.place, system, eto };
}
export const planKey = (etoKey: string, system: SystemId) => `${etoKey === 'slc' || etoKey === 'sandy' ? etoKey : slug(etoKey)}-${system}`;

// Dates as "YYYY-MM-DD" in Utah time, with day arithmetic in UTC so DST never shifts a day.
export const utahToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const toStr = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => toStr(new Date(toDate(s).getTime() + n * 86_400_000));
const dow = (s: string) => toDate(s).getUTCDay();
const month = (s: string) => +s.slice(5, 7);

export type Week = {
	date: string;
	start: string;
	end: string;
	month: number;
	/** 'plan' = our schedule from typical weather; 'guide' = the state's guide for this week. */
	source: 'plan' | 'guide' | 'off-season';
	waterings: number;
	days: string[];
	minutesPerDay: number;
	cycles: number;
	minutesPerCycle: number;
	/** This week vs. the month's plan: what a controller's seasonal adjust / water level should be. */
	waterLevelPct: number;
	/** Inches this week, and as a share of the peak (July) week: for controllers whose own schedule
	 * is set for midsummer and can only be scaled (Rachio's seasonal adjustment). */
	weeklyIn: number;
	peakPct: number;
	paused: boolean;
	note: string;
};

/** Watering for one day: run times from the month's plan, or the state guide's count for that week. */
function dayRule(p: PlanKey, rows: ScheduleRow[], date: string, guide: Guide | null) {
	const row = rows.find((r) => r.month === month(date));
	const g = guide && date >= guide.start && date <= guide.end ? (guide.counties[p.county] ?? null) : null;
	const s = SYSTEMS[p.system];
	if (g != null) {
		if (g === 0) return { source: 'guide' as const, waterings: 0, row, minutesPerDay: 0, cycles: 0, minutesPerCycle: 0, pct: 0 };
		// The guide's half inch per watering, applied through this system's rate and evenness.
		const min = (GUIDE_IN_PER_WATERING / s.du / s.pr) * 60;
		const cycles = Math.max(1, Math.ceil(min / s.maxCycleMin));
		const pct = row ? Math.round(((g * GUIDE_IN_PER_WATERING) / row.weeklyIn) * 20) * 5 : 100;
		return { source: 'guide' as const, waterings: g, row, minutesPerDay: min, cycles, minutesPerCycle: min / cycles, pct };
	}
	if (!row) return { source: 'off-season' as const, waterings: 0, row, minutesPerDay: 0, cycles: 0, minutesPerCycle: 0, pct: 0 };
	return { source: 'plan' as const, waterings: row.days, row, minutesPerDay: row.minutesPerDay, cycles: row.cycles, minutesPerCycle: row.minutesPerCycle, pct: 100 };
}

/** The Friday-to-Thursday week (the guide's week) containing `date`. */
export function week(p: PlanKey, date: string, guide: Guide | null): Week {
	const start = addDays(date, -((dow(date) + 2) % 7));
	const end = addDays(start, 6);
	const rows = schedule(p.eto, p.system);
	const r = dayRule(p, rows, date, guide);
	const weeklyIn = r.source === 'guide' ? r.waterings * GUIDE_IN_PER_WATERING : r.source === 'plan' ? r.row!.weeklyIn : 0;
	const peakIn = Math.max(...rows.map((x) => x.weeklyIn));
	const paused = r.waterings === 0;
	const sys = SYSTEMS[p.system].short;
	const note =
		r.source === 'off-season'
			? 'Off season: sprinklers off and blown out until spring.'
			: r.source === 'guide'
				? paused
					? `Utah's Weekly Lawn Watering Guide says no watering in ${p.county} County this week.`
					: `Utah's Weekly Lawn Watering Guide says ${describeWaterings(r.waterings).toLowerCase()} in ${p.county} County this week.`
				: `${r.row!.name} plan for ${sys} in ${p.place}'s typical weather.`;
	return {
		date,
		start,
		end,
		month: month(date),
		source: r.source,
		waterings: r.waterings,
		days: (WATER_DAYS[r.waterings] ?? []).map((d) => DOW[d]),
		minutesPerDay: Math.round(r.minutesPerDay),
		cycles: r.cycles,
		minutesPerCycle: Math.round(r.minutesPerCycle),
		waterLevelPct: r.pct,
		weeklyIn: Math.round(weeklyIn * 100) / 100,
		peakPct: Math.min(100, Math.round((weeklyIn / peakIn) * 20) * 5),
		paused,
		note
	};
}

// ---- iCalendar ----

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
/** Fold lines at 75 octets (RFC 5545 3.1), never splitting a UTF-8 character. */
function fold(line: string) {
	const out: string[] = [];
	let cur = '';
	let bytes = 0;
	for (const ch of line) {
		const b = new TextEncoder().encode(ch).length;
		if (bytes + b > (out.length ? 74 : 75)) {
			out.push(cur);
			cur = '';
			bytes = 0;
		}
		cur += ch;
		bytes += b;
	}
	out.push(cur);
	return out.join('\r\n ');
}
const compact = (s: string) => s.replaceAll('-', '');
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;

const VTIMEZONE = [
	'BEGIN:VTIMEZONE',
	'TZID:America/Denver',
	'BEGIN:DAYLIGHT',
	'TZOFFSETFROM:-0700',
	'TZOFFSETTO:-0600',
	'TZNAME:MDT',
	'DTSTART:19700308T020000',
	'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
	'END:DAYLIGHT',
	'BEGIN:STANDARD',
	'TZOFFSETFROM:-0600',
	'TZOFFSETTO:-0700',
	'TZNAME:MST',
	'DTSTART:19701101T020000',
	'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
	'END:STANDARD',
	'END:VTIMEZONE'
];

/**
 * A rolling year of watering days from `today`: one 5 a.m. event per watering day, run times from
 * the monthly plan, the state guide's count for the week it covers, and spring/fall reminders.
 * Calendar apps re-fetch the feed, so the guide week updates itself.
 */
export function ics(p: PlanKey, today: string, guide: Guide | null, baseUrl: string, now = new Date()): string {
	const rows = schedule(p.eto, p.system);
	const sys = SYSTEMS[p.system];
	const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
	const L: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Overwater.ing//Watering calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:Lawn watering · ${p.place} · ${sys.short}`,
		`X-WR-CALDESC:${esc(`When and how long to run ${sys.short} in ${p.place}'s weather, updated with Utah's Weekly Lawn Watering Guide. From overwater.ing.`)}`,
		'X-WR-TIMEZONE:America/Denver',
		'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
		'X-PUBLISHED-TTL:PT12H',
		...VTIMEZONE
	];
	const page = `${baseUrl}/watering?eto=${encodeURIComponent(p.etoKey)}`;
	const allDay = (date: string, uid: string, summary: string, desc: string) =>
		L.push('BEGIN:VEVENT', `UID:${uid}-${compact(date)}-${p.key}@overwater.ing`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compact(date)}`, `DTEND;VALUE=DATE:${compact(addDays(date, 1))}`, `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT', `URL:${page}`, 'END:VEVENT');

	const g = guide && guide.end >= today ? guide.counties[p.county] : undefined;
	if (g != null) {
		const summary = `State guide: ${describeWaterings(g).toLowerCase()} this week`;
		const desc = `Utah's Weekly Lawn Watering Guide for ${p.county} County, ${guide!.week}. ${GUIDE_PAGE}`;
		L.push('BEGIN:VEVENT', `UID:guide-${compact(guide!.start)}-${p.key}@overwater.ing`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${compact(guide!.start)}`, `DTEND;VALUE=DATE:${compact(addDays(guide!.end, 1))}`, `SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT', `URL:${GUIDE_PAGE}`, 'END:VEVENT');
	}
	for (let i = 0; i < 366; i++) {
		const date = addDays(today, i);
		const r = dayRule(p, rows, date, guide);
		const m = month(date);
		const y = +date.slice(0, 4);
		if (date === `${y}-04-01`) allDay(date, 'spring', 'Turn sprinklers on and walk each zone', 'Run each zone for a minute: fix broken or tilted heads and aim them off the sidewalk. Then follow this calendar.');
		if (date === `${y}-10-31`) allDay(date, 'fall', 'Last watering: shut off and blow out sprinklers', 'Before the first hard freeze. Frozen pipes are a spooky mess.');
		if (!r.waterings || !(WATER_DAYS[r.waterings] ?? []).includes(dow(date)) || !rows.some((x) => x.month === m)) continue;
		const total = Math.round(r.minutesPerDay);
		const runs = r.cycles > 1 ? `${r.cycles} × ${Math.round(r.minutesPerCycle)} min` : `${total} min`;
		const end = Math.min(START.h * 60 + START.m + Math.max(15, Math.round(total * 1.5)), 9 * 60 + 59);
		const why = r.source === 'guide' ? `Utah's Weekly Lawn Watering Guide says ${describeWaterings(r.waterings).toLowerCase()} in ${p.county} County this week (${guide!.week}), about ½ inch each.` : `${r.row!.name} plan: ${r.waterings} day${r.waterings === 1 ? '' : 's'} a week for ${p.place}'s typical weather, about ${r.row!.weeklyIn.toFixed(2)} in a week.`;
		L.push(
			'BEGIN:VEVENT',
			`UID:water-${compact(date)}-${p.key}@overwater.ing`,
			`DTSTAMP:${stamp}`,
			`DTSTART;TZID=America/Denver:${compact(date)}T${hhmm(START.h, START.m)}`,
			`DTEND;TZID=America/Denver:${compact(date)}T${hhmm(Math.floor(end / 60), end % 60)}`,
			`SUMMARY:${esc(`Water: ${runs} per zone`)}`,
			`DESCRIPTION:${esc(`${runs} on each lawn zone (${sys.short})${r.cycles > 1 ? ', an hour apart so it soaks in' : ''}. ${why} Skip it after a good rain. ${page}`)}`,
			'TRANSP:TRANSPARENT',
			`URL:${page}`,
			'END:VEVENT'
		);
	}
	L.push('END:VCALENDAR');
	return L.map(fold).join('\r\n') + '\r\n';
}
