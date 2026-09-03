import {easeCubicInOut} from 'd3-ease'
import {interpolateString} from 'd3-interpolate'
import {constants} from '@/assets/constants'

/**
 * The SVG Sankey's animation mechanics, expressed for the canvas executor's
 * rAF repaint loop (spec V17). Every value is lifted from the SVG render path —
 * nothing invented:
 *
 * - duration: `transition().duration(constants.duration.fast)` (Links.vue:74,
 *   Labels.vue:40). d3-transition's default easing is easeCubicInOut and its
 *   default `d` interpolation is interpolateString — both are reused here.
 * - link enter delay: `constants.duration.fast * (sourceDepth + 1)` (Links.vue:101)
 * - link exit delay: `constants.duration.fast * (maxDepth - sourceDepth)` (Links.vue:139)
 * - label enter delay: `constants.duration.fast * ((depth || 0) + 1)` (Labels.vue:65)
 * - label enter opacity 1e-9 → 1 (Labels.vue:59); exit opacity → 0, no delay (Labels.vue:74)
 * - the initial link path is a flat line at the source node: linkHorizontal
 *   with both endpoints at [source.x0, source.y0] (Links.vue:27-37)
 *
 * Reduced motion is deliberately not consulted — the SVG render path does not
 * honour it, and parity keeps it that way (spec V17).
 */

/** Links.vue:74 / Labels.vue:40 — transition().duration(constants.duration.fast) */
export const TRANSITION_DURATION = constants.duration.fast

/** Links.vue:101 — delay((link) => constants.duration.fast * (getLinkDepth(link) + 1)) */
export const getLinkEnterDelay = (depth: number): number => constants.duration.fast * (depth + 1)

/** Links.vue:139 — delay((link) => constants.duration.fast * (maxDepth - getLinkDepth(link))) */
export const getLinkExitDelay = (depth: number, maxDepth: number): number =>
	constants.duration.fast * (maxDepth - depth)

/** Labels.vue:65 — delay((d) => constants.duration.fast * ((d.depth || 0) + 1)) */
export const getLabelEnterDelay = (depth: number): number =>
	constants.duration.fast * ((depth || 0) + 1)

/** Labels.vue:59 — entering labels start at opacity 1e-9 and transition to 1 */
export const LABEL_INITIAL_OPACITY = 1e-9

/** Labels.vue:74 — exits fade straight away; the links stagger, the labels don't */
export const LABEL_EXIT_DELAY = 0

/**
 * A timed d3-style transition: hold the initial value until `delay` has passed
 * since `start`, then ease over TRANSITION_DURATION. `start` comes from the
 * executor's clock (performance.now — the same time base d3-timer uses).
 */
export interface TimedSweep {
	/** Epoch ms the sweep was created; the delay counts from here */
	start: number
	/** ms after `start` before the ease begins */
	delay: number
}

/**
 * A path transition between two link paths. The interpolator is the exact one
 * d3-transition uses for the `d` attribute — interpolateString over the two
 * strings. Both endpoints are linkHorizontal curves (M + 3 C points), so their
 * number sequences line up and interpolate pairwise, as in the SVG.
 */
export interface LinkSweep extends TimedSweep {
	interpolate: (t: number) => string
}

export function createLinkSweep(from: string, to: string, delay: number, start: number): LinkSweep {
	return {start, delay, interpolate: interpolateString(from, to)}
}

/**
 * Eased progress of a timed sweep at `now`: 0 before the delay elapses, then
 * easeCubicInOut across TRANSITION_DURATION (d3-transition's defaults), 1 after.
 */
export function sweepProgress(sweep: TimedSweep, now: number): number {
	const t = (now - sweep.start - sweep.delay) / TRANSITION_DURATION
	if (t <= 0) return 0
	if (t >= 1) return 1
	return easeCubicInOut(t)
}

export const sweepFinished = (sweep: TimedSweep, now: number): boolean =>
	now - sweep.start >= sweep.delay + TRANSITION_DURATION
