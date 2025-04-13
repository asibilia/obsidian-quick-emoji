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

// Initialize emoji-mart data
init({ data: emojiData });

// Function to check if the web component is available
function isEmojiPickerDefined(): boolean {
	return typeof customElements.get("em-emoji-picker") !== "undefined";
}

// Function to trigger an inline emoji search
async function searchEmojis(query: string): Promise<EmojiData[]> {
	try {
		return await SearchIndex.search(query);
	} catch (error) {
		console.error("Failed to search emojis:", error);
		return [];
	}
}

interface EmojiData {
	id: string;
	name: string;
	native: string;
	unified: string;
	keywords: string[];
	shortcodes?: string;
}

interface QuickEmojiSettings {
	skin: 1 | 2 | 3 | 4 | 5 | 6;
	theme: "auto" | "light" | "dark";
	recentCount: number;
}

const DEFAULT_SETTINGS: QuickEmojiSettings = {
	skin: 1,
	theme: "auto",
	recentCount: 20,
};

export default class QuickEmojiPlugin extends Plugin {
	settings: QuickEmojiSettings;
	recentEmojis: string[] = [];

	async onload() {
		await this.loadSettings();

		// Load CSS
		this.loadStyles();

		// Ensure emoji-mart is loaded - dynamically import it
		try {
			// This import will ensure the web component is registered
			await import("emoji-mart");
			console.log("Emoji-mart loaded successfully");
		} catch (error) {
			console.error("Failed to load emoji-mart:", error);
		}

		// Register the emoji suggester
		this.registerEditorSuggest(new EmojiSuggester(this));

		// Add settings tab
		this.addSettingTab(new QuickEmojiSettingTab(this.app, this));

		// Add ribbon icon for emoji picker
		this.addRibbonIcon("smile", "Insert emoji", () => {
			this.showEmojiPicker();
		});

		// Add command to open emoji picker
		this.addCommand({
			id: "open-emoji-picker",
			name: "Open emoji picker",
			callback: () => {
				this.showEmojiPicker();
			},
		});

		// Listen for emoji-mart component load
		window.addEventListener("emoji-mart:state:change", (e: CustomEvent) => {
			if (e.detail?.recents?.length > 0) {
				// Update our recent emojis from the picker
				this.syncRecentsFromPicker(e.detail.recents);
			}
		});
	}

	onunload() {
		// Clean up any custom event listeners
		window.removeEventListener("emoji-mart:state:change", () => {});
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

	showEmojiPicker() {
		new EmojiPickerModal(this).open();
	}

	loadStyles() {
		// Add a style element to document head
		const styleEl = document.createElement("style");
		styleEl.id = "quick-emoji-styles";
		document.head.appendChild(styleEl);

		// Load the CSS file
		this.loadData()
			.then(() => {
				return this.app.vault.adapter.read(
					this.manifest.dir + "/styles.css"
				);
			})
			.then((css) => {
				styleEl.textContent = css;
			})
			.catch((error) => {
				console.error("Failed to load Quick Emoji styles", error);
			});
	}

	// Sync recent emojis from the picker
	syncRecentsFromPicker(recents: { native: string }[] | string[]) {
		if (!recents || !Array.isArray(recents)) return;

		// Extract native emojis from the recents list
		const nativeEmojis = recents
			.map((item) => (typeof item === "string" ? item : item.native))
			.filter((emoji) => emoji !== undefined);

		// Only update if we actually have emojis
		if (nativeEmojis.length > 0) {
			this.recentEmojis = nativeEmojis.slice(
				0,
				this.settings.recentCount
			);
			localStorage.setItem(
				"quick-emoji-recent",
				JSON.stringify(this.recentEmojis)
			);
		}
	}
}

class EmojiPickerModal extends Modal {
	plugin: QuickEmojiPlugin;

