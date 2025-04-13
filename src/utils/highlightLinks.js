/**
 *
 * @param {Object} d - node/label datum of the currently hovered node.
 * @param {Boolean | String} falseCase - The value to return if the condition is false.
 * @param {Boolean} isHovered - Whether a node is hovered or not.
 * @param {String} labelHoverId - The id of the node that is hovered.
 * @param {Array} source - All (upstream) sources of the node that is hovered.
 * @param {Array} target - All (downstream) targets of the node that is hovered.
 * @param {Boolean | String} trueCase - The value to return if the condition is true.
 * @param {Set} [collapsedNodes] - Set of collapsed node IDs.
 * @returns {Boolean | String}
 *
 */

function highlightLinks({
	d,
	falseCase,
	isHovered,
	labelHoverId,
	source,
	target,
	trueCase,
	collapsedNodes = new Set(),
}) {
	if (isHovered) {
		// Direct connection to hovered node
		if (d.source.id === labelHoverId || d.target.id === labelHoverId) {
			return trueCase
		}

		// Only highlight downstream links if the hovered node isn't collapsed
		if (!collapsedNodes.has(labelHoverId)) {
			for (const id of target.value) {
				if (id === d.source.id) {
					return trueCase
				}
			}
		}

		// Only highlight upstream links
		for (const id of source.value) {
			if (id === d.target.id) {
				return trueCase
			}
		}
	}

	return falseCase
}

export default highlightLinks
