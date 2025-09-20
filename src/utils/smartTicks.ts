import type {ScaleLinear} from 'd3-scale'

export default function smartTicks(
	y: ScaleLinear<number, number, never>
): number {
	const max = y.invert(0)
	let step = Math.pow(10, Math.floor(Math.log10(max)))

	// Adjust step based on ratio without else clauses
	const ratio = max / step
	if (ratio < 2) {
		step /= 5
	}
	if (ratio >= 2 && ratio < 5) {
		step /= 2
	}

	return Math.min(5, Math.max(1, Math.ceil(max / step)))
}
