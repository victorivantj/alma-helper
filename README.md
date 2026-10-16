# Asistente ALMA (ALMA Helper) — beta

Userscript para **ALMA / TrakCare** (Servicio de Salud Coquimbo) que agrega atajos y mejoras
para el trabajo clínico diario. Funciona con **Tampermonkey** o **Violentmonkey**.

> 🧪 **Versión de prueba, en desarrollo (beta):** puede tener errores o dejar de funcionar si ALMA
> cambia. Revisa siempre lo que agrega antes de guardar.
>
> El script **nunca guarda nada por ti**: toda indicación o nota se revisa y se guarda en
> ALMA como siempre. No envía datos a ningún servidor externo.

## Instalación

**Página de instalación: https://victorivantj.github.io/alma-helper/**

1. Instala [Tampermonkey](https://www.tampermonkey.net/) o [Violentmonkey](https://violentmonkey.github.io/).
   - En Chrome: `chrome://extensions` → Tampermonkey → *Detalles* → activa
     **"Permitir scripts de usuario"** (o el *Modo de desarrollador* en Chrome < 138).
2. Abre [el enlace de instalación](https://victorivantj.github.io/alma-helper/alma-helper.user.js)
   y presiona *Instalar*.
3. Recarga ALMA. En el borde derecho aparece la pestaña **⚡ Asistente ALMA**.

Las nuevas versiones se instalan solas: la extensión revisa `@updateURL` periódicamente.
Para publicar una versión, sube el número en `@version` y en `VERSION`, y haz `git push`.

## Funciones

| Función | Atajo | Qué hace |
|---|---|---|
| 🩺 Evolucionar | Alt+E | Crea/abre tu evolución de hoy y copia la evolución más reciente de otro médico. Si hay varias notas médicas recientes (p. ej. nota nocturna y evolución), pregunta cuál copiar. Si ya guardaste la tuya, ofrece editarla o agregar una nota. |
| 🔒 Cerrar notas | Alt+B | Bloquea (candado) tus registros de hoy y de ayer (cualquier profesional), con confirmación y la lista de lo que se bloqueará. |
| 📝 Notas médicas | Alt+N | Registro Clínico → Búsqueda filtrada por médicos. |
| 🩹 / 🏃 / 🧑‍⚕️ Notas por profesión | Alt+1 / 2 / 3 | Enfermería, kinesiología y TENS (perfil no médico). |
| ✍️ Indicaciones | Alt+I | Abre Indicaciones. Barra con Reposo, Régimen, Fármacos, ⏰ Receta 8 AM, Lab diario, Coronario, Otros exámenes y 🧪 Lab 6 AM (solo perfil médico). Oculta ítems poco usados en la búsqueda. |
| 💊 Medicamentos | Alt+M | Resalta cada indicación según el turno en que se solicitó (los turnos cambian a las 8:00 de lunes a viernes y a las 9:00 sábado y domingo): vigente (turno actual), por renovar (turno anterior, aún no indicada de nuevo), terminada o suspendida. |
| 💊 Prescripción vigente | — | Ventana flotante en la ficha del paciente con lo vigente y lo por renovar según Medicamentos, con nombres abreviados por vía (VO, EV, SC, IM). Caduca al cambiar el turno. |
| 🧪 Laboratorios | Alt+L | Resultados de Laboratorio - Atención Actual. |
| 📄 Documentos | Alt+O | Imágenes y Documentos del Paciente; en la lista, 👁 Ver muestra cada documento en una ventana flotante. |
| 📈 Signos vitales | Alt+V | Abre Signos Vitales. Sin abrirla: 📈 SV en cada cama muestra la última toma, y la ficha muestra una ventana con las últimas tomas. Aviso si el último control completo tiene más de 2 h (UCI) o 4 h (UTI). |
| 👁️ Ocultar terminados | Alt+T | Solo en Medicamentos (con interruptor para apagar el resaltado). |
| Panel | Alt+A | Muestra/oculta el panel. Incluye interruptor para apagar el script y ❓ Ayuda. |

El perfil (médico u otro profesional) se detecta del *Grupo de Seguridad* del usuario.

## Configuración

Al inicio de `alma-helper.user.js` está el objeto `CONFIG`: sets de exámenes, fármacos,
régimen, filtros de la búsqueda de indicaciones, atajos de teclado, etc.
