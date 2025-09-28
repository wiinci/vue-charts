/**
 * @param {props} object all props
 *
 * @returns {object} the sankey nodes and links
 */
import {sankey, sankeyJustify, sankeyLeft} from 'd3-sankey'
import {computed, reactive, proxyRefs} from 'vue'

const useNodesAndLinks = props => {
	const {
		data,
		height,
		marginLeft,
		marginTop,
		nodeAlign,
		nodeId,
		nodePadding,
		nodeWidth,
		sort,
		width,
	} = proxyRefs(props)
	console.log('useNodesAndLinks2', data)

	const nodeById = new Map()

	const align = computed(() =>
		nodeAlign === 'justify' ? sankeyJustify : sankeyLeft
	)

	const chartHeight = computed(() => height - marginTop)

	const chartWidth = computed(() => width - marginLeft)

	const sorted = computed(() => (sort ? null : undefined))

	const fn = computed(() =>
		sankey()
			.nodeAlign(align.value)
			.nodeId(d => d[nodeId])
			.nodePadding(nodePadding)
			.nodeSort(sorted.value)
			.nodeWidth(nodeWidth)
			.extent([
				[marginLeft, marginTop],
				[chartWidth.value, chartHeight.value],
			])
	)

	// Extract links from the table data structure
	const links = []
	const seenLinks = new Set() // Track unique links to avoid duplicates

	data.forEach(table => {
		if (table?.joins?.columnJoins) {
			table.joins.columnJoins.forEach(columnJoin => {
				if (columnJoin?.joinedWith) {
					columnJoin.joinedWith.forEach(joinedTable => {
						const targetId = table.fullyQualifiedName
							? `${table.fullyQualifiedName}.${columnJoin.columnName}`
							: `${table.name}.${columnJoin.columnName}`

						const sourceId = joinedTable.fullyQualifiedName || joinedTable.name

						const linkKey = `${sourceId}->${targetId}`
						const reverseLinkKey = `${targetId}->${sourceId}`

						// Prevent circular links and duplicates
						if (
							!seenLinks.has(linkKey) &&
							!seenLinks.has(reverseLinkKey) &&
							sourceId !== targetId
						) {
							seenLinks.add(linkKey)
							links.push({
								id: targetId,
								target: targetId,
								source: sourceId,
								value: 1,
							})
						}
					})
				}
			})
		}
	})

	console.log('processed links', links)

	// Build nodes from unique source and target IDs
	const nodeIds = new Set()
	links.forEach(link => {
		nodeIds.add(link.source)
		nodeIds.add(link.target)
	})

	// Create nodes
	nodeIds.forEach(id => {
		if (!nodeById.has(id)) {
			nodeById.set(id, {
				[nodeId]: id,
				id: id,
			})
		}
	})

	const sankeyData = {
		nodes: Array.from(nodeById.values()),
		links: links,
	}

	console.log('sankeyData', sankeyData)

	try {
		const {nodes, links: processedLinks} = fn.value({
			nodes: sankeyData.nodes.map(d => Object.assign({}, d)),
			links: sankeyData.links.map(d => Object.assign({}, d)),
		})

		return reactive({
			chartHeight,
			chartWidth,
			links: processedLinks,
			nodes,
		})
	} catch (error) {
		console.error('Sankey generation failed:', error)
		// Return empty data structure on error
		return reactive({
			chartHeight,
			chartWidth,
			links: [],
			nodes: [],
		})
	}
}

export {useNodesAndLinks}
