import { error, json } from '@sveltejs/kit';
import { addDays, parseKey, utahToday, week } from '#lib/calendar.ts';
import { GUIDE_PAGE } from '#lib/guide.ts';
import { currentGuide } from '#lib/server/guide.ts';
import { schedule, SYSTEMS } from '#lib/watering.ts';
import type { RequestHandler } from './$types';

// Machine-readable watering for home controllers: /api/schedule/salt-lake-spray[?date=2027-07-15]
// `this_week` follows Utah's Weekly Lawn Watering Guide when it covers the date, else the monthly plan.
// `date` lets you preview another week (the guide only covers the current one).
export const GET: RequestHandler = async ({ params, url, request }) => {
	const p = parseKey(params.key);
	if (!p) error(404, 'unknown county or sprinkler type (try salt-lake-spray)');
	const d = url.searchParams.get('date');
	if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) error(400, 'date must be YYYY-MM-DD');
	const date = d ?? utahToday();
	const { guide, fetched, error: guideError } = await currentGuide();
	const w = week(p, date, guide);
	const s = SYSTEMS[p.system];
	return json(
		{
			key: p.key,
			place: p.place,
			county: p.county,
			system: { id: p.system, label: s.label, precip_in_per_hr: s.pr, uniformity: s.du, max_cycle_min: s.maxCycleMin },
			start_time: '05:00',
			timezone: 'America/Denver',
			this_week: w,
			next_week: week(p, addDays(w.end, 1), guide),
			...(guideError ? { guide_error: guideError } : {}),
			guide: guide && { week: guide.week, start: guide.start, end: guide.end, waterings: guide.counties[p.county] ?? null, fetched, source: GUIDE_PAGE },
			months: schedule(p.eto, p.system).map((r) => ({ month: r.month, name: r.name, days: r.days, minutes_per_day: Math.round(r.minutesPerDay), cycles: r.cycles, minutes_per_cycle: Math.round(r.minutesPerCycle), weekly_in: +r.weeklyIn.toFixed(2) })),
			calendar: new URL(`/api/calendar/${p.key}.ics`, url).href
		},
		{ headers: { 'cache-control': 'public, max-age=900', 'access-control-allow-origin': '*' } }
	);
};
