<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue'
import type {ComponentPublicInstance} from 'vue'
import {constants} from '@/assets/constants'
import {useHtmlInCanvas} from '@/composables/useHtmlInCanvas'
import type {SceneLink} from '@/composables/useSankeyCanvasScene'
import {useSankeyCanvasScene} from '@/composables/useSankeyCanvasScene'
import type {SankeyProps} from '@/composables/useNodesAndLinks'
import SankeyCanvasLabel from './SankeyCanvasLabel.vue'

const props = withDefaults(
	defineProps<{
		data: SankeyProps['data']
		height?: number
		marginLeft?: number
		marginRight?: number
		marginBottom?: number
		marginTop?: number
		nodeAlign?: SankeyProps['nodeAlign']
		nodeId?: SankeyProps['nodeId']
		nodePadding?: SankeyProps['nodePadding']
		nodeWidth?: SankeyProps['nodeWidth']
		sort?: SankeyProps['sort']
		width?: number
	}>(),
	{
		// Same defaults as Sankey.vue — the route passes the home page's values
		height: 480,
		marginLeft: 20,
		marginRight: 20,
		marginBottom: 20,
		marginTop: 20,
		nodeAlign: 'left',
		nodeId: 'id',
		nodePadding: 10,
		nodeWidth: 10,
		sort: false,
		width: 960,
	},
)

const {scene, setHovered, clearHovered} = useSankeyCanvasScene(props)

// Mode is decided once at setup and never re-evaluated; the footnote states it
const mode = useHtmlInCanvas().value.supported ? 'html-in-canvas' : 'overlay'

const modeNote =
	mode === 'html-in-canvas'
		? 'Rendered with HTML-in-Canvas: labels are HTML elements drawn into the canvas with drawElementImage().'
		: 'HTML-in-Canvas is not available in this browser; labels are HTML positioned over the canvas. To exercise the API: Chrome Canary or Brave → chrome://flags/#canvas-draw-element → Enabled → relaunch.'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const frameRef = ref<HTMLDivElement | null>(null)
const labelEls = new Map<string, HTMLElement>()

const registerLabel = (id: string, el: Element | ComponentPublicInstance | null) => {
	// Function refs on components receive the instance, not its root element
	const node =
		el instanceof HTMLElement
			? el
			: ((el as unknown as ComponentPublicInstance | null)?.$el as HTMLElement | null)
	if (node) {
		labelEls.set(id, node)
	} else {
		labelEls.delete(id)
	}
}

// Design-size defaults; the ResizeObserver replaces them with the real canvas box
const size = ref({cssWidth: props.width, cssHeight: props.height, dpr: 1})

let resizeObserver: ResizeObserver | null = null
let rafId = 0

// Path2D per link key, rebuilt when the scene's link list is replaced
let pathCacheSource: SceneLink[] | null = null
const pathCache = new Map<string, Path2D>()

const pathFor = (link: SceneLink): Path2D => {
	if (pathCacheSource !== scene.value.links) {
		pathCache.clear()
		pathCacheSource = scene.value.links
	}
	let path = pathCache.get(link.key)
	if (!path) {
		path = new Path2D(link.path)
		pathCache.set(link.key, path)
	}
	return path
}

function paint() {
	const canvas = canvasRef.value
	const ctx = canvas?.getContext('2d')
	// No 2D context (happy-dom, blocked canvas): labels still render, links don't
	if (!canvas || !ctx || !frameRef.value) return

	const {cssWidth, cssHeight, dpr} = size.value
	const scale = cssWidth / scene.value.width // layout units → CSS px

	// Keep the bitmap at the frame's CSS size × devicePixelRatio (spec A1)
	const bitmapWidth = Math.round(cssWidth * dpr)
	const bitmapHeight = Math.round(cssHeight * dpr)
	if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
		canvas.width = bitmapWidth
		canvas.height = bitmapHeight
	}

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.clearRect(0, 0, cssWidth, cssHeight)

	// Links: hairlines in layout space; multiply darkens crossings like the
	// SVG's path { mix-blend-mode: multiply }. The scene pre-sorts emphasized
	// links last so they sit on top as raised SVG paths do.
	ctx.save()
	ctx.scale(scale, scale)
	ctx.globalCompositeOperation = 'multiply'
	for (const link of scene.value.links) {
		ctx.strokeStyle = link.emphasized ? constants.linkColorHighlight : constants.linkColor
		ctx.lineWidth = (link.emphasized ? 1.2 : 1) / scale
		ctx.stroke(pathFor(link))
	}
	ctx.restore()

	// Labels are drawn into the bitmap only in HTML-in-Canvas mode; the overlay
	// positions the same elements with CSS.
	if (mode !== 'html-in-canvas') return

	for (const label of scene.value.labels) {
		const el = labelEls.get(label.id)
		if (!el) continue
		const x = label.x * scale - (label.anchor === 'end' ? el.offsetWidth : 0)
		const y = label.y * scale - el.offsetHeight / 2
		try {
			ctx.drawElementImage(el, x, y) // also records hit-test/a11y geometry
		} catch {
			// No snapshot yet (first frame) — request one more paint and stop
			canvas.requestPaint()
			return
		}
	}
}

