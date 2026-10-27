// Utah's public GIS (UGRC, on ArcGIS Online) and USDA's NAIP image service, called from the
// Worker so the browser never talks to them directly and inputs are validated in one place.

export const COUNTIES = [
	'Beaver', 'Box Elder', 'Cache', 'Carbon', 'Daggett', 'Davis', 'Duchesne', 'Emery', 'Garfield', 'Grand',
	'Iron', 'Juab', 'Kane', 'Millard', 'Morgan', 'Piute', 'Rich', 'Salt Lake', 'San Juan', 'Sanpete',
	'Sevier', 'Summit', 'Tooele', 'Uintah', 'Utah', 'Wasatch', 'Washington', 'Wayne', 'Weber'
] as const;
export type County = (typeof COUNTIES)[number];

// Workers allow 6 simultaneous outbound connections per request, so address search fans out as
// 5 requests of <= 6 counties each (largest first); the browser fires them in parallel.
export const SEARCH_GROUPS: County[][] = [
	['Salt Lake', 'Utah', 'Davis', 'Weber', 'Washington', 'Cache'],
	['Tooele', 'Box Elder', 'Iron', 'Summit', 'Wasatch', 'Sanpete'],
	['Uintah', 'Sevier', 'Carbon', 'Duchesne', 'Millard', 'Morgan'],
	['San Juan', 'Juab', 'Grand', 'Emery', 'Kane', 'Beaver'],
	['Garfield', 'Wayne', 'Rich', 'Piute', 'Daggett']
];

const UGRC = 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services';
export const USDA_NAIP = 'https://apps.geo.fpac.usda.gov/geo-imagery/rest/services/naip/conus_naip/ImageServer';

export const isCounty = (c: string | null): c is County => !!c && (COUNTIES as readonly string[]).includes(c);
export const parcelLayer = (c: County) => `${UGRC}/Parcels_${c.replaceAll(' ', '')}_LIR/FeatureServer/0`;
export const BUILDINGS = `${UGRC}/Buildings/FeatureServer/0`;

export async function getJson(url: string, timeoutMs = 6000): Promise<any> {
	const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'overwater.ing' } });
	if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
	const j = await r.json();
	if (j?.error) throw new Error(j.error.message ?? 'ArcGIS error');
	return j;
}

const DIRS: Record<string, string> = { NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W' };
const TYPES: Record<string, string> = { STREET: 'ST', AVENUE: 'AVE', DRIVE: 'DR', ROAD: 'RD', LANE: 'LN', CIRCLE: 'CIR', COURT: 'CT', PLACE: 'PL', BOULEVARD: 'BLVD', PARKWAY: 'PKWY', TERRACE: 'TER', HIGHWAY: 'HWY' };

/** "603 East South Temple, Salt Lake City UT" -> { street: "603 E SOUTH TEMPLE", city: "SALT LAKE CITY" } */
export function parseAddress(q: string) {
	const [streetPart, ...rest] = q.toUpperCase().split(',');
	const tokens = streetPart.replace(/[^A-Z0-9 #/-]/g, ' ').split(/\s+/).filter(Boolean);
	if (tokens.length > 1 && DIRS[tokens[1]] && tokens.length > 2) tokens[1] = DIRS[tokens[1]];
	const last = tokens.length - 1;
	if (last > 1 && TYPES[tokens[last]]) tokens[last] = TYPES[tokens[last]];
	const city = rest.join(' ').replace(/\b(UT|UTAH)\b|\d{5}(-\d{4})?/g, ' ').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
	return { street: tokens.join(' '), city };
}

/** ArcGIS SQL string literal (single quotes doubled); input is already restricted to [A-Z0-9 #/-]. */
export const sqlString = (s: string) => `'${s.replaceAll("'", "''")}'`;
