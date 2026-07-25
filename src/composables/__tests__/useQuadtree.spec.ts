import {describe, expect, it} from 'vitest'
import {ref} from 'vue'
import {useQuadtree} from '../useQuadtree'

describe('useQuadtree', () => {
	it('finds node within radius threshold', () => {
		const nodes = ref([
			{id: 'node-1', x: 10, y: 10},
			{id: 'node-2', x: 100, y: 100},
		])

		const {find} = useQuadtree(nodes, {
			xAccessor: (d) => d.x,
			yAccessor: (d) => d.y,
			radiusThreshold: 30,
		})

		// Point near node-1 (12, 12) -> should hit node-1
		const hitNear1 = find(12, 12)
		expect(hitNear1?.id).toBe('node-1')

		// Point near node-2 (95, 105) -> should hit node-2
		const hitNear2 = find(95, 105)
		expect(hitNear2?.id).toBe('node-2')
	})

	it('returns undefined for point in empty space exceeding radius threshold', () => {
		const nodes = ref([
			{id: 'node-1', x: 10, y: 10},
			{id: 'node-2', x: 100, y: 100},
		])

		const {find} = useQuadtree(nodes, {
			xAccessor: (d) => d.x,
			yAccessor: (d) => d.y,
			radiusThreshold: 20,
		})

		// Point at (50, 50) is 56px away from node-1 and 70px away from node-2 -> empty space
		const hitEmpty = find(50, 50)
		expect(hitEmpty).toBeUndefined()
	})
})