function schedulePaint() {
	if (mode === 'html-in-canvas') {
		// The browser's `paint` event calls paint() during the next rendering opportunity
		canvasRef.value?.requestPaint()
		return
	}
	if (rafId) return
	rafId = requestAnimationFrame(() => {
		rafId = 0
		paint()
	})
}

watch(scene, schedulePaint)

onMounted(() => {
	if (mode === 'html-in-canvas') {
		canvasRef.value?.addEventListener('paint', paint)
	}
	if (canvasRef.value) {
		resizeObserver = new ResizeObserver((entries) => {
			const {width, height} = entries[entries.length - 1].contentRect
			// Ignore degenerate observations (hidden frames, no-layout environments)
			if (width <= 0 || height <= 0) return
			size.value = {cssWidth: width, cssHeight: height, dpr: window.devicePixelRatio || 1}
			schedulePaint()
		})
		resizeObserver.observe(canvasRef.value)
	}
	// First paint — the observer's initial callback is not relied on
	schedulePaint()
})

onBeforeUnmount(() => {
	resizeObserver?.disconnect()
	resizeObserver = null
	if (mode === 'html-in-canvas') {
		canvasRef.value?.removeEventListener('paint', paint)
	}
	if (rafId) cancelAnimationFrame(rafId)
	rafId = 0
})
</script>

<template>
	<figure class="sc" :data-mode="mode">
		<div
			ref="frameRef"
			class="sc-frame"
			role="group"
			:aria-label="`Dependency graph: ${scene.labels.length} nodes, ${scene.links.length} links`"
		>
			<canvas ref="canvasRef" class="sc-canvas" :layoutsubtree="mode === 'html-in-canvas' ? '' : undefined">
				<template v-if="mode === 'html-in-canvas'">
					<SankeyCanvasLabel
						v-for="label in scene.labels"
						:key="label.id"
						:ref="(el) => registerLabel(label.id, el)"
						:label="label"
						drawable
						@enter="setHovered"
						@leave="clearHovered"
					/>
				</template>
			</canvas>
			<div v-if="mode === 'overlay'" class="sc-overlay">
				<SankeyCanvasLabel
					v-for="label in scene.labels"
					:key="label.id"
					:ref="(el) => registerLabel(label.id, el)"
					:label="label"
					positioned
					@enter="setHovered"
					@leave="clearHovered"
				/>
			</div>
			<p v-if="scene.links.length === 0" class="sc-empty">No dependencies to draw.</p>
		</div>
		<figcaption class="sc-caption">
			<span>{{ scene.labels.length }} nodes · {{ scene.links.length }} dependencies</span>
			<span class="sc-mode">{{ modeNote }}</span>
		</figcaption>
	</figure>
</template>

<style scoped>
.sc {
	margin: 0;
}

/* The SVG's Chart.vue frame: 1px border, 960px max width (border adds 2px) */
.sc-frame {
	position: relative;
	border: 1px solid;
	max-width: 960px;
	margin: 0 auto;
}

.sc-canvas {
	display: block;
	width: 100%;
	aspect-ratio: 2 / 1;
}

/* HTML-in-Canvas labels are laid out by the canvas; painting places them */
[data-mode='html-in-canvas'] .sc-label {
	position: absolute;
	left: 0;
	top: 0;
}

.sc-overlay {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.sc-overlay .sc-label {
	pointer-events: auto;
}

.sc-empty {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0;
	font-family: var(--font-family-system);
	font-size: 12px;
}

.sc-caption {
	display: flex;
	gap: 12px;
	justify-content: space-between;
	max-width: 960px;
	margin: 4px auto 0;
	font-family: var(--font-family-system);
	font-size: 12px;
	opacity: 0.6;
}
</style>
