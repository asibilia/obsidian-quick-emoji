# Product Requirements Document: Emoji Insertion Format Option

## Executive Summary

This PRD addresses [GitHub Issue #7](https://github.com/asibilia/obsidian-quick-emoji/issues/7) which requests an optional setting to control whether emojis are inserted as Unicode characters or shortcodes. The current plugin (v1.2.0+) always inserts shortcodes, but users want the flexibility to choose Unicode insertion for better live preview visibility and portability.

---

## Problem Statement

### Current State

- Plugin always inserts emojis as shortcodes (`:emoji_name:`)
- Shortcodes only render as emojis in Reading Mode, not Live Preview
- Users cannot choose their preferred insertion format

### User Pain Points

1. **Limited Live Preview Support**: Shortcodes appear as text in Live Preview mode, reducing visual feedback
2. **Portability Concerns**: Unicode emojis work across more platforms and applications than shortcodes
3. **No User Choice**: Users cannot customize the insertion behavior to match their workflow preferences

### Business Impact

- User satisfaction: Medium impact - affects user experience and workflow preferences
- Adoption: Low-medium impact - may influence plugin adoption by users who prefer Unicode
- Complexity: Low impact - straightforward setting addition

---

## Solution Overview

Add a new user setting that allows choosing between two emoji insertion formats:

1. **Unicode** (default for backward compatibility): Insert native emoji characters (🙂)
2. **Shortcode**: Insert shortcode format (`:smile:`)

This maintains the existing rendering infrastructure while giving users control over the insertion behavior.

---

## Requirements

### Functional Requirements

#### FR-1: Insertion Format Setting

- **Description**: Add a toggle setting in the plugin settings tab
- **Acceptance Criteria**:
  - Setting appears in plugin settings with clear labels
  - Default value is "Unicode" for backward compatibility
  - Setting persists across Obsidian sessions
  - Setting changes take effect immediately without restart

#### FR-2: Unicode Insertion Mode

- **Description**: When Unicode mode is selected, insert native emoji characters
- **Acceptance Criteria**:
  - Emoji suggester inserts Unicode characters (e.g., 🙂) instead of shortcodes
  - Recent emoji clicks insert Unicode characters
  - Favorite emoji clicks insert Unicode characters
  - Skin tone settings apply to Unicode insertions
  - Unicode emojis display correctly in all Obsidian views

#### FR-3: Shortcode Insertion Mode

- **Description**: When Shortcode mode is selected, maintain current behavior
- **Acceptance Criteria**:
  - Emoji suggester inserts shortcode format (e.g., `:smile:`)
  - Recent emoji clicks insert shortcodes
  - Favorite emoji clicks insert shortcodes
  - Existing rendering system continues to work for shortcodes
  - Shortcode sanitization remains functional

#### FR-4: Settings UI Integration

- **Description**: Integrate the new setting into existing settings tab
- **Acceptance Criteria**:
  - Setting appears in logical location within current settings
  - Uses consistent UI patterns with existing settings
  - Includes helpful description text
  - Setting label is clear and unambiguous

### Non-Functional Requirements

#### NFR-1: Performance

- No measurable performance impact on emoji insertion
- Setting change should be instantaneous

#### NFR-2: Compatibility

- Maintains backward compatibility with existing shortcode content
- Works with all existing plugin features (favorites, recents, skin tones)
- Compatible with current Obsidian versions

#### NFR-3: Code Quality

- Follows existing code patterns and architecture
- Maintains type safety with TypeScript
- Includes appropriate error handling

---

## Technical Specification

### Settings Schema Update

```typescript
export interface QuickEmojiSettings {
    skin: SkinSetting
    recentCount: number
    favorites: string[]
    insertionFormat: 'unicode' | 'shortcode' // NEW
}

export const DEFAULT_SETTINGS: QuickEmojiSettings = {
    skin: 0,
    recentCount: 20,
    favorites: [],
    insertionFormat: 'unicode' // NEW - default to Unicode for compatibility
}
```

### Implementation Areas

#### 1. Settings Tab (`src/ui/settings-tab.ts`)

- Add new dropdown/toggle setting for insertion format
- Position after skin tone setting for logical grouping
- Include descriptive text explaining the difference

#### 2. Emoji Suggester (`src/ui/emoji-suggester.ts`)

- Modify `selectSuggestion()` method to check setting
- Implement conditional logic for Unicode vs shortcode insertion
- Ensure skin tone application works for both formats

#### 3. Settings Integration (`src/main.ts`)

- Update settings loading/saving to include new field
- Ensure proper migration for existing users

#### 4. Recent/Favorite Emoji Handling

- Update click handlers in settings tab to respect format setting
- Ensure consistent behavior across all insertion points

### User Interface Design

#### Setting Layout

```
Default skin tone: [Dropdown: Default/Light/Medium-light/...]
Insertion format:  [Dropdown: Unicode emoji/Shortcode]
Recent emoji count: [Slider: 5-50]
```

#### Setting Description

"Choose how emojis are inserted into your notes:

- **Unicode emoji**: Insert as native characters (🙂) - visible in all views
- **Shortcode**: Insert as text codes (:smile:) - rendered in Reading Mode"

---

## Implementation Plan

### Phase 1: Core Setting Implementation

1. Update `QuickEmojiSettings` interface and defaults
2. Add setting UI in settings tab
3. Implement setting persistence

### Phase 2: Insertion Logic Update

1. Modify `EmojiSuggester.selectSuggestion()` method
2. Update recent emoji click handlers
3. Update favorite emoji click handlers

### Phase 3: Testing & Validation

1. Test both insertion modes
2. Verify setting persistence
3. Test skin tone compatibility
4. Validate backward compatibility

### Phase 4: Documentation Update

1. Update README with new setting information
2. Update any relevant documentation

---

## Success Metrics

### Primary Metrics

- **User Adoption**: Measure setting usage in telemetry (if available)
- **Issue Resolution**: GitHub issue #7 marked as resolved
- **User Feedback**: Positive response on implementation

### Secondary Metrics

- **Bug Reports**: No increase in bug reports related to emoji insertion
- **Performance**: No measurable performance degradation
- **Compatibility**: No reported compatibility issues

---

## Risks and Mitigation

### Risk 1: User Confusion

- **Risk**: Users might not understand the difference between formats
- **Mitigation**: Clear setting descriptions and potentially example text

### Risk 2: Backward Compatibility

- **Risk**: Existing users might be surprised by default behavior
- **Mitigation**: Choose Unicode as default (maintains v1.0 behavior) and clearly document the change

### Risk 3: Rendering Issues

- **Risk**: Unicode emojis might not render consistently across platforms
- **Mitigation**: Use standardized Unicode emoji characters and test across platforms

---

## Future Considerations

### Potential Enhancements

1. **Mixed Mode**: Allow both formats in same document with different triggers
2. **Auto-Detection**: Automatically choose format based on existing content in note
3. **Import/Export**: Convert between formats in bulk

### Technical Debt

- Consider consolidating emoji insertion logic into a single service
- Evaluate if rendering infrastructure could be simplified

---

## Appendix

### Related Issues

- [GitHub Issue #7](https://github.com/asibilia/obsidian-quick-emoji/issues/7): Original feature request

### Dependencies

- No new external dependencies required
- Uses existing emoji-mart library functionality
- Leverages current Obsidian Plugin API

### Testing Scenarios

1. New installation with default settings
2. Existing installation upgrade behavior
3. Switching between formats multiple times
4. Skin tone application in both modes
5. Recent/favorite emoji functionality in both modes

---

**Document Version**: 1.0  
**Created**: January 2025  
**Author**: AI Assistant  
**Status**: Draft - Pending Review
