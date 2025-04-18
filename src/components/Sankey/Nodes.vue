<script setup lang="ts">
	import {constants} from '@/assets/constants'
	import {SankeyNode} from '@/composables/useNodesAndLinks'
	import {select} from 'd3-selection'
	import {transition} from 'd3-transition'
	import {computed, ref, watchEffect} from 'vue'

	interface NodeProps {
		data: SankeyNode[]
		nodeId: string
		xAccessor: (d: SankeyNode) => number
		yAccessor: (d: SankeyNode) => number
		collapsedNodes: Set<string>
	}

	const props = defineProps<NodeProps>()

	const emit = defineEmits<{
		(e: 'click', id: string): void
	}>()

	const nodeRef = ref<SVGGElement | null>(null)

	// Update the filteredData to handle nodes with multiple incoming paths
	const filteredData = computed(() => {
		// If no nodes are collapsed, show all nodes
		if (props.collapsedNodes.size === 0) {
			return props.data
		}

		// Create a set to track nodes that should be hidden
		const nodesToHide = new Set<string>()

		// For each node, check if ALL of its source nodes are collapsed
		props.data.forEach(node => {
			// Skip nodes not in the collapsed set
			if (!props.collapsedNodes.has(node.id)) {
				return
			}

			// If the node has no incoming links, it's a source node
			if (!node.targetLinks || node.targetLinks.length === 0) {
				// For source nodes in the collapsed set, they should only be visible
				// if they are "root collapsed" nodes (ones directly clicked)
				const isRootCollapsed =
					!node.targetLinks ||
					node.targetLinks.every(link => {
						const sourceId =
							typeof link.source === 'object'
								? link.source.id
								: (link.source as string)
						return !props.collapsedNodes.has(sourceId)
					})

				if (!isRootCollapsed) {
					nodesToHide.add(node.id)
				}
				return
			}

			// For nodes with incoming links, check if ALL source nodes are collapsed
			const allSourcesCollapsed = node.targetLinks.every(link => {
				const sourceId =
					typeof link.source === 'object'
						? link.source.id
						: (link.source as string)
				return props.collapsedNodes.has(sourceId)
			})

			// If all sources are collapsed, this node should be hidden
			if (allSourcesCollapsed) {
				nodesToHide.add(node.id)
			}
		})

		// Filter the data to only show visible nodes
		return props.data.filter(node => {
			// If the node is not in the collapsed set, show it
			if (!props.collapsedNodes.has(node.id)) {
				return true
			}

			// If the node is determined to be hidden, don't show it
			if (nodesToHide.has(node.id)) {
				return false
			}

			// Otherwise show the node (it's a root collapsed node)
			return true
		})
	})

	// Reactively update when dependencies change
	watchEffect(() => {
		if (!nodeRef.value) return

		// Create a fresh transition for each effect run
		const t = transition().duration(constants.duration.short)

		select(nodeRef.value)
			.selectAll('rect')
			.data(filteredData.value, (d: any) => d[props.nodeId])
			.join(
				enter =>
					enter
						.append('rect')
						.on('click', (e, d: any) => emit('click', d[props.nodeId]))
						.attr('fill', 'none')
						.attr('height', (d: any) => d.y1 - d.y0)
						.attr('width', (d: any) => d.x1 - d.x0)
						.attr('x', (d: any) => props.xAccessor(d))
						.attr('y', (d: any) => props.yAccessor(d))
						.attr('opacity', 0)
						.call((enter: any) =>
							enter
								.transition(t)
								.delay((d: any) => constants.duration.medium * (d.depth + 1))
								.attr('opacity', 1)
						),
				update =>
					update
						.transition(t)
						.attr('height', (d: any) => d.y1 - d.y0)
						.attr('width', (d: any) => d.x1 - d.x0)
						.attr('x', (d: any) => props.xAccessor(d))
						.attr('y', (d: any) => props.yAccessor(d)),
				exit => exit.transition(t).attr('opacity', 0).remove()
			)
	})
</script>

<template>
	<g
		class="nodes"
		ref="nodeRef"
	/>
</template>
