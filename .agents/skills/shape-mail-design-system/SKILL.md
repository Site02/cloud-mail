---
name: shape-mail-design-system
description: Use when defining or revising cloud-mail's visual direction, design tokens, components, light and dark themes, density, responsive layout, or right-to-left presentation.
---

# Shape the mail design system

Create a coherent visual language for the public mailbox, sign-in, signed-in mail, and administration. Use the screen priorities from `map-mail-experience` when the task changes page structure.

## Decisions to make

- If direction is open, show three structurally different directions with a short rationale and recommend one. Vary layout and information rhythm as well as color.
- Define shared foundations: type scale, content widths, spacing, color roles, surface layers, borders, focus rings, radii, icon weight, and motion. Give the public and signed-in entry points a recognizable relationship while respecting their different tasks.
- Specify reusable states for buttons, fields, language controls, navigation, mail rows, message reading, attachments, dialogs, empty/error/offline notices, and data tables.
- Define light and dark token values; do not rely on a dark background or color alone to communicate state.
- Document behavior at 320, 375, 768, 1024, and 1440 px, with long German/Russian text and Arabic right-to-left layout. Email addresses and verification codes stay readable left-to-right.

## Project anchors

Inspect `mail-vue/src/style.css`, `/find`, `/login`, `layout`, and Element Plus overrides before proposing tokens. The current public mailbox uses a dark focused layout while the signed-in app uses a dark sidebar with a lighter workspace. Treat those as design inputs, not mandatory final styling.

## Quality bar

- Main actions stand out from secondary utilities through placement, label, and contrast.
- Normal text, control boundaries, and focus indicators remain legible in both themes. Keyboard focus is visible; reduced-motion settings are honored.
- Dense mail lists scan quickly; destructive controls stay distinct and require clear confirmation.
- Avoid decorative cards, shadows, gradients, or animation that obscure mailbox content.
- Prefer semantic tokens over isolated hex values. Define how tokens map to Element Plus variables and page-specific styles.

## Deliverable

Provide a visual direction statement, a token table, component-state examples, and desktop/phone compositions for the key screens. Explain any intentional difference between the public and signed-in experiences. Include acceptance checks for contrast, keyboard focus, text expansion, right-to-left order, and both themes. Implementation belongs to `build-mail-interface`.
