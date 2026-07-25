<script setup lang="ts">
import {constants} from '@/assets/constants'
import {SankeyNode} from '@/composables/useNodesAndLinks'
import {getSankeyNodeKey} from '@/composables/sankeyModel'
import {inject, ref, Ref} from 'vue'

interface NodeProps {
	data: SankeyNode[]
	nodeId: string
	hoveredNodeId?: string | null
	selectedNodeId?: string | null
}

const props = withDefaults(defineProps<NodeProps>(), {
	hoveredNodeId: null,
	selectedNodeId: null,
})

const emit = defineEmits<{
	(e: 'click', id: string): void
	(e: 'hover', id: string): void
	(e: 'leave', id: string): void
	(e: 'pointerdown', id: string, event: PointerEvent): void
}>()

const animationsEnabled = inject<Ref<boolean>>('animationsEnabled', ref(true))

const getNodeKey = (node: SankeyNode): string => getSankeyNodeKey(node, props.nodeId)

const handleKeydown = (event: KeyboardEvent, node: SankeyNode) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		emit('click', getNodeKey(node))
	}
}

const isHighlighted = (node: SankeyNode): boolean => {
	const key = getNodeKey(node)
	return props.hoveredNodeId === key || props.selectedNodeId === key
}
</script>

<template>
	<g class="nodes" role="group" aria-label="Sankey Nodes">
		<rect
			v-for="node in data"
			:key="getNodeKey(node)"
			class="sankey-node"
			:class="{
				'sankey-node--highlighted': isHighlighted(node),
				'sankey-node--selected': selectedNodeId === getNodeKey(node),
				'sankey-node--animated': animationsEnabled,
			}"
			:x="node.x"
			:y="node.y"
			:width="node.width"
			:height="node.height"
			:fill="constants.nodeColor"
			:opacity="isHighlighted(node) ? 1 : 0.85"
			role="button"
			tabindex="0"
			:aria-label="`Node ${getNodeKey(node)}`"
			@click="emit('click', getNodeKey(node))"
			@pointerenter="emit('hover', getNodeKey(node))"
			@pointerleave="emit('leave', getNodeKey(node))"
			@pointerdown="(e) => emit('pointerdown', getNodeKey(node), e)"
			@keydown="(e) => handleKeydown(e, node)"
		/>
	</g>
</template>

<style scoped>
.sankey-node {
	cursor: pointer;
	outline: none;
	rx: 2px;
	ry: 2px;
}

.sankey-node--animated {
	transition:
		x 0.2s ease,
		y 0.2s ease,
		width 0.2s ease,
		height 0.2s ease,
		opacity 0.2s ease,
		fill 0.2s ease;
}

.sankey-node:focus-visible {
	stroke: #4f46e5;
	stroke-width: 2px;
}

.sankey-node--highlighted {
	opacity: 1;
}

.sankey-node--selected {
	stroke: #2563eb;
	stroke-width: 2px;
}
</style>
