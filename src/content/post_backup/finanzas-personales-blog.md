---
title: "Cómo construí un analizador de extractos bancarios colombianos con Python e IA"
description: "Un recorrido técnico por el proyecto: extracción de PDFs, limpieza de texto, parseo bancario, dashboard interactivo en Streamlit y un chatbot que entiende tus finanzas."
author: "Sebastián Franco"
pubDate: 2026-02-20
tags: ["python", "streamlit", "openai", "finanzas", "pdf", "open-source", "colombia"]
draft: false
---

## El problema

Cada mes los bancos colombianos me mandan extractos en PDF. Davivienda, Banco de Occidente, Nubank. Cada uno con su propio formato, su propio desorden, sus propios artefactos de impresión.

Quería una sola vista de todo. Un lugar donde pudiera ver cuánto gasté este mes, en qué lo gasté, cuánto debo, y poder preguntarle al sistema *"¿cuánto me costó comer por fuera este mes?"* sin abrir tres PDFs distintos.

No encontré una herramienta que funcionara para bancos colombianos. Así que la construí.

El resultado es un proyecto open source: un pipeline completo que va desde el PDF crudo hasta un dashboard interactivo con chatbot incluido, corriendo 100% en tu máquina local.

---

## La arquitectura general

El proyecto tiene tres capas bien separadas:

```
PDF crudo
   ↓
Extracción de texto     (pdfplumber + pikepdf)
   ↓
Limpieza de artefactos  (single_clean_text.py)
   ↓
Parseo estructurado     (statement_processor.py)
   ↓
JSON en disco           (data/processed_statements/)
   ↓
Streamlit UI            (upload · vista · edición · dashboard · chatbot)
```

Cada capa es independiente. Si mañana quiero cambiar la UI por una app web, el pipeline de extracción no cambia. Si quiero agregar un banco nuevo, solo toco el parser.

---

## El reto más difícil: los PDFs colombianos son un caos

Antes de escribir una sola línea de código de análisis, tuve que resolver un problema más fundamental: **el texto extraído de estos PDFs es basura**.

No es culpa de las herramientas de extracción. Es culpa de cómo los bancos generan sus PDFs. Texto rotado que queda invertido, firmas institucionales codificadas como caracteres individuales, columnas de tablas que se fusionan, caracteres BOM, sellos que se imprimen encima del contenido.

Algunos ejemplos reales de lo que `pdfplumber` extrae antes de limpiar:

**Davivienda:**
```
??ABCDEFGHIJKLMNOP ??
??!!????##????
```

**Nubank** (texto invertido):
```
OTNEIMAICNANIF
AIÑAPMOC
```

**Occidente** (encabezado de columna fragmentado):
```
DESCRIPCIÓN C N O o M . P D T E E CIUDAD/PAIS
```

### La solución: `single_clean_text.py`

Construí un módulo de limpieza con tres mecanismos:

**1. Frases de ruido conocidas** — una lista de strings específicos que hay que eliminar. Cosas como `PBG226960` (código de barras de Occidente), `DEFENSORIACLIENTE@...` (pie de página legal de Davivienda), o `KPMG S.A.S` (firma del auditor).

**2. Patrones de línea** — regex que detectan líneas que son puro ruido estructural:
```python
r"^\.[A-Z]\.[A-Z]$"      # firmas rotadas: ".A.S"
r"^[A-Z]{2,4}$"          # fragmentos de sello: "ED", "VQN"
r"^\(\d{3}\)\d{10,}"     # datos de código de barras
```

**3. Heurísticas de contenido** — dos criterios que detectan líneas problemáticas sin conocerlas de antemano:
- Si más del 55% de los tokens tienen ≤ 2 caracteres y hay ≥ 10 tokens → es un encabezado de columna fragmentado
- Si más del 75% de los tokens tienen ≤ 2 caracteres y hay ≥ 8 tokens → es texto de columna fusionado

El módulo pasa 20/20 tests sin falsos positivos: limpia todo el ruido sin tocar ni una transacción legítima.

---

## El parser: cada banco es un mundo

Una vez el texto está limpio, `statement_processor.py` lo convierte en JSON estructurado. El diseño central es un diccionario `BANK_RULES` donde cada banco define sus propias reglas de extracción:

```python
BANK_RULES = {
    "davivienda": {
        "cut_date_regex": r"INFORME DEL MES\s*:\s*([A-ZÁÉÍÓÚ]+)\s*/\s*(\d{4})",
        "tx_line_regex": r"^\s*(?P<day>\d{2})\s+(?P<month>\d{2})\s+\$\s*(?P<amount>[\d\.,]+)(?P<sign>[+\-])...",
        "summary_patterns": { ... },
        ...
    },
    "banco_occidente": { ... },
    "nubank": { ... },
}
```

Esto hace que agregar un banco nuevo sea cuestión de definir sus reglas sin tocar la lógica central.

### Casos edge interesantes

Cada banco tuvo sus propios problemas únicos:

**Davivienda** — la fecha de corte viene como `INFORME DEL MES: OCTUBRE /2025`, no como una fecha. Hay que convertir el nombre del mes al número, calcular el último día del mes, y construir `31/10/2025`.

**Occidente** — el resumen financiero no tiene etiquetas. Es una sola línea posicional:
```
$ $0.00 $679,000.00 $6,445,242.93 2025 06 16 $137,000.00
```
Que corresponde a los encabezados `SALDO A SU FAVOR | PARA PAGO TOTAL | PAGUE ANTES DEL | PAGO MINIMO`. El parser lee esta línea por posición para extraer el nuevo saldo y la fecha límite de pago.

