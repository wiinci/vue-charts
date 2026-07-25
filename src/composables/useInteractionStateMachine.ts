import {computed, ref} from 'vue'

export type InteractionStateMode =
	| 'idle'
	| 'highlighting'
	| 'dragPending'
	| 'dragging'
	| 'panPending'
	| 'panning'
	| 'selected'

export interface Point {
	x: number
	y: number
}

export interface InteractionStateOptions {
	dragThresholdPixels?: number
}

export function useInteractionStateMachine(options: InteractionStateOptions = {}) {
	const threshold = options.dragThresholdPixels ?? 3

	const activeState = ref<InteractionStateMode>('idle')
	const hoveredNodeId = ref<string | null>(null)
	const selectedNodeId = ref<string | null>(null)
	const activeNodeId = ref<string | null>(null)

	const startPoint = ref<Point | null>(null)
	const currentPoint = ref<Point | null>(null)

	const isDragging = computed(() => activeState.value === 'dragging')
	const isPanning = computed(() => activeState.value === 'panning')
	const isHighlighting = computed(() => activeState.value === 'highlighting')

	const delta = computed(() => {
		if (!startPoint.value || !currentPoint.value) return {dx: 0, dy: 0}
		return {
			dx: currentPoint.value.x - startPoint.value.x,
			dy: currentPoint.value.y - startPoint.value.y,
		}
	})

	function distance(p1: Point, p2: Point): number {
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	// Event Handlers
	function pointerEnterNode(nodeId: string) {
		if (activeState.value === 'idle' || activeState.value === 'highlighting' || activeState.value === 'selected') {
			hoveredNodeId.value = nodeId
			if (activeState.value !== 'selected') {
				activeState.value = 'highlighting'
			}
		}
	}

	function pointerLeaveNode(nodeId: string) {
		if (hoveredNodeId.value === nodeId) {
			hoveredNodeId.value = null
			if (activeState.value === 'highlighting') {
				activeState.value = selectedNodeId.value ? 'selected' : 'idle'
			}
		}
	}

	function pointerDownNode(nodeId: string, point: Point) {
		activeNodeId.value = nodeId
		startPoint.value = {...point}
		currentPoint.value = {...point}
		activeState.value = 'dragPending'
	}

	function pointerDownBackground(point: Point) {
		activeNodeId.value = null
		startPoint.value = {...point}
		currentPoint.value = {...point}
		activeState.value = 'panPending'
	}

	function pointerMove(point: Point) {
		currentPoint.value = {...point}

		if (activeState.value === 'dragPending' && startPoint.value) {
			if (distance(startPoint.value, point) >= threshold) {
				activeState.value = 'dragging'
			}
		} else if (activeState.value === 'panPending' && startPoint.value) {
			if (distance(startPoint.value, point) >= threshold) {
				activeState.value = 'panning'
			}
		}
	}

	function pointerUp() {
		if (activeState.value === 'dragPending') {
			// Movement was below threshold -> treat as click / select
			selectedNodeId.value = activeNodeId.value
			activeState.value = 'selected'
		} else if (activeState.value === 'panPending') {
			// Clicked background -> clear selection
			selectedNodeId.value = null
			activeState.value = hoveredNodeId.value ? 'highlighting' : 'idle'
		} else if (activeState.value === 'dragging' || activeState.value === 'panning') {
			activeState.value = hoveredNodeId.value ? 'highlighting' : 'idle'
		}

		startPoint.value = null
		currentPoint.value = null
		activeNodeId.value = null
	}

	function escape() {
		activeState.value = 'idle'
		hoveredNodeId.value = null
		selectedNodeId.value = null
		activeNodeId.value = null
		startPoint.value = null
		currentPoint.value = null
	}

	function reset() {
		escape()
	}

	return {
		activeState,
		hoveredNodeId,
		selectedNodeId,
		activeNodeId,
		startPoint,
		currentPoint,
		delta,
		isDragging,
		isPanning,
		isHighlighting,

		// Actions
		pointerEnterNode,
		pointerLeaveNode,
		pointerDownNode,
		pointerDownBackground,
		pointerMove,
		pointerUp,
		escape,
		reset,
	}
}
