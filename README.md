# Quick Emoji

A plugin for [Obsidian](https://obsidian.md) that enables quick, in-editor emoji insertion.

<a href="https://www.buymeacoffee.com/alecsibilia" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- **Shortcode-First Storage**: Stores emojis as `:shortcode:` format for maximum compatibility
- **Smart Rendering**: Displays shortcodes in Source Mode, emojis in Live Preview/Reading modes
- **Cross-Platform Compatible**: Works seamlessly across different operating systems and devices
- **Fast & Responsive**: Optimized with lazy loading and debounced search for smooth performance
- Type `:` to trigger an emoji picker directly in your editor
- Search for emojis by name or description with intelligent debouncing
- Recent emoji history for quick access to frequently used emojis
- Favorites support with star icon for quick access
- Customize skin tone for supported emojis
- Configure the number of recent emojis to remember
- Lightweight startup with on-demand emoji data loading

## How It Works: Shortcode Storage

Quick Emoji uses a **shortcode-first approach** that ensures your emoji data remains consistent and portable across different platforms and devices.

### What are Shortcodes?

Shortcodes are text representations of emojis in the format `:emoji_name:` (e.g., `:smile:`, `:rocket:`, `:heart:`). This is the same format used by platforms like GitHub, Discord, and Slack.

### Benefits of Shortcode Storage

- **Cross-Platform Compatibility**: Your notes will display correctly on any device or operating system
- **Future-Proof**: Shortcodes remain readable even if emoji rendering changes
- **Version Control Friendly**: Git and other version control systems handle shortcodes cleanly
- **Search-Friendly**: You can search for `:smile:` to find all instances of that emoji
- **No Sync Issues**: Eliminates emoji rendering problems when syncing between devices

### Smart Display Modes

- **Source Mode**: Shows the actual shortcodes (`:wave:`, `:tada:`) for precise editing
- **Live Preview Mode**: Automatically renders shortcodes as emoji glyphs (👋, 🎉) while you type
- **Reading Mode**: Displays beautiful emoji glyphs for the best reading experience

This approach gives you the benefits of both worlds: reliable, portable storage with beautiful visual rendering.

## Usage

1. Type `:` in any editor to activate the emoji suggester
2. Continue typing to search for specific emojis (e.g., `:smile`, `:rocket`)
3. Use arrow keys to navigate and Enter to select an emoji
4. The selected emoji will be inserted as a shortcode (e.g., `:smile:`)
5. In Live Preview and Reading modes, shortcodes automatically render as emoji glyphs
6. Click the star icon (⭐) next to any emoji to add it to your favorites for quick access

### Viewing Your Emojis

- **Source Mode**: See the raw shortcodes (`:wave:`, `:heart:`) for editing
- **Live Preview**: See emoji glyphs (👋, ❤️) while typing, shortcodes when actively editing
- **Reading Mode**: See beautiful emoji glyphs (👋, ❤️) for the best reading experience

## Settings

- **Default skin tone**: Choose from Default, Light, Medium-Light, Medium, Medium-Dark, or Dark
- **Recent emoji count**: Set the number of recent emojis to remember (5-50)
- **Favorite emojis**: View and manage your starred favorite emojis (click to insert)
- **Recent emojis**: View and manage your recently used emojis (click to insert)

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode if necessary
3. Click Browse and search for "Quick Emoji"
4. Install the plugin and enable it

### Manual Installation

1. Download the latest release from the GitHub releases page
2. Extract the files into your vault's `.obsidian/plugins/quick-emoji/` directory
3. Reload Obsidian
4. Enable the plugin in Obsidian settings

## Support

If you encounter any issues or have feature requests, please open an issue on the GitHub repository.

## License

This project is licensed under the MIT License.
