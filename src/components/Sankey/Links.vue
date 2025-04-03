<script setup>
	import {constants} from '@/assets/constants'
	import highlightLinks from '@/utils/highlightLinks'
	import {sankeyLinkHorizontal} from 'd3-sankey'
	import {select} from 'd3-selection'
	import {linkHorizontal} from 'd3-shape'
	import {transition} from 'd3-transition'
	import {computed, inject, proxyRefs, ref, watchEffect} from 'vue'

	const props = defineProps({
		data: {
			type: Array,
			required: true,
		},
	})

	const nodeRef = ref(null)

	const linkAccessor = linkHorizontal()
		.source(d => [d.source.x0, d.source.y0])
		.target(d => [d.source.x0, d.source.y0])

	const source = ref([])
	const target = ref([])

	const sources = d => {
		if (d.sourceLinks.length > 0) {
			for (const link of d.sourceLinks) {
				target.value.push(link.target.id)
				sources(link.target)
			}
		}
	}

	const targets = d => {
		if (d.targetLinks.length > 0) {
			for (const link of d.targetLinks) {
				source.value.push(link.source.id)
				targets(link.source)
			}
		}
	}

	const labelHoverDatum = inject('labelDatum')
	const labelHoverId = inject('labelId')
	const isHovered = computed(() => labelHoverId.value !== '')

	watchEffect(() => {
		const {data} = proxyRefs(props)

		source.value = []
		target.value = []

		if (typeof labelHoverDatum.value.id !== 'undefined') {
			sources(labelHoverDatum.value)
			targets(labelHoverDatum.value)
		}

		select(nodeRef.value)
			.selectAll('path')
			.data(data, d => `${d.source.id}-${d.target.id}`)
			.join(
				enter =>
					enter
						.append('path')
						.attr('d', d => linkAccessor(d))
						.attr('stroke-width', d => Math.max(1, d.width))
						.call(enter =>
							enter
								.transition(transition().duration(constants.duration.short))
								.delay(d => constants.duration.short * (d.source.depth + 1))
								.attr('d', sankeyLinkHorizontal())
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
