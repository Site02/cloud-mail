# Mail Cat Cloud Mail UI v2

This is a frontend source update for your existing `mail-vue` project. It is not a replacement for the entire Cloudflare Worker repository.

## Apply to GitHub

1. Back up your current branch, or create a new branch.
2. Inside `mail-vue`, merge/replace the matching files in `src/` from this ZIP. Copy `package.json`, `package-lock.json` and `vite.config.js` into that same frontend directory.
3. Keep your existing root `index.html`, `public/` assets, TinyMCE files, environment files and Worker/backend source. Those were not supplied and are not included here.
4. Use Node 20.19+ or Node 22.12+. Run `npm ci` followed by `npm run build` using your existing production environment configuration.
5. Commit the frontend changes and deploy through your existing Cloudflare build/deployment workflow. Do not replace your Worker configuration or deploy this ZIP directly with Wrangler.

## Changes

- Bundled the established paper-textured orange Mail Cat courier and resting-cat artwork in `src/assets/mailcat/`, so Vite manages their asset paths.
- Replaced the incorrect login mascot and gave the illustration a paper frame for clear visibility against orange.
- Removed the bottom-right GitHub project badge. GitHub OAuth sign-in, when enabled by your configuration, remains available.
- Added a final-loaded semantic theme stylesheet with warm paper surfaces in light mode and warm charcoal surfaces in dark mode. Selected mailboxes, links, chart accents and focus colours no longer use the default blue.
- Preserved the existing left navigation design. Refined the adjacent mailbox cards, borders, control contrast and keyboard focus visibility.
- Added consistent local SVG line icons to mailbox and header controls, without adding another icon service.
- Added a restrained mascot illustration to empty inbox states.
- Applied the saved theme on startup and made theme switching preserve other HTML classes. Added reduced-motion handling and a safe optional theme-colour meta update.
- Updated the Vue Vite plugin to version 6 to resolve its dependency incompatibility with Vite 7; included the resulting lockfile.

## Scope and verification

API endpoints, authentication, mailbox actions, permissions and backend processing remain unchanged. Existing environment values are still required. No credentials are included.

Production compilation was checked with a temporary minimal HTML entry because your existing HTML entry and public assets were not uploaded. That temporary entry and its generated build are deliberately excluded from this update. You should build again in your complete repository and smoke-test login, mailbox selection, compose/send, menus and both themes before promoting to production.

Follow-up screenshots were reviewed. Additional fixes preserve the paper-coloured MC badge in dark mode, prevent legacy dark-mode aliases from overriding readable preview colours, and add warm selected-message rows with yellow/dark checkbox indicators. The left navigation layout remains unchanged. Automated browser rendering was unavailable in this environment; production compilation does not replace a smoke test in your complete deployment.
