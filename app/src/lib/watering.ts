// Sprinkler tune-up math: a monthly schedule from local reference ET, and what each fix saves.
// Uses the same turf-need model as water.ts (ETo x 0.8, minus half the rain, April-October).
import { depthToGallons, IRRIGATION_MONTHS, TURF_KC, turfNeedIn, type EtoTable } from './water.ts';

export type SystemId = 'spray' | 'rotor' | 'rotary' | 'hose';
export type ControlId = 'timer' | 'smart' | 'manual';

// Typical precipitation rates (inches/hour) and lower-quarter distribution uniformity (DU):
// how evenly water lands. Low DU means running longer so the driest spot gets enough.
// Ballpark industry values, not measurements of your yard.
export const SYSTEMS: Record<SystemId, { label: string; short: string; pr: number; du: number; maxCycleMin: number; blurb: string }> = {
	spray: { label: 'Pop-up spray heads', short: 'spray heads', pr: 1.6, du: 0.65, maxCycleMin: 8, blurb: 'A fixed fan of water. The most common heads in Utah yards; they water fast and often run off.' },
	rotor: { label: 'Rotors', short: 'rotors', pr: 0.6, du: 0.7, maxCycleMin: 25, blurb: 'One thick stream that turns slowly. Usually on bigger lawns.' },
	rotary: { label: 'Rotary nozzles', short: 'rotary nozzles', pr: 0.45, du: 0.75, maxCycleMin: 30, blurb: 'Many thin rotating streams on a spray body (MP Rotator style). Slow and even.' },
	hose: { label: 'Hose-end sprinkler', short: 'hose sprinkler', pr: 0.5, du: 0.5, maxCycleMin: 30, blurb: 'Oscillating or impact sprinkler you move around.' }
};
export const CONTROLS: Record<ControlId, { label: string; blurb: string }> = {
	timer: { label: 'A basic timer', blurb: 'Set a schedule and it runs until you change it.' },
	smart: { label: 'A smart controller', blurb: 'Wi-Fi, adjusts to the weather (WaterSense labeled).' },
	manual: { label: 'By hand', blurb: 'I turn it on and off myself.' }
};

const MONTH = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type ScheduleRow = { month: number; name: string; weeklyIn: number; days: number; minutesPerDay: number; cycles: number; minutesPerCycle: number };

/** What the lawn needs each irrigation month (inches). */
export function monthlyNeedIn(eto: EtoTable) {
	return IRRIGATION_MONTHS.map((m) => ({ month: m, inches: turfNeedIn(eto.eto_in[m], TURF_KC, (eto.precip_in[m] ?? 0) * 0.5) }));
}

/** Watering schedule: deep and infrequent (about 3/4 inch per watering, 1-3 days a week), split into
 * cycle-and-soak runs short enough not to run off. */
export function schedule(eto: EtoTable, system: SystemId): ScheduleRow[] {
	const s = SYSTEMS[system];
	return monthlyNeedIn(eto).map(({ month, inches }) => {
		const weeklyIn = inches / (DAYS[month] / 7);
		const appliedWeekly = weeklyIn / s.du;
		const minutesWeek = (appliedWeekly / s.pr) * 60;
		const days = Math.min(3, Math.max(1, Math.ceil(weeklyIn / 0.75)));
		const minutesPerDay = minutesWeek / days;
		const cycles = Math.max(1, Math.ceil(minutesPerDay / s.maxCycleMin));
		return { month, name: MONTH[month], weeklyIn, days, minutesPerDay, cycles, minutesPerCycle: minutesPerDay / cycles };
	});
}

function scheduleRange(eto: EtoTable, system: SystemId) {
	const m = schedule(eto, system).map((r) => Math.round(r.minutesPerDay));
	return `${Math.min(...m)}–${Math.max(...m)}`;
}

export type Tip = { id: string; title: string; how: string; gallons: number | null; note?: string; link?: { href: string; label: string } };

/**
 * Ranked fixes with yearly gallons for this lawn. `outdoorGal` (from the bill, if any) caps the
 * scheduling savings at what was actually used beyond a well-run schedule.
 */
