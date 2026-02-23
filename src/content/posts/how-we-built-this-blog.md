---
title: "How We Built This Blog: Astro, Docker, Nginx, and GitHub Actions"
description: "A deep technical walkthrough of our blog's architecture — from static site generation with Astro and Markdown, to containerized deployment with Docker and Nginx, and fully automated CI/CD with GitHub Actions."
author: "sebastian-franco"
pubDate: 2026-02-21
tags: ["astro", "docker", "nginx", "github-actions", "devops", "architecture", "ci-cd", "static-site"]
category: "dev"
lang: "en"
draft: false
---

## Overview

When we decided to build this blog, we had a few non-negotiable requirements: it had to be fast, rank well on Google, cost nothing (or close to nothing) to run, and give us full editorial control through Pull Requests. No CMS, no database, no admin panel — just code, Markdown, and automation.

This post walks through every layer of the stack we chose, why we chose it, and how the pieces fit together.

Here is a high-level view of the architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTENT LAYER                            │
│                                                                 │
│   Author writes .md file → Opens Pull Request → Team reviews   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ merge to main
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CI/CD LAYER (GitHub Actions)               │
│                                                                 │
│   Checkout → npm install → astro build → Docker build → Push   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ docker pull
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVING LAYER (Docker + Nginx)                │
│                                                                 │
│   Nginx serves static HTML/CSS/JS from /usr/share/nginx/html   │
│   Gzip compression │ Cache headers │ Security headers           │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                      🌐 The Internet
```

Let's break down each layer.

---

## The Content Layer: Markdown + Frontmatter

Every article on this blog is a Markdown file that lives inside the repository at `src/content/posts/`. There is no database, no headless CMS, and no external content API. The repository *is* the content management system.

Each file has a **frontmatter** block at the top — a YAML section between `---` delimiters that holds structured metadata:

```yaml
---
title: "My Article Title"
description: "A short summary for SEO and social sharing."
author: "sebastian-franco"
pubDate: 2026-02-21
tags: ["astro", "docker"]
category: "dev"
lang: "en"
draft: false
---
```

This metadata is validated at build time by Astro's content collections. If someone submits a post with a missing `title` or an invalid `category`, the build fails. That means broken content never reaches production.

The schema is defined in `src/content.config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['dev', 'nocode', 'reads']),
    lang: z.enum(['en', 'es']).default('en'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
```

This gives us type safety across the entire application. Every page that renders a post knows exactly what fields are available, and TypeScript will catch mismatches before the code even runs.

### Why Markdown?

Markdown is portable, readable, version-controllable, and universally understood. If we ever want to migrate away from Astro, our content is just a folder of `.md` files. No vendor lock-in, no export process, no data migration scripts. That kind of portability matters when you are building something you intend to maintain for years.

---

## The Build Layer: Astro

[Astro](https://astro.build) is a static site generator that compiles Markdown (and components) into plain HTML at build time. The key word here is **static**: the output of `astro build` is a `dist/` folder full of `.html`, `.css`, and `.js` files. No server-side runtime, no Node.js process running in production.

### How Astro processes a post

When you run `npm run build`, Astro does the following for each post:

```
src/content/posts/my-article.md
        │
        ▼
┌─────────────────────────┐
│  1. Parse frontmatter   │  → Extracts title, author, date, tags...
│  2. Validate schema     │  → Checks against content.config.ts
│  3. Render Markdown     │  → Converts .md body to HTML
│  4. Apply layout        │  → Wraps in BaseLayout.astro
│  5. Inject SEO          │  → Meta tags, Open Graph, JSON-LD
│  6. Output static HTML  │  → dist/posts/my-article/index.html
└─────────────────────────┘
```

The result is a standalone HTML file that loads instantly, is fully indexable by search engines, and requires zero JavaScript to display the content.

### Routing

Astro uses file-based routing. The file `src/pages/posts/[slug].astro` tells Astro to generate one page per post. The `getStaticPaths()` function returns every post slug at build time:

```typescript
export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}
```

For a post file named `how-we-built-this-blog.md`, Astro generates `dist/posts/how-we-built-this-blog/index.html`. Clean URLs, no file extensions, no client-side routing needed.

### SEO out of the box

Our `BaseLayout.astro` injects the following for every page:

- **Canonical URL** — Prevents duplicate content issues.
- **Open Graph tags** — Controls how the page looks when shared on LinkedIn, WhatsApp, Facebook.
- **Twitter Card tags** — Large image previews on Twitter/X.
- **JSON-LD structured data** — Tells Google this is a `BlogPosting` with a specific author, date, and publisher. This is what enables rich snippets in search results.
- **Sitemap** — Auto-generated at `/sitemap-index.xml` by `@astrojs/sitemap`.
- **RSS feed** — Available at `/rss.xml` for readers who use feed aggregators.

None of this requires any manual work per post. Write your Markdown, fill in the frontmatter, and all SEO metadata is generated automatically.

---

## The Serving Layer: Docker + Nginx

Once Astro builds the site, we need something to serve those static files. We use a **multi-stage Docker build** that produces a minimal Nginx container.

### The Dockerfile

```dockerfile
# Stage 1: Build the static site
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

