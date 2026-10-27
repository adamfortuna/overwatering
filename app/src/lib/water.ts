// Port of pipeline/water.py (kept in sync by hand; tests live on the Python side).
export const GAL_PER_CUFT = 7.48052;
export const GAL_PER_CCF = 748.052;
export const GAL_PER_ACRE_FT = 325_851;
export const TURF_KC = 0.8;
export const WATERWISE_KC = 0.3;
export const IRRIGATION_MONTHS = [4, 5, 6, 7, 8, 9, 10];
export const UNIT_TO_GAL: Record<string, number> = { gal: 1, gallons: 1, kgal: 1000, ccf: GAL_PER_CCF, hcf: GAL_PER_CCF, cuft: GAL_PER_CUFT };

export type EtoTable = { eto_in: Record<string, number>; precip_in: Record<string, number>; annual_eto_in?: number; source?: string; years?: number[] };

export const toGallons = (v: number, unit: string) => {
	const f = UNIT_TO_GAL[unit.toLowerCase()];
	if (f === undefined) throw new Error(`unknown unit ${unit}`);
	return v * f;
};
export const depthToGallons = (depthIn: number, areaSqft: number) => (depthIn / 12) * areaSqft * GAL_PER_CUFT;
export const turfNeedIn = (etoIn: number, kc = TURF_KC, effPrecipIn = 0) => Math.max(0, etoIn * kc - effPrecipIn);

export function annualTurfNeedGal(lawnSqft: number, eto: EtoTable, kc = TURF_KC, effPrecipFrac = 0.5) {
	let gal = 0;
	let inches = 0;
	for (const m of IRRIGATION_MONTHS) {
		const d = turfNeedIn(eto.eto_in[m], kc, (eto.precip_in[m] ?? 0) * effPrecipFrac);
		inches += d;
		gal += depthToGallons(d, lawnSqft);
	}
	return { gal, inches };
}

export function outdoorFromBill(monthly: Record<number, number>, unit: string, baselineMonths = [12, 1, 2]) {
	const g: Record<number, number> = {};
	for (const [m, v] of Object.entries(monthly)) if (v != null && !Number.isNaN(v)) g[+m] = toGallons(v, unit);
	const base = baselineMonths.filter((m) => m in g).map((m) => g[m]);
	const baseline = base.length ? base.reduce((a, b) => a + b, 0) / base.length : Math.min(...Object.values(g));
	const outdoor: Record<number, number> = {};
	let total = 0;
	for (const [m, v] of Object.entries(g)) {
		outdoor[+m] = Math.max(0, v - baseline);
		total += outdoor[+m];
	}
	return { baseline, outdoor, total };
}

export const overwateringGap = (outdoorGal: number, needGal: number) => Math.max(0, outdoorGal - needGal);

export function conversionSavingsGal(convertedSqft: number, eto: EtoTable, kcBefore = TURF_KC, kcAfter = WATERWISE_KC) {
	const season = IRRIGATION_MONTHS.reduce((s, m) => s + eto.eto_in[m], 0);
	return depthToGallons(season * Math.max(0, kcBefore - kcAfter), convertedSqft);
}
export const acreFeet = (gal: number) => gal / GAL_PER_ACRE_FT;
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
