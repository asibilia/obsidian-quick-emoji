import { Notice } from 'obsidian'

import type { EmojiMartData } from '@emoji-mart/data'

// Use a module-level variable to cache the SearchIndex instance (singleton pattern).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let searchIndex: any | null = null
let isInitializing = false
// Queue for resolvers waiting for initialization to complete
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingResolvers: Array<(value: any) => void> = []

/**
 * Lazily initializes and returns the emoji-mart SearchIndex.
 * The initialization, including dynamic import of the large data file,
 * only runs on the first call. Subsequent calls return the cached instance.
 * @returns A promise that resolves to the SearchIndex instance, or null on failure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSearchIndex(): Promise<any | null> {
	// If already initialized, return the cached instance immediately.
	if (searchIndex) {
		return searchIndex
	}

	// If initialization is already in progress, wait for it to complete.
	// This prevents race conditions if getSearchIndex is called multiple times
	// before the first call resolves.
	if (isInitializing) {
		return new Promise((resolve) => {
			pendingResolvers.push(resolve)
		})
	}

	isInitializing = true

	try {
		// Dynamically import the emoji-mart library and its data.
		// This creates separate chunks that are loaded on demand.
		const { init, SearchIndex } = await import('emoji-mart')
		const emojiData = await import('@emoji-mart/data')

		// Perform the initialization.
		await init({ data: emojiData as EmojiMartData, set: 'native' })

		// Cache the initialized SearchIndex.
		searchIndex = SearchIndex

		if (process.env.NODE_ENV === 'development') {
			console.log('Quick Emoji: SearchIndex initialized successfully.')
		}
		return searchIndex
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error(
				'Quick Emoji: Failed to initialize emoji-mart SearchIndex:',
				error
			)
		}
		new Notice(
			'Quick Emoji: Could not load emoji data. Please try reloading Obsidian.'
		)
		return null
	} finally {
		isInitializing = false
		// Resolve all pending promises with the final result
		const result = searchIndex
		while (pendingResolvers.length > 0) {
			const resolve = pendingResolvers.shift()
			if (resolve) {
				resolve(result)
			}
		}
	}
}

/**
 * Synchronously check if the search index is ready without triggering initialization.
 * Useful for providing loading states in the UI.
 * @returns True if the search index is already initialized.
 */
export function isSearchIndexReady(): boolean {
	return searchIndex !== null
}

/**
 * Clear the cached SearchIndex instance.
 * Useful for plugin cleanup to free memory.
 */
export function clearSearchIndex(): void {
	searchIndex = null
	isInitializing = false
	if (process.env.NODE_ENV === 'development') {
		console.log('Quick Emoji: SearchIndex cache cleared.')
	}
}
