import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { currentGuide, storeGuide } from '#lib/server/guide.ts';
import { verifyGithubOidc } from '#lib/server/github-oidc.ts';
import type { RequestHandler } from './$types';

// GET: the parsed Weekly Lawn Watering Guide we're using (all counties).
export const GET: RequestHandler = async () => json(await currentGuide(), { headers: { 'cache-control': 'public, max-age=300' } });

// POST: the raw guide page (https://wateringindex.utah.gov/traditional-wlwg.html), from the
// GitHub Action (its OIDC token, audience https://overwater.ing) or anyone holding the
// GUIDE_PUSH_SECRET Worker secret, since Cloudflare often can't reach utah.gov. Parsed and
// validated here, so a caller can only ever store a real guide page.
export const POST: RequestHandler = async ({ request }) => {
	const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
	const secret = env.GUIDE_PUSH_SECRET;
	const ok = (secret && bearer === secret) || (bearer.split('.').length === 3 && (await verifyGithubOidc(bearer, 'adamfortuna/overwatering', 'https://overwater.ing')));
	if (!ok) error(401, 'unauthorized');
	const html = await request.text();
	if (html.length > 2_000_000) error(413, 'too large');
	const guide = await storeGuide(html);
	if (!guide) error(422, "that doesn't look like the guide page");
	return json({ ok: true, week: guide.week, counties: Object.keys(guide.counties).length });
};
