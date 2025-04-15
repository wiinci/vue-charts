<script setup>
	import Chart from '@/components/common-ts/Chart.vue'
	import Voronoi from '@/components/common-ts/Voronoi.vue'
	import useNodesAndLinks from '@/hooks/useNodesAndLinks'
	import {computed, provide, ref} from 'vue'
	import Labels from './Labels.vue'
	import Links from './Links.vue'
	import Nodes from './Nodes.vue'

	const props = defineProps({
		data: {required: true, type: Array},
		height: {default: 480, type: Number},
		marginLeft: {default: 20, type: Number},
		marginRight: {default: 20, type: Number},
		marginBottom: {default: 20, type: Number},
		marginTop: {default: 20, type: Number},
		nodeAlign: {default: 'left', type: String},
		nodeId: {default: 'id', type: String},
		nodePadding: {default: 10, type: Number},
		nodeWidth: {default: 10, type: Number},
		sort: {default: false, type: Boolean},
		width: {default: 960, type: Number},
	})

	const {chartWidth, links, nodes} = useNodesAndLinks(props)

	const labelDatum = ref({})
	const labelId = ref('')
	const xAccessor = computed(() => d => d.x0)
	const yAccessor = computed(() => d => d.y0)
	provide('labelDatum', labelDatum)
	provide('labelId', labelId)

	const collapsedNodes = ref(new Set())

	// Returns the node object by id
	function getNodeById(id) {
		return nodes.find(n => n.id === id)
	}

	// Returns true if all sources of a node are collapsed
	function allSourcesCollapsed(node) {
		return (
			node.targetLinks &&
			node.targetLinks.length > 0 &&
			node.targetLinks.every(l =>
				collapsedNodes.value.has(
					typeof l.source === 'object' ? l.source.id : l.source
				)
			)
		)
	}

	// Recursively expands all downstream nodes unless all their sources are collapsed
	function expandDownstream(nodeId) {
		const node = getNodeById(nodeId)
		if (!node || !node.sourceLinks) return
		node.sourceLinks.forEach(link => {
			const targetId =
				typeof link.target === 'object' ? link.target.id : link.target
			const targetNode = getNodeById(targetId)
			if (!targetNode) return
			// If not all sources are collapsed and node is collapsed, expand it and continue
			if (
				!allSourcesCollapsed(targetNode) &&
				collapsedNodes.value.has(targetId)
			) {
				collapsedNodes.value.delete(targetId)
				expandDownstream(targetId)
			// If node is not collapsed, continue expanding downstream
			} else if (!collapsedNodes.value.has(targetId)) {
				expandDownstream(targetId)
			}
		})
	}

	// Collects all downstream nodes from a given node
	function collectDownstream(nodeId, visited = new Set()) {
		visited.add(nodeId)
		links
			.filter(
				link =>
					(typeof link.source === 'object' ? link.source.id : link.source) ===
					nodeId
			)
			.forEach(link => {
				const targetId =
					typeof link.target === 'object' ? link.target.id : link.target
				if (!visited.has(targetId)) collectDownstream(targetId, visited)
			})
		return visited
	}

	// Finds all root sources for a node by traversing upstream
	function findNodeRootSources(nodeId, visited = new Set()) {
		visited.add(nodeId)
		const node = getNodeById(nodeId)
		if (!node) return new Set()
		if (!node.targetLinks || node.targetLinks.length === 0)
			return new Set([nodeId])
		const rootSources = new Set()
		node.targetLinks.forEach(link => {
			const sourceId =
				typeof link.source === 'object' ? link.source.id : link.source
			if (!visited.has(sourceId)) {
				findNodeRootSources(sourceId, visited).forEach(root =>
					rootSources.add(root)
				)
			}
		})
		return rootSources
	}

	// Handles expand/collapse logic for a node
	function toggleCollapse(node) {
		const nodeId = node.id || node
		if (collapsedNodes.value.has(nodeId)) {
			// EXPAND: Remove node from collapsed set and expand all downstream nodes unless all their sources are collapsed
			collapsedNodes.value.delete(nodeId)
			expandDownstream(nodeId)
		} else {
			// COLLAPSE: Add node to collapsed set and collapse downstream nodes if all their sources are collapsed
			collapsedNodes.value.add(nodeId)
			const currentNode = getNodeById(nodeId)
			const isRootSource =
				!currentNode?.targetLinks || currentNode.targetLinks.length === 0
			const downstreamNodes = new Set(collectDownstream(nodeId))
			downstreamNodes.delete(nodeId)
			downstreamNodes.forEach(id => {
				const n = getNodeById(id)
				if (!n) return
				if (isRootSource) {
					// For root sources, collapse downstream node only if all root sources are collapsed
					const allRootSources = findNodeRootSources(id)
					const allRootSourcesCollapsed = Array.from(allRootSources).every(
						rootSourceId =>
							rootSourceId === nodeId || collapsedNodes.value.has(rootSourceId)
					)
					if (allRootSourcesCollapsed) collapsedNodes.value.add(id)
				} else if (n.targetLinks) {
					// For non-root nodes, collapse if all sources are collapsed
					const allSourcesCollapsed = n.targetLinks.every(link => {
						const sourceId =
							typeof link.source === 'object' ? link.source.id : link.source
						return sourceId === nodeId || collapsedNodes.value.has(sourceId)
					})
					if (allSourcesCollapsed) collapsedNodes.value.add(id)
				}
			})
		}
	}

	const filteredLinks = computed(() =>
		links.filter(link => !collapsedNodes.value.has(link.source.id))
	)
	const filteredNodes = computed(() => {
		const visibleNodes = new Set()
		filteredLinks.value.forEach(link => {
			visibleNodes.add(link.source.id)
			visibleNodes.add(link.target.id)
		})
		collapsedNodes.value.forEach(nodeId => visibleNodes.add(nodeId))
		return nodes.filter(node => visibleNodes.has(node.id))
	})

	const handleNodeClick = ({id}) => toggleCollapse({id})

	function highlightLinks({d}) {
		labelId.value = typeof d === 'object' ? d.id : ''
		labelDatum.value = typeof d === 'object' ? d : {}
	}
</script>

<template>
	<Chart
		:height="height"
		:marginLeft="0"
		:marginTop="0"
		:width="width"
	>
		<Links
			:data="filteredLinks"
			:collapsedNodes="collapsedNodes"
		/>
		<Nodes
			:data="filteredNodes"
			:nodeId="nodeId"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			:collapsedNodes="collapsedNodes"
			@click="toggleCollapse"
		/>
		<Labels
			:data="filteredNodes"
			:collapsedNodes="collapsedNodes"
			:node-id="nodeId"
			:node-width="nodeWidth"
			:width="chartWidth"
		/>
		<Voronoi
			:classKey="'sankey'"
			:data="filteredNodes"
			:height="height"
			:width="width"
			:xAccessor="xAccessor"
			:yAccessor="yAccessor"
			@move-to="highlightLinks"
			@node-click="handleNodeClick"
		/>
	</Chart>
</template>
