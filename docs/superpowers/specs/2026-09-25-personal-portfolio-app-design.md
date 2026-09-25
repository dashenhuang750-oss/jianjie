# Personal Website Homepage and Portfolio App Design

Status: proposed for user review

## Goal

Apply the recognizable Lithos motion treatment to Huang Wenhao's actual personal-site homepage, and make `/app` the working personal portfolio rather than the unrelated Lithos product landing page. Keep the personal site's identity and content, existing profile data, module routing, APIs, and interactions. Show the mountain photograph clearly and make the pointer-following highlight unmistakably visible.

`/` remains the personal cover/entry page and gains the Lithos-inspired motion. `/app` remains the personal profile application and regains its real modules. The request is frontend-only: backend, APIs, database/persistence, profile schema, server routing, and repository directory structure remain unchanged.

## Verified Context

- `server.js` serves `public/cover.html` at `/` and `public/index.html` for `/app` and `/app/*`.
- `public/cover.html` is already Huang Wenhao's mountain-image cover. Its script tracks pointer movement and draws clouds/parallax, and its Projects/Skills/Contact links target `/app?module=...`.
- The current `index.html` builds a React Lithos page into `public/index.html`. `src/App.tsx` contains static Lithos copy and controls that do not open profile modules.
- `public/app.js` is an existing profile application: it loads `/api/profile`, renders profile modules, reads the `module` query parameter, and handles profile navigation, assistant chat, guestbook, analytics, and pointer-driven interactions.
- The pre-Lithos `public/index.html` host is recoverable from Git history and contains the DOM contract expected by `public/app.js`. `public/styles.css`, the profile API, and module data are still present.
- `public/media/mountain-hero.webp` is the local mountain background already used by the personal-site cover.

## Chosen Approach

Keep the existing personal-site architecture rather than duplicating its module and API behavior in React. On `/`, preserve the personal cover's name, university, motto, navigation, entry action, and mountain asset, adding a clear Lithos-inspired pointer spotlight and restrained entrance/zoom motion. The mountain itself remains at readable natural brightness; localized light and small text scrims provide emphasis without globally dimming the image. Keep pointer effects smooth, responsive, keyboard/touch-safe, and compatible with reduced-motion settings.

For `/app`, restore/adapt the existing profile application's HTML host and keep `public/app.js` plus `public/styles.css` as its functional layer. The host must include the DOM IDs and form elements consumed by `public/app.js`; the existing Vite build must emit this personal-site host to `public/index.html` instead of the Lithos page. No server routing changes are needed.

## Personal Content and Interaction

- Render the name, role, headline, summary, availability, modules, and contact data from `/api/profile`; do not hard-code Lithos copy or duplicate profile data in the page.
- Use real personal-site navigation: Projects, Skills, Experience, Contact, and the existing About, AI Assistant, and Guestbook modules where appropriate. Links/buttons should call the existing module-opening behavior and preserve deep links such as `/app?module=projects`.
- The cover's Enter action opens `/app`; its Projects/Skills/Contact links open the corresponding modules. The portfolio hero actions open Projects and Contact. Module cards, back/close behavior, assistant chat, guestbook, and theme controls remain usable through their existing handlers and APIs.
- Preserve existing analytics and all backend/API/storage contracts.

## Approaches Considered

1. **Add the motion treatment to the personal cover and reconnect the existing profile application (selected).** Lowest duplication and lowest backend risk; preserves the real homepage identity, restores the intended profile data and behavior, and reuses the existing visual and functional layers.
2. **Port all profile modules into the current React screen.** Could produce a unified component model, but would reimplement or bridge substantial existing app logic and increase regression risk for chat, guestbook, route handling, and profile rendering.
3. **Keep Lithos and add a second personal-app route.** Preserves both screens but leaves `/app` ambiguous and conflicts with the requirement that this site be a personal website.

## Scope and Non-Goals

- In scope: `/` cover motion/highlight and front-end entry links; `/app` HTML host and styling, its build output contract, real profile navigation/actions, and personal modules.
- Out of scope: backend/server/API/database/storage changes, new dependencies, profile-content invention, and unrelated refactors.
- Existing user edits to profile/configuration and cover files must be preserved.

## Acceptance Criteria

1. `/` remains Huang Wenhao's personal cover, not Lithos branding, and its mountain photo is clear at rest.
2. The Lithos-inspired pointer highlight is obvious, follows the pointer, and does not block cover navigation; motion respects touch and reduced-motion settings.
3. Cover actions and Projects/Skills/Contact deep links lead to the corresponding personal-site modules under `/app`.
4. `/app` shows profile content from the existing API and contains no Lithos product copy; assistant, guestbook, analytics, and API-backed behavior remain wired to their current endpoints.
5. The source/build arrangement continues to serve the personal host at `/app` from `public/index.html` after `npm run check`.
6. `npm run check` and targeted tests pass; local Node-server checks verify `/`, `/app`, the mountain asset, and representative module routes.

## Verification Plan

- Add/update focused regression tests for cover motion/highlight, the personal host DOM contract, mountain asset, and module route hooks.
- Run `npm run check` and the focused test suite.
- Run the Node server locally and verify `/`, `/app`, and `/app?module=projects|skills|contact` load the expected personal pages and profile data; test interactions in desktop and mobile browser views.
- Confirm `server.js`, backend files, API contracts, and database/persistence code have no diff.
