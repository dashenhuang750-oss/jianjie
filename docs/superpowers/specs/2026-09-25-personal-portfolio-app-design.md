# Personal Portfolio App Design

Status: proposed for user review

## Goal

Make `/app` the working Huang Wenhao personal portfolio, not the unrelated Lithos product landing page. Keep the portfolio's existing profile data, module routing, APIs, and interactions. Retain the requested immersive, full-screen mountain hero, but show the mountain photograph clearly and make the pointer-following highlight unmistakably visible.

The `/` cover page remains the entry page. The existing backend, API contracts, persistence, profile schema, and repository directory structure remain unchanged.

## Verified Context

- `server.js` serves `public/cover.html` at `/` and `public/index.html` for `/app` and `/app/*`.
- `public/cover.html` already links to `/app?module=projects`, `skills`, and `contact`.
- The current `index.html` builds a React Lithos page into `public/index.html`. `src/App.tsx` contains static Lithos copy and controls that do not open profile modules.
- `public/app.js` is an existing profile application: it loads `/api/profile`, renders profile modules, reads the `module` query parameter, and handles profile navigation, assistant chat, guestbook, analytics, and pointer-driven interactions.
- The pre-Lithos `public/index.html` host is recoverable from Git history and contains the DOM contract expected by `public/app.js`. `public/styles.css`, the profile API, and module data are still present.
- `public/media/mountain-hero.webp` is the local mountain background already used by the personal-site cover.

## Chosen Approach

Reconnect the existing personal-site application rather than duplicating its module and API behavior in React. Restore/adapt its HTML host as the `/app` build entry and keep `public/app.js` plus `public/styles.css` as the functional layer. The host must continue to include the DOM IDs and form elements consumed by `public/app.js`; the existing Vite build must emit that host to `public/index.html` rather than replacing it with the Lithos screen. No server routing changes are needed.

Style the personal landing state to preserve the supplied full-screen visual direction: the mountain image fills the hero at natural, clear brightness; a pointer-following radial light brightens the image locally without dimming the entire photograph. Keep text readable with localized scrims or glass surfaces rather than a heavy global dark filter. Retain smooth pointer tracking, responsive sizing, keyboard navigation, and reduced-motion/touch fallbacks.

## Personal Content and Interaction

- Render the name, role, headline, summary, availability, modules, and contact data from `/api/profile`; do not hard-code Lithos copy or duplicate profile data in the page.
- Use real personal-site navigation: Projects, Skills, Experience, Contact, and the existing About, AI Assistant, and Guestbook modules where appropriate. Links/buttons should call the existing module-opening behavior and preserve deep links such as `/app?module=projects`.
- The main hero action opens the Projects module; the contact action opens Contact. Module cards, back/close behavior, assistant chat, guestbook, and theme controls remain usable through their existing handlers and APIs.
- Preserve `/` cover page behavior, analytics, and all backend/API/storage contracts.

## Approaches Considered

1. **Reuse and restyle the existing personal application (selected).** Lowest duplication and lowest backend risk; restores the intended profile data and behavior while allowing the hero to retain the requested visual direction.
2. **Port all profile modules into the current React screen.** Could produce a unified component model, but would reimplement or bridge substantial existing app logic and increase regression risk for chat, guestbook, route handling, and profile rendering.
3. **Keep Lithos and add a second personal-app route.** Preserves both screens but leaves `/app` ambiguous and conflicts with the requirement that this site be a personal website.

## Scope and Non-Goals

- In scope: `/app` HTML host and styling, its build output contract, real personal navigation/actions, and direct mountain spotlight treatment.
- Out of scope: `/` redesign, backend/server/API/storage changes, new dependencies, profile-content invention, and unrelated refactors.
- Existing user edits to profile/configuration and cover files must be preserved.

## Acceptance Criteria

1. `/app` shows Huang Wenhao's profile content and no Lithos product branding/copy.
2. The mountain photo is clear at rest; moving the pointer produces an obvious localized highlight that tracks the pointer. The effect degrades gracefully on touch/reduced-motion devices and does not block controls.
3. Projects/Skills/Contact navigation and existing cover-page deep links open the corresponding real modules; primary actions work.
4. Existing profile rendering, assistant, guestbook, and API-backed behavior remain wired to their current endpoints.
5. The source/build arrangement continues to serve `/app` from `public/index.html` without replacing the personal host during `npm run check`.
6. `npm run check` and targeted tests pass; local Node-server checks verify `/app`, its mountain asset, and representative module routes.

## Verification Plan

- Add/update a focused regression test for the personal host DOM contract, background asset/highlight styles, and module route hooks.
- Run `npm run check` and the focused test suite.
- Run the Node server locally and verify `/app`, `/app?module=projects`, `/app?module=skills`, and `/app?module=contact` load the app shell and profile data; test interactions in desktop and mobile browser views.
- Confirm backend files and API contracts have no diff.
