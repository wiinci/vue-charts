import { select } from 'd3-selection'

export default function yAxisPatterns({ node, width }) {
	return select(node)
		.call(g => g.select('.domain').remove())
		.call(g =>
			g.selectAll('.tick line').attr('x2', width).attr('stroke-opacity', 0.1)
		)
		.call(g =>
			g
				.selectAll('.tick text')
				.attr('fill', 'currentColor')
				.attr('font-size', '12px')
				.attr('font-weight', '400')
				.attr('text-anchor', 'end')
				.attr('x', '-6')
		)
}
