# Window Transparency Toggle

This document explains how the optional glassmorphism effect is implemented and how to disable it through the Preferences dialog.

## Architecture Overview

- **Shared preference**: The TypeScript interface `AppPreferences` located in `src/types/preferences.ts` and the Rust struct `AppPreferences` in `src-tauri/src/lib.rs` expose a `transparencyEnabled` boolean. Both default to `true`.
- **Persistence hooks**: `usePreferences()` and `useSavePreferences()` inside `src/services/preferences.ts` are responsible for loading/saving preferences through the Tauri commands `load_preferences` and `save_preferences`.
- **Theme provider**: `src/components/ThemeProvider.tsx` consumes the preference. It:
  - Stores the current transparency state in React state and `localStorage` (fallback for web-only contexts).
  - Applies or removes CSS classes so the DOM uses opaque colors when transparency is disabled.
  - Calls Tauri window APIs (when available) to enable/disable native effects (`setEffects`, `setTransparentTitlebar`).
- **Consumers**: Components such as `MainWindow`, `TitleBar`, and `LeftSideBar` read `transparencyEnabled` via `useTheme()` and switch between blurred translucent classes and opaque ones.

## User-Facing Controls

The toggle is exposed in `Preferences → Appearance → Enable Transparency` (component `AppearancePane`). It updates both the in-memory state and persisted preferences, so the choice survives restarts.

## Implementation Notes

1. **CSS fallbacks**: When transparency is disabled, ensure backgrounds fall back to `bg-background` and borders to full opacity; otherwise, the window may remain semi-transparent even without native effects.
2. **Tauri capability checks**: `ThemeProvider` guards the window API calls to avoid errors when running in a plain browser (no `__TAURI__` object).
3. **Radius coordination**: Rounded corners (currently 12px) are applied consistently to the main container and title bar so the visual result matches macOS expectations.
4. **State hydration**: The theme provider synchronizes its initial state with persisted preferences. If preferences fail to load, defaults keep transparency enabled.

## Extending the Feature

- To add platform-specific variations (e.g., different effects on Windows), extend the `applyEffects` helper inside the theme provider.
- Additional surfaces should also use `useTheme()` so they respond to the transparency toggle automatically.
- If more preferences are added, merge them inside `useSavePreferences()` the same way `transparencyEnabled` is merged today.
