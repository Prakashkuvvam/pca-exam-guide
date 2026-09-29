# PCA Exam Guide — Website

A complete one-stop study guide for the **Prometheus Certified Associate (PCA)** exam, built with Astro and deployed on Cloudflare Pages.

## Features

- **8 comprehensive pages** covering all 7 PCA exam domains
- **Full-text search** powered by Pagefind
- **Dark/Light mode** with system preference detection
- **Responsive design** — works on desktop, tablet, and mobile
- **Syntax highlighting** for PromQL, YAML, Bash, and JSON
- **Table of contents** with scroll-spy navigation
- **Previous/Next navigation** for seamless reading
- **SEO optimized** with auto-generated sitemap
- **Zero JavaScript** by default — blazing fast

## Tech Stack

- [Astro](https://astro.build/) — Static site generator
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Pagefind](https://pagefind.app/) — Static full-text search
- [Shiki](https://shiki.style/) — Syntax highlighting
- [Cloudflare Pages](https://pages.cloudflare.com/) — Hosting

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
npm run build
```

This will:
1. Build the Astro site to `dist/`
2. Index the site with Pagefind for search

### Preview

```bash
npm run preview
```

## Deployment to Cloudflare Pages

### Option 1: Git Integration (Recommended)

1. Push this repository to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Click **Create a project** → **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 22
6. Click **Save and Deploy**

### Option 2: Direct Upload

1. Run `npm run build` locally
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Click **Create a project** → **Upload assets**
4. Upload the `dist/` directory
5. Click **Deploy**

### Custom Domain

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain and follow the DNS instructions

## Project Structure

```
pca-exam-guide/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Layout.astro          # Main layout with header/footer
│   │   ├── Sidebar.astro         # Domain navigation
│   │   ├── TableOfContents.astro # Per-page TOC
│   │   ├── PrevNext.astro        # Previous/Next navigation
│   │   └── SearchModal.astro     # Search UI
│   ├── content/
│   │   └── docs/                 # All markdown content
│   │       ├── intro.md
│   │       ├── domain-1.md
│   │       ├── domain-2.md
│   │       ├── domain-3.md
│   │       ├── domain-4.md
│   │       ├── domain-5.md
│   │       ├── domain-6.md
│   │       └── domain-7.md
│   ├── layouts/
│   │   └── DocsLayout.astro     # Docs page layout
│   ├── pages/
│   │   ├── index.astro           # Homepage
│   │   ├── intro/index.astro
│   │   ├── domain-1/index.astro
│   │   ├── domain-2/index.astro
│   │   ├── domain-3/index.astro
│   │   ├── domain-4/index.astro
│   │   ├── domain-5/index.astro
│   │   ├── domain-6/index.astro
│   │   └── domain-7/index.astro
│   ├── styles/
│   │   └── global.css           # Global styles + Tailwind
│   └── content.config.ts        # Content collection config
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── wrangler.toml                # Cloudflare Pages config
```

## Content Management

All study content lives in `src/content/docs/`. Each file has frontmatter:

```yaml
---
title: "Domain 1: Observability Concepts"
description: "Monitoring vs Observability, Three Pillars, Push vs Pull..."
domain: 1
weight: 18
order: 1
---
```

To add a new page:
1. Create a new `.md` file in `src/content/docs/`
2. Add the frontmatter above
3. Create a new page in `src/pages/` that references the content

## License

MIT
