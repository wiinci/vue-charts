import vue from '@vitejs/plugin-vue'
import {fileURLToPath} from 'url'
import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue({
			script: {
				defineModel: true,
				propsDestructure: true,
			},
		}),
	],
	mode: process.env.NODE_ENV,
	resolve: {
		alias: [
			{
				find: '@',
				replacement: fileURLToPath(new URL('./src', import.meta.url)),
			},
		],
	},
	build: {
		cssMinify: true,
		minify: true,
		reportCompressedSize: true,
		rollupOptions: {
			output: {
				manualChunks: {
					d3: ['d3-array', 'd3-scale', 'd3-selection', 'd3-sankey'],
					charts: [
						'./src/components/LineChart/LineChart.vue',
						'./src/components/Sankey/Sankey.vue',
					],
				},
			},
		},
	},
	optimizeDeps: {
		include: ['d3-sankey', 'd3-selection', 'd3-array'],
	},
})
