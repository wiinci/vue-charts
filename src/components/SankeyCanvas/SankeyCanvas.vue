<script setup lang="ts">
	import {
		computed,
		inject,
		onBeforeUnmount,
		onMounted,
		ref,
		shallowRef,
		watch,
	} from 'vue'
	import type {ComponentPublicInstance, Ref} from 'vue'
	import {constants} from '@/assets/constants'
	import {
		createLinkSweep,
		getLabelEnterDelay,
		getLinkEnterDelay,
		getLinkExitDelay,
		LABEL_EXIT_DELAY,
		LABEL_INITIAL_OPACITY,
		sweepFinished,
		sweepProgress,
		type LinkSweep,
		type TimedSweep,
	} from '@/composables/sankeyCanvasAnimation'
	import {useHtmlInCanvas} from '@/composables/useHtmlInCanvas'
	import type {
		SankeyCanvasScene,
		SceneLabel,
		SceneLink,
	} from '@/composables/useSankeyCanvasScene'
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

	// The SVG consumers inject with a `true` default (Links.vue:45, Labels.vue:20);
	// the route's view provides the SVG's own gate — a ref that flips after
	// requestIdleCallback + a double rAF, so the first paint races it (spec V17).
	const animationsEnabled = inject<Ref<boolean>>('animationsEnabled', ref(true))

	const {scene, setHovered, clearHovered, toggleCollapse} =
		useSankeyCanvasScene(props)

	const handleLabelClick = (id: string) => {
		// The SVG's useCollapsed.toggleCollapse: hide the subtree post-layout — no
		// relayout, the vacated space stays empty, no marker is added (spec V16)
		toggleCollapse?.(id)
	}

	// Mode is decided once at setup and never re-evaluated; the footnote states it
	const mode = useHtmlInCanvas().value.supported ? 'html-in-canvas' : 'overlay'

	const modeNote =
		mode === 'html-in-canvas'
			? 'Rendered with HTML-in-Canvas: labels are HTML elements drawn into the canvas with drawElementImage().'
			: 'HTML-in-Canvas is not available in this browser; labels are HTML positioned over the canvas. To exercise the API: Chrome Canary or Brave → chrome://flags/#canvas-draw-element → Enabled → relaunch.'

	const canvasRef = ref<HTMLCanvasElement | null>(null)
	const frameRef = ref<HTMLDivElement | null>(null)
	const labelEls = new Map<string, HTMLElement>()

	const registerLabel = (
		id: string,
		el: Element | ComponentPublicInstance | null,
	) => {
		// Function refs on components receive the instance, not its root element
		const node =
			el instanceof HTMLElement
				? el
				: ((el as unknown as ComponentPublicInstance | null)
						?.$el as HTMLElement | null)
		if (node) {
			labelEls.set(id, node)
		} else {
			labelEls.delete(id)
		}
	}

	// ---- Enter/exit coordination: the SVG's D3 join, replayed by repainting ----
	// The SVG animates through keyed joins in Links.vue/Labels.vue gated by
	// animationsEnabled. The canvas executor tracks the same lifecycle between
	// scene updates and repaints with a progress value in a rAF loop; the delay
	// curves, duration, easing and path interpolation are the SVG's own
	// (see sankeyCanvasAnimation.ts).

	interface KnownLink {
		finalPath: string
		initialPath: string
		depth: number
		emphasized: boolean
	}

	/** Geometry of every link key ever drawn — the sweep material for enter/exit */
	const knownLinks = new Map<string, KnownLink>()
	/** Link keys currently on screen (settled or mid-entrance) */
	const drawnLinkKeys = new Set<string>()
	/** Enter sweeps: from the flat source line to the final curve (Links.vue's enter selection) */
	const enteringLinks = new Map<string, LinkSweep>()
	/** Exit sweeps: back to the flat source line, reverse-staggered by depth (Links.vue's exit selection) */
	const exitingLinks = new Map<
		string,
		{sweep: LinkSweep; emphasized: boolean}
	>()

	/** Label ids currently on screen */
	const drawnLabelIds = new Set<string>()
	/** Entering labels fade 1e-9 → 1, staggered by depth (Labels.vue's enter selection) */
	const enteringLabels = new Map<string, LabelFade>()
	/** Last applied opacity per label id — the `from` value for a mid-flight exit */
	const labelOpacities = new Map<string, number>()
	/**
	 * Exiting labels stay mounted until their fade completes (Labels.vue's exit
	 * transition removes the element only after opacity reaches 0). Vue unmounts
	 * scene labels the moment the scene drops them, so the template renders the
	 * scene plus whatever is still fading out.
	 */
	const exitingLabels = shallowRef<
		Array<{label: SceneLabel; sweep: TimedSweep; from: number}>
	>([])
	const renderedLabels = computed(() => [
		...scene.value.labels,
		...exitingLabels.value.map(exit => exit.label),
	])

	interface LabelFade extends TimedSweep {
		/** Opacity the fade starts from (1e-9 on a fresh enter, mid-fade on a cancelled exit) */
		from: number
	}

	// performance.now — the same time base d3-timer runs the SVG's transitions on
	const clock = (): number => performance.now()

	/** The path painted for `key` right now, if it is mid-sweep (else null — settled) */
	function currentLinkPath(key: string, now: number): string | null {
		const enter = enteringLinks.get(key)
		if (enter) return enter.interpolate(sweepProgress(enter, now))
		const exit = exitingLinks.get(key)
		if (exit) return exit.sweep.interpolate(sweepProgress(exit.sweep, now))
		return null
	}

	/**
	 * Diff the drawn set against a new scene — the canvas analogue of the SVG's
	 * keyed join. Enters sweep, exits sweep back, re-entrances cancel their exit.
	 */
	function onSceneChanged(
		next: SankeyCanvasScene,
		previous?: SankeyCanvasScene,
	): void {
		const now = clock()
		const animated = animationsEnabled.value

		// Links
		const maxDepth = next.links.reduce(
			(max, link) => Math.max(max, link.depth),
			0,
		)
		const sceneKeys = new Set(next.links.map(link => link.key))
		for (const link of next.links) {
			knownLinks.set(link.key, {
				finalPath: link.path,
				initialPath: link.initialPath,
				depth: link.depth,
				emphasized: link.emphasized,
			})
			const exit = exitingLinks.get(link.key)
			if (exit) {
				// Back in the scene before the exit finished — Links.vue's update
				// selection transitions the path back to the final curve, no delay
				exitingLinks.delete(link.key)
				drawnLinkKeys.add(link.key)
				if (animated) {
					const from = exit.sweep.interpolate(sweepProgress(exit.sweep, now))
					enteringLinks.set(link.key, createLinkSweep(from, link.path, 0, now))
				}
				continue
			}
			if (drawnLinkKeys.has(link.key)) continue
			drawnLinkKeys.add(link.key)
			// New key: the enter selection. Without animation the link renders
			// settled immediately (Links.vue joins with animationsEnabled false).
			if (animated) {
				enteringLinks.set(
					link.key,
					createLinkSweep(
						link.initialPath,
						link.path,
						getLinkEnterDelay(link.depth),
						now,
					),
				)
			}
		}
		for (const key of Array.from(drawnLinkKeys)) {
			if (sceneKeys.has(key)) continue
			// Gone from the scene: the exit selection — sweep back to the flat
			// source line, delayed (maxDepth - depth) × fast (Links.vue:137-141)
			drawnLinkKeys.delete(key)
			enteringLinks.delete(key)
			const known = knownLinks.get(key)
			if (!animated || !known) continue
			exitingLinks.set(key, {
				sweep: createLinkSweep(
					currentLinkPath(key, now) ?? known.finalPath,
					known.initialPath,
					getLinkExitDelay(known.depth, maxDepth),
					now,
				),
				emphasized: known.emphasized,
			})
		}

		// Labels
		const sceneLabelIds = new Set(next.labels.map(label => label.id))
		for (const label of next.labels) {
			const wasExiting = exitingLabels.value.some(
				exit => exit.label.id === label.id,
			)
			if (wasExiting) {
				exitingLabels.value = exitingLabels.value.filter(
					exit => exit.label.id !== label.id,
				)
			}
			if (drawnLabelIds.has(label.id)) continue
			drawnLabelIds.add(label.id)
			if (animated) {
				const from = wasExiting
					? (labelOpacities.get(label.id) ?? 1)
					: LABEL_INITIAL_OPACITY
				enteringLabels.set(label.id, {
					start: now,
					delay: getLabelEnterDelay(label.depth),
					from,
				})
				// The SVG's enter selection applies opacity synchronously — never a
				// frame at full opacity before the first fade tick
				const el = labelEls.get(label.id)
				if (el) {
					el.style.opacity = String(from)
					labelOpacities.set(label.id, from)
				}
			}
		}
		const previousLabels = new Map(
			(previous?.labels ?? []).map(label => [label.id, label]),
		)
		for (const id of Array.from(drawnLabelIds)) {
			if (sceneLabelIds.has(id)) continue
			// Gone from the scene: fade straight out, no delay (Labels.vue:74-81)
			drawnLabelIds.delete(id)
			enteringLabels.delete(id)
			const label = previousLabels.get(id)
			if (!animated || !label) continue
			exitingLabels.value.push({
				label,
				sweep: {start: now, delay: LABEL_EXIT_DELAY},
				from: labelOpacities.get(id) ?? 1,
			})
		}
	}

	/** Advance label fades and link sweeps to `now`; returns true while anything is still animating */
	function advanceFrame(now: number): boolean {
		for (const [key, sweep] of Array.from(enteringLinks)) {
			if (sweepFinished(sweep, now)) enteringLinks.delete(key)
		}
		for (const [key, exit] of Array.from(exitingLinks)) {
			if (sweepFinished(exit.sweep, now)) exitingLinks.delete(key)
		}
		for (const [id, fade] of Array.from(enteringLabels)) {
			const el = labelEls.get(id)
			if (el) {
				const done = sweepFinished(fade, now)
				const opacity = done
					? 1
					: fade.from + (1 - fade.from) * sweepProgress(fade, now)
				el.style.opacity = String(opacity)
				labelOpacities.set(id, opacity)
			}
			if (sweepFinished(fade, now)) enteringLabels.delete(id)
		}
		for (const exit of Array.from(exitingLabels.value)) {
			const el = labelEls.get(exit.label.id)
			const opacity = exit.from * (1 - sweepProgress(exit.sweep, now))
			if (el) {
				el.style.opacity = String(opacity)
				labelOpacities.set(exit.label.id, opacity)
			}
			if (sweepFinished(exit.sweep, now)) {
				exitingLabels.value = exitingLabels.value.filter(
					record => record.label.id !== exit.label.id,
				)
			}
		}
		return (
			enteringLinks.size > 0 ||
			exitingLinks.size > 0 ||
			enteringLabels.size > 0 ||
			exitingLabels.value.length > 0
		)
	}

	let animRafId: number | null = null

	function animationTick(): void {
		animRafId = null
		const stillAnimating = advanceFrame(clock())
		repaint()
		if (stillAnimating) animRafId = requestAnimationFrame(animationTick)
	}

	function ensureAnimationLoop(): void {
		const animating =
			enteringLinks.size > 0 ||
			exitingLinks.size > 0 ||
			enteringLabels.size > 0 ||
			exitingLabels.value.length > 0
		if (animating && animRafId === null) {
			animRafId = requestAnimationFrame(animationTick)
		}
	}

	/** Repaint from the animation loop — requestPaint in HTML-in-Canvas mode, direct paint otherwise */
	function repaint(): void {
		if (mode === 'html-in-canvas') {
			canvasRef.value?.requestPaint()
			return
		}
		paint()
	}

	// Design-size defaults; the ResizeObserver replaces them with the real canvas box
	const size = shallowRef({
		cssWidth: props.width,
		cssHeight: props.height,
		bitmapWidth: props.width,
		bitmapHeight: props.height,
	})

	/** Layout units → CSS px */
	const cssScale = computed(() => size.value.cssWidth / scene.value.width)
	/** Canvas grid px per CSS px */
	const devicePixelScale = computed(
		() => size.value.bitmapWidth / size.value.cssWidth,
	)

	/**
	 * The SVG scales its 12px labels with the viewBox, so they shrink with the
	 * chart; HTML labels have to be told to. Labels stay in CSS pixels in both
	 * modes — the canvas grid resolves their snapshot, it does not resize them.
	 */
	const labelScale = cssScale

	const frameStyle = computed(() => ({'--sc-scale': String(labelScale.value)}))

	// Firefox and Safari have no devicePixelContentBoxSize yet; observing the
	// unknown box would throw, so ask for it only where it exists
	const observerOptions: ResizeObserverOptions =
		typeof ResizeObserverEntry !== 'undefined' &&
		'devicePixelContentBoxSize' in ResizeObserverEntry.prototype
			? {box: 'device-pixel-content-box'}
			: {}

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

		const {cssWidth, cssHeight, bitmapWidth, bitmapHeight} = size.value
		const scale = cssScale.value // layout units → CSS px
		const dpr = devicePixelScale.value
		const now = clock()

		// Keep the bitmap at the frame's device-pixel box (spec A1)
		if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
			canvas.width = bitmapWidth
			canvas.height = bitmapHeight
		}

		ctx.setTransform(dpr, 0, 0, bitmapHeight / cssHeight, 0, 0)
		ctx.clearRect(0, 0, cssWidth, cssHeight)

		// Links: hairlines in layout space; multiply darkens crossings like the
		// SVG's path { mix-blend-mode: multiply }. The scene pre-sorts emphasized
		// links last so they sit on top as raised SVG paths do.
		ctx.save()
		ctx.scale(scale, scale)
		ctx.globalCompositeOperation = 'multiply'
		for (const link of scene.value.links) {
			ctx.strokeStyle = link.emphasized
				? constants.linkColorHighlight
				: constants.linkColor
			ctx.lineWidth = (link.emphasized ? 1.2 : 1) / scale
			// Mid-sweep links paint their interpolated path; settled links the cached final one
			const animatedPath = currentLinkPath(link.key, now)
			ctx.stroke(animatedPath ? new Path2D(animatedPath) : pathFor(link))
		}
		// Exiting links still sweep back toward their source line until removed
		for (const [, exit] of exitingLinks) {
			ctx.strokeStyle = exit.emphasized
				? constants.linkColorHighlight
				: constants.linkColor
			ctx.lineWidth = (exit.emphasized ? 1.2 : 1) / scale
			ctx.stroke(
				new Path2D(exit.sweep.interpolate(sweepProgress(exit.sweep, now))),
			)
		}
		ctx.restore()

		// Labels are drawn into the bitmap only in HTML-in-Canvas mode; the overlay
		// positions the same elements with CSS.
		if (mode !== 'html-in-canvas') return

		// Labels are snapshotted at device resolution, so the identity transform
		// already draws them at their CSS size; scaling the context here would
		// magnify every glyph by the device pixel ratio. Their box is in CSS
		// pixels, so it takes a dpr to reach the grid coordinates below.
		ctx.setTransform(1, 0, 0, 1, 0, 0)
		for (const label of renderedLabels.value) {
			const el = labelEls.get(label.id)
			if (!el) continue
			const x =
				(label.x * scale - (label.anchor === 'end' ? el.offsetWidth : 0)) * dpr
			const y = (label.y * scale - el.offsetHeight / 2) * dpr
			try {
				const transform = ctx.drawElementImage(el, x, y) // also records hit-test/a11y geometry
				// Park the live element over its painted pixels so pointer hits,
				// focus and find-in-page land on the glyphs the user sees
				if (transform) el.style.transform = transform.toString()
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

	watch(scene, (next, previous) => {
		onSceneChanged(next, previous)
		schedulePaint()
		ensureAnimationLoop()
	})

	onMounted(() => {
		if (mode === 'html-in-canvas') {
			canvasRef.value?.addEventListener('paint', paint)
		}
		if (canvasRef.value) {
			resizeObserver = new ResizeObserver(entries => {
				const entry = entries[entries.length - 1]
				const {width, height} = entry.contentRect
				// Ignore degenerate observations (hidden frames, no-layout environments)
				if (width <= 0 || height <= 0) return
				// The device pixel content box is the exact bitmap the compositor will
				// show; devicePixelRatio rounding leaves half-pixel blur behind
				const devicePixelBox = entry.devicePixelContentBoxSize?.[0]
				const ratio = window.devicePixelRatio || 1
				size.value = {
					cssWidth: width,
					cssHeight: height,
					bitmapWidth: devicePixelBox?.inlineSize ?? Math.round(width * ratio),
					bitmapHeight: devicePixelBox?.blockSize ?? Math.round(height * ratio),
				}
				schedulePaint()
			})
			resizeObserver.observe(canvasRef.value, observerOptions)
		}
		// First scene observation is the mount-time join: when the async mount
		// lost the race to the animation gate (spec V17's animated outcome) the
		// whole first paint sweeps in; otherwise it settles instantly.
		onSceneChanged(scene.value)
		schedulePaint()
		ensureAnimationLoop()
	})

	onBeforeUnmount(() => {
		resizeObserver?.disconnect()
		resizeObserver = null
		if (mode === 'html-in-canvas') {
			canvasRef.value?.removeEventListener('paint', paint)
		}
		if (rafId) cancelAnimationFrame(rafId)
		if (animRafId !== null) cancelAnimationFrame(animRafId)
		rafId = 0
		animRafId = null
	})
</script>

<template>
	<figure
		class="sc"
		:data-mode="mode"
	>
		<div
			ref="frameRef"
			class="sc-frame"
			role="group"
			:style="frameStyle"
			:aria-label="`Dependency graph: ${scene.labels.length} nodes, ${scene.links.length} links`"
		>
			<canvas
				ref="canvasRef"
				class="sc-canvas"
				:layoutsubtree="mode === 'html-in-canvas' ? '' : undefined"
			>
				<template v-if="mode === 'html-in-canvas'">
					<SankeyCanvasLabel
						v-for="label in renderedLabels"
						:key="label.id"
						:ref="el => registerLabel(label.id, el)"
						:label="label"
						drawable
						@click="handleLabelClick"
						@enter="setHovered"
						@leave="clearHovered"
					/>
				</template>
			</canvas>
			<div
				v-if="mode === 'overlay'"
				class="sc-overlay"
			>
				<SankeyCanvasLabel
					v-for="label in renderedLabels"
					:key="label.id"
					:ref="el => registerLabel(label.id, el)"
					:label="label"
					positioned
					@click="handleLabelClick"
					@enter="setHovered"
					@leave="clearHovered"
				/>
			</div>
			<p
				v-if="scene.links.length === 0"
				class="sc-empty"
			>
				No dependencies to draw.
			</p>
		</div>
		<figcaption class="sc-caption">
			<span
				>{{ scene.labels.length }} nodes ·
				{{ scene.links.length }} dependencies</span
			>
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
		position: absolute;
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
