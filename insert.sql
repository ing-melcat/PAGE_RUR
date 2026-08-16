INSERT INTO posts (id, type, category, title, image, content, extra) 
VALUES (
'tutorial-post-123',
'simple', 
'explora', 
'🛠️ MANUAL COMPLETO: Todas las capacidades de publicación', 
'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
'¡Bienvenido al manual interactivo de publicaciones de RUR! Esta publicación es una **guía viva** donde te muestro absolutamente todo lo que el editor es capaz de hacer.

Si en algún momento no sabes cómo hacer algo, simplemente abre esta publicación en el *Modo Edición* y copia el código de lo que necesites.

---

## 1. Títulos y Estructura
Puedes organizar tu texto usando el símbolo `#` antes del texto.

# Título Principal (H1)
## Subtítulo (H2)
### Sección Menor (H3)

> **💡 TIP de Edición:** Mientras más `#` pongas, más pequeño será el título. Usa esto para separar secciones largas de tu publicación.

---

## 2. Formato de Texto
Juega con las palabras para darles énfasis:
* **Negrita:** Encierra tu texto con doble asterisco `**texto**`
* *Cursiva:* Encierra tu texto con un asterisco `*texto*`
* ~~Tachado~~: Usa doble tilde `~~texto~~`
* Resaltar código: Usa acento grave ` `código` `

---

## 3. Listas y Tareas
Organiza elementos fácilmente.

**Lista de viñetas (Usa `-` o `*`):**
- Robótica Autónoma
- Inteligencia Artificial
- Sistemas Embebidos

**Lista enumerada (Usa números `1.`):**
1. Diseñar el chasis
2. Soldar la placa
3. Programar el microcontrolador

**Lista de tareas (Checklists):**
- [x] Tarea completada (`- [x]`)
- [ ] Tarea pendiente (`- [ ]`)

---

## 4. Botones Oficiales de la Interfaz (Súper útil 🚀)
Gracias a la compatibilidad con código HTML incrustado, puedes dibujar los botones oficiales de la página escribiendo HTML puro en tu editor.

**Botón de Acción (Clásico, con efecto hover):**
<a href="https://discord.gg/" class="action-card" target="_blank" style="text-decoration: none;">
  Únete a nuestra comunidad
</a>
*(Código usado: `<a href="..." class="action-card">Texto</a>`)*

**Botón Primario (Fondo sólido):**
<a href="https://ejemplo.com" class="primary-btn" target="_blank" style="text-decoration: none;">
  Ver Proyecto Completo
</a>
*(Código usado: `<a href="..." class="primary-btn">Texto</a>`)*

---

## 5. Mensajes y Alertas Personalizadas
Para llamar la atención del lector a avisos críticos o confirmaciones:

<div class="message error">
  <strong>⚠️ AVISO IMPORTANTE:</strong> Se requieren gafas de seguridad en el laboratorio a toda hora.
</div>
*(Código: `<div class="message error">Texto</div>`)*

<div class="message success">
  <strong>✅ ÉXITO:</strong> El robot superó la prueba de obstáculos autónomamente.
</div>
*(Código: `<div class="message success">Texto</div>`)*

<div class="message">
  <strong>ℹ️ INFO:</strong> Reuniones todos los jueves a las 16:00.
</div>
*(Código: `<div class="message">Texto</div>`)*

---

## 6. Imágenes
Puedes incrustar imágenes de internet usando esta sintaxis: `![Descripción](URL_de_la_imagen)`

![Demostración Rover](https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800)

---

## 7. Videos de YouTube
Como aceptamos HTML, puedes insertar iframes de YouTube directamente. Ve al video en YouTube, dale "Compartir" -> "Insertar" y pega el código:

<iframe width="100%" height="400" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px;"></iframe>

---

## 8. Bloques de Código
Si necesitas compartir fragmentos de programación con tu equipo, usa tres acentos graves (```) y el nombre del lenguaje:

```python
# Control de motores
import RPi.GPIO as GPIO
import time

def avanzar():
    GPIO.output(Motor_A, GPIO.HIGH)
    GPIO.output(Motor_B, GPIO.HIGH)
    print("El robot está avanzando...")
```

---

## 9. Tablas de Datos
Las tablas se dibujan usando `|` para las columnas y `-` para la cabecera:

| Componente | Especificación | Cantidad |
|------------|----------------|----------|
| ESP32 | Microcontrolador WiFi | 2 |
| L298N | Puente H | 1 |
| Batería LiPo | 11.1V 3S | 1 |

---

## ¡Experimenta!
No tengas miedo de romper este documento. Entra a **Modificar** en el panel, revisa cómo está escrito todo esto, cópialo para tus propios artículos y borra o ajusta lo que necesites. ¡El límite es tu imaginación!',
'{"location":"Guía de Referencia RUR"}'
);
