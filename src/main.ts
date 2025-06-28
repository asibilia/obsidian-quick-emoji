import { Plugin } from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

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
	storageKey = 'obsidian-quick-emoji-recent' // Namespaced storage key

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
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save recent emojis to localStorage', e)
			}
		}
	}

	clearRecentEmojis() {
		this.recentEmojis = []
		try {
			localStorage.removeItem(this.storageKey)
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
			localStorage.setItem(
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
