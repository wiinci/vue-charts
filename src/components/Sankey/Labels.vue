<script setup lang="ts">
	import {constants} from '@/assets/constants'
	import {SankeyNode} from '@/composables/useNodesAndLinks'
	import {select} from 'd3-selection'
	import {transition} from 'd3-transition'
	import {computed, ref, watchEffect} from 'vue'

	interface LabelProps {
		data: SankeyNode[]
		nodeId: string
		nodeWidth: number
		width: number
		collapsedNodes: Set<string>
	}

	const props = defineProps<LabelProps>()

	const nodeRef = ref<SVGGElement | null>(null)

	// Memoize calculations for better performance
	const getTextAnchor = computed(
		() => (d: SankeyNode) => d.x0 < props.width / 2 ? 'start' : 'end'
	)

	const getXPosition = computed(() => (d: SankeyNode) => {
		if (props.nodeWidth < 1) return d.x0
		return d.x0 < props.width / 2
			? d.x0 + props.nodeWidth
			: d.x1 - props.nodeWidth
	})

	const getYPosition = computed(() => (d: SankeyNode) => (d.y1 + d.y0) / 2)

	// Update the filteredData computation to handle nodes with multiple incoming paths
	const filteredData = computed((): SankeyNode[] => {
		// If no nodes are collapsed, show all labels
		if (props.collapsedNodes.size === 0) {
			return props.data
		}

		// Create a set to track nodes that should be hidden
		const nodesToHide = new Set<string>()

		// For each node, check if ALL of its source nodes are collapsed
		props.data.forEach(node => {
			// Skip directly collapsed nodes (we'll handle them separately)
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

		// Filter the data to include:
		// 1. Nodes not in the collapsed set
		// 2. Nodes in collapsed set but not in nodesToHide (these are root collapsed nodes)
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

	watchEffect(() => {
		if (!nodeRef.value) return

		// Create a fresh transition for each effect run
		const t = transition().duration(constants.duration.short)

		select(nodeRef.value)
			.selectAll('text')
			.data(filteredData.value, (d: any) => d[props.nodeId])
			.join(
				enter =>
					enter
						.append('text')
						.text((d: SankeyNode) => d[props.nodeId])
						.attr('dominant-baseline', 'middle')
						.attr('paint-order', 'stroke')
						.attr('stroke-linecap', 'round')
						.attr('stroke-linejoin', 'round')
						.attr('stroke-width', '6')
						.attr('stroke', 'white')
						.attr('text-anchor', getTextAnchor.value)
						.attr('x', getXPosition.value)
						.attr('y', getYPosition.value)
						.attr('opacity', 1e-9)
						.call((enter: any) =>
							enter
								.transition(t)
								.delay(
									(d: SankeyNode) =>
										constants.duration.short * ((d.depth || 0) + 1)
								)
								.attr('opacity', 1)
						),
				update =>
					update
						.attr('text-anchor', getTextAnchor.value)
						.attr('x', getXPosition.value)
						.attr('y', getYPosition.value)
						.text((d: SankeyNode) => d[props.nodeId]),
				exit => exit.transition(t).attr('opacity', 0).remove()
			)
	})
</script>

<template>
	<g
		:class="$style.labels"
		ref="nodeRef"
	/>
</template>

<style module>
	.labels {
		font-size: 12px;
		font-family: var(--font-family-monospace);
	}
</style>
