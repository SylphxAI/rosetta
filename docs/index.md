---
layout: home

hero:
  name: Rosetta
  text: LLM-Powered i18n for Next.js
  tagline: Write English in code. Generate translations with AI. Ship globally.
  image:
    src: /logo.svg
    alt: Rosetta
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/sylphxai/rosetta

features:
  - icon:
      src: /icons/pencil.svg
    title: Zero-Config Source Strings
    details: Write English directly in your code with t("Hello World"). No JSON files, no key management.
  - icon:
      src: /icons/robot.svg
    title: AI-Powered Translation
    details: Generate translations using OpenRouter, Anthropic, or any AI SDK provider. Batch translate entire locales in seconds.
  - icon:
      src: /icons/bolt.svg
    title: Edge Runtime Ready
    details: Works with Next.js Edge Runtime. Compile-time extraction, no Node.js APIs required.
  - icon:
      src: /icons/shield-check.svg
    title: Type-Safe
    details: Full TypeScript support with semantic types and compile-time validation.
  - icon:
      src: /icons/database.svg
    title: Database-Backed
    details: Store translations in PostgreSQL, SQLite, or MySQL via Drizzle ORM adapter.
  - icon:
      src: /icons/adjustments.svg
    title: Admin Dashboard
    details: Headless React hooks for building translation management UIs. tRPC and REST support included.
---

## Quick Example

```tsx
// Server Component
import { t } from '@sylphx/rosetta/server';

export function Welcome() {
  return <h1>{t("Welcome to our app")}</h1>;
}

// Client Component
'use client';
import { useT } from '@sylphx/rosetta-next';

export function Button() {
  const t = useT();
  return <button>{t("Click me")}</button>;
}
```

## Packages

| Package | Description |
|---------|-------------|
| [@sylphx/rosetta](/packages/rosetta) | Core library - hashing, interpolation, server context |
| [@sylphx/rosetta-next](/packages/rosetta-next) | Next.js integration - providers, hooks, locale utilities |
| [@sylphx/rosetta-admin](/packages/rosetta-admin) | Admin dashboard hooks - state management, tRPC/REST |
| [@sylphx/rosetta-drizzle](/packages/rosetta-drizzle) | Drizzle ORM adapter - PostgreSQL, SQLite, MySQL |
| [@sylphx/rosetta-translator-*](/packages/translators) | AI translators - OpenRouter, Anthropic, AI SDK |
