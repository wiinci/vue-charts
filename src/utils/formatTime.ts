import { utcDay, utcMonth, utcYear } from 'd3-time'
import { utcFormat } from 'd3-time-format'

export default function formatTime({ date }) {
	if (utcDay(date) < date) {
		return utcFormat('%I %p')(date)
	} else if (utcMonth(date) < date) {
		return utcFormat('%b %d')(date)
	} else if (utcYear(date) < date) {
		return utcFormat('%b')(date)
	}
	return utcFormat('%Y')(date)
}

export { formatTime }
