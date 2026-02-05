import { select } from 'd3-selection'

export default function xAxisPatterns({ node, height }: { node: SVGGElement; height: number }) {
	const selection = select(node).attr('transform', `translate(0, ${height})`)

	selection.select('.domain').attr('stroke', 'currentColor').style('stroke-width', '2')

	selection.selectAll('.tick line').attr('stroke-opacity', 1)

	selection.selectAll('.tick text').attr('font-family', 'var(--font-family-system)')
}
