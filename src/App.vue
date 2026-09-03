<script setup lang="ts">
import {RouterView} from 'vue-router'
</script>

<template>
	<RouterView />
</template>

<style>
:root {
	--font-family-system:
		BlinkMacSystemFont, -apple-system, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
		'Helvetica Neue', sans-serif;
	--font-family-monospace: 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
path {
	mix-blend-mode: multiply;
}
#app {
	font-family: var(--font-family-system);
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}
</style>
