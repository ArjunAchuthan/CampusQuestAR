# design-reference/

Drop the **cleaned** Figma Make export here (App.tsx, index.css, package.json, etc.) before pointing Antigravity at this project.

Before copying it in:
1. Remove `.figma/`, `.gitattributes`, `.mise.toml` from the export
2. Simplify `vite.config.ts` to drop the Figma-only plugins (`figmaSiteConfiguration`, `figmaErrorOverlayReplay`, `figmaReactRefreshBoundaryFallback`, `figmaMakeKitPlugin`) — keep just `react()`, `tailwindcss()`, and the `@` alias

This folder is **read-only reference**, not the app itself — see `AGENTS.md` and `directives/` for how it should be used.