**Nubank** — las fechas de corte y límite de pago aparecen en dos líneas separadas:
```
Fecha límite de pago  Fecha de corte  Periodo facturado
12 AGO 2025           23 JUL 2025     22 JUN - 22 JUL 2025
```
Los regex estándar no los encuentran porque buscan etiqueta + valor en la misma línea. Hay que leer la línea siguiente por posición.

Además, algunas transacciones de Nubank tienen la fecha partida en dos líneas:
```
20 JUL
2025 Dlo*Rappi $43.850,00
```
El parser tiene una función `_rejoin_nubank_lines()` que detecta este patrón y une las líneas antes de parsear.

---

## La app: Streamlit como UI completa

Con el pipeline funcionando, construí la interfaz en Streamlit. Dos páginas:

### Página 1: Subir Extracto

El usuario sube un PDF. La app corre el pipeline completo en memoria, muestra el extracto estructurado, y lo guarda en disco para el historial.

Para PDFs con contraseña (varios bancos colombianos los protegen), usamos `pikepdf` para descifrarlos en memoria antes de pasárselos a `pdfplumber`:

```python
with pikepdf.open(io.BytesIO(pdf_bytes), password=password) as unlocked:
    unlocked.save(buf)
# buf ahora es el PDF descifrado, listo para pdfplumber
```

### Edición híbrida

El parser es bueno pero no perfecto. A veces un valor queda en cero o una descripción queda truncada. En lugar de volver a correr el pipeline, el usuario puede corregirlo directamente en la UI:

- **Formulario de metadatos y resumen** — campos editables pre-poblados con los valores actuales. Un botón "Guardar" sobreescribe el JSON en disco.
- **Tabla editable con `st.data_editor`** — descripción y monto editables directo en celda. La fecha es readonly para evitar errores de formato.

Los cambios se persisten en `data/processed_statements/{nombre}.json` y el dashboard los refleja de inmediato.

### Página 2: Dashboard

Lee todos los JSONs procesados y construye un tablero consolidado: KPIs, evolución del gasto mensual, distribución por banco, top 10 comercios, estado de cupos por tarjeta, y tabla completa de transacciones con búsqueda.

No depende de Parquet ni de ningún formato intermediario. Lee los JSONs directamente, con caché de 60 segundos para que los nuevos extractos aparezcan automáticamente.

---

## El chatbot: pregúntale a tus extractos

La parte más interesante del proyecto. Una vez tienes el extracto procesado, puedes hacerle preguntas en lenguaje natural:

> *"¿Cuánto gasté en Rappi este mes?"*
> *"¿Cuál fue mi transacción más grande?"*
> *"¿Por qué el saldo anterior es cero?"*
> *"¿Cuántas veces usé el metro?"*

El sistema convierte el JSON del extracto en un texto de contexto estructurado y lo inyecta como system prompt:

```python
def build_chat_context(data: Dict[str, Any]) -> str:
    # Banco, fechas, resumen financiero, y todas las transacciones
    # con fecha, descripción y monto
    ...
```

Luego usa la API de OpenAI con `gpt-4o-mini` para responder. El historial se mantiene por sesión y por extracto, así el modelo recuerda lo que ya preguntaste.

### ⚠️ Una nota importante sobre privacidad

El chatbot es la única parte del proyecto que no es 100% local. Cuando lo usas, un resumen de tu extracto (descripciones, montos, fechas) se envía a los servidores de OpenAI.

Si no te sientes cómodo con eso, no lo uses — el resto de la app funciona completamente sin él. También puedes reemplazar la función `chat_with_openai()` por una llamada a un modelo local via Ollama si prefieres mantener todo offline.

---

## Lo que aprendí construyendo esto

**Los PDFs son mucho más complejos de lo que parecen.** No es solo "extraer texto". Cada banco tiene su propia forma de codificar la información, y los artefactos de impresión pueden destruir completamente la estructura del documento.

**Las heurísticas simples ganan.** Las reglas más robustas del limpiador no son las que conocen frases específicas — son las dos heurísticas de proporción de tokens cortos. Generalizan a casos que nunca había visto.

**Streamlit es sorprendentemente capaz.** `st.data_editor`, `st.chat_message`, `st.cache_data` con TTL, manejo de session_state por clave — con eso construí una app completa sin escribir una sola línea de JavaScript.

**La edición manual es necesaria.** No importa qué tan bueno sea el parser, siempre va a haber un extracto con un formato inesperado. Dar al usuario la capacidad de corregir y persistir los cambios es más valioso que seguir mejorando el parser indefinidamente.

---

## Cómo correrlo

```bash
git clone https://github.com/tu-usuario/colombian-bank-analyzer.git
cd colombian-bank-analyzer

python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
streamlit run app/streamlit_app.py
```

Las carpetas de datos se crean automáticamente. No necesitas configurar nada más para empezar.

Para el chatbot, agrega tu API key de OpenAI como variable de entorno:
```bash
export OPENAI_API_KEY="sk-..."   # macOS / Linux
$env:OPENAI_API_KEY="sk-..."     # Windows PowerShell
```

---

## Próximos pasos

Hay varias cosas que quiero agregar:

- **Soporte para más bancos** — Bancolombia y BBVA Colombia son los siguientes candidatos obvios
- **Categorización automática** — clasificar transacciones por categoría (comida, transporte, entretenimiento) sin necesidad del chatbot
- **Deploy en servidor** — actualmente corre solo en local; la arquitectura ya está pensada para migrar a un servidor sin grandes cambios

Si usas este proyecto y encuentras un extracto que no parsea bien, abre un issue en GitHub con el texto extraído (sin datos personales). Eso es exactamente el tipo de contribución más útil.

---

*El código está disponible en GitHub con licencia MIT. Si te fue útil, dale una ⭐.*
