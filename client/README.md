# Website

React + Vite + Tailwind. The API/backend will be attached later.

## Project Structure

- `src/web/` — React frontend: pages, components, styles, routing
- `public/` — Static assets (favicon, og-image, logo)

## Quick Start

```bash
# Install dependencies
bun install
# or: yarn install

# Start dev server
bun dev
```

## shadcn/ui

Add components you need, customize them however you want.

```bash
bun x shadcn@latest add button card dialog
```

Components land in `src/web/components/ui/`, import with `@/components/ui/button`.

```tsx
import { Button } from "@/components/ui/button"

<Button variant="outline">Click me</Button>
```

## Routing

Client-side routing uses [wouter](https://github.com/molefrog/wouter). Add routes in `src/web/app.tsx`:

```tsx
import { Route, Switch } from "wouter";

<Switch>
  <Route path="/" component={Home} />
  <Route path="/about" component={About} />
</Switch>
```

## Config

`website.config.json` contains the site name, description, and URL — use it as the source of truth for site-wide values.

## Agent Rules

**CRITICAL: This project uses Tailwind CSS v4.** No `tailwind.config.js`, no `postcss.config.js`, no `@tailwind` directives. All configuration is CSS-first via `@theme` in `src/web/styles.css` and the `@tailwindcss/vite` plugin. Do NOT use Tailwind v3 syntax.
