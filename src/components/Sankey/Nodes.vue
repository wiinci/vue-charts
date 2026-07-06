<script setup lang="ts">
import {constants} from '@/assets/constants'
import {SankeyNode} from '@/composables/useNodesAndLinks'
import {getSankeyNodeKey} from '@/composables/sankeyModel'
import {select} from 'd3-selection'
import {transition} from 'd3-transition'
import {inject, ref, Ref, watchEffect} from 'vue'

interface NodeProps {
	data: SankeyNode[] // This will now be the already filtered nodes
	nodeId: string
}

const props = defineProps<NodeProps>()

const emit = defineEmits<{
	(e: 'click', id: string): void
}>()

const nodeRef = ref<SVGGElement | null>(null)
const animationsEnabled = inject<Ref<boolean>>('animationsEnabled', ref(true))

const getNodeKey = (node: SankeyNode): string => getSankeyNodeKey(node, props.nodeId)

// Reactively update when dependencies change
watchEffect(() => {
	if (!nodeRef.value) return

	const isAnimated = animationsEnabled.value
	const tfast = transition().duration(constants.duration.fast)

	select(nodeRef.value)
		.selectAll<SVGRectElement, SankeyNode>('rect')
		.data(props.data, getNodeKey)
		.join(
			(enter) =>
				enter
					.append('rect')
					.attr('fill', constants.nodeColor)
					.attr('height', (node) => node.height)
					.attr('width', (node) => node.width)
					.attr('x', (node) => node.x)
					.attr('y', (node) => node.y)
					.attr('opacity', isAnimated ? 0 : 1)
					.on('click', (_, node) => emit('click', getNodeKey(node)))
					.call((selection) => {
						if (!isAnimated) return

						selection
							.transition(tfast)
							.delay((node) => constants.duration.medium * ((node.depth || 0) + 1))
							.attr('opacity', 1)
					}),
			(update) => {
				const base = update
					.attr('height', (node) => node.height)
					.attr('width', (node) => node.width)
					.attr('x', (node) => node.x)
					.attr('y', (node) => node.y)
					.attr('opacity', 1)

				if (!isAnimated) {
					return base
				}

				return base.transition(tfast)
			},
			(exit) => {
				if (!isAnimated) {
					exit.remove()
					return
				}

				exit.transition(tfast).attr('opacity', 0).remove()
			},
		)
})
</script>

<template>
	<g class="nodes" ref="nodeRef" />
</template>
