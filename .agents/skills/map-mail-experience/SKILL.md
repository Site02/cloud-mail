---
name: map-mail-experience
description: Use when planning or restructuring the cloud-mail UI journeys, page hierarchy, navigation, screen states, or task flows across the public mailbox, signed-in mail, and administration.
---

# Map the mail experience

Turn a UI request into a screen and state specification that another designer or engineer can implement. Base decisions on the current routes, permissions, data states, and rendered pages.

## Scope

- Map the public mailbox at `/find`, sign-in and registration at `/login`, signed-in mail, composition, settings, and administration when they are part of the request.
- Identify the primary task on each screen, its entry point, next action, and recovery path.
- Specify navigation, information priority, responsive behavior, and state changes. Leave colors, type styles, and component styling to `shape-mail-design-system`; leave code changes to `build-mail-interface`.

## Product invariants

- The public mailbox can be opened with an address alone. Do not describe it as private to the current device or require an account or secret.
- A public message must expose its full body and available attachment actions. The app does not automatically clear local history. Attachment caching has 10 MiB per-file and 100 MiB total binary limits, and browser storage can be removed by site-data clearing or storage pressure.
- Online mail availability and locally saved content are distinct states. Make the source and limitations understandable without hiding either.
- Language follows the browser by default and can be changed manually. Plan for every selectable language, long labels, and right-to-left scripts; keep addresses and codes left-to-right.
- Signed-in actions respect existing permissions. Do not put an unavailable action in the primary path.

## Method

1. Read the relevant Vue route, view, store, and translation keys; inspect the rendered screen at desktop and phone width.
2. Write a task map for a first-time visitor, a returning public-mail visitor, a signed-in user, and an administrator only where those roles are in scope.
3. For each screen, name the primary action, secondary actions, hierarchy, and navigation back to a safe state.
4. Cover loading, empty, error, offline, long-content, attachment, and permission states. Include confirmation and focus destination for destructive actions.
5. Check the specification against the existing API and local archive behavior. Mark genuinely new behavior separately from a presentation change.

## Deliverable

Provide a compact screen matrix with columns for route, user goal, primary action, supporting information, states, and phone priority. Add a flow sketch for any multistep task. Record decisions that affect copy or translation keys. A screen is ready for visual design when its main action and every recovery state are unambiguous.

For example, the public mailbox flow should trace: create or enter address → wait for or retrieve mail → open full message → preview or download attachment → return to inbox; also trace offline access to saved mail and manual clearing.
