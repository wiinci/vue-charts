import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
	plugins: [vue()],
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
		chunkSizeWarningLimit: 500,
	},
	server: {
		https: true,
	},
})
