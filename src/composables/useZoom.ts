import {zoom as d3Zoom, ZoomBehavior, zoomIdentity, ZoomTransform} from 'd3-zoom'
import {select} from 'd3-selection'
import {computed, getCurrentInstance, onMounted, onUnmounted, ref, Ref} from 'vue'

export interface UseZoomOptions {
	minScale?: number
	maxScale?: number
	enabled?: boolean
}

export function useZoom(
	containerRef: Ref<SVGSVGElement | null>,
	options: UseZoomOptions = {},
) {
	const minScale = options.minScale ?? 0.5
	const maxScale = options.maxScale ?? 4
	const enabled = options.enabled ?? true

	const transform = ref<ZoomTransform>(zoomIdentity)

	const transformString = computed(() => {
		const {x, y, k} = transform.value
		return `translate(${x},${y}) scale(${k})`
	})

	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null

	function invertPoint(x: number, y: number): {x: number; y: number} {
		const [invertedX, invertedY] = transform.value.invert([x, y])
		return {x: invertedX, y: invertedY}
	}

	function resetZoom() {
		transform.value = zoomIdentity
		if (containerRef.value && zoomBehavior) {
			select(containerRef.value).call(zoomBehavior.transform, zoomIdentity)
		}
	}

	function bindZoom() {
		if (!containerRef.value || !enabled) return

		zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
			.scaleExtent([minScale, maxScale])
			.on('zoom', (event) => {
				transform.value = event.transform
			})

		select(containerRef.value).call(zoomBehavior)
	}

	function unbindZoom() {
		if (containerRef.value && zoomBehavior) {
			select(containerRef.value).on('.zoom', null)
		}
	}

	if (getCurrentInstance()) {
		onMounted(bindZoom)
		onUnmounted(unbindZoom)
	}

	return {
		transform,
		transformString,
		invertPoint,
		resetZoom,
		bindZoom,
		unbindZoom,
	}
}
