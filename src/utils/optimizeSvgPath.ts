export default function optimizeSvgPath(path: string, fractionDigits = 2): string {
	if (!path) return path

	return path.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (segment) => {
		const value = Number(segment)
		if (!Number.isFinite(value)) {
			return segment
		}

		return Number(value.toFixed(fractionDigits)).toString()
	})
}
