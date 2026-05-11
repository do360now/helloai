# HelloAI Architecture

## Overview
Next.js 16 app router landing page serving https://helloai.com/

## Structure
```
app/
├── layout.tsx    # Root layout, Geist fonts, metadata
├── page.tsx      # Main landing (client component)
└── globals.css   # Tailwind v4 + .glass utility
```

## Design
- Background: slate-900 (#0F172A)
- Accent: cyan-400 (#22D3EE), purple-500 (#A855F7)
- Glass effect: backdrop blur, semi-transparent border

## Deployment
- Docker: Multi-stage build (deps → builder → runner)
- Image: do360now/helloai-web:2.9.0
- Make targets: build_helloai_app, build_helloai_image, deploy
