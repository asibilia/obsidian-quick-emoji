import { App, PluginSettingTab, Setting } from 'obsidian'

import type QuickEmojiPlugin from './main'
import { getActiveEditor, getEmojiWithSkin } from './utils'

export type SkinSetting = 0 | 1 | 2 | 3 | 4 | 5

export interface QuickEmojiSettings {
	skin: SkinSetting
	recentCount: number
	favorites: string[] // Array of emoji IDs/shortcodes that are favorited
}

export const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 0,
	recentCount: 20,
	favorites: [],
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
			.setDesc('Choose the default skin tone for emoji')
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

		// Favorites section
		await this.renderFavoriteEmojis(containerEl)

		// Recent emojis section
		this.renderRecentEmojis(containerEl)
	}

	private async renderFavoriteEmojis(containerEl: HTMLElement): Promise<void> {
		new Setting(containerEl).setHeading().setName('Favorite emojis')
		containerEl.createEl('small', { text: 'Click to insert • Star icon in suggester to add/remove' })

		if (this.plugin.settings.favorites.length > 0) {
			const favoritesContainer = containerEl.createDiv({
				cls: 'favorite-emojis',
			})

			// Import search functionality to resolve emoji IDs
			const { getSearchIndex } = await import('./emoji-service')
			const searchIndex = await getSearchIndex()

			if (searchIndex) {
				// Display favorite emojis
				for (const favoriteId of this.plugin.settings.favorites) {
					try {
						// Search for the emoji by ID
						const results = await searchIndex.search(favoriteId)
						if (results && results.length > 0) {
							const emoji = results.find((e: any) => e.id === favoriteId) || results[0]
							
							const emojiChar = getEmojiWithSkin(
								emoji,
								this.plugin.settings.skin
							)

							const emojiEl = favoritesContainer.createSpan({
								cls: 'favorite-emoji',
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
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error('Failed to render favorite emoji:', favoriteId, error)
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

	private renderRecentEmojis(containerEl: HTMLElement): void {
		new Setting(containerEl).setHeading().setName('Recent emojis')
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
