import table from './rebate_programs.json';

// Port of pipeline/rebates.py (tests live on the Python side).
export type Provider = (typeof table.providers)[number];

/** 'St. George' / 'Saint George' / 'ST GEORGE' -> 'st george' */
export function normCity(name: string) {
	const s = (name || '').toLowerCase().replaceAll('.', '').replaceAll('-', ' ').split(/\s+/).filter(Boolean).join(' ');
	return s.startsWith('saint ') ? 'st ' + s.slice(6) : s;
}

/** City -> provider; unincorporated areas use the county's program where eligible; null = not eligible. */
export function resolveProvider(city: string, county?: string): Provider | null {
	const c = normCity(city);
	const hit = table.providers.find((p) => p.cities.some((x) => normCity(x) === c));
	if (hit) return hit;
	const unincorporated = !c || c.includes('unincorporated') || c === `${(county ?? '').toLowerCase()} county`;
	const pid = unincorporated ? (table.unincorporated as Record<string, string>)[county ?? ''] : undefined;
	return table.providers.find((p) => p.id === pid) ?? null;
}

export function rebateEstimate(lawnSqft: number, city: string, county?: string) {
	const p = resolveProvider(city, county);
	if (!p) return { provider: null, eligible: false, reason: 'city_not_listed' as const, eligibleSqft: 0, low: 0, high: 0, rules: table.statewide_rules, note: undefined };
	const eligible = lawnSqft >= p.min_sqft;
	const area = p.max_sqft ? Math.min(lawnSqft, p.max_sqft) : lawnSqft;
	const cap = (d: number) => (p.max_dollars ? Math.min(d, p.max_dollars) : d);
	return {
		provider: p,
		eligible,
		reason: eligible ? null : ('below_minimum' as const),
		eligibleSqft: eligible ? area : 0,
		low: eligible ? cap(area * p.rate_low) : 0,
		high: eligible ? cap(area * p.rate_high) : 0,
		rules: table.statewide_rules,
		note: (table.city_notes as Record<string, string>)[city] as string | undefined
	};
}
