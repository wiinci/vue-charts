<script setup lang="ts">
import {defineAsyncComponent, onMounted, onUnmounted, provide, ref} from 'vue'
import type {SankeyLink} from '@/composables/useNodesAndLinks'
import sankeyJsonData from '@/data/edges2.json'

// Loaded asynchronously so the first paint races the animation gate below,
// exactly as the SVG Sankey does inside HomeView (spec V17: both outcomes —
// animated or instant — are conformant).
const SankeyCanvas = defineAsyncComponent(() => import('@/components/SankeyCanvas/SankeyCanvas.vue'))

// The home page's animation gate, reproduced verbatim minus the line chart
// (HomeView.vue). Deliberately not extracted: / must stay untouched.
const animationsEnabled = ref(false)

// SankeyCanvas and its label components consume this the same way the SVG's
// Links.vue and Labels.vue do
provide('animationsEnabled', animationsEnabled)

let idleCallbackId: number | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null
let animationRafA: number | null = null
let animationRafB: number | null = null

const runWhenIdle = (cb: () => void) => {
	if (typeof requestIdleCallback !== 'undefined') {
		idleCallbackId = requestIdleCallback(() => cb())
	} else {
		// Browsers without requestIdleCallback (Safari, happy-dom): defer
		// briefly — the same approach as requestIdleCallback polyfills
		timeoutId = setTimeout(() => {
			timeoutId = null
			cb()
		}, 1)
	}
}

const enableAnimationsSoon = () => {
	animationRafA = requestAnimationFrame(() => {
		animationRafA = null
		animationRafB = requestAnimationFrame(() => {
			animationRafB = null
			animationsEnabled.value = true
		})
	})
}

onMounted(() => {
	runWhenIdle(() => {
		enableAnimationsSoon()
	})
})

onUnmounted(() => {
	if (idleCallbackId !== null) {
		cancelIdleCallback(idleCallbackId)
		idleCallbackId = null
	}
	if (timeoutId !== null) {
		clearTimeout(timeoutId)
		timeoutId = null
	}
	if (animationRafA !== null) {
		cancelAnimationFrame(animationRafA)
		animationRafA = null
	}
	if (animationRafB !== null) {
		cancelAnimationFrame(animationRafB)
		animationRafB = null
	}
})

// Same transform the home page applies: the edge list carries no values
const sankeyData = sankeyJsonData.map((item: any) => ({...item, value: 1})) as SankeyLink[]

// The home page's layout configuration — the geometry baseline's props
const nodeAlign = 'justify' as const
const nodeId = 'id'
const nodePadding = 1e9
const nodeWidth = 1e-9
const sort = false
</script>

<template>
	<Suspense>
		<SankeyCanvas
			:data="sankeyData"
			:node-align="nodeAlign"
			:node-id="nodeId"
			:node-padding="nodePadding"
			:node-width="nodeWidth"
			:sort="sort"
		/>
		<template #fallback>
			<div>Loading &hellip;</div>
		</template>
	</Suspense>
</template>
