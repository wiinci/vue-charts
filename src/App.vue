<script setup lang="ts">
	import type {SankeyLink} from '@/composables/useNodesAndLinks'
	import aaplCsvData from '@/data/aapl.csv?raw'
	import sankeyJsonData from '@/data/edges2.json'
	// import sankeyJsonData from '@/data/tables.json'
	import {defineAsyncComponent, ref} from 'vue'

	const Sankey = defineAsyncComponent(
		() => import('./components/Sankey/Sankey.vue')
	)
	const LineChart = defineAsyncComponent(
		() => import('./components/LineChart/LineChart.vue')
	)

	const nodeAlign = ref<'left' | 'justify' | 'right' | 'center'>('justify')
	const nodeId = ref('id')
	const nodePadding = ref(1e9)
	const nodeWidth = ref(1e-9)
	const sort = ref(false)

	// Convert the JSON data to proper SankeyLink format with value property
	const sankeyData = sankeyJsonData.map((item: any) => ({
		...item,
		value: 1, // Add a default value since it's required by the SankeyLink type
	})) as SankeyLink[]
	console.log('sankeyData', sankeyData)
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
				<LineChart :data="lineData" />
			</div>
		</template>
		<template #fallback>
			<div>Loading &hellip;</div>
		</template>
	</Suspense>
</template>

<style>
	:root {
		--font-family-system: BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto,
			Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
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
