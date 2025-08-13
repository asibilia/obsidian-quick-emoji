import {
	SHORTCODE_REGEX,
	resolveEmojiCharacter,
	shouldSkipNode,
} from './emoji-renderer'

import type QuickEmojiPlugin from '../main'

/**
 * Emoji Markdown Post-Processor
 * Handles rendering of emoji shortcodes in Reading Mode
 */
export class EmojiMarkdownProcessor {
	constructor(private plugin: QuickEmojiPlugin) {}

	/**
	 * Create the markdown post-processor function
	 * @returns The post-processor function for Obsidian
	 */
	createProcessor() {
		return async (el: HTMLElement) => {
			// Enhanced boundary detection - skip code/pre/math elements
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
				acceptNode: (node) => {
					// Use shared boundary detection logic
					if (shouldSkipNode(node)) {
						return NodeFilter.FILTER_REJECT
					}

					// Check if node contains potential shortcodes
					const nodeText = node.nodeValue || ''
					const hasShortcode = nodeText.includes(':')
					return hasShortcode
						? NodeFilter.FILTER_ACCEPT
						: NodeFilter.FILTER_REJECT
				},
			})

			const textNodes: Text[] = []
			let current: Node | null
			while ((current = walker.nextNode())) {
				textNodes.push(current as Text)
			}

			// Process each text node for emoji shortcodes
			for (const textNode of textNodes) {
				await this.processTextNode(textNode)
			}
		}
	}

	/**
	 * Process a single text node for emoji shortcodes
	 * @param textNode - The text node to process
	 */
	private async processTextNode(textNode: Text): Promise<void> {
		const original = textNode.nodeValue || ''

		// Reset regex lastIndex since we use 'g' flag
		SHORTCODE_REGEX.lastIndex = 0
		if (!SHORTCODE_REGEX.test(original)) return

		// Reset again for the actual replacement
		SHORTCODE_REGEX.lastIndex = 0

		const frag = document.createDocumentFragment()
		let lastIndex = 0

		// Process each shortcode match
		const promises: Promise<void>[] = []
		const replacements: Array<{
			offset: number
			length: number
			element: HTMLElement | string
		}> = []

		original.replace(
			SHORTCODE_REGEX,
			(match, p1: string, offset: number) => {
				const emojiId = String(p1)

				// Create promise for emoji resolution
				const promise = this.resolveEmojiElement(emojiId).then(
					(element) => {
						replacements.push({
							offset,
							length: match.length,
							element: element || match, // Fallback to original text if resolution fails
						})
					}
				)

				promises.push(promise)
				return match
			}
		)

		// Wait for all emoji resolutions to complete
		await Promise.all(promises)

		// Sort replacements by offset to process in order
		replacements.sort((a, b) => a.offset - b.offset)

		// Build the document fragment with resolved emojis
		for (const replacement of replacements) {
			// Append text before the replacement
			if (replacement.offset > lastIndex) {
				frag.append(original.slice(lastIndex, replacement.offset))
			}

			// Append the resolved emoji element or fallback text
			if (typeof replacement.element === 'string') {
				frag.append(replacement.element)
			} else {
				frag.append(replacement.element)
			}

			lastIndex = replacement.offset + replacement.length
		}

		// Append remaining text
		if (lastIndex < original.length) {
			frag.append(original.slice(lastIndex))
		}

		// Replace the original text node
		textNode.replaceWith(frag)
	}

	/**
	 * Resolve an emoji ID to a DOM element
	 * @param emojiId - The emoji ID to resolve
	 * @returns Promise that resolves to an HTML element or null
	 */
	private async resolveEmojiElement(
		emojiId: string
	): Promise<HTMLElement | null> {
		try {
			const emojiChar = await resolveEmojiCharacter(
				emojiId,
				this.plugin.settings.skin
			)

			if (emojiChar) {
				const span = document.createElement('span')
				span.className = 'qe-emoji'
				span.textContent = emojiChar
				return span
			}

			return null
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error(
					'Failed to resolve emoji element:',
					emojiId,
					error
				)
			}
			return null
		}
	}
}
