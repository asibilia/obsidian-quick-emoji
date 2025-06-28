import { Notice } from 'obsidian';
import type { EmojiMartData } from '@emoji-mart/data';

// Use a module-level variable to cache the SearchIndex instance (singleton pattern).
let searchIndex: any | null = null;
let isInitializing = false;

/**
 * Lazily initializes and returns the emoji-mart SearchIndex.
 * The initialization, including dynamic import of the large data file,
 * only runs on the first call. Subsequent calls return the cached instance.
 * @returns A promise that resolves to the SearchIndex instance, or null on failure.
 */
export async function getSearchIndex(): Promise<any | null> {
	// If already initialized, return the cached instance immediately.
	if (searchIndex) {
		return searchIndex;
	}

	// If initialization is already in progress, wait for it to complete.
	// This prevents race conditions if getSearchIndex is called multiple times
	// before the first call resolves.
	if (isInitializing) {
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (!isInitializing) {
					clearInterval(interval);
					resolve(searchIndex);
				}
			}, 50);
		});
	}

	isInitializing = true;

	try {
		// Dynamically import the emoji-mart library and its data.
		// This creates separate chunks that are loaded on demand.
		const { init, SearchIndex } = await import('emoji-mart');
		const emojiData = await import('@emoji-mart/data');

		// Perform the initialization.
		await init({ data: emojiData as EmojiMartData, set: 'native' });

		// Cache the initialized SearchIndex.
		searchIndex = SearchIndex;
		
		if (process.env.NODE_ENV === 'development') {
			console.log('Quick Emoji: SearchIndex initialized successfully.');
		}
		return searchIndex;
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Quick Emoji: Failed to initialize emoji-mart SearchIndex:', error);
		}
		new Notice('Quick Emoji: Could not load emoji data. Please try reloading Obsidian.');
		return null;
	} finally {
		isInitializing = false;
	}
}

/**
 * Synchronously check if the search index is ready without triggering initialization.
 * Useful for providing loading states in the UI.
 * @returns True if the search index is already initialized.
 */
export function isSearchIndexReady(): boolean {
	return searchIndex !== null;
} 