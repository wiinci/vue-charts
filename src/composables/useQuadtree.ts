import {quadtree as d3Quadtree, Quadtree} from 'd3-quadtree'
import {computed, Ref} from 'vue'

export interface QuadtreeItem {
	id?: string
	x?: number
	y?: number
	[key: string]: any
}

export interface UseQuadtreeOptions<T extends QuadtreeItem> {
	xAccessor: (d: T) => number
	yAccessor: (d: T) => number
	radiusThreshold?: number
}

export function useQuadtree<T extends QuadtreeItem>(
	data: Ref<T[]>,
	options: UseQuadtreeOptions<T>,
) {
	const radiusThreshold = options.radiusThreshold ?? 40

	const tree = computed<Quadtree<T>>(() => {
		const q = d3Quadtree<T>()
			.x(options.xAccessor)
			.y(options.yAccessor)

		if (data.value && data.value.length) {
			q.addAll(data.value)
		}

		return q
	})

	/**
	 * Find the closest node to (x, y) within the specified radius.
	 * Returns undefined if no node is within the radius (distinguishes empty space).
	 */
	function find(x: number, y: number, searchRadius?: number): T | undefined {
		const r = searchRadius ?? radiusThreshold
		return tree.value.find(x, y, r)
	}

	return {
		tree,
		find,
		radiusThreshold,
	}
}
