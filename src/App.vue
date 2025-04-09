<script setup>
	import LineChart from '@/components/LineChart/LineChart.vue'
	import Sankey from '@/components/Sankey/Sankey.vue'
	import aaplCsvData from '@/data/aapl.csv?raw'
	import sankeyJsonData from '@/data/edges2.json'
	import {ref} from 'vue'

	const nodeAlign = ref('left')
	const nodeId = ref('id')
	const nodePadding = ref(1e9)
	const nodeWidth = ref(1e-9)
	const sort = ref(false)
	const sankeyData = Object.freeze(sankeyJsonData)
	const lineData = Object.freeze(aaplCsvData)
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
