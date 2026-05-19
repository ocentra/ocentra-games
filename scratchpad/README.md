# @ocentra/leaderboard-playground

Repo-local Vite playground for leaderboard and SVG layout work.

## Purpose

- Prototype layout, SVG structure, and control surfaces before moving stable pieces into shared app code.
- Stay outside the published app routes and product surfaces.
- Use the same repo workspace, linting, and type-checking flow as the rest of the monorepo.

## Scripts

- `npm --prefix scratchpad run dev`
- `npm --prefix scratchpad run build`
- `npm --prefix scratchpad run lint`
- `npm --prefix scratchpad run type-check`

## Notes

- This package is intentionally separate from the main app and asset editor.
- Generated files such as `dist/` and `node_modules/` are ignored locally.
- Keep prototype code here until it is ready to be extracted into shared UI or app code.
