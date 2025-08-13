import { App, Editor, MarkdownView } from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import type { SkinSetting } from '../ui/settings-tab'

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
