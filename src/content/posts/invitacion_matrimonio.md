---
title: "Cómo diseñé la página web y las invitaciones de mi boda usando IA"
description: "Creando con Gemini Pro 3.1 una web y pdf con las informacion e invitaciones a mi matrimonio"
author: "francisco-diago"
pubDate: 2026-02-27
tags: ["wedding", "web", "html", "css", "javascript", "blog"]
category: "reads"
lang: "es"
draft: false
---

## Cómo diseñé la página web y las invitaciones de mi boda usando IA

Planear una boda es un desafío logístico y creativo donde cada detalle cuenta. Desde el principio, mi prometida y yo teníamos clara una cosa: queríamos una paleta de colores muy específica (tonos Peach, Golden hour, Copper, Apricot, Blush, Misty blue y Moss) y un diseño que reflejara nuestra personalidad de manera auténtica. No queríamos utilizar la típica plantilla genérica que usan cientos de parejas, ni adaptarnos a las limitaciones visuales de las plataformas estándar.

Como desarrollador, mi primer instinto fue construir la web yo mismo. Había empezado a trabajar en un diseño usando un enfoque híbrido apoyándome con Cursor. Mi flujo de trabajo consistía en crear vectores de imágenes, exportarlos a PNG para no perder calidad y luego armar la maquetación en herramientas como Vector. Era un proceso funcional, pero lidiar con resoluciones, pesos de imágenes y ajustes de coordenadas consumía un tiempo que preferíamos invertir en otras tareas de la boda. Escalar imágenes PNG para que se vieran nítidas tanto en pantallas móviles pequeñas como en monitores de alta resolución (Retina displays) estaba resultando ser una tarea tediosa y poco eficiente.

Decidí entonces probar Gemini, buscando aprovechar su capacidad para generar código estructurado y animaciones SVG nativas desde el prompt. Tomé la decisión de descartar los PNGs, eliminar la carpeta de assets pesados y el trabajo previo para intentar un enfoque basado 100% en código generado con asistencia de la IA.

## Del prompt al diseño en minutos 🎨

El proceso de desarrollo fue bastante directo y centrado en la estructura. Le pasé al modelo una imagen de referencia con nuestra paleta de colores, le detallé la estructura de las secciones que necesitaba (Nuestra historia, un quiz interactivo para mantener a los invitados enganchados, el dresscode, el área de RSVP) y le pedí que el diseño fuera minimalista, usando flores animadas directamente en la interfaz.

El primer mockup que generó estructuró bien la página y aplicó los colores de forma equilibrada a través de las variables de Tailwind CSS. Para mejorar el aspecto visual y darle un toque más sofisticado, el principal ajuste iterativo fue pedirle que hiciera las flores "más complejas". El modelo reemplazó las formas abstractas iniciales por ilustraciones botánicas en capas (peonías, margaritas y ramas de eucalipto) creadas puramente con trazados SVG.

La gran ventaja de utilizar código SVG inyectado en el HTML es que el navegador no necesita realizar solicitudes HTTP adicionales para cargar imágenes, lo que reduce drásticamente el tiempo de carga. A estas flores se les añadieron animaciones CSS (usando @keyframes) para que tuvieran un ligero movimiento de flotación en la pantalla, simulando una brisa natural. Al evitar el uso de imágenes rasterizadas y renderizar todo mediante matemáticas y código, la página resultó ser increíblemente ligera, escalable de forma infinita y con una nitidez absoluta en cualquier dispositivo.

Puedes ver el resultado final en vivo aquí: Página Web Gabriella & Francisco

Y si te interesa ver el código fuente, aquí está el repositorio: GitHub - GabriellayFrancisco

## Confesión de programador: Ignorando las "Buenas Prácticas" 😅

Si eres desarrollador y revisas el repositorio, notarás algo inmediatamente: no hay separación de archivos.

En el desarrollo web moderno, la buena práctica dicta separar siempre el HTML (estructura), el CSS (estilos) y el JS (lógica) en archivos distintos. Esto facilita el mantenimiento en equipos grandes y asegura la modularidad del código. Sin embargo, al tratarse de un proyecto personal de una sola página (Landing Page) y sin una complejidad que justificara configurar un entorno de desarrollo con herramientas como Webpack, Vite o gestores de paquetes (NPM), opté por la simplicidad extrema.

Decidí centralizar absolutamente todo dentro del archivo index.html. Usé Tailwind CSS a través de su CDN para aplicar estilos rápidamente mediante clases utilitarias directamente sobre las etiquetas, y coloqué los scripts del quiz y el formulario al final del documento. Esta decisión técnica tuvo un propósito claro: agilizar las iteraciones con la IA. Al tener todo el contexto en un solo bloque de texto, era mucho más fácil pedir modificaciones estructurales, copiar el código resultante y refrescar el navegador para ver los cambios de inmediato, sin tener que triangular entre múltiples archivos ni esperar tiempos de compilación.

## El truco del RSVP: Formularios de Google al rescate 📝

