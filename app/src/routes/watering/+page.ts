import type { PageLoad } from './$types';

// /watering?lawn=<sq ft>&eto=<slc|sandy|County>&out=<month:gallons,...>&back=<path>
export const load: PageLoad = ({ url }) => {
	const lawn = Number(url.searchParams.get('lawn'));
	const out = (url.searchParams.get('out') ?? '')
		.split(',')
		.map((p) => p.split(':').map(Number))
		.filter(([m, g]) => m >= 1 && m <= 12 && g >= 0);
	const back = url.searchParams.get('back') ?? '';
	return {
		lawn: lawn > 0 && lawn < 1_000_000 ? lawn : 2000,
		fromLot: lawn > 0,
		etoKey: url.searchParams.get('eto') ?? 'Salt Lake',
		outdoor: out.length ? Object.fromEntries(out) as Record<number, number> : null,
		back: back.startsWith('/') && !back.startsWith('//') ? back : ''
	};
};
