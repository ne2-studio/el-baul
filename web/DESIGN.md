---
version: alpha
name: El Baúl
description: Warm, intimate design system for a private family photo archive.
colors:
  background: "#F5F1ED"
  foreground: "#3A3230"
  card: "#FFFFFF"
  card-foreground: "#3A3230"
  primary: "#C67B5C"
  primary-foreground: "#FFFFFF"
  secondary: "#E8DED7"
  secondary-foreground: "#3A3230"
  muted: "#E8DED7"
  muted-foreground: "#8B7E79"
  accent: "#C67B5C"
  accent-foreground: "#FFFFFF"
  destructive: "#D45C4D"
  destructive-foreground: "#FFFFFF"
  border: "rgba(58, 50, 48, 0.12)"
typography:
  headline-lg:
    fontFamily: Lora
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.5
  headline-md:
    fontFamily: Lora
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.5
  headline-sm:
    fontFamily: Lora
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.5
  headline-xs:
    fontFamily: Lora
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.5
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: 12px
  md: 14px
  lg: 16px
  xl: 20px
  2xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    padding: 12px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.xl}"
    padding: 12px
  input:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: 20px
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
---

# El Baúl — Design System

## Overview

El Baúl ("the trunk") is a private, shared photo archive for families: a "baúl" holds
albums of photos and "recuerdos" (memories/notes) that a custodian shares with
collaborators and members. The product is Spanish-first and built for an intimate,
non-technical audience — often several generations of the same family — so the UI
favors warmth and reassurance over density or novelty.

The brand personality is **cozy, nostalgic, and trustworthy**, like an heirloom trunk
rather than a cloud storage dashboard: warm beige and terracotta tones instead of cold
neutrals or corporate blue, generously rounded shapes instead of sharp edges, and a
serif/sans pairing that reads as personal and editorial rather than technical. Screens
should feel calm and uncluttered — one primary action per screen, soft supporting
shadows instead of heavy chrome, and plenty of breathing room around photos, which are
always the visual focus.

> **Note:** The codebase also ships a `.dark` theme class inherited from the shadcn
> starter template, but it still uses the generic un-branded neutral/oklch palette and
> has not been given El Baúl-specific colors. Treat only the light-mode palette below
> as the designed system; do not extend the dark-mode values as if they were
> intentional brand choices without revisiting them first.

## Colors

The palette is rooted in a warm, sun-bleached neutral with a single terracotta accent —
evoking old photographs, wood, and paper rather than a screen.

