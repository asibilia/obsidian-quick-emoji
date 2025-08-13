import { App } from 'obsidian'

/**
 * Emoji Storage Migration
 * Handles migration from old emoji storage formats to new ones
 */
export class EmojiStorageMigration {
	constructor(
		private app: App,
		private storageKey: string
	) {}

	/**
	 * Migrate recent emojis from old format to new format
	 * Old format: Array of Emoji objects with full data
	 * New format: Array of emoji ID strings
	 * @returns Promise that resolves to the migrated emoji IDs array
	 */
	async migrateRecentEmojis(): Promise<string[]> {
		try {
			const recentData = this.app.loadLocalStorage(this.storageKey)
			if (!recentData) {
				return []
			}

			const parsedData = JSON.parse(recentData)

			// Handle different data formats
			if (!Array.isArray(parsedData)) {
				return parsedData || []
			}

			if (parsedData.length === 0) {
				return []
			}

			// Check if we have old format (array of Emoji objects)
			const firstItem = parsedData[0]

			if (this.isOldEmojiFormat(firstItem)) {
				// Migrate old format to new format (extract IDs)
				const migratedIds = this.extractEmojiIds(parsedData)

				// Save the migrated data immediately
				await this.saveRecentEmojis(migratedIds)

				if (process.env.NODE_ENV === 'development') {
					console.log(
						'Quick Emoji: Migrated recent emojis from old format'
					)
				}

				return migratedIds
			} else {
				// Already new format (array of strings)
				return parsedData
			}
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error(
					'Failed to load recent emojis from localStorage',
					error
				)
			}
			return []
		}
	}

	/**
	 * Save recent emojis to local storage
	 * @param recentEmojis - Array of emoji IDs to save
	 */
	private async saveRecentEmojis(recentEmojis: string[]): Promise<void> {
		try {
			this.app.saveLocalStorage(
				this.storageKey,
				JSON.stringify(recentEmojis)
			)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save migrated recent emojis', error)
			}
		}
	}

	/**
	 * Check if an item is in the old emoji format (object with id/name properties)
	 * @param item - The item to check
	 * @returns true if it's an old format emoji object
	 */
	private isOldEmojiFormat(item: unknown): boolean {
		return typeof item === 'object' && item !== null && 'id' in item
	}

	/**
	 * Extract emoji IDs from old format emoji objects
	 * @param oldFormatData - Array of old format emoji objects
	 * @returns Array of emoji ID strings
	 */
	private extractEmojiIds(oldFormatData: unknown[]): string[] {
		return oldFormatData
			.map((emoji: unknown) => {
				const emojiObj = emoji as {
					id?: string
					name?: string
				}
				return emojiObj.id || emojiObj.name
			})
			.filter(
				(id: string | undefined): id is string =>
					id !== undefined && typeof id === 'string'
			)
	}

	/**
	 * Clean up recent emojis array by removing invalid entries
	 * @param recentEmojis - Array of emoji IDs to clean
	 * @returns Cleaned array of emoji IDs
	 */
	async cleanupRecentEmojis(recentEmojis: string[]): Promise<string[]> {
		// Filter out any null, undefined, or empty string values
		const cleaned = recentEmojis.filter(
			(emojiId) =>
				emojiId &&
				typeof emojiId === 'string' &&
				emojiId.trim() !== '' &&
				// Basic validation for emoji ID format
				emojiId.length > 0 &&
				emojiId.length < 50
		)

		// Save the cleaned list
		try {
			this.app.saveLocalStorage(this.storageKey, JSON.stringify(cleaned))
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Failed to save cleaned recent emojis', error)
			}
		}

		return cleaned
	}

	/**
	 * Clear all recent emojis from storage
	 */
	async clearRecentEmojis(): Promise<void> {
		try {
			this.app.saveLocalStorage(this.storageKey, null)
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error(
					'Failed to clear recent emojis from localStorage',
					error
				)
			}
		}
	}
}
