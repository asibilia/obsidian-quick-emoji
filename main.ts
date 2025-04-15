import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

import * as emojiData from "@emoji-mart/data";
import { init, SearchIndex, getEmojiDataFromNative } from "emoji-mart";

interface EmojiData {
	id: string;
	name: string;
	native: string;
	unified: string;
	keywords: string[];
	shortcodes?: string;
	skins?: Array<{ native: string }>;
}

type SkinSetting = 0 | 1 | 2 | 3 | 4 | 5;
type ThemeSetting = "auto" | "light" | "dark";

interface QuickEmojiSettings {
	skin: SkinSetting;
	theme: ThemeSetting;
	recentCount: number;
}

const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 0,
	theme: "auto",
	recentCount: 20,
};

// Function to trigger an inline emoji search using emoji-mart's SearchIndex
async function searchEmojis(query: string): Promise<EmojiData[]> {
	try {
		const emojis = await SearchIndex.search(query);
		return emojis;
	} catch (error) {
		console.error("Failed to search emojis:", error);
		return [];
	}
}

export default class QuickEmojiPlugin extends Plugin {
	settings: QuickEmojiSettings;
	recentEmojis: string[] = [];

	async onload() {
		await this.loadSettings();

		// First initialize the emoji-mart data to ensure search works correctly
		try {
			await init({ data: emojiData, set: "native" });
			console.log("Emoji-mart data initialized successfully");
		} catch (error) {
			console.error("Failed to initialize emoji-mart data:", error);
			new Notice(
				"Failed to initialize emoji data. Try reloading Obsidian."
			);
		}

		// Register the emoji suggester
		this.registerEditorSuggest(new EmojiSuggester(this));

		// Add settings tab
		this.addSettingTab(new QuickEmojiSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		// Load recent emojis from local storage
		const recentData = localStorage.getItem("quick-emoji-recent");
		if (recentData) {
			try {
				this.recentEmojis = JSON.parse(recentData);
			} catch (e) {
				console.error("Failed to parse recent emojis", e);
				this.recentEmojis = [];
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	saveRecentEmoji(emoji: string) {
		// Add to the beginning, remove duplicates
		this.recentEmojis = [
			emoji,
			...this.recentEmojis.filter((e) => e !== emoji),
		].slice(0, this.settings.recentCount);

		localStorage.setItem(
			"quick-emoji-recent",
			JSON.stringify(this.recentEmojis)
		);
	}

	clearRecentEmojis() {
		this.recentEmojis = [];
		localStorage.removeItem("quick-emoji-recent");
	}
}

class EmojiSuggester extends EditorSuggest<EmojiData> {
	plugin: QuickEmojiPlugin;

	constructor(plugin: QuickEmojiPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile
	): EditorSuggestTriggerInfo | null {
		// Check if we're in the middle of a word
		const line = editor.getLine(cursor.line);
		const subString = line.substring(0, cursor.ch);

		// Find the last colon before cursor - match even if it's just a single colon
		const colonMatch = subString.match(/:([\w]*)$/);
		if (!colonMatch) return null;

		// Trigger the emoji suggester
		return {
			start: {
				line: cursor.line,
				ch: colonMatch.index || 0,
			},
			end: cursor,
			query: colonMatch[1] || "",
		};
	}

	async getSuggestions(context: EditorSuggestContext): Promise<EmojiData[]> {
		const query = context.query || "";
		let results: EmojiData[] = [];

		// Add recent emojis only if there's no search query
		if (!query && this.plugin.recentEmojis.length > 0) {
			for (const native of this.plugin.recentEmojis) {
				try {
					const emojiData = await getEmojiDataFromNative(native);
					if (emojiData) results.push(emojiData);
				} catch (e) {
					console.error("Failed to get emoji data for", native, e);
				}
			}
		}

		try {
			// Get emoji results - use appropriate search based on query
			let searchResults: EmojiData[] = [];

			if (query) {
				// If user has typed something, do a specific search
				searchResults = await searchEmojis(query);
			} else {
				// When user has only typed ":", get popular emojis
				try {
					const categories = [
						"activity",
						"animals",
						"face",
						"flags",
						"foods",
						"frequent",
						"nature",
						"objects",
						"people",
						"places",
						"symbols",
						"travel",
					];

					const allResults: EmojiData[] = [];

					// Use Promise.all to fetch all categories in parallel for better performance
					await Promise.all(
						categories.map(async (category) => {
							const categoryResults = await SearchIndex.search(
								category
							);
							allResults.push(
								...(categoryResults ?? [])
									// Sort alphabetically
									.sort((a: EmojiData, b: EmojiData) =>
										a.name.localeCompare(b.name)
									)
							);
						})
					);

					searchResults = allResults
						// Filter duplicate emojis
						.filter(
							(emoji, index, self) =>
								index ===
								self.findIndex((t) => t.name === emoji.name)
						);
				} catch (error) {
					console.error(error);
					// Fall back to a simpler search
					searchResults = await SearchIndex.search("");
				}
			}

			// Add filtered search results to the final results
			results = [...results, ...searchResults];
		} catch (error) {
			console.error("Quick Emoji: Error searching emojis:", error);
		}

		return results;
	}

	renderSuggestion(item: EmojiData, el: HTMLElement): void {
		el.empty();
		// For regular emoji items
		const emojiItem = item as EmojiData;
		const suggestionEl = el.createDiv({ cls: "emoji-suggestion" });

		// Create emoji icon - use the native emoji directly
		const emojiEl = suggestionEl.createDiv({ cls: "emoji-icon" });

		// If we have a skin variant, use that
		if (
			emojiItem.skins &&
			emojiItem.skins.length > 0 &&
			emojiItem.skins[this.plugin.settings.skin] &&
			emojiItem.skins[this.plugin.settings.skin].native
		) {
			// Use the selected skin tone (adjusting index since skins array is 0-based but settings start at 1)
			emojiEl.setText(emojiItem.skins[this.plugin.settings.skin].native);
		} else if (emojiItem.native) {
			emojiEl.setText(emojiItem.native);
		} else {
			// Last resort fallback - use an emoji symbol that will always work
			emojiEl.setText("🔣");
		}

		// Create description
		const descEl = suggestionEl.createDiv({ cls: "emoji-description" });
		descEl.setText(emojiItem.name);
	}

	selectSuggestion(item: EmojiData, _evt: MouseEvent | KeyboardEvent): void {
		// Get the editor and replace the trigger with the emoji
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		const emojiItem = item as EmojiData;

		// Get the emoji character to insert - prioritize native emoji
		let emojiChar = emojiItem.native;

		// If emoji has skin variants and user has selected a non-default skin, use that
		if (
			emojiItem.skins &&
			emojiItem.skins.length > 0 &&
			emojiItem.skins[this.plugin.settings.skin] &&
			emojiItem.skins[this.plugin.settings.skin].native
		) {
			emojiChar = emojiItem.skins[this.plugin.settings.skin].native;
		}

		// Save in recents only if we have a valid emoji character (not a shortcode)
		if (emojiChar && !emojiChar.startsWith(":")) {
			this.plugin.saveRecentEmoji(emojiChar);
		}

		// Replace the text in the editor
		editor.replaceRange(
			emojiChar || `:${emojiItem.name}:`, // Fallback to name as shortcode
			this.context!.start,
			this.context!.end
		);
	}
}

class QuickEmojiSettingTab extends PluginSettingTab {
	plugin: QuickEmojiPlugin;

	constructor(app: App, plugin: QuickEmojiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Quick Emoji Settings" });

		// Theme setting
		new Setting(containerEl)
			.setName("Theme")
			.setDesc("Choose the emoji picker theme")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", "Auto (match Obsidian)")
					.addOption("light", "Light")
					.addOption("dark", "Dark")
					.setValue(this.plugin.settings.theme)
					.onChange(async (value: "auto" | "light" | "dark") => {
						this.plugin.settings.theme = value;
						await this.plugin.saveSettings();
					});
			});

		// Skin tone setting
		new Setting(containerEl)
			.setName("Default skin tone")
			.setDesc("Choose the default skin tone for emoji")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("0", "Default")
					.addOption("1", "Light")
					.addOption("2", "Medium-Light")
					.addOption("3", "Medium")
					.addOption("4", "Medium-Dark")
					.addOption("5", "Dark")
					.setValue(this.plugin.settings.skin.toString())
					.onChange(async (value) => {
						const skin = parseInt(value);
						this.plugin.settings.skin = skin as SkinSetting;
						await this.plugin.saveSettings();
					});
			});

		// Recent emoji count
		new Setting(containerEl)
			.setName("Recent emoji count")
			.setDesc("Number of recent emojis to remember")
			.addSlider((slider) => {
				slider
					.setLimits(5, 50, 5)
					.setValue(this.plugin.settings.recentCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.recentCount = value;
						await this.plugin.saveSettings();
					});
			});

		// Recent emojis section
		containerEl.createEl("h3", { text: "Recent Emojis" });

		if (this.plugin.recentEmojis.length > 0) {
			const recentContainer = containerEl.createDiv({
				cls: "recent-emojis",
			});

			// Display recent emojis
			for (const emoji of this.plugin.recentEmojis) {
				const emojiEl = recentContainer.createSpan({
					cls: "recent-emoji",
					text: emoji,
				});

				// Add click handler to insert the emoji
				emojiEl.addEventListener("click", () => {
					// Get the active editor
					const activeView =
						this.plugin.app.workspace.getActiveViewOfType(
							MarkdownView
						);
					if (activeView && activeView.editor) {
						const editor = activeView.editor;
						editor.replaceSelection(emoji);
					}
				});
			}

			// Add clear button
			new Setting(containerEl).addButton((button) => {
				button
					.setButtonText("Clear Recent Emojis")
					.onClick(async () => {
						this.plugin.clearRecentEmojis();
						this.display(); // Refresh the view
					});
			});
		} else {
			containerEl.createEl("p", {
				text: "No recent emojis yet. Use the emoji picker or the inline suggester to add some!",
				cls: "setting-item-description",
			});
		}
	}
}
