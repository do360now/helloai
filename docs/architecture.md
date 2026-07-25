# HelloAI Architecture

## Overview
Next.js 16 app router landing page serving https://helloai.com/

## Interactive map
- **[architecture.html](./architecture.html)** — single-page visual map (layers, API, scoring, flows, agents, deploy)
- **[architecture.json](./architecture.json)** — machine-readable architecture graph (source of truth for the HTML)

Open the HTML via a static server for live JSON reload, or as a file (embedded snapshot fallback):

```bash
npx serve docs   # then open /architecture.html
# or
xdg-open docs/architecture.html
```

## Structure
```
app/
├── layout.tsx    # Root layout, Geist fonts, metadata
├── page.tsx      # Main landing (client component)
└── globals.css   # Tailwind v4 + .glass utility
```

## Design
- Background: #080A12
- Primary accent: #00E5A0 (mint green)
- Secondary accent: #6366F1 (indigo)
- Tertiary: #F472B6 (pink)
- Glass effect: backdrop blur, semi-transparent border (see app/globals.css)
- Each model has a distinct brand color (from data/models.json)

## Deployment
- Docker: Multi-stage build (deps → builder → runner, standalone output)
- Image: do360now/helloai-web (VERSION from Makefile, e.g. 2.14.33+; also tagged :latest)
- Make targets: `make bump_version` (always separate), `make build_helloai_app`, `make build_helloai_image`, `make push_helloai_image`, `make az_deploy`
- Full one-command: `make deploy` (after data prep + verify)
