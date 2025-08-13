import { MarkdownView } from 'obsidian'

import { RangeSetBuilder } from '@codemirror/state'
import {
	ViewPlugin,
	Decoration,
	DecorationSet,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view'
import type { Emoji } from '@emoji-mart/data'

import { SHORTCODE_REGEX, getEmojiMap, shouldSkipLine } from './emoji-renderer'

import type QuickEmojiPlugin from '../main'

/**
 * Widget class for rendering emojis in CodeMirror
 */
class EmojiWidget extends WidgetType {
	constructor(
		private emoji: string,
		private shortcode: string
	) {
		super()
	}

	toDOM() {
		const span = document.createElement('span')
		span.className = 'cm-emoji qe-emoji'
		span.textContent = this.emoji
		span.setAttribute('data-shortcode', this.shortcode)
		return span
	}

	eq(other: EmojiWidget) {
		return other.emoji === this.emoji && other.shortcode === this.shortcode
	}
}

/**
 * Emoji CodeMirror Extension
 * Handles rendering of emoji shortcodes in Live Preview mode
 */
export class EmojiCodeMirrorExtension {
	constructor(private plugin: QuickEmojiPlugin) {}

	/**
	 * Create the CodeMirror ViewPlugin extension
	 * @returns The CodeMirror ViewPlugin
	 */
	createExtension() {
		// Create a factory that captures the plugin instance
		const createEmojiDecorator = (pluginInstance: QuickEmojiPlugin) => {
			return class EmojiDecorator {
				decorations: DecorationSet
				emojiMap: Record<string, Emoji> = {}
				private lastMode: string | null = null

				constructor(view: ViewUpdate['view']) {
					this.decorations = this.buildDecorations(view)
				}

				update(update: ViewUpdate) {
					// Always rebuild for document changes or viewport changes
					if (update.docChanged || update.viewportChanged) {
						this.decorations = this.buildDecorations(update.view)
						return
					}

					// Check for mode changes and rebuild immediately
					const activeView =
						pluginInstance.app.workspace.getActiveViewOfType(
							MarkdownView
						)
					if (activeView) {
						const currentMode = activeView.getMode()
						if (this.lastMode !== currentMode) {
							this.lastMode = currentMode
							this.decorations = this.buildDecorations(update.view)
						}
					}
				}

				buildDecorations(view: ViewUpdate['view']): DecorationSet {
					const builder = new RangeSetBuilder<Decoration>()

					// Check if we're in strict source mode - if so, don't decorate
					if (this.isStrictSourceMode(pluginInstance)) {
						return builder.finish()
					}

					// Initialize emoji map if not done
					if (Object.keys(this.emojiMap).length === 0) {
						this.initializeEmojiMap()
					}

					// Process visible ranges for emoji shortcodes
					for (const { from, to } of view.visibleRanges) {
						this.processRange(
							view,
							from,
							to,
							builder,
							pluginInstance
						)
					}

					return builder.finish()
				}

				/**
				 * Check if we're in strict source mode (no live preview)
				 */
				private isStrictSourceMode(
					pluginInstance: QuickEmojiPlugin
				): boolean {
					const activeView =
						pluginInstance.app.workspace.getActiveViewOfType(
							MarkdownView
						)

					if (activeView && activeView.getMode() === 'source') {
						// In source mode, check if it's NOT live preview
						const editorEl = activeView.containerEl.querySelector(
							'.markdown-source-view'
						)
						if (
							editorEl &&
							!editorEl.classList.contains('is-live-preview')
						) {
							// This is strict source mode - don't render emojis
							return true
						}
					}

					return false
				}

				/**
				 * Process a range of text for emoji shortcodes
				 */
				private processRange(
					view: ViewUpdate['view'],
					from: number,
					to: number,
					builder: RangeSetBuilder<Decoration>,
					pluginInstance: QuickEmojiPlugin
				): void {
					const text = view.state.doc.sliceString(from, to)

					// Use matchAll for global matching since regex no longer has 'g' flag
					const matches = text.matchAll(
						new RegExp(SHORTCODE_REGEX, 'g')
					)

					for (const match of matches) {
						const start = from + match.index
						const end = start + match[0].length
						const shortcodeId = match[1]

						// Enhanced boundary detection - skip if we're in code or math contexts
						const line = view.state.doc.lineAt(start)
						const lineText = line.text

						// Use shared boundary detection logic
						if (shouldSkipLine(lineText)) {
							continue
						}

						// Look up and render emoji
						this.renderEmojiDecoration(
							shortcodeId,
							match[0],
							start,
							end,
							builder,
							pluginInstance
						)
					}
				}

				/**
				 * Create emoji decoration for a specific shortcode
				 */
				private renderEmojiDecoration(
					shortcodeId: string,
					fullMatch: string,
					start: number,
					end: number,
					builder: RangeSetBuilder<Decoration>,
					pluginInstance: QuickEmojiPlugin
				): void {
					// Look up emoji in cached map
					const emojiData =
						this.emojiMap[shortcodeId] ||
						this.emojiMap[shortcodeId.toLowerCase()]

					if (emojiData && emojiData.skins) {
						const emojiObj = {
							id: emojiData.id,
							name: emojiData.name,
							skins: emojiData.skins,
						} as Emoji

						// Resolve emoji character with skin tone (synchronous since map is cached)
						const emojiChar = this.getEmojiWithSkinSync(
							emojiObj,
							pluginInstance.settings.skin
						)

						if (emojiChar) {
							const widget = new EmojiWidget(emojiChar, fullMatch)
							builder.add(
								start,
								end,
								Decoration.replace({ widget })
							)
						}
					}
				}

				/**
				 * Synchronous version of getEmojiWithSkin for cached emoji data
				 */
				private getEmojiWithSkinSync(
					emojiItem: Emoji,
					skinTone: number
				): string | null {
					if (!emojiItem) return null

					// If default skin tone is selected OR emoji doesn't support skin tones
					if (
						skinTone === 0 ||
						!emojiItem.skins ||
						emojiItem.skins.length <= 1
					) {
						return emojiItem.skins?.[0]?.native ?? emojiItem.name
					}

					// Get skin tone variant if it exists
					return (
						emojiItem.skins?.[skinTone]?.native ??
						emojiItem.skins?.[0]?.native ??
						emojiItem.name
					)
				}

				/**
				 * Initialize emoji map asynchronously
				 */
				async initializeEmojiMap(): Promise<void> {
					try {
						this.emojiMap = await getEmojiMap()
					} catch (error) {
						if (process.env.NODE_ENV === 'development') {
							console.error(
								'Failed to initialize emoji map:',
								error
							)
						}
					}
				}
			}
		}

		// Create and return the ViewPlugin
		const emojiDecorationPlugin = ViewPlugin.fromClass(
			createEmojiDecorator(this.plugin),
			{
				decorations: (v) => v.decorations,
			}
		)

		return emojiDecorationPlugin
	}
}
