import type { ScaleLinear } from 'd3-scale'
export default function smartTicks(
	y: ScaleLinear<number, number, never>
): number {
	const max = y.invert(0)
	let step = Math.pow(10, max.toString().length - 1)

	if (max / step < 2) {
		step /= 5
	} else if (max / step < 5) {
		step /= 2
	}

	const ticks =
		Math.ceil(max / step) > 1
			? Math.ceil(max / step) >= 9
				? 5
				: Math.ceil(max / step)
			: 5

	return ticks
}
