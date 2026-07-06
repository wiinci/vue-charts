import type {SankeyLink, SankeyNode} from './sankeyModel'
import {getNodeIdFromReference} from './sankeyModel'

type TraversalDirection = 'sourceLinks' | 'targetLinks'

export function createNodeLookup(nodes: readonly SankeyNode[]): Map<string, SankeyNode> {
	return new Map(nodes.map((node) => [node.id, node]))
}

export function getLinkSourceId(link: SankeyLink): string {
	return getNodeIdFromReference(link.source)
}

export function getLinkTargetId(link: SankeyLink): string {
	return getNodeIdFromReference(link.target)
}

export function getLinkSourceNode(
	link: SankeyLink,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
): SankeyNode | undefined {
	if (typeof link.source === 'object') {
		return link.source as SankeyNode
	}

	return nodeLookup.get(String(link.source))
}

export function getLinkTargetNode(
	link: SankeyLink,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
): SankeyNode | undefined {
	if (typeof link.target === 'object') {
		return link.target as SankeyNode
	}

	return nodeLookup.get(String(link.target))
}

export function allIncomingSourcesMatch(
	node: SankeyNode,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
	predicate: (sourceNode: SankeyNode) => boolean,
): boolean {
	const incomingLinks = node.targetLinks ?? []

	if (incomingLinks.length === 0) {
		return false
	}

	return incomingLinks.every((link) => {
		const sourceNode = getLinkSourceNode(link, nodeLookup)
		return sourceNode ? predicate(sourceNode) : false
	})
}

export function collectDownstreamNodeIds(
	nodeId: string,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
	visited = new Set<string>(),
	sourceDepth?: number,
): Set<string> {
	const node = nodeLookup.get(nodeId)
	const currentDepth = sourceDepth ?? node?.depth ?? 0
	visited.add(nodeId)

	if (!node?.sourceLinks) {
		return visited
	}

	for (const link of node.sourceLinks) {
		const targetNode = getLinkTargetNode(link, nodeLookup)
		if (!targetNode) {
			continue
		}

		const targetDepth = targetNode.depth ?? currentDepth + 1
		if (targetDepth <= currentDepth || visited.has(targetNode.id)) {
			continue
		}

		collectDownstreamNodeIds(targetNode.id, nodeLookup, visited, targetDepth)
	}

	return visited
}

export function collectRootSourceIds(
	nodeId: string,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
	visited = new Set<string>(),
): Set<string> {
	visited.add(nodeId)
	const node = nodeLookup.get(nodeId)

	if (!node) {
		return new Set<string>()
	}

	if (!node.targetLinks || node.targetLinks.length === 0) {
		return new Set([nodeId])
	}

	const roots = new Set<string>()

	for (const link of node.targetLinks) {
		const sourceId = getLinkSourceId(link)
		if (visited.has(sourceId)) {
			continue
		}

		for (const rootId of collectRootSourceIds(sourceId, nodeLookup, visited)) {
			roots.add(rootId)
		}
	}

	return roots
}

export function traverseConnectedNodes(
	startNode: SankeyNode,
	direction: TraversalDirection,
	nodeLookup: ReadonlyMap<string, SankeyNode>,
	visit: (node: SankeyNode) => void,
	shouldDescend: (node: SankeyNode) => boolean = () => true,
	visited = new Set<string>(),
): Set<string> {
	const links = startNode[direction] ?? []

	for (const link of links) {
		const nextNode =
			direction === 'sourceLinks'
				? getLinkTargetNode(link, nodeLookup)
				: getLinkSourceNode(link, nodeLookup)

		if (!nextNode || visited.has(nextNode.id)) {
			continue
		}

		visited.add(nextNode.id)
		visit(nextNode)

		if (shouldDescend(nextNode)) {
			traverseConnectedNodes(nextNode, direction, nodeLookup, visit, shouldDescend, visited)
		}
	}

	return visited
}
