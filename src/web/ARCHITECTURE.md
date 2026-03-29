# Frontend Architecture

## Layers

- `core`: app-level wiring (`providers`, `routing`)
- `modules`: feature modules (`public`, `auth`, `dashboard`, `admin`)
- `shared`: reusable cross-module contracts (`types`, `constants`, `helpers`, `utils`)
- `components`: reusable UI and layout components
- `lib`: framework/library integrations (`i18n`, `toast`)

## Module Rules

Each module keeps its own:

- `*.types.ts`
- `*.consts.ts`
- `*.routes.ts`

Use module files for feature-specific contracts and route metadata.

## Import Direction

- `core` can import from `modules`, `shared`, `components`, `lib`
- `modules` can import from `shared`, `components`, `lib`
- `shared` should not import from `modules`
