import {zoomIdentity} from 'd3-zoom'
import {describe, expect, it} from 'vitest'
import {ref} from 'vue'
import {useZoom} from '../useZoom'

describe('useZoom', () => {
	it('initializes with identity transform', () => {
		const svgRef = ref<SVGSVGElement | null>(null)
		const {transform, transformString} = useZoom(svgRef)

		expect(transform.value).toEqual(zoomIdentity)
		expect(transformString.value).toBe('translate(0,0) scale(1)')
	})

	it('inverts points accurately given transform state', () => {
		const svgRef = ref<SVGSVGElement | null>(null)
		const {transform, invertPoint} = useZoom(svgRef)

		// Identity: invert(100, 200) -> {x: 100, y: 200}
		expect(invertPoint(100, 200)).toEqual({x: 100, y: 200})

		// Simulated pan + scale: translate(50, 50) scale(2)
		transform.value = zoomIdentity.translate(50, 50).scale(2)

		// (150, 150) screen pos: (150-50)/2 = 50 graph pos
		expect(invertPoint(150, 150)).toEqual({x: 50, y: 50})
	})

	it('resets transform state back to identity', () => {
		const svgRef = ref<SVGSVGElement | null>(null)
		const {transform, resetZoom} = useZoom(svgRef)

		transform.value = zoomIdentity.translate(100, 100).scale(3)
		expect(transform.value.k).toBe(3)

		resetZoom()
		expect(transform.value.k).toBe(1)
		expect(transform.value.x).toBe(0)
		expect(transform.value.y).toBe(0)
	})
})
