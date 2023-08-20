import { select } from 'd3-selection'

export default function xAxisPatterns({ node, height }) {
	console.log(node)
	return select(node)
		.attr('transform', `translate(0, ${height})`)
		.call(g => g.select('.domain').remove())
		.call(g => g.selectAll('.tick line').attr('stroke-width', 1))
		.call(g =>
			g
				.selectAll('.tick text')
				.attr('fill', 'currentColor')
				.attr('font-size', '12px')
				.attr('font-weight', '400')
				.attr('text-anchor', 'middle')
				.attr('y', '12')
		)
}
