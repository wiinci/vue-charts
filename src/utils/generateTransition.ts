import { transition } from 'd3-transition'
import { easeCubicOut } from 'd3-ease'

export default function generateTransition({
	delay = 0,
	duration = 555,
	easing = easeCubicOut,
}) {
	const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

	return transition()
		.duration(!mediaQuery || mediaQuery.matches ? 0 : duration)
		.delay(delay)
		.ease(easing)
}
