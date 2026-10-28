import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGuide, parseWeek } from '../src/lib/guide.ts';
import { ics, parseKey, planKey, utahToday, week } from '../src/lib/calendar.ts';

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const october = parseGuide(fixture('guide-2026-10-23.html'))!;
const july = parseGuide(fixture('guide-2026-07-03.html'))!;

describe('weekly lawn watering guide', () => {
	it('reads all 29 counties and the week', () => {
		expect(Object.keys(october.counties)).toHaveLength(29);
		expect(october).toMatchObject({ week: 'October 23 - 29, 2026', start: '2026-10-23', end: '2026-10-29' });
		expect(new Set(Object.values(october.counties))).toEqual(new Set([0]));
		expect(july.counties['Salt Lake']).toBe(3);
		expect(july.counties['Box Elder']).toBe(3);
		expect(Object.keys(july.counties)).not.toContain('Map note: Happy 4th of July! Make good choices!');
	});
	it('parses weeks that cross a month or year', () => {
		expect(parseWeek('June 27 - July 03, 2026')).toEqual({ start: '2026-06-27', end: '2026-07-03' });
		expect(parseWeek('December 26 - January 01, 2027')).toEqual({ start: '2026-12-26', end: '2027-01-01' });
		expect(parseWeek('nonsense')).toBeNull();
	});
	it('returns null for pages without a map', () => expect(parseGuide('<html></html>')).toBeNull());
});

describe('plan keys', () => {
	it('round-trips county and sprinkler type', () => {
		expect(parseKey('salt-lake-spray.ics')).toMatchObject({ key: 'salt-lake-spray', county: 'Salt Lake', system: 'spray' });
		expect(parseKey('box-elder-rotor')).toMatchObject({ county: 'Box Elder', system: 'rotor' });
		expect(parseKey('slc-rotary')).toMatchObject({ etoKey: 'slc', county: 'Salt Lake' });
		expect(parseKey('atlantis-spray')).toBeNull();
		expect(parseKey('salt-lake-firehose')).toBeNull();
		expect(planKey('Box Elder', 'hose')).toBe('box-elder-hose');
	});
	it('uses Utah time for today', () => expect(utahToday(new Date('2026-10-28T04:30:00Z'))).toBe('2026-10-27'));
});

describe('this week', () => {
	const p = parseKey('salt-lake-spray')!;
	it('pauses when the state guide says no watering', () => {
		const w = week(p, '2026-10-27', october);
		expect(w).toMatchObject({ source: 'guide', paused: true, waterings: 0, waterLevelPct: 0, start: '2026-10-23', end: '2026-10-29' });
	});
	it('follows the guide count in summer', () => {
		const w = week(p, '2026-07-06', july);
		expect(w).toMatchObject({ source: 'guide', waterings: 3, days: ['Mon', 'Wed', 'Fri'], paused: false });
		expect(w.minutesPerDay).toBeGreaterThan(15);
		expect(w.waterLevelPct).toBeGreaterThan(50);
		expect(w.waterLevelPct).toBeLessThanOrEqual(150);
	});
	it('falls back to the monthly plan without a guide', () => {
		const w = week(p, '2026-07-15', null);
		expect(w).toMatchObject({ source: 'plan', month: 7, waterLevelPct: 100, paused: false });
		expect(w.peakPct).toBe(100); // July is the peak month in Salt Lake City
		expect(week(p, '2027-04-14', null).peakPct).toBeLessThan(50);
		expect(w.days.length).toBe(w.waterings);
	});
	it('is off season in winter', () => expect(week(p, '2027-01-10', null)).toMatchObject({ source: 'off-season', paused: true }));
});

describe('ics', () => {
	const p = parseKey('salt-lake-spray')!;
	const cal = ics(p, '2026-10-27', october, 'https://overwater.ing', new Date('2026-10-27T12:00:00Z'));
	const lines = cal.split('\r\n');
	it('is CRLF, folded, and balanced', () => {
		expect(cal.endsWith('END:VCALENDAR\r\n')).toBe(true);
		expect(cal.replaceAll('\r\n', '')).not.toContain('\n');
		for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
		const count = (s: string) => lines.filter((l) => l === s).length;
		expect(count('BEGIN:VEVENT')).toBe(count('END:VEVENT'));
	});
	it('has no watering this week, the fall shutoff, and next season', () => {
		const unfolded = cal.replace(/\r\n /g, '');
		expect(unfolded).toContain('SUMMARY:State guide: no watering this week');
		expect(unfolded).toContain('DTSTART;VALUE=DATE:20261031');
		expect(unfolded).not.toContain('UID:water-20261028');
		expect(unfolded).toContain('DTSTART;TZID=America/Denver:20270707T050000');
		expect(unfolded).not.toContain('UID:water-202701');
		const uids = unfolded.split('\r\n').filter((l) => l.startsWith('UID:'));
		expect(new Set(uids).size).toBe(uids.length);
	});
});
