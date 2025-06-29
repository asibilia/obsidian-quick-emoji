import { App, PluginSettingTab, Setting } from 'obsidian'

import type QuickEmojiPlugin from './main'
import { getActiveEditor, getEmojiWithSkin } from './utils'

export type SkinSetting = 0 | 1 | 2 | 3 | 4 | 5

export interface QuickEmojiSettings {
	skin: SkinSetting
	recentCount: number
}

export const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 0,
	recentCount: 20,
}

export class QuickEmojiSettingTab extends PluginSettingTab {
	plugin: QuickEmojiPlugin

	constructor(app: App, plugin: QuickEmojiPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
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

		// Recent emojis section
		this.renderRecentEmojis(containerEl)
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
