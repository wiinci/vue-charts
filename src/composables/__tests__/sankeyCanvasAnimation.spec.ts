import {describe, expect, it} from 'vitest'
import {constants} from '@/assets/constants'
import {
	createLinkSweep,
	getLabelEnterDelay,
	getLinkExitDelay,
	getLinkEnterDelay,
	LABEL_INITIAL_OPACITY,
	sweepFinished,
	sweepProgress,
	TRANSITION_DURATION,
} from '../sankeyCanvasAnimation'

// Every constant here is the SVG Sankey's own (Links.vue / Labels.vue,
// constants.duration.fast = 100ms) — see sankeyCanvasAnimation.ts for the
// source lines. The values are pinned so a silent drift fails loudly.

describe('sankeyCanvasAnimation', () => {
	it('uses the SVG transition duration for every delay curve', () => {
		expect(TRANSITION_DURATION).toBe(constants.duration.fast)
		expect(TRANSITION_DURATION).toBe(100)
	})

	it('reproduces the SVG link delays: enter (depth+1)×fast, exit (maxDepth-depth)×fast', () => {
		// Links.vue:101 / Links.vue:139
		expect(getLinkEnterDelay(0)).toBe(100)
		expect(getLinkEnterDelay(1)).toBe(200)
		expect(getLinkEnterDelay(3)).toBe(400)
		expect(getLinkExitDelay(0, 3)).toBe(300)
		expect(getLinkExitDelay(1, 3)).toBe(200)
		expect(getLinkExitDelay(3, 3)).toBe(0)
	})

	it('reproduces the SVG label delays: enter (depth||0 + 1)×fast, exit without delay', () => {
		// Labels.vue:65
		expect(getLabelEnterDelay(0)).toBe(100)
		expect(getLabelEnterDelay(2)).toBe(300)
	})

	it('starts entering labels at the SVG opacity 1e-9', () => {
		expect(LABEL_INITIAL_OPACITY).toBe(1e-9)
	})

	it('holds a sweep until its delay elapses, then eases with d3 easeCubicInOut', () => {
		const sweep = {start: 1000, delay: 100}
		expect(sweepProgress(sweep, 1000)).toBe(0) // delay not started
		expect(sweepProgress(sweep, 1099)).toBe(0)
		// t = 0.5 → easeCubicInOut(0.5) = 0.5
		expect(sweepProgress(sweep, 1150)).toBe(0.5)
		// t = 0.25 → 4t³ = 0.0625 (easeCubicIn half)
		expect(sweepProgress(sweep, 1125)).toBe(0.0625)
		// t = 0.75 → 1 - 4(1-t)³ = 0.9375 (easeCubicOut half)
		expect(sweepProgress(sweep, 1175)).toBe(0.9375)
		expect(sweepProgress(sweep, 1200)).toBe(1)
		expect(sweepProgress(sweep, 99999)).toBe(1)
	})

	it('flags a sweep finished only after delay + duration', () => {
		const sweep = {start: 1000, delay: 200}
		expect(sweepFinished(sweep, 1299)).toBe(false)
		expect(sweepFinished(sweep, 1300)).toBe(true)
	})

	it('interpolates link paths as d3 does — pairwise over the curve numbers', () => {
		// The flat source line and the final curve share the M + 3 C-point shape,
		// so interpolateString pairs the numbers — exactly d3-transition's
		// default `d` interpolation
		const from = 'M20 30C20 30 20 30 20 30'
		const to = 'M100 50C140 60 180 70 200 80'
		const sweep = createLinkSweep(from, to, 0, 0)
		expect(sweep.interpolate(0)).toBe(from)
		expect(sweep.interpolate(1)).toBe(to)
		expect(sweep.interpolate(0.5)).toBe('M60 40C80 45 100 50 110 55')
	})
})
