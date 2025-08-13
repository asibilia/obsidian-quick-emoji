import {
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import type QuickEmojiPlugin from '../main'
import { getSearchIndex } from '../services/emoji-service'
import { getActiveEditor, getEmojiWithSkin } from '../utils'

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

// Regex for checking trailing whitespace (extracted to avoid recompilation)
const TRAILING_WHITESPACE_REGEX = /\s$/

/**
 * Sanitize a string to be a valid emoji shortcode
 * @param str - The string to sanitize
 * @returns A valid shortcode string
 */
function sanitizeShortcode(str: string): string {
	return (str || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_+-]/g, '_') // Replace non-allowed characters with underscore
		.replace(/_{2,}/g, '_') // Collapse multiple underscores to single
		.replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
		.slice(0, 50) // Limit length to prevent overly long shortcodes
}

type EmojiSuggestion = {
	emoji: Emoji
	isRecent: boolean
	isFavorite: boolean
	isSearchResult: boolean
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

export class EmojiSuggester extends EditorSuggest<EmojiSuggestion> {
	plugin: QuickEmojiPlugin
	private debounceTimer: number | null = null
	private lastSearchPromise: Promise<EmojiSuggestion[]> | null = null

	constructor(plugin: QuickEmojiPlugin) {
		super(plugin.app)
		this.plugin = plugin
	}

	/**
	 * Clean up resources when the suggester is destroyed.
	 */
	close(): void {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer)
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
		const line = editor.getLine(cursor.line)
		const subString = line.substring(0, cursor.ch)

		// Find the last colon before cursor - match even if it's just a single colon
		const colonMatch = subString.match(/:([\w]*)$/)
		if (!colonMatch) return null

		const colonIndex = colonMatch.index || 0
		const queryAfterColon = colonMatch[1] || ''

		// Rule 1: Only show if there's text after colon (ignoring spaces)
		// If no text after colon yet, don't trigger
		if (queryAfterColon.length === 0) return null

		// Rule 2: Only show if colon is the "first word", not between words
		// Check what comes before the colon
		const beforeColon = subString.substring(0, colonIndex)

		// If there's any non-whitespace character immediately before the colon,
		// then the colon is "between" words and should not trigger
		if (
			beforeColon.length > 0 &&
			!TRAILING_WHITESPACE_REGEX.test(beforeColon)
		) {
			return null
		}

		// Trigger the emoji suggester
		return {
			start: {
				line: cursor.line,
				ch: colonIndex,
			},
			end: cursor,
			query: queryAfterColon,
		}
	}

	/**
	 * Performs the actual emoji search without debouncing.
	 * This is the core search logic extracted for reuse.
	 */
	private async performSearch(query: string): Promise<EmojiSuggestion[]> {
		let results: EmojiSuggestion[] = []

		// Add favorite emojis first (always shown at top)
		if (this.plugin.settings.favorites.length > 0) {
			const searchIndex = await getSearchIndex()
			if (searchIndex) {
				for (const favoriteId of this.plugin.settings.favorites) {
					try {
						// Search for the specific favorite emoji
						const favoriteResults =
							await searchIndex.search(favoriteId)
						if (favoriteResults && favoriteResults.length > 0) {
							// Find exact match by ID if possible, otherwise take first result
							const exactMatch = favoriteResults.find(
								(emoji: Emoji) =>
									emoji.id === favoriteId ||
									emoji.name === favoriteId
							)
							const emoji = exactMatch || favoriteResults[0]
							results.push({
								emoji,
								isRecent: this.plugin.recentEmojis.some(
									(recentId) => recentId === emoji.id
								),
								isFavorite: true,
								isSearchResult: false,
							})
						}
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error(
								'Failed to load favorite emoji:',
								favoriteId,
								error
							)
						}
					}
				}
			}
		}

		// Add recent emojis only if there's no search query (and they're not already favorites)
		if (!query && this.plugin.recentEmojis.length > 0) {
			for (const emojiId of this.plugin.recentEmojis) {
				// Don't duplicate favorites in recent section
				if (!this.plugin.settings.favorites.includes(emojiId)) {
					try {
						const searchIndex = await getSearchIndex()
						// Look up the emoji by ID using the same searchIndex
						const emojiResults = await searchIndex.search(emojiId)
						if (emojiResults && emojiResults.length > 0) {
							// Find exact match by ID
							const exactMatch = emojiResults.find(
								(emoji: Emoji) =>
									emoji.id === emojiId ||
									emoji.name === emojiId
							)
							const emoji = exactMatch || emojiResults[0]

							results.push({
								emoji,
								isRecent: true,
								isFavorite: false,
								isSearchResult: false,
							})
						}
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error(
								'Failed to load recent emoji:',
								emojiId,
								error
							)
						}
					}
				}
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

			// Convert search results to EmojiSuggestion objects and add to final results
			const searchSuggestions: EmojiSuggestion[] = searchResults.map(
				(emoji) => ({
					emoji,
					isRecent: this.plugin.recentEmojis.some(
						(recentId) => recentId === emoji.id
					),
					isFavorite: this.plugin.settings.favorites.includes(
						emoji.id
					),
					isSearchResult: true,
				})
			)

			results = [...results, ...searchSuggestions]
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Quick Emoji: Error searching emojis:', error)
			}
		}

		return results
	}

	async getSuggestions(
		context: EditorSuggestContext
	): Promise<EmojiSuggestion[]> {
		const query = context.query || ''

		// For empty queries (just ":"), return results immediately to show recent emojis instantly
		if (!query) return this.performSearch(query)

		// For queries with content, use debouncing to prevent excessive search calls
		return new Promise((resolve) => {
			// Clear any existing timer
			if (this.debounceTimer) {
				window.clearTimeout(this.debounceTimer)
			}

			// Set up debounced search with 150ms delay
			this.debounceTimer = window.setTimeout(async () => {
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
						console.error(
							'Quick Emoji: Debounced search error:',
							error
						)
					}
					resolve([])
				}
			}, 150)
		})
	}

	renderSuggestion(suggestion: EmojiSuggestion, el: HTMLElement): void {
		el.empty()

		const suggestionEl = el.createDiv({ cls: 'emoji-suggestion' })
		const { emoji, isRecent, isFavorite, isSearchResult } = suggestion

		// Add appropriate classes based on the suggestion type
		if (isRecent) suggestionEl.addClass('recent')
		if (isFavorite) suggestionEl.addClass('favorite')
		if (isSearchResult) suggestionEl.addClass('search-result')

		// Create emoji icon - use the native emoji directly
		const emojiEl = suggestionEl.createDiv({ cls: 'emoji-icon' })

		// Get emoji with proper skin tone
		const emojiChar = getEmojiWithSkin(emoji, this.plugin.settings.skin)

		// Set the emoji text
		emojiEl.setText(emojiChar)

		// Create description
		const descEl = suggestionEl.createDiv({ cls: 'emoji-description' })
		descEl.setText(emoji.name)

		// Create icons container
		const iconsEl = suggestionEl.createDiv({ cls: 'emoji-icons' })

		// For recent emojis that aren't favorited, show both recent indicator and favorite star
		// For all others, show just the appropriate icon
		if (isRecent && !isFavorite && !isSearchResult) {
			// Create recent indicator (rewind icon)
			iconsEl.createDiv({
				cls: 'emoji-recent',
				title: 'Recently used',
			})

			// Also create favorite star button for recent emojis
			const starEl = iconsEl.createDiv({
				cls: 'emoji-star',
				title: 'Add to favorites',
			})
			starEl.setText('☆')

			// Add click handler for star
			starEl.addEventListener('click', async (e) => {
				e.preventDefault()
				e.stopPropagation()

				// Check if already favorited to prevent duplicates
				if (!this.plugin.settings.favorites.includes(emoji.id)) {
					// Add to favorites
					this.plugin.settings.favorites = [
						...this.plugin.settings.favorites,
						emoji.id,
					]

					// Save settings
					await this.plugin.saveSettings()

					// Update the visual state
					starEl.setText('★')
					starEl.title = 'Remove from favorites'
					starEl.toggleClass('favorited', true)
					suggestionEl.toggleClass('favorite', true)
				}
			})
		} else {
			// Create favorite star button
			const starEl = iconsEl.createDiv({
				cls: `emoji-star ${isFavorite ? 'favorited' : ''}`,
				title: isFavorite
					? 'Remove from favorites'
					: 'Add to favorites',
			})
			starEl.setText(isFavorite ? '★' : '☆')

			// Add click handler for star (prevent event propagation to avoid selecting the emoji)
			starEl.addEventListener('click', async (e) => {
				e.preventDefault()
				e.stopPropagation()

				const favorites = this.plugin.settings.favorites
				const isCurrentlyFavorited = favorites.includes(emoji.id)

				if (isCurrentlyFavorited) {
					// Remove from favorites
					this.plugin.settings.favorites = favorites.filter(
						(id) => id !== emoji.id
					)
				} else {
					// Add to favorites (check for duplicates)
					if (!favorites.includes(emoji.id)) {
						this.plugin.settings.favorites = [
							...favorites,
							emoji.id,
						]
					}
				}

				// Save settings
				await this.plugin.saveSettings()

				// Update the visual state based on current state
				const newIsFavorited = this.plugin.settings.favorites.includes(
					emoji.id
				)
				starEl.setText(newIsFavorited ? '★' : '☆')
				starEl.title = newIsFavorited
					? 'Remove from favorites'
					: 'Add to favorites'
				starEl.toggleClass('favorited', newIsFavorited)
				suggestionEl.toggleClass('favorite', newIsFavorited)
			})
		}
	}

	selectSuggestion(
		suggestion: EmojiSuggestion,
		_evt: MouseEvent | KeyboardEvent
	): void {
		// Get the editor
		const editor = getActiveEditor(this.app)
		if (!editor) return

		const { emoji } = suggestion

		// Always insert shortcode format
		// Prefer emoji.id if present; fall back to name. Sanitize for valid shortcode format.
		const shortcode = emoji.id
			? sanitizeShortcode(emoji.id)
			: sanitizeShortcode(emoji.name)
		const textToInsert = shortcode ? `:${shortcode}:` : ':emoji:' // Final fallback

		// Always save in recents when selecting an emoji
		this.plugin.saveRecentEmoji(emoji)

		// Replace the text in the editor
		editor.replaceRange(
			textToInsert,
			this.context!.start,
			this.context!.end
		)
	}
}
