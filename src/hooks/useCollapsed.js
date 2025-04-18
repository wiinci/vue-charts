import {computed, ref} from 'vue'

export default function useCollapsed(nodes, links) {
	const collapsedNodes = ref(new Set())

	function getNodeById(id) {
		return nodes.value.find(n => n.id === id)
	}

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

	function expandDownstream(nodeId) {
		const node = getNodeById(nodeId)
		if (!node || !node.sourceLinks) return
		node.sourceLinks.forEach(link => {
			const targetId =
				typeof link.target === 'object' ? link.target.id : link.target
			const targetNode = getNodeById(targetId)
			if (!targetNode) return
			if (
				!allSourcesCollapsed(targetNode) &&
				collapsedNodes.value.has(targetId)
			) {
				collapsedNodes.value.delete(targetId)
				expandDownstream(targetId)
			} else if (!collapsedNodes.value.has(targetId)) {
				expandDownstream(targetId)
			}
		})
	}

	function collectDownstream(nodeId, visited = new Set()) {
		visited.add(nodeId)
		links.value
			.filter(
				l => (typeof l.source === 'object' ? l.source.id : l.source) === nodeId
			)
			.forEach(l => {
				const targetId = typeof l.target === 'object' ? l.target.id : l.target
				if (!visited.has(targetId)) collectDownstream(targetId, visited)
			})
		return visited
	}

	function findNodeRootSources(nodeId, visited = new Set()) {
		visited.add(nodeId)
		const node = getNodeById(nodeId)
		if (!node) return new Set()
		if (!node.targetLinks || node.targetLinks.length === 0) {
			return new Set([nodeId])
		}
		const roots = new Set()
		node.targetLinks.forEach(link => {
			const sourceId =
				typeof link.source === 'object' ? link.source.id : link.source
			if (!visited.has(sourceId)) {
				findNodeRootSources(sourceId, visited).forEach(r => roots.add(r))
			}
		})
		return roots
	}

	function toggleCollapse(nodeOrId) {
		const id = typeof nodeOrId === 'object' ? nodeOrId.id : nodeOrId
		if (collapsedNodes.value.has(id)) {
			collapsedNodes.value.delete(id)
			expandDownstream(id)
		} else {
			collapsedNodes.value.add(id)
			const current = getNodeById(id)
			const isRootSource =
				!current.targetLinks || current.targetLinks.length === 0
			const downstream = collectDownstream(id)
			downstream.delete(id)
			downstream.forEach(dId => {
				const n = getNodeById(dId)
				if (!n) return
				if (isRootSource) {
					const roots = findNodeRootSources(dId)
					const allRootCollapsed = Array.from(roots).every(
						rootId => rootId === id || collapsedNodes.value.has(rootId)
					)
					if (allRootCollapsed) collapsedNodes.value.add(dId)
				} else if (n.targetLinks) {
					const allSrcCollapsed = n.targetLinks.every(link => {
						const srcId =
							typeof link.source === 'object' ? link.source.id : link.source
						return srcId === id || collapsedNodes.value.has(srcId)
					})
					if (allSrcCollapsed) collapsedNodes.value.add(dId)
				}
			})
		}
	}

	const filteredLinks = computed(() =>
		links.value.filter(link => !collapsedNodes.value.has(link.source.id))
	)

	const filteredNodes = computed(() => {
		const visible = new Set()
		filteredLinks.value.forEach(link => {
			visible.add(link.source.id)
			visible.add(link.target.id)
		})
		collapsedNodes.value.forEach(id => visible.add(id))
		return nodes.value.filter(n => visible.has(n.id))
	})

	return {collapsedNodes, filteredLinks, filteredNodes, toggleCollapse}
}