	constructor(plugin: QuickEmojiPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("quick-emoji-modal");

		// Create emoji picker container
		const pickerContainer = contentEl.createDiv({
			cls: "emoji-picker-container",
		});

		try {
			// Check if emoji picker component is defined
			if (!isEmojiPickerDefined()) {
				// If it's not defined, we need to add a warning message
				pickerContainer.createEl("div", {
					cls: "emoji-picker-error",
					text: "Emoji picker component is not available. Please reload Obsidian and try again.",
				});

				// Create a reload button
				const reloadButton = pickerContainer.createEl("button", {
					cls: "emoji-picker-reload-btn",
					text: "Reload Now",
				});

				reloadButton.addEventListener("click", () => {
					window.location.reload();
				});

				return;
			}

			// Create the web component element
			const pickerElement = document.createElement("em-emoji-picker");

			// Set attributes based on plugin settings
			pickerElement.setAttribute(
				"skin",
				this.plugin.settings.skin.toString()
			);
			pickerElement.setAttribute("theme", this.plugin.settings.theme);
			pickerElement.setAttribute("categories-position", "top");

			// Handle recents
			if (this.plugin.recentEmojis.length > 0) {
				// Format recent emojis for the picker
				const recentsJson = JSON.stringify(
					this.plugin.recentEmojis.map((native) => ({ native }))
				);
				pickerElement.setAttribute("data-recents", recentsJson);
			}

			// Listen for emoji selection
			pickerElement.addEventListener("emoji-click", (e: CustomEvent) => {
				const emoji = e.detail.emoji;
				const native = emoji.native || emoji;

				// Get the active editor
				const activeView =
					this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView && activeView.editor) {
					const editor = activeView.editor;
					editor.replaceSelection(native);

					// Save as recent
					this.plugin.saveRecentEmoji(native);

					// Close the modal
					this.close();
				} else {
					new Notice("No active editor found.");
				}
			});

			// Add the picker to container
			pickerContainer.appendChild(pickerElement);
		} catch (error) {
			console.error("Failed to create emoji picker:", error);
			pickerContainer.createEl("div", {
				cls: "emoji-picker-error",
				text: "Failed to create emoji picker. Try reloading Obsidian.",
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class EmojiSuggester extends EditorSuggest<
	| EmojiData
	| { type: "header"; value: string }
	| { type: "empty"; value: string }
> {
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

		// Find the last colon before cursor
		const colonMatch = subString.match(/:([^:\s]*)$/);
		if (!colonMatch) {
			return null;
		}

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

	async getSuggestions(
		context: EditorSuggestContext
	): Promise<
		(
			| EmojiData
			| { type: "header"; value: string }
			| { type: "empty"; value: string }
		)[]
	> {
		const query = context.query || "";

		// If query is empty, show recent emojis first
		if (!query) {
			const recentSection: Array<
				| EmojiData
				| { type: "header"; value: string }
				| { type: "empty"; value: string }
			> = [];

			// Add recents header if there are recent emojis
			if (this.plugin.recentEmojis.length > 0) {
				recentSection.push({ type: "header", value: "Recent" });

				// Get emoji data for each recent emoji
				for (const native of this.plugin.recentEmojis) {
					try {
						const emojiData = await getEmojiFromNative(native);
						if (emojiData) {
							recentSection.push(emojiData);
						}
					} catch (e) {
						console.error(
							"Failed to get emoji data for",
							native,
							e
						);
					}
				}
			}

			// Add popular header
			recentSection.push({ type: "header", value: "Frequently Used" });

			// Get some popular emojis
			const popularEmojis = await searchEmojis("thumbs up");
			return [...recentSection, ...popularEmojis];
		}

		// Search for emoji matching the query
		const results = await searchEmojis(query);

		// If no results, show empty message
		if (results.length === 0) {
			return [{ type: "empty", value: "No emojis found" }];
		}

		return results;
	}

	renderSuggestion(
		item:
			| EmojiData
			| { type: "header"; value: string }
			| { type: "empty"; value: string },
		el: HTMLElement
	): void {
		el.empty();

		// For section headers
		if ("type" in item && item.type === "header") {
			el.addClass("suggestion-header");
			el.setText(item.value);
			return;
		}

		// For empty results
		if ("type" in item && item.type === "empty") {
			el.addClass("emoji-suggestion");
			el.setText(item.value);
			return;
		}

		// For regular emoji items
		const suggestionEl = el.createDiv({ cls: "emoji-suggestion" });

		// Create emoji icon
		const emojiEl = suggestionEl.createDiv({ cls: "emoji-icon" });
		emojiEl.setText((item as EmojiData).native);

		// Create description
		const descEl = suggestionEl.createDiv({ cls: "emoji-description" });
		descEl.setText((item as EmojiData).name);
	}

	selectSuggestion(
		item:
			| EmojiData
			| { type: "header"; value: string }
			| { type: "empty"; value: string },
		_evt: MouseEvent | KeyboardEvent
	): void {
		// Don't do anything for headers or empty results
		if ("type" in item) {
			return;
		}

		// Get the editor and replace the trigger with the emoji
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			return;
		}

		const editor = activeView.editor;
		const emojiItem = item as EmojiData;

		// Save in recents
		this.plugin.saveRecentEmoji(emojiItem.native);

		// Replace the text in the editor
		editor.replaceRange(
			emojiItem.native,
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
					.addOption("1", "Default")
					.addOption("2", "Light")
					.addOption("3", "Medium-Light")
					.addOption("4", "Medium")
					.addOption("5", "Medium-Dark")
					.addOption("6", "Dark")
					.setValue(this.plugin.settings.skin.toString())
					.onChange(async (value) => {
						// Convert to number and ensure it's a valid skin tone (1-6)
						const skin = parseInt(value);
						if (skin >= 1 && skin <= 6) {
							this.plugin.settings.skin = skin as
								| 1
								| 2
								| 3
								| 4
								| 5
								| 6;
							await this.plugin.saveSettings();
						}
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

// Helper function to get emoji data from a native emoji character
async function getEmojiFromNative(native: string): Promise<EmojiData | null> {
	try {
		const data = await getEmojiDataFromNative(native);
		return (data as EmojiData) || null;
	} catch (e) {
		console.error("Failed to get emoji data", e);
		return null;
	}
}
