# Quick Emoji

A plugin for [Obsidian](https://obsidian.md) that enables quick, in-editor emoji insertion.

<a href="https://www.buymeacoffee.com/alecsibilia" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- **Flexible Insertion Format**: Choose between Unicode emoji or shortcode insertion to match your workflow
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

## How It Works: Insertion Format Options

Quick Emoji gives you the flexibility to choose how emojis are inserted into your notes, allowing you to pick the approach that best fits your workflow.

### Insertion Format Options

#### Unicode Emoji (Default)

- **What it is**: Inserts native emoji characters directly (🙂, 🚀, ❤️)
- **Best for**: Users who want emojis visible in all Obsidian views immediately
- **Pros**: Universal visibility, immediate visual feedback, works everywhere
- **Cons**: May not sync perfectly across all devices/platforms

#### Shortcode Format

- **What it is**: Inserts text codes (`:smile:`, `:rocket:`, `:heart:`) that render as emojis
- **Best for**: Users who want maximum compatibility and portability
- **Pros**: Perfect cross-platform sync, version control friendly, future-proof
- **Cons**: Only renders as emojis in Live Preview and Reading modes

### What are Shortcodes?

Shortcodes are text representations of emojis in the format `:emoji_name:` (e.g., `:smile:`, `:rocket:`, `:heart:`). This is the same format used by platforms like GitHub, Discord, and Slack.

### Benefits of Shortcode Format

- **Cross-Platform Compatibility**: Your notes will display correctly on any device or operating system
- **Future-Proof**: Shortcodes remain readable even if emoji rendering changes
- **Version Control Friendly**: Git and other version control systems handle shortcodes cleanly
- **Search-Friendly**: You can search for `:smile:` to find all instances of that emoji
- **No Sync Issues**: Eliminates emoji rendering problems when syncing between devices

### Smart Display Modes (Shortcode Format Only)

When using shortcode format, Quick Emoji provides intelligent rendering across different Obsidian modes:

- **Source Mode**: Shows the actual shortcodes (`:wave:`, `:tada:`) for precise editing
- **Live Preview Mode**: Automatically renders shortcodes as emoji glyphs (👋, 🎉) while you type
- **Reading Mode**: Displays beautiful emoji glyphs for the best reading experience

This gives you the benefits of both worlds: reliable, portable storage with beautiful visual rendering.

## Usage

1. Type `:` in any editor to activate the emoji suggester
2. Continue typing to search for specific emojis (e.g., `:smile`, `:rocket`)
3. Use arrow keys to navigate and Enter to select an emoji
4. The selected emoji will be inserted according to your chosen format:
   - **Unicode format**: Direct emoji character (🙂)
   - **Shortcode format**: Text code (`:smile:`) that renders as emoji in Live Preview/Reading modes
5. Click the star icon (⭐) next to any emoji to add it to your favorites for quick access
6. Access recent and favorite emojis from the plugin settings for quick insertion

### Viewing Your Emojis

The viewing experience depends on your chosen insertion format:

**Unicode Format**: Emojis appear as native characters (👋, ❤️) in all modes

**Shortcode Format**:

- **Source Mode**: See the raw shortcodes (`:wave:`, `:heart:`) for editing
- **Live Preview**: See emoji glyphs (👋, ❤️) while typing, shortcodes when actively editing
- **Reading Mode**: See beautiful emoji glyphs (👋, ❤️) for the best reading experience

## Settings

- **Insertion format**: Choose how emojis are inserted into your notes:
  - **Unicode emoji**: Insert as native characters (🙂) - visible in all views
  - **Shortcode**: Insert as text codes (`:smile:`) - rendered in Reading Mode
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