- **Primary / Accent (#C67B5C):** A muted terracotta used for the single most important
  action on a screen (e.g. "Continuar con Google", primary CTAs) and for the accent
  badge/icon treatments. Primary and accent share the same value — there is no separate
  accent color in this system.
- **Background (#F5F1ED):** A warm beige/off-white that grounds every screen, standing
  in for the "inside of the trunk."
- **Foreground (#3A3230):** A dark, warm brown used for body text instead of pure
  black, keeping contrast soft rather than stark.
- **Card (#FFFFFF):** Pure white, reserved for surfaces that sit above the background —
  cards, inputs, sheets — so content areas read as slightly "lifted."
- **Secondary / Muted (#E8DED7):** A lighter beige used for secondary buttons, muted
  backgrounds, and quiet chips/badges that shouldn't compete with primary actions.
- **Muted foreground (#8B7E79):** A muted brown for captions, timestamps, and
  placeholder/helper text.
- **Destructive (#D45C4D):** A warm red-orange for errors and destructive actions
  (revoke access, delete), kept close in hue to primary so it still feels part of the
  same warm family rather than a jarring alarm red.
- **Border (rgba(58, 50, 48, 0.12)):** A soft, low-opacity brown rather than gray, used
  for hairline borders on cards, inputs, and dividers.

## Typography

Two families carry the whole system: **Lora**, a serif used exclusively for headings,
and **Inter**, a sans-serif used for everything else. The pairing is deliberate — Lora
gives titles an editorial, personal warmth (like a caption under a photograph), while
Inter keeps body copy, labels, and UI chrome clean and legible.

- **Headlines (Lora, weight 500):** Reserved for `h1`–`h3` only — screen titles and
  section headers. Never use Lora for body copy, buttons, or dense UI text; it should
  stay a punctuation mark, not the workhorse font.
- **Body (Inter, weight 400):** The default for paragraphs, descriptions, and helper
  text, set at 16px for primary reading and 14px for secondary/supporting text.
- **Labels (Inter, weight 500):** Used for buttons, form labels, and anything the user
  interacts with, so interactive text is always visually distinct (medium weight) from
  passive body copy (normal weight) even at the same size.
- **Caption (Inter, 12px):** Timestamps, metadata, and badge text.

## Layout

The app is a single-column, mobile-first flow (Capacitor-wrapped for Android) with
generous horizontal padding (24px / `px-6`) and centered `max-w-md` content on wider
viewports — there is no multi-column desktop grid. Photos and albums use a masonry/grid
layout so images of varying aspect ratios can sit edge-to-edge within their card without
letterboxing.

Spacing follows Tailwind's 4px-based scale, used consistently rather than as arbitrary
values: tight groups of icons/text use 4–8px gaps, related fields/controls use 12–16px,
and separation between distinct sections or screen edges uses 24–32px.

## Elevation & Depth

Depth is conveyed with soft, low-contrast shadows rather than borders or hard tonal
breaks — consistent with the "resting on paper" feel of the brand. Interactive surfaces
(cards, buttons) sit at a subtle resting elevation and lift slightly on hover:

- Resting cards, primary buttons, and the sign-in card use a small, soft shadow.
- Hover states on cards increase the shadow slightly to suggest they're liftable/tappable.
- Larger elevated elements — icon badges, modals, drawers, and full-screen overlays —
  use progressively larger, softer shadows rather than opacity scrims alone.

Avoid hard drop shadows or sharp-edged elevation; every shadow should look diffuse and
warm, never crisp or gray.

## Shapes

The shape language is **soft and enclosing** — nothing in the interface uses sharp
corners. Interactive elements (buttons, inputs) use a generous rounding around
12–20px, primary content surfaces (cards) round even more at 24px, and avatars, pills,
and icon chips are fully circular. The large 24px card radius combined with the beige
background is what gives screens their "soft trunk/pouch" quality rather than a flat
grid of rectangles.

## Components

### Buttons
Three variants, matching the interactive hierarchy:
- **Primary:** filled terracotta, white text, one per screen/section for the single most
  important action (sign in, save, upload).
- **Secondary:** filled with the light beige `secondary` color — for supporting actions
  that sit next to a primary button.
- **Ghost:** transparent, text-only in `foreground` — for the lowest-emphasis actions
  (cancel, dismiss).

All variants share the same generous rounding, medium-weight label typography, and a
loading state that swaps in a spinner rather than disabling silently.

### Cards
White surfaces on the beige background, large 24px rounded corners, soft resting shadow
that deepens slightly on hover/tap when the card is clickable (album covers, baúl
tiles, recuerdo cards).

### Inputs
White (`#FFFFFF`) background regardless of the surface they sit on, a soft border, and
the same rounded treatment as buttons. Labels sit above the field in `body-sm`; helper
text sits below in `caption`, muted.

### Badges / Chips
Small, filled pills used for status and metadata (roles, plan tier, counts). Default
variant uses the primary color; secondary/outline variants use the muted beige or a
transparent background with a hairline border for lower-emphasis tags.

### Empty States
Centered icon (muted, low opacity) + `headline-xs` title + `body-md` muted subtitle,
with generous vertical padding — used whenever a baúl, album, or list has no content
yet, keeping the tone reassuring rather than clinical ("nothing here" reads differently
than an error).

## Do's and Don'ts

- Do reserve the terracotta `primary` color for the single most important action per
  screen — it loses meaning if used for every button.
- Do use Lora only for `h1`–`h3` headings; never set body copy, buttons, or labels in
  the serif face.
- Do keep corners rounded everywhere — buttons, inputs, cards, avatars, and modals.
  Never mix a sharp-cornered element into an otherwise soft screen.
- Do use soft, warm-toned shadows for elevation instead of borders or gray drop shadows.
- Don't introduce cold neutrals (pure grays, blues) outside of the destructive-state
  hue — the palette should always read warm, even for errors.
- Don't extend the current `.dark` theme values as brand-correct; they're unbranded
  scaffolding and need real design attention before shipping a dark mode.
- Don't crowd a screen with more than one primary button — pair it with secondary/ghost
  actions instead.
