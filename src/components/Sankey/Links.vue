<script setup lang="ts">
	import {constants} from '@/assets/constants'
	import {useHighlightLinks} from '@/composables/useHighlightLinks'
	import {SankeyLink} from '@/composables/useNodesAndLinks'
	import {sankeyLinkHorizontal} from 'd3-sankey'
	import {select} from 'd3-selection'
	import {linkHorizontal} from 'd3-shape'
	import {transition} from 'd3-transition'
	import {computed, inject, ref, Ref, watchEffect} from 'vue'

	const props = defineProps<{
		data: SankeyLink[]
		collapsedNodes: Set<string>
	}>()

	const nodeRef = ref<SVGGElement | null>(null)

	// Pre-compute link accessors for better performance
	const initialLinkAccessor = computed(() => {
		const generator = linkHorizontal()
			.source((d: any) => [d.source.x0, d.source.y0])
			.target((d: any) => [d.source.x0, d.source.y0])
		// Return a function that generates a valid SVG path string
		return (d: any) => generator(d) || ''
	})

	// Create an adapter function that wraps the sankeyLinkHorizontal generator
	// to fix TypeScript incompatibility between SankeyLink and D3's expected types
	const finalLinkAccessor = computed(() => {
		const generator = sankeyLinkHorizontal()
		// Return a function that accepts our SankeyLink and passes it to the generator
		return function (d: any) {
			return generator(d)
		}
	})

	const labelHoverDatum = inject<Ref<any>>('labelDatum', ref({}))
	const labelHoverId = inject<Ref<string>>('labelId', ref(''))

	// Use the highlight links composable
	const {shouldHighlight, processHoveredNode} = useHighlightLinks(
		labelHoverId,
		computed(() => props.collapsedNodes)
	)

	// Filter links to exclude those from collapsed nodes
	const filteredData = computed(() => {
		return props.data.filter(link => {
			// Get source ID accounting for both string and object references
			const sourceId =
				typeof link.source === 'object' ? link.source.id : link.source

			// Hide links if the source node is collapsed
			return !props.collapsedNodes.has(sourceId as string)
		})
	})

	watchEffect(() => {
		if (!nodeRef.value) return

		const data = filteredData.value
		if (
			labelHoverDatum.value &&
			typeof labelHoverDatum.value.id !== 'undefined'
		) {
			processHoveredNode(labelHoverDatum.value)
		}

		const t = transition().duration(constants.duration.short)

		select(nodeRef.value)
			.selectAll('path')
			.data(data, (d: any) => `${d.source.id}-${d.target.id}`)
			.join(
				enter =>
					enter
						.append('path')
						.attr('fill', 'none')
						.attr('stroke', (d: any) =>
							shouldHighlight(d, {
								trueValue: constants.linkColorHighlight,
								falseValue: constants.linkColor,
							})
						)
						.attr('stroke-width', (d: any) => Math.max(1, d.width))
						.attr('d', initialLinkAccessor.value)
						.transition(t)
						.delay(
							(d: any) => constants.duration.short * ((d.source.depth || 0) + 1)
						)
						.attr('d', finalLinkAccessor.value),
				update =>
					update
						.classed(
							'raise',
							(d: any) =>
								shouldHighlight(d, {
									trueValue: true,
									falseValue: false,
								}) as boolean
						)
						.transition(t)
						.attr('d', finalLinkAccessor.value)
						.attr('stroke', (d: any) =>
							shouldHighlight(d, {
								trueValue: constants.linkColorHighlight,
								falseValue: constants.linkColor,
							})
						)
						.attr('stroke-width', (d: any) =>
							shouldHighlight(d, {
								trueValue: 1.5,
								falseValue: 1,
							})
						),
				exit => exit.transition(t).attr('d', initialLinkAccessor.value).remove()
			)

		// Raise highlighted links to appear on top
		select(nodeRef.value).selectAll('path.raise').raise()
	})
</script>

<template>
	<g
		class="links"
		:stroke="constants.linkColor"
		fill="none"
		ref="nodeRef"
	/>
</template>
