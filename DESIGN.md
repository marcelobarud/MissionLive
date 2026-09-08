---
name: MissionLive
description: Metas claras, progresso visível e colaboração calma.
colors:
  ink: "#20332f"
  ink-strong: "#1b352f"
  sage: "#335f53"
  sage-soft: "#e5efea"
  mist: "#f1f4f1"
  paper: "#fbfcfa"
  sand: "#f4ede1"
  clay: "#9d584f"
  line: "#d8e3dd"
  muted: "#71827b"
typography:
  display:
    fontFamily: "Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5.8rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.07em"
  headline:
    fontFamily: "Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.35rem, 5vw, 4rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.07em"
  body:
    fontFamily: "Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.66rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.22em"
rounded:
  sm: "0.55rem"
  md: "0.8rem"
  lg: "1.1rem"
  xl: "1.5rem"
  pill: "999px"
spacing:
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0.72rem 1.05rem"
    height: "2.9rem"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.md}"
    padding: "0.72rem 1.05rem"
    height: "2.9rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "2.9rem"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "0.8rem"
  progress:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.pill}"
    height: "0.55rem"
---

# Design System: MissionLive

## Overview

**Creative North Star: “Calm Focus”**

MissionLive should feel like a clear desk at the beginning of a meaningful work session: quiet enough to focus, structured enough to move. The redesign keeps the product recognizable through its existing navigation, Portuguese product language, progress-first model and Tabler Icons, while replacing saturated contrast with mineral neutrals and a single deep-sage action color.

The home surface leads with the next action. Metas use a responsive grid of compact progress cards; Equipes use concise collective cards. Warm sand and muted clay are reserved for context and risk states; they never compete with progress.

**Key Characteristics:**
- Mineral background, paper surfaces and green-grafite ink.
- One calm action color for primary controls and progress.
- Generous page headers with compact, information-dense cards and sections.
- Flat tonal layering with restrained shadows and visible focus.

## Colors

Use `ink` for reading and navigation, `sage` for actions/progress, `mist` for the application canvas, `paper` for working surfaces, and `sand`/`clay` only for secondary semantic states.

### Primary
- **Deep Sage** (`#335f53`): primary buttons, active navigation, progress bars and focus anchors.

### Secondary
- **Sage Wash** (`#e5efea`): selected navigation, contextual emphasis and quiet callouts.

### Tertiary
- **Warm Sand** (`#f4ede1`): low-intensity warning/context state, never a decorative accent.

### Neutral
- **Green-Grafite** (`#20332f`): headings, readable primary copy and high-contrast controls.
- **Mist** (`#f1f4f1`): application background.
- **Paper** (`#fbfcfa`): cards, fields and dialogs.
- **Quiet Ink** (`#71827b`): supporting copy and metadata.
- **Fine Line** (`#d8e3dd`): sparse separators and form strokes.

**The One Accent Rule.** Deep Sage carries action and progress; do not add another competing accent to a screen.

## Typography

**Display Font:** Aptos (with Segoe UI and system sans fallbacks)
**Body Font:** Aptos (with Segoe UI and system sans fallbacks)
**Label Font:** Aptos, uppercase only for orientation cues.

**Character:** Tight, confident headings establish focus; open body text keeps dates, permissions and goal descriptions calm and scannable.

### Hierarchy
- **Display** (700, `clamp(3rem, 7vw, 5.8rem)`, `.92`): the Início greeting and its single thesis.
- **Headline** (700, `clamp(2.35rem, 5vw, 4rem)`, `.98`): page titles.
- **Title** (700, `1.18rem`, `1.22`): section titles and goal names.
- **Body** (400, `1rem`, `1.55`): descriptions and guidance.
- **Label** (800, `.66rem`, `.22em`, uppercase): sparse location/context cues.

**The Quiet Metadata Rule.** Metadata supports the decision; it never receives the same weight as a goal name, action or progress value.

## Layout

Use a fixed desktop navigation rail around `16.5rem` and a centered content area capped at `1260px`. Desktop pages use generous outer padding and a `2.5rem` header rhythm. Início is a two-column command center followed by one full-width next-step track, compact metrics and two lower columns. Metas and Equipes use responsive card grids with restrained borders and consistent alignment.

At `900px`, the rail and page padding narrow. At `720px`, navigation becomes a drawer, page headers stack, filters and rows release secondary information, and Início becomes one column. At `420px`, metrics remain two-up and all goal/team rows become readable stacks. Touch controls remain at least `2.75rem` high.

## Elevation & Depth

Depth comes from tonal separation and a restrained ambient shadow (`0 .35rem 1.25rem rgba(32,51,47,.055)`). Hover may lift an actionable surface by `1px`; no surface receives a dramatic shadow merely because it is a card. Avoid gradients, backdrop blur and ornamental glow.

**The Flat Surface Rule.** A surface is flat at rest; depth is reserved for interaction, dialogs and deliberate grouping.

## Shapes

Use gently rounded controls and panels (`.8rem` to `1.5rem`) with fine borders. Progress tracks are pill-shaped. Stronger two- or three-pixel rules are reserved for section anchors, never repeated around every component.

## Components

### Buttons
- Primary is deep sage with paper text; secondary is paper with a fine border and deep-sage text.
- Hover changes background or border and lifts by `1px`; focus uses a visible `3px` ring.
- Destructive actions use muted clay only when the action is genuinely destructive.

### Cards / Containers
- Use paper panels for forms, dialogs and detail summaries.
- Use cards only where they improve scanning and grouping; keep their chrome quiet and consistent.
- Internal padding follows `1rem`, `1.5rem` and `2rem`.

### Inputs / Fields
- White-paper fields use a one-pixel border, `.8rem` radius and `2.9rem` minimum height.
- Labels remain associated with controls; errors use inline text and `role="alert"`.

### Navigation
- The rail is light and quiet, with sage active text, sage wash background and a two-pixel active rule.
- Mobile uses the existing focusable drawer, backdrop, Escape behavior and focus return.

### Progress & Lists
- Progress uses deep sage on a neutral track and always carries a percentage/count in text.
- Metas expose status, context, preview de até cinco passos, progress, team/deadline metadata and navigation in one scannable card.
- Equipes expose collective state, active/completed counts and participants without changing permissions or data.

## Do's and Don'ts

### Do:
- **Do** let one action lead every screen.
- **Do** use calm neutrals for space and deep sage for action/progress.
- **Do** preserve existing routes, data, API contracts, permissions, Tabler Icons and loading/error/empty states.
- **Do** keep Portuguese copy concrete and operational.

### Don't:
- **Don't** reintroduce saturated orange/navy contrast as the default visual language.
- **Don't** add cards for decorative metrics or duplicate information; each card must support a clear decision or navigation action.
- **Don't** add gradients, glassmorphism, decorative badges, oversized metrics or shadows without a semantic job.
- **Don't** use color alone to communicate status, permission, completion or urgency.
