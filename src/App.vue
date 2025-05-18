<script setup lang="ts">
	import LineChart from '@/components/LineChart/LineChart.vue'
	import Sankey from '@/components/Sankey/Sankey.vue'
	import aaplCsvData from '@/data/aapl.csv?raw'
	import sankeyJsonData from '@/data/edges2.json'
	import {ref} from 'vue'
	import type {SankeyLink} from '@/composables/useNodesAndLinks'

	// Taking advantage of Vue 3.5's improved reactivity
	const nodeAlign = ref<'left' | 'justify' | 'right' | 'center'>('left')
	const nodeId = ref('id')
	const nodePadding = ref(1e9)
	const nodeWidth = ref(1e-9)
	const sort = ref(false)

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
