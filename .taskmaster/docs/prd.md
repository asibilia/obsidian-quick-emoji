# Quick Emoji Plugin - Product Requirements Document

## Executive Summary

Quick Emoji is a mature Obsidian plugin that enables quick emoji insertion via typing `:`. This PRD focuses on implementing a new shortcode-first rendering system where emojis are stored as `:shortcode:` in Markdown but rendered as native emoji glyphs in Live Preview and Reading modes.

---

## Current State (v1.0.4)

### Existing Features ✅

- **Emoji Picker Trigger**: Type ":" to activate emoji suggester in any editor
- **Search Functionality**: Real-time emoji search using emoji-mart SearchIndex with debouncing
- **Recent Emoji History**: Persistent storage of recently used emojis with configurable count (5-50)
- **Favorites System**: Star emojis for quick access, persistent across sessions
- **Skin Tone Support**: Customizable default skin tone for supported emojis
- **Settings Management**: Comprehensive settings tab with emoji preview and management
- **Cross-Platform**: Works on desktop and mobile Obsidian
- **Performance**: Lazy-loaded emoji-mart for fast plugin startup
- **Code Organization**: Source files in `src/` directory, modular structure

### Technical Architecture

- **Core**: TypeScript-based Obsidian plugin using Plugin API
- **Dependencies**: emoji-mart library for data and search functionality
- **Storage**: LocalStorage for recent emoji persistence, Obsidian data API for settings
- **UI**: EditorSuggest API for popup interface and suggestion rendering
- **Build System**: ESBuild for compilation and bundling

---

## New Enhancement: Shortcode-First Rendering

### Overview

Transform the plugin to always insert emoji as `:shortcode:` into Markdown files, then render these as native emoji glyphs in Live Preview and Reading modes via post-processing. This approach ensures compatibility with other platforms (like Discourse) that use emoji shortcodes.

### Goals

1. **Replace suggester insertion** to always write `:shortcode:` (e.g., `:smile:`) instead of native emoji
2. **Add Markdown post-processor** that converts `:shortcode:` → emoji glyph during rendering
3. **Respect boundaries**: Skip code blocks, inline code, and math segments
4. **Apply skin tone** when rendering based on user settings
5. **Maintain existing features**: Keep recents/favorites logic intact
6. **Mode-aware rendering**: Show shortcodes in Source Mode, emojis in Live Preview/Reading

### Non-Goals

- No custom parser overhaul or core Markdown replacement
- No toggle to disable rendering (always on by default)
- No changes to the emoji picker UI itself

### Acceptance Criteria

- [x] In Strict Source Mode, suggestions insert `:shortcode:` (partially done - only in source mode currently)
- [ ] In Live Preview/Reading, rendered content shows emoji glyphs for `:shortcode:` (NOT WORKING)
- [ ] Code blocks, inline code, and math are not altered
- [ ] Always insert shortcodes regardless of mode (currently mode-dependent)
- [ ] Lint passes with no errors
- [ ] No runtime errors in console

### Implementation Status

**Completed:**

- ✅ Mode detection utility functions (isSourceMode, isStrictSourceMode)
- ✅ Settings toggle for inserting shortcodes in source mode

**In Progress:**

- 🔄 Post-processor code written but NOT VERIFIED WORKING in Obsidian
- 🔄 Suggester currently inserts shortcodes only in Strict Source Mode
- 🔄 Need to update to ALWAYS insert shortcodes

**Not Started:**

- ❌ Debug and fix post-processor (not rendering in Live Preview/Reading)
- ❌ Update favorites/recents display to handle shortcode storage
- ❌ Fix recents tracking (broken when inserting shortcodes)
- ❌ Remove unnecessary source mode setting
- ❌ Comprehensive testing across all scenarios
- ❌ Documentation updates

### Technical Details

- **Shortcode Format**: `:emoji_id:` using emoji-mart's id field
- **Post-processor**: Uses `registerMarkdownPostProcessor` with text node walking
- **Resolution**: Search by id first, then name as fallback
- **Skin Tone**: Applied via `getEmojiWithSkin` utility during rendering

---

## Future Roadmap (Post-Shortcode Implementation)

### Phase 1: Plugin Submission Compliance

- Remove "Obsidian" from plugin title/headers (reserved for first-party)
- Update copyright information
- Clean up logging statements
- Settings UI compliance (sentence case, proper heading API)

### Phase 2: Performance & Stability

- Optimize emoji search performance
- Improve memory management
- Enhanced error handling
- Better cleanup on plugin unload

### Phase 3: User Experience Enhancements

- Improved visual design and animations
- Better mobile experience
- Customizable keyboard shortcuts
- Enhanced settings organization

### Phase 4: Feature Expansion

- Custom emoji categories
- Emoji shortcuts and aliases
- Export/import preferences
- Integration with other plugins

### Phase 5: Advanced Features

- Custom emoji support (user uploads)
- Emoji usage analytics
- Advanced search features
- Collaborative emoji sharing

---

## User Personas & Flows

### Current User Personas

- **Note-takers**: Users who want to add emojis to enhance their notes
- **Content Creators**: Users creating rich, expressive content
- **Mobile Users**: Users needing efficient emoji input on mobile
- **Cross-Platform Users**: NEW - Users who copy/paste between Obsidian and platforms like Discourse

### User Flow (After Implementation)

1. User types ":" in any editor → emoji suggester appears
2. User types search terms → filtered emoji results shown
3. User navigates with arrow keys → preview of selected emoji
4. User presses Enter → `:shortcode:` inserted at cursor
5. In Live Preview/Reading → `:shortcode:` renders as emoji glyph
6. In Source Mode → `:shortcode:` remains visible as text

---

## Risks and Mitigations

### Technical Risks

- **Performance Impact**: Post-processor might slow rendering
  - Mitigation: Optimize regex, cache results, limit scope
- **Compatibility**: Existing notes with native emojis
  - Mitigation: Only process shortcodes, leave native emojis untouched
- **Edge Cases**: Complex nested structures
  - Mitigation: Thorough boundary testing

### User Experience Risks

- **Breaking Change**: Users expecting native emoji insertion
  - Mitigation: Clear documentation, consider migration command
- **Learning Curve**: Users unfamiliar with shortcodes
  - Mitigation: Visual feedback in suggester showing shortcode format

---

## Development Priorities

1. **IMMEDIATE**: Complete shortcode-first implementation
   - Update suggester to always insert shortcodes
   - Fix any remaining post-processor issues
   - Comprehensive testing

2. **NEXT**: Plugin submission compliance
   - Address naming and branding issues
   - Clean up code quality issues

3. **FUTURE**: Performance and feature enhancements
   - Based on user feedback
   - Maintain backward compatibility

---

## Technical Specifications

- **Obsidian API Version**: 0.15.0+
- **TypeScript Version**: Latest stable
- **Build Tools**: ESBuild
- **Dependencies**:
  - emoji-mart (for data and search)
  - Obsidian API (for plugin integration)
- **Regex Pattern**: `/:([a-z0-9_+-]+):/gi`

---

## Success Metrics

- All emojis stored as `:shortcode:` in .md files
- Seamless rendering in Live Preview/Reading modes
- No performance degradation
- Positive user feedback on cross-platform compatibility
- Zero critical bugs in production
