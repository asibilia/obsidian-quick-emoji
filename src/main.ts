import { Plugin, Notice } from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import { clearSearchIndex } from './emoji-service'
import { EmojiSuggester } from './emoji-suggester'
import {
	QuickEmojiSettingTab,
	DEFAULT_SETTINGS,
	type QuickEmojiSettings,
} from './settings-tab'

export default class QuickEmojiPlugin extends Plugin {
	settings: QuickEmojiSettings
	recentEmojis: Emoji[] = []
	emojiSuggester: EmojiSuggester
	storageKey = 'quick-emoji-recent' // Namespaced storage key

	async onload() {
		await this.loadSettings()

		// The heavyweight emoji-mart initialization is now lazy-loaded.
		// The plugin will load almost instantly.

		// Register the emoji suggester
		this.emojiSuggester = new EmojiSuggester(this)
		this.registerEditorSuggest(this.emojiSuggester)

		// Add settings tab
		this.addSettingTab(new QuickEmojiSettingTab(this.app, this))

		if (process.env.NODE_ENV === 'development') {
			console.log('Quick Emoji plugin loaded.')
		}
	}

	onunload() {
		// Clean up any resources and references when the plugin is disabled

		// Clean up the emoji suggester if it exists
		if (this.emojiSuggester) {
			// The suggester's close() method handles its internal cleanup (timers, promises)
			this.emojiSuggester.close()
		}

		// Clear recent emojis array to free memory
		if (this.recentEmojis) {
			this.recentEmojis.length = 0
		}

		// Clear the module-level emoji search index cache
		clearSearchIndex()

		if (process.env.NODE_ENV === 'development') {
			console.log('Quick Emoji plugin unloaded and cleaned up.')
		}
	}

	async loadSettings() {
		try {
			this.settings = Object.assign(
				{},
				DEFAULT_SETTINGS,
				await this.loadData()
			)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to load plugin settings', e)
			}
			new Notice(
				'Quick Emoji: Failed to load plugin settings. Using defaults.'
			)
			this.settings = Object.assign({}, DEFAULT_SETTINGS)
		}

		// Load recent emojis from local storage
		try {
			const recentData = this.app.loadLocalStorage(this.storageKey)
			if (recentData) {
				this.recentEmojis = JSON.parse(recentData)
				// Clean up any potentially invalid emojis
				this.cleanupRecentEmojis()
			}
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error(
					'Failed to load recent emojis from localStorage',
					e
				)
			}
			this.recentEmojis = []
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save plugin settings', e)
			}
			new Notice(
				'Quick Emoji: Failed to save plugin settings. Changes may be lost.'
			)
		}
	}

	saveRecentEmoji(emoji: Emoji) {
		if (!emoji) return

		// Add to the beginning, remove duplicates
		this.recentEmojis = [
			emoji,
			...this.recentEmojis.filter((e) => e.id !== emoji.id),
		].slice(0, this.settings.recentCount)

		try {
			this.app.saveLocalStorage(
				this.storageKey,
				JSON.stringify(this.recentEmojis)
			)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save recent emojis to localStorage', e)
			}
		}
	}

	clearRecentEmojis() {
		this.recentEmojis = []
		try {
			this.app.saveLocalStorage(this.storageKey, null)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error(
					'Failed to clear recent emojis from localStorage',
					e
				)
			}
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
			this.app.saveLocalStorage(
				this.storageKey,
				JSON.stringify(this.recentEmojis)
			)
		} catch (e) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save cleaned recent emojis', e)
			}
		}
	}
}