This is a **multi-stage build**, which means the final image does not contain Node.js, npm, or any of the build dependencies. It only contains Nginx and the compiled HTML/CSS/JS files. The result is a container image under 30MB.

Here is what happens at each stage:

```
┌──────────────────────────────────────┐
│  STAGE 1: builder (node:20-alpine)   │
│                                      │
│  1. Copy package.json                │
│  2. npm ci (install dependencies)    │
│  3. Copy source code                 │
│  4. npm run build → generates dist/  │
│                                      │
│  ⚠ This stage is DISCARDED           │
│    (only dist/ is kept)              │
└──────────────┬───────────────────────┘
               │ COPY --from=builder /app/dist
               ▼
┌──────────────────────────────────────┐
│  STAGE 2: nginx:1.27-alpine         │
│                                      │
│  1. Copy custom nginx.conf           │
│  2. Copy dist/ → /usr/share/nginx/   │
│  3. Expose port 80                   │
│  4. Run nginx                        │
│                                      │
│  ✓ This is the FINAL image (~25MB)   │
└──────────────────────────────────────┘
```

### Nginx configuration

Our `nginx.conf` is tuned for static site performance:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression for text-based assets
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json
               application/javascript text/xml application/xml
               application/xml+rss text/javascript image/svg+xml;

    # Cache static assets aggressively (30 days)
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML pages cached briefly (1 hour) so updates propagate
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Clean URL routing
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    # Custom 404 page
    error_page 404 /404.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Key decisions:

- **Gzip at compression level 6** — A good balance between compression ratio and CPU usage. Level 9 compresses slightly better but costs significantly more CPU time.
- **Immutable cache for assets** — CSS, JS, and images are cached for 30 days with the `immutable` directive. Since Astro hashes filenames on build (e.g., `style.a3f9c.css`), a new build produces new filenames, so stale cache is never an issue.
- **Short cache for HTML** — We want content updates to be visible within an hour, so HTML is cached for 1 hour with `must-revalidate`.
- **`try_files` with `$uri/index.html`** — This is what makes clean URLs work. A request to `/posts/my-article/` resolves to `/posts/my-article/index.html`.
- **Security headers** — `X-Frame-Options` prevents clickjacking, `X-Content-Type-Options` prevents MIME sniffing, and `Referrer-Policy` controls what information is sent when navigating away.

### Why Nginx?

Nginx is the industry standard for serving static files. It handles thousands of concurrent connections with minimal memory, it has been battle-tested for decades, and its configuration language is well-documented. For a static blog, Nginx is borderline overkill — and that is exactly the point. It will never be the bottleneck.

---

## The CI/CD Layer: GitHub Actions

Every time someone merges a Pull Request into `main`, GitHub Actions automatically builds the site, packages it into a Docker image, and pushes it to GitHub Container Registry.

### The workflow file

The workflow lives at `.github/workflows/deploy.yml`:

```yaml
name: Build and Push Blog

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha
            type=raw,value=latest

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

### What each step does

```
Trigger: push to main
         │
         ▼
┌─────────────────────┐
│  1. Checkout        │  Clone the repository
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  2. Login to GHCR   │  Authenticate with GitHub Container Registry
│                     │  using the auto-generated GITHUB_TOKEN
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  3. Metadata        │  Generate image tags:
│                     │  - ghcr.io/difrada/blog:latest
│                     │  - ghcr.io/difrada/blog:sha-abc1234
└────────┬────────────┘
         ▼
