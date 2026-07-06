import {describe, expect, it} from 'vitest'
import {ref} from 'vue'
import {useLineChart} from '../useLineChart'

describe('useLineChart', () => {
	it('calculates scales and path correctly', () => {
		const data = [
			{date: new Date('2023-01-01'), value: 10},
			{date: new Date('2023-01-02'), value: 20},
		]
		const props = ref({
			data,
			width: 100,
			height: 100,
			marginTop: 10,
			marginBottom: 10,
			marginLeft: 10,
			marginRight: 10,
		})

		const {xScale, yScale, pathD, innerWidth, innerHeight} = useLineChart(props)

		expect(innerWidth.value).toBe(80)
		expect(innerHeight.value).toBe(80)

		expect(xScale.value).toBeDefined()
		expect(yScale.value).toBeDefined()

		const rangeX = xScale.value.range()
		expect(rangeX[1]).toBe(80)

		const rangeY = yScale.value.range()
		expect(rangeY[0]).toBe(80)
		expect(rangeY[1]).toBe(0)

		expect(pathD.value).toContain('M')
	})

	it('rounds generated path coordinates to two decimals', () => {
		const data = [
			{date: new Date('2023-01-01T00:00:00Z'), value: 10},
			{date: new Date('2023-01-02T12:00:00Z'), value: 15},
			{date: new Date('2023-01-04T00:00:00Z'), value: 20},
		]
		const props = ref({
			data,
			width: 103,
			height: 97,
			marginTop: 7,
			marginBottom: 11,
			marginLeft: 13,
			marginRight: 5,
		})

		const {pathD} = useLineChart(props)

		expect(pathD.value).toContain('M')
		expect(pathD.value).not.toMatch(/\d+\.\d{3,}/)
	})

	it('handles empty data gracefully', () => {
		const props = ref({
			data: [],
			width: 100,
			height: 100,
			marginTop: 0,
			marginBottom: 0,
			marginLeft: 0,
			marginRight: 0,
		})

		const {pathD} = useLineChart(props)
		expect(pathD.value).toBe('')
	})
})
