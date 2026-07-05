<script setup lang="ts">
import type { SankeyLink } from '@/composables/useNodesAndLinks'
import aaplCsvData from '@/data/aapl.csv?raw'
import sankeyJsonData from '@/data/edges2.json'
// import sankeyJsonData from '@/data/tables.json'
import { defineAsyncComponent, onMounted, onUnmounted, provide, ref } from 'vue'

const Sankey = defineAsyncComponent(() => import('./components/Sankey/Sankey.vue'))
const LineChart = defineAsyncComponent(() => import('./components/LineChart/LineChart.vue'))

const nodeAlign = ref<'left' | 'justify' | 'right' | 'center'>('justify')
const nodeId = ref('id')
const nodePadding = ref(1e9)
const nodeWidth = ref(1e-9)
const sort = ref(false)
const showLineChart = ref(false)
const animationsEnabled = ref(false)

provide('animationsEnabled', animationsEnabled)

let idleCallbackId: number | null = null
let timeoutId: number | null = null
let animationRafA: number | null = null
let animationRafB: number | null = null

const runWhenIdle = (cb: () => void) => {
	if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
		idleCallbackId = window.requestIdleCallback(() => {
			idleCallbackId = null
			cb()
		}, { timeout: 250 })
		return
	}

	timeoutId = window.setTimeout(() => {
		timeoutId = null
		cb()
	}, 1)
}

const enableAnimationsSoon = () => {
	if (typeof window === 'undefined') {
		animationsEnabled.value = true
		return
	}

	animationRafA = window.requestAnimationFrame(() => {
		animationRafA = null
		animationRafB = window.requestAnimationFrame(() => {
			animationRafB = null
			animationsEnabled.value = true
		})
	})
}

onMounted(() => {
	runWhenIdle(() => {
		showLineChart.value = true
		enableAnimationsSoon()
	})
})

onUnmounted(() => {
	if (typeof window !== 'undefined' && idleCallbackId !== null && 'cancelIdleCallback' in window) {
		window.cancelIdleCallback(idleCallbackId)
	}
	if (timeoutId !== null) {
		window.clearTimeout(timeoutId)
	}
	if (typeof window !== 'undefined' && animationRafA !== null) {
		window.cancelAnimationFrame(animationRafA)
	}
	if (typeof window !== 'undefined' && animationRafB !== null) {
		window.cancelAnimationFrame(animationRafB)
	}
})

// Convert the JSON data to proper SankeyLink format with value property
const sankeyData = sankeyJsonData.map((item: any) => ({
	...item,
	value: 1, // Add a default value since it's required by the SankeyLink type
})) as SankeyLink[]
const lineData = aaplCsvData
</script>

<template>
	<Suspense>
		<template #default>
			<div>
				<Sankey
					:data="sankeyData"
					:node-align="nodeAlign"
					:node-id="nodeId"
					:node-padding="nodePadding"
					:node-width="nodeWidth"
					:sort="sort"
				/>
				<LineChart v-if="showLineChart" :data="lineData" />
			</div>
		</template>
		<template #fallback>
			<div>Loading &hellip;</div>
		</template>
	</Suspense>
</template>

<style>
:root {
	--font-family-system:
		BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
		'Helvetica Neue', sans-serif;
	--font-family-monospace: 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
path {
	mix-blend-mode: multiply;
}
#app {
	font-family: var(--font-family-system);
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
</style>
