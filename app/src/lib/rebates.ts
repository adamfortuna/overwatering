import table from './rebate_programs.json';

export type Provider = (typeof table.providers)[number];

export function resolveProvider(city: string): Provider {
	const c = (city || '').trim().toLowerCase();
	return table.providers.find((p) => p.cities.some((x) => x.toLowerCase() === c)) ?? table.providers.find((p) => p.id === 'state')!;
}

export function rebateEstimate(lawnSqft: number, city: string) {
	const p = resolveProvider(city);
	const eligible = lawnSqft >= p.min_sqft;
	const area = p.max_sqft ? Math.min(lawnSqft, p.max_sqft) : lawnSqft;
	const cap = (d: number) => (p.max_dollars ? Math.min(d, p.max_dollars) : d);
	return {
		provider: p,
		eligible,
		eligibleSqft: eligible ? area : 0,
		low: eligible ? cap(area * p.rate_low) : 0,
		high: eligible ? cap(area * p.rate_high) : 0,
		rules: table.statewide_rules
	};
}
