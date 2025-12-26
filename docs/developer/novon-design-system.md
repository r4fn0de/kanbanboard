# Novon Design System

This document defines the **Novon Design System** for Novon desktop apps (Tauri + React) and the future `novon.tech` website.

It is intentionally designed to:

- Keep **visual consistency** across apps.
- Allow **per-app personality** (accent/brand) without forking UI.
- Be **simple to apply** in new apps.
- Avoid breaking changes in existing code.

This repo already uses Tailwind v4 + shadcn/ui v4 + CSS variables. The Novon Design System formalizes that setup and adds a thin layer for **app identity**.

## Contents

- Tokens and theming model
- Per-app theming (`data-novon-app`)
- How to import and use components (`@/design-system`)
- Conventions (typography, radius, spacing, color)
- Guidance for new apps and the website

---

## 1) Theming model (how it works)

### 1.1 Source of truth: CSS variables in `src/App.css`

The theme is based on CSS variables defined in:

- `:root` for light mode
- `.dark` for dark mode

Examples (already present):

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--ring`
- `--brand`, `--highlight`

The shadcn/Tailwind mapping is done via Tailwind v4 `@theme inline` in `src/App.css`.

### 1.2 Theme switching: `src/components/ThemeProvider.tsx`

The app supports:

- `light`
- `dark`
- `system`

and persists theme in preferences/localStorage.

The ThemeProvider is also responsible for window transparency toggling on supported platforms.

### 1.3 Novon layer: per-app identity with `data-novon-app`

On top of the light/dark theme, Novon adds a single **app identity selector**:

- `document.documentElement.dataset.novonApp = '<app-id>'`

This enables per-app CSS overrides like:

- `html[data-novon-app="modulo"] { ... }`
- `html[data-novon-app="capture"].dark { ... }`

This is implemented by `src/design-system/NovonProvider.tsx`.

---

## 2) Where the design system lives

### 2.1 Folder

The design system is an internal package:

- `src/design-system/`

### 2.2 Public entrypoint

New code should prefer importing UI primitives from:

- `@/design-system`

This file re-exports:

- UI primitives from `src/components/ui/*`
- `cn()` utility
- Theme helpers (Novon provider, token getter)

This allows future apps to share the same import paths, even if the underlying component implementation changes.

---

## 3) API reference

### 3.1 `NovonProvider`

File:

- `src/design-system/NovonProvider.tsx`

Purpose:

- Wraps the existing `ThemeProvider`
- Sets `data-novon-app` on `document.documentElement`

Usage:

```tsx
import { NovonProvider } from '@/design-system'

export function AppRoot() {
  return (
    <NovonProvider>
      {/* app routes */}
    </NovonProvider>
  )
}
```

### 3.2 App identity

File:

- `src/design-system/app.ts`

- `NOVON_APP_ID` reads `import.meta.env.VITE_NOVON_APP_ID` with fallback to `'modulo'`.
- `applyNovonAppId()` applies the dataset.

Environment variable:

- `VITE_NOVON_APP_ID=modulo`

### 3.3 Tokens

File:

- `src/design-system/tokens.ts`

`NOVON_TOKENS` contains the canonical set of token names.

`getNovonToken(key)` reads computed token values.

Example:

```ts
import { getNovonToken } from '@/design-system'

const brand = getNovonToken('brand')
```

---

## 4) Per-app themes

### 4.1 Theme file

Per-app overrides live in:

- `src/design-system/novon.css`

It should only contain **identity overrides**, not full theme rewrites.

Recommended override targets:

- `--brand` (used for selections, editor accents, etc.)
- `--highlight` (used for highlight surfaces)

Avoid overriding foundational tokens (`--background`, `--foreground`, etc.) unless a specific app truly requires it.

### 4.2 Example: Modulo

The current repo is the `modulo` app.

It already defines `--brand` in dark mode. Novon keeps that behavior by placing the same value under:

- `html[data-novon-app='modulo'].dark { --brand: ... }`

### 4.3 Adding a new app theme

1. Choose an app id (example: `capture`).
2. Set `VITE_NOVON_APP_ID=capture` in the new app.
3. Add to `src/design-system/novon.css`:

```css
html[data-novon-app='capture'] {
  --highlight: oklch(...);
}

html[data-novon-app='capture'].dark {
  --brand: oklch(...);
}
```

---

## 5) Component usage guidelines

### 5.1 Prefer `@/design-system` imports

Instead of:

```tsx
import { Button } from '@/components/ui/button'
```

Prefer:

```tsx
import { Button } from '@/design-system'
```

This is a convention. Existing imports remain valid and are not removed.

### 5.2 Don’t fork primitives casually

UI primitives in `src/components/ui/*` are shared infrastructure.

- Prefer composition over modification.
- If you need new variants, add them in the primitive using `cva` patterns.

---

## 6) Visual consistency rules (Novon guidelines)

### 6.1 Typography

The canonical fonts are defined in `src/App.css`:

- `--font-sans`
- `--font-mono`
- `--font-serif`

Use Tailwind typography utilities, but do not hardcode font families in components.

### 6.2 Radius

Radius is controlled by:

- `--radius`

Components should use the existing Tailwind/shadcn patterns (e.g. `rounded-lg`) and avoid custom pixel radii.

### 6.3 Spacing

The project uses Tailwind spacing with a base `--spacing` token.

Do not introduce new spacing scales.

### 6.4 Colors

- `--primary` is the primary UI action color.
- `--brand` is an identity accent used by editor selection and other brand-specific surfaces.

Rule of thumb:

- Use `primary` for buttons and main actions.
- Use `brand` for “signature” highlights/selections.

---

## 7) Guidance for novon.tech (website)

The website should follow the same token naming and foundational decisions:

- Same font(s)
- Same neutral palette philosophy
- Same radius

But it can have its own layout patterns.

Recommended approach:

- Keep a shared token file (or copy) for the website.
- Use per-product accent (same concept as `data-novon-app`).

---

## 8) Troubleshooting

### 8.1 Theme not applied

- Confirm `NovonProvider` is wrapping the app.
- Confirm `src/design-system/novon.css` is loaded after `src/App.css`.

### 8.2 App id not set

- Confirm `VITE_NOVON_APP_ID` is set, or fallback is acceptable.
- Confirm `document.documentElement` has `data-novon-app`.

---

## 9) Change policy

- Additive changes are preferred.
- Avoid token renames.
- Avoid breaking component APIs.

When adding new primitives, export them via `@/design-system`.
