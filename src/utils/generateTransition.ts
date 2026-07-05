import { transition } from 'd3-transition'
import { easeCubicInOut } from 'd3-ease'

const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
let _prefersReduced = mql.matches
mql.addEventListener('change', (e) => {
  _prefersReduced = e.matches
})

export default function generateTransition({ delay = 0, duration = 555, easing = easeCubicInOut }) {
  return transition()
    .duration(_prefersReduced ? 0 : duration)
    .delay(delay)
    .ease(easing)
}