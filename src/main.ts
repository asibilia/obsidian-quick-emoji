import { Plugin, Notice } from 'obsidian'

import { type Emoji } from '@emoji-mart/data'

import { EmojiCodeMirrorExtension } from './rendering/codemirror-extension'
import { EmojiMarkdownProcessor } from './rendering/markdown-processor'
import { clearSearchIndex } from './services/emoji-service'
import { EmojiStorageMigration } from './storage/migration'
import { EmojiSuggester } from './ui/emoji-suggester'
import {
	QuickEmojiSettingTab,
	DEFAULT_SETTINGS,
	type QuickEmojiSettings,
} from './ui/settings-tab'

export default class QuickEmojiPlugin extends Plugin {
	settings: QuickEmojiSettings
	recentEmojis: string[] = [] // Changed to store emoji IDs instead of full objects
	emojiSuggester: EmojiSuggester
	storageKey = 'quick-emoji-recent' // Namespaced storage key

	async onload() {
		await this.loadSettings()

		// Initialize core components
		this.initializeComponents()

		// Set up rendering systems
		this.setupRendering()

		if (process.env.NODE_ENV === 'development') {
			console.log('Quick Emoji plugin loaded.')
		}
	}

	/**
	 * Initialize core plugin components
	 */
	private initializeComponents(): void {
		// Register the emoji suggester
		this.emojiSuggester = new EmojiSuggester(this)
		this.registerEditorSuggest(this.emojiSuggester)

		// Add settings tab
		this.addSettingTab(new QuickEmojiSettingTab(this.app, this))
	}

	/**
	 * Set up emoji rendering systems
	 */
	private setupRendering(): void {
		// Set up markdown post-processor for Reading Mode
		const markdownProcessor = new EmojiMarkdownProcessor(this)
		this.registerMarkdownPostProcessor(markdownProcessor.createProcessor())

		// Set up CodeMirror extension for Live Preview
		const codeMirrorExtension = new EmojiCodeMirrorExtension(this)
		this.registerEditorExtension(codeMirrorExtension.createExtension())
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
		// Load plugin settings
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

		// Load and migrate recent emojis using migration service
		const migration = new EmojiStorageMigration(this.app, this.storageKey)
		this.recentEmojis = await migration.migrateRecentEmojis()
		this.recentEmojis = await migration.cleanupRecentEmojis(
			this.recentEmojis
		)
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
		if (!emoji || !emoji.id) return

		// Add emoji ID to the beginning, remove duplicates
		this.recentEmojis = [
			emoji.id,
			...this.recentEmojis.filter((id) => id !== emoji.id),
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

	async clearRecentEmojis() {
		this.recentEmojis = []
		const migration = new EmojiStorageMigration(this.app, this.storageKey)
		await migration.clearRecentEmojis()
	}
}
