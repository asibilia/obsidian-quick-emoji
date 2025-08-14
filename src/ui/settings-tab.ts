import { App, PluginSettingTab, Setting } from 'obsidian'

import type { Emoji } from '@emoji-mart/data'

import type QuickEmojiPlugin from '../main'
import { getSearchIndex } from '../services/emoji-service'
import { getActiveEditor, getEmojiWithSkin, insertEmoji } from '../utils'

export type SkinSetting = 0 | 1 | 2 | 3 | 4 | 5
export type InsertionFormat = 'unicode' | 'shortcode'

export interface QuickEmojiSettings {
	skin: SkinSetting
	recentCount: number
	favorites: string[] // Array of emoji IDs/shortcodes that are favorited
	insertionFormat: InsertionFormat // How emojis are inserted into the editor
}

export const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 0,
	recentCount: 20,
	favorites: [],
	insertionFormat: 'unicode', // Default to Unicode for backward compatibility
}

export class QuickEmojiSettingTab extends PluginSettingTab {
	plugin: QuickEmojiPlugin

	constructor(app: App, plugin: QuickEmojiPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	async display(): Promise<void> {
		const { containerEl } = this
		containerEl.empty()

		// Skin tone setting
		new Setting(containerEl)
			.setName('Default skin tone')
			.setDesc('Choose the default skin tone for emoji.')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('0', 'Default')
					.addOption('1', 'Light')
					.addOption('2', 'Medium-light')
					.addOption('3', 'Medium')
					.addOption('4', 'Medium-dark')
					.addOption('5', 'Dark')
					.setValue(this.plugin.settings.skin.toString())
					.onChange(async (value) => {
						const skin = parseInt(value)
						this.plugin.settings.skin = skin as SkinSetting
						await this.plugin.saveSettings()
					})
			})

		// Insertion format setting
		new Setting(containerEl)
			.setName('Insertion format')
			.setDesc(
				'Choose how emojis are inserted into your notes:\n' +
					'• Unicode emoji: Insert as native characters (🙂) - visible in all views\n' +
					'• Shortcode: Insert as text codes (:smile:) - rendered in Reading Mode'
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('unicode', 'Unicode emoji')
					.addOption('shortcode', 'Shortcode')
					.setValue(this.plugin.settings.insertionFormat)
					.onChange(async (value) => {
						this.plugin.settings.insertionFormat =
							value as InsertionFormat
						await this.plugin.saveSettings()
					})
			})

		// Recent emoji count
		new Setting(containerEl)
			.setName('Recent emoji count')
			.setDesc('Number of recent emojis to remember.')
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

		// Favorites section
		await this.renderFavoriteEmojis(containerEl)

		// Recent emojis section
		await this.renderRecentEmojis(containerEl)
	}

	private async renderFavoriteEmojis(
		containerEl: HTMLElement
	): Promise<void> {
		new Setting(containerEl).setHeading().setName('Favorite emojis')
		containerEl.createEl('small', {
			text: 'Click to insert. Star icon in suggester to add/remove.',
		})

		if (this.plugin.settings.favorites.length > 0) {
			const favoritesContainer = containerEl.createDiv({
				cls: 'favorite-emojis',
			})

			// Import search functionality to resolve emoji IDs

			const searchIndex = await getSearchIndex()

			if (searchIndex) {
				// Display favorite emojis
				for (const favoriteId of this.plugin.settings.favorites) {
					try {
						// Search for the emoji by ID
						const results = await searchIndex.search(favoriteId)
						if (results && results.length > 0) {
							const emoji =
								results.find(
									(e: unknown) =>
										(e as Emoji).id === favoriteId
								) || results[0]

							const emojiChar = getEmojiWithSkin(
								emoji,
								this.plugin.settings.skin
							)

							const emojiEl = favoritesContainer.createSpan({
								cls: 'favorite-emoji',
								text: emojiChar,
								title: `Insert ${emoji.name}`,
							})

							// Add click handler to insert the emoji using user's preferred format
							emojiEl.addEventListener('click', () => {
								const editor = getActiveEditor(this.app)
								if (editor) {
									insertEmoji(
										editor,
										emoji,
										this.plugin.settings.insertionFormat,
										this.plugin.settings.skin
									)
								}
							})
						}
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error(
								'Failed to render favorite emoji:',
								favoriteId,
								error
							)
						}
					}
				}
			}

			// Add clear button
			new Setting(containerEl).addButton((button) => {
				button
					.setButtonText('Clear favorite emojis')
					.onClick(async () => {
						this.plugin.settings.favorites = []
						await this.plugin.saveSettings()
						await this.display() // Refresh the view
					})
			})
		} else {
			containerEl.createEl('p', {
				text: 'No favorite emojis yet. Use the star icon in the emoji suggester to add some!',
				cls: 'setting-item-description',
			})
		}
	}

	private async renderRecentEmojis(containerEl: HTMLElement): Promise<void> {
		new Setting(containerEl).setHeading().setName('Recent emojis')
		containerEl.createEl('small', { text: 'Click to insert.' })

		if (this.plugin.recentEmojis.length > 0) {
			const recentContainer = containerEl.createDiv({
				cls: 'recent-emojis',
			})

			// Get the search index for emoji lookup
			const searchIndex = await getSearchIndex()
			if (!searchIndex) {
				recentContainer.createEl('p', {
					text: 'Failed to load emoji data',
				})
				return
			}

			// Display recent emojis by looking up IDs
			for (const emojiId of this.plugin.recentEmojis) {
				// Skip invalid emoji IDs
				if (
					!emojiId ||
					typeof emojiId !== 'string' ||
					emojiId.trim() === ''
				)
					continue

				try {
					// Look up the emoji by ID
					const results = await searchIndex.search(emojiId)
					if (results && results.length > 0) {
						// Find exact match by ID
						const exactMatch = results.find(
							(e: Emoji) => e.id === emojiId || e.name === emojiId
						)
						const emoji = exactMatch || results[0]

						const emojiChar = getEmojiWithSkin(
							emoji,
							this.plugin.settings.skin
						)

						const emojiEl = recentContainer.createSpan({
							cls: 'recent-emoji',
							text: emojiChar,
							title: `Insert ${emoji.name}`,
						})

						// Add click handler to insert the emoji using user's preferred format
						emojiEl.addEventListener('click', () => {
							const editor = getActiveEditor(this.app)
							if (editor) {
								insertEmoji(
									editor,
									emoji,
									this.plugin.settings.insertionFormat,
									this.plugin.settings.skin
								)
							}
						})
					}
				} catch (error) {
					if (process.env.NODE_ENV === 'development') {
						console.error(
							'Failed to render recent emoji:',
							emojiId,
							error
						)
					}
				}
			}

			// Add clear button
			new Setting(containerEl).addButton((button) => {
				button
					.setButtonText('Clear recent emojis')
					.onClick(async () => {
						this.plugin.clearRecentEmojis()
						await this.display() // Refresh the view
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
