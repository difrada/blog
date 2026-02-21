---
title: "Cómo montamos este blog con Astro, Docker y GitHub Actions"
description: "Un recorrido técnico por la arquitectura de nuestro blog: Astro para el frontend, Docker + Nginx para el hosting, y GitHub Actions para el deploy automático."
author: "Tu Nombre"
pubDate: 2026-02-20
tags: ["astro", "docker", "github-actions", "devops"]
draft: false
---

## La arquitectura

Nuestro blog sigue una arquitectura simple pero efectiva:

1. **Contenido en Markdown** — Cada post es un archivo `.md` en el repositorio.
2. **Astro** genera un sitio estático a partir de esos archivos.
3. **Docker + Nginx** sirven el sitio compilado.
4. **GitHub Actions** automatiza todo: cuando hacemos merge a `main`, se builda la imagen y se sube al registry.

## ¿Por qué Astro?

Astro genera HTML estático puro. Eso significa:

- Carga ultrarrápida
- SEO excelente (Google indexa HTML estático sin problemas)
- Sin JavaScript innecesario en el cliente

```bash
npm run build  # Genera el sitio en dist/
```

## El flujo de publicación

Cualquier persona puede abrir un PR con un nuevo post. Nosotros lo revisamos, y al hacer merge el blog se actualiza automáticamente.

Así de simple.
