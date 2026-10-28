import { error } from '@sveltejs/kit';
import { ics, parseKey, utahToday } from '#lib/calendar.ts';
import { currentGuide } from '#lib/server/guide.ts';
import type { RequestHandler } from './$types';

// Subscribable watering calendar: webcal://overwater.ing/api/calendar/salt-lake-spray.ics
export const GET: RequestHandler = async ({ params, url, request }) => {
	if (!params.key.endsWith('.ics')) error(404, 'calendar URLs end in .ics');
	const p = parseKey(params.key);
	if (!p) error(404, 'unknown county or sprinkler type (try salt-lake-spray.ics)');
	const { guide } = await currentGuide();
	return new Response(ics(p, utahToday(), guide, url.origin), {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': `inline; filename="watering-${p.key}.ics"`,
			'cache-control': 'public, max-age=3600'
		}
	});
};
