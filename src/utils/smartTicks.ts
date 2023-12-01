import type {ScaleLinear} from 'd3-scale'

export default function smartTicks(
	y: ScaleLinear<number, number, never>
): number {
	const max = y.invert(0)
	let step = Math.pow(10, Math.floor(Math.log10(max)))

	if (max / step < 2) {
		step /= 5
	} else if (max / step < 5) {
		step /= 2
	}

	return Math.min(5, Math.max(1, Math.ceil(max / step)))
}
