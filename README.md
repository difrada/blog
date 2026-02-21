# Nuestro Blog

Blog estático construido con **Astro** + **Markdown**, servido con **Docker + Nginx**, y automatizado con **GitHub Actions**.

---

## Estructura del proyecto

```
blog-project/
├── content/posts/           ← Aquí van los artículos en Markdown
│   ├── _TEMPLATE.md         ← Plantilla para nuevos posts
│   ├── bienvenidos.md       ← Post de ejemplo
│   └── como-montamos-el-blog.md
├── src/
│   ├── layouts/BaseLayout.astro  ← Layout principal con SEO
│   ├── pages/
│   │   ├── index.astro      ← Página de inicio (lista posts)
│   │   ├── about.astro      ← Página "Nosotros"
│   │   ├── 404.astro        ← Página de error
│   │   ├── rss.xml.ts       ← Feed RSS automático
│   │   └── posts/[slug].astro ← Página dinámica de cada post
│   ├── components/PostCard.astro
│   ├── styles/global.css
│   └── content.config.ts    ← Schema del frontmatter
├── public/                  ← Archivos estáticos (favicon, imágenes)
├── .github/
│   ├── workflows/deploy.yml ← GitHub Actions (build + push Docker)
│   └── PULL_REQUEST_TEMPLATE.md
├── astro.config.mjs
├── Dockerfile               ← Multi-stage: Node build + Nginx
├── nginx.conf               ← Config de Nginx optimizada
├── docker-compose.yml
└── package.json
```

---

## Qué necesitas antes de empezar

- **Node.js 20+** (para desarrollo local)
- **Docker** (para correr el blog en producción)
- **Git** y una cuenta de GitHub
- Un **servidor/VPS** donde correr el contenedor (DigitalOcean, Hetzner, AWS, etc.)

---

## Paso a paso: Setup inicial

### 1. Crear el repositorio en GitHub

1. Ve a https://github.com/new
2. Crea un repo nuevo (ej: `nuestro-blog`)
3. **NO** inicialices con README (ya tenemos uno)
4. Hazlo **público** (para que GitHub Container Registry funcione gratis)

### 2. Subir el proyecto al repo

```bash
cd blog-project
git init
git add .
git commit -m "feat: setup inicial del blog"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/nuestro-blog.git
git push -u origin main
```

### 3. Configurar las cosas que dicen "TU-USUARIO" o "tu-dominio"

Hay varios archivos donde necesitas poner tus datos reales:

| Archivo | Qué cambiar |
|---|---|
| `astro.config.mjs` | Cambiar `https://tu-dominio.com` por tu dominio real |
| `public/robots.txt` | Cambiar `https://tu-dominio.com` por tu dominio real |
| `src/pages/about.astro` | Cambiar link al repo de GitHub |
| `docker-compose.yml` | Cambiar `TU-USUARIO/TU-REPO` cuando uses producción |
| `src/layouts/BaseLayout.astro` | Cambiar `siteName` si quieres otro nombre |

### 4. Habilitar GitHub Packages (Container Registry)

Esto es automático. Cuando hagas push a `main`, GitHub Actions intentará subir la imagen Docker a `ghcr.io/tu-usuario/nuestro-blog`. La primera vez que corra el Action, el paquete se crea automáticamente.

Después de la primera ejecución, ve a:
- Tu repo → **Settings** → **Actions** → **General**
- En "Workflow permissions", asegúrate de que está en **Read and write permissions**

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con hot reload
npm run dev
# → Abre http://localhost:4321

# Build de producción (genera dist/)
npm run build

