# Steven Shoemaker — Tools

React + TypeScript (Vite) app for small, client-side tools. Deploy once to Vercel; each tool is a route under `src/tools/`.

## Why this layout

- **One Vercel project** → e.g. `tools.stevenshoemaker.me` (subdomain of your personal site)
- **Subfolders per tool** (`src/tools/org-chart`, …) so shared shell/routing stays thin
- **Not a separate repo per tool** unless a tool outgrows this (heavy backend, different stack). Link from [stevenshoemaker.me](https://stevenshoemaker.me) to `https://tools.stevenshoemaker.me/org-chart`.

## Tools

| Route | Name |
|---|---|
| `/org-chart` | Org Chart from CSV (Tool No. 001) |

## Fonts (SF Pro)

Shared faces live in `src/fonts/sf.css` + Latin-subset woff2 under `public/fonts/sf/`.

| Token | Face | Use |
|---|---|---|
| `--font-text` | SF Pro Text | UI body, labels, controls |
| `--font-display` | SF Pro Display | Large headlines |
| `--font-rounded` | SF Pro Rounded | Soft accents (pills, brand, friendly labels) |
| `--font-mono` | SF Mono | CSV / code |

Regenerate from your local Apple fonts folder (`~/Documents/apple-san-francisco-pro-fonts`):

```bash
npm run fonts:sync
```

New tools: `import '../../fonts/sf.css'` (or rely on the global import in `main.tsx`) and use the CSS variables.

## Develop

```bash
cd tools
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (Vercel) — keep tools out of the personal site repo

**Recommended:** one Vercel project for this `tools/` app on a subdomain:

| Piece | Where it lives |
|---|---|
| Tool apps (org-chart, …) | This repo → `tools.stevenshoemaker.me` |
| Personal site | Existing site repo → `stevenshoemaker.me` |
| Catalogue | A thin `/tools` page on the personal site (links only) |

1. Deploy this folder (Root Directory = `tools` if monorepo)
2. Add domain `tools.stevenshoemaker.me` in Vercel
3. On `stevenshoemaker.me/tools`, list cards that link out:
   - `https://tools.stevenshoemaker.me/org-chart`
4. Optional: CNAME / DNS only — no proxy, no shared codebase

**Avoid** copying each tool into the personal site. **Avoid** reverse-proxying `/tools/*` into the main site unless you need one origin for cookies/SEO; a subdomain is simpler and keeps deploys independent.

`vercel.json` already rewrites SPA routes to `index.html`.

## Org Chart model

See [`src/tools/org-chart/SANDBOX-MODEL.md`](./src/tools/org-chart/SANDBOX-MODEL.md).
