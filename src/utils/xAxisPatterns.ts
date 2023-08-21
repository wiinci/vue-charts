import { select } from 'd3-selection'

export default function xAxisPatterns({ node, height }) {
	return select(node)
		.attr('transform', `translate(0, ${height})`)
		.call(g =>
			g
				.select('.domain')
				.attr('stroke', 'currentColor')
				.style('stroke-width', '2')
		)
		.call(g => g.selectAll('.tick line').attr('stroke-opacity', 1))
		.call(g =>
			g
				.selectAll('.tick text')
				.attr('font-family', 'var(--font-family-system)')
				.attr('font-size', '12')
				.attr('font-variant-numeric', 'tabular-nums')
				.attr('font-weight', '400')
				.attr('text-anchor', 'middle')
				.attr('y', '12')
		)
}
