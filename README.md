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
| 🩺 Notas de interconsultores | Alt+4 | Búsqueda con la palabra clave «interconsultor»: solo las «Atención Médico Interconsultor» (también en 👥 Notas otros). |
| 🩹 / 🏃 / 🧑‍⚕️ Notas por profesión | Alt+1 / 2 / 3 | Enfermería, kinesiología y TENS (perfil no médico ni enfermería). Si no hay notas de esa profesión, lo avisa. |
| 📝 Evolución enf | Alt+E | Perfil enfermería: abre (o crea) tu evolución de enfermería de hoy y pega la plantilla (`CONFIG.plantillaEvolucionEnfermeria`); no copia evoluciones anteriores. |
| 🛏️ Cuidados enf | Alt+I | Perfil enfermería: abre «Cuidados de Enfermería» de tu entrada de hoy (si no existe, pregunta antes de crearla). Botón ⏰ Inicio 8 AM: deja la fecha y hora de inicio de la cabecera a las 8:00 para lo que agregues. Bajo cada ítem agregado (perfiles no médicos), duración (1 a 5 días), frecuencia (1 al día, cada 12, 8, 6, 4 o 2 h) y botón ⚙️ Programar: prioridad Normal, frecuencia, «Por N Día(s)» y horas del Modelo Dosificación (`CONFIG.programarCuidados`); no guarda. |
| 👥 Notas otros | Alt+2 | Perfil enfermería: menú para ver notas de TENS, kinesiología, fonoaudiología o terapia ocupacional. |
| ✍️ Indicaciones | Alt+I | Abre Indicaciones. Barra con Reposo, Régimen, Fármacos, Hemoglucotest, exámenes por grupo (Perfiles, Cardiaco, Hemato, Coagulación, Endocrino, Nefro/HE, UPC, Hepático/páncreas, Microbiológico, Autoinmune) y los modos ⏰ Receta 8 AM / 🧪 Lab 6 AM, que dejan la fecha y hora de la cabecera a esa hora para todo lo que se agregue (uno a la vez; al apagarlo vuelve a la hora actual). Solo perfil médico. Oculta ítems poco usados en la búsqueda, con un interruptor (activo por defecto para médicos, apagado para otros perfiles). |
| 💊 Medicamentos | Alt+M | Resalta cada indicación según el turno en que se solicitó (los turnos cambian a las 8:00 de lunes a viernes y a las 9:00 sábado y domingo): vigente (turno actual), por renovar (turno anterior, aún no indicada de nuevo), terminada o suspendida. |
| 💊 Fármacos vigentes | — | Ventana flotante en la ficha del paciente con la sección «Fármacos Vigentes» de ALMA, con nombres abreviados por vía (VO, EV, SC, IM) y etiqueta «en espera». Primero la atención actual; las otras atenciones, aparte y plegadas. |
| 🧪 Laboratorios | Alt+L | Resultados de Laboratorio - Atención Actual. |
| 📨 Interconsultas | Alt+C | Ventana flotante con las interconsultas de la atención actual (📨 IC en cada cama), sin abrir la página: primero las solicitadas; clic en el nombre abre su detalle; «Ver notas de interconsultores» abre sus notas. |
| 📄 Documentos | Alt+O | Imágenes y Documentos del Paciente; en la lista, 👁 Ver muestra cada documento en una ventana flotante. |
| 📈 Signos vitales | Alt+V | Abre Signos Vitales. Sin abrirla: 📈 SV en cada cama muestra la última toma, y la ficha muestra una ventana con las últimas tomas. Aviso si el último control completo tiene más de 2 h (UCI) o 4 h (UTI). |
| 👁️ Ocultar terminados | Alt+T | Solo en Medicamentos (con interruptor para apagar el resaltado). |
| Panel | Alt+A | Muestra/oculta el panel. Incluye interruptor para apagar el script y ❓ Ayuda. |

El perfil (médico, enfermería u otro profesional) se detecta del *Grupo de Seguridad* del usuario.

## Configuración

Al inicio de `alma-helper.user.js` está el objeto `CONFIG`: sets de exámenes, fármacos,
régimen, filtros de la búsqueda de indicaciones, atajos de teclado, etc.
