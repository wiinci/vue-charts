import {describe, expect, it} from 'vitest'
import {useInteractionStateMachine} from '../useInteractionStateMachine'

describe('useInteractionStateMachine', () => {
	it('starts in idle state', () => {
		const fsm = useInteractionStateMachine()
		expect(fsm.activeState.value).toBe('idle')
		expect(fsm.hoveredNodeId.value).toBeNull()
		expect(fsm.selectedNodeId.value).toBeNull()
	})

	it('transitions idle -> highlighting -> idle on node hover enter/leave', () => {
		const fsm = useInteractionStateMachine()
		fsm.pointerEnterNode('node-1')
		expect(fsm.activeState.value).toBe('highlighting')
		expect(fsm.hoveredNodeId.value).toBe('node-1')

		fsm.pointerLeaveNode('node-1')
		expect(fsm.activeState.value).toBe('idle')
		expect(fsm.hoveredNodeId.value).toBeNull()
	})

	it('distinguishes click (selected) from drag based on movement threshold', () => {
		const fsm = useInteractionStateMachine({dragThresholdPixels: 3})

		// 1. Pointer down on node -> dragPending
		fsm.pointerDownNode('node-1', {x: 10, y: 10})
		expect(fsm.activeState.value).toBe('dragPending')

		// 2. Move 1px (< 3px threshold)
		fsm.pointerMove({x: 11, y: 10})
		expect(fsm.activeState.value).toBe('dragPending')

		// 3. Pointer up -> treated as click / select
		fsm.pointerUp()
		expect(fsm.activeState.value).toBe('selected')
		expect(fsm.selectedNodeId.value).toBe('node-1')
	})

	it('transitions dragPending -> dragging when moving past threshold', () => {
		const fsm = useInteractionStateMachine({dragThresholdPixels: 3})

		fsm.pointerDownNode('node-1', {x: 10, y: 10})
		fsm.pointerMove({x: 15, y: 10}) // 5px movement >= 3px
		expect(fsm.activeState.value).toBe('dragging')
		expect(fsm.isDragging.value).toBe(true)
		expect(fsm.delta.value).toEqual({dx: 5, dy: 0})

		fsm.pointerUp()
		expect(fsm.activeState.value).toBe('idle')
		expect(fsm.isDragging.value).toBe(false)
	})

	it('distinguishes background click (clear selection) from background panning', () => {
		const fsm = useInteractionStateMachine({dragThresholdPixels: 3})

		// Select a node first
		fsm.pointerDownNode('node-1', {x: 0, y: 0})
		fsm.pointerUp()
		expect(fsm.selectedNodeId.value).toBe('node-1')

		// Pointer down on background
		fsm.pointerDownBackground({x: 100, y: 100})
		expect(fsm.activeState.value).toBe('panPending')

		// Move > 3px -> panning
		fsm.pointerMove({x: 110, y: 100})
		expect(fsm.activeState.value).toBe('panning')
		expect(fsm.isPanning.value).toBe(true)

		fsm.pointerUp()
		expect(fsm.activeState.value).toBe('idle')

		// Background click without panning clears selection
		fsm.pointerDownBackground({x: 200, y: 200})
		fsm.pointerUp()
		expect(fsm.selectedNodeId.value).toBeNull()
	})

	it('resets state on escape key trigger', () => {
		const fsm = useInteractionStateMachine()
		fsm.pointerEnterNode('node-1')
		fsm.pointerDownNode('node-1', {x: 0, y: 0})
		expect(fsm.activeState.value).toBe('dragPending')

		fsm.escape()
		expect(fsm.activeState.value).toBe('idle')
		expect(fsm.hoveredNodeId.value).toBeNull()
		expect(fsm.selectedNodeId.value).toBeNull()
	})
})
