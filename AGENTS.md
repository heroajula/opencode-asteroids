# AGENTS.md

Vanilla JS Asteroids clone (HTML5 Canvas). No framework, no bundler, no dependencies.

## Tooling

- There is no `package.json`, build step, test suite, or linter. Do not run `npm install` / `npm test`; they will fail.
- Verification is manual: open `index.html` in a browser, or serve with `npx serve .` (port 3000).

## Architecture

- All game logic lives in the single file `game.js`, loaded as a classic (non-module) `<script>` from `index.html`. No imports; everything is globals/classes in one scope.
- `game.js` reads `#canvas` by ID from `index.html`. The canvas is fixed at 800x600: if you change size, update both `width`/`height` in `index.html` and the `W`/`H` constants in `game.js`.
- Game loop: `requestAnimationFrame(loop)` → `update(dt)` / `draw()` with `dt` clamped to 0.05s.
- Entities (Ship, Bullet, Asteroid, Particle) follow a `dead` flag + `filter()` pattern each frame.
- World is toroidal: positions pass through `wrap(v, W|H)`.
- Asteroid `size` is 1–3 and indexes into the parallel arrays `RADII`/`SPEEDS`/`POINTS` (index 0 unused). Big→medium→small splitting via `split()`.
- States: `'playing' | 'dead' | 'gameover'`; Space restarts on game over.

## Conventions

- User-facing strings and code comments are in Spanish; keep new ones consistent.
