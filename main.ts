import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from 'obsidian'

import * as emojiData from '@emoji-mart/data'
import { type EmojiMartData, type Emoji } from '@emoji-mart/data'
import { init, SearchIndex } from 'emoji-mart'

type SkinSetting = 0 | 1 | 2 | 3 | 4 | 5

interface QuickEmojiSettings {
	skin: SkinSetting
	recentCount: number
}

const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 0,
	recentCount: 20,
}

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

// Function to trigger an inline emoji search using emoji-mart's SearchIndex
async function searchEmojis(query: string): Promise<Emoji[]> {
	try {
		if (!SearchIndex) {
			console.error('SearchIndex not initialized')
			return []
		}
		const emojis = await SearchIndex.search(query)
		return emojis || []
	} catch (error) {
		console.error('Failed to search emojis:', error)
		return []
	}
}

export default class QuickEmojiPlugin extends Plugin {
	settings: QuickEmojiSettings
	recentEmojis: Emoji[] = []
	emojiSuggester: EmojiSuggester
	storageKey = 'obsidian-quick-emoji-recent' // Namespaced storage key

	async onload() {
		await this.loadSettings()

		// First initialize the emoji-mart data to ensure search works correctly
		try {
			await init({ data: emojiData as EmojiMartData, set: 'native' })
		} catch (error) {
			console.error('Failed to initialize emoji-mart data:', error)
			new Notice(
				'Failed to initialize emoji data. Try reloading Obsidian.'
			)
		}

		// Register the emoji suggester
		this.emojiSuggester = new EmojiSuggester(this)
		this.registerEditorSuggest(this.emojiSuggester)

		// Add settings tab
		this.addSettingTab(new QuickEmojiSettingTab(this.app, this))
	}

	onunload() {
		// Clean up any resources and references when the plugin is disabled
		console.log('Unloading Quick Emoji plugin')
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		)

		// Load recent emojis from local storage
		try {
			const recentData = localStorage.getItem(this.storageKey)
			if (recentData) {
				this.recentEmojis = JSON.parse(recentData)
				// Clean up any potentially invalid emojis
				this.cleanupRecentEmojis()
			}
		} catch (e) {
			console.error('Failed to load recent emojis from localStorage', e)
			this.recentEmojis = []
		}
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}

	saveRecentEmoji(emoji: Emoji) {
		if (!emoji) return

		// Add to the beginning, remove duplicates
		this.recentEmojis = [
			emoji,
			...this.recentEmojis.filter((e) => e.id !== emoji.id),
		].slice(0, this.settings.recentCount)

		try {
			localStorage.setItem(
				this.storageKey,
				JSON.stringify(this.recentEmojis)
			)
		} catch (e) {
			console.error('Failed to save recent emojis to localStorage', e)
		}
	}

	clearRecentEmojis() {
		this.recentEmojis = []
		try {
			localStorage.removeItem(this.storageKey)
		} catch (e) {
			console.error('Failed to clear recent emojis from localStorage', e)
		}
	}

	cleanupRecentEmojis() {
		// Filter out any null, undefined, or empty string values
		this.recentEmojis = this.recentEmojis.filter(
			(emoji) =>
				emoji &&
				emoji.name.trim() !== '' &&
				// Filter out entries that look like text descriptions rather than emojis
				!emoji.name.match(/^\w+\s+\w+/) &&
				emoji.name.length < 10
		)

		// Save the cleaned list
		try {
			localStorage.setItem(
				this.storageKey,
				JSON.stringify(this.recentEmojis)
			)
		} catch (e) {
			console.error('Failed to save cleaned recent emojis', e)
		}
	}
}

class EmojiSuggester extends EditorSuggest<Emoji> {
	plugin: QuickEmojiPlugin

	constructor(plugin: QuickEmojiPlugin) {
		super(plugin.app)
		this.plugin = plugin
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

	async getSuggestions(context: EditorSuggestContext): Promise<Emoji[]> {
		const query = context.query || ''
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
				try {
					const allResults: Emoji[] = []

					// Use Promise.all to fetch all categories in parallel for better performance
					await Promise.all(
						EMOJI_CATEGORIES.map(async (category) => {
							const categoryResults =
								await SearchIndex.search(category)
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
					console.error(error)
					// Fall back to a simpler search
					searchResults = await SearchIndex.search('')
				}
			}

			// Add filtered search results to the final results
			results = [...results, ...searchResults]
		} catch (error) {
			console.error('Quick Emoji: Error searching emojis:', error)
		}

		return results
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

class QuickEmojiSettingTab extends PluginSettingTab {
	plugin: QuickEmojiPlugin

	constructor(app: App, plugin: QuickEmojiPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this
		containerEl.empty()

		containerEl.createEl('h2', { text: 'Quick Emoji Settings' })

		// Skin tone setting
		new Setting(containerEl)
			.setName('Default skin tone')
			.setDesc('Choose the default skin tone for emoji')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('0', 'Default')
					.addOption('1', 'Light')
					.addOption('2', 'Medium-Light')
					.addOption('3', 'Medium')
					.addOption('4', 'Medium-Dark')
					.addOption('5', 'Dark')
					.setValue(this.plugin.settings.skin.toString())
					.onChange(async (value) => {
						const skin = parseInt(value)
						this.plugin.settings.skin = skin as SkinSetting
						await this.plugin.saveSettings()
					})
			})

		// Recent emoji count
		new Setting(containerEl)
			.setName('Recent emoji count')
			.setDesc('Number of recent emojis to remember')
			.addSlider((slider) => {
				slider
					.setLimits(5, 50, 5)
					.setValue(this.plugin.settings.recentCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.recentCount = value
						await this.plugin.saveSettings()
					})
			})

		// Recent emojis section
		this.renderRecentEmojis(containerEl)
	}

	private renderRecentEmojis(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Recent Emojis' })
		containerEl.createEl('small', { text: 'Click to insert' })

		if (this.plugin.recentEmojis.length > 0) {
			const recentContainer = containerEl.createDiv({
				cls: 'recent-emojis',
			})

			// Display recent emojis
			for (const emoji of this.plugin.recentEmojis) {
				// Skip invalid emoji entries
				if (!emoji || emoji.name.trim() === '') continue

				const emojiChar = getEmojiWithSkin(
					emoji,
					this.plugin.settings.skin
				)

				const emojiEl = recentContainer.createSpan({
					cls: 'recent-emoji',
					text: emojiChar,
					title: `Insert ${emoji.name}`,
				})

				// Add click handler to insert the emoji
				emojiEl.addEventListener('click', () => {
					const editor = getActiveEditor(this.app)
					if (editor) {
						editor.replaceSelection(emojiChar)
					}
				})
			}

			// Add clear button
			new Setting(containerEl).addButton((button) => {
				button
					.setButtonText('Clear Recent Emojis')
					.onClick(async () => {
						this.plugin.clearRecentEmojis()
						this.display() // Refresh the view
					})
			})
		} else {
			containerEl.createEl('p', {
				text: 'No recent emojis yet. Use the emoji picker or the inline suggester to add some!',
				cls: 'setting-item-description',
			})
		}
	}
}
