import type { PageLoad } from './$types';

// /native?lawn=<sq ft>&eto=<slc|sandy|County>&city=<city>&county=<County>&back=<path>
export const load: PageLoad = ({ url }) => {
	const lawn = Number(url.searchParams.get('lawn'));
	const back = url.searchParams.get('back') ?? '';
	return {
		lawn: lawn > 0 && lawn < 1_000_000 ? Math.round(lawn) : null,
		etoKey: url.searchParams.get('eto') ?? 'Salt Lake',
		city: url.searchParams.get('city') ?? '',
		county: url.searchParams.get('county') ?? '',
		back: back.startsWith('/') && !back.startsWith('//') ? back : ''
	};
};
