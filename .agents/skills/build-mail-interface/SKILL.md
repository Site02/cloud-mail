---
name: build-mail-interface
description: Use when implementing an agreed cloud-mail UI design in Vue, Element Plus, and SCSS while preserving mailbox behavior, localization, accessibility, and responsive layouts.
---

# Build the mail interface

Implement a defined screen or visual system in the existing Vue app. Read `map-mail-experience` for a new flow or `shape-mail-design-system` for new visual rules only when that part of the design is unresolved.

## Before editing

- For whole-interface work, read the current accepted experience and visual design before editing. For a bounded page change, read the relevant part. Trace the route, view, shared component, store, request, permission check, and translation keys. Keep mail behavior separate from presentation changes.
- Record the current states and actions in scope, including public attachment download, local archive, full-message reading, language switching, and installability where present.
- Identify shared components or tokens before adding one-off page styles.

## Implementation rules

- Use semantic buttons, links, inputs, headings, lists, and dialog behavior. All icon-only actions need an accessible name, visible focus, and a keyboard path.
- Keep the primary action and recovery state clear at phone width. Support long labels, right-to-left Arabic, and left-to-right email addresses/codes.
- Add user-facing strings through the existing localization system for every selectable language. Keep placeholders and meaning aligned; validate generated translations and identify any component-level fallback honestly.
- Represent loading, empty, error, offline, and locally saved data distinctly when the flow can reach them.
- Preserve permission checks and the public mailbox's address-only access model. Do not add automatic local cleanup; respect existing attachment cache limits and browser storage failure states.
- Follow existing data and security boundaries for message HTML, attachments, and authentication. Do not weaken them to achieve a visual effect.

## Verification

Run the smallest relevant tests and production build. Exercise the changed flow in a real browser at phone and desktop widths, with keyboard navigation, both themes where applicable, and at least one long-text locale plus Arabic. Verify any touched modal closes and returns focus appropriately. Resolve console errors and overflow before marking the implementation ready. Report what was checked and what remains uncertain.
