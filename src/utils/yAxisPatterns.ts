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
				.attr('font-family', 'var(--font-family-system)')
				.attr('font-size', '12')
				.attr('font-variant-numeric', 'tabular-nums')
				.attr('font-weight', '400')
				.attr('text-anchor', 'end')
				.attr('x', '-8')
		)
}