┌─────────────────────┐
│  4. Build and Push  │  Execute the multi-stage Dockerfile
│                     │  and push the resulting image to GHCR
└─────────────────────┘
```

A few things worth noting:

- **`GITHUB_TOKEN`** is automatically provided by GitHub Actions. You do not need to create or store any secrets.
- **Two tags are generated**: `latest` always points to the most recent build, and `sha-<commit>` gives you a specific, immutable reference to any particular build. This means you can always roll back to a previous version by pulling a specific SHA tag.
- **The entire pipeline runs in under 3 minutes** on GitHub's free tier, including the Docker build.

### The deployment step

Currently, deploying to the server is a manual `docker pull` + `docker restart`. The command is:

```bash
docker pull ghcr.io/difrada/blog:latest
docker stop blog && docker rm blog
docker run -d --name blog -p 80:80 --restart unless-stopped \
  ghcr.io/difrada/blog:latest
```

This could be automated with an additional step in the workflow that SSHs into the server, but for now, a manual pull after merge is simple and gives us an explicit deployment gate.

---

## The Editorial Flow

This is how the full publishing process works, from idea to live article:

```
 Author                    GitHub                     Server
   │                         │                          │
   │  1. Create branch       │                          │
   │  2. Write .md file      │                          │
   │  3. git push            │                          │
   │ ──────────────────────► │                          │
   │                         │                          │
   │  4. Open Pull Request   │                          │
   │ ──────────────────────► │                          │
   │                         │                          │
   │  5. Team reviews        │                          │
   │ ◄─────────────────────► │                          │
   │                         │                          │
   │  6. Merge to main       │                          │
   │ ──────────────────────► │                          │
   │                         │  7. Actions builds       │
   │                         │     Docker image         │
   │                         │  8. Pushes to GHCR       │
   │                         │ ──────────────────────►  │
   │                         │                          │
   │                         │  9. docker pull + run    │
   │                         │ ──────────────────────►  │
   │                         │                          │
   │                         │  10. Blog is live ✓      │
   │                         │                          │
```

This flow gives us several guarantees:

- **No unauthorized content** — Every article must pass through a Pull Request. The repository's branch protection rules ensure at least one approval before merging.
- **Version history** — Every change is a Git commit. We can see who wrote what, when it was published, and revert any change instantly.
- **Rollback capability** — If a post introduces a build error, we revert the commit and the previous version is restored.
- **No credentials needed for authors** — External contributors fork the repo, write their post, and open a PR. They never need access to the server or deployment pipeline.

---

## Cost

Let's talk about what this costs to run:

| Component | Cost |
|---|---|
| GitHub repository (public) | Free |
| GitHub Actions (2,000 min/month) | Free |
| GitHub Container Registry (public) | Free |
| Domain name | ~$10/year |
| VPS (to run the Docker container) | ~$5/month |

Total: roughly **$70/year**, and the only paid components are the domain and the server. If you use a platform like Vercel or Cloudflare Pages instead of a VPS, the hosting cost drops to zero.

---

## What we would do differently

If we were starting from scratch with unlimited time, a few things we might explore:

- **Automated deployment via SSH** — Adding a step in GitHub Actions that SSHs into the server and runs `docker pull` + `docker restart` automatically after every merge.
- **Preview deployments** — Building a temporary preview for every PR so reviewers can see the article rendered before merging.
- **Image optimization pipeline** — Using Astro's built-in `<Image>` component or a CDN like Cloudflare Images to automatically resize and serve images in modern formats like WebP or AVIF.
- **Full-text search** — Our current search filters by title and tags. A full-text search index (using something like Pagefind) would allow searching within article content.

But for now, the current setup does exactly what we need: fast, free, and fully under our control.

---

## Conclusion

This blog is built on a principle: **use boring technology well**. Markdown, HTML, Nginx, Docker, Git — none of these are new or exciting. But composed thoughtfully, they produce a system that is fast, reliable, easy to maintain, and costs almost nothing to run.

If you want to build something similar, the entire source code is available at [github.com/difrada/blog](https://github.com/difrada/blog). Fork it, make it yours, and start writing.
