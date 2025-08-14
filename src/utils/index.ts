import { App, Editor, MarkdownView } from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import type { SkinSetting, InsertionFormat } from '../ui/settings-tab'

/**
 * Helper function to get the currently active editor in Obsidian.
 * @param app - The Obsidian App instance
 * @returns The active Editor instance or null if none is active
 */
export function getActiveEditor(app: App): Editor | null {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView)
	return activeView?.editor || null
}

/**
 * Helper function to get emoji with the correct skin tone applied.
 * @param emojiItem - The emoji object from emoji-mart
 * @param skinTone - The selected skin tone (0-5)
 * @returns The emoji character with the appropriate skin tone
 */
export function getEmojiWithSkin(
	emojiItem: Emoji,
	skinTone: SkinSetting
): string {
	if (!emojiItem) return ''

	// If default skin tone is selected OR emoji doesn't support skin tones, use native emoji
	if (skinTone === 0 || !emojiItem.skins || emojiItem.skins.length <= 1) {
		return emojiItem.skins?.[0]?.native ?? emojiItem.name
	}

	// Get skin tone variant if it exists, otherwise fall back to native emoji
	return (
		emojiItem.skins?.[skinTone]?.native ??
		emojiItem.skins?.[0]?.native ??
		emojiItem.name
	)
}

/**
 * Sanitize a string to be used as a valid emoji shortcode.
 * @param str - The input string to sanitize
 * @returns A sanitized shortcode string
 */
export function sanitizeShortcode(str: string): string {
	return (str || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_+-]/g, '_') // Replace non-allowed characters with underscore
		.replace(/_{2,}/g, '_') // Collapse multiple underscores to single
		.replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
		.slice(0, 50) // Limit length to prevent overly long shortcodes
}

/**
 * Centralized function to insert an emoji into the editor based on the selected format.
 * @param editor - The Obsidian Editor instance
 * @param emoji - The emoji object from emoji-mart
 * @param format - The insertion format ('unicode' or 'shortcode')
 * @param skinTone - The skin tone setting (0-5)
 * @param context - Optional context for suggestion replacement (with start/end positions)
 */
export function insertEmoji(
	editor: Editor,
	emoji: Emoji,
	format: InsertionFormat,
	skinTone: SkinSetting,
	context?: {
		start: { line: number; ch: number }
		end: { line: number; ch: number }
	}
): void {
	if (!editor || !emoji) return

	let textToInsert: string

	if (format === 'unicode') {
		// Use Unicode format with skin tone applied
		textToInsert = getEmojiWithSkin(emoji, skinTone)
	} else {
		// Use shortcode format
		const shortcode = emoji.id
			? sanitizeShortcode(emoji.id)
			: sanitizeShortcode(emoji.name)
		textToInsert = shortcode ? `:${shortcode}:` : ':emoji:' // Final fallback
	}

	// Insert the emoji using the appropriate method
	if (context) {
		// Replace a specific range (used by suggester)
		editor.replaceRange(textToInsert, context.start, context.end)
	} else {
		// Replace current selection (used by recent/favorite clicks)
		editor.replaceSelection(textToInsert)
	}
}