Una de las funcionalidades más críticas e importantes de una web de bodas es la confirmación de asistencia (RSVP). Lo habitual en la actualidad es que las parejas recurran a plataformas especializadas ya creadas como The Knot, Zola, Joy o Bodas.net, las cuales ofrecen gestores de invitados y formularios integrados muy convenientes. El inconveniente de estos servicios es que te atan a sus ecosistemas cerrados, te limitan a usar sus plantillas de diseño, en ocasiones incluyen publicidad, y te quitan el control directo y la privacidad sobre tu base de datos.

Por otro lado, programar un backend propio con bases de datos como Firebase, Supabase o Node.js desde cero resultaba ser una sobreingeniería innecesaria y costosa en tiempo para un evento de un solo día. No queríamos preocuparnos por el mantenimiento de servidores o cuotas de lectura.

La solución intermedia y práctica por la que optamos fue conectar nuestro formulario HTML personalizado directamente a la infraestructura de un Google Forms existente. ¿Cómo se hace esto sin usar costosas integraciones de pago o APIs complejas?

Creas un Google Form estándar en tu cuenta de Drive con los campos exactos que necesitas (Nombre, Asistencia, Número de invitados, Restricciones alimenticias).

Abres la vista previa del formulario, inspeccionas el código fuente de la página (F12) para obtener el link de acción del formulario (/formResponse) y copias los IDs exactos de cada campo de texto (los atributos name="entry.123456" asignados por Google).

Usas JavaScript nativo en tu código (empleando la API fetch configurada en modo no-cors) para capturar los datos ingresados por el usuario y enviarlos en segundo plano directamente a esos IDs de Google.

El resultado final es una experiencia de usuario sin interrupciones. El invitado interactúa con botones y campos que respetan completamente la estética de nuestra boda, nunca sale de la página (no hay recargas ni redirecciones molestas), y al darle a "Enviar" visualiza un mensaje de agradecimiento integrado. Mientras tanto, gracias a la infraestructura de Google, nosotros recibimos los datos tabulados y organizados automáticamente en un Excel de Drive, listos para ser compartidos con los proveedores.

## Automatizando las Invitaciones PDF con Python 🐍

El último gran requerimiento de este proyecto era la distribución de las invitaciones. Queríamos enviar PDFs individuales y personalizados por WhatsApp a cada invitado, manteniendo el diseño botánico de la web, la tipografía seleccionada y los colores exactos.

Hacerlo manualmente en un software de diseño (modificando el texto, ajustando la alineación y exportando archivo por archivo) hubiera requerido horas de trabajo repetitivo y propenso a errores humanos. En su lugar, utilicé la IA para estructurar un script de automatización en Python. Tomamos un sencillo archivo de texto plano .csv con la lista de nuestros invitados ("Daniel", "Familia García", "Hassan y Rosi", etc.).

El script hace uso de la robusta librería Playwright. A diferencia de las librerías tradicionales de conversión a PDF que suelen romper los estilos CSS o ignorar los SVGs, Playwright abre un navegador real (Chromium) en segundo plano. Carga nuestra plantilla HTML aplicando un diseño móvil forzado (resolución de 9:16) y espera a que las fuentes web se descarguen correctamente. Luego, inyecta dinámicamente el nombre del invitado en el DOM.

También añadimos una lógica básica de análisis de texto: si el nombre del invitado contiene la conjunción "y", el script redacta automáticamente el texto de la invitación en plural ("Los invitamos... para 2 personas"); si no la contiene, lo ajusta a singular ("Te invitamos... para 1 persona"). Finalmente, el script renderiza la vista exacta y la exporta de forma nativa como un PDF vectorial de alta fidelidad, asegurando que ni las fuentes ni las flores se pixelen al hacer zoom en el teléfono.

Adicionalmente, utilizando coordenadas precisas, logramos que los botones visuales dentro del archivo PDF mantuvieran sus hipervínculos activos hacia la página web. En cuestión de minutos, ejecutando un solo comando en la terminal, el script generó todo el lote de invitaciones personalizadas.

## Conclusión sobre el uso de estas herramientas 💻

Desarrollar este tipo de proyectos personales apoyándose en modelos de lenguaje es una alternativa sumamente viable, económica y potente frente a los constructores de sitios web comerciales. Te permite pasar de una idea abstracta y un esquema básico de colores a una aplicación funcional y de aspecto profesional en muy poco tiempo, otorgándote además la flexibilidad de ser el dueño absoluto de tu propio código y de tus datos.

Al tener una base de código abierto y estructurada por nosotros mismos, la escalabilidad del proyecto depende netamente de las necesidades cambiantes del evento. En el futuro cercano, a esta misma arquitectura se le podrían añadir módulos interactivos sin mucho esfuerzo. Por ejemplo, podríamos integrar una galería conectada a la API de Google Photos para que los invitados suban sus fotografías el mismo día de la boda, incrustar tableros dinámicos de Pinterest con referencias visuales del dress code, o habilitar secciones informativas detalladas sobre logística, rutas de llegada y recomendaciones de turismo para los invitados foráneos. Construir tecnología a medida ya no es exclusivo para grandes proyectos; es una forma práctica, educativa y muy gratificante de personalizar un evento tan importante.