import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownView,
	TFile,
} from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import { getSearchIndex } from './emoji-service'
import type QuickEmojiPlugin from './main'
import type { SkinSetting } from './settings-tab'

// Emoji category definitions
const EMOJI_CATEGORIES = [
	'activity',
	'animals',
	'face',
	'flags',
	'foods',
	'frequent',
	'nature',
	'objects',
	'people',
	'places',
	'symbols',
	'travel',
]

// Helper function to get active editor
function getActiveEditor(app: App): Editor | null {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView)
	return activeView?.editor || null
}

// Helper function to get emoji with correct skin tone
function getEmojiWithSkin(emojiItem: Emoji, skinTone: SkinSetting): string {
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

// Function to trigger an inline emoji search using the lazy-loaded SearchIndex
async function searchEmojis(query: string): Promise<Emoji[]> {
	try {
		const searchIndex = await getSearchIndex()
		if (!searchIndex) {
			// getSearchIndex already shows a Notice to the user on failure
			return []
		}
		const emojis = await searchIndex.search(query)
		return emojis || []
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Failed to search emojis:', error)
		}
		return []
	}
}

export class EmojiSuggester extends EditorSuggest<Emoji> {
	plugin: QuickEmojiPlugin
	private debounceTimer: NodeJS.Timeout | null = null
	private lastSearchPromise: Promise<Emoji[]> | null = null

	constructor(plugin: QuickEmojiPlugin) {
		super(plugin.app)
		this.plugin = plugin
	}

	/**
	 * Clean up resources when the suggester is destroyed.
	 */
	close(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
			this.debounceTimer = null
		}
		this.lastSearchPromise = null
		super.close()
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile
	): EditorSuggestTriggerInfo | null {
		// Check if we're in the middle of a word
		const line = editor.getLine(cursor.line)
		const subString = line.substring(0, cursor.ch)

		// Find the last colon before cursor - match even if it's just a single colon
		const colonMatch = subString.match(/:([\w]*)$/)
		if (!colonMatch) return null

		// Trigger the emoji suggester
		return {
			start: {
				line: cursor.line,
				ch: colonMatch.index || 0,
			},
			end: cursor,
			query: colonMatch[1] || '',
		}
	}

	/**
	 * Performs the actual emoji search without debouncing.
	 * This is the core search logic extracted for reuse.
	 */
	private async performSearch(query: string): Promise<Emoji[]> {
		let results: Emoji[] = []

		// Add recent emojis only if there's no search query
		if (!query && this.plugin.recentEmojis.length > 0) {
			for (const emoji of this.plugin.recentEmojis) {
				results.push(emoji)
			}
		}

		try {
			// Get emoji results - use appropriate search based on query
			let searchResults: Emoji[] = []

			if (query) {
				// If user has typed something, do a specific search
				searchResults = await searchEmojis(query)
			} else {
				// When user has only typed ":", get popular emojis
				const searchIndex = await getSearchIndex()
				if (searchIndex) {
					try {
						const allResults: Emoji[] = []

						// Use Promise.all to fetch all categories in parallel for better performance
						await Promise.all(
							EMOJI_CATEGORIES.map(async (category) => {
								const categoryResults =
									await searchIndex.search(category)
								allResults.push(
									...(categoryResults ?? [])
										// Sort alphabetically
										.sort((a: Emoji, b: Emoji) =>
											a.name.localeCompare(b.name)
										)
								)
							})
						)

						searchResults = allResults
							// Filter duplicate emojis
							.filter(
								(emoji, index, self) =>
									index ===
									self.findIndex((t) => t.name === emoji.name)
							)
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error(error)
						}
						// Fall back to a simpler search
						searchResults = await searchIndex.search('')
					}
				}
			}

			// Add filtered search results to the final results
			results = [...results, ...searchResults]
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Quick Emoji: Error searching emojis:', error)
			}
		}

		return results
	}

	async getSuggestions(context: EditorSuggestContext): Promise<Emoji[]> {
		const query = context.query || ''

		// For empty queries (just ":"), return results immediately to show recent emojis instantly
		if (!query) {
			return this.performSearch(query)
		}

		// For queries with content, use debouncing to prevent excessive search calls
		return new Promise((resolve) => {
			// Clear any existing timer
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer)
			}

			// Set up debounced search with 150ms delay
			this.debounceTimer = setTimeout(async () => {
				try {
					const searchPromise = this.performSearch(query)
					this.lastSearchPromise = searchPromise
					const results = await searchPromise

					// Only resolve if this is still the latest search
					if (this.lastSearchPromise === searchPromise) {
						resolve(results)
					}
				} catch (error) {
					if (process.env.NODE_ENV === 'development') {
						console.error('Quick Emoji: Debounced search error:', error)
					}
					resolve([])
				}
			}, 150)
		})
	}

	renderSuggestion(item: Emoji, el: HTMLElement): void {
		el.empty()

		const suggestionEl = el.createDiv({ cls: 'emoji-suggestion' })

		const lastRecent = this.plugin.recentEmojis.last()?.name
		if (lastRecent === item.name) suggestionEl.addClass('recent')

		// Create emoji icon - use the native emoji directly
		const emojiEl = suggestionEl.createDiv({ cls: 'emoji-icon' })

		// Get emoji with proper skin tone
		const emojiChar = getEmojiWithSkin(item, this.plugin.settings.skin)

		// Set the emoji text
		emojiEl.setText(emojiChar)

		// Create description
		const descEl = suggestionEl.createDiv({ cls: 'emoji-description' })
		descEl.setText(item.name)
	}

	selectSuggestion(item: Emoji, _evt: MouseEvent | KeyboardEvent): void {
		// Get the editor
		const editor = getActiveEditor(this.app)
		if (!editor) return

		// Get emoji with proper skin tone
		const emojiChar = getEmojiWithSkin(item, this.plugin.settings.skin)

		// Save in recents only if we have a valid emoji character (not a shortcode)
		if (emojiChar && !emojiChar.startsWith(':')) {
			this.plugin.saveRecentEmoji(item)
		}

		// Replace the text in the editor
		editor.replaceRange(emojiChar, this.context!.start, this.context!.end)
	}
}
