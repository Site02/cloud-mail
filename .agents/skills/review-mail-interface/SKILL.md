---
name: review-mail-interface
description: Use when auditing or accepting cloud-mail UI changes for visual consistency, task completion, accessibility, responsive behavior, localization, and regressions.
---

# Review the mail interface

Review the rendered product independently of the implementation author. Read the requested design and the relevant routes first; use code to explain findings, not as a substitute for observing the interface.

## Coverage

- Public mailbox: create or enter address, receive/list mail, open full content, copy code, preview/download attachment, use saved mail offline, switch address, and manually clear local history.
- Signed-in mail: navigate accounts/folders, compose, read, reply/forward, manage attachments, and access settings within the user's permissions.
- Administration: inspect dense tables, filters, forms, confirmation, error recovery, and restricted actions when those screens changed.
- Shared shell: sign-in, navigation, theme, language selector, install action, notifications, and dialogs.

## Matrix

Use representative 320/375 px phones, a 768 px tablet, and a 1440 px desktop. Check both themes where supported. Check Simplified Chinese, English, a long-label language such as German or Russian, and representative Arabic, Devanagari, CJK, Cyrillic, and Southeast Asian scripts. Sample newly added languages across every writing direction, and check language search, browser matching, and generated translation placeholders. Include empty, loading, network error, stale/local, long subject/address, and multiple-attachment states.

## Observe

- Can a person identify and finish the primary task without guessing? Are error and offline states distinct from an empty inbox?
- Is every action reachable by keyboard, named for assistive technology, and visibly focused? Do dialogs receive focus, retain it, close with Escape where appropriate, and return it to the opener?
- Do text, controls, status indicators, and disabled states remain understandable at the tested sizes and themes? Is there horizontal overflow or clipped translated copy?
- Does the UI accurately describe address-only public access and device-local saved mail? Do attachment and clear actions behave as labeled?
- Are console errors, broken assets, and regressions absent in the changed paths?

## Report

For each finding, give severity, route/state/viewport/locale, reproduction steps, observed versus expected behavior, and a screenshot or code location when available. Separate verified behavior from assumptions. End with a short release recommendation and any untested risk. Do not create a new visual direction during acceptance review.