# Preview del build
npm run preview
```

### Probar el Docker localmente

```bash
docker compose up --build
# → Abre http://localhost
```

---

## Cómo escribir un nuevo post

### Si eres del equipo (tienes acceso al repo)

1. Crea una rama nueva:
   ```bash
   git checkout -b post/titulo-de-mi-post
   ```

2. Copia la plantilla:
   ```bash
   cp content/posts/_TEMPLATE.md content/posts/mi-nuevo-post.md
   ```

3. Edita el archivo con tu contenido. El **frontmatter** (lo que está entre `---`) es obligatorio:
   ```yaml
   ---
   title: "Mi título"
   description: "Descripción corta para SEO"
   author: "Mi Nombre"
   pubDate: 2026-02-20
   tags: ["tag1", "tag2"]
   draft: false
   ---
   ```

4. Haz push y abre un Pull Request:
   ```bash
   git add .
   git commit -m "post: mi nuevo artículo"
   git push origin post/titulo-de-mi-post
   ```

5. El equipo revisa el PR y al hacer **merge** → el blog se actualiza automáticamente.

### Si eres externo

1. Haz **fork** del repositorio
2. Agrega tu post en `content/posts/`
3. Abre un **Pull Request** al repo original
4. Nosotros lo revisamos y, si está bien, lo mergeamos

---

## Deploy en producción (tu servidor)

### Primera vez

En tu servidor (VPS), ejecuta:

```bash
# 1. Login en GitHub Container Registry
echo "TU_GITHUB_TOKEN" | docker login ghcr.io -u TU-USUARIO --password-stdin

# 2. Bajar y correr la imagen
docker pull ghcr.io/tu-usuario/nuestro-blog:latest
docker run -d --name blog -p 80:80 --restart unless-stopped ghcr.io/tu-usuario/nuestro-blog:latest
```

> **¿Cómo generar el token?**
> Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
> Crea uno con el permiso `read:packages`

### Actualizar el blog (después de un merge)

```bash
docker pull ghcr.io/tu-usuario/nuestro-blog:latest
docker stop blog && docker rm blog
docker run -d --name blog -p 80:80 --restart unless-stopped ghcr.io/tu-usuario/nuestro-blog:latest
```

> **Tip:** Si quieres automatizar esto también, puedes agregar un paso al workflow
> que haga SSH a tu servidor y ejecute estos comandos. Pero por ahora, manual es suficiente.

---

## Cómo funciona GitHub Actions (explicado simple)

El archivo `.github/workflows/deploy.yml` es una receta que GitHub ejecuta automáticamente.

**¿Cuándo se ejecuta?** Cada vez que alguien hace push a la rama `main` (o sea, cada vez que se mergea un PR).

**¿Qué hace?**

1. **Checkout** — Descarga el código del repo en una máquina virtual temporal de GitHub
2. **Login** — Se autentica en GitHub Container Registry (ghcr.io) para poder subir imágenes
3. **Metadatos** — Prepara los tags de la imagen Docker (ej: `latest`, `sha-abc123`)
4. **Build + Push** — Ejecuta el Dockerfile (builda Astro + crea imagen Nginx) y la sube al registry

**¿Qué es GitHub Container Registry?** Es como Docker Hub pero integrado en GitHub. Tu imagen queda en `ghcr.io/tu-usuario/nuestro-blog` y puedes hacer `docker pull` desde cualquier servidor.

**¿Me cobra algo?** No. Para repos públicos, GitHub Actions y Container Registry son gratuitos.

---

## SEO incluido de fábrica

Todo esto ya está configurado:

- **Sitemap XML** → Se genera automáticamente en `/sitemap-index.xml`
- **RSS Feed** → Disponible en `/rss.xml`
- **Meta tags Open Graph** → Para que se vea bien al compartir en redes sociales
- **Twitter Cards** → Imagen grande al compartir en Twitter/X
- **JSON-LD Schema** → Datos estructurados que Google entiende (tipo BlogPosting)
- **Canonical URLs** → Evita contenido duplicado
- **robots.txt** → Le dice a Google dónde está el sitemap
- **HTML semántico** → Etiquetas `<article>`, `<time>`, `<nav>` correctas
- **Compresión Gzip** → En Nginx, para que cargue rápido
- **Cache headers** → Assets cacheados 30 días, HTML 1 hora

---

## Tips para buen SEO en los posts

- **`title`**: Que sea descriptivo y contenga keywords. Máximo 60 caracteres.
- **`description`**: Resumen atractivo. Máximo 155 caracteres. Esto aparece en Google.
- **Nombre del archivo**: Usa kebab-case descriptivo (`como-usar-docker.md`, no `post-1.md`). Esto se convierte en la URL.
- **Imágenes**: Siempre pongan `alt` descriptivo.
- **Contenido**: Mínimo 300 palabras por post para que Google lo considere relevante.
- **Headings**: Usen `##` y `###` para estructurar. No salten niveles.

---

## Licencia

MIT
