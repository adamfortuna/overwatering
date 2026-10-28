// Utah's Weekly Lawn Watering Guide (Division of Water Resources), published Fridays in season at
// https://conservewater.utah.gov/weekly-lawn-watering-guide/. The page embeds a server-rendered
// SVG map; each county polygon carries aria-label="<County> <No|One|Two|Three> Watering(s)" and
// the title text holds the week ("October 23 - 29, 2026" or "June 27 - July 03, 2026").
// There is no API, so we read those labels.

export const GUIDE_URL = 'https://wateringindex.utah.gov/traditional-wlwg.html';
export const GUIDE_PAGE = 'https://conservewater.utah.gov/weekly-lawn-watering-guide/';
/** The guide assumes about half an inch per watering. */
export const GUIDE_IN_PER_WATERING = 0.5;

export type Guide = { week: string; start: string; end: string; counties: Record<string, number> };

const COUNT: Record<string, number> = { no: 0, one: 1, two: 2, three: 3, four: 4 };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** "October 23 - 29, 2026" / "June 27 - July 03, 2026" / "December 26 - January 01, 2027" -> ISO dates. */
export function parseWeek(s: string): { start: string; end: string } | null {
	const m = s.trim().match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}),\s*(\d{4})$/);
	if (!m) return null;
	const m1 = MONTHS.indexOf(m[1].toLowerCase()) + 1;
	const m2 = m[3] ? MONTHS.indexOf(m[3].toLowerCase()) + 1 : m1;
	if (!m1 || !m2) return null;
	const y2 = +m[5];
	const y1 = m2 < m1 ? y2 - 1 : y2;
	return { start: ymd(y1, m1, +m[2]), end: ymd(y2, m2, +m[4]) };
}

export function parseGuide(html: string): Guide | null {
	const counties: Record<string, number> = {};
	for (const m of html.matchAll(/aria-label="([A-Za-z .']+?) (No|One|Two|Three|Four) Waterings?"/g)) {
		if (m[1].startsWith('Map note')) continue;
		counties[m[1]] = COUNT[m[2].toLowerCase()];
	}
	// The week is the only text shaped like "<Month> <d> - [<Month>] <d>, <yyyy>".
	let week = '';
	let dates: { start: string; end: string } | null = null;
	for (const m of html.matchAll(/>\s*([A-Z][a-z]+ \d{1,2}\s*[-–]\s*(?:[A-Z][a-z]+ )?\d{1,2}, \d{4})\s*</g)) {
		dates = parseWeek(m[1]);
		if (dates) {
			week = m[1].replace(/\s+/g, ' ');
			break;
		}
	}
	if (!dates || Object.keys(counties).length < 20) return null;
	return { week, ...dates, counties };
}

export const describeWaterings = (n: number) => (n === 0 ? 'No watering' : `${['', 'One', 'Two', 'Three', 'Four'][n] ?? n} watering${n === 1 ? '' : 's'}`);
