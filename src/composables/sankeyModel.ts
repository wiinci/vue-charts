import type {SankeyLink as D3SankeyLink, SankeyNode as D3SankeyNode} from 'd3-sankey'

export interface SankeyNodeDatum {
	id: string
	[key: string]: unknown
}

export interface SankeyLinkDatum {
	value: number
	[key: string]: unknown
}

export interface SankeyNode extends D3SankeyNode<SankeyNodeDatum, SankeyLinkDatum> {
	x: number
	y: number
	width: number
	height: number
}

export type SankeyLink = D3SankeyLink<SankeyNodeDatum, SankeyLinkDatum>

export interface SankeyProps {
	data: SankeyLink[]
	height: number
	marginLeft: number
	marginTop: number
	marginBottom: number
	marginRight: number
	nodeAlign: 'justify' | 'left' | 'right' | 'center'
	nodeId: string
	nodePadding: number
	nodeWidth: number
	sort: boolean
	width: number
}

export interface SankeyLayoutData {
	nodes: SankeyNodeDatum[]
	links: SankeyLink[]
}

type SankeyNodeReference = SankeyLink['source']

export function getNodeIdFromReference(node: SankeyNodeReference): string {
	if (typeof node === 'string' || typeof node === 'number') {
		return String(node)
	}

	return node.id
}

export function getSankeyNodeKey(node: SankeyNodeDatum, nodeIdKey: string): string {
	const value = node[nodeIdKey]

	if (typeof value === 'string' || typeof value === 'number') {
		return String(value)
	}

	return node.id
}

export function normalizeSankeyData(
	rawLinks: readonly SankeyLink[],
	nodeIdKey: string,
): SankeyLayoutData {
	const nodeById = new Map<string, SankeyNodeDatum>()

	const ensureNode = (id: string) => {
		if (!nodeById.has(id)) {
			nodeById.set(id, {
				id,
				[nodeIdKey]: id,
			})
		}
	}

	const links = rawLinks.map((link): SankeyLink => {
		const sourceId = getNodeIdFromReference(link.source)
		const targetId = getNodeIdFromReference(link.target)

		ensureNode(sourceId)
		ensureNode(targetId)

		return {
			...link,
			source: sourceId,
			target: targetId,
			value: link.value || 1,
		}
	})

	return {
		nodes: Array.from(nodeById.values()),
		links,
	}
}

export function withSankeyNodeGeometry(
	node: D3SankeyNode<SankeyNodeDatum, SankeyLinkDatum>,
): SankeyNode {
	const x0 = node.x0 ?? 0
	const x1 = node.x1 ?? 0
	const y0 = node.y0 ?? 0
	const y1 = node.y1 ?? 0

	return {
		...node,
		x: x0,
		y: y0,
		width: x1 - x0,
		height: y1 - y0,
	}
}
