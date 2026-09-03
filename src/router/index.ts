import {createRouter, createWebHistory} from 'vue-router'

declare module 'vue-router' {
	interface RouteMeta {
		title?: string
	}
}

export const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: () => import('@/views/HomeView.vue'),
			meta: {title: 'vue-charts'},
		},
		{
			path: '/sankey',
			name: 'sankey',
			component: () => import('@/views/SankeyCanvasView.vue'),
			meta: {title: 'Sankey — vue-charts'},
		},
	],
})

router.afterEach((to) => {
	document.title = to.meta.title ?? 'vue-charts'
})
