<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
	defineProps<{
		height?: number
		marginBottom?: number
		marginLeft?: number
		marginRight?: number
		marginTop?: number
		width?: number
	}>(),
	{
		height: 480,
		marginBottom: 40,
		marginLeft: 50,
		marginRight: 20,
		marginTop: 50,
		width: 960,
	},
)

const viewBox = computed(() => `0 0 ${props.width} ${props.height}`)
const transform = computed(() => `translate(${props.marginLeft}, ${props.marginTop})`)
</script>

<template>
	<div :class="$style.chart" class="chart">
		<svg
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
	border: 1px solid;
	display: flex;
	margin: 0 auto;
	max-width: var(--max-width);
}

:root {
	--max-width: 960px;
}
</style>
