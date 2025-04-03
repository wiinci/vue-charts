<script setup>
	import Chart from '@/components/common-ts/Chart.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import useNodesAndLinks from '@/hooks/useNodesAndLinks'
	import {computed, provide, ref} from 'vue'
	import Labels from './Labels.vue'
	import Links from './Links.vue'

	const props = defineProps({
		data: {
			required: true,
			type: Array,
		},
		height: {
			default: 480,
			type: Number,
		},
		marginLeft: {
			default: 20,
			type: Number,
		},
		marginRight: {
			default: 20,
			type: Number,
		},
		marginBottom: {
			default: 20,
			type: Number,
		},
		marginTop: {
			default: 20,
			type: Number,
		},
		nodeAlign: {
			default: 'left',
			type: String,
			validator: value =>
				['left', 'right', 'center', 'justify'].includes(value),
		},
		nodeId: {
			default: 'id',
			type: String,
		},
		nodePadding: {
			default: 10,
			type: Number,
		},
		nodeWidth: {
			default: 10,
			type: Number,
		},
		sort: {
			default: false,
			type: Boolean,
		},
		width: {
			default: 960,
			type: Number,
		},
	})

	const {chartWidth, links, nodes} = useNodesAndLinks(props)

	const labelDatum = ref({})
	const labelId = ref('')

	const highlightLinks = ({d}) => {
		labelId.value = typeof d === 'object' ? d.id : ''
		labelDatum.value = typeof d === 'object' ? d : {}
	}

	const xAccessor = computed(() => d => d.x0)
	const yAccessor = computed(() => d => d.y0)

	// Hover (links)
	provide('labelDatum', labelDatum)
	provide('labelId', labelId)
</script>

<template>
	<Chart
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
	>
		<Links :data="links" />
		<Labels
			:data="nodes"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<Voronoi
			:classKey="'voronoi'"
			:data="nodes"
			:height="height"
			:width="width"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			@move-to="highlightLinks"
		/>
	</Chart>
</template>
