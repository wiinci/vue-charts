<script setup>
	import {constants} from '@/assets/constants'
	import highlightLinks from '@/utils/highlightLinks'
	import {sankeyLinkHorizontal} from 'd3-sankey'
	import {select} from 'd3-selection'
	import {linkHorizontal} from 'd3-shape'
	import {transition} from 'd3-transition'
	import {computed, inject, ref, watchEffect} from 'vue'

	const props = defineProps({
		data: {
			type: Array,
			required: true,
		},
	})

	const nodeRef = ref(null)

	// Pre-compute link accessors for better performance
	const initialLinkAccessor = linkHorizontal()
		.source(d => [d.source.x0, d.source.y0])
		.target(d => [d.source.x0, d.source.y0])

	const finalLinkAccessor = sankeyLinkHorizontal()

	const source = ref([])
	const target = ref([])

	// Memoize traversal functions
	const collectSources = d => {
		if (!d.sourceLinks?.length) return

		for (const link of d.sourceLinks) {
			target.value.push(link.target.id)
			collectSources(link.target)
		}
	}

	const collectTargets = d => {
		if (!d.targetLinks?.length) return

		for (const link of d.targetLinks) {
			source.value.push(link.source.id)
			collectTargets(link.source)
		}
	}

	const labelHoverDatum = inject('labelDatum')
	const labelHoverId = inject('labelId')
	const isHovered = computed(() => labelHoverId.value !== '')

	watchEffect(() => {
		if (!nodeRef.value) return

		const data = props.data

		// Reset collections before recalculating
		source.value = []
		target.value = []

		// Only traverse when we have a valid hover datum
		if (
			labelHoverDatum.value &&
			typeof labelHoverDatum.value.id !== 'undefined'
		) {
			collectSources(labelHoverDatum.value)
			collectTargets(labelHoverDatum.value)
		}

		// Create the transition once
		const t = transition().duration(constants.duration.short)

		select(nodeRef.value)
			.selectAll('path')
			.data(data, d => `${d.source.id}-${d.target.id}`)
			.join(
				enter =>
					enter
						.append('path')
						.attr('d', initialLinkAccessor)
						.attr('stroke-width', d => Math.max(1, d.width))
						.call(enter =>
							enter
								.transition(t)
								.delay(d => constants.duration.short * (d.source.depth + 1))
								.attr('d', finalLinkAccessor)
						),
				update => update,
				exit => exit.remove()
			)
			.attr('stroke', d =>
				highlightLinks({
					d,
					falseCase: constants.linkColor,
					isHovered,
					labelHoverId: labelHoverId.value,
					source,
					target,
					trueCase: constants.linkColorHighlight,
				})
			)
			.attr('stroke-width', d =>
				highlightLinks({
					d,
					falseCase: 1,
					isHovered,
					labelHoverId: labelHoverId.value,
					source,
					target,
					trueCase: 1.5,
				})
			)
			.classed('raise', d =>
				highlightLinks({
					d,
					falseCase: false,
					isHovered,
					labelHoverId: labelHoverId.value,
					source,
					target,
					trueCase: true,
				})
			)

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
