import App from '@/App.vue'
import {flushPromises, mount} from '@vue/test-utils'
import {describe, expect, it} from 'vitest'
import {router} from '../index'

// Everything on the home page arrives asynchronously: HomeView is a lazy route,
// Sankey and LineChart are defineAsyncComponent children of a Suspense, and
// LineChart only mounts after the page's idle callback (a 1ms timeout in
// happy-dom, which has no requestIdleCallback). Poll instead of guessing ticks.
async function waitFor(condition: () => boolean, attempts = 200): Promise<void> {
	for (let attempt = 0; attempt < attempts; attempt++) {
		if (condition()) return
		await new Promise((resolve) => setTimeout(resolve, 10))
		await flushPromises()
	}
}

describe('router', () => {
	it('resolves / to the home route', () => {
		expect(router.resolve('/').name).toBe('home')
	})

	it("renders today's page (Sankey and LineChart) at /", async () => {
		await router.push('/')
		await router.isReady()

		expect(document.title).toBe('vue-charts')

		// attachTo: d3-transition resolves a transition by walking up to <html>, as in the real app
		const wrapper = mount(App, {attachTo: document.body, global: {plugins: [router]}})
		await waitFor(() => wrapper.findAll('.chart').length === 2)

		// Two Chart.vue frames, two <svg> roots: one per chart
		expect(wrapper.findAll('.chart')).toHaveLength(2)
		expect(wrapper.findAll('svg')).toHaveLength(2)
		expect(wrapper.text()).not.toContain('Loading')

		// The Sankey rendered edges2.json: 49 node rects, 41 link paths
		expect(wrapper.findAll('rect.sankey-node')).toHaveLength(49)
		expect(wrapper.findAll('g.links path')).toHaveLength(41)

		// The LineChart rendered its gradient-stroked line (Line.vue)
		const lineChartStrokes = wrapper
			.findAll('.chart')[1]
			.findAll('path')
			.map((path) => path.attributes('stroke'))
		expect(lineChartStrokes).toContain('url(#line-gradient)')

		wrapper.unmount()
	})
	it('resolves /sankey to the sankey route', () => {
		expect(router.resolve('/sankey').name).toBe('sankey')
	})

	it('renders the canvas Sankey alone at /sankey', async () => {
		await router.push('/sankey')
		await router.isReady()

		expect(document.title).toBe('Sankey — vue-charts')

		const wrapper = mount(App, {attachTo: document.body, global: {plugins: [router]}})
		await waitFor(() => wrapper.findAll('.sc-frame').length === 1)

		// One frame drawn by the route — no Chart.vue SVG shell, no LineChart
		expect(wrapper.findAll('.sc-frame')).toHaveLength(1)
		expect(wrapper.findAll('svg')).toHaveLength(0)

		// happy-dom has no HTML-in-Canvas API: the overlay carries the labels
		expect(wrapper.findAll('.sc-overlay .sc-label')).toHaveLength(49)
		expect(wrapper.find('.sc-caption').text()).toContain('49 nodes · 41 dependencies')

		wrapper.unmount()
	})
})