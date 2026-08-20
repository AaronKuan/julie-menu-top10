# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **static, client-side web page** — an animated café digital menu ("動態菜單" / LOUISA COFFEE). It consists of only three source files at the repo root: `index.html`, `style.css`, and `script.js`.

Key facts for developing here:

- No package manager, build step, tests, or lint config exist (no `package.json`, no lockfiles, no CI). There is nothing to install or compile. The update script is intentionally a no-op.
- Run it by serving the repo root as static files, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/`. Opening `index.html` via `file://` also works but a local HTTP server is cleaner.
- The page renders an infinite CSS-animation loop (~40s) across three promo scenes; `script.js` restarts the loop on the `animationend` event of the final element (`.Ccut2`).
- External dependencies are all loaded from CDNs at runtime: Bootstrap and jQuery (jsdelivr/cloudflare), Google Fonts, and **all product images** (imgur.com, ibb.co). Outbound internet access is required for the page to look correct.
- The layout is designed for a 16:9 viewport (`.style` uses `height: 56.25vw`); verify visuals at that aspect ratio.
- Testing is purely visual/manual (load in a browser and confirm scenes animate and loop). There are no automated tests to run.
