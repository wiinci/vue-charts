import {transition} from 'd3-transition'
import {easeCubicInOut} from 'd3-ease'

export default function generateTransition({
	delay = 0,
	duration = 555,
	easing = easeCubicInOut,
}) {
	const mediaQuery = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches

	return transition()
		.duration(mediaQuery ? 0 : duration)
		.delay(delay)
		.ease(easing)
}