export function tips(lawnSqft: number, eto: EtoTable, system: SystemId, control: ControlId, outdoorGal: number | null) {
	const s = SYSTEMS[system];
	const months = monthlyNeedIn(eto);
	const needIn = months.reduce((a, m) => a + m.inches, 0);
	// What a well-run system of this type applies: the need, divided by how evenly it waters.
	const target = depthToGallons(needIn / s.du, lawnSqft);
	// The common pattern: set for July once and leave it all season.
	const peakPerDay = Math.max(...months.map((m) => m.inches / DAYS[m.month]));
	const setAndForget = depthToGallons(months.reduce((a, m) => a + peakPerDay * DAYS[m.month], 0) / s.du, lawnSqft);
	const scheduleSave = Math.max(0, outdoorGal != null ? outdoorGal - target : setAndForget - target);

	const list: Tip[] = [];
	if (control === 'smart') {
		list.push({
			id: 'schedule',
			title: 'Check your smart controller is set up for your yard',
			how: `Tell it your sprinkler type (${s.short}), that it's cool-season grass in full sun, and your soil. Turn on rain and freeze skip. A misconfigured smart controller waters like a basic timer.`,
			gallons: scheduleSave || null
		});
	} else {
		list.push({
			id: 'schedule',
			title: control === 'manual' ? 'Water on a schedule instead of by feel' : 'Change your timer once a month',
			how: `Follow the schedule below: ${scheduleRange(eto, system)} minutes per zone on each watering day, 1–3 days a week depending on the month, split into short runs.${control === 'timer' ? " Or let a smart controller do it: Utah Water Savers pays up to $100 toward a WaterSense-labeled one." : ''}`,
			gallons: scheduleSave || null,
			link: control === 'timer' ? { href: 'https://www.utahwatersavers.com/smartcontrollerprogram', label: '$100 smart controller rebate' } : undefined
		});
	}
	if (system === 'spray') {
		const better = SYSTEMS.rotary;
		list.push({
			id: 'nozzles',
			title: 'Swap spray nozzles for rotary nozzles',
			how: 'They screw onto the spray heads you already have, put water down slowly enough to soak in, and land it more evenly, so the whole lawn needs less run time.',
			gallons: Math.round(depthToGallons(needIn / s.du - needIn / better.du, lawnSqft))
		});
	}
	if (system === 'hose') {
		list.push({
			id: 'hose-timer',
			title: 'Put a timer on the hose',
			how: 'A hose-end timer shuts the sprinkler off even when you forget, and lets you water before 10 a.m. when less blows and evaporates away.',
			gallons: null
		});
	}
	list.push({
		id: 'heads',
		title: 'Walk the system once a month',
		how: 'Run each zone for a minute: fix broken or tilted heads, unclog nozzles, and aim them off the sidewalk and driveway.',
		gallons: null,
		note: 'EPA WaterSense: one broken head can waste up to 25,000 gallons in a season.'
	});
	list.push({
		id: 'timing',
		title: 'Water early, and follow the weekly guide',
		how: "Run between 6 p.m. and 10 a.m., skip after a good rain, and check Utah's Weekly Lawn Watering Guide each Friday.",
		gallons: null,
		link: { href: 'https://conservewater.utah.gov/weekly-lawn-watering-guide/', label: 'Weekly Lawn Watering Guide' }
	});
	const ranked = [...list.filter((t) => t.gallons), ...list.filter((t) => !t.gallons)].sort((a, b) => (b.gallons ?? 0) - (a.gallons ?? 0));
	return { tips: ranked, target, setAndForget, scheduleSave, needIn };
}

/** Headline for the parcel page's first step: "do X and save Y gallons a year". */
export function headline(lawnSqft: number, eto: EtoTable, outdoorGal: number | null) {
	const t = tips(lawnSqft, eto, 'spray', 'timer', outdoorGal);
	const top = t.tips[0];
	return { action: top.title, gallons: top.gallons ?? 0, id: top.id };
}
