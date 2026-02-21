# ===========================================
# Etapa 1: Build del sitio con Astro
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (mejor cache de Docker)
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Buildar el sitio estático
RUN npm run build

# ===========================================
# Etapa 2: Servir con Nginx
# ===========================================
FROM nginx:1.27-alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el sitio buildado desde la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
