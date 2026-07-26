<script setup lang="ts">
import {computed, ref} from 'vue'

const props = withDefaults(
	defineProps<{
		height?: number
		marginBottom?: number
		marginLeft?: number
		marginRight?: number
		marginTop?: number
		width?: number
		zoomTransform?: string
	}>(),
	{
		height: 480,
		marginBottom: 40,
		marginLeft: 50,
		marginRight: 20,
		marginTop: 50,
		width: 960,
		zoomTransform: '',
	},
)

const svgRef = ref<SVGSVGElement | null>(null)
const viewBox = computed(() => `0 0 ${props.width} ${props.height}`)
const transform = computed(() => {
	const base = `translate(${props.marginLeft}, ${props.marginTop})`
	return props.zoomTransform ? `${base} ${props.zoomTransform}` : base
})

defineExpose({
	svgRef,
})
</script>

<template>
	<div :class="$style.chart" class="chart">
		<svg
			ref="svgRef"
			:viewBox="viewBox"
			height="100%"
			preserveAspectRatio="xMinYMin"
			shapeRendering="crispEdges"
			width="100%"
		>
			<g class="canvas" :transform="transform">
				<slot />
			</g>
		</svg>
	</div>
</template>

<style module>
.chart {
	contain: layout style paint;
	border: 1px solid;
	display: flex;
	margin: 0 auto;
	max-width: var(--max-width);
}

:root {
	--max-width: 960px;
}
</style>
