<script setup lang="ts">
import {computed} from 'vue'
import type {SceneLabel} from '@/composables/useSankeyCanvasScene'

const props = defineProps<{
	label: SceneLabel
	/** Overlay mode: position with percentages of the frame */
	positioned?: boolean
	/** HTML-in-Canvas mode: mark the element drawable for ctx.drawElementImage */
	drawable?: boolean
}>()

const emit = defineEmits<{enter: [id: string]; leave: [id: string]}>()

// Overlay positions come from the scene as percentages of the frame; the
// transform applies the SVG's text-anchor (end-anchored text ends at the node)
const positionStyle = computed(() => {
	if (!props.positioned) return undefined
	return {
		left: `${props.label.fx * 100}%`,
		top: `${props.label.fy * 100}%`,
		transform: props.label.anchor === 'end' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
	}
})
</script>

<template>
	<div
		class="sc-label"
		:class="`sc-label--${label.state}`"
		:drawable="drawable || undefined"
		:style="positionStyle"
		tabindex="0"
		@blur="emit('leave', label.id)"
		@focus="emit('enter', label.id)"
		@pointerenter="emit('enter', label.id)"
		@pointerleave="emit('leave', label.id)"
	>{{ label.text }}</div>
</template>

<style scoped>
/*
 * Mirrors Labels.vue: 12px monospace, black fill, and the 6px white halo. The
 * SVG paints the halo as a 6px stroke under the glyphs (paint-order: stroke);
 * -webkit-text-stroke with paint-order reproduces it on HTML text. The state
 * classes intentionally have no styles of their own — the reference hover DOM
 * diff shows the SVG changes nothing visually on labels.
 */
.sc-label {
	color: #000;
	cursor: default;
	font-family: var(--font-family-monospace);
	font-size: 12px;
	font-weight: 400;
	line-height: 1;
	paint-order: stroke fill;
	white-space: nowrap;
	width: max-content;
	-webkit-text-stroke: 6px #fff;
}
</style>
