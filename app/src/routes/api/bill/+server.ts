import { json } from '@sveltejs/kit';
import { EXTERNAL_ANTHROPIC_API_KEY } from '$app/env/private';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { RequestHandler } from './$types';

// Extract monthly usage (with the bill's own unit) from a photo/PDF of a water bill.
// Salt Lake City bills carry a 12-month usage history chart, so one image gives a year.
const BillSchema = z.object({
	provider: z.string().describe('Water utility name as printed'),
	unit: z.enum(['gal', 'kgal', 'ccf', 'hcf', 'cuft', 'unknown']).describe('Unit of the usage figures exactly as the bill states them'),
	months: z.array(z.object({ year: z.number().nullable(), month: z.number().int().min(1).max(12), usage: z.number() })).describe('One entry per month visible on the bill'),
	notes: z.string().describe('Anything ambiguous: unreadable bars, estimated reads, unit uncertainty')
});

export const POST: RequestHandler = async ({ request }) => {
	// See src/env.ts: process env or app/.env in dev, Worker secret in production.
	const apiKey = EXTERNAL_ANTHROPIC_API_KEY;
	if (!apiKey) return json({ error: 'EXTERNAL_ANTHROPIC_API_KEY not configured; enter usage manually' }, { status: 501 });
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return json({ error: 'file required' }, { status: 400 });
	const bytes = Buffer.from(await file.arrayBuffer()).toString('base64');
	const isPdf = file.type === 'application/pdf';
	const client = new Anthropic({ apiKey });
	let response;
	try {
		// Beta surface only for server-side fallbacks: if a safety classifier declines, the API
		// re-runs the request on Anthropic's recommended fallback model inside the same call.
		response = await client.beta.messages.parse({
			model: 'claude-opus-5-5',
			max_tokens: 16000,
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			output_config: { effort: 'medium', format: betaZodOutputFormat(BillSchema) },
			messages: [
				{
					role: 'user',
					content: [
						isPdf
							? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes } }
							: { type: 'image', source: { type: 'base64', media_type: file.type as 'image/png' | 'image/jpeg' | 'image/webp', data: bytes } },
						{ type: 'text', text: 'This is a residential water bill. Read the monthly water usage history (chart or table). Report the unit exactly as the bill labels it (do not assume gallons vs hundred cubic feet). If a value is unreadable, omit that month and say so in notes.' }
					]
				}
			]
		});
	} catch (e) {
		// The UI falls back to the manual 12-month grid on any error status.
		if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Bill reading is not set up (API key rejected); enter usage manually' }, { status: 501 });
		if (e instanceof Anthropic.RateLimitError) return json({ error: 'Too many bills at once; try again in a minute or enter usage manually' }, { status: 429 });
		if (e instanceof Anthropic.BadRequestError) return json({ error: 'Could not read that file; try a clearer photo or a PDF' }, { status: 400 });
		if (e instanceof Anthropic.APIError) return json({ error: `Bill reader error (${e.status}); enter usage manually` }, { status: 502 });
		throw e;
	}
	if (response.stop_reason === 'refusal' || !response.parsed_output) return json({ error: 'could not read bill', stop_reason: response.stop_reason }, { status: 422 });
	return json(response.parsed_output);
};
