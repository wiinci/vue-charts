<script setup lang="ts">
import {constants} from '@/assets/constants'
import {useHighlightLinks} from '@/composables/useHighlightLinks'
import {SankeyLink, SankeyNode} from '@/composables/useNodesAndLinks'
import {SankeyLinkDatum, SankeyNodeDatum} from '@/composables/sankeyModel'
import {getLinkSourceId, getLinkTargetId} from '@/composables/sankeyTraversal'
import {optimizeSvgPath} from '@/utils'
import {sankeyLinkHorizontal} from 'd3-sankey'
import {select} from 'd3-selection'
import {linkHorizontal} from 'd3-shape'
import {transition} from 'd3-transition'
import {computed, inject, ref, Ref, watch, watchEffect} from 'vue'

const props = defineProps<{
	data: SankeyLink[]
	collapsedNodes: Set<string>
}>()

const nodeRef = ref<SVGGElement | null>(null)

const getRenderedSource = (link: SankeyLink): SankeyNode => link.source as SankeyNode
const getLinkDepth = (link: SankeyLink): number => getRenderedSource(link).depth || 0
const getLinkKey = (link: SankeyLink): string => `${getLinkSourceId(link)}-${getLinkTargetId(link)}`
const getBaseStrokeWidth = (link: SankeyLink): number => Math.max(1, link.width ?? 0)

// Pre-compute link accessors for better performance
const initialGenerator = linkHorizontal<SankeyLink, [number, number]>()
	.source((link) => {
		const source = getRenderedSource(link)
		return [source.x0 ?? 0, source.y0 ?? 0]
	})
	.target((link) => {
		const source = getRenderedSource(link)
		return [source.x0 ?? 0, source.y0 ?? 0]
	})
// Accessor to generate SVG path string
const initialLinkAccessor = (link: SankeyLink) => optimizeSvgPath(initialGenerator(link) || '')

// Create an adapter function for sankeyLinkHorizontal generator
const finalGenerator = sankeyLinkHorizontal<SankeyNodeDatum, SankeyLinkDatum>()
const finalLinkAccessor = (link: SankeyLink) => optimizeSvgPath(finalGenerator(link) || '')

const labelHoverDatum = inject<Ref<SankeyNode | null>>('labelDatum', ref(null))
const labelHoverId = inject<Ref<string>>('labelId', ref(''))
const animationsEnabled = inject<Ref<boolean>>('animationsEnabled', ref(true))

// Use the highlight links composable
const {shouldHighlight, processHoveredNode} = useHighlightLinks(
	labelHoverId,
	computed(() => props.collapsedNodes),
)

const collapsedKey = computed(() => Array.from(props.collapsedNodes).sort().join('|'))

watch(
	[() => labelHoverId.value, collapsedKey],
	() => {
		const hoveredNode = labelHoverDatum.value
		if (hoveredNode?.id) {
			processHoveredNode(hoveredNode)
			return
		}

		processHoveredNode(null)
	},
	{immediate: true},
)

watchEffect(() => {
	if (!nodeRef.value) return

	const data = props.data
	const isAnimated = animationsEnabled.value
	const tfast = transition().duration(constants.duration.fast)
	const maxDepth = Math.max(0, ...data.map(getLinkDepth))

	select(nodeRef.value)
		.selectAll<SVGPathElement, SankeyLink>('path')
		.data(data, getLinkKey)
		.join(
			(enter) =>
				enter
					.append('path')
					.attr('fill', 'none')
					.attr('stroke', (link) =>
						shouldHighlight(link, {
							trueValue: constants.linkColorHighlight,
							falseValue: constants.linkColor,
						}),
					)
					.attr('stroke-width', getBaseStrokeWidth)
					.call((selection) => {
						if (!isAnimated) {
							selection.attr('d', finalLinkAccessor)
							return
						}

						selection
							.attr('d', initialLinkAccessor)
							.transition(tfast)
							.delay((link) => constants.duration.fast * (getLinkDepth(link) + 1))
							.attr('d', finalLinkAccessor)
					}),
			(update) => {
				const base = update
					.classed('raise', (link) =>
						shouldHighlight(link, {
							trueValue: true,
							falseValue: false,
						}),
					)
					.attr('stroke', (link) =>
						shouldHighlight(link, {
							trueValue: constants.linkColorHighlight,
							falseValue: constants.linkColor,
						}),
					)
					.attr('stroke-width', (link) =>
						shouldHighlight(link, {
							trueValue: 1.2,
							falseValue: 1,
						}),
					)

				if (!isAnimated) {
					return base.attr('d', finalLinkAccessor)
				}

				return base.transition(tfast).attr('d', finalLinkAccessor)
			},
			(exit) => {
				if (!isAnimated) {
					exit.remove()
					return
				}

				exit
					.transition(tfast)
					.delay((link) => constants.duration.fast * (maxDepth - getLinkDepth(link)))
					.attr('d', initialLinkAccessor)
					.remove()
			},
		)

	// Raise highlighted links to appear on top
	select(nodeRef.value).selectAll('path.raise').raise()
})
</script>

<template>
	<g class="links" :stroke="constants.linkColor" fill="none" ref="nodeRef" />
</template>
