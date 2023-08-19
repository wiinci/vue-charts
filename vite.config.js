import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue({
			reactivityTransform: true,
		}),
	],
	mode: process.env.NODE_ENV,
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: {
		cssMinify: true,
		minify: true,
		reportCompressedSize: true,
		chunkSizeWarningLimit: 500,
	},
	server: {
		https: true,
	},
})
