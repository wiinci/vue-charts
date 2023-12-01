<script setup lang="ts">
import {computed, shallowRef} from 'vue'

const props = shallowRef({
	height: 500,
	marginLeft: 50,
	marginTop: 50,
	width: 960,
})

const viewBox = computed(() => `0 0 ${props.value.width} ${props.value.height}`)
const transform = computed(
	() => `translate(${props.value.marginLeft}, ${props.value.marginTop})`
)
</script>

<template>
	<div :class="$style.chart">
		<svg
			:viewBox="viewBox"
			height="100%"
			preserveAspectRatio="xMinYMin"
			shapeRendering="crispEdges"
			width="100%"
		>
			<g
				class="canvas"
				:transform="transform"
			>
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
