import { App, Editor, MarkdownView } from 'obsidian'

/**
 * Helper function to get the currently active editor in Obsidian.
 * @param app - The Obsidian App instance
 * @returns The active Editor instance or null if none is active
 */
export function getActiveEditor(app: App): Editor | null {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView)
	return activeView?.editor || null
}
