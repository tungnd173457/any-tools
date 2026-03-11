# Sidebar Redesign — Design Spec

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Rebuild the frontend UI of the AnyTools Chrome extension side panel. The goal is a clean, consistent visual language that mirrors the Sider Fusion reference aesthetic: white background, single purple accent, restrained typography, and no visual clutter.

---

## Design Constraints

- Max 2 font families
- Max 4 font sizes
- Consistent spacing scale (no random values)
- Single primary color: `#7c3aed` (purple)
- No saturated background colors
- No heavy shadows
- No thick borders
- Consistent border radius throughout
- No dense layouts
- Minimal UI elements — no unused controls
- Single visual style, no mixing

---

## Design Tokens

### Colors
```
--color-primary: #7c3aed
--color-primary-light: #a78bfa
--color-primary-tint: #f0ebff        /* active icon bg, user message bg */
--color-bg: #ffffff
--color-surface: #fafafa
--color-border: #e0e0e0
--color-border-light: #f0f0f0
--color-text: #202124
--color-text-secondary: #5f6368
--color-text-muted: #9aa0a6
--color-text-placeholder: #bbb
--color-send-inactive: #9aa0a6
```

### Typography
- Font family: system-ui / -apple-system / BlinkMacSystemFont / 'Segoe UI' (single stack)
- 4 sizes only:
  - `11px` — placeholder text, small labels
  - `12px` — body / message text
  - `13px` — header title
  - `10px` — selector labels, secondary controls

### Spacing scale
`4px · 6px · 8px · 10px · 12px · 14px · 16px`

### Border radius
- `6px` — small controls (tool buttons, selectors)
- `8px` — icon rail buttons
- `10px` — chatbox input
- `12px` — outer shell (dev reference only)
- `50%` — send button, avatar dots

### Borders
- All borders: `1px solid var(--color-border)` or `1px solid var(--color-border-light)`
- No borders thicker than 1px

### Shadows
- Outer shell only (Chrome panel, not applied in component styles): `0 2px 12px rgba(0,0,0,0.06)`
- No shadows on internal components

---

## Layout

### Shell
```
┌─────────────────────────────────┬──────┐
│  Main content (flex: 1)         │ Rail │
│  ├─ Header                      │ 44px │
│  ├─ Messages (scrollable)       │      │
│  └─ Input area                  │      │
└─────────────────────────────────┴──────┘
```

- Right icon rail: `44px` wide, `border-left: 1px solid var(--color-border-light)`
- Main content: fills remaining width, flex column

---

## Components

### 1. Header
- Height: ~40px, `border-bottom: 1px solid var(--color-border-light)`
- Left: gradient dot (16px) + "AnyTools" label (13px, semibold)
- Right: history icon button + new chat icon button (both 26×26, `border-radius: 6px`, `border: 1px solid var(--color-border)`)

### 2. Right Icon Rail
- 4 mode buttons stacked vertically: Chat, Agent, Debug, OCR
- Each button: `32×32px`, `border-radius: 8px`
- **Inactive:** no background, icon color `var(--color-text-muted)`
- **Active:** `background: var(--color-primary-tint)`, icon color `var(--color-primary)`
- No labels, no tooltips required (icons are sufficient)

### 3. Message List
- Scrollable, `padding: 12px`
- `gap: 14px` between messages

#### AI message
- Layout: row, `gap: 8px`
- Left: 20×20px square icon, `border-radius: 6px`, `background: var(--color-primary-tint)`, contains 8px purple dot
- Text: `font-size: 12px`, `color: var(--color-text)`, `line-height: 1.6`, `flex: 1` (full width)

#### User message
- Layout: `justify-content: flex-end`
- Bubble: `max-width: 68%`, `background: var(--color-primary-tint)`, `border-radius: 10px 10px 2px 10px`, `padding: 8px 11px`, `font-size: 12px`
- No avatar

### 4. Input Area
- `padding: 6px 10px 10px 10px`

#### Toolbar row
- `display: flex`, `gap: 5px`, `padding-bottom: 6px`
- Left group: 3 tool buttons (Scissors/prompt, Attach, Bookmarks)
- Right group (margin-left: auto): History, New Chat
- Each button: `26×26px`, `border-radius: 6px`, `border: 1px solid var(--color-border)`, icon `13px`, color `var(--color-text-secondary)`
- **No separator line between toolbar row and chatbox**

#### Chatbox
- `border: 1px solid var(--color-border)`, `border-radius: 10px`
- `padding: 9px 10px 7px 11px`
- Top: textarea / contenteditable placeholder, `font-size: 11px`, `color: var(--color-text-placeholder)`, `min-height: 38px`, `margin-bottom: 7px`
- Bottom row (no inner divider):
  - **Custom selector:** `border: 1px solid var(--color-border)`, `border-radius: 6px`, `padding: 3px 7px`, label `10px`
  - **Model selector:** same style + 10px gradient circle icon (purple) on the left of label
  - **Send button:** `26×26px`, `border-radius: 50%`, `background: var(--color-send-inactive)` when empty / `var(--color-primary)` when has text, arrow icon in white

---

## Existing Modes (unchanged behavior)

| Mode | Icon | Content |
|------|------|---------|
| Chat | MessageSquare | ChatLayout — messages + input |
| Agent | Bot/target | AgentLayout — steps list + agent input |
| Debug | Edit/pen | DebugLayout — 11 debug tool panels |
| OCR | ScanText/grid | OcrLayout — drop zone → preview → result |

Only the visual presentation changes. All existing logic, contexts, and services remain untouched.

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/sidepanel/index.css` | Replace all custom CSS with new design tokens + component styles |
| `src/pages/sidepanel/components/layout/Sidebar.tsx` | Update icon rail: move to right, update active/inactive styles |
| `src/pages/sidepanel/components/layout/ChatLayout.tsx` | Update layout structure |
| `src/pages/sidepanel/components/chat/MessageBubble.tsx` | Implement new AI/user message styles |
| `src/pages/sidepanel/components/chat/ChatInput.tsx` | Rebuild input box with chatbox bottom row |
| `src/pages/sidepanel/components/layout/ChatHeader.tsx` | Update header styling |

All other components (Agent, Debug, OCR, contexts, services) should be styled consistently using the same tokens but their internal logic is not changed.

---

## Out of Scope

- Dark mode (not included in this redesign)
- Agent, Debug, OCR layout-specific redesigns (only token/color consistency applied)
- New features or behavioral changes
- Options page redesign
