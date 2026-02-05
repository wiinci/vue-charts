/// <reference types="vite/client" />

// Type declarations for CSV imports
declare module '*.csv?raw' {
	const content: string
	export default content
}

declare module '*.csv' {
	const content: string
	export default content
}

// JSON imports
declare module '*.json' {
	const content: any
	export default content
}

// Vue file types
declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
}

// Vite environment variables
interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
