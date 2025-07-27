import {utcDay, utcMonth, utcYear} from 'd3-time'
import {utcFormat} from 'd3-time-format'

const formatHour = utcFormat('%I %p')
const formatDay = utcFormat('%b %d')
const formatMonth = utcFormat('%b')
const formatYear = utcFormat('%Y')

export default function formatTime({date}: {date: Date}) {
	if (utcDay(date) < date) {
		return formatHour(date)
	} else if (utcMonth(date) < date) {
		return formatDay(date)
	} else if (utcYear(date) < date) {
		return formatMonth(date)
	}
	return formatYear(date)
}

export {formatTime}
