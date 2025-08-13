import { type Emoji, type EmojiMartData } from '@emoji-mart/data'

import type { SkinSetting } from '../ui/settings-tab'
import { getEmojiWithSkin } from '../utils'

/**
 * Regular expression for matching emoji shortcodes
 * Matches patterns like :smile:, :thumbs_up:, etc.
 */
export const SHORTCODE_REGEX = /:([a-zA-Z0-9_+-]+):/g

/**
 * Shared emoji map for efficient lookup
 * Populated on first use and cached for subsequent lookups
 */
let emojiMapCache: Record<string, Emoji> | null = null

/**
 * Initialize and cache the emoji map from emoji-mart data
 * @returns Promise that resolves to the emoji map
 */
export async function getEmojiMap(): Promise<Record<string, Emoji>> {
	if (emojiMapCache) {
		return emojiMapCache
	}

	try {
		// Import emoji data
		const emojiData = await import('@emoji-mart/data')
		const data = emojiData as EmojiMartData

		if (!data || !data.emojis) {
			throw new Error('Invalid emoji data')
		}

		// Create emoji map
		emojiMapCache = {}
		Object.entries(data.emojis).forEach(([id, emoji]) => {
			emojiMapCache![id] = emoji
		})

		return emojiMapCache
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to initialize emoji map:', error)
		}
		throw error
	}
}

/**
 * Clear the emoji map cache (useful for cleanup)
 */
export function clearEmojiMapCache(): void {
	emojiMapCache = null
}

/**
 * Resolve an emoji ID to its character representation with skin tone applied
 * @param emojiId - The emoji ID (e.g., 'smile', 'thumbs_up')
 * @param skinTone - The skin tone setting (0-5)
 * @returns The emoji character or null if not found
 */
export async function resolveEmojiCharacter(
	emojiId: string,
	skinTone: SkinSetting
): Promise<string | null> {
	try {
		const emojiMap = await getEmojiMap()
		const emojiData = emojiMap[emojiId] || emojiMap[emojiId.toLowerCase()]

		if (emojiData && emojiData.skins && emojiData.skins[0]) {
			// Convert to Emoji type for getEmojiWithSkin
			const emojiObj = {
				id: emojiData.id,
				name: emojiData.name,
				skins: emojiData.skins,
			} as Emoji

			// Apply skin tone
			return getEmojiWithSkin(emojiObj, skinTone)
		}

		return null
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to resolve emoji character:', emojiId, error)
		}
		return null
	}
}

/**
 * Enhanced boundary detection utility
 * Checks if a text node should be excluded from emoji processing
 * @param node - The text node to check
 * @returns true if the node should be skipped
 */
export function shouldSkipNode(node: Node): boolean {
	const parent = node.parentElement
	if (!parent) return true

	// Check if node is within code, pre, or math boundaries
	if (
		parent.closest(
			'code, pre, .cm-inline-code, .math, .cm-formatting, .HyperMD-codeblock, .cm-math, .katex'
		)
	) {
		return true
	}

	// Additional check for inline code patterns in the text content
	const nodeText = node.nodeValue || ''
	const fullParentText = parent.textContent || ''
	const nodeIndex = fullParentText.indexOf(nodeText)

	if (nodeIndex !== -1) {
		const beforeText = fullParentText.substring(0, nodeIndex)
		const afterText = fullParentText.substring(nodeIndex + nodeText.length)

		// Check for inline code patterns: `...text...`
		const openBackticks = (beforeText.match(/`/g) || []).length
		const closeBackticks = (afterText.match(/`/g) || []).length
		if (openBackticks % 2 === 1 && closeBackticks > 0) {
			return true
		}

		// Check for inline math patterns: $...text...$
		const openMath = (beforeText.match(/\$/g) || []).length
		const closeMath = (afterText.match(/\$/g) || []).length
		if (openMath % 2 === 1 && closeMath > 0) {
			return true
		}
	}

	return false
}

/**
 * Enhanced boundary detection for CodeMirror line-based checking
 * @param lineText - The text of the line to check
 * @returns true if the line should be skipped
 */
export function shouldSkipLine(lineText: string): boolean {
	return !!(
		// Code block indicators
		(
			lineText.match(/^(\t| {4})/) || // Indented code
			lineText.includes('```') || // Fenced code block
			lineText.trim().startsWith('```') || // Code fence start/end
			// Math block indicators
			lineText.includes('$$') || // Math block delimiter
			lineText.includes('\\[') || // LaTeX block start
			lineText.includes('\\]') || // LaTeX block end
			// Inline code/math patterns
			lineText.match(/`[^`]*:[^`]*`/) || // Shortcode inside backticks
			lineText.match(/\$[^$]*:[^$]*\$/) // Shortcode inside math delimiters
		)
	)
}
