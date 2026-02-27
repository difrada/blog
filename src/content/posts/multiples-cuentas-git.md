---
title: "On building things with friends"
description: "A reflection on what it means to create something together, why side projects matter, and how a blog became more than just code."
author: "francisco-diago"
pubDate: 2026-02-27
tags: ["vscode", "git", "repository"]
category: "reads"
lang: "es"
draft: false
---

# Guía Definitiva: Cómo Usar Múltiples Cuentas de Git en VSCode (Sin Volverte Loco)

Si eres desarrollador, es muy probable que te hayas enfrentado a este problema: tienes tu cuenta de GitHub **Personal** para tus proyectos propios, y otra cuenta corporativa para tu empresa (llamémosla **Radianco**). 

Terminar haciendo un commit en el repositorio de la empresa con tu correo personal es un error clásico. 

Para solucionar esto de raíz y automatizar con qué cuenta firmas tus commits dependiendo de la carpeta en la que estés trabajando, la mejor arquitectura es combinar **Llaves SSH** con la configuración **Condicional (`includeIf`)** de Git.

Aquí te explico cómo configurarlo paso a paso.

## Paso 1: Generar llaves SSH independientes

En lugar de usar HTTPS y pelear con las contraseñas guardadas en el sistema, crearemos una "llave" única para cada cuenta. Abre tu terminal y ejecuta estos comandos:

**Para tu cuenta Personal:**
```bash
ssh-keygen -t ed25519 -C "tu-correo@personal.com" -f "$HOME/.ssh/id_ed25519_personal"
```

**Para tu cuenta Radianco (Trabajo):**
```bash
ssh-keygen -t ed25519 -C "tu-correo@radianco.com" -f "$HOME/.ssh/id_ed25519_radianco"
```
*(Puedes dejar la contraseña/passphrase en blanco si lo deseas).*

> **No olvides:** Debes copiar el contenido de los archivos públicos (`.pub`) que se acaban de generar y pegarlos en la sección "SSH Keys" de las configuraciones de cada una de tus cuentas de GitHub/GitLab.

---

## Paso 2: Configurar el archivo SSH (`~/.ssh/config`)

Ahora necesitamos decirle a nuestro equipo qué llave usar según a dónde nos queramos conectar. Para esto, crearemos "alias". 

Abre o crea el archivo `~/.ssh/config` y añade lo siguiente:

```text
# Cuenta Personal
Host github.com-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_personal

# Cuenta Radianco
Host github.com-radianco
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_radianco
```

---

## Paso 3: Automatizar la identidad por carpetas

Este es el truco de magia. Vamos a organizar nuestros repositorios en carpetas separadas (por ejemplo, `~/Proyectos/Personal/` y `~/Proyectos/Radianco/`) y le diremos a Git que cambie de usuario automáticamente al entrar en ellas.

Edita tu archivo de configuración global (`~/.gitconfig`):

```ini
[user]
    name = Nombre Por Defecto
    email = correo-por-defecto@email.com

# Si estoy en la carpeta de Radianco, usa esta configuración
[includeIf "gitdir:~/Proyectos/Radianco/"]
    path = ~/.gitconfig-radianco

# Si estoy en la carpeta Personal, usa esta configuración
[includeIf "gitdir:~/Proyectos/Personal/"]
    path = ~/.gitconfig-personal
```

A continuación, crea esos dos pequeños archivos de configuración específicos en tu directorio raíz (`~`):

**Archivo `~/.gitconfig-radianco`:**
```ini
[user]
    name = Nombre Radianco
    email = tu-correo@radianco.com
```

**Archivo `~/.gitconfig-personal`:**
```ini
[user]
    name = Tu Nombre Personal
    email = tu-correo@personal.com
```

---

## Paso 4: ¡A clonar repositorios!

A partir de ahora, cuando quieras clonar un repositorio, **no uses la URL por defecto que te da GitHub**. Debes modificarla para usar el "Host" (alias) que creamos en el Paso 2.

Si la URL original es: `git@github.com:organizacion/proyecto.git`

* **Para clonar un proyecto de Radianco:**
    ```bash
    git clone git@github.com-radianco:organizacion/proyecto.git
    ```
* **Para clonar un proyecto Personal:**
    ```bash
    git clone git@github.com-personal:tu-usuario/proyecto-personal.git
    ```

¡Y listo! Cuando abras cualquiera de esos proyectos en VSCode, Git sabrá exactamente con qué correo firmar tus commits y qué credenciales usar para hacer `push` o `pull`, todo de forma automática.